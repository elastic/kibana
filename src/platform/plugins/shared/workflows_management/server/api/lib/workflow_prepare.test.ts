/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';

import type { WorkflowProperties } from '../../storage/workflow_storage';
import {
  applyFieldUpdates,
  getTriggerTypesFromDefinition,
  workflowYamlDeclaresTopLevelEnabled,
} from './workflow_prepare';

describe('getTriggerTypesFromDefinition', () => {
  it('returns empty array for null definition', () => {
    expect(getTriggerTypesFromDefinition(null)).toEqual([]);
  });

  it('returns empty array for undefined definition', () => {
    expect(getTriggerTypesFromDefinition(undefined)).toEqual([]);
  });

  it('returns empty array for definition with no triggers', () => {
    expect(getTriggerTypesFromDefinition({ triggers: [] } as unknown as WorkflowYaml)).toEqual([]);
  });

  it('extracts trigger type ids from definition', () => {
    const definition = {
      triggers: [{ type: 'manual' }, { type: 'scheduled' }, { type: 'cases.updated' }],
    } as unknown as WorkflowYaml;
    expect(getTriggerTypesFromDefinition(definition)).toEqual([
      'manual',
      'scheduled',
      'cases.updated',
    ]);
  });

  it('filters out null and non-string trigger types', () => {
    const definition = {
      triggers: [{ type: 'manual' }, { type: null }, { type: 123 }, {}],
    } as unknown as WorkflowYaml;
    expect(getTriggerTypesFromDefinition(definition)).toEqual(['manual']);
  });
});

describe('workflowYamlDeclaresTopLevelEnabled', () => {
  it('returns true when YAML contains enabled: true', () => {
    expect(workflowYamlDeclaresTopLevelEnabled('name: Test\nenabled: true')).toBe(true);
  });

  it('returns true when YAML contains enabled: false', () => {
    expect(workflowYamlDeclaresTopLevelEnabled('name: Test\nenabled: false')).toBe(true);
  });

  it('returns false when YAML does not contain enabled', () => {
    expect(workflowYamlDeclaresTopLevelEnabled('name: Test\ndescription: A workflow')).toBe(false);
  });

  it('returns false for malformed YAML', () => {
    expect(workflowYamlDeclaresTopLevelEnabled('{{{')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(workflowYamlDeclaresTopLevelEnabled('')).toBe(false);
  });
});

describe('applyFieldUpdates', () => {
  const baseSource: WorkflowProperties = {
    name: 'Original',
    description: 'Original description',
    enabled: true,
    tags: ['original'],
    triggerTypes: ['manual'],
    yaml: 'name: Original\nenabled: true\ndescription: Original description',
    definition: null,
    createdBy: 'user1',
    lastUpdatedBy: 'user1',
    spaceId: 'default',
    valid: true,
    deleted_at: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };

  it('returns empty patch when no fields are provided', () => {
    const result = applyFieldUpdates({}, baseSource);
    expect(result).toEqual({});
  });

  it('patches name and synchronizes YAML', () => {
    const result = applyFieldUpdates({ name: 'New Name' }, baseSource);
    expect(result.name).toBe('New Name');
    expect(result.yaml).toBeDefined();
  });

  it('patches description', () => {
    const result = applyFieldUpdates({ description: 'New desc' }, baseSource);
    expect(result.description).toBe('New desc');
  });

  it('patches tags', () => {
    const result = applyFieldUpdates({ tags: ['a', 'b'] }, baseSource);
    expect(result.tags).toEqual(['a', 'b']);
  });

  it('allows disabling a workflow', () => {
    const result = applyFieldUpdates({ enabled: false }, baseSource);
    expect(result.enabled).toBe(false);
  });

  it('allows enabling a workflow only if it has a definition', () => {
    const sourceWithDefinition = { ...baseSource, enabled: false, definition: {} as WorkflowYaml };
    const result = applyFieldUpdates({ enabled: true }, sourceWithDefinition);
    expect(result.enabled).toBe(true);
  });

  it('does not enable a workflow without a definition', () => {
    const sourceWithoutDef = { ...baseSource, enabled: false, definition: null };
    const result = applyFieldUpdates({ enabled: true }, sourceWithoutDef);
    expect(result.enabled).toBeUndefined();
  });

  it('does not update YAML when source has no yaml', () => {
    const sourceNoYaml = { ...baseSource, yaml: '' };
    const result = applyFieldUpdates({ name: 'New' }, sourceNoYaml);
    expect(result.name).toBe('New');
    expect(result.yaml).toBeUndefined();
  });
});
