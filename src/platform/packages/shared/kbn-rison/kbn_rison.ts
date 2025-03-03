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

export type RisonValue =
  | boolean
  | string
  | number
  | RisonValue[]
  | { [key: string]: RisonValue }
  | null;

export function encodeUnknown(obj: any): string | undefined {
  return Rison.encode(obj);
}

/**
 * rison-encode a javascript structure
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
 * parse a rison string into a javascript structure.
 */
export function decode(rison: string): RisonValue {
  return Rison.decode(rison);
}

/**
 * safely parse a rison string into a javascript structure, never throws
 */
export function safeDecode(rison: string): RisonValue {
  try {
    return decode(rison);
  } catch {
    return null;
  }
}

/**
 * rison-encode a javascript array without surrounding parens
 */
export function encodeArray(array: any[]) {
  return Rison.encode_array(array);
}

/**
 * parse an a-rison string into a javascript structure.
 *
 * this simply adds array markup around the string before parsing.
 */
export function decodeArray(rison: string): RisonValue[] {
  return Rison.decode_array(rison);
}
