/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import net from 'net';

import typeDetect from 'type-detect';
import type { z } from '@kbn/zod';
import { z as zod } from '@kbn/zod';

import { SchemaTypeError, ValidationError } from '../errors';
import { META_FIELD_X_OAS_MAX_LENGTH, META_FIELD_X_OAS_MIN_LENGTH } from '../oas_meta_fields';
import type { SchemaValidationOptions, TypeOptions } from './interfaces';
import { Type } from './type';

const LEGACY_HOSTNAME_ERROR = 'value must be a valid hostname (see RFC 1123).';

/**
 * Hostname rules aligned with legacy `@hapi/joi` + Kibana tests (stricter than `z.hostname()`’s regex).
 * Accepts IPv4/IPv6 literals and typical DNS hostnames; rejects e.g. all-numeric single labels.
 */
function isLegacyRfc1123Hostname(value: string): boolean {
  // Legacy Joi parity: allow dotted names up to 255 chars (tests use four max-length labels + dots).
  if (value.length > 255) {
    return false;
  }
  if (net.isIPv6(value) || net.isIPv4(value)) {
    return true;
  }
  if (/^\d+$/.test(value)) {
    return false;
  }
  const labels = value.split('.');
  for (const label of labels) {
    if (label.length === 0 || label.length > 63) {
      return false;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(label)) {
      return false;
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      return false;
    }
  }
  return true;
}

export type StringOptions = TypeOptions<string> & {
  minLength?: number;
  maxLength?: number;
  hostname?: boolean;
  coerceFromNumber?: boolean;
};

const EMPTY_HOSTNAME_MESSAGE = '"value" is not allowed to be empty';

export class StringType extends Type<string> {
  constructor(options: StringOptions = {}) {
    const applyLengthConstraints = (schema: zod.ZodTypeAny): zod.ZodTypeAny => {
      let out = schema;
      if (options.minLength !== undefined) {
        out = out
          .superRefine((val: unknown, ctx) => {
            const v = val as string;
            if (v.length < options.minLength!) {
              ctx.addIssue({
                code: 'custom',
                message: `value has length [${v.length}] but it must have a minimum length of [${options.minLength}].`,
                input: v,
              });
            }
          })
          .meta({ [META_FIELD_X_OAS_MIN_LENGTH]: options.minLength });
      }
      if (options.maxLength !== undefined) {
        out = out
          .superRefine((val: unknown, ctx) => {
            const v = val as string;
            if (v.length > options.maxLength!) {
              ctx.addIssue({
                code: 'custom',
                message: `value has length [${v.length}] but it must have a maximum length of [${options.maxLength}].`,
                input: v,
              });
            }
          })
          .meta({ [META_FIELD_X_OAS_MAX_LENGTH]: options.maxLength });
      }
      return out;
    };

    let base: zod.ZodTypeAny;

    if (options.hostname === true) {
      // Legacy Joi order: reject empty / enforce length before hostname rules (RFC check).
      base = zod.preprocess(
        (value: unknown) => value,
        zod.string().min(1, { message: EMPTY_HOSTNAME_MESSAGE })
      );
      base = applyLengthConstraints(base);
      base = base.superRefine((val: unknown, ctx) => {
        const v = val as string;
        if (!isLegacyRfc1123Hostname(v)) {
          ctx.addIssue({
            code: 'custom',
            message: LEGACY_HOSTNAME_ERROR,
            input: v,
          });
        }
      });
    } else {
      base = zod.preprocess((value: unknown) => {
        if (typeof value === 'string') {
          return value;
        }
        if (options.coerceFromNumber && typeof value === 'number') {
          return value.toString(10);
        }
        return value;
      }, zod.string());
      base = applyLengthConstraints(base);
    }

    super(base, options);
  }

  /** Joi exposed OAS hints via `describe().metas[]`; rebuild from options for introspection tests. */
  public getSchema(): z.ZodType<string> {
    const schema = super.getSchema();
    const opts = this.typeOptions as StringOptions & TypeOptions<string>;
    const metas: Record<string, unknown>[] = [];
    if (opts.minLength !== undefined) {
      metas.push({ [META_FIELD_X_OAS_MIN_LENGTH]: opts.minLength });
    }
    if (opts.maxLength !== undefined) {
      metas.push({ [META_FIELD_X_OAS_MAX_LENGTH]: opts.maxLength });
    }
    if (metas.length === 0) {
      return schema;
    }
    const snapshotDescribe = schema.describe.bind(schema) as unknown as () => Record<
      string,
      unknown
    >;
    return new Proxy(schema, {
      get(target, prop, receiver) {
        if (prop === 'describe') {
          return () =>
            Object.assign(snapshotDescribe(), {
              metas,
            });
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as z.ZodType<string>;
  }

  /**
   * Fail fast on wrong JS types before Zod's preprocess+string pipeline, which can drop
   * `input` on issues and yield misleading `[undefined]` in error messages.
   * `undefined` is delegated to super so optional defaults / TypeOptions.defaultValue still apply.
   */
  protected validateWithFrame(
    frame: import('../validation_frame').ValidationFrame,
    value: unknown,
    context: Record<string, unknown>,
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): string {
    const opts = this.typeOptions as StringOptions & TypeOptions<string>;

    // Match Joi: when input is missing (`undefined`) and a default is applied, do not run
    // `options.validate` on the defaulted value.
    if (value === undefined && opts.validate && opts.defaultValue !== undefined) {
      const { validate: _dropValidate, ...rest } = opts;
      const inner = new StringType(rest as StringOptions);
      return inner.validate(value, context, namespace, validationOptions);
    }

    if (
      !opts.hostname &&
      !opts.coerceFromNumber &&
      typeof value !== 'string' &&
      value !== undefined
    ) {
      throw new ValidationError(
        new SchemaTypeError(`expected value of type [string] but got [${typeDetect(value)}]`, []),
        namespace
      );
    }
    return super.validateWithFrame(frame, value, context, namespace, validationOptions);
  }

  protected structureTypeLabel(): string {
    return 'string';
  }

  protected handleError(type: string, { value }: Record<string, any>) {
    switch (type) {
      case 'any.required':
      case 'invalid_type':
        return `expected value of type [string] but got [${typeDetect(value)}]`;
      default:
        return undefined;
    }
  }
}
