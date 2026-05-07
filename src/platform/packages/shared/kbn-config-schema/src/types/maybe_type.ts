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

import { META_FIELD_X_OAS_OPTIONAL } from '../oas_meta_fields';
import type { ExtendsDeepOptions, SchemaValidationOptions } from './interfaces';
import { Type } from './type';

export class MaybeType<V> extends Type<V | undefined> {
  private readonly maybeType: Type<V>;

  constructor(type: Type<V>) {
    super(zod.any(), {});
    this.maybeType = type;
  }

  public getSchema() {
    return this.maybeType
      .getSchema()
      .optional()
      .meta({ [META_FIELD_X_OAS_OPTIONAL]: true });
  }

  public getInternalSchema(): z.ZodType<V | undefined> {
    return this.maybeType
      .getInternalSchema()
      .optional()
      .meta({ [META_FIELD_X_OAS_OPTIONAL]: true }) as z.ZodType<V | undefined>;
  }

  protected validateWithFrame(
    _frame: import('../validation_frame').ValidationFrame,
    value: unknown,
    context: Record<string, unknown>,
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): V | undefined {
    if (value === undefined) {
      return undefined;
    }
    return this.maybeType.validate(value, context, namespace, validationOptions);
  }

  public extendsDeep(options: ExtendsDeepOptions) {
    return new MaybeType(this.maybeType.extendsDeep(options));
  }

  protected structureTypeLabel(): string {
    return `${this.maybeType.getStructureLabel()}?`;
  }
}
