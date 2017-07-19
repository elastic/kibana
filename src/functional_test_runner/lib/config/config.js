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
