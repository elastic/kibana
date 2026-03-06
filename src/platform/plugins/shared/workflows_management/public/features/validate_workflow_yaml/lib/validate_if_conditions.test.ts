/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML from 'yaml';
import { validateIfConditions } from './validate_if_conditions';
import { buildWorkflowLookup } from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

function buildLookupFromYaml(yaml: string) {
  const lineCounter = new YAML.LineCounter();
  const yamlDocument = YAML.parseDocument(yaml, { lineCounter });
  const workflowLookup = buildWorkflowLookup(yamlDocument, lineCounter);
  return { workflowLookup, lineCounter };
}

describe('validateIfConditions', () => {
  it('should return no errors for valid KQL condition using ":"', () => {
    const { workflowLookup, lineCounter } = buildLookupFromYaml(`name: test
steps:
  - name: check
    type: if
    condition: "inputs.count: 1"
    steps:
      - name: inner
        type: http
        with:
          url: http://example.com
          method: GET`);
    const results = validateIfConditions(workflowLookup, lineCounter);

    expect(results).toEqual([]);
  });

  it('should return no errors for valid KQL with > operator', () => {
    const { workflowLookup, lineCounter } = buildLookupFromYaml(`name: test
steps:
  - name: check
    type: if
    condition: "inputs.count > 0"
    steps:
      - name: inner
        type: http
        with:
          url: http://example.com
          method: GET`);
    const results = validateIfConditions(workflowLookup, lineCounter);

    expect(results).toEqual([]);
  });

  it('should return error for "==" operator with helpful message', () => {
    const { workflowLookup, lineCounter } = buildLookupFromYaml(`name: test
steps:
  - name: check
    type: if
    condition: "inputs.count == 1"
    steps:
      - name: inner
        type: http
        with:
          url: http://example.com
          method: GET`);
    const results = validateIfConditions(workflowLookup, lineCounter);

    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('error');
    expect(results[0].owner).toBe('if-condition-validation');
    expect(results[0].message).toContain('==');
    expect(results[0].message).toContain(':');
  });

  it('should return error for "!=" operator with helpful message', () => {
    const { workflowLookup, lineCounter } = buildLookupFromYaml(`name: test
steps:
  - name: check
    type: if
    condition: "inputs.count != 1"
    steps:
      - name: inner
        type: http
        with:
          url: http://example.com
          method: GET`);
    const results = validateIfConditions(workflowLookup, lineCounter);

    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('error');
    expect(results[0].owner).toBe('if-condition-validation');
    expect(results[0].message).toContain('!=');
    expect(results[0].message).toContain('NOT');
  });

  it('should skip conditions containing template syntax {{ }}', () => {
    const { workflowLookup, lineCounter } = buildLookupFromYaml(`name: test
steps:
  - name: check
    type: if
    condition: 'steps.httpStep.output.text: "{{foreach.item}}"'
    steps:
      - name: inner
        type: http
        with:
          url: http://example.com
          method: GET`);
    const results = validateIfConditions(workflowLookup, lineCounter);

    expect(results).toEqual([]);
  });

  it('should skip ${{ expression }} syntax', () => {
    const { workflowLookup, lineCounter } = buildLookupFromYaml(`name: test
steps:
  - name: check
    type: if
    condition: "\${{ inputs.isActive }}"
    steps:
      - name: inner
        type: http
        with:
          url: http://example.com
          method: GET`);
    const results = validateIfConditions(workflowLookup, lineCounter);

    expect(results).toEqual([]);
  });

  it('should validate step-level if conditions', () => {
    const { workflowLookup, lineCounter } = buildLookupFromYaml(`name: test
steps:
  - name: guarded
    type: http
    if: "inputs.count == 1"
    with:
      url: http://example.com
      method: GET`);
    const results = validateIfConditions(workflowLookup, lineCounter);

    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('error');
    expect(results[0].owner).toBe('if-condition-validation');
    expect(results[0].message).toContain('==');
  });

  it('should return no errors when there are no if conditions', () => {
    const { workflowLookup, lineCounter } = buildLookupFromYaml(`name: test
steps:
  - name: step1
    type: http
    with:
      url: http://example.com
      method: GET`);
    const results = validateIfConditions(workflowLookup, lineCounter);

    expect(results).toEqual([]);
  });

  it('should return empty array for empty YAML', () => {
    const { workflowLookup, lineCounter } = buildLookupFromYaml('');
    expect(validateIfConditions(workflowLookup, lineCounter)).toEqual([]);
  });

  it('should include correct position information', () => {
    const { workflowLookup, lineCounter } = buildLookupFromYaml(`name: test
steps:
  - name: check
    type: if
    condition: "inputs.count == 1"
    steps:
      - name: inner
        type: http
        with:
          url: http://example.com
          method: GET`);
    const results = validateIfConditions(workflowLookup, lineCounter);

    expect(results).toHaveLength(1);
    expect(results[0].startLineNumber).toBeGreaterThan(0);
    expect(results[0].startColumn).toBeGreaterThan(0);
    expect(results[0].endLineNumber).toBeGreaterThanOrEqual(results[0].startLineNumber);
  });

  it('should report multiple errors for multiple invalid conditions', () => {
    const { workflowLookup, lineCounter } = buildLookupFromYaml(`name: test
steps:
  - name: check1
    type: if
    condition: "inputs.a == 1"
    steps:
      - name: inner
        type: http
        with:
          url: http://example.com
          method: GET
  - name: check2
    type: if
    condition: "inputs.b != 2"
    steps:
      - name: inner2
        type: http
        with:
          url: http://example.com
          method: GET`);
    const results = validateIfConditions(workflowLookup, lineCounter);

    expect(results).toHaveLength(2);
    expect(results.find((r) => r.message?.includes('=='))).toBeTruthy();
    expect(results.find((r) => r.message?.includes('!='))).toBeTruthy();
  });

  it('should skip template conditions but report non-template errors in same workflow', () => {
    const { workflowLookup, lineCounter } = buildLookupFromYaml(`name: test
steps:
  - name: templated
    type: if
    condition: 'field: "{{some.var}}"'
    steps:
      - name: inner
        type: http
        with:
          url: http://example.com
          method: GET
  - name: invalid
    type: if
    condition: "inputs.a == 1"
    steps:
      - name: inner2
        type: http
        with:
          url: http://example.com
          method: GET`);
    const results = validateIfConditions(workflowLookup, lineCounter);

    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('==');
  });

  it('should include KQL examples in the hover message', () => {
    const { workflowLookup, lineCounter } = buildLookupFromYaml(`name: test
steps:
  - name: check
    type: if
    condition: "inputs.count == 1"
    steps:
      - name: inner
        type: http
        with:
          url: http://example.com
          method: GET`);
    const results = validateIfConditions(workflowLookup, lineCounter);

    expect(results).toHaveLength(1);
    expect(results[0].hoverMessage).toContain('field: value');
    expect(results[0].hoverMessage).toContain('field > 0');
    expect(results[0].hoverMessage).toContain('NOT field: value');
    expect(results[0].hoverMessage).toContain('{{foreach.item}}');
    expect(results[0].hoverMessage).toContain('${{');
  });

  it('should validate conditions in nested if-steps inside foreach', () => {
    const { workflowLookup, lineCounter } = buildLookupFromYaml(`name: test
steps:
  - name: loop
    type: foreach
    foreach: "{{steps.fetch.output}}"
    steps:
      - name: check
        type: if
        condition: "foreach.item.status == active"
        steps:
          - name: do_something
            type: http
            with:
              url: http://example.com
              method: GET`);
    const results = validateIfConditions(workflowLookup, lineCounter);

    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('==');
  });
});
