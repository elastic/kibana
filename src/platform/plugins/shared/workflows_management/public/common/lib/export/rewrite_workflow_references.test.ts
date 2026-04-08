/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rewriteWorkflowReferences } from './rewrite_workflow_references';

describe('rewriteWorkflowReferences', () => {
  it('should rewrite workflow-id in a workflow.execute step', () => {
    const yaml = [
      'name: Parent',
      'steps:',
      '  - name: call-child',
      '    type: workflow.execute',
      '    with:',
      '      workflow-id: child-1',
    ].join('\n');

    const mapping = new Map([['child-1', 'workflow-new-1']]);
    const result = rewriteWorkflowReferences(yaml, mapping);

    expect(result).toContain('workflow-id: workflow-new-1');
    expect(result).not.toContain('workflow-id: child-1');
  });

  it('should rewrite workflow-id in a workflow.executeAsync step', () => {
    const yaml = [
      'name: Parent',
      'steps:',
      '  - name: fire-and-forget',
      '    type: workflow.executeAsync',
      '    with:',
      '      workflow-id: async-child',
    ].join('\n');

    const mapping = new Map([['async-child', 'workflow-new-async']]);
    const result = rewriteWorkflowReferences(yaml, mapping);

    expect(result).toContain('workflow-id: workflow-new-async');
  });

  it('should not rewrite IDs that are not in the mapping', () => {
    const yaml = [
      'name: Parent',
      'steps:',
      '  - name: call-external',
      '    type: workflow.execute',
      '    with:',
      '      workflow-id: external-workflow',
    ].join('\n');

    const mapping = new Map([['other-id', 'workflow-new']]);
    const result = rewriteWorkflowReferences(yaml, mapping);

    expect(result).toContain('workflow-id: external-workflow');
  });

  it('should skip dynamic/templated references', () => {
    const yaml = [
      'name: Parent',
      'steps:',
      '  - name: dynamic-call',
      '    type: workflow.execute',
      '    with:',
      '      workflow-id: "{{ inputs.target }}"',
    ].join('\n');

    const mapping = new Map([['{{ inputs.target }}', 'workflow-new']]);
    const result = rewriteWorkflowReferences(yaml, mapping);

    expect(result).toContain('{{ inputs.target }}');
  });

  it('should rewrite multiple references in the same YAML', () => {
    const yaml = [
      'name: Orchestrator',
      'steps:',
      '  - name: step-a',
      '    type: workflow.execute',
      '    with:',
      '      workflow-id: child-a',
      '  - name: step-b',
      '    type: workflow.executeAsync',
      '    with:',
      '      workflow-id: child-b',
    ].join('\n');

    const mapping = new Map([
      ['child-a', 'workflow-new-a'],
      ['child-b', 'workflow-new-b'],
    ]);
    const result = rewriteWorkflowReferences(yaml, mapping);

    expect(result).toContain('workflow-id: workflow-new-a');
    expect(result).toContain('workflow-id: workflow-new-b');
  });

  it('should not modify non-workflow step types', () => {
    const yaml = [
      'name: Parent',
      'steps:',
      '  - name: http-step',
      '    type: http',
      '    with:',
      '      workflow-id: should-not-change',
    ].join('\n');

    const mapping = new Map([['should-not-change', 'new-id']]);
    const result = rewriteWorkflowReferences(yaml, mapping);

    expect(result).toContain('workflow-id: should-not-change');
  });

  it('should handle nested steps inside forEach', () => {
    const yaml = [
      'name: Parent',
      'steps:',
      '  - name: loop',
      '    type: forEach',
      '    with:',
      '      collection: "{{ steps.fetch.result }}"',
      '    steps:',
      '      - name: call-nested',
      '        type: workflow.execute',
      '        with:',
      '          workflow-id: nested-child',
    ].join('\n');

    const mapping = new Map([['nested-child', 'workflow-new-nested']]);
    const result = rewriteWorkflowReferences(yaml, mapping);

    expect(result).toContain('workflow-id: workflow-new-nested');
  });

  it('should handle nested steps inside if/else', () => {
    const yaml = [
      'name: Parent',
      'steps:',
      '  - name: branch',
      '    type: if',
      '    condition: "{{ inputs.flag }}"',
      '    steps:',
      '      - name: if-child',
      '        type: workflow.execute',
      '        with:',
      '          workflow-id: if-target',
      '    else:',
      '      - name: else-child',
      '        type: workflow.execute',
      '        with:',
      '          workflow-id: else-target',
    ].join('\n');

    const mapping = new Map([
      ['if-target', 'workflow-new-if'],
      ['else-target', 'workflow-new-else'],
    ]);
    const result = rewriteWorkflowReferences(yaml, mapping);

    expect(result).toContain('workflow-id: workflow-new-if');
    expect(result).toContain('workflow-id: workflow-new-else');
  });

  it('should handle parallel branches', () => {
    const yaml = [
      'name: Parent',
      'steps:',
      '  - name: fan-out',
      '    type: parallel',
      '    branches:',
      '      - steps:',
      '          - name: branch-a',
      '            type: workflow.execute',
      '            with:',
      '              workflow-id: branch-a-target',
      '      - steps:',
      '          - name: branch-b',
      '            type: workflow.executeAsync',
      '            with:',
      '              workflow-id: branch-b-target',
    ].join('\n');

    const mapping = new Map([
      ['branch-a-target', 'workflow-new-a'],
      ['branch-b-target', 'workflow-new-b'],
    ]);
    const result = rewriteWorkflowReferences(yaml, mapping);

    expect(result).toContain('workflow-id: workflow-new-a');
    expect(result).toContain('workflow-id: workflow-new-b');
  });

  it('should return the original YAML when mapping is empty', () => {
    const yaml = [
      'name: Parent',
      'steps:',
      '  - name: call',
      '    type: workflow.execute',
      '    with:',
      '      workflow-id: child-1',
    ].join('\n');

    const result = rewriteWorkflowReferences(yaml, new Map());
    expect(result).toBe(yaml);
  });

  it('should return the original YAML when no references match', () => {
    const yaml = [
      'name: Parent',
      'steps:',
      '  - name: call',
      '    type: workflow.execute',
      '    with:',
      '      workflow-id: unrelated',
    ].join('\n');

    const mapping = new Map([['other', 'new-other']]);
    const result = rewriteWorkflowReferences(yaml, mapping);
    expect(result).toBe(yaml);
  });

  it('should preserve YAML formatting and comments', () => {
    const yaml = [
      'name: Parent',
      '# This is a comment',
      'steps:',
      '  - name: call',
      '    type: workflow.execute',
      '    with:',
      '      workflow-id: child-1  # inline comment',
    ].join('\n');

    const mapping = new Map([['child-1', 'workflow-new-1']]);
    const result = rewriteWorkflowReferences(yaml, mapping);

    expect(result).toContain('# This is a comment');
    expect(result).toContain('workflow-id: workflow-new-1');
  });

  it('should handle YAML with no steps gracefully', () => {
    const yaml = 'name: Empty Workflow';
    const mapping = new Map([['any', 'new']]);
    const result = rewriteWorkflowReferences(yaml, mapping);
    expect(result).toBe(yaml);
  });
});
