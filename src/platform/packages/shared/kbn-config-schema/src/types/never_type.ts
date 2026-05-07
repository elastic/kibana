/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z as zod } from '@kbn/zod';

import { ValidationError } from '../errors';
import type { SchemaValidationOptions } from './interfaces';
import { Type } from './type';

export class NeverType extends Type<never> {
  constructor() {
    super(zod.never(), {});
  }

  protected validateWithFrame(
    _frame: import('../validation_frame').ValidationFrame,
    value: unknown,
    _context: Record<string, unknown>,
    namespace?: string,
    _validationOptions?: SchemaValidationOptions
  ): never {
    if (value === undefined) {
      return undefined as never;
    }
    const result = this.internalSchema.safeParse(value, { reportInput: true });
    if (!result.success) {
      throw new ValidationError(this.zodErrorToSchemaError(result.error), namespace);
    }
    return result.data;
  }

  protected structureTypeLabel(): string {
    return 'never';
  }

  protected handleError(type: string) {
    switch (type) {
      case 'any.required':
      case 'invalid_type':
        return "a value wasn't expected to be present";
    }
  }
}
