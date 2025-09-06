/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Test utilities for integration tests
 * Provides helpers for CLI process management, file operations, and timeouts
 */

import Fs from 'node:fs';
import Path from 'node:path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';

// Global test timeout for async operations
jest.setTimeout(30000);

/**
 * Cleanup callbacks to run after each test
 */
const cleanupCallbacks: Array<() => void | Promise<void>> = [];
const tempFiles: string[] = [];
const spawnedProcesses: any[] = [];

/**
 * Register cleanup callback for test resources
 */
export function registerCleanup(callback: () => void | Promise<void>) {
  cleanupCallbacks.push(callback);
}

/**
 * Register temporary file for cleanup
 */
export function registerTempFile(filePath: string) {
  tempFiles.push(filePath);
}

/**
 * Register spawned process for cleanup
 */
export function registerSpawnedProcess(process: any) {
  spawnedProcesses.push(process);
}

/**
 * Create temporary directory for test files
 */
export function createTempDir(): string {
  const tempDir = Fs.mkdtempSync(Path.join(tmpdir(), 'kbn-validate-oas-test-'));
  registerCleanup(() => {
    if (Fs.existsSync(tempDir)) {
      Fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  return tempDir;
}

/**
 * Cleanup all test resources
 */
export async function cleanupTestResources() {
  // Kill spawned processes
  for (const process of spawnedProcesses) {
    try {
      if (process && process.kill && !process.killed) {
        process.kill('SIGTERM');
      }
    } catch (error) {
      // Silent cleanup - no console logs
    }
  }

  // Remove temporary files
  for (const filePath of tempFiles) {
    try {
      if (Fs.existsSync(filePath)) {
        Fs.unlinkSync(filePath);
      }
    } catch (error) {
      // Silent cleanup - no console logs
    }
  }

  // Run custom cleanup callbacks
  for (const callback of cleanupCallbacks) {
    try {
      await callback();
    } catch (error) {
      // Silent cleanup - no console logs
    }
  }

  // Clear arrays for next test
  cleanupCallbacks.length = 0;
  tempFiles.length = 0;
  spawnedProcesses.length = 0;
}

// Setup cleanup after each test
afterEach(async () => {
  await cleanupTestResources();
});

// Setup cleanup before process exit
process.on('exit', () => {
  try {
    // Synchronous cleanup only
    for (const filePath of tempFiles) {
      try {
        if (Fs.existsSync(filePath)) {
          Fs.unlinkSync(filePath);
        }
      } catch (error) {
        // Silent cleanup on exit
      }
    }
  } catch (error) {
    // Silent cleanup on exit
  }
});

/**
 * Enhanced Promise utilities for tests
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
}

/**
 * CLI process wrapper with timeout and cleanup
 */
export function spawnWithCleanup(
  command: string,
  args: string[] = [],
  options: any = {},
  timeoutMs: number = 15000
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      ...options,
    });

    registerSpawnedProcess(child);

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code: number) => {
      resolve({ stdout, stderr, code });
    });

    child.on('error', (error: Error) => {
      reject(error);
    });

    // Timeout handling
    const timeout = setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGTERM');
        reject(new Error(`Process timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    child.on('close', () => {
      clearTimeout(timeout);
    });
  });
}
