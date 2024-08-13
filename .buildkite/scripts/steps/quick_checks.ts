/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { exec } from 'child_process';

const MAX_PARALLELISM = 5;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Takes arguments from the command line, runs every command in the array, collects results, and prints a summary.
 */
async function main() {
  const scriptsToRun = process.argv[2].trim().split("\n").map((script) => script.trim());

  console.log(`Running ${scriptsToRun.length} checks...`, scriptsToRun);

  const checksRunning: Promise<any>[] = [];
  const checksFinished: any[] = [];

  while (scriptsToRun.length > 0 || checksRunning.length > 0) {
    while (scriptsToRun.length > 0 && checksRunning.length < MAX_PARALLELISM) {
      const script = scriptsToRun.shift();
      if (!script) {
        continue;
      }
      const check = runCheck(script, checksRunning, checksFinished);
      checksRunning.push(check);
    }

    await sleep(1000);
  }

  console.log('All checks finished.');
  const failedChecks = checksFinished.filter((check) => !check.success);
  if (failedChecks.length > 0) {
    console.error('--- Failed checks:');
    failedChecks.forEach((check) => {
      console.error(`Check: ${check.script}`);
      console.error(`stdout: ${check.stdout}`);
      console.error(`stderr: ${check.stderr}`);
    });
    throw new Error(`Failed ${failedChecks.length} checks.`);
  } else {
    console.info('All checks passed.');
  }
}

async function runCheck(script: string, checksRunning: Promise<any>[], checksFinished: any[]) {
  console.log(`Starting check: ${script}`);
  const check = new Promise((resolve, reject) => {
    const result = {
      success: false,
      script,
      stdout: '',
      stderr: '',
    };
    exec(script, (error, stdout, stderr) => {
      checksRunning.splice(checksRunning.indexOf(check), 1);
      checksFinished.push(result);
      if (error) {
        console.warn(`Failed check: ${script}`);
        result.stderr = stderr;
        result.success = false;
        resolve(error);
      } else {
        console.info(`Passed check: ${script}`);
        result.stdout = stdout;
        result.success = true;
        resolve(stdout);
      }
    });
  });

  return check;
}

main().then(() => {}).catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
