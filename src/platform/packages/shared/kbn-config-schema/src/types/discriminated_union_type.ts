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

import { SchemaTypeError, ValidationError } from '../errors';
import { Reference } from '../references';
import type { ExtendsDeepOptions, SchemaValidationOptions } from './interfaces';
import type { UnionTypeOptions } from './union_type';
import { LiteralType } from './literal_type';
import type { ObjectResultType, Props } from './object_type';
import type { ObjectType } from './object_type';
import { Type } from './type';

export type ObjectResultUnionType<T> = T extends Props ? ObjectResultType<T> : never;

export type PropsWithDiscriminator<Discriminator extends string, T extends Props> = Omit<
  T,
  Discriminator
> & {
  /** Literal discriminators use `Type<'a'>` etc.; widen so branches remain assignable. */
  [Key in Discriminator]: Type<any>;
};

export class DiscriminatedUnionType<
  Discriminator extends string,
  RTS extends Array<ObjectType<any>>,
  T extends PropsWithDiscriminator<Discriminator, Props>
> extends Type<T> {
  private readonly discriminator: Discriminator;
  private readonly discriminatedValues: string[];
  private readonly unionTypes: RTS;
  private readonly unionOptions?: UnionTypeOptions<T>;
  private readonly branchByValue = new Map<string, ObjectType<any>>();
  private readonly fallback?: ObjectType<any>;

  constructor(discriminator: Discriminator, types: RTS, options?: UnionTypeOptions<T>) {
    super(zod.any(), options);

    const discriminators = new Set<string>();

    let fallback: ObjectType<any> | undefined;

    for (let index = 0; index < types.length; index++) {
      const objectType = types[index];
      const discriminatorSchema = objectType.getPropSchemas()[discriminator];

      const literalExpected =
        discriminatorSchema instanceof LiteralType ? discriminatorSchema.expectedValue : null;

      if (literalExpected == null) {
        if (fallback) {
          throw new Error(`Only one fallback schema is allowed`);
        }
        fallback = objectType;
      } else {
        if (typeof literalExpected !== 'string') {
          throw new Error(
            `Discriminator for schema at index ${index} must be a string type, got ${typeof literalExpected}`
          );
        }

        if (discriminators.has(literalExpected)) {
          throw new Error(
            `Discriminator for schema at index ${index} must be a unique, ${literalExpected} is already used`
          );
        }

        discriminators.add(literalExpected);
        this.branchByValue.set(literalExpected, objectType);
      }
    }

    this.discriminator = discriminator;
    this.discriminatedValues = Array.from(discriminators);
    this.unionTypes = types;
    this.unionOptions = options;
    this.fallback = fallback;
  }

  protected validateWithFrame(
    _frame: import('../validation_frame').ValidationFrame,
    value: unknown,
    context: Record<string, unknown>,
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): T {
    if (value === undefined && this.typeOptions.defaultValue !== undefined) {
      const def = this.typeOptions.defaultValue;
      let resolved: unknown;
      if (typeof def === 'function') {
        resolved = (def as () => unknown)();
      } else if (Reference.isReference(def)) {
        resolved = def.resolve();
      } else {
        resolved = def;
      }
      return this.validateWithFrame(_frame, resolved, context, namespace, validationOptions);
    }

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ValidationError(new SchemaTypeError(`expected object`, []), namespace);
    }
    const obj = value as Record<string, unknown>;
    const discriminatorValue = obj[this.discriminator];

    if (discriminatorValue == null) {
      throw new ValidationError(
        new SchemaTypeError(`"${this.discriminator}" property is required`, []),
        namespace
      );
    }

    const discriminatorsJoined = this.discriminatedValues.map((v) => JSON.stringify(v)).join(', ');

    let branch: ObjectType<any> | undefined;
    if (typeof discriminatorValue === 'string') {
      branch = this.branchByValue.get(discriminatorValue) ?? this.fallback;
      if (!branch) {
        throw new ValidationError(
          new SchemaTypeError(
            `expected "${
              this.discriminator
            }" to be one of [${discriminatorsJoined}] but got [${JSON.stringify(
              discriminatorValue
            )}]`,
            []
          ),
          namespace
        );
      }
    } else if (this.fallback) {
      branch = this.fallback;
    } else {
      throw new ValidationError(
        new SchemaTypeError(
          `expected "${
            this.discriminator
          }" to be a string of [${discriminatorsJoined}] but got [${typeDetect(
            discriminatorValue
          )}]`,
          []
        ),
        namespace
      );
    }

    return branch.validate(value, context, namespace, validationOptions) as T;
  }

  public extendsDeep(options: ExtendsDeepOptions) {
    return new DiscriminatedUnionType(
      this.discriminator,
      this.unionTypes.map((t) => t.extendsDeep(options)),
      this.unionOptions
    );
  }

  public addLazyRegistryEntries(map: Map<string, unknown>): void {
    for (const t of this.unionTypes) {
      t.addLazyRegistryEntries(map);
    }
  }

  protected handleError(type: string, { value }: Record<string, unknown>) {
    switch (type) {
      case 'alternatives.any':
      default:
        return undefined;
    }
  }
}
