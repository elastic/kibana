/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractWorkflowPreview } from './workflow_preview';

describe('extractWorkflowPreview', () => {
  it('should extract all metadata from a valid workflow', () => {
    const yaml = `
name: My Workflow
description: A test workflow
triggers:
  - type: manual
  - type: scheduled
    with:
      every: 5m
inputs:
  - name: message
    type: string
  - name: count
    type: number
steps:
  - name: step1
    type: console
    with:
      message: "{{ inputs.message }}"
  - name: step2
    type: console
    with:
      message: done
`;
    const result = extractWorkflowPreview('w-1', yaml);

    expect(result).toEqual({
      id: 'w-1',
      name: 'My Workflow',
      description: 'A test workflow',
      triggers: [{ type: 'manual' }, { type: 'scheduled' }],
      inputCount: 2,
      stepCount: 2,
      valid: true,
    });
  });

  it('should handle JSON Schema inputs format', () => {
    const yaml = `
name: JSON Schema Inputs
triggers:
  - type: manual
inputs:
  type: object
  properties:
    host:
      type: string
    port:
      type: number
    debug:
      type: boolean
steps:
  - name: step1
    type: console
`;
    const result = extractWorkflowPreview('w-2', yaml);

    expect(result.inputCount).toBe(3);
    expect(result.valid).toBe(true);
  });

  it('should return null name/description when fields are missing', () => {
    const yaml = `
triggers:
  - type: alert
steps:
  - name: step1
    type: console
`;
    const result = extractWorkflowPreview('w-3', yaml);

    expect(result.name).toBeNull();
    expect(result.description).toBeNull();
    expect(result.triggers).toEqual([{ type: 'alert' }]);
    expect(result.stepCount).toBe(1);
    expect(result.valid).toBe(true);
  });

  it('should return valid: false when YAML parses to a scalar (not an object)', () => {
    const yaml = 'just a string';
    const result = extractWorkflowPreview('bad', yaml);

    expect(result).toEqual({
      id: 'bad',
      name: null,
      description: null,
      triggers: [],
      inputCount: 0,
      stepCount: 0,
      valid: false,
    });
  });

  it('should return valid: true with null metadata for a YAML object missing workflow fields', () => {
    const yaml = 'foo: bar\nbaz: 123';
    const result = extractWorkflowPreview('no-wf-fields', yaml);

    expect(result.id).toBe('no-wf-fields');
    expect(result.name).toBeNull();
    expect(result.description).toBeNull();
    expect(result.triggers).toEqual([]);
    expect(result.inputCount).toBe(0);
    expect(result.stepCount).toBe(0);
    expect(result.valid).toBe(true);
  });

  it('should return valid: false for empty YAML', () => {
    const result = extractWorkflowPreview('empty', '');

    expect(result.valid).toBe(false);
    expect(result.name).toBeNull();
  });

  it('should return empty triggers when triggers field is missing', () => {
    const yaml = `
name: No Triggers
steps:
  - name: step1
    type: console
`;
    const result = extractWorkflowPreview('w-no-triggers', yaml);

    expect(result.triggers).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('should return 0 inputCount when inputs are not present', () => {
    const yaml = `
name: No Inputs
triggers:
  - type: manual
steps:
  - name: step1
    type: console
`;
    const result = extractWorkflowPreview('w-no-inputs', yaml);

    expect(result.inputCount).toBe(0);
  });

  it('should ignore non-object entries in triggers array', () => {
    const yaml = `
name: Bad Triggers
triggers:
  - type: manual
  - "not an object"
  - type: scheduled
steps:
  - name: step1
    type: console
`;
    const result = extractWorkflowPreview('w-bad-triggers', yaml);

    expect(result.triggers).toEqual([{ type: 'manual' }, { type: 'scheduled' }]);
  });

  it('should handle triggers with non-string type gracefully', () => {
    const yaml = `
name: Weird Triggers
triggers:
  - type: 123
  - type: manual
steps:
  - name: step1
    type: console
`;
    const result = extractWorkflowPreview('w-weird', yaml);

    expect(result.triggers).toEqual([{ type: 'manual' }]);
  });

  it('should handle all built-in trigger types', () => {
    const yaml = `
name: All Triggers
triggers:
  - type: manual
  - type: scheduled
    with:
      every: 5m
  - type: alert
steps:
  - name: step1
    type: console
`;
    const result = extractWorkflowPreview('w-all-triggers', yaml);

    expect(result.triggers).toEqual([{ type: 'manual' }, { type: 'scheduled' }, { type: 'alert' }]);
  });
});
