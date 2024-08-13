/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { exec } from 'child_process';
import * as os from 'os';

interface Result {
  success: boolean;
  script: string;
  output: string;
  duration: number;
}

const MAX_PARALLELISM = os.cpus().length - 1;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Takes arguments from the command line, runs every command in the array, collects results, and prints a summary.
 */
async function main() {
  const scriptsToRun = process.argv[2]
    .trim()
    .split('\n')
    .map((script) => script.trim());

  console.log(`--- Running ${scriptsToRun.length} checks...`, scriptsToRun);

  const checksRunning: Array<Promise<any>> = [];
  const checksFinished: Result[] = [];

  while (scriptsToRun.length > 0 || checksRunning.length > 0) {
    while (scriptsToRun.length > 0 && checksRunning.length < MAX_PARALLELISM) {
      const script = scriptsToRun.shift();
      if (!script) {
        continue;
      }
      const check = runCheckAsync(script, checksRunning, checksFinished);
      checksRunning.push(check);
    }

    await sleep(1000);
  }

  console.log('--- All checks finished.');
  printDurations(checksFinished);

  const failedChecks = checksFinished.filter((check) => !check.success);
  if (failedChecks.length > 0) {
    console.error('--- Failed checks:');
    failedChecks.forEach((check) => {
      console.error(`Failed check: ${check.script} ->`);
      console.error(check.output);
    });

    throw new Error(`Failed ${failedChecks.length} checks.`);
  } else {
    return checksFinished;
  }
}

async function runCheckAsync(
  script: string,
  checksRunning: Array<Promise<any>>,
  checksFinished: Result[]
) {
  console.log(`Starting check: ${script}`);
  const startTime = Date.now();
  const check = new Promise<void>((resolve) => {
    const result = {
      success: false,
      script,
      output: '',
      duration: 0,
    };

    const scriptProcess = exec(script);

    let output = '';

    scriptProcess.stdout?.on('data', (data) => {
      output += data;
    });

    scriptProcess.stderr?.on('data', (data) => {
      output += data;
    });

    scriptProcess.on('exit', (code) => {
      result.output = output;
      result.duration = Date.now() - startTime;
      checksRunning.splice(checksRunning.indexOf(check), 1);
      checksFinished.push(result);

      if (code === 0) {
        console.info(`Passed check: ${script} in ${humanizeTime(result.duration)}`);
        result.success = true;
      } else {
        console.warn(`Failed check: ${script} in ${humanizeTime(result.duration)}`);
        result.success = false;
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

    process.exit(0);
  })
  .catch((error) => {
    console.error('--- Some quick checks failed.');
    console.error(error);

    process.exit(1);
  });

function printDurations(results: Result[]) {
  const totalDuration = results.reduce((acc, result) => acc + result.duration, 0);

  console.log('- Check durations:');
  results.forEach((result) => {
    console.log(
      `${result.success ? '✅' : '❌'} ${result.script}: ${humanizeTime(result.duration)}`
    );
  });
  const total = humanizeTime(totalDuration);
  const effective = humanizeTime(Date.now() - startTime);
  console.log(`- Total time: ${total}, effective: ${effective}`);
}

function humanizeTime(ms: number) {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const minutes = Math.floor(ms / 1000 / 60);
  const seconds = Math.floor((ms - minutes * 60 * 1000) / 1000);
  if (minutes === 0) {
    return `${seconds}s`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}

export {};
