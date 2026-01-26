/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { collectAllStepNames } from './collect_all_step_names';

describe('collectAllStepNames', () => {
  it('should return empty array for empty document', () => {
    const yamlDocument = parseDocument('');
    const result = collectAllStepNames(yamlDocument);
    expect(result).toEqual([]);
  });

  it('should return empty array for document without contents', () => {
    const yamlDocument = parseDocument('');
    const result = collectAllStepNames(yamlDocument);
    expect(result).toEqual([]);
  });

  it('should collect step names from simple workflow', () => {
    const yaml = `name: Test Workflow
steps:
  - name: First Step
    action: test
  - name: Second Step
    action: test2`;
    const yamlDocument = parseDocument(yaml);
    const result = collectAllStepNames(yamlDocument);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('First Step');
    expect(result[1].name).toBe('Second Step');
    expect(result[0].startLineNumber).toBe(3);
    expect(result[1].startLineNumber).toBe(5);
  });

  it('should collect step names from nested steps in conditional blocks', () => {
    const yaml = `name: Test Workflow
steps:
  - name: Main Step
    if:
      eq:
        - "{{var1}}"
        - "value"
    then:
      - name: Then Step
        action: test
    else:
      - name: Else Step
        action: test2`;
    const yamlDocument = parseDocument(yaml);
    const result = collectAllStepNames(yamlDocument);

    // Note: collectAllStepNames only collects direct step names under 'steps' or 'else',
    // not those under 'then' blocks
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(['Main Step', 'Else Step']);
  });

  it('should handle duplicate step names', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: Duplicate Name
    action: test
  - name: Duplicate Name
    action: test2
  - name: Unique Name
    action: test3
`;
    const yamlDocument = parseDocument(yaml);
    const result = collectAllStepNames(yamlDocument);

    expect(result).toHaveLength(3);
    expect(result.filter((r) => r.name === 'Duplicate Name')).toHaveLength(2);
    expect(result.filter((r) => r.name === 'Unique Name')).toHaveLength(1);
  });

  it('should ignore non-step name properties', () => {
    const yaml = `
name: Test Workflow
description: A test workflow
steps:
  - name: Step Name
    action: test
    params:
      name: This is not a step name
      value: 123
`;
    const yamlDocument = parseDocument(yaml);
    const result = collectAllStepNames(yamlDocument);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Step Name');
  });

  it('should handle empty step names', () => {
    const yaml = `name: Test Workflow
steps:
  - name: ""
    action: test
  - name: Valid Name
    action: test2`;
    const yamlDocument = parseDocument(yaml);
    const result = collectAllStepNames(yamlDocument);

    // Empty step names are not collected since they have no value
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid Name');
  });

  it('should correctly calculate line and column positions', () => {
    const yaml = `name: Test Workflow
steps:
  - name: First Step
    action: test
  - name: Second Step with longer name
    action: test2`;
    const yamlDocument = parseDocument(yaml);
    const result = collectAllStepNames(yamlDocument);

    expect(result).toHaveLength(2);

    // First step name
    expect(result[0]).toMatchObject({
      name: 'First Step',
      startLineNumber: 3,
      startColumn: 11,
      endLineNumber: 3,
      endColumn: 21,
    });

    // Second step name
    expect(result[1]).toMatchObject({
      name: 'Second Step with longer name',
      startLineNumber: 5,
      startColumn: 11,
      endLineNumber: 5,
      endColumn: 39,
    });
  });

  it('should handle steps in foreach loops', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: Foreach Step
    foreach: "{{items}}"
    do:
      - name: Inner Step
        action: test
`;
    const yamlDocument = parseDocument(yaml);
    const result = collectAllStepNames(yamlDocument);

    // Should only collect direct step names, not those inside 'do' blocks
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Foreach Step');
  });
});
