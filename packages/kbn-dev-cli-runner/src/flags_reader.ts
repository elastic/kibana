/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { createFlagError } from '@kbn/dev-cli-errors';
import { LOG_LEVEL_FLAGS } from '@kbn/tooling-log';

type FlagValue = string | string[] | boolean;
const FORCED_FLAGS = new Set([...LOG_LEVEL_FLAGS.map((l) => l.name), 'help']);

const makeAbsolute = (rel: string) => Path.resolve(process.cwd(), rel);

const nonUndefinedValues = (e: [string, FlagValue | undefined]): e is [string, FlagValue] =>
  e[1] !== undefined;

export class FlagsReader {
  private readonly used: Map<string, FlagValue>;
  private readonly unused: Map<string, FlagValue>;
  private readonly _: string[];
  private readonly aliasMap: Map<string, string>;

  constructor(
    flags: Record<string, FlagValue | undefined>,
    private readonly opts?: { aliases?: Record<string, string> }
  ) {
    this.used = new Map();
    this.unused = new Map(
      Object.entries(flags)
        .filter(nonUndefinedValues)
        .filter((e) => e[0] !== 'unexpected')
    );
    this.aliasMap = new Map(
      Object.entries(this.opts?.aliases ?? []).flatMap(([a, b]) => [
        [a, b],
        [b, a],
      ])
    );

    this._ = this.arrayOfStrings('_') ?? [];
  }

  private use(key: string) {
    const alias = this.aliasMap.get(key);

    const used = this.used.get(key);
    if (used !== undefined) {
      return used;
    }

    const unused = this.unused.get(key);
    if (unused !== undefined) {
      this.used.set(key, unused);
      this.unused.delete(key);

      if (alias !== undefined) {
        this.used.set(alias, unused);
        this.unused.delete(alias);
      }
    }

    return unused;
  }

  /**
   * Read a string flag that supports multiple instances into an array of strings. If the
   * flag is only passed once an array with a single item will be returned. If the flag is not
   * passed then undefined will be returned.
   */
  arrayOfStrings(key: string) {
    const value = this.use(key);

    switch (typeof value) {
      case 'boolean':
        throw createFlagError(`expected --${key} to be a string`);
      case 'string':
        return value ? [value] : [];
      default:
        return value;
    }
  }

  /**
   * Same as #arrayOfStrings() except when the flag is not passed a "flag error" is thrown telling
   * the user that the flag is required and shows them the help text.
   */
  requiredArrayOfStrings(key: string) {
    const value = this.arrayOfStrings(key);
    if (value === undefined) {
      throw createFlagError(`missing required flag --${key}`);
    }
    return value;
  }

  /**
   * Read the value of a string flag. If the flag is passed multiple times the last value is returned. If
   * the flag is not passed then undefined is returned.
   */
  string(key: string) {
    const value = this.use(key);

    switch (typeof value) {
      case 'undefined':
        return undefined;
      case 'string':
        return value || undefined; // convert "" to undefined
      case 'object':
        const last = value.at(-1);
        if (last === undefined) {
          throw createFlagError(`expected --${key} to be a string`);
        }
        return last || undefined; // convert "" to undefined
      default:
        throw createFlagError(`expected --${key} to be a string`);
    }
  }

  /**
   * Same as #string() except when the flag is passed it is validated against a list
   * of valid values
   */
  enum<T extends string>(key: string, values: readonly T[]) {
    const value = this.string(key);
    if (value === undefined) {
      return;
    }

    if (values.includes(value as T)) {
      return value as T;
    }

    throw createFlagError(`invalid --${key}, expected one of "${values.join('", "')}"`);
  }

  /**
   * Same as #string() except when a flag is not passed a "flag error" is thrown telling the user
   * that the flag is required and shows them the help text.
   */
  requiredString(key: string) {
    const value = this.string(key);
    if (value === undefined) {
      throw createFlagError(`missing required flag --${key}`);
    }
    return value;
  }

  /**
   * Same as #string(), except that when there is a value for the string it is resolved to an
   * absolute path based on the current working directory
   */
  path(key: string) {
    const value = this.string(key);
    if (value !== undefined) {
      return makeAbsolute(value);
    }
  }

  /**
   * Same as #requiredString() except that values are converted to absolute paths based on the
   * current working directory
   */
  requiredPath(key: string) {
    return makeAbsolute(this.requiredString(key));
  }

  /**
   * Same as #arrayOfStrings(), except that when there are values they are resolved to
   * absolute paths based on the current working directory
   */
  arrayOfPaths(key: string) {
    const value = this.arrayOfStrings(key);
    if (value !== undefined) {
      return value.map(makeAbsolute);
    }
  }

  /**
   * Same as #requiredArrayOfStrings(), except that values are resolved to absolute paths
   * based on the current working directory
   */
  requiredArrayOfPaths(key: string) {
    return this.requiredArrayOfStrings(key).map(makeAbsolute);
  }

  /**
   * Parsed the provided flag as a number, if the value does not parse to a valid number
   * using Number.parseFloat() then a "flag error" is thrown. If the flag is not passed
   * undefined is returned.
   */
  number(key: string) {
    const value = this.string(key);
    if (value === undefined) {
      return;
    }

    const num = Number.parseFloat(value);
    if (Number.isNaN(num)) {
      throw createFlagError(`unable to parse --${key} value [${value}] as a number`);
    }

    return num;
  }

  /**
   * Same as #number() except that when the flag is missing a "flag error" is thrown
   */
  requiredNumber(key: string) {
    const value = this.number(key);
    if (value === undefined) {
      throw createFlagError(`missing required flag --${key}`);
    }
    return value;
  }

  /**
   * Read a boolean flag value, if the flag is properly defined as a "boolean" in the run options
   * then the value will always be a boolean, defaulting to `false`, so there is no need for an
   * optional/requiredBoolean() method.
   */
  boolean(key: string) {
    const value = this.use(key);
    if (typeof value !== 'boolean') {
      throw createFlagError(`expected --${key} to be a boolean`);
    }
    return value;
  }

  /**
   * Get the positional arguments passed, includes any values that are not associated with
   * a specific --flag
   */
  getPositionals() {
    return this._.slice(0);
  }

  /**
   * Returns all of the unused flags. When a flag is read via any of the key-specific methods
   * the key is marked as "used" and this method will return a map of just the flags which
   * have not been used yet (excluding the default flags like --debug, --verbose, and --help)
   */
  getUnused() {
    return new Map(
      [...this.unused.entries()].filter(([key]) => {
        const alias = this.aliasMap.get(key);
        if (alias !== undefined && FORCED_FLAGS.has(alias)) {
          return false;
        }

        return !FORCED_FLAGS.has(key);
      })
    );
  }

  /**
   * Returns all of the used flags. When a flag is read via any of the key-specific methods
   * the key is marked as "used" and from then on this method will return a map including that
   * and any other key used by these methods.
   */
  getUsed() {
    return new Map(this.used);
  }
}
