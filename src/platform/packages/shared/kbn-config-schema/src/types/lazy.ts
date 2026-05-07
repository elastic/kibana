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

import { SchemaTypeError, ValidationError } from '../errors';
import type { SchemaValidationOptions } from './interfaces';
import { Type } from './type';

/**
 * Use this type to construct recursive runtime schemas.
 */
export class Lazy<T> extends Type<T> {
  public readonly lazyId: string;
  private bound?: Type<any>;

  constructor(id: string) {
    const lid = id.startsWith('#') ? id.slice(1) : id;
    super(zod.any(), {});
    this.lazyId = lid;
  }

  /**
   * Associates this lazy slot with the object schema that declares {@link TypeMeta.id}.
   */
  public bindResolver(schema: Type<any>): void {
    this.bound = schema;
  }

  public override getSchema(): z.ZodType<T> {
    return zod.lazy(() => {
      if (!this.bound) {
        return zod.any();
      }
      return this.bound.getSchema() as z.ZodType<T>;
    }) as z.ZodType<T>;
  }

  public override validate(
    value: unknown,
    context: Record<string, unknown> = {},
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): T {
    if (!this.bound) {
      throw new ValidationError(
        new SchemaTypeError('lazy schema is used outside of schema boundaries', []),
        namespace
      );
    }
    // Recursive slots use `undefined` as the terminal value; do not delegate to the bound
    // object (which treats `undefined` as `{}` for optional root-style defaults).
    if (value === undefined) {
      return undefined as T;
    }
    return this.bound.validate(value, context, namespace, validationOptions) as T;
  }

  protected structureTypeLabel(): string {
    return 'unknown';
  }
}
