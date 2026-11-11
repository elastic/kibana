/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { ManagedProcess } from './managed_process';
import { writeStatusFile } from './status_file';
import type { SettingsProvider } from './settings/types';
import type {
  LogLine,
  ProcessDefinition,
  ProcessStatus,
  SupervisorStatus,
  ToolOptions,
} from './types';

export interface SupervisorOptions {
  readonly definitions: readonly ProcessDefinition[];
  readonly logDir: string;
}

type Listener<T> = (value: T) => void;

/** Orders definitions so every process comes after the processes it depends on; throws on unknown ids or cycles. */
export const sortByDependencies = (
  definitions: readonly ProcessDefinition[]
): readonly ProcessDefinition[] => {
  const byId = new Map<string, ProcessDefinition>();
  for (const definition of definitions) {
    if (byId.has(definition.id)) {
      throw new Error(`Process id "${definition.id}" is defined more than once`);
    }
    byId.set(definition.id, definition);
  }

  const sorted: ProcessDefinition[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (definition: ProcessDefinition, trail: readonly string[]) => {
    const { id, dependsOn = [] } = definition;
    if (visited.has(id)) {
      return;
    }
    if (visiting.has(id)) {
      throw new Error(`Process dependencies form a cycle: ${[...trail, id].join(' -> ')}`);
    }
    visiting.add(id);
    for (const dependencyId of dependsOn) {
      const dependency = byId.get(dependencyId);
      if (!dependency) {
        throw new Error(`Process "${id}" depends on unknown process "${dependencyId}"`);
      }
      visit(dependency, [...trail, id]);
    }
    visiting.delete(id);
    visited.add(id);
    sorted.push(definition);
  };
  definitions.forEach((definition) => visit(definition, []));
  return sorted;
};

/** Starts a set of processes in dependency order and lets callers restart, stop or start each of them. */
export class Supervisor {
  private readonly definitions: readonly ProcessDefinition[];
  private readonly processes = new Map<string, ManagedProcess>();
  private readonly changeListeners = new Set<Listener<ProcessStatus>>();
  private readonly lineListeners = new Set<Listener<LogLine>>();
  private readonly startedAt = new Date().toISOString();
  private readonly statusFile: string;

  constructor({ definitions, logDir }: SupervisorOptions) {
    this.definitions = sortByDependencies(definitions);
    fs.mkdirSync(logDir, { recursive: true });
    this.statusFile = path.join(logDir, 'status.json');
    for (const definition of this.definitions) {
      this.processes.set(
        definition.id,
        new ManagedProcess(definition, path.join(logDir, `${definition.id}.log`), {
          onChange: (status) => this.handleChange(status),
          onLine: (line) => this.lineListeners.forEach((listener) => listener(line)),
        })
      );
    }
    this.writeStatus();
  }

  public onChange(listener: Listener<ProcessStatus>): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  public onLine(listener: Listener<LogLine>): () => void {
    this.lineListeners.add(listener);
    return () => this.lineListeners.delete(listener);
  }

  public getStatus(): SupervisorStatus {
    return {
      supervisorPid: process.pid,
      startedAt: this.startedAt,
      updatedAt: new Date().toISOString(),
      processes: this.definitions.map(({ id }) => this.get(id).getStatus()),
    };
  }

  /** Starts every process; each one waits until the processes it depends on are ready. */
  public async startAll(): Promise<void> {
    // Tools are optional; they start when the user starts them.
    await Promise.all(this.definitions.filter(({ tool }) => !tool).map(({ id }) => this.start(id)));
  }

  /** Starts one process once its dependencies are ready; marks it failed if a dependency does not get there. */
  public async start(id: string): Promise<void> {
    const managed = this.get(id);
    if (managed.isRunning()) {
      return;
    }
    const { dependsOn = [] } = this.getDefinition(id);
    if (dependsOn.length > 0) {
      managed.markWaiting();
      const dependencyError = await Promise.all(
        dependsOn.map((dependencyId) => this.get(dependencyId).whenReady())
      ).then(
        () => undefined,
        (error: Error) => error
      );
      // stop() may have been called while this process was waiting.
      if (managed.getStatus().state !== 'waiting') {
        return;
      }
      if (dependencyError) {
        managed.markFailed(`dependency not ready: ${dependencyError.message}`);
        return;
      }
    }
    managed.start();
  }

  public async stop(id: string): Promise<void> {
    await this.get(id).stop();
  }

  public async restart(id: string): Promise<void> {
    await this.stop(id);
    await this.start(id);
  }

  /** Stops every process, dependents before the processes they depend on. */
  public async stopAll(): Promise<void> {
    for (const { id } of [...this.definitions].reverse()) {
      await this.stop(id);
    }
  }

  public getTool(id: string): ToolOptions | undefined {
    return this.getDefinition(id).tool;
  }

  public getSettingsProvider(id: string): SettingsProvider | undefined {
    return this.getDefinition(id).settings;
  }

  /** Signals every running process group synchronously, for use in exit handlers. */
  public signalAll(signal: NodeJS.Signals): void {
    this.processes.forEach((managed) => managed.signalGroup(signal));
  }

  /** Resolves once no process is running or waiting to start. */
  public async whenAllEnded(): Promise<void> {
    const isSettled = () =>
      [...this.processes.values()].every((managed) => {
        const { state } = managed.getStatus();
        return !managed.isRunning() && state !== 'waiting';
      });
    if (isSettled()) {
      return;
    }
    await new Promise<void>((resolve) => {
      const unsubscribe = this.onChange(() => {
        if (isSettled()) {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  private get(id: string): ManagedProcess {
    const managed = this.processes.get(id);
    if (!managed) {
      throw new Error(`Unknown process "${id}"`);
    }
    return managed;
  }

  private getDefinition(id: string): ProcessDefinition {
    const definition = this.definitions.find((candidate) => candidate.id === id);
    if (!definition) {
      throw new Error(`Unknown process "${id}"`);
    }
    return definition;
  }

  private handleChange(status: ProcessStatus): void {
    this.writeStatus();
    this.changeListeners.forEach((listener) => listener(status));
  }

  private writeStatus(): void {
    writeStatusFile(this.statusFile, this.getStatus());
  }
}
