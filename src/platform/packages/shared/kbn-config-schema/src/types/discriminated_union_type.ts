/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Schema, SwitchCases } from 'joi';
import typeDetect from 'type-detect';

import { internals } from '../internals';
import {
  META_FIELD_X_OAS_DISCRIMINATOR,
  META_FIELD_X_OAS_DISCRIMINATOR_DEFAULT_CASE,
} from '../oas_meta_fields';
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
  [Key in Discriminator]: Type<string>;
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
    const discriminators = new Set<string>();

    let otherwise: Schema | undefined;
    const switchCases = types.reduce<SwitchCases[]>((acc, type, index) => {
      const discriminatorSchema = type.getPropSchemas()[discriminator];
      const discriminatorValue = discriminatorSchema.expectedValue;

      if (discriminatorValue == null) {
        if (otherwise) {
          throw new Error(`Only one fallback schema is allowed`);
        }

        otherwise = type.getSchema().meta({ [META_FIELD_X_OAS_DISCRIMINATOR_DEFAULT_CASE]: true });
        return acc;
      } else {
        if (typeof discriminatorValue !== 'string') {
          throw new Error(
            `Discriminator for schema at index ${index} must be a string type, got ${typeof discriminatorValue}`
          );
        }

        if (discriminators.has(discriminatorValue)) {
          throw new Error(
            `Discriminator for schema at index ${index} must be a unique, ${discriminatorValue} is already used`
          );
        }

        discriminators.add(discriminatorValue);
      }

      acc.push({
        is: discriminatorValue,
        then: type.getSchema(),
      });

      return acc;
    }, []);

    // This is a workaround to add the discriminator to the first case because our parser
    // strips it off the alternatives.match container.
    // https://github.com/kenspirit/joi-to-json/pull/58
    if (switchCases.length > 0) {
      switchCases[0].then = (switchCases[0]!.then! as Schema).meta({
        [META_FIELD_X_OAS_DISCRIMINATOR]: discriminator,
      });
    }

    const schema = internals
      .alternatives()
      .match('any')
      .meta({ [META_FIELD_X_OAS_DISCRIMINATOR]: discriminator })
      .conditional(
        internals.ref(`.${discriminator}`), // self reference object property
        {
          switch: switchCases,
          otherwise,
        }
      );

    super(schema, options);

    this.discriminator = discriminator;
    this.discriminatedValues = Array.from(discriminators);
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
