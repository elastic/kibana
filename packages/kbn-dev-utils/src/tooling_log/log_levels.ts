/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const LEVELS = ['silent', 'error', 'warning', 'success', 'info', 'debug', 'verbose'] as const;
export const DEFAULT_LOG_LEVEL = 'info' as const;
export type LogLevel = typeof LEVELS[number];

export function pickLevelFromFlags(
  flags: Record<string, string | boolean | string[] | undefined>,
  options: { default?: LogLevel } = {}
) {
  if (flags.verbose) return 'verbose';
  if (flags.debug) return 'debug';
  if (flags.info) return 'info';
  if (flags.quiet) return 'error';
  if (flags.silent) return 'silent';
  return options.default || DEFAULT_LOG_LEVEL;
}

export const LOG_LEVEL_FLAGS = [
  {
    name: 'verbose',
    help: '--verbose, -v      Log verbosely',
  },
  {
    name: 'info',
    help: "--info             Don't log debug messages",
  },
  {
    name: 'debug',
    help: '--debug            Log debug messages (less than verbose)',
  },
  {
    name: 'quiet',
    help: '--quiet            Only log errors',
  },
  {
    name: 'silent',
    help: "--silent           Don't log anything",
  },
];

export function getLogLevelFlagsHelp(defaultLogLevel: string = DEFAULT_LOG_LEVEL) {
  return LOG_LEVEL_FLAGS.filter(({ name }) => name !== defaultLogLevel)
    .map(({ help }) => help)
    .join('\n');
}

export type ParsedLogLevel = ReturnType<typeof parseLogLevel>;

export function parseLogLevel(name: LogLevel) {
  const i = LEVELS.indexOf(name);

  if (i === -1) {
    const msg = `Invalid log level "${name}" ` + `(expected one of ${LEVELS.join(',')})`;
    throw new Error(msg);
  }

  const flags: { [key: string]: boolean } = {};
  LEVELS.forEach((level, levelI) => {
    flags[level] = levelI <= i;
  });

  return {
    name,
    flags: flags as { [key in LogLevel]: boolean },
  };
}
