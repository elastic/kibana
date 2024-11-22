/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFile } from 'child_process';
import { availableParallelism } from 'os';
import { isAbsolute, join } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';

import { run, RunOptions } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';

const MAX_PARALLELISM = availableParallelism();
const buildkiteQuickchecksFolder = join('.buildkite', 'scripts', 'steps', 'checks');
const quickChecksList = join(buildkiteQuickchecksFolder, 'quick_checks.txt');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface CheckResult {
  success: boolean;
  script: string;
  output: string;
  durationMs: number;
}

const scriptOptions: RunOptions = {
  description: `
    Runs sanity-testing quick-checks in parallel.
      - arguments (--file, --dir, --checks) are exclusive - only one can be used at a time.
  `,
  flags: {
    string: ['dir', 'checks', 'file'],
    help: `
        --file             Run all checks from a given file. (default='${quickChecksList}')
        --dir              Run all checks in a given directory.
        --checks           Runs all scripts given in this parameter. (comma or newline delimited)
      `,
  },
  log: {
    context: 'quick-checks',
    defaultLevel: process.env.CI === 'true' ? 'debug' : 'info',
  },
};

let logger: ToolingLog;
void run(async ({ log, flagsReader }) => {
  logger = log;

  const scriptsToRun = collectScriptsToRun({
    targetFile: flagsReader.string('file'),
    targetDir: flagsReader.string('dir'),
    checks: flagsReader.string('checks'),
  }).map((script) => (isAbsolute(script) ? script : join(REPO_ROOT, script)));

  logger.write(
    `--- Running ${scriptsToRun.length} checks, with parallelism ${MAX_PARALLELISM}...`,
    scriptsToRun
  );
  const startTime = Date.now();
  const results = await runAllChecks(scriptsToRun);

  logger.write('--- All checks finished.');
  printResults(startTime, results);

  const failedChecks = results.filter((check) => !check.success);
  if (failedChecks.length > 0) {
    logger.write(`--- ${failedChecks.length} quick check(s) failed. ❌`);
    logger.write(`See the script(s) marked with ❌ above for details.`);
    process.exitCode = 1;
  } else {
    logger.write('--- All checks passed. ✅');
    return results;
  }
}, scriptOptions);

function collectScriptsToRun(inputOptions: {
  targetFile: string | undefined;
  targetDir: string | undefined;
  checks: string | undefined;
}) {
  const { targetFile, targetDir, checks } = inputOptions;
  if ([targetFile, targetDir, checks].filter(Boolean).length > 1) {
    throw new Error('Only one of --file, --dir, or --checks can be used at a time.');
  }

  if (targetDir) {
    const targetDirAbsolute = isAbsolute(targetDir) ? targetDir : join(REPO_ROOT, targetDir);
    return readdirSync(targetDirAbsolute).map((file) => join(targetDir, file));
  } else if (checks) {
    return checks
      .trim()
      .split(/[,\n]/)
      .map((script) => script.trim());
  } else {
    const targetFileWithDefault = targetFile || quickChecksList;
    const targetFileAbsolute = isAbsolute(targetFileWithDefault)
      ? targetFileWithDefault
      : join(REPO_ROOT, targetFileWithDefault);

    return readFileSync(targetFileAbsolute, 'utf-8')
      .trim()
      .split('\n')
      .map((line) => line.trim());
  }
}

async function runAllChecks(scriptsToRun: string[]): Promise<CheckResult[]> {
  const checksRunning: Array<Promise<any>> = [];
  const checksFinished: CheckResult[] = [];

  while (scriptsToRun.length > 0 || checksRunning.length > 0) {
    while (scriptsToRun.length > 0 && checksRunning.length < MAX_PARALLELISM) {
      const script = scriptsToRun.shift();
      if (!script) {
        continue;
      }

      const check = runCheckAsync(script);
      checksRunning.push(check);
      check
        .then((result) => {
          checksRunning.splice(checksRunning.indexOf(check), 1);
          checksFinished.push(result);
        })
        .catch((error) => {
          checksRunning.splice(checksRunning.indexOf(check), 1);
          checksFinished.push({
            success: false,
            script,
            output: error.message,
            durationMs: 0,
          });
        });
    }

    await sleep(1000);
  }

  return checksFinished;
}

async function runCheckAsync(script: string): Promise<CheckResult> {
  logger.info(`Starting check: ${script}`);
  const startTime = Date.now();

  return new Promise((resolve) => {
    validateScriptPath(script);
    const scriptProcess = execFile('bash', [script]);
    let output = '';
    const appendToOutput = (data: string | Buffer) => (output += data.toString());

    scriptProcess.stdout?.on('data', appendToOutput);
    scriptProcess.stderr?.on('data', appendToOutput);

    scriptProcess.on('exit', (code) => {
      const result: CheckResult = {
        success: code === 0,
        script,
        output,
        durationMs: Date.now() - startTime,
      };
      if (code === 0) {
        logger.info(`Passed check: ${script} in ${humanizeTime(result.durationMs)}`);
      } else {
        logger.warning(`Failed check: ${script} in ${humanizeTime(result.durationMs)}`);
      }

      resolve(result);
    });
  });
}

function printResults(startTimestamp: number, results: CheckResult[]) {
  const totalDuration = results.reduce((acc, result) => acc + result.durationMs, 0);
  const total = humanizeTime(totalDuration);
  const effective = humanizeTime(Date.now() - startTimestamp);
  logger.info(`- Total time: ${total}, effective: ${effective}`);

  results.forEach((result) => {
    const resultLabel = result.success ? '✅' : '❌';
    const scriptPath = stripRoot(result.script);
    const runtime = humanizeTime(result.durationMs);
    logger.write(`--- ${resultLabel} ${scriptPath}: ${runtime}`);
    if (result.success) {
      logger.debug(result.output);
    } else {
      logger.warning(result.output);
    }
  });
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

function validateScriptPath(scriptPath: string) {
  if (!isAbsolute(scriptPath)) {
    logger.error(`Invalid script path: ${scriptPath}`);
    throw new Error('Invalid script path');
  } else if (!scriptPath.endsWith('.sh')) {
    logger.error(`Invalid script extension: ${scriptPath}`);
    throw new Error('Invalid script extension');
  } else if (!existsSync(scriptPath)) {
    logger.error(`Script not found: ${scriptPath}`);
    throw new Error('Script not found');
  } else {
    return;
  }
}

function stripRoot(script: string) {
  return script.replace(REPO_ROOT, '');
}
