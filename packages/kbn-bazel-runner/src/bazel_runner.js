/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ChildProcess = require('child_process');
const Readline = require('readline');

/**
 * Print each line of output to the console
 * @param {import('stream').Readable} stream
 * @param {string | undefined} prefix
 */
async function printLines(stream, prefix) {
  const int = Readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  // A validation between the previous logged line and the new one to log was introduced
  // as the last line of the Bazel task when ran with progress enabled was being logged
  // twice after parsing the log output with the logic we have here.
  // The original output when letting Bazel taking care of it on its own doesn't include the repeated line
  // so this check logic is useful until we get rid of Bazel.
  let prevLine = null;
  for await (const line of int) {
    if (prevLine === line) {
      continue;
    }
    console.log(prefix ? `${prefix} ${line}` : line);
    prevLine = line;
  }
}

/**
 * Buffer each line of output to an array so that it can be printed if necessary
 * @param {import('stream').Readable} stream
 * @param {string[]} buffer
 */
async function bufferLines(stream, buffer) {
  const int = Readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  for await (const line of int) {
    buffer.push(line);
  }
}

/**
 * @param {import('events').EventEmitter} emitter
 * @param {string} event
 * @returns {Promise<any>}
 */
function once(emitter, event) {
  return new Promise((resolve) => {
    emitter.once(event, resolve);
  });
}

/**
 * @param {'bazel' | 'ibazel'} runner
 * @param {string[]} args
 * @param {import('./types').BazelRunOptions | undefined} options
 */
async function runBazelRunner(runner, args, options = undefined) {
  const proc = ChildProcess.spawn(runner, options?.quiet ? [...args, '--color=no'] : args, {
    env: {
      ...process.env,
      ...options?.env,
    },
    cwd: options?.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  /** @type {string[]} */
  const buffer = [];

  await Promise.all([
    options?.quiet
      ? Promise.all([bufferLines(proc.stdout, buffer), bufferLines(proc.stderr, buffer)])
      : Promise.all([
          printLines(proc.stdout, options?.logPrefix),
          printLines(proc.stderr, options?.logPrefix),
        ]),

    // Wait for process to exit, or error
    Promise.race([
      once(proc, 'exit').then((code) => {
        if (typeof code !== 'number' || code === 0) {
          return;
        }

        if (options?.onErrorExit) {
          options.onErrorExit(code, buffer.join('\n'));
        } else {
          throw new Error(
            `The bazel command that was running exitted with code [${code}]${
              buffer.length ? `\n  output:\n${buffer.map((l) => `    ${l}`).join('\n')}` : ''
            }`
          );
        }
      }),

      once(proc, 'error').then((error) => {
        throw error;
      }),
    ]),
  ]);

  if (process.env.CI && !options?.quiet) {
    // on CI it's useful to reduce the logging output, but we still want to see basic info from Bazel so continue to log the INFO: lines from bazel
    for (const line of buffer) {
      if (line.startsWith('INFO:') && !line.startsWith('INFO: From ')) {
        console.log(options?.logPrefix ? `${options.logPrefix} ${line}` : line);
      }
    }
  }
}

/**
 * @param {string[]} args
 * @param {import('./types').BazelRunOptions | undefined} options
 */
async function runBazel(args, options = undefined) {
  return await runBazelRunner('bazel', args, options);
}

/**
 * @param {string[]} args
 * @param {import('./types').BazelRunOptions | undefined} options
 */
async function runIBazel(args, options = undefined) {
  return await runBazelRunner('ibazel', args, {
    ...options,
    env: {
      IBAZEL_USE_LEGACY_WATCHER: '0',
      ...options?.env,
    },
  });
}

module.exports = { runBazel, runIBazel };
