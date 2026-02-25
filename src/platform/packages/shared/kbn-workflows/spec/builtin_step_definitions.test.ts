/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { builtInStepDefinitions, getBuiltInStepDefinition } from './builtin_step_definitions';

const EXPECTED_BUILT_IN_TYPES = ['if', 'foreach', 'wait', 'data.set'];

describe('builtInStepDefinitions', () => {
  it('covers all expected built-in step types', () => {
    const types = builtInStepDefinitions.map((d) => d.type);
    expect(types.sort()).toEqual([...EXPECTED_BUILT_IN_TYPES].sort());
  });

  it.each(EXPECTED_BUILT_IN_TYPES)('"%s" has a non-empty description', (type) => {
    const def = builtInStepDefinitions.find((d) => d.type === type);
    expect(def).toBeDefined();
    expect(def!.description.length).toBeGreaterThan(0);
  });

  it.each(EXPECTED_BUILT_IN_TYPES)('"%s" has a valid category', (type) => {
    const def = builtInStepDefinitions.find((d) => d.type === type);
    expect(def).toBeDefined();
    expect(['elasticsearch', 'external', 'ai', 'kibana', 'data', 'flowControl']).toContain(
      def!.category
    );
  });

  it.each(EXPECTED_BUILT_IN_TYPES)('"%s" has a Zod schema', (type) => {
    const def = builtInStepDefinitions.find((d) => d.type === type);
    expect(def).toBeDefined();
    expect(def!.schema).toBeDefined();
    expect(typeof def!.schema.parse).toBe('function');
  });

  it.each(EXPECTED_BUILT_IN_TYPES)('"%s" has a non-empty example', (type) => {
    const def = builtInStepDefinitions.find((d) => d.type === type);
    expect(def).toBeDefined();
    expect(def!.example.length).toBeGreaterThan(0);
  });
});

describe('getBuiltInStepDefinition', () => {
  it('returns the definition for a known type', () => {
    const def = getBuiltInStepDefinition('if');
    expect(def).toBeDefined();
    expect(def!.type).toBe('if');
  });

  it('returns the correct definition for data.set', () => {
    const def = getBuiltInStepDefinition('data.set');
    expect(def).toBeDefined();
    expect(def!.type).toBe('data.set');
    expect(def!.category).toBe('data');
  });

  it('returns undefined for an unknown type', () => {
    expect(getBuiltInStepDefinition('nonexistent')).toBeUndefined();
  });
});
