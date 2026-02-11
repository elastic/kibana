/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type UnionKeys<T> = T extends T ? keyof T : never;

// This is a helper type to check if two types are exactly the same
export type Exact<T, U> = T extends U
  ? Exclude<UnionKeys<T>, UnionKeys<U>> extends never
    ? true
    : false
  : false;

// This is a helper type to show clearly the missing keys
export type MissingKeysError<T extends string> = Error &
  `The following keys are missing from the document fields: ${T}`;

// This is a helper type to omit the type field from a type
export type WithoutTypeField<T> = Omit<T, 'type'>;

export type PartialWithArrayValues<T> = Partial<{
  [P in keyof T]?: T[P] extends {}
    ? PartialWithArrayValues<T[P]> | PartialWithArrayValues<T[P]>[]
    : T[P] | T[P][];
}>;
