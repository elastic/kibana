/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createFlagError } from './cli_error.mjs';

/**
 * @param {string[]} argv
 */
function parseArgv(argv) {
  /** @type {string[]} */
  const raw = [];
  /** @type {string[]} */
  const positional = [];
  /** @type {Map<string, string | string[] | boolean>} */
  const flags = new Map();

  for (const arg of argv) {
    raw.push(arg);

    if (!arg.startsWith('--')) {
      // positional arguments are anything that doesn't start with "--"
      positional.push(arg);
      continue;
    }

    // flags always start with "--" and might have an =value attached.
    //   - If the flag name starts with "no-", like `--no-flag`, it will set `flag` to `false`
    //   - If the flag has multiple string values they will be turned into an array of values
    const [name, ...value] = arg.slice(2).split('=');
    if (value.length === 0) {
      // boolean flag
      if (name.startsWith('no-')) {
        flags.set(name.slice(3), false);
      } else {
        flags.set(name, true);
      }
    } else {
      flags.set(name, value.join('='));
    }
  }

  return { raw, positional, flags };
}

export class Args {
  #flags;
  #positional;
  #raw;
  #defaults;

  /**
   * @param {string[]} argv
   * @param {string[]} defaultArgv
   */
  constructor(argv, defaultArgv) {
    const { flags, positional, raw } = parseArgv(argv);
    this.#flags = flags;
    this.#positional = positional;
    this.#raw = raw;
    this.#defaults = parseArgv(defaultArgv).flags;
  }

  /**
   * @returns {import('@kbn/some-dev-log').SomeLogLevel}
   */
  getLoggingLevel() {
    if (this.getBooleanValue('quiet')) {
      return 'quiet';
    }

    if (this.getBooleanValue('verbose')) {
      return 'verbose';
    }

    if (this.getBooleanValue('debug')) {
      return 'debug';
    }

    return 'info';
  }

  /**
   * Get the command name from the args
   */
  getCommandName() {
    return this.#positional[0];
  }

  /**
   * Get the positional arguments, excludes the command name
   */
  getPositionalArgs() {
    return this.#positional.slice(1);
  }

  /**
   * Get all of the passed args
   */
  getRawArgs() {
    return this.#raw.slice();
  }

  /**
   * Get the value of a specific flag as a string, if the argument is specified multiple
   * times then only the last value specified will be returned. If the flag was specified
   * as a boolean then an error will be thrown. If the flag wasn't specified then
   * undefined will be returned.
   * @param {string} name
   */
  getStringValue(name) {
    const value = this.#flags.get(name) ?? this.#defaults.get(name);
    if (Array.isArray(value)) {
      return value.at(-1);
    }

    if (typeof value === 'boolean') {
      throw createFlagError(`Expected [--${name}] to have a value, not be a boolean flag`);
    }

    return value;
  }

  /**
   * Get the string values of a flag as an array of values. This will return all values for a
   * given flag and any boolean values will cause an error to be thrown.
   * @param {string} name
   */
  getStringValues(name) {
    const value = this.#flags.get(name) ?? this.#defaults.get(name);
    if (typeof value === 'string') {
      return [value];
    }

    if (value === undefined || Array.isArray(value)) {
      return value;
    }

    throw createFlagError(`Expected [--${name}] to have a string value`);
  }

  /**
   * Get the boolean value of a specific flag. If the flag wasn't defined then undefined will
   * be returned. If the flag was specified with a string value then an error will be thrown.
   * @param {string} name
   */
  getBooleanValue(name) {
    const value = this.#flags.get(name) ?? this.#defaults.get(name);
    if (typeof value === 'boolean' || value === undefined) {
      return value;
    }

    throw createFlagError(
      `Unexpected value for [--${name}], this is a boolean flag and should be specified as just [--${name}] or [--no-${name}]`
    );
  }

  /**
   * Get the value of a specific flag parsed as a number. If the flag wasn't specified then
   * undefined will be returned. If the flag was specified multiple times then the last value
   * specified will be used. If the flag's value can't be parsed as a number then an error
   * will be returned.
   * @param {string} name
   */
  getNumberValue(name) {
    const value = this.getStringValue(name);
    if (value === undefined) {
      return value;
    }

    const parsed = parseFloat(value);
    if (Number.isNaN(parsed)) {
      throw createFlagError(`Expected value of [--${name}] to be parsable as a valid number`);
    }

    return parsed;
  }
}
