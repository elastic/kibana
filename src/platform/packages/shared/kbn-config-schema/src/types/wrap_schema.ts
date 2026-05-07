/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import { z as zod } from '@kbn/zod';
import type { $ZodRawIssue } from '@kbn/zod';

import {
  META_FIELD_X_OAS_AVAILABILITY,
  META_FIELD_X_OAS_DEPRECATED,
  META_FIELD_X_OAS_DISCONTINUED,
} from '../oas_meta_fields';
import { Reference } from '../references';
import type { TypeMeta, TypeOptions } from './interfaces';

export function wrapWithTypeOptions<V>(
  schema: z.ZodTypeAny,
  options: TypeOptions<V>
): z.ZodTypeAny {
  let s = schema;

  if (options.meta) {
    s = applyMeta(s, options.meta);
  }

  if (options.defaultValue !== undefined) {
    s = s.optional();
    if (typeof options.defaultValue === 'function') {
      s = s.default(options.defaultValue as () => V);
    } else if (Reference.isReference(options.defaultValue)) {
      const ref = options.defaultValue;
      s = zod.preprocess((val: unknown) => {
        if (val !== undefined) {
          return val;
        }
        return ref.resolve();
      }, s);
    } else {
      s = s.default(options.defaultValue as V);
    }
  }

  if (options.validate) {
    const validate = options.validate;
    s = s.superRefine((val: unknown, ctx) => {
      let msg: string | void;
      try {
        msg = validate(val as V);
      } catch (e: any) {
        msg = e?.message ?? String(e);
      }
      if (typeof msg === 'string') {
        ctx.addIssue({
          code: 'custom',
          message: msg,
          input: val,
        } as $ZodRawIssue);
      }
    });
  }

  return s;
}

function applyMeta(schema: z.ZodTypeAny, meta: TypeMeta): z.ZodTypeAny {
  let s = schema;
  if (meta.description) {
    s = s.describe(meta.description);
  }

  const metaBag: Record<string, unknown> = {};
  const title = meta.title ?? meta.id;
  if (title) {
    metaBag.title = title;
  }
  if (meta.deprecated) {
    metaBag[META_FIELD_X_OAS_DEPRECATED] = true;
  }
  if (meta.deprecated && meta['x-discontinued']) {
    metaBag[META_FIELD_X_OAS_DISCONTINUED] = meta['x-discontinued'];
  }
  if (meta.availability) {
    metaBag[META_FIELD_X_OAS_AVAILABILITY] = meta.availability;
  }

  if (Object.keys(metaBag).length === 0) {
    return s;
  }

  return s.meta(metaBag);
}
