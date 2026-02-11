/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GetFieldsOf, IntegerMapping, MappingsDefinition, TextMapping } from '../types';
import * as mappings from '../mappings';

// Test create a MappingsDefinition and verify its type
const userMapping = {
  properties: {
    name: mappings.text(),
    age: mappings.integer(),
    email: mappings.keyword(),
    isActive: mappings.boolean(),
    createdAt: mappings.date(),
  },
} satisfies MappingsDefinition;

// Test DocumentOf should infer the correct document type from the mapping
type UserDocument = GetFieldsOf<typeof userMapping>;

// Verify successful cases - these should compile without errors
export const validUser: UserDocument = {
  name: 'John Doe',
  age: 30,
  email: 'john@example.com',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
};

// Partial document should also work
export const partialUser: UserDocument = {
  name: 'Jane Doe',
  age: 25,
};

// Test type errors - these should cause TypeScript errors
// ERROR: wrong type for name (should be string)
export const invalidUser1: UserDocument = {
  // @ts-expect-error - name must be a string
  name: 123,
  age: 30,
};

// ERROR: wrong type for age (should be number)
export const invalidUser2: UserDocument = {
  name: 'John',
  // @ts-expect-error - age must be a number
  age: 'thirty',
};

// ERROR: wrong type for isActive (should be boolean)
export const invalidUser3: UserDocument = {
  name: 'John',
  // @ts-expect-error - isActive must be a boolean
  isActive: 'yes',
};

// Test that MappingsDefinition enforces correct property types
// ERROR: invalid mapping type
export const invalidMapping: MappingsDefinition = {
  properties: {
    // @ts-expect-error - not_mapped is not defined in the mapping
    not_mapped: { type: 'invalid_type' },
  },
};

// Test objects
const objectMapping = {
  properties: {
    nestedObj: mappings.object({
      properties: {
        name: mappings.text(),
        age: mappings.integer(),
      },
    }),
  },
} satisfies MappingsDefinition;

export const nameIsTextMapping: TextMapping = objectMapping.properties.nestedObj.properties.name;
export const ageIsIntegerMapping: IntegerMapping =
  objectMapping.properties.nestedObj.properties.age;

// @ts-expect-error - Unknown object nested mapping properties are not allowed
export const unknownMappingErrors = objectMapping.properties.nestedObj.properties.unknown;
