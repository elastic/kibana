/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { isAbsolute } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import type { CheckToRun, CheckResult, QuickChecksContext } from '../types';
import { MAX_OUTPUT_SIZE } from '../config';

/**
 * Run a single check and return the result
 * @param command - The pre-computed command string to execute
 */
export async function runCheckAsync(
  check: CheckToRun,
  command: string,
  context: QuickChecksContext
): Promise<CheckResult> {
  const { script, nodeCommand } = check;
  const startTime = Date.now();

  // When running locally (not CI) and a nodeCommand is available, run it directly
  if (!context.isCI && nodeCommand) {
    return runNodeCommand(command, script, startTime);
  }

  // In CI or when no nodeCommand, use shell script
  return runShellScript(script, startTime, context);
}

/**
 * Run a node command directly
 */
async function runNodeCommand(
  nodeCommand: string,
  script: string,
  startTime: number
): Promise<CheckResult> {
  return new Promise((resolve) => {
    const parts = nodeCommand.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    const childProcess = spawn(cmd, args, {
      cwd: REPO_ROOT,
      env: { ...process.env },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const outputCapture = createLimitedOutputCapture();

    childProcess.stdout?.on('data', outputCapture.append);
    childProcess.stderr?.on('data', outputCapture.append);

    childProcess.on('close', (code) => {
      resolve({
        success: code === 0,
        script,
        nodeCommand,
        output: outputCapture.get(),
        durationMs: Date.now() - startTime,
      });
    });

    childProcess.on('error', (error) => {
      resolve({
        success: false,
        script,
        nodeCommand,
        output: error.message,
        durationMs: Date.now() - startTime,
      });
    });
  });
}

/**
 * Run a shell script
 */
async function runShellScript(
  script: string,
  startTime: number,
  context: QuickChecksContext
): Promise<CheckResult> {
  return new Promise((resolve) => {
    validateScriptPath(script, context.log);

    const scriptProcess = spawn('bash', [script], {
      cwd: REPO_ROOT,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const outputCapture = createLimitedOutputCapture();

    scriptProcess.stdout?.on('data', outputCapture.append);
    scriptProcess.stderr?.on('data', outputCapture.append);

    scriptProcess.on('close', (code) => {
      resolve({
        success: code === 0,
        script,
        output: outputCapture.get(),
        durationMs: Date.now() - startTime,
      });
    });

    scriptProcess.on('error', (error) => {
      resolve({
        success: false,
        script,
        output: error.message,
        durationMs: Date.now() - startTime,
      });
    });
  });
}

/**
 * Validate that a script path is safe to execute
 */
export function validateScriptPath(scriptPath: string, log: ToolingLog): void {
  if (!isAbsolute(scriptPath)) {
    log.error(`Invalid script path: ${scriptPath}`);

    throw new Error('Invalid script path');
  } else if (!scriptPath.endsWith('.sh')) {
    log.error(`Invalid script extension: ${scriptPath}`);

    throw new Error('Invalid script extension');
  } else if (!existsSync(scriptPath)) {
    log.error(`Script not found: ${scriptPath}`);

    throw new Error('Script not found');
  }
}

/**
 * Create a limited output capture to avoid memory issues with large outputs
 */
export function createLimitedOutputCapture() {
  let output = '';
  return {
    append: (data: string | Buffer) => {
      const str = data.toString();

      output += str;

      // Keep only the last MAX_OUTPUT_SIZE characters
      if (output.length > MAX_OUTPUT_SIZE) {
        output = '...(truncated)...\n' + output.slice(-MAX_OUTPUT_SIZE);
      }
    },
    get: () => output,
  };
}
