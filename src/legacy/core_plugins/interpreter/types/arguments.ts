/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { UnwrapPromise } from './common';

/**
 * This type can convert a type into a known Expression Argument string. For example,
 * `TypeToArgumentString<Datatable>` will resolve to `'datatable'`.  This allows
 * Expression Functions to continue to specify their type in a simple string format.
 */
export type TypeToArgumentString<T> = KnownTypeToArgumentString<T> | UnmappedArgumentStrings;

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
 * Map the type of the generic to a string-based representation of the type.
 *
 * If the provided generic is its own type interface, we use the value of
 * the `type` key as the string literal type for the argument.
 */
// prettier-ignore
type KnownTypeToArgumentString<T> = 
  T extends string ? 'string' : 
  T extends boolean ? 'boolean' : 
  T extends number ? 'number' :
  T extends null ? 'null' :
  T extends { type: string } ? T['type'] :
  never;

/**
 * If the argument type extends a Promise, we still need to return the string
 * representation:
 *
 * `someArgument: Promise<boolean | string>` results in `types: ['boolean', 'string']`
 */
type ArgumentString<T> = KnownTypeToArgumentString<UnwrapPromise<T>>;

/**
 * Types used in Expression Arguments that don't map to a primitive cleanly:
 *
 * `date` is typed as a number or string, and represents a date
 */
type UnmappedArgumentStrings = 'date' | 'filter';

/**
 * Map the type within the the generic array to a string-based
 * representation of the type.
 */
// prettier-ignore
type ArrayTypeToArgumentString<T> = 
  T extends Array<infer ElementType> ? ArgumentString<ElementType> : 
  T extends null ? 'null' : 
  never;

/**
 * Map the return type of the function within the generic to a
 * string-based representation of the return type.
 */
// prettier-ignore
type UnresolvedTypeToArgumentString<T> = 
  T extends (...args: any) => infer ElementType ? ArgumentString<ElementType> : 
  T extends null ? 'null' : 
  never;

/**
 * Map the array-based return type of the function within the generic to a
 * string-based representation of the return type.
 */
// prettier-ignore
type UnresolvedArrayTypeToArgumentString<T> = 
  T extends Array<(...args: any) => infer ElementType> ? ArgumentString<ElementType> :
  T extends (...args: any) => infer ElementType ? ArrayTypeToArgumentString<ElementType> : 
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
  types?: Array<KnownTypeToArgumentString<T> | UnmappedArgumentStrings>;
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
  types?: Array<ArrayTypeToArgumentString<T> | UnmappedArgumentStrings>;
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
  types?: Array<UnresolvedTypeToArgumentString<T> | UnmappedArgumentStrings>;
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
  types?: Array<UnresolvedArrayTypeToArgumentString<T> | UnmappedArgumentStrings>;
};
