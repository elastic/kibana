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

import { UnwrapPromiseOrReturn } from '@kbn/utility-types';

/**
 * This can convert a type into a known Expression string representation of
 * that type. For example, `TypeToString<Datatable>` will resolve to `'datatable'`.
 * This allows Expression Functions to continue to specify their type in a
 * simple string format.
 */
export type TypeToString<T> = KnownTypeToString<T> | UnmappedTypeStrings;

/**
 * Map the type of the generic to a string-based representation of the type.
 *
 * If the provided generic is its own type interface, we use the value of
 * the `type` key as a string literal type for it.
 */
// prettier-ignore
export type KnownTypeToString<T> = 
  T extends string ? 'string' : 
  T extends boolean ? 'boolean' : 
  T extends number ? 'number' :
  T extends null ? 'null' :
  T extends { type: string } ? T['type'] :
  never;

/**
 * If the type extends a Promise, we still need to return the string representation:
 *
 * `someArgument: Promise<boolean | string>` results in `types: ['boolean', 'string']`
 */
export type TypeString<T> = KnownTypeToString<UnwrapPromiseOrReturn<T>>;

/**
 * Types used in Expressions that don't map to a primitive cleanly:
 *
 * `date` is typed as a number or string, and represents a date
 */
export type UnmappedTypeStrings = 'date' | 'filter';

/**
 * JSON representation of a field formatter configuration.
 * Is used to carry information about how to format data in
 * a data table as part of the column definition.
 */
export interface SerializedFieldFormat<TParams = Record<string, any>> {
  id?: string;
  params?: TParams;
}
