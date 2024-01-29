/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Joi from 'joi';
import type { JoiRoot, CustomHelpers } from 'joi';
import { isPlainObject } from 'lodash';
import { isDuration } from 'moment';
import { Stream } from 'stream';
import { ByteSizeValue, ensureByteSizeValue } from '../byte_size_value';
import { ensureDuration } from '../duration';

function isMap<K, V>(o: any): o is Map<K, V> {
  return o instanceof Map;
}

export const internals: JoiRoot = Joi.extend(
  {
    type: 'boolean',
    base: Joi.boolean(),
    coerce(value, { error }: CustomHelpers) {
      // If value isn't defined, let Joi handle default value if it's defined.
      if (value === undefined) {
        return {
          value,
        };
      }

      // Allow strings 'true' and 'false' to be coerced to booleans (case-insensitive).
      // From Joi docs on `Joi.boolean`:
      // > Generates a schema object that matches a boolean data type. Can also
      // >  be called via bool(). If the validation convert option is on
      // > (enabled by default), a string (either "true" or "false") will be
      // converted to a boolean if specified.
      if (typeof value === 'string') {
        const normalized = value.toLowerCase();
        value = normalized === 'true' ? true : normalized === 'false' ? false : value;
      }

      if (typeof value !== 'boolean') {
        return {
          errors: [error('boolean.base')],
        };
      }

      return {
        value,
      };
    },
  },
  {
    type: 'stream',
    prepare(value, { error }) {
      if (value instanceof Stream) {
        return { value };
      }
      return {
        errors: [error('stream.base')],
      };
    },
  },
  {
    type: 'bytes',
    coerce(value: any, { error }) {
      try {
        if (typeof value === 'string') {
          return { value: ByteSizeValue.parse(value) };
        }

        if (typeof value === 'number') {
          return { value: new ByteSizeValue(value) };
        }
      } catch (e) {
        return {
          errors: [error('bytes.parse', { message: e.message })],
        };
      }
      return { value };
    },
    validate(value, { error }) {
      // If value isn't defined, let Joi handle default value if it's defined.
      if (value instanceof ByteSizeValue) {
        return { value };
      }
      return {
        errors: [error('bytes.base')],
      };
    },
    rules: {
      min: {
        args: [
          {
            name: 'limit',
            assert: Joi.alternatives([Joi.number(), Joi.string()]).required(),
          },
        ],
        method(limit) {
          return this.$_addRule({ name: 'min', args: { limit } });
        },
        validate(value, { error }, args) {
          const limit = ensureByteSizeValue(args.limit);
          if (value.isLessThan(limit)) {
            return error('bytes.min', { value, limit });
          }

          return value;
        },
      },
      max: {
        args: [
          {
            name: 'limit',
            assert: Joi.alternatives([Joi.number(), Joi.string()]).required(),
          },
        ],
        method(limit) {
          return this.$_addRule({ name: 'max', args: { limit } });
        },
        validate(value, { error }, args) {
          const limit = ensureByteSizeValue(args.limit);
          if (value.isGreaterThan(limit)) {
            return error('bytes.max', { value, limit });
          }

          return value;
        },
      },
    },
  },
  {
    type: 'duration',
    coerce(value, { error }) {
      try {
        if (typeof value === 'string' || typeof value === 'number') {
          return { value: ensureDuration(value) };
        }
      } catch (e) {
        return {
          errors: [error('duration.parse', { message: e.message })],
        };
      }
      return { value };
    },
    validate(value, { error }) {
      if (!isDuration(value)) {
        return {
          errors: [error('duration.base')],
        };
      }
      return { value };
    },
    rules: {
      min: {
        args: [
          {
            name: 'limit',
            assert: Joi.alternatives([Joi.number(), Joi.string()]).required(),
          },
        ],
        method(limit) {
          return this.$_addRule({ name: 'min', args: { limit } });
        },
        validate(value, { error }, args) {
          const limit = ensureDuration(args.limit);
          if (value.asMilliseconds() < limit.asMilliseconds()) {
            return error('duration.min', { value, limit });
          }

          return value;
        },
      },
      max: {
        args: [
          {
            name: 'limit',
            assert: Joi.alternatives([Joi.number(), Joi.string()]).required(),
          },
        ],
        method(limit) {
          return this.$_addRule({ name: 'max', args: { limit } });
        },
        validate(value, { error }, args) {
          const limit = ensureDuration(args.limit);
          if (value.asMilliseconds() > limit.asMilliseconds()) {
            return error('duration.max', { value, limit });
          }

          return value;
        },
      },
    },
  },
  {
    type: 'number',
    base: Joi.number(),
    coerce(value, { error }) {
      // If value isn't defined, let Joi handle default value if it's defined.
      if (value === undefined) {
        return { value };
      }

      // Do we want to allow strings that can be converted, e.g. "2"? (Joi does)
      // (this can for example be nice in http endpoints with query params)
      //
      // From Joi docs on `Joi.number`:
      // > Generates a schema object that matches a number data type (as well as
      // > strings that can be converted to numbers)
      const coercedValue: any = typeof value === 'string' ? Number(value) : value;
      if (typeof coercedValue !== 'number' || isNaN(coercedValue)) {
        return {
          errors: [error('number.base')],
        };
      }

      return { value };
    },
  },
  {
    type: 'object',
    base: Joi.object(),
    coerce(value: any, { error, prefs }) {
      if (value === undefined || isPlainObject(value)) {
        return { value };
      }

      if (prefs.convert && typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return { value: parsed };
        } catch (e) {
          return { errors: [error('object.parse')] };
        }
      }

      return { errors: [error('object.base')] };
    },
  },
  {
    type: 'array',
    base: Joi.array(),
    coerce(value: any, { error, prefs }) {
      if (value === undefined || Array.isArray(value)) {
        return { value };
      }
      if (prefs.convert && typeof value === 'string') {
        try {
          // ensuring that the parsed object is an array is done by the base's validation
          return { value: JSON.parse(value) };
        } catch (e) {
          return {
            errors: [error('array.parse')],
          };
        }
      }
      return {
        errors: [error('array.base')],
      };
    },
  },
  {
    type: 'map',
    coerce(value, { error, prefs }) {
      if (value === undefined) {
        return { value };
      }
      if (isPlainObject(value)) {
        return { value: new Map(Object.entries(value)) };
      }
      if (prefs.convert && typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (isPlainObject(parsed)) {
            return { value: new Map(Object.entries(parsed)) };
          }
          return {
            value: parsed,
          };
        } catch (e) {
          return {
            errors: [error('map.parse')],
          };
        }
      }
      return { value };
    },
    validate(value, { error }) {
      if (!isMap(value)) {
        return {
          errors: [error('map.base')],
        };
      }

      return { value };
    },
    rules: {
      entries: {
        args: [
          {
            name: 'key',
            assert: Joi.object().schema(),
          },
          {
            name: 'value',
            assert: Joi.object().schema(),
          },
        ],
        method(key, value) {
          return this.$_addRule({ name: 'entries', args: { key, value } });
        },
        validate(value, { error }, args, options) {
          const result = new Map();
          for (const [entryKey, entryValue] of value) {
            let validatedEntryKey: any;
            try {
              validatedEntryKey = Joi.attempt(entryKey, args.key, { presence: 'required' });
            } catch (e) {
              return error('map.key', { entryKey, reason: e });
            }

            let validatedEntryValue: any;
            try {
              validatedEntryValue = Joi.attempt(entryValue, args.value, { presence: 'required' });
            } catch (e) {
              return error('map.value', { entryKey, reason: e });
            }

            result.set(validatedEntryKey, validatedEntryValue);
          }
          return result;
        },
      },
    },
  },
  {
    type: 'record',
    coerce(value, { error, prefs }) {
      if (value === undefined || isPlainObject(value)) {
        return { value };
      }

      if (prefs.convert && typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return { value: parsed };
        } catch (e) {
          return {
            errors: [error('record.parse')],
          };
        }
      }
      return {
        errors: [error('record.base')],
      };
    },
    validate(value, { error }) {
      if (!isPlainObject(value)) {
        return {
          errors: [error('record.base')],
        };
      }

      return { value };
    },
    rules: {
      entries: {
        args: [
          {
            name: 'key',
            assert: Joi.object().schema(),
          },
          {
            name: 'value',
            assert: Joi.object().schema(),
          },
        ],
        method(key, value) {
          return this.$_addRule({ name: 'entries', args: { key, value } });
        },
        validate(value, { error }, args) {
          const result = {} as Record<string, any>;
          for (const [entryKey, entryValue] of Object.entries(value)) {
            let validatedEntryKey: any;
            try {
              validatedEntryKey = Joi.attempt(entryKey, args.key, { presence: 'required' });
            } catch (e) {
              return error('record.key', { entryKey, reason: e });
            }

            let validatedEntryValue: any;
            try {
              validatedEntryValue = Joi.attempt(entryValue, args.value, { presence: 'required' });
            } catch (e) {
              return error('record.value', { entryKey, reason: e });
            }

            result[validatedEntryKey] = validatedEntryValue;
          }
          return result;
        },
      },
    },
  }
);
