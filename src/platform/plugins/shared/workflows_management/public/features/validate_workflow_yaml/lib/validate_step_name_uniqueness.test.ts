/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { validateStepNameUniqueness } from './validate_step_name_uniqueness';

describe('validateStepNameUniqueness', () => {
  it('should return empty array when all step names are unique', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: First Step
    action: test
  - name: Second Step
    action: test2
  - name: Third Step
    action: test3
`;
    const yamlDocument = parseDocument(yaml);
    const result = validateStepNameUniqueness(yamlDocument);

    expect(result).toEqual([]);
  });

  it('should detect duplicate step names', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: Duplicate Step
    action: test
  - name: Unique Step
    action: test2
  - name: Duplicate Step
    action: test3
`;
    const yamlDocument = parseDocument(yaml);
    const result = validateStepNameUniqueness(yamlDocument);

    expect(result).toHaveLength(2); // One error for each occurrence of duplicate
    expect(result.every((r) => r?.message?.includes('Duplicate Step'))).toBe(true);
    expect(result.every((r) => r?.message?.includes('Found 2 steps with this name'))).toBe(true);
    expect(result.every((r) => r.severity === 'error')).toBe(true);
    expect(result.every((r) => r.owner === 'step-name-validation')).toBe(true);
  });

  it('should handle multiple different duplicates', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: Duplicate A
    action: test
  - name: Duplicate B
    action: test2
  - name: Duplicate A
    action: test3
  - name: Duplicate B
    action: test4
  - name: Duplicate B
    action: test5
`;
    const yamlDocument = parseDocument(yaml);
    const result = validateStepNameUniqueness(yamlDocument);

    expect(result).toHaveLength(5); // 2 for "Duplicate A", 3 for "Duplicate B"

    const duplicateAErrors = result.filter((r) => r?.message?.includes('Duplicate A'));
    expect(duplicateAErrors).toHaveLength(2);
    expect(duplicateAErrors.every((r) => r?.message?.includes('Found 2 steps'))).toBe(true);

    const duplicateBErrors = result.filter((r) => r?.message?.includes('Duplicate B'));
    expect(duplicateBErrors).toHaveLength(3);
    expect(duplicateBErrors.every((r) => r?.message?.includes('Found 3 steps'))).toBe(true);
  });

  it('should include correct line and column information', () => {
    const yaml = `name: Test Workflow
steps:
  - name: Duplicate Name
    action: test
  - name: Duplicate Name
    action: test2`;

    const yamlDocument = parseDocument(yaml);
    const result = validateStepNameUniqueness(yamlDocument);

    expect(result).toHaveLength(2);

    // First occurrence
    expect(result[0]).toMatchObject({
      startLineNumber: 3,
      startColumn: 11,
      endLineNumber: 3,
      endColumn: 25,
      message: 'Step name "Duplicate Name" is not unique. Found 2 steps with this name.',
    });

    // Second occurrence
    expect(result[1]).toMatchObject({
      startLineNumber: 5,
      startColumn: 11,
      endLineNumber: 5,
      endColumn: 25,
      message: 'Step name "Duplicate Name" is not unique. Found 2 steps with this name.',
    });
  });

  it('should handle empty step names', () => {
    const yaml = `name: Test Workflow
steps:
  - name: ""
    action: test
  - name: ""
    action: test2
  - name: "Valid Name"
    action: test3`;
    const yamlDocument = parseDocument(yaml);
    const result = validateStepNameUniqueness(yamlDocument);

    // Empty strings are not collected by collectAllStepNames (no value check)
    expect(result).toHaveLength(0);
  });

  it('should handle nested steps in conditional blocks', () => {
    const yaml = `name: Test Workflow
steps:
  - name: Main Step
    if:
      eq:
        - "{{var}}"
        - "value"
    then:
      - name: Duplicate Name
        action: test
    else:
      - name: Duplicate Name
        action: test2`;
    const yamlDocument = parseDocument(yaml);
    const result = validateStepNameUniqueness(yamlDocument);

    // collectAllStepNames only collects names under 'steps' or 'else', not 'then'
    expect(result).toHaveLength(0);
  });

  it('should generate unique IDs for errors', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: Duplicate
    action: test
  - name: Duplicate
    action: test2
`;
    const yamlDocument = parseDocument(yaml);
    const result = validateStepNameUniqueness(yamlDocument);

    expect(result).toHaveLength(2);
    expect(result[0].id).not.toBe(result[1].id);
    expect(result[0].id).toContain('Duplicate');
    expect(result[1].id).toContain('Duplicate');
  });

  it('should handle workflow with no steps', () => {
    const yaml = `
name: Test Workflow
description: A workflow without steps
`;
    const yamlDocument = parseDocument(yaml);
    const result = validateStepNameUniqueness(yamlDocument);

    expect(result).toEqual([]);
  });

  it('should handle malformed YAML gracefully', () => {
    const yamlDocument = parseDocument('');
    const result = validateStepNameUniqueness(yamlDocument);

    expect(result).toEqual([]);
  });
});
