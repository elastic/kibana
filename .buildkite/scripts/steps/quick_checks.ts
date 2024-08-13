/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { exec } from 'child_process';

interface Result {
  success: boolean;
  script: string;
  stdout: string;
  stderr: string;
  duration: number;
}

const MAX_PARALLELISM = 6;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Takes arguments from the command line, runs every command in the array, collects results, and prints a summary.
 */
async function main() {
  const scriptsToRun = process.argv[2]
    .trim()
    .split('\n')
    .map((script) => script.trim());

  console.log(`--- Running ${scriptsToRun.length} checks...`);
  console.log(scriptsToRun);

  const checksRunning: Array<Promise<any>> = [];
  const checksFinished: Result[] = [];

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
      console.error(`stdout:\n${check.stdout}`);
      console.error(`stderr:\n${check.stderr}`);
    });
    const error = new Error(`Failed ${failedChecks.length} checks.`);
    (error as any).results = checksFinished;

    throw error;
  }

  return checksFinished;
}

async function runCheck(
  script: string,
  checksRunning: Array<Promise<any>>,
  checksFinished: Result[]
) {
  console.log(`Starting check: ${script}`);
  const startTime = Date.now();
  const check = new Promise<void>((resolve, reject) => {
    const result = {
      success: false,
      script,
      stdout: '',
      stderr: '',
      duration: 0,
    };
    exec(script, (error, stdout, stderr) => {
      result.stderr = stderr;
      result.stdout = stdout;
      result.duration = Date.now() - startTime;

      checksRunning.splice(checksRunning.indexOf(check), 1);
      checksFinished.push(result);

      if (error) {
        console.warn(`Failed check: ${script} in ${result.duration}ms`);
        result.success = false;
      } else {
        console.info(`Passed check: ${script} in ${result.duration}ms`);
        result.success = true;
      }

      resolve();
    });
  });

  return check;
}

const startTime = Date.now();

main()
  .then((results) => {
    console.log('--- All checks passed.');

    printDurations(results);

    process.exit(0);
  })
  .catch((error) => {
    console.error('--- Some quick checks failed.');
    console.error(error);

    const results = error.results as Result[];
    printDurations(results);

    process.exit(1);
  });

function printDurations(results: Result[]) {
  const totalDuration = results.reduce((acc, result) => acc + result.duration, 0);

  console.log('- Check durations:');
  results.forEach((result) => {
    console.log(`${result.script}: ${result.duration}ms`);
  });
  console.log(`- Total time: ${totalDuration}ms (effective ${Date.now() - startTime}ms)`);
}

export {};
