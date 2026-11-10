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
  ObjectMapping,
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

// Test: Should succeed. Exact match between definition and document fields
type DefinitionIsExact = EnsureSubsetOf<FullDefinition, FullEsDocumentFields>;

export const testDefinitionIsExact: DefinitionIsExact = true;

// Test: Definition has a subset of the fields in the full document fields
interface SubsetDefinition {
  properties: {
    name: TextMapping;
    age: IntegerMapping;
    email: KeywordMapping;
  };
}

// Test: Should succeed. Definition is a subset of the full document fields
type DefinitionIsSubset = EnsureSubsetOf<SubsetDefinition, FullEsDocumentFields>;

export const testDefinitionIsSubset: DefinitionIsSubset = true;

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

// Test: Should fail. Definition has extra fields not in the full document fields
type DefinitionHasExtraFields = EnsureSubsetOf<ExcessDefinition, FullEsDocumentFields>;

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

// Test: Should fail. Definition has extra fields and missing fields compared to full document fields
type DefinitionHasExcessAndMissingFields = EnsureSubsetOf<
  ExcessAndMissingDefinition,
  FullEsDocumentFields
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
  FullEsDocumentFields
>;

// type never because the definition has incompatible fields with the full document fields
export let testDefinitionHasIncompatibleFields: DefinitionHasIncompatibleFields;

// -- Alias-only parent object test ------------------------------------------
// An object field whose every child is an alias exists only at query time.
// EnsureSubsetOf must NOT require it in source documents (the `episode` field
// below must be invisible because it has no writable _source descendants).

interface AlertDocumentFields {
  alert: { id: string };
}

interface AliasOnlyParentDefinition {
  properties: {
    alert: ObjectMapping<{ id: KeywordMapping }>;
    episode: ObjectMapping<{
      id: { type: 'alias'; path: 'alert.id' };
    }>;
  };
}

// Should succeed: alert.id is the canonical field; episode only has alias
// children and must not appear in the required source-document keys.
type AliasParentIsIgnored = EnsureSubsetOf<AliasOnlyParentDefinition, AlertDocumentFields>;
export const testAliasParentIsIgnored: AliasParentIsIgnored = true;

// Test: the check is recursive, so `episode` is ignored when its only child is
// an object whose children are all aliases.
interface NestedAliasOnlyParentDefinition {
  properties: {
    alert: ObjectMapping<{ id: KeywordMapping }>;
    episode: ObjectMapping<{
      meta: ObjectMapping<{
        id: { type: 'alias'; path: 'alert.id' };
      }>;
    }>;
  };
}

// Should succeed: neither episode nor episode.meta appears in _source.
type NestedAliasParentIsIgnored = EnsureSubsetOf<
  NestedAliasOnlyParentDefinition,
  AlertDocumentFields
>;
export const testNestedAliasParentIsIgnored: NestedAliasParentIsIgnored = true;

// Test: an alias-only child object is ignored while its writable siblings are kept.
interface MixedObjectDefinition {
  properties: {
    alert: ObjectMapping<{
      id: KeywordMapping;
      legacy: ObjectMapping<{
        id: { type: 'alias'; path: 'alert.id' };
      }>;
    }>;
  };
}

// Should succeed: alert.id is kept and alert.legacy is ignored.
type MixedObjectKeepsWritableFields = EnsureSubsetOf<MixedObjectDefinition, AlertDocumentFields>;
export const testMixedObjectKeepsWritableFields: MixedObjectKeepsWritableFields = true;

// Test: an object without declared properties can still hold _source data, so it is
// not treated as alias-only.
interface EmptyObjectDefinition {
  properties: {
    alert: ObjectMapping<{ id: KeywordMapping }>;
    payload: ObjectMapping<{}>;
  };
}

// Should fail: payload is defined but missing from the document fields.
type EmptyObjectIsRequired = EnsureSubsetOf<EmptyObjectDefinition, AlertDocumentFields>;
export const testEmptyObjectIsRequired: EmptyObjectIsRequired = Object.assign(
  new Error(),
  'The following keys are missing from the document fields: payload'
);
