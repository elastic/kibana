/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MissingKeysError, UnionKeys, Exact, PartialWithArrayValues } from '../types_helpers';
import type { GetFieldsOf } from '../types';

// Suite MissingKeysError Helper Type
// Test: MissingKeysError for a single key
type SingleKeyError = MissingKeysError<'isActive'>;
export const singleKeyError: SingleKeyError = Object.assign(
  new Error(),
  'The following keys are missing from the document fields: isActive' as const
);

type ExlcudedKeys = Exclude<
  UnionKeys<{ exclusiveFirstOne: 1; exclusiveFirstTwo: 2; shared: 'a' }>,
  UnionKeys<{ exclusiveSecond: 2; shared: 'b' }>
>;
export const excludedKeys: ExlcudedKeys[] = ['exclusiveFirstOne', 'exclusiveFirstTwo'];

// Test: MissingKeysError for multiple keys
type MultipleKeysError = MissingKeysError<ExlcudedKeys>;
export const multipleKeysError: MultipleKeysError[] = [
  Object.assign(
    new Error(),
    'The following keys are missing from the document fields: exclusiveFirstOne' as const
  ),
  Object.assign(
    new Error(),
    'The following keys are missing from the document fields: exclusiveFirstTwo' as const
  ),
];

// Makes sure that we can't pass in a key that is not in the excludedKeys
export const invalidKeysError: MissingKeysError<'exclusiveFirstOne' | 'exclusiveFirstTwo'>[] = [
  Object.assign(
    new Error(),
    'The following keys are missing from the document fields: exclusiveFirstOne' as const
  ),
  Object.assign(
    new Error(),
    'The following keys are missing from the document fields: exclusiveFirstTwo' as const
  ),
  // @ts-expect-error - exclusiveFirstThree is not in the excludedKeys
  Object.assign(
    new Error(),
    'The following keys are missing from the document fields: exclusiveFirstThree' as const
  ),
];

// Suite Exact Helper Type
// Test: Exact with LHS = RHS
type TestExact = Exact<{ a: 1; b: 2 }, { a: 1; b: 2 }>;
export const testExact: TestExact = true;
type TestExactSchema = Exact<
  GetFieldsOf<{ properties: { a: { type: 'integer' }; b: { type: 'integer' } } }>,
  PartialWithArrayValues<{ a?: number; b?: number }>
>;
export const testExactSchema: TestExactSchema = true;

// Test: Exact with LHS subset of RHS
type TestExactSubsetLHS = Exact<{ a: 1; b: 2 }, { a: 1; b: 2; c: 3 }>;
export const testExactSubsetLHS: TestExactSubsetLHS = false;

// Test: Exact with RHS subset of LHS
type TestExactSubsetRHS = Exact<{ a: 1; b: 2; c: 3 }, { a: 1; b: 2 }>;
export const testExactSubsetRHS: TestExactSubsetRHS = false;

// Test: Exact with LHS and RHS having different keys
type TestExactDifferentKeys = Exact<{ a: 1; b: 2 }, { c: 1; d: 2 }>;
export const testExactDifferentKeys: TestExactDifferentKeys = false;

// Test: Exact with LHS and RHS having different value types
type TestExactDifferentValueTypes = Exact<{ a: 1 }, { a: '1' }>;
export const testExactDifferentValueTypes: TestExactDifferentValueTypes = false;

// Suite Exclude Utility Type
// Test: Exclude LHS has more keys than RHS
type TestExcludeLHSMoreKeys = Exclude<'A' | 'B', 'A'>;
export const testExcludeLHSMoreKeys: TestExcludeLHSMoreKeys = 'B';

// Test: Exclude LHS has no intersection with RHS
type TestExcludeNoIntersection = Exclude<'A', 'B'>;
export const testExcludeNoIntersection: TestExcludeNoIntersection = 'A';

// Test: Exclude RHS has more keys than LHS (never)
type TestExcludeNever = Exclude<'A', 'A' | 'B'>;
export let testExclude2: TestExcludeNever;

// Suite PartialWithArrayValues Helper Type
// Test allows casting to arrays of field
export interface DocType extends PartialWithArrayValues<{ a: string; b: number; c: boolean }> {
  a?: string[];
  b: number[];
  c: boolean;
}

// Test allows casting to arrays of nested fields
export interface DocTypeObject extends PartialWithArrayValues<{ a: { b: string; c: number } }> {
  a?: { b: string; c: number }[];
}

// Test allows casting to arrays of nested fields with optional values
export interface DocTypeObjectOptional
  extends PartialWithArrayValues<{ a: { b: string; c: number } }> {
  a?: { b: string; c?: number }[];
}

// Test allows casting to arrays of nested fields
export const a: DocTypeObjectOptional['a'] = [
  {
    b: 'test',
  },
];

// Test allows casting to objects with nested fields with optional values
export const b: DocTypeObjectOptional = {
  a: {
    // @ts-expect-error - a is casted to an array of objects, not an object
    b: 'test',
    c: 1,
  },
};

export interface DocType extends PartialWithArrayValues<{ a: string; b: number; c: boolean }> {
  // @ts-expect-error - a is a string | string[], not a number[]
  a?: number[];
}
