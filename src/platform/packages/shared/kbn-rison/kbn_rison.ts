/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @ts-expect-error untyped module from npm
// eslint-disable-next-line @kbn/eslint/module_migration
import Rison from 'rison-node';

/**
 * Any value that can be represented in RISON — a superset of JSON primitives
 * that also supports nested objects and arrays.
 */
export type RisonValue =
  | boolean
  | string
  | number
  | RisonValue[]
  | { [key: string]: RisonValue }
  | null;

/**
 * RISON-encode a JavaScript value, returning `undefined` when the value cannot
 * be represented in RISON (e.g. functions, symbols, or circular references).
 * Use {@link encode} when the input is expected to always be encodable.
 *
 * @param obj - The value to encode. Typed as `any` because this function is
 *   intentionally used to probe whether an arbitrary runtime value is
 *   RISON-encodable before committing to encoding it.
 * @returns The RISON-encoded string, or `undefined` if the value is not encodable.
 */
export function encodeUnknown(obj: any): string | undefined {
  return Rison.encode(obj);
}

/**
 * RISON-encode a JavaScript value, throwing if the value cannot be encoded.
 * For values of unknown encodability, prefer {@link encodeUnknown}.
 *
 * @param obj - The JavaScript value to encode. Typed as `any` because RISON
 *   encoding is used to serialize arbitrary application state (e.g. URL
 *   parameters) whose shape is not known at compile time.
 * @returns The RISON-encoded string.
 */
export function encode(obj: any) {
  const rison = encodeUnknown(obj);
  if (rison === undefined) {
    throw new Error(
      'unable to encode value into rison, expected a primitive value array or object'
    );
  }
  return rison;
}

/**
 * Parse a RISON string into a JavaScript structure.
 *
 * @param rison - The RISON-encoded string to decode.
 * @returns The decoded JavaScript value as a {@link RisonValue}.
 */
export function decode(rison: string): RisonValue {
  return Rison.decode(rison);
}

/**
 * Parse a RISON string into a JavaScript structure, returning `null` instead
 * of throwing when the input is invalid.
 *
 * @param rison - The RISON-encoded string to decode.
 * @returns The decoded {@link RisonValue}, or `null` if the string is not valid RISON.
 */
export function safeDecode(rison: string): RisonValue {
  try {
    return decode(rison);
  } catch {
    return null;
  }
}

/**
 * RISON-encode a JavaScript array using A-RISON format (without surrounding
 * parentheses), suitable for use in URL array parameters.
 *
 * @param array - The array to encode. Typed as `any[]` because the array
 *   elements may be arbitrary application state values.
 * @returns The A-RISON-encoded string.
 */
export function encodeArray(array: any[]) {
  return Rison.encode_array(array);
}

/**
 * Parse an A-RISON string (a RISON array without surrounding parentheses)
 * into a JavaScript array. This prepends array markup before passing to the
 * standard RISON decoder.
 *
 * @param rison - The A-RISON-encoded string to decode.
 * @returns The decoded array of {@link RisonValue} elements.
 */
export function decodeArray(rison: string): RisonValue[] {
  return Rison.decode_array(rison);
}
