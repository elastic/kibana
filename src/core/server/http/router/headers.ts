/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IncomingHttpHeaders } from 'http';
import { pick } from '@kbn/std';

/**
 * Converts an object type to a new object type where each string
 * key is copied to the values of the object, and non string keys are
 * given a `never` value. This allows us to map over the values and
 * get the list of all string keys on a type in `KnownKeys<T>`
 */
type StringKeysAsVals<T> = {
  [K in keyof T]: string extends K ? never : number extends K ? never : K;
};

/**
 * Creates a Union type of all known keys of a given interface.
 * @example
 * ```ts
 * interface Person {
 *   name: string;
 *   age: number;
 *   [attributes: string]: string | number;
 * }
 * type PersonKnownKeys = KnownKeys<Person>; // "age" | "name"
 * ```
 */
type KnownKeys<T> = StringKeysAsVals<T> extends { [_ in keyof T]: infer U } ? U : never;

/**
 * Set of well-known HTTP headers.
 * @public
 */
export type KnownHeaders = KnownKeys<IncomingHttpHeaders>;

/**
 * Http request headers to read.
 * @public
 */
export type Headers = { [header in KnownHeaders]?: string | string[] | undefined } & {
  [header: string]: string | string[] | undefined;
};

/**
 * Http response headers to set.
 * @public
 */
export type ResponseHeaders =
  | Record<KnownHeaders, string | string[]>
  | Record<string, string | string[]>;

const normalizeHeaderField = (field: string) => field.trim().toLowerCase();

export function filterHeaders(
  headers: Headers,
  fieldsToKeep: string[],
  fieldsToExclude: string[] = []
): Headers {
  const fieldsToExcludeNormalized = fieldsToExclude.map(normalizeHeaderField);
  // Normalize list of headers we want to allow in upstream request
  const fieldsToKeepNormalized = fieldsToKeep
    .map(normalizeHeaderField)
    .filter((name) => !fieldsToExcludeNormalized.includes(name));

  return pick(headers, fieldsToKeepNormalized);
}
