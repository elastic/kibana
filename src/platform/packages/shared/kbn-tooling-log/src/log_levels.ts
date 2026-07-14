/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const LEVELS = ['silent', 'error', 'warning', 'success', 'info', 'debug', 'verbose'] as const;
export const DEFAULT_LOG_LEVEL = 'info' as const;
export type LogLevel = (typeof LEVELS)[number];

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

export const LOG_LEVEL_FLAGS: Array<{
  name: 'verbose' | 'info' | 'debug' | 'quiet' | 'silent';
  flag: string;
  description: string;
}> = [
  { name: 'verbose', flag: '--verbose, -v', description: 'Log verbosely' },
  { name: 'info', flag: '--info', description: "Don't log debug messages" },
  { name: 'debug', flag: '--debug', description: 'Log debug messages (less than verbose)' },
  { name: 'quiet', flag: '--quiet', description: 'Only log errors' },
  { name: 'silent', flag: '--silent', description: "Don't log anything" },
];

export function getLogLevelFlagHelpItems(
  defaultLogLevel: string = DEFAULT_LOG_LEVEL
): Array<{ flag: string; description: string }> {
  return LOG_LEVEL_FLAGS.filter(({ name }) => name !== defaultLogLevel).map(
    ({ flag, description }) => ({ flag, description })
  );
}

export function getLogLevelFlagsHelp(defaultLogLevel: string = DEFAULT_LOG_LEVEL) {
  const items = LOG_LEVEL_FLAGS.filter(({ name }) => name !== defaultLogLevel);
  const maxWidth = Math.max(...items.map(({ flag }) => flag.length));
  const pad = maxWidth + 2;
  return items.map(({ flag, description }) => `${flag.padEnd(pad)}${description}`).join('\n');
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
