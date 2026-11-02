/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ChildProcess from 'child_process';
import Readline from 'readline';

import { createCliError } from './cli_error.mjs';
import { REPO_ROOT } from './paths.mjs';
import { indent } from './indent.mjs';

/** @typedef {{ cwd?: string, env?: Record<string, string> }} SpawnOpts */

/**
 * @param {NodeJS.ReadableStream} readable
 */
function getLines(readable) {
  return Readline.createInterface({
    input: readable,
    crlfDelay: Infinity,
  });
}

/**
 * Wait for the exit of a child process, if the process emits "error" the promise
 * will reject, if it emits "exit" the promimse will resolve with the exit code or `null`
 * @param {ChildProcess.ChildProcess} proc
 * @returns {Promise<number | null>}
 */
function getExit(proc) {
  return new Promise((resolve, reject) => {
    /**
     * @param {Error | null} err
     * @param {number | null} code
     */
    function teardown(err = null, code = null) {
      proc.removeListener('error', onError);
      proc.removeListener('exit', onExit);

      if (err) {
        reject(err);
      } else {
        resolve(code);
      }
    }

    /**
     *
     * @param {Error} err
     */
    function onError(err) {
      teardown(err);
    }

    /**
     * @param {number | null} code
     * @param {string | null} signal
     */
    function onExit(code, signal) {
      teardown(null, typeof signal === 'string' || typeof code !== 'number' ? null : code);
    }

    proc.on('error', onError);
    proc.on('exit', onExit);
  });
}

/**
 * Print each line of output to the console
 * @param {NodeJS.ReadableStream} readable
 * @param {string | undefined} prefix
 */
async function printLines(readable, prefix) {
  for await (const line of getLines(readable)) {
    console.log(prefix ? `${prefix} ${line}` : line);
  }
}

/**
 * @param {NodeJS.ReadableStream} readable
 * @param {string[]} output
 */
async function read(readable, output) {
  for await (const line of getLines(readable)) {
    output.push(line);
  }
}

/**
 * @typedef {undefined | (SpawnOpts & { description?: string, pipe?: boolean, filter?: Function })} RunOpts
 * */

/**
 * Run a child process and return it's stdout
 * @param {string} cmd
 * @param {string[]} args
 * @param {RunOpts} opts
 */
export async function run(cmd, args, opts = undefined) {
  const proc = ChildProcess.spawn(cmd === 'node' ? process.execPath : cmd, args, {
    cwd: opts?.cwd ?? REPO_ROOT,
    env: {
      ...process.env,
      ...opts?.env,
    },
  });

  /** @type {string[]} */
  const output = [];

  if (opts?.pipe) {
    if (opts?.filter) {
      proc.stdout.filter(opts.filter).pipe(process.stdout);
      proc.stderr.filter(opts.filter).pipe(process.stderr);
    } else {
      proc.stdout.pipe(process.stdout);
      proc.stderr.pipe(process.stderr);
    }
  }

  const [, , exitCode] = await Promise.all([
    read(proc.stdout, output),
    read(proc.stderr, output),
    getExit(proc),
  ]);

  if (typeof exitCode === 'number' && exitCode > 0) {
    throw createCliError(
      `[${opts?.description ?? cmd}] exitted with ${exitCode}:\n` +
        `  output:\n${indent(4, output.join('\n'))}`
    );
  }

  return output.join('\n');
}

/**
 * Run a child process and return it's stdout
 * @param {string} cmd
 * @param {string[]} args
 * @param {undefined | (SpawnOpts & { description?: string })} opts
 */
export function spawnSync(cmd, args, opts = undefined) {
  const result = ChildProcess.spawnSync(cmd === 'node' ? process.execPath : cmd, args, {
    cwd: opts?.cwd ?? REPO_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...opts?.env,
    },
  });

  if (result.status !== null && result.status > 0) {
    throw createCliError(
      `[${opts?.description ?? cmd}] exitted with ${result.status}:\n${
        result.stdout.trim()
          ? `  stdout:\n${indent(4, result.stdout.trim())}\n\n`
          : '  stdout: no output\n'
      }${
        result.stderr.trim()
          ? `  stderr:\n${indent(4, result.stderr.trim())}\n\n`
          : '  stderr: no output\n'
      }`
    );
  }

  return result.stdout;
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
 * Run a child process and print the output to the log
 * @param {string} cmd
 * @param {string[]} args
 * @param {undefined | (SpawnOpts & { logPrefix?: string })} options
 */
export async function spawnStreaming(cmd, args, options = undefined) {
  const proc = ChildProcess.spawn(cmd, args, {
    env: {
      ...process.env,
      ...options?.env,
    },
    cwd: options?.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await Promise.all([
    printLines(proc.stdout, options?.logPrefix),
    printLines(proc.stderr, options?.logPrefix),

    // Wait for process to exit, or error
    Promise.race([
      once(proc, 'exit').then((code) => {
        if (typeof code !== 'number' || code === 0) {
          return;
        }

        throw new Error(`[${cmd}] exitted with code [${code}]`);
      }),

      once(proc, 'error').then((error) => {
        throw error;
      }),
    ]),
  ]);
}
