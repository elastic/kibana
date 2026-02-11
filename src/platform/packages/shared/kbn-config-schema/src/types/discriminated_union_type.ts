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
import { ObjectType, type ObjectResultType, type Props } from './object_type';
import { UnionType, type UnionTypeOptions } from './union_type';

export type ObjectResultUnionType<T> = T extends Props ? ObjectResultType<T> : never;

export type PropsWithDiscriminator<Discriminator extends string, T extends Props> = Omit<
  T,
  Discriminator
> & {
  [Key in Discriminator]: Type<string>;
};

type DiscriminatedUnionBranch = ObjectType<any> | UnionType<any, any>;

export class DiscriminatedUnionType<
  Discriminator extends string,
  T extends PropsWithDiscriminator<Discriminator, Props>
> extends Type<T> {
  private readonly discriminator: Discriminator;
  private readonly discriminatedValues: string[];
  private readonly unionTypes: ReadonlyArray<DiscriminatedUnionBranch>;
  private readonly typeOptions?: UnionTypeOptions<T>;

  constructor(
    discriminator: Discriminator,
    types: ReadonlyArray<DiscriminatedUnionBranch>,
    options?: UnionTypeOptions<T>
  ) {
    const discriminators = new Set<string>();

    const flattenUnionTypes = (type: Type<any>): Array<Type<any>> => {
      if (type instanceof UnionType) {
        return type.getTypes().flatMap(flattenUnionTypes);
      }
      return [type];
    };

    const getTypeDebugName = (type: unknown): string => {
      if (type && typeof type === 'object') {
        const ctorName = (type as any).constructor?.name;
        if (typeof ctorName === 'string' && ctorName.length > 0) {
          return ctorName;
        }
      }
      return typeof type;
    };

    const resolveBranchDiscriminator = (
      branch: DiscriminatedUnionBranch,
      index: number
    ): { discriminatorValue: unknown; thenSchema: Schema } => {
      if (branch instanceof UnionType) {
        const alternatives = branch.getTypes().flatMap(flattenUnionTypes);
        if (alternatives.length === 0) {
          throw new Error(`oneOf schema at index ${index} must include at least one type`);
        }

        const values = new Set<string>();
        let hasFallback = false;

        for (const [altIndex, alt] of alternatives.entries()) {
          if (!(alt instanceof ObjectType)) {
            throw new Error(
              `oneOf schema at index ${index} must only include object schemas, got ${getTypeDebugName(
                alt
              )} at index ${altIndex}`
            );
          }

          const discriminatorSchema = alt.getPropSchemas()[discriminator];
          if (discriminatorSchema == null) {
            throw new Error(
              `Discriminator property "${discriminator}" is required for schema at index ${index} (oneOf alternative ${altIndex})`
            );
          }

          const discriminatorValue = discriminatorSchema.getExpectedValue();
          if (discriminatorValue == null) {
            hasFallback = true;
            continue;
          }

          if (typeof discriminatorValue !== 'string') {
            throw new Error(
              `Discriminator for schema at index ${index} must be a string type, got ${typeof discriminatorValue}`
            );
          }

          values.add(discriminatorValue);
        }

        if (values.size > 1) {
          const prettyValues = Array.from(values)
            .map((v) => JSON.stringify(v))
            .join(', ');
          throw new Error(
            `Discriminator for schema at index ${index} must resolve to a single value, got [${prettyValues}]`
          );
        }

        if (values.size === 1 && hasFallback) {
          throw new Error(
            `Discriminator for schema at index ${index} must not mix literal and fallback discriminators within oneOf`
          );
        }

        return {
          discriminatorValue: values.size === 1 ? Array.from(values)[0] : undefined,
          thenSchema: branch.getSchema(),
        };
      }

      if (!(branch instanceof ObjectType)) {
        throw new Error(
          `Schema at index ${index} must be an object schema or oneOf of object schemas, got ${getTypeDebugName(
            branch
          )}`
        );
      }

      const discriminatorSchema = branch.getPropSchemas()[discriminator];
      if (discriminatorSchema == null) {
        throw new Error(
          `Discriminator property "${discriminator}" is required for schema at index ${index}`
        );
      }

      return {
        discriminatorValue: discriminatorSchema.getExpectedValue(),
        thenSchema: branch.getSchema(),
      };
    };

    let otherwise: Schema | undefined;
    const switchCases = types.reduce<SwitchCases[]>((acc, type, index) => {
      const { discriminatorValue, thenSchema } = resolveBranchDiscriminator(type, index);

      if (discriminatorValue == null) {
        if (otherwise) {
          throw new Error(`Only one fallback schema is allowed`);
        }

        otherwise = thenSchema.meta({ [META_FIELD_X_OAS_DISCRIMINATOR_DEFAULT_CASE]: true });
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
        then: thenSchema,
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
