/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import typeDetect from 'type-detect';
import type { z } from '@kbn/zod';
import { z as zod } from '@kbn/zod';

import { SchemaTypeError, ValidationError } from '../errors';
import { META_FIELD_X_OAS_ANY } from '../oas_meta_fields';
import type { SchemaValidationOptions, TypeOptions } from './interfaces';
import { Type } from './type';

export class AnyType extends Type<any> {
  constructor(options?: TypeOptions<any>) {
    super(zod.any().meta({ [META_FIELD_X_OAS_ANY]: true }), options);
  }

  /**
   * Zod 4 `z.any()` accepts `undefined`; legacy Joi required an explicit value unless defaultValue is set.
   */
  protected validateWithFrame(
    frame: import('../validation_frame').ValidationFrame,
    value: unknown,
    context: Record<string, unknown>,
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): any {
    if (value === undefined && this.typeOptions.defaultValue === undefined) {
      throw new ValidationError(
        new SchemaTypeError('expected value of type [any] but got [undefined]', []),
        namespace
      );
    }
    return super.validateWithFrame(frame, value, context, namespace, validationOptions);
  }

  /** Joi exposed meta via `describe().metas`; Zod keeps meta on `.meta()` only — shim for introspection tests. */
  public getSchema(): z.ZodType<any> {
    const schema = super.getSchema();
    const describe = schema.describe.bind(schema);
    return new Proxy(schema, {
      get(target, prop, receiver) {
        if (prop === 'describe') {
          return () =>
            Object.assign(describe(), {
              metas: [{ [META_FIELD_X_OAS_ANY]: true }],
            });
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as z.ZodType<any>;
  }

  protected structureTypeLabel(): string {
    return 'any';
  }

  protected handleError(type: string, { value }: Record<string, any>) {
    if (type === 'any.required' || type === 'invalid_type') {
      return `expected value of type [any] but got [${typeDetect(value)}]`;
    }
  }
}
