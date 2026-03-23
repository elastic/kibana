/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// iterate over the items in order, to find non-nullish types
type Coalesce<T extends any[]> = T extends [infer T1, ...infer TTail]
  ? T1 extends null | undefined | false
    ? Coalesce<TTail>
    : T1
  : T extends [infer T1]
  ? T1
  : false;

// make sure string[] is not converted into { [key:string]: string }
// which is too wide to be useful
type FlagsToObj<T extends string[] | undefined, TValue> = string[] extends T
  ? {}
  : T extends string[]
  ? {
      [key in T[number] & string]?: TValue;
    }
  : {};

type IsStringLiteral<T extends string[] | undefined> = string[] extends T
  ? false
  : undefined extends T
  ? false
  : true;

type IsTypedFlagOptions<TFlagOptions extends FlagOptions> = Coalesce<
  [IsStringLiteral<TFlagOptions['string']>, IsStringLiteral<TFlagOptions['boolean']>]
>;

interface UnspecifiedFlags {
  [key: string]: string | string[] | boolean | undefined;
}

/**
 * Infer the type of Flags from FlagOptions. Inference only kicks in when
 * either `string` or `boolean` consists of string literals (which only
 * is the case when the flag options are tagged with the `as const` modifier.)
 * Otherwise the type we create is too specific and we'd have to use `as const`
 * everywhere.
 */
export type FlagsOf<TFlagOptions extends FlagOptions> =
  IsTypedFlagOptions<TFlagOptions> extends true
    ? BaseFlags<
        (true extends TFlagOptions['allowUnexpected'] ? UnspecifiedFlags : {}) &
          (TFlagOptions['string'] extends string[]
            ? FlagsToObj<TFlagOptions['string'], string>
            : {}) &
          (TFlagOptions['boolean'] extends string[]
            ? FlagsToObj<TFlagOptions['boolean'], boolean>
            : {})
      >
    : Flags;

/**
 * Base variant of Flags that does not automatically set unspecified
 * flags `([key:string]: ...)`
 */
export type BaseFlags<TExtraFlags extends UnspecifiedFlags = {}> = {
  verbose: boolean;
  quiet: boolean;
  silent: boolean;
  debug: boolean;
  help: boolean;
  _: string[];
  unexpected: string[];
} & TExtraFlags;

export type Flags = BaseFlags<UnspecifiedFlags>;

export interface FlagOptions {
  allowUnexpected?: boolean;
  guessTypesForUnexpectedFlags?: boolean;
  help?: string;
  examples?: string;
  alias?: { [key: string]: string | string[] };
  boolean?: string[];
  string?: string[];
  default?: { [key: string]: any };
}
