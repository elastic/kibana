/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';

export enum Phase {
  BeforeStart = 'before_start',
  Warming = 'warming',
  IdleBeforeRun = 'idle_before_run',
  Running = 'running',
  Done = 'done',
}

export class ResourcePool {
  private readonly log: ToolingLog;
  private readonly maxStarted: number;
  private readonly maxWarming: number;
  private readonly maxRunning: number;

  private startedInUse = 0;
  private warmingInUse = 0;
  private runningInUse = 0;

  private warmingQueue: QueueItem[] = [];
  private runningQueue: QueueItem[] = [];
  private readonly slotStates = new WeakMap<Slot, Phase>();

  constructor({
    log,
    maxStarted,
    maxWarming,
    maxRunning,
  }: {
    log: ToolingLog;
    maxStarted: number;
    maxWarming: number;
    maxRunning: number;
  }) {
    this.log = log;
    this.maxStarted = maxStarted;
    this.maxWarming = maxWarming;
    this.maxRunning = maxRunning;
  }

  acquire(): Slot {
    const slot: Partial<Slot> = {};

    const typedSlot = slot as Slot;
    this.slotStates.set(typedSlot, Phase.BeforeStart);

    slot.waitForWarming = async () => {
      await this.waitForWarming(typedSlot);
    };

    slot.waitForRunning = async () => {
      await this.waitForRunning(typedSlot);
    };

    slot.release = () => {
      this.release(typedSlot);
    };

    slot.getPhase = () => this.getPhase(typedSlot);

    return typedSlot;
  }

  private logStats(label: string) {
    this.log.debug(
      `[resource-pool:${label}] started=${this.startedInUse}/${this.maxStarted}, warming=${this.warmingInUse}/${this.maxWarming}, running=${this.runningInUse}/${this.maxRunning}, waitingWarming=${this.warmingQueue.length}, waitingRunning=${this.runningQueue.length}`
    );
  }

  private canStartAndWarm() {
    return this.startedInUse < this.maxStarted && this.warmingInUse < this.maxWarming;
  }

  private canRun() {
    return this.runningInUse < this.maxRunning;
  }

  private tryGrantWarming() {
    let granted = false;

    while (this.warmingQueue.length > 0 && this.canStartAndWarm()) {
      const item = this.warmingQueue.shift();
      if (!item) break;
      const { slot, resolve } = item;
      if (this.getPhase(slot) !== Phase.BeforeStart) {
        continue;
      }
      this.startedInUse += 1;
      this.warmingInUse += 1;
      this.setPhase(slot, Phase.Warming);
      granted = true;
      resolve();
    }

    if (granted) {
      this.logStats('warming-granted');
    }
  }

  private tryGrantRunning() {
    let granted = false;

    while (this.runningQueue.length > 0 && this.canRun()) {
      const item = this.runningQueue.shift();
      if (!item) break;
      const { slot, resolve } = item;
      if (this.getPhase(slot) !== Phase.IdleBeforeRun) {
        continue;
      }
      this.runningInUse += 1;
      this.setPhase(slot, Phase.Running);
      granted = true;
      resolve();
    }

    if (granted) {
      this.logStats('running-granted');
    }
  }

  async waitForWarming(slot: Slot) {
    const phase = this.getPhase(slot);

    if (phase !== Phase.BeforeStart) {
      throw new Error(`Cannot warm slot in phase [${phase}]`);
    }

    if (this.canStartAndWarm()) {
      this.startedInUse += 1;
      this.warmingInUse += 1;
      this.setPhase(slot, Phase.Warming);
      this.logStats('warming-acquired');
      return;
    }

    await new Promise<void>((resolve) => {
      this.warmingQueue.push({ slot, resolve });
      this.logStats('warming-wait');
    });
  }

  async waitForRunning(slot: Slot) {
    const phase = this.getPhase(slot);

    if (phase === Phase.Warming) {
      this.warmingInUse -= 1;
      this.setPhase(slot, Phase.IdleBeforeRun);
      this.logStats('warming-finished');
      this.tryGrantWarming();
    } else if (phase !== Phase.IdleBeforeRun) {
      throw new Error(`Cannot run slot in phase [${phase}]`);
    }

    if (this.canRun()) {
      this.runningInUse += 1;
      this.setPhase(slot, Phase.Running);
      this.logStats('running-acquired');
      return;
    }

    await new Promise<void>((resolve) => {
      this.runningQueue.push({ slot, resolve });
      this.logStats('running-wait');
    });
  }

  release(slot: Slot) {
    const phase = this.getPhase(slot);

    if (phase === Phase.BeforeStart) {
      this.warmingQueue = this.warmingQueue.filter((item) => item.slot !== slot);
      this.runningQueue = this.runningQueue.filter((item) => item.slot !== slot);
    }

    if (phase === Phase.Warming) {
      this.warmingInUse = Math.max(0, this.warmingInUse - 1);
      this.startedInUse = Math.max(0, this.startedInUse - 1);
      this.logStats('release-warming');
    } else if (phase === Phase.IdleBeforeRun) {
      this.startedInUse = Math.max(0, this.startedInUse - 1);
      this.logStats('release-idle');
    } else if (phase === Phase.Running) {
      this.runningInUse = Math.max(0, this.runningInUse - 1);
      this.startedInUse = Math.max(0, this.startedInUse - 1);
      this.logStats('release-running');
    }

    this.setPhase(slot, Phase.Done);

    this.tryGrantRunning();
    this.tryGrantWarming();
  }

  private getPhase(slot: Slot) {
    return this.slotStates.get(slot) ?? Phase.Done;
  }

  private setPhase(slot: Slot, phase: Phase) {
    const previous = this.getPhase(slot);
    this.log.debug(`[resource-pool:slot] ${previous} -> ${phase}`);
    this.slotStates.set(slot, phase);
  }
}

interface QueueItem {
  slot: Slot;
  resolve: () => void;
}

export interface Slot {
  waitForWarming(): Promise<void>;
  waitForRunning(): Promise<void>;
  release(): void;
  getPhase(): Phase;
}
