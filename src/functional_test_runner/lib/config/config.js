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

import { get, has, cloneDeep } from 'lodash';
import toPath from 'lodash/internal/toPath';

import { schema } from './schema';

const $values = Symbol('values');

export class Config {
  constructor(options = {}) {
    const {
      settings = {},
      primary = false,
      path,
    } = options;

    if (!path) {
      throw new TypeError('path is a required option');
    }

    const { error, value } = schema.validate(settings, {
      abortEarly: false,
      context: {
        primary: !!primary,
        path,
      }
    });

    if (error) throw error;
    this[$values] = value;
  }

  has(key) {
    function recursiveHasCheck(path, values, schema) {
      if (!schema._inner) return false;

      // normalize child and pattern checks so we can iterate the checks in a single loop
      const checks = [].concat(
        // match children first, they have priority
        (schema._inner.children || []).map(child => ({
          test: key => child.key === key,
          schema: child.schema
        })),
        // match patterns on any key that doesn't match an explicit child
        (schema._inner.patterns || []).map(pattern => ({
          test: key => pattern.regex.test(key) && has(values, key),
          schema: pattern.rule
        }))
      );

      for (const check of checks) {
        if (!check.test(path[0])) {
          continue;
        }

        if (path.length > 1) {
          return recursiveHasCheck(path.slice(1), get(values, path[0]), check.schema);
        }

        return true;
      }

      return false;
    }

    const path = toPath(key);
    if (!path.length) return true;
    return recursiveHasCheck(path, this[$values], schema);
  }

  get(key, defaultValue) {
    if (!this.has(key)) {
      throw new Error(`Unknown config key "${key}"`);
    }

    return cloneDeep(get(this[$values], key, defaultValue), (v) => {
      if (typeof v === 'function') {
        return v;
      }
    });
  }
}
