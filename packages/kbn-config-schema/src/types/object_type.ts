/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnySchema } from 'joi';
import typeDetect from 'type-detect';
import { internals } from '../internals';
import { Type, TypeOptions, ExtendsDeepOptions, OptionsForUnknowns } from './type';
import { ValidationError } from '../errors';

export type Props = Record<string, Type<any>>;

export type NullableProps = Record<string, Type<any> | undefined | null>;

export type TypeOrLazyType = Type<any> | (() => Type<any>);

export type TypeOf<RT extends TypeOrLazyType> = RT extends () => Type<any>
  ? ReturnType<RT>['type']
  : RT extends Type<any>
  ? RT['type']
  : never;

type OptionalProperties<Base extends Props> = Pick<
  Base,
  {
    [Key in keyof Base]: undefined extends TypeOf<Base[Key]> ? Key : never;
  }[keyof Base]
>;

type RequiredProperties<Base extends Props> = Pick<
  Base,
  {
    [Key in keyof Base]: undefined extends TypeOf<Base[Key]> ? never : Key;
  }[keyof Base]
>;

// Because of https://github.com/Microsoft/TypeScript/issues/14041
// this might not have perfect _rendering_ output, but it will be typed.
export type ObjectResultType<P extends Props> = Readonly<
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

type ExtendedProps<P extends Props, NP extends NullableProps> = Omit<P, keyof NP> & {
  [K in keyof DefinedProperties<NP>]: NP[K];
};

type ExtendedObjectType<P extends Props, NP extends NullableProps> = ObjectType<
  ExtendedProps<P, NP>
>;

type ExtendedObjectTypeOptions<P extends Props, NP extends NullableProps> = ObjectTypeOptions<
  ExtendedProps<P, NP>
>;

interface UnknownOptions {
  unknowns?: OptionsForUnknowns;
}

interface ObjectTypeOptionsMeta {
  /**
   * A string that uniquely identifies this schema. Used when generating OAS
   * to create refs instead of inline schemas.
   */
  id?: string;
}

export type ObjectTypeOptions<P extends Props = any> = TypeOptions<ObjectResultType<P>> &
  UnknownOptions & { meta?: TypeOptions<ObjectResultType<P>>['meta'] & ObjectTypeOptionsMeta };

export class ObjectType<P extends Props = any> extends Type<ObjectResultType<P>> {
  private props: P;
  private options: ObjectTypeOptions<P>;
  private propSchemas: Record<string, AnySchema>;

  constructor(props: P, options: ObjectTypeOptions<P> = {}) {
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
    this.props = props;
    this.propSchemas = schemaKeys;
    this.options = options;
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
   * // TypeOf<typeof extended> is `{ foo: string; nested: { c: string } }`
   * ```
   */
  public extends<NP extends NullableProps>(
    newProps: NP,
    newOptions?: ExtendedObjectTypeOptions<P, NP>
  ): ExtendedObjectType<P, NP> {
    const extendedProps = Object.entries({
      ...this.props,
      ...newProps,
    }).reduce((memo, [key, value]) => {
      if (value !== null && value !== undefined) {
        (memo as Record<string, unknown>)[key] = value;
      }
      return memo;
    }, {} as ExtendedProps<P, NP>);

    const extendedOptions = {
      ...this.options,
      ...newOptions,
    } as ExtendedObjectTypeOptions<P, NP>;

    return new ObjectType(extendedProps, extendedOptions);
  }

  public extendsDeep(options: ExtendsDeepOptions) {
    const extendedProps = Object.entries(this.props).reduce((memo, [key, value]) => {
      if (value !== null && value !== undefined) {
        return {
          ...memo,
          [key]: value.extendsDeep(options),
        };
      }
      return memo;
    }, {} as P);

    const extendedOptions: ObjectTypeOptions<P> = {
      ...this.options,
      ...(options.unknowns ? { unknowns: options.unknowns } : {}),
    };

    return new ObjectType(extendedProps, extendedOptions);
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
   * @internal should only be used internal for type reflection
   */
  public getPropSchemas(): P {
    return this.props;
  }

  validateKey(key: string, value: any) {
    if (!this.propSchemas[key]) {
      throw new Error(`${key} is not a valid part of this schema`);
    }
    const { value: validatedValue, error } = this.propSchemas[key].validate(value);
    if (error) {
      throw new ValidationError(error as any, key);
    }
    return validatedValue;
  }
}
