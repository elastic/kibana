/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Buildkite checkpoint helpers for Jest CI resume.
//
// On retry, configs that already passed are skipped via Buildkite meta-data.
// This avoids re-running successful configs when a CI job is retried after
// a transient failure or agent loss.
//
// Used by both run.ts (single config) and run_all.ts (multi-config).

import { execFile as _execFile, execFileSync } from 'child_process';
import { createHash } from 'crypto';

function execBuildkiteAgent(args: string[]): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    _execFile('buildkite-agent', args, (error, stdout) => {
      if (error) reject(error);
      else resolve({ stdout });
    });
  });
}

/**
 * Returns true when running inside a Buildkite CI environment.
 */
export function isInBuildkite(): boolean {
  return Boolean(process.env.BUILDKITE);
}

/**
 * Builds a deterministic checkpoint key for a given config path.
 * The key incorporates the Buildkite step ID and parallel job index
 * so checkpoints are scoped to the specific CI worker.
 */
export function getCheckpointKey(config: string): string {
  const stepId = process.env.BUILDKITE_STEP_ID || '';
  const job = process.env.BUILDKITE_PARALLEL_JOB || '0';
  const hash = createHash('sha256').update(config).digest('hex').substring(0, 12);
  return `jest_ckpt_${stepId}_${job}_${hash}`;
}

/**
 * Marks a config as completed in Buildkite meta-data.
 * Best-effort: errors are silently ignored.
 */
export async function markConfigCompleted(config: string): Promise<void> {
  try {
    await execBuildkiteAgent(['meta-data', 'set', getCheckpointKey(config), 'done']);
  } catch {
    // Best-effort: ignore errors writing checkpoint
  }
}

/**
 * Synchronous version of markConfigCompleted.
 * Intended for use inside process.on('exit') handlers where async is not supported.
 * Best-effort: errors are silently ignored.
 */
export function markConfigCompletedSync(config: string): void {
  try {
    execFileSync('buildkite-agent', ['meta-data', 'set', getCheckpointKey(config), 'done'], {
      stdio: 'pipe',
    });
  } catch {
    // Best-effort: ignore errors writing checkpoint
  }
}

/**
 * Checks whether a config was already completed on a previous attempt.
 * Returns false outside of Buildkite or on any error.
 */
export async function isConfigCompleted(config: string): Promise<boolean> {
  try {
    const { stdout } = await execBuildkiteAgent([
      'meta-data',
      'get',
      getCheckpointKey(config),
      '--default',
      '',
    ]);
    return stdout.trim() === 'done';
  } catch {
    return false;
  }
}
