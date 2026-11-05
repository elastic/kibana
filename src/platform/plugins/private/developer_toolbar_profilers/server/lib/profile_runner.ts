/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setTimeout as delay } from 'node:timers/promises';
import type { ProfileType } from '../../common';
import { createSession, type InspectorSession } from './inspector';
import { ProfileStateError } from './profile_state_error';
import { profilerCommands, type ProfileData, type ProfilerCommands } from './profilers';

export interface CompletedProfile {
  readonly profile: ProfileData;
  readonly startedAt: Date;
}

interface ActiveProfile {
  readonly session: InspectorSession;
  readonly startedAt: Date;
}

/** Runs at most one profile of a given type at a time, each in its own inspector session. */
export class ProfileRunner {
  private active?: ActiveProfile;

  constructor(private readonly type: ProfileType, private readonly commands: ProfilerCommands) {}

  public isRunning(): boolean {
    return this.active !== undefined;
  }

  public async start(): Promise<void> {
    if (this.active) {
      throw new ProfileStateError(`A ${this.type} profile is already running`);
    }

    const session = createSession();
    // Claimed before the first await so concurrent starts are rejected.
    this.active = { session, startedAt: new Date() };

    try {
      await this.commands.start(session);
    } catch (error) {
      this.active = undefined;
      session.disconnect();
      throw error;
    }
  }

  public async stop(): Promise<CompletedProfile> {
    const { active } = this;
    if (!active) {
      throw new ProfileStateError(`No ${this.type} profile is running`);
    }
    this.active = undefined;

    try {
      const profile = await this.commands.stop(active.session);
      return { profile, startedAt: active.startedAt };
    } finally {
      active.session.disconnect();
    }
  }

  public async capture(durationSeconds: number): Promise<CompletedProfile> {
    await this.start();
    await delay(durationSeconds * 1000);
    return await this.stop();
  }

  /** Discards a running profile without collecting it. */
  public abort(): void {
    this.active?.session.disconnect();
    this.active = undefined;
  }
}

export type ProfileRunners = Readonly<Record<ProfileType, ProfileRunner>>;

/** Creates a runner for each profile type. */
export function createProfileRunners(): ProfileRunners {
  return {
    cpu: new ProfileRunner('cpu', profilerCommands.cpu),
    memory: new ProfileRunner('memory', profilerCommands.memory),
  };
}
