/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isObj } from './obj_helpers.mjs';

/** @typedef {Error & { showHelp: boolean, exitCode?: number }} CliError */

/**
 * Create a CliError instance
 * @param {string} message
 * @param {{ showHelp?: boolean, exitCode?: number } | undefined} options
 * @returns {CliError}
 */
export function createCliError(message, options = undefined) {
  /** @type {true} */
  const __isCliError = true;

  return Object.assign(new Error(message), {
    __isCliError,
    showHelp: options?.showHelp || false,
    exitCode: options?.exitCode,
  });
}

/**
 * @param {string} message
 */
export function createFlagError(message) {
  return createCliError(message, {
    showHelp: true,
    exitCode: 1,
  });
}

/**
 * Determine if the passed value is a CliError
 *
 * @param {unknown} error
 * @returns {error is CliError}
 */
export function isCliError(error) {
  return isObj(error) && !!error.__isCliError;
}
