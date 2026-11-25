/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type JsonValue = null | boolean | number | string | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JsonArray extends Array<JsonValue> {}

export type Serializable =
  | string
  | number
  | boolean
  | null
  | undefined
  | SerializableArray
  | SerializableRecord;

// we need interfaces instead of types here to allow cyclic references
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SerializableArray extends Array<Serializable> {}

export type SerializableRecord<AllowedKeys extends string | number | symbol = string> = {
  [Key in AllowedKeys]?: Serializable;
};

/**
 * Use AsSerializableRecord to avoid recursive references to base type
 *
 * // Invalid example - TypeScript error:
 * // "Type 'MySerializableRecord' recursively references itself as a base type."
 * interface MySerializableRecord extends SerializableRecord<keyof MySerializableRecord> {
 *   foo: string;
 * }
 *
 * // Example without recursive references
 * type MySerializableRecord = AsSerializableRecord<{
 *   foo: string;
 * }>;
 */
export type AsSerializableRecord<T extends SerializableRecord<keyof T>> = T;
