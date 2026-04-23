/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';

import {
  applyFieldUpdates,
  applyYamlUpdate,
  getTriggerTypesFromDefinition,
  workflowYamlDeclaresTopLevelEnabled,
} from './workflow_prepare';
import type { WorkflowProperties } from '../../storage/workflow_storage';

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
    const { patch, validationErrors } = applyFieldUpdates({}, baseSource);
    expect(patch).toEqual({});
    expect(validationErrors).toEqual([]);
  });

  it('patches name and synchronizes YAML', () => {
    const { patch } = applyFieldUpdates({ name: 'New Name' }, baseSource);
    expect(patch.name).toBe('New Name');
    expect(patch.yaml).toBeDefined();
  });

  it('patches description', () => {
    const { patch } = applyFieldUpdates({ description: 'New desc' }, baseSource);
    expect(patch.description).toBe('New desc');
  });

  it('patches tags', () => {
    const { patch } = applyFieldUpdates({ tags: ['a', 'b'] }, baseSource);
    expect(patch.tags).toEqual(['a', 'b']);
  });

  it('allows disabling a workflow', () => {
    const { patch } = applyFieldUpdates({ enabled: false }, baseSource);
    expect(patch.enabled).toBe(false);
  });

  it('allows enabling a workflow only if it has a definition', () => {
    const sourceWithDefinition = { ...baseSource, enabled: false, definition: {} as WorkflowYaml };
    const { patch, validationErrors } = applyFieldUpdates({ enabled: true }, sourceWithDefinition);
    expect(patch.enabled).toBe(true);
    expect(validationErrors).toEqual([]);
  });

  it('surfaces a validation error and does not rewrite YAML when enabling a workflow without a definition', () => {
    const sourceWithoutDef = { ...baseSource, enabled: false, definition: null };
    const { patch, validationErrors } = applyFieldUpdates({ enabled: true }, sourceWithoutDef);
    expect(patch.enabled).toBeUndefined();
    expect(patch.yaml).toBeUndefined();
    expect(validationErrors).toEqual([
      'Cannot enable a workflow without a valid definition. Provide valid YAML first.',
    ]);
  });

  it('does not update YAML when source has no yaml', () => {
    const sourceNoYaml = { ...baseSource, yaml: '' };
    const { patch } = applyFieldUpdates({ name: 'New' }, sourceNoYaml);
    expect(patch.name).toBe('New');
    expect(patch.yaml).toBeUndefined();
  });
});

describe('applyYamlUpdate', () => {
  const failingSchema = {
    parse: () => {
      throw new Error('invalid');
    },
    safeParse: () => ({ success: false, error: { issues: [] } }),
  } as any;

  it('coerces definition to null (not undefined) on the invalid branch so full-replace index does not drop the field', () => {
    const result = applyYamlUpdate({
      workflowYaml: 'not: valid: yaml:',
      zodSchema: failingSchema,
      triggerDefinitions: [],
    });
    expect(result.updatedDataPatch).toHaveProperty('definition', null);
    // Guard the specific regression: `undefined` would be silently dropped by JSON.stringify.
    expect(result.updatedDataPatch.definition).not.toBeUndefined();
    expect(result.updatedDataPatch.enabled).toBe(false);
    expect(result.updatedDataPatch.valid).toBe(false);
    expect(result.updatedDataPatch.triggerTypes).toEqual([]);
  });
});
