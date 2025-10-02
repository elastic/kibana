/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Handle known errors and warning developers of fixes to apply
 * @param {import("./cli_error.mjs").CliError} error
 * @param {string} command
 */
export function handleKnownError(error, command) {
  const handlers = [warnMoonV141Error];

  for (const handler of handlers) {
    // @ts-ignore
    const message = handler(error, command);
    if (message) {
      console.warn(' ⚠️ The above is a known error with a suggested fix.');
      console.warn(message);
      return;
    }
  }
}

/**
 * @param {{ message: string | string[]; }} error
 */
function warnMoonV141Error(error) {
  if (error.message.includes('Invalid identifier format for ``. May only contain alpha-numeric')) {
    return [
      'Moon v1.41.0+ is incompatible with cache states from earlier versions of Moon. To fix this:',
      '\t - Delete the `.moon/cache` directory and retry your command',
      '\t - Or run `yarn kbn reset` to clear all cached state, then re-bootstrap with `yarn kbn bootstrap`',
    ].join('\n');
  }
}
