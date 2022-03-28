/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KnownTypeToString, TypeString, UnmappedTypeStrings } from '../types/common';

/**
 * This type represents all of the possible combinations of properties of an
 * Argument in an Expression Function. The presence or absence of certain fields
 * influence the shape and presence of others within each `arg` in the specification.
 */
export type ArgumentType<T> =
  | SingleArgumentType<T>
  | MultipleArgumentType<T>
  | UnresolvedSingleArgumentType<T>
  | UnresolvedMultipleArgumentType<T>;

/**
 * Map the type within the the generic array to a string-based
 * representation of the type.
 */
// prettier-ignore
type ArrayTypeToArgumentString<T> =
  T extends Array<infer ElementType> ? TypeString<ElementType> :
  T extends null ? 'null' :
  never;

/**
 * Map the return type of the function within the generic to a
 * string-based representation of the return type.
 */
// prettier-ignore
type UnresolvedTypeToArgumentString<T> =
  T extends (...args: any[]) => infer ElementType ? TypeString<ElementType> :
  T extends null ? 'null' :
  never;

/**
 * Map the array-based return type of the function within the generic to a
 * string-based representation of the return type.
 */
// prettier-ignore
type UnresolvedArrayTypeToArgumentString<T> =
  T extends Array<(...args: any[]) => infer ElementType> ? TypeString<ElementType> :
  T extends (...args: any[]) => infer ElementType ? ArrayTypeToArgumentString<ElementType> :
  T extends null ? 'null' :
  never;

/** A type containing properties common to all Function Arguments. */
interface BaseArgumentType<T> {
  /** Alternate names for the Function valid for use in the Expression Editor */
  aliases?: string[];
  /** Help text for the Argument to be displayed in the Expression Editor */
  help: string;
  /** Default options for the Argument */
  options?: T[];
  /**
   * Is this Argument required?
   * @default false
   */
  required?: boolean;
  /**
   * If false, the Argument is supplied as a function to be invoked in the
   * implementation, rather than a value.
   * @default true
   */
  resolve?: boolean;
  /**
   * Turns on strict options checking.
   * @default false
   * @deprecated This option is added for backward compatibility and will be removed
   * as soon as all the functions list all the available options.
   */
  strict?: boolean;
  /** Names of types that are valid values of the Argument. */
  types?: string[];
  /** The optional default value of the Argument. */
  default?: T | string;
  /**
   * If true, multiple values may be supplied to the Argument.
   * @default false
   */
  multi?: boolean;
}

/**
 * The `types` array in a `FunctionSpec` should contain string
 * representations of the `ArgumentsSpec` types:
 *
 * `someArgument: boolean | string` results in `types: ['boolean', 'string']`
 */
type SingleArgumentType<T> = BaseArgumentType<T> & {
  multi?: false;
  resolve?: true;
  types?: Array<KnownTypeToString<T> | UnmappedTypeStrings>;
};

/**
 * If the `multi` property on the argument is true, the `types` array should
 * contain string representations of the `ArgumentsSpec` array types:
 *
 * `someArgument: boolean[] | string[]` results in: `types: ['boolean', 'string']`
 */
type MultipleArgumentType<T> = BaseArgumentType<T> & {
  multi: true;
  resolve?: true;
  types?: Array<ArrayTypeToArgumentString<T> | UnmappedTypeStrings>;
};

/**
 * If the `resolve` property on the arugument is false, the `types` array, if
 * present, should contain string representations of the result of the argument
 * function:
 *
 * `someArgument: () => string` results in `types: ['string']`
 */
type UnresolvedSingleArgumentType<T> = BaseArgumentType<T> & {
  multi?: false;
  resolve: false;
  types?: Array<UnresolvedTypeToArgumentString<T> | UnmappedTypeStrings>;
};

/**
 * If the `resolve` property on the arugument is false, the `types` array, if
 * present, should contain string representations of the result of the argument
 * function:
 *
 * `someArgument: () => string[]` results in `types: ['string']`
 */
type UnresolvedMultipleArgumentType<T> = BaseArgumentType<T> & {
  multi: true;
  resolve: false;
  types?: Array<UnresolvedArrayTypeToArgumentString<T> | UnmappedTypeStrings>;
};
