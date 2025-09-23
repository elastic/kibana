/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnySchema } from 'joi';
import typeDetect from 'type-detect';
import { internals } from '../internals';
import type {
  TypeOptions,
  ExtendsDeepOptions,
  UnknownOptions,
  SomeType,
  TypeOrLazyType,
  DefaultValue,
} from './type';
import { Type } from './type';
import { ValidationError } from '../errors';
import type { OptionalizeObject } from '../helpers/types';

/**
 * Generic type for inferring `schema.object` type.
 *
 * @example
 * ```ts
 * function generateSchema<T extends SomeObjectType>(type: T) {
 *   return schema.object({
 *     id: schema.string(),
 *     type, // built up from type of T
 *   });
 * }
 * ```
 */
export type SomeObjectType = ObjectType<any, any, any>;

/**
 * Used to define props to pass to `schema.object`.
 *
 * @note should *only* be used with `satisfies` to ensure the correct type is inferred.
 *
 * @example
 * ```ts
 * const mySchemaProps = {
 *   name: schema.string(),
 *   age: schema.number(),
 * } satisfies ObjectProps;
 * const mySchema = schema.object(mySchemaProps);
 * ```
 */
export type ObjectProps = Record<string, SomeType>;

export type ObjectOutputType<Props extends ObjectProps> = OptionalizeObject<{
  [k in keyof Props]: Props[k]['_output'];
}>;

export type ObjectInputType<Props extends ObjectProps> = OptionalizeObject<{
  [k in keyof Props]: Props[k]['_input'];
}>;

export type NullableProps = Record<string, SomeType | undefined | null>;

type TypeOf<RT extends TypeOrLazyType> = RT extends () => SomeType
  ? ReturnType<RT>['type']
  : RT extends SomeType
  ? RT['type']
  : never;

type OptionalProperties<Base extends ObjectProps> = Pick<
  Base,
  {
    [Key in keyof Base]: undefined extends TypeOf<Base[Key]> ? Key : never;
  }[keyof Base]
>;

type RequiredProperties<Base extends ObjectProps> = Pick<
  Base,
  {
    [Key in keyof Base]: undefined extends TypeOf<Base[Key]> ? never : Key;
  }[keyof Base]
>;

export type ObjectResultType<P extends ObjectProps> = Readonly<
  { [K in keyof OptionalProperties<P>]?: TypeOf<P[K]> } & {
    [K in keyof RequiredProperties<P>]: TypeOf<P[K]>;
  }
>;

type DefinedProperties<Base extends NullableProps> = Pick<
  Base,
  {
    [Key in keyof Base]: undefined extends Base[Key] ? never : null extends Base[Key] ? never : Key;
  }[keyof Base]
>;

type ExtendedProps<P extends ObjectProps, NP extends NullableProps> = Omit<P, keyof NP> & {
  [K in keyof DefinedProperties<NP>]: NP[K];
};

interface ObjectTypeOptionsMeta {
  /**
   * A string that uniquely identifies this schema. Used when generating OAS
   * to create refs instead of inline schemas.
   */
  id?: string;
}

export type ObjectTypeOptions<Output, Input = Output> = TypeOptions<Output, Input> &
  UnknownOptions & { meta?: TypeOptions<Output, Input>['meta'] & ObjectTypeOptionsMeta };

export class ObjectType<
  P extends ObjectProps,
  Output = ObjectOutputType<P>,
  Input = ObjectInputType<P>
