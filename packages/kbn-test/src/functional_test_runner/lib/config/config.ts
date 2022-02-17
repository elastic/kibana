/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Schema } from 'joi';
import { cloneDeepWith, get, has, toPath } from 'lodash';

import { schema } from './schema';

const $values = Symbol('values');

interface Options {
  settings?: Record<string, any>;
  primary?: boolean;
  path: string;
}

export class Config {
  public readonly path: string;
  private [$values]: Record<string, any>;

  constructor(options: Options) {
    const { settings = {}, primary = false, path = null } = options || {};

    if (!path) {
      throw new TypeError('path is a required option');
    }

    this.path = path;
    const { error, value } = schema.validate(settings, {
      abortEarly: false,
      context: {
        primary: !!primary,
        path,
      },
    });

    if (error) {
      throw error;
    }

    this[$values] = value;
  }

  public has(key: string | string[]) {
    function recursiveHasCheck(
      remainingPath: string[],
      values: Record<string, any>,
      childSchema: any
    ): boolean {
      if (!childSchema.$_terms.keys && !childSchema.$_terms.patterns) {
        return false;
      }

      // normalize child and pattern checks so we can iterate the checks in a single loop
      const checks: Array<{ test: (k: string) => boolean; schema: Schema }> = [
        // match children first, they have priority
        ...(childSchema.$_terms.keys || []).map((child: { key: string; schema: Schema }) => ({
          test: (k: string) => child.key === k,
          schema: child.schema,
        })),

        // match patterns on any key that doesn't match an explicit child
        ...(childSchema.$_terms.patterns || []).map((pattern: { regex: RegExp; rule: Schema }) => ({
          test: (k: string) => pattern.regex.test(k) && has(values, k),
          schema: pattern.rule,
        })),
      ];

      for (const check of checks) {
        if (!check.test(remainingPath[0])) {
          continue;
        }

        if (remainingPath.length > 1) {
          return recursiveHasCheck(
            remainingPath.slice(1),
            get(values, remainingPath[0]),
            check.schema
          );
        }

        return true;
      }

      return false;
    }

    const path = toPath(key);
    if (!path.length) {
      return true;
    }
    return recursiveHasCheck(path, this[$values], schema);
  }

  public get(key: string | string[], defaultValue?: any) {
    if (!this.has(key)) {
      throw new Error(`Unknown config key "${key}"`);
    }

    return cloneDeepWith(get(this[$values], key, defaultValue), (v) => {
      if (typeof v === 'function') {
        return v;
      }
    });
  }

  public getAll() {
    return cloneDeepWith(this[$values], (v) => {
      if (typeof v === 'function') {
        return v;
      }
    });
  }
}
