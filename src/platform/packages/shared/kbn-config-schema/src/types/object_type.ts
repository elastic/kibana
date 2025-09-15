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
import type { TypeOptions, ExtendsDeepOptions, UnknownOptions, DefaultValue } from './type';
import { Type } from './type';
import { ValidationError } from '../errors';
import { Reference } from '../references';

export type ObjectDefaultValue<T extends ObjectProps<Props>> = DefaultValue<
  ObjectResultTypeInput<T>
>;

export type Props = Record<string, Type<any, DefaultValue<any>>>;
export type NullableProps = Record<string, Type<any> | undefined | null>;

/**
 * A type used to constrain the object props to preserve the exact type for D
 *
 * Without this the defaults will be stripped away from the defined types
 */
export type ObjectProps<P extends Props> = {
  [K in keyof P]: P[K] extends Type<infer V, infer D> ? D : never;
};

export type TypeOrLazyType<T = any, D extends DefaultValue<T> = never> =
  | Type<T, D>
  | (() => Type<T, D>);

export type ObjectTypeOrLazyType<
  P extends ObjectProps<Props> = any,
  D extends ObjectDefaultValue<P> = any
> = ObjectType<P, D> | (() => ObjectType<P, D>);

/**
 * @internal
 */
type TypeOf<RT extends TypeOrLazyType> = RT extends () => TypeOrLazyType<infer V, infer D>
  ? Type<V, D>['_output']
  : never;

type TypeOfOutput<RT extends TypeOrLazyType | ObjectTypeOrLazyType> =
  RT extends ObjectTypeOrLazyType<infer V, infer D>
    ? ObjectResultType<V>
    : RT extends TypeOrLazyType<infer V, infer D>
    ? Type<V, D>['_output']
    : never;

/**
 * @internal
 *
 * Need to avoid circular ref
 */
type TypeOfInput<RT extends TypeOrLazyType | ObjectTypeOrLazyType> =
  RT extends ObjectTypeOrLazyType<infer V, infer D>
    ? ObjectResultTypeInput<V>
    : RT extends TypeOrLazyType<infer V, infer D>
    ? Type<V, D>['_input']
    : never;

type UndefinedPropertyKeys<Base extends ObjectProps<Props>> = {
  [Key in keyof Base]: Base[Key] extends Type<infer V, infer D>
    ? V extends undefined
      ? Key
      : never
    : never;
}[keyof Base];

type OptionalProperties<Base extends ObjectProps<Props>> = Pick<
  Base,
  {
    [Key in keyof Base]: undefined extends TypeOf<Base[Key]> ? Key : never;
  }[keyof Base]
>;

type DefaultProperties<Base extends ObjectProps<Props>> = Pick<
  Base,
  {
    [Key in keyof Base]: Base[Key] extends Type<any, infer D>
      ? [D] extends [never]
        ? never
        : Key
      : never;
  }[keyof Base]
>;

type RequiredProperties<Base extends ObjectProps<Props>> = Pick<
  Base,
  {
    [Key in keyof Base]: undefined extends TypeOf<Base[Key]> ? never : Key;
  }[keyof Base]
>;

export type ObjectResultType<P extends ObjectProps<Props>> = {
  [K in keyof OptionalProperties<P>]?: TypeOfOutput<P[K]>;
} & {
  [K in keyof RequiredProperties<P>]: TypeOfOutput<P[K]>;
};

export type TypeOfDefault<RT extends TypeOrLazyType> = RT extends TypeOrLazyType<infer V, infer D>
  ? [D] extends [never]
    ? V
    : V | D // generalize default (i.e. 'foo' to string)
  : 1;

export type ObjectResultDefaults<P extends ObjectProps<Props>> = {
  [K in keyof OptionalProperties<P>]?: TypeOfDefault<P[K]>;
} & {
  [K in Exclude<keyof RequiredProperties<P>, keyof DefaultProperties<P>>]: TypeOfDefault<P[K]>;
} & {
  [K in keyof DefaultProperties<P>]?: TypeOfDefault<P[K]>;
};

export type ObjectResultTypeInput<P extends ObjectProps<Props>> = {
  [K in keyof OptionalProperties<P>]?: TypeOfInput<P[K]>;
} & {
  // Omit default and undefined (not defined with ?) values from required list
  [K in Exclude<
    keyof RequiredProperties<P>,
    keyof DefaultProperties<P> | UndefinedPropertyKeys<P>
  >]: TypeOfInput<P[K]>;
} & {
  [K in keyof DefaultProperties<P>]?: TypeOfInput<P[K]>;
} & {
  [K in UndefinedPropertyKeys<P>]?: TypeOfInput<P[K]>;
};

type DefinedProperties<Base extends NullableProps> = Pick<
  Base,
  {
    [Key in keyof Base]: undefined extends Base[Key] ? never : null extends Base[Key] ? never : Key;
  }[keyof Base]
>;

type ExtendedProps<P extends ObjectProps<Props>, NP extends NullableProps> = Omit<P, keyof NP> & {
  [K in keyof DefinedProperties<NP>]: NP[K];
};

type ExtendedObjectType<P extends ObjectProps<Props>, NP extends NullableProps> = ObjectType<
  ExtendedProps<P, NP>
>;

type ExtendedObjectTypeOptions<
  P extends ObjectProps<Props>,
  NP extends NullableProps
> = ObjectTypeOptions<ExtendedProps<P, NP>, ObjectDefaultValue<ExtendedProps<P, NP>>>;

interface ObjectTypeOptionsMeta {
  /**
   * A string that uniquely identifies this schema. Used when generating OAS
   * to create refs instead of inline schemas.
   */
  id?: string;
}

export type ObjectTypeOptions<
  P extends ObjectProps<Props>,
  D extends ObjectDefaultValue<P | any>
> = TypeOptions<ObjectResultType<P>, D, ObjectTypeOptionsMeta> & UnknownOptions;

export class ObjectType<
  P extends ObjectProps<Props>,
  D extends ObjectDefaultValue<P | any> = never
> extends Type<ObjectResultType<P>, D> {
  private props: P;
  private options: ObjectTypeOptions<P, D>;
  private propSchemas: Record<string, AnySchema>;

  constructor(props: P, options: ObjectTypeOptions<P, D> = {}) {
    const schemaKeys = {} as Record<string, AnySchema>;
    const { unknowns, defaultValue, ...typeOptions } = options;
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

    // Validate defaultValue object to fill defaults
    if (defaultValue !== undefined) {
      if (typeof defaultValue === 'function') {
        const defaultValueFn = defaultValue;
        const newDefaultFn = () => {
          // @ts-expect-error - need to fix this error
          return schema.validate(defaultValueFn());
        };
        schema = schema.default(newDefaultFn);
      } else if (Reference.isReference(defaultValue)) {
        // Ref typings are ambagious, cannot validate but probably a rare case.
        schema = schema.default(defaultValue.getSchema());
      } else {
        const newDefault = schema.validate(defaultValue).value;
        schema = schema.default(newDefault);
      }
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

    // @ts-expect-error - figure this out, likely due to D not extending V
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

    const extendedOptions: ObjectTypeOptions<P, D> = {
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
   */
  public getPropSchemas(): P {
    return { ...this.props };
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
