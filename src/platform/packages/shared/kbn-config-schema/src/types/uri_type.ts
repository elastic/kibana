/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import typeDetect from 'type-detect';
import { z as zod } from '@kbn/zod';

import type { SchemaValidationOptions, TypeOptions } from './interfaces';
import { Type } from './type';

export type URIOptions = TypeOptions<string> & {
  scheme?: string | string[];
};

export class URIType extends Type<string> {
  constructor(options: URIOptions = {}) {
    let base = zod.string().superRefine((val, ctx) => {
      let url: URL;
      try {
        url = new URL(val);
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: 'value must be a valid URI (see RFC 3986).',
          input: val,
        } as zod.ZodCustomIssue);
        return;
      }
      // WHATWG URL accepts `[]` in query strings; legacy Joi rejected them (RFC 3986 parity tests).
      if (url.search.includes('[') || url.search.includes(']')) {
        ctx.addIssue({
          code: 'custom',
          message: 'value must be a valid URI (see RFC 3986).',
          input: val,
        } as zod.ZodCustomIssue);
        return;
      }
      // WHATWG allows arbitrarily long registered names; legacy Joi capped host length (see uri tests).
      if (url.hostname.length > 255) {
        ctx.addIssue({
          code: 'custom',
          message: 'value must be a valid URI (see RFC 3986).',
          input: val,
        } as zod.ZodCustomIssue);
      }
    });

    if (options.scheme !== undefined) {
      const schemes = Array.isArray(options.scheme) ? options.scheme : [options.scheme];
      base = base.superRefine((val, ctx) => {
        let url: URL;
        try {
          url = new URL(val);
        } catch {
          return;
        }
        const sch = url.protocol.replace(/:$/, '');
        if (!schemes.includes(sch)) {
          ctx.addIssue({
            code: 'custom',
            message: `expected URI with scheme [${schemes.join('|')}].`,
            input: val,
          } as zod.ZodCustomIssue);
        }
      });
    }

    super(base, options);
  }

  /**
   * Match Joi: when `undefined` input receives `defaultValue`, do not run top-level `validate`.
   */
  protected validateWithFrame(
    frame: import('../validation_frame').ValidationFrame,
    value: unknown,
    context: Record<string, unknown>,
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): string {
    const opts = this.typeOptions as URIOptions & TypeOptions<string>;
    if (value === undefined && opts.validate && opts.defaultValue !== undefined) {
      const { validate: _dropValidate, ...rest } = opts;
      const inner = new URIType(rest);
      return inner.validate(value, context, namespace, validationOptions);
    }
    return super.validateWithFrame(frame, value, context, namespace, validationOptions);
  }

  protected structureTypeLabel(): string {
    return 'string';
  }

  protected handleError(type: string, { value }: Record<string, unknown>) {
    switch (type) {
      case 'any.required':
      case 'invalid_type':
        return `expected value of type [string] but got [${typeDetect(value)}].`;
      default:
        return undefined;
    }
  }
}
