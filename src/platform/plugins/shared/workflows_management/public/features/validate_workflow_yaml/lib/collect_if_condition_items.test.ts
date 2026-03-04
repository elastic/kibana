/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { collectIfConditionItems } from './collect_if_condition_items';

describe('collectIfConditionItems', () => {
  it('should return empty array for YAML with no if-steps', () => {
    const yaml = `name: test
steps:
  - name: step1
    type: action
    action: test`;
    const doc = parseDocument(yaml);
    expect(collectIfConditionItems(doc)).toEqual([]);
  });

  it('should collect condition from an if-step', () => {
    const yaml = `name: test
steps:
  - name: check
    type: if
    condition: "inputs.count: 1"
    steps:
      - name: inner
        type: action`;
    const doc = parseDocument(yaml);
    const items = collectIfConditionItems(doc);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      condition: 'inputs.count: 1',
      conditionKind: 'if-step',
    });
  });

  it('should collect step-level if conditions', () => {
    const yaml = `name: test
steps:
  - name: guarded
    type: action
    if: "inputs.enabled: true"
    action: test`;
    const doc = parseDocument(yaml);
    const items = collectIfConditionItems(doc);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      condition: 'inputs.enabled: true',
      conditionKind: 'step-level-if',
    });
  });

  it('should collect conditions from nested if-steps inside foreach', () => {
    const yaml = `name: test
steps:
  - name: loop
    type: foreach
    each: "{{steps.fetch.output}}"
    steps:
      - name: check
        type: if
        condition: "foreach.item.status: active"
        steps:
          - name: do_something
            type: action`;
    const doc = parseDocument(yaml);
    const items = collectIfConditionItems(doc);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      condition: 'foreach.item.status: active',
      conditionKind: 'if-step',
    });
  });

  it('should collect multiple conditions from different steps', () => {
    const yaml = `name: test
steps:
  - name: check1
    type: if
    condition: "inputs.a: 1"
    steps:
      - name: inner
        type: action
  - name: guarded
    type: action
    if: "inputs.b: 2"
  - name: check2
    type: if
    condition: "inputs.c: 3"
    steps:
      - name: inner2
        type: action`;
    const doc = parseDocument(yaml);
    const items = collectIfConditionItems(doc);

    expect(items).toHaveLength(3);
    expect(items[0].condition).toBe('inputs.a: 1');
    expect(items[0].conditionKind).toBe('if-step');
    expect(items[1].condition).toBe('inputs.b: 2');
    expect(items[1].conditionKind).toBe('step-level-if');
    expect(items[2].condition).toBe('inputs.c: 3');
    expect(items[2].conditionKind).toBe('if-step');
  });

  it('should not collect condition from non-if step types', () => {
    const yaml = `name: test
steps:
  - name: some_step
    type: action
    condition: "this.is.not.an.if.step: true"`;
    const doc = parseDocument(yaml);
    const items = collectIfConditionItems(doc);

    expect(items).toEqual([]);
  });

  it('should include line/column positions', () => {
    const yaml = `name: test
steps:
  - name: check
    type: if
    condition: "inputs.count: 1"
    steps:
      - name: inner
        type: action`;
    const doc = parseDocument(yaml);
    const items = collectIfConditionItems(doc);

    expect(items).toHaveLength(1);
    expect(items[0].startLineNumber).toBeGreaterThan(0);
    expect(items[0].startColumn).toBeGreaterThan(0);
    expect(items[0].endLineNumber).toBeGreaterThanOrEqual(items[0].startLineNumber);
  });

  it('should return empty array for empty YAML', () => {
    const doc = parseDocument('');
    expect(collectIfConditionItems(doc)).toEqual([]);
  });

  it('should return empty array for malformed YAML', () => {
    const doc = parseDocument('{{invalid yaml');
    expect(collectIfConditionItems(doc)).toEqual([]);
  });

  it('should collect conditions from nested if-steps inside else branches', () => {
    const yaml = `name: test
steps:
  - name: outer
    type: if
    condition: "field: true"
    steps:
      - name: then_step
        type: action
    else:
      - name: else_check
        type: if
        condition: "field: false"
        steps:
          - name: inner
            type: action`;
    const doc = parseDocument(yaml);
    const items = collectIfConditionItems(doc);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      condition: 'field: true',
      conditionKind: 'if-step',
    });
    expect(items[1]).toMatchObject({
      condition: 'field: false',
      conditionKind: 'if-step',
    });
  });

  it('should skip conditions with empty string values', () => {
    const yaml = `name: test
steps:
  - name: check
    type: if
    condition: ""
    steps:
      - name: inner
        type: action`;
    const doc = parseDocument(yaml);
    const items = collectIfConditionItems(doc);

    expect(items).toEqual([]);
  });
});
