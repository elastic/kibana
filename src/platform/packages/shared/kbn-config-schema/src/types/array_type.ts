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
import type { ExtendsDeepOptions, SchemaValidationOptions, UnknownOptions } from './interfaces';
import type { TypeOptions } from './interfaces';
import { prependPathSegment, unwrapValidationError } from './error_utils';
import { effectiveUnknowns } from './object_helpers';
import { Reference } from '../references';
import { Type } from './type';
import { wrapWithTypeOptions } from './wrap_schema';

export type ArrayOptions<T> = TypeOptions<T[]> &
  UnknownOptions & {
    minSize?: number;
    maxSize?: number;
  };

export class ArrayType<T> extends Type<T[]> {
  private readonly arrayType: Type<T>;
  private readonly arrayOptions: ArrayOptions<T>;

  constructor(type: Type<T>, options: ArrayOptions<T> = {}) {
    super(zod.any(), options);
    this.arrayType = type;
    this.arrayOptions = options;
  }

  public override getSchema(): z.ZodType<T[]> {
    let base = zod.array(this.arrayType.getInternalSchema());
    if (this.arrayOptions.minSize !== undefined) {
      base = base.min(this.arrayOptions.minSize);
    }
    if (this.arrayOptions.maxSize !== undefined) {
      base = base.max(this.arrayOptions.maxSize);
    }
    if (this.arrayOptions.meta?.id) {
      base = base.meta({ id: this.arrayOptions.meta.id });
    }
    return wrapWithTypeOptions(base, this.arrayOptions) as z.ZodType<T[]>;
  }

  public override getInternalSchema(): z.ZodType<T[]> {
    let base = zod.array(this.arrayType.getInternalSchema());
    if (this.arrayOptions.minSize !== undefined) {
      base = base.min(this.arrayOptions.minSize);
    }
    if (this.arrayOptions.maxSize !== undefined) {
      base = base.max(this.arrayOptions.maxSize);
    }
    if (this.arrayOptions.meta?.id) {
      base = base.meta({ id: this.arrayOptions.meta.id });
    }
    return wrapWithTypeOptions(base, this.arrayOptions) as z.ZodType<T[]>;
  }

  protected validateWithFrame(
    _frame: import('../validation_frame').ValidationFrame,
    value: unknown,
    context: Record<string, unknown>,
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): T[] {
    let val: any = value;
    if (val === undefined && this.typeOptions.defaultValue !== undefined) {
      const def = this.typeOptions.defaultValue;
      if (typeof def === 'function') {
        val = (def as () => T[])();
      } else if (Reference.isReference(def)) {
        val = def.resolve() as T[];
      } else {
        val = def as T[];
      }
    }

    if (typeof val === 'string') {
      try {
        val = JSON.parse(val);
      } catch {
        throw new ValidationError(
          new SchemaTypeError('could not parse array value from json input', []),
          namespace
        );
      }
    }

    if (!Array.isArray(val)) {
      throw new ValidationError(
        new SchemaTypeError(`expected value of type [array] but got [${typeDetect(val)}]`, []),
        namespace
      );
    }

    if (this.arrayOptions.minSize !== undefined && val.length < this.arrayOptions.minSize) {
      throw new ValidationError(
        new SchemaTypeError(
          `array size is [${val.length}], but cannot be smaller than [${this.arrayOptions.minSize}]`,
          []
        ),
        namespace
      );
    }

    if (this.arrayOptions.maxSize !== undefined && val.length > this.arrayOptions.maxSize) {
      throw new ValidationError(
        new SchemaTypeError(
          `array size is [${val.length}], but cannot be greater than [${this.arrayOptions.maxSize}]`,
          []
        ),
        namespace
      );
    }

    const policy = effectiveUnknowns(
      this.arrayOptions.unknowns,
      validationOptions?.stripUnknownKeys
    );
    const itemValidationOptions: SchemaValidationOptions = {
      ...(validationOptions ?? {}),
      stripUnknownKeys: policy === 'ignore',
    };

    const out: T[] = [];
    for (let i = 0; i < val.length; i++) {
      if (val[i] === undefined) {
        throw new ValidationError(
          new SchemaTypeError('sparse array are not allowed', [String(i)]),
          namespace
        );
      }
      try {
        out.push(this.arrayType.validate(val[i], context, undefined, itemValidationOptions));
      } catch (e) {
        const inner = unwrapValidationError(e);
        if (inner) {
          throw new ValidationError(prependPathSegment(String(i), inner), namespace);
        }
        throw e;
      }
    }

    return out;
  }

  public extendsDeep(options: ExtendsDeepOptions) {
    return new ArrayType(this.arrayType.extendsDeep(options), this.arrayOptions);
  }

  public addLazyRegistryEntries(map: Map<string, unknown>): void {
    this.arrayType.addLazyRegistryEntries(map);
  }

  protected structureTypeLabel(): string {
    return 'array';
  }

  public getSchemaStructure() {
    const nested = this.arrayType.getSchemaStructure();
    if (nested.length === 1 && nested[0].path.length === 0) {
      return [{ path: [], type: `array` }];
    }
    return [{ path: [], type: 'array' }];
  }

  protected handleError(type: string, { limit, reason, value }: Record<string, any>) {
    switch (type) {
      case 'any.required':
      case 'invalid_type':
        return `expected value of type [array] but got [${typeDetect(value)}]`;
      case 'array.sparse':
        return `sparse array are not allowed`;
      case 'array.parse':
        return `could not parse array value from json input`;
      case 'too_small':
        return `array size is [${value.length}], but cannot be smaller than [${limit}]`;
      case 'too_big':
        return `array size is [${value.length}], but cannot be greater than [${limit}]`;
      default:
        return typeof reason?.[0] === 'string' ? reason[0] : undefined;
    }
  }
}
