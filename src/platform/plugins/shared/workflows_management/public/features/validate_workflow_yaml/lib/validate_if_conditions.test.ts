/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { validateIfConditions } from './validate_if_conditions';

describe('validateIfConditions', () => {
  it('should return no errors for valid KQL condition using ":"', () => {
    const yaml = `name: test
steps:
  - name: check
    type: if
    condition: "inputs.count: 1"
    steps:
      - name: inner
        type: action`;
    const doc = parseDocument(yaml);
    const results = validateIfConditions(doc);

    expect(results).toEqual([]);
  });

  it('should return no errors for valid KQL with > operator', () => {
    const yaml = `name: test
steps:
  - name: check
    type: if
    condition: "inputs.count > 0"
    steps:
      - name: inner
        type: action`;
    const doc = parseDocument(yaml);
    const results = validateIfConditions(doc);

    expect(results).toEqual([]);
  });

  it('should return error for "==" operator with helpful message', () => {
    const yaml = `name: test
steps:
  - name: check
    type: if
    condition: "inputs.count == 1"
    steps:
      - name: inner
        type: action`;
    const doc = parseDocument(yaml);
    const results = validateIfConditions(doc);

    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('error');
    expect(results[0].owner).toBe('if-condition-validation');
    expect(results[0].message).toContain('==');
    expect(results[0].message).toContain(':');
  });

  it('should return error for "!=" operator with helpful message', () => {
    const yaml = `name: test
steps:
  - name: check
    type: if
    condition: "inputs.count != 1"
    steps:
      - name: inner
        type: action`;
    const doc = parseDocument(yaml);
    const results = validateIfConditions(doc);

    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('error');
    expect(results[0].owner).toBe('if-condition-validation');
    expect(results[0].message).toContain('!=');
    expect(results[0].message).toContain('NOT');
  });

  it('should skip conditions containing template syntax {{ }}', () => {
    const yaml = `name: test
steps:
  - name: check
    type: if
    condition: 'steps.httpStep.output.text: "{{foreach.item}}"'
    steps:
      - name: inner
        type: action`;
    const doc = parseDocument(yaml);
    const results = validateIfConditions(doc);

    expect(results).toEqual([]);
  });

  it('should skip ${{ expression }} syntax', () => {
    const yaml = `name: test
steps:
  - name: check
    type: if
    condition: "\${{ inputs.isActive }}"
    steps:
      - name: inner
        type: action`;
    const doc = parseDocument(yaml);
    const results = validateIfConditions(doc);

    expect(results).toEqual([]);
  });

  it('should validate step-level if conditions', () => {
    const yaml = `name: test
steps:
  - name: guarded
    type: action
    if: "inputs.count == 1"
    action: test`;
    const doc = parseDocument(yaml);
    const results = validateIfConditions(doc);

    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('error');
    expect(results[0].owner).toBe('if-condition-validation');
    expect(results[0].message).toContain('==');
  });

  it('should return no errors when there are no if conditions', () => {
    const yaml = `name: test
steps:
  - name: step1
    type: action
    action: test`;
    const doc = parseDocument(yaml);
    const results = validateIfConditions(doc);

    expect(results).toEqual([]);
  });

  it('should return empty array for empty YAML', () => {
    const doc = parseDocument('');
    expect(validateIfConditions(doc)).toEqual([]);
  });

  it('should include correct position information', () => {
    const yaml = `name: test
steps:
  - name: check
    type: if
    condition: "inputs.count == 1"
    steps:
      - name: inner
        type: action`;
    const doc = parseDocument(yaml);
    const results = validateIfConditions(doc);

    expect(results).toHaveLength(1);
    expect(results[0].startLineNumber).toBeGreaterThan(0);
    expect(results[0].startColumn).toBeGreaterThan(0);
    expect(results[0].endLineNumber).toBeGreaterThanOrEqual(results[0].startLineNumber);
  });

  it('should report multiple errors for multiple invalid conditions', () => {
    const yaml = `name: test
steps:
  - name: check1
    type: if
    condition: "inputs.a == 1"
    steps:
      - name: inner
        type: action
  - name: check2
    type: if
    condition: "inputs.b != 2"
    steps:
      - name: inner2
        type: action`;
    const doc = parseDocument(yaml);
    const results = validateIfConditions(doc);

    expect(results).toHaveLength(2);
    expect(results[0].message).toContain('==');
    expect(results[1].message).toContain('!=');
  });

  it('should skip template conditions but report non-template errors in same workflow', () => {
    const yaml = `name: test
steps:
  - name: templated
    type: if
    condition: 'field: "{{some.var}}"'
    steps:
      - name: inner
        type: action
  - name: invalid
    type: if
    condition: "inputs.a == 1"
    steps:
      - name: inner2
        type: action`;
    const doc = parseDocument(yaml);
    const results = validateIfConditions(doc);

    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('==');
  });

  it('should not flag == inside a quoted KQL value', () => {
    const yaml = `name: test
steps:
  - name: check
    type: if
    condition: 'field: "value==other"'
    steps:
      - name: inner
        type: action`;
    const doc = parseDocument(yaml);
    const results = validateIfConditions(doc);

    expect(results).toEqual([]);
  });

  it('should not flag != inside a quoted KQL value', () => {
    const yaml = `name: test
steps:
  - name: check
    type: if
    condition: 'field: "value!=other"'
    steps:
      - name: inner
        type: action`;
    const doc = parseDocument(yaml);
    const results = validateIfConditions(doc);

    expect(results).toEqual([]);
  });

  it('should not flag = inside a quoted KQL value', () => {
    const yaml = `name: test
steps:
  - name: check
    type: if
    condition: 'field: "a=b"'
    steps:
      - name: inner
        type: action`;
    const doc = parseDocument(yaml);
    const results = validateIfConditions(doc);

    expect(results).toEqual([]);
  });

  it('should include KQL examples in the hover message', () => {
    const yaml = `name: test
steps:
  - name: check
    type: if
    condition: "inputs.count == 1"
    steps:
      - name: inner
        type: action`;
    const doc = parseDocument(yaml);
    const results = validateIfConditions(doc);

    expect(results).toHaveLength(1);
    expect(results[0].hoverMessage).toContain('field: value');
    expect(results[0].hoverMessage).toContain('field > 0');
    expect(results[0].hoverMessage).toContain('NOT field: value');
    expect(results[0].hoverMessage).toContain('{{foreach.item}}');
    expect(results[0].hoverMessage).toContain('${{');
  });
});
