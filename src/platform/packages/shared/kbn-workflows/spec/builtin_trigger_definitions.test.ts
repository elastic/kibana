/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  builtInTriggerDefinitions,
  getBuiltInTriggerDefinition,
} from './builtin_trigger_definitions';

const EXPECTED_TRIGGER_IDS = ['manual', 'scheduled', 'alert'];

describe('builtInTriggerDefinitions', () => {
  it('covers all expected trigger types', () => {
    const ids = builtInTriggerDefinitions.map((d) => d.id);
    expect(ids.sort()).toEqual([...EXPECTED_TRIGGER_IDS].sort());
  });

  it.each(EXPECTED_TRIGGER_IDS)('"%s" has a non-empty description', (id) => {
    const def = builtInTriggerDefinitions.find((d) => d.id === id);
    expect(def).toBeDefined();
    expect(def!.description.length).toBeGreaterThan(0);
  });

  it.each(EXPECTED_TRIGGER_IDS)('"%s" has a non-empty label', (id) => {
    const def = builtInTriggerDefinitions.find((d) => d.id === id);
    expect(def).toBeDefined();
    expect(def!.label.length).toBeGreaterThan(0);
  });

  it.each(EXPECTED_TRIGGER_IDS)('"%s" has a schema with parse()', (id) => {
    const def = builtInTriggerDefinitions.find((d) => d.id === id);
    expect(def).toBeDefined();
    expect(typeof def!.schema.parse).toBe('function');
  });

  it.each(EXPECTED_TRIGGER_IDS)('"%s" has non-empty documentation examples', (id) => {
    const def = builtInTriggerDefinitions.find((d) => d.id === id);
    expect(def).toBeDefined();
    expect(def!.documentation.examples.length).toBeGreaterThan(0);
    expect(def!.documentation.examples[0].length).toBeGreaterThan(0);
  });
});

describe('getBuiltInTriggerDefinition', () => {
  it('returns the definition for a known id', () => {
    const def = getBuiltInTriggerDefinition('scheduled');
    expect(def).toBeDefined();
    expect(def!.id).toBe('scheduled');
  });

  it('returns the correct definition for alert', () => {
    const def = getBuiltInTriggerDefinition('alert');
    expect(def).toBeDefined();
    expect(def!.id).toBe('alert');
  });

  it('returns undefined for an unknown id', () => {
    expect(getBuiltInTriggerDefinition('nonexistent')).toBeUndefined();
  });
});
