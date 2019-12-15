/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Schema } from 'joi';
import { cloneDeep, get, has } from 'lodash';

// @ts-ignore internal lodash module is not typed
import toPath from 'lodash/internal/toPath';

import { schema } from './schema';

const $values = Symbol('values');

interface Options {
  settings?: Record<string, any>;
  primary?: boolean;
  path: string;
}

export class Config {
  private [$values]: Record<string, any>;

  constructor(options: Options) {
    const { settings = {}, primary = false, path = null } = options || {};

    if (!path) {
      throw new TypeError('path is a required option');
    }

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
      if (!childSchema._inner) {
        return false;
      }

      // normalize child and pattern checks so we can iterate the checks in a single loop
      const checks: Array<{ test: (k: string) => boolean; schema: Schema }> = [
        // match children first, they have priority
        ...(childSchema._inner.children || []).map((child: { key: string; schema: Schema }) => ({
          test: (k: string) => child.key === k,
          schema: child.schema,
        })),

        // match patterns on any key that doesn't match an explicit child
        ...(childSchema._inner.patterns || []).map((pattern: { regex: RegExp; rule: Schema }) => ({
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

    return cloneDeep(get(this[$values], key, defaultValue), v => {
      if (typeof v === 'function') {
        return v;
      }
    });
  }

  public getAll() {
    return cloneDeep(this[$values], v => {
      if (typeof v === 'function') {
        return v;
      }
    });
  }
}
