/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from './spawn.mjs';

const getMoonExec = (() => {
  let moonExecPath = null;

  return async () => {
    if (!moonExecPath) {
      moonExecPath = (await run('yarn', ['--silent', 'which', 'moon'])).trim();
      console.warn(`Using moon at ${moonExecPath}`);
    }
    return moonExecPath;
  };
})();

/**
 * @import { RunOpts } from './spawn.mjs';
 */

/**
 * Runs a moon command, and does the necessary output and error handling.
 * @param {string} command
 * @param {RunOpts & { passAlongArgs?: string[], noCache?: boolean, noActions?: boolean, quiet?: boolean }} opts
 */
export async function moonRun(commandOrCommands, opts = {}) {
  // Get moon's exec directly to avoid the yarn wrapping, allow for pass-along args
  const moonExec = await getMoonExec();

  const moonArgs = [];
  if (opts.noCache) {
    moonArgs.push('-u');
  }
  if (opts.noActions) {
    moonArgs.push('--no-actions');
  }
  if (opts.quiet) {
    moonArgs.push('--quiet');
  }

  const commands = Array.isArray(commandOrCommands) ? commandOrCommands : [commandOrCommands];
  const args = ['run', ...moonArgs, ...commands];

  if (opts.passAlongArgs) {
    args.push('--', ...opts.passAlongArgs);
  }

  opts.filter = combinePredicates(
    ...[opts.filter, excludeShallowCloneWarnings, excludeRemoteWarnings].filter(Boolean)
  );

  return run(moonExec, args, opts);
}

/**
 * Exclude warnings about shallow clones, it's not very useful here
 * @param {string} line
 * @returns {boolean}
 */
function excludeShallowCloneWarnings(line) {
  return !(line.includes('WARN') && line.includes('moon_app::queries::touched_files'));
}

/**
 * Exclude warnings about using the remote cache
 * @param {string} line
 * @returns {boolean}
 */
function excludeRemoteWarnings(line) {
  return !(line.includes('INFO') && line.includes('moon_remote::remote_service'));
}

/**
 * @param {Function[]} predicates
 * @returns {Function}
 */
function combinePredicates(...predicates) {
  return (line) => predicates.every((predicate) => predicate(line));
}
