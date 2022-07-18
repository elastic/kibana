/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ChildProcess from 'child_process';
import Readline from 'readline';

import { createCliError } from './cli_error.mjs';
import { REPO_ROOT } from './paths.mjs';
import { indent } from './indent.mjs';

/** @typedef {{ cwd?: string, env?: Record<string, string> }} SpawnOpts */

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
 * Print each line of output to the console
 * @param {import('stream').Readable} stream
 * @param {string | undefined} prefix
 */
async function printLines(stream, prefix) {
  const int = Readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  for await (const line of int) {
    console.log(prefix ? `${prefix} ${line}` : line);
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