> extends Type<Output, Input> {
  #props: P;
  #options: ObjectTypeOptions<Output, Input>;
  #propSchemas: Record<string, AnySchema>;

  constructor(props: P, options: ObjectTypeOptions<Output, Input> = {}) {
    const schemaKeys = {} as Record<string, AnySchema>;
    const { unknowns, ...typeOptions } = options;
    for (const [key, value] of Object.entries(props)) {
      schemaKeys[key] = value.getSchema();
    }
    let schema = internals.object().keys(schemaKeys).default().optional();

    // We need to specify the `.unknown` property only when we want to override the default `forbid`
    // or it will break `stripUnknown` functionality.
    if (unknowns === 'allow') {
      schema = schema.unknown(unknowns === 'allow');
    }

    // Only set stripUnknown if we have an explicit value of `unknowns`
    if (unknowns) {
      schema = schema.options({ stripUnknown: { objects: unknowns === 'ignore' } });
    }

    if (options.meta?.id) {
      schema = schema.id(options.meta.id);
    }

    super(schema, typeOptions);
    this.#props = props;
    this.#propSchemas = schemaKeys;
    this.#options = options;
  }

  /**
   * Return a new `ObjectType` instance extended with given `newProps` properties.
   * Original properties can be deleted from the copy by passing a `null` or `undefined` value for the key.
   *
   * @example
   * How to add a new key to an object schema
   * ```ts
   * const origin = schema.object({
   *   initial: schema.string(),
   * });
   *
   * const extended = origin.extends({
   *   added: schema.number(),
   * });
   * ```
   *
   * How to remove an existing key from an object schema
   * ```ts
   * const origin = schema.object({
   *   initial: schema.string(),
   *   toRemove: schema.number(),
   * });
   *
   * const extended = origin.extends({
   *   toRemove: undefined,
   * });
   * ```
   *
   * How to override the schema's options
   * ```ts
   * const origin = schema.object({
   *   initial: schema.string(),
   * }, { defaultValue: { initial: 'foo' }});
   *
   * const extended = origin.extends({
   *   added: schema.number(),
   * }, { defaultValue: { initial: 'foo', added: 'bar' }});
   * ```
   *
   * @remarks
   * `extends` only support extending first-level properties. It's currently not possible to perform deep/nested extensions.
   *
   * ```ts
   * const origin = schema.object({
   *   foo: schema.string(),
   *   nested: schema.object({
   *     a: schema.string(),
   *     b: schema.string(),
   *   }),
   * });
   *
   * const extended = origin.extends({
   *   nested: schema.object({
   *     c: schema.string(),
   *   }),
   * });
   *
   * // TypeOf<typeof extended> -> { foo: string; nested: { c: string } }
   * ```
   */
  public extends<
    T extends SomeObjectType,
    NP extends T['props'] // must derive props from general type to infer precise types
  >(
    newProps: NP,
    newOptions?: ObjectTypeOptions<
      ObjectOutputType<ExtendedProps<P, NP>>,
      ObjectInputType<ExtendedProps<P, NP>>
    >
  ): ObjectType<
    ExtendedProps<P, NP>,
    ObjectOutputType<ExtendedProps<P, NP>>,
    ObjectInputType<ExtendedProps<P, NP>>
  > {
    const extendedProps = Object.entries({
      ...this.#props,
      ...newProps,
    }).reduce((memo, [key, value]) => {
      if (value !== null && value !== undefined) {
        (memo as Record<string, unknown>)[key] = value;
      }
      return memo;
    }, {} as ExtendedProps<P, NP>);

    const extendedOptions = {
      ...this.#options,
      ...newOptions,
    } as ObjectTypeOptions<
      ObjectOutputType<ExtendedProps<P, NP>>,
      ObjectInputType<ExtendedProps<P, NP>>
    >;

    return new ObjectType(extendedProps, extendedOptions);
  }

  public extendsDeep(options: ExtendsDeepOptions): Type<Output, Input> {
    const extendedProps = Object.entries(this.#props).reduce((memo, [key, value]) => {
      if (value !== null && value !== undefined) {
        return {
          ...memo,
          [key]: value.extendsDeep(options),
        };
      }
      return memo;
    }, {} as P);

    const extendedOptions: ObjectTypeOptions<Output, Input> = {
      ...this.#options,
      ...(options.unknowns ? { unknowns: options.unknowns } : {}),
    };

    return new ObjectType(extendedProps, extendedOptions);
  }

  protected getDefault(defaultValue?: DefaultValue<Input>): DefaultValue<Input> | undefined {
    return defaultValue;
  }

  protected handleError(type: string, { reason, value }: Record<string, any>) {
    switch (type) {
      case 'any.required':
      case 'object.base':
        return `expected a plain object value, but found [${typeDetect(value)}] instead.`;
      case 'object.parse':
        return `could not parse object value from json input`;
      case 'object.unknown':
        return `definition for this key is missing`;
      case 'object.child':
        return reason[0];
    }
  }

  /**
   * Return the schema for this object's underlying properties
   *
   * @example
   * ```ts
   * const schema1 = schema.object({
   *   str: schema.string(),
   *   num: schema.number(),
   * });
   *
   * const schema2 = schema.object({
   *   ...schema1.props,
   *   bool: schema.boolean(),
   * });
   * ```
   */
  public get props(): P {
    return { ...this.#props };
  }

  /**
   * @deprecated use `schema.props` instead
   */
  public getPropSchemas(): P {
    return { ...this.#props };
  }

  validateKey(key: string, value: any) {
    if (!this.#propSchemas[key]) {
      throw new Error(`${key} is not a valid part of this schema`);
    }
    const { value: validatedValue, error } = this.#propSchemas[key].validate(value);
    if (error) {
      throw new ValidationError(error as any, key);
    }
    return validatedValue;
  }
}
