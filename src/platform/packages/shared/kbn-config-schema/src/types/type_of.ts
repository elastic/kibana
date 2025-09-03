import { ObjectProps, ObjectTypeOrLazyType, Props, TypeOrLazyType } from "./object_type";
import { Type } from "./type";

type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};

/**
 * Resulting schema type.
 *
 * @alias `TypeOfOutput`
 * @example
 * ```ts
 * const mySchema = schema.object({ num: schema.number() });
 *
 * const MySchemaType = TypeOf<typeof mySchema>;
 * ```
 */
export type TypeOf<RT extends TypeOrLazyType> = TypeOfOutput<RT>

/**
 * Output type of schema after all defaults are applied.
 *
 * @example
 * ```ts
 * const mySchema = schema.object({ num: schema.number() });
 *
 * const MySchemaType = TypeOfOutput<typeof mySchema>;
 * ```
 */
export type TypeOfOutput<RT extends TypeOrLazyType | ObjectTypeOrLazyType> = Simplify<
  RT extends ObjectTypeOrLazyType<infer V, infer D>
  ? ObjectTypeOutput<V>
  : RT extends TypeOrLazyType<infer V, infer D>
  ? Type<V, D>['_output']
  : never
>;

type ObjectTypeOutput<P extends ObjectProps<Props>> = {
  [K in keyof Omit<P, keyof OptionalOutputProperties<P>>]: TypeOfOutput<P[K]>;
} & {
  [K in keyof OptionalOutputProperties<P>]?: TypeOfOutput<P[K]>;
}

type OptionalOutputProperties<Base extends ObjectProps<Props>> = Pick<
  Base,
  {
    [Key in keyof Base]: Base[Key] extends ObjectTypeOrLazyType<infer V, infer D>
      ? V extends undefined
        ? Key
        : never
      : Base[Key] extends TypeOrLazyType<infer V, infer D>
        ? V extends undefined
          ? Key
          : never
      : never
  }[keyof Base]
>;

/**
 * Input type of schema accounting for all `defaultValues` provided.
 *
 * @example
 * ```ts
 * const mySchema = schema.object({ num: schema.number() });
 *
 * const MySchemaType = TypeOfInput<typeof mySchema>;
 * ```
 */
export type TypeOfInput<RT extends TypeOrLazyType | ObjectTypeOrLazyType> = Simplify<
  RT extends ObjectTypeOrLazyType<infer V, infer D>
  // Force top-level default to be undefined
  ? ([D] extends [never] ? ObjectTypeInput<V> : ObjectTypeInput<V> | undefined)
  : RT extends TypeOrLazyType<infer V, infer D>
  ? Type<V, D>['_input']
  : never
>;

type ObjectTypeInput<P extends ObjectProps<Props>> = {
  [K in keyof Omit<P, keyof OptionalInputProperties<P>>]: TypeOfInput<P[K]>;
} & {
  [K in keyof OptionalInputProperties<P>]?: TypeOfInput<P[K]>;
}

export type OptionalInputProperties<Base extends ObjectProps<Props>> = Pick<
  Base,
  {
    [Key in keyof Base]: Base[Key] extends ObjectTypeOrLazyType<infer V, infer D>
      ? V extends undefined
        ? Key
        : [D] extends [never]
            ? never
            : Key
      : Base[Key] extends TypeOrLazyType<infer V, infer D>
        ? V extends undefined
          ? Key
          : [D] extends [never]
              ? never
              : Key
        : never;
  }[keyof Base]
>;
