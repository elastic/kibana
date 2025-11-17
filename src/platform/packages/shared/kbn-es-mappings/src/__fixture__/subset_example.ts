/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EnsureSubsetOf,
  KeywordMapping,
  TextMapping,
  BooleanMapping,
  DateMapping,
  IntegerMapping,
} from '../types';

interface FullEsDocumentFields {
  name: string;
  age: number;
  email: string;
  isActive: boolean;
  createdAt: string | number;
}

// Test: Definition has exactly all the fields in the full document fields
interface FullDefinition {
  properties: {
    name: TextMapping;
    age: IntegerMapping;
    email: KeywordMapping;
    isActive: BooleanMapping;
    createdAt: DateMapping;
  };
}

type DefinitionIsExact = EnsureSubsetOf<
  FullDefinition,
  FullEsDocumentFields,
  'Should succeed. Exact match between definition and document fields'
>;

export const testDefinitionIsExact: DefinitionIsExact =
  'Should succeed. Exact match between definition and document fields';

// Test: Definition has a subset of the fields in the full document fields
interface SubsetDefinition {
  properties: {
    name: TextMapping;
    age: IntegerMapping;
    email: KeywordMapping;
  };
}

type DefinitionIsSubset = EnsureSubsetOf<
  SubsetDefinition,
  FullEsDocumentFields,
  'Should succeed. Definition is a subset of the full document fields'
>;

export const testDefinitionIsSubset: DefinitionIsSubset =
  'Should succeed. Definition is a subset of the full document fields';

// Test: Definition has extra fields not in the full document fields
interface ExcessDefinition {
  properties: {
    name: TextMapping;
    age: IntegerMapping;
    email: KeywordMapping;
    isActive: BooleanMapping;
    createdAt: DateMapping;
    definedButNotInDocOne: KeywordMapping;
    definedButNotInDocTwo: KeywordMapping;
  };
}

type DefinitionHasExtraFields = EnsureSubsetOf<
  ExcessDefinition,
  FullEsDocumentFields,
  'Should fail. Definition has extra fields not in the full document fields'
>;

export const testDefinitionHasExtraFields: DefinitionHasExtraFields[] = [
  // @ts-expect-error - createdAt is in the definition, this checks that an error is not thrown for defined keys
  Object.assign(new Error(), 'The following keys are missing from the document fields: createdAt'),
  // @ts-expect-error - Unknown Key is not in the definition, this checks that an error is thrown for the unknown key
  Object.assign(
    new Error(),
    'The following keys are missing from the document fields: Unknown Key'
  ),

  // This checks that an error is thrown for the missing keys
  Object.assign(
    new Error(),
    'The following keys are missing from the document fields: definedButNotInDocOne'
  ),
  Object.assign(
    new Error(),
    'The following keys are missing from the document fields: definedButNotInDocTwo'
  ),
];

// Test: Definition has extra fields and missing fields compared to full document fields
interface ExcessAndMissingDefinition {
  properties: {
    name: TextMapping;
    age: IntegerMapping;
    definedButNotInDocOne: KeywordMapping;
    definedButNotInDocTwo: KeywordMapping;
  };
}

type DefinitionHasExcessAndMissingFields = EnsureSubsetOf<
  ExcessAndMissingDefinition,
  FullEsDocumentFields,
  'Should fail. Definition has extra fields not in the full document fields'
>;

export const testDefinitionHasExcessAndMissingFields: DefinitionHasExcessAndMissingFields[] = [
  // @ts-expect-error - createdAt is in the definition, this checks that an error is not thrown for defined keys
  Object.assign(new Error(), 'The following keys are missing from the document fields: name'),
  // @ts-expect-error - createdAt is in the definition, this checks that an error is not thrown for defined keys
  Object.assign(new Error(), 'The following keys are missing from the document fields: createdAt'),
  // @ts-expect-error - Unknown Key is not in the definition, this checks that an error is thrown for the unknown key
  Object.assign(
    new Error(),
    'The following keys are missing from the document fields: Unknown Key'
  ),

  // This checks that an error is thrown for the missing keys
  Object.assign(
    new Error(),
    'The following keys are missing from the document fields: definedButNotInDocOne'
  ),
  Object.assign(
    new Error(),
    'The following keys are missing from the document fields: definedButNotInDocTwo'
  ),
];

// Test: Definition has incompatible fields with full document fields
interface IncompatibleDefinition {
  properties: {
    name: TextMapping;
    age: IntegerMapping;
    email: KeywordMapping;
    isActive: BooleanMapping;
    createdAt: BooleanMapping; // this is Date field in full document but is declared as BooleanMapping
  };
}

type DefinitionHasIncompatibleFields = EnsureSubsetOf<
  IncompatibleDefinition,
  // @ts-expect-error - createdAt is in the definition, this checks that an error is not thrown for defined keys
  FullEsDocumentFields,
  'Should fail. Definition has incompatible fields with full document fields'
>;

export let testDefinitionHasIncompatibleFields: DefinitionHasIncompatibleFields;
