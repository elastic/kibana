/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Spawns the functional test runner with a config and collects stdout
 * @param {string} script - Path to the functional test runner script
 * @param {string} configPath - Path to the test configuration file
 * @param {number} timeoutMs - Timeout in milliseconds (default: 3000)
 * @returns {Promise<string>} - The collected stdout as a string
 */
export async function runFunctionalTestRunner(script, configPath, timeoutMs = 3000) {
  const { spawn } = await import('child_process');

  const proc = spawn(process.execPath, [script, '--config', configPath], {
    // this FTR run should not produce a scout report
    env: { ...process.env, SCOUT_REPORTER_ENABLED: '0' },
  });

  let stdout = '';
  proc.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  // Add timeout and early termination
  const timeout = setTimeout(() => {
    proc.kill('SIGTERM');
  }, timeoutMs);

  await new Promise((resolve, reject) => {
    proc.on('close', (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
    proc.on('error', reject);
  });

  return stdout;
}
