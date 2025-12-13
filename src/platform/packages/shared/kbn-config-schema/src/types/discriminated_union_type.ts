/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import typeDetect from 'type-detect';

import { internals } from '../internals';
import type { ExtendsDeepOptions } from './type';
import { Type } from './type';
import type { ObjectResultType, Props } from './object_type';
import type { ObjectType } from './object_type';
import type { UnionTypeOptions } from './union_type';

export type ObjectResultUnionType<T> = T extends Props ? ObjectResultType<T> : never;

export type PropsWithDiscriminator<Discriminator extends string, T extends Props> = Omit<
  T,
  Discriminator
> & {
  [Key in Discriminator]: Type<string>; // this should only be a LiteralType
};

export class DiscriminatedUnionType<
  Discriminator extends string,
  RTS extends Array<ObjectType<any>>,
  T extends PropsWithDiscriminator<Discriminator, Props>
> extends Type<T> {
  private readonly discriminator: Discriminator;
  private readonly discriminatedValues: string[];
  private readonly unionTypes: RTS;
  private readonly typeOptions?: UnionTypeOptions<T>;

  constructor(discriminator: Discriminator, types: RTS, options?: UnionTypeOptions<T>) {
    const schema = internals
      .alternatives()
      .match('any')
      .conditional(
        internals.ref(`.${discriminator}`), // self reference
        types.map((type, index) => {
          const discriminatorSchema = type.getPropSchemas()[discriminator];
          const discriminatorValue = discriminatorSchema.expectedValue;

          if (discriminatorValue == null) {
            throw new Error(
              `Discriminator for schema at index ${index} must be a literal type, got ${
                discriminatorSchema.getSchema().type
              } type`
            );
          }

          return {
            is: discriminatorValue,
            then: type.getSchema(),
          };
        })
      );

    super(schema, options);

    this.discriminator = discriminator;
    this.discriminatedValues = types.map(
      (type) => type.getPropSchemas()[discriminator].expectedValue
    );
    this.unionTypes = types;
    this.typeOptions = options;
  }

  public extendsDeep(options: ExtendsDeepOptions) {
    return new DiscriminatedUnionType(
      this.discriminator,
      this.unionTypes.map((t) => t.extendsDeep(options)),
      this.typeOptions
    );
  }

  protected handleError(type: string, { value }: Record<string, any>, path: string[]) {
    switch (type) {
      case 'alternatives.any':
        const discriminatorValue = value[this.discriminator];

        if (discriminatorValue == null) {
          return `"${this.discriminator}" property is required`;
        }

        const discriminators = this.discriminatedValues.map((v) => JSON.stringify(v)).join(', ');
        const discriminatorType = typeDetect(discriminatorValue);

        if (discriminatorType !== 'string') {
          return `expected "${this.discriminator}" to be a string of [${discriminators}] but got [${discriminatorType}]`;
        }

        if (!this.discriminatedValues.includes(discriminatorValue)) {
          return `expected "${this.discriminator}" to be one of [${discriminators}] but got ["${discriminatorValue}"]`;
        }
    }
  }
}
