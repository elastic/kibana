/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { extractReferencedWorkflowIds } from './extract_workflow_references';

const makeDefinition = (steps: unknown[]): WorkflowYaml => ({ steps } as unknown as WorkflowYaml);

describe('extractReferencedWorkflowIds', () => {
  it('should return empty array for a definition with no steps', () => {
    const result = extractReferencedWorkflowIds(makeDefinition([]));
    expect(result).toEqual([]);
  });

  it('should extract workflow-id from workflow.execute steps', () => {
    const result = extractReferencedWorkflowIds(
      makeDefinition([
        { type: 'workflow.execute', with: { 'workflow-id': 'child-1' } },
        { type: 'console', with: { message: 'hello' } },
        { type: 'workflow.execute', with: { 'workflow-id': 'child-2' } },
      ])
    );
    expect(result).toEqual(expect.arrayContaining(['child-1', 'child-2']));
    expect(result).toHaveLength(2);
  });

  it('should extract workflow-id from workflow.executeAsync steps', () => {
    const result = extractReferencedWorkflowIds(
      makeDefinition([{ type: 'workflow.executeAsync', with: { 'workflow-id': 'async-child' } }])
    );
    expect(result).toEqual(['async-child']);
  });

  it('should deduplicate referenced IDs', () => {
    const result = extractReferencedWorkflowIds(
      makeDefinition([
        { type: 'workflow.execute', with: { 'workflow-id': 'same-id' } },
        { type: 'workflow.executeAsync', with: { 'workflow-id': 'same-id' } },
      ])
    );
    expect(result).toEqual(['same-id']);
  });

  it('should skip dynamic/templated references', () => {
    const result = extractReferencedWorkflowIds(
      makeDefinition([
        { type: 'workflow.execute', with: { 'workflow-id': '{{ inputs.id }}' } },
        { type: 'workflow.execute', with: { 'workflow-id': 'static-id' } },
      ])
    );
    expect(result).toEqual(['static-id']);
  });

  it('should recurse into nested steps (forEach)', () => {
    const result = extractReferencedWorkflowIds(
      makeDefinition([
        {
          type: 'forEach',
          steps: [{ type: 'workflow.execute', with: { 'workflow-id': 'nested-child' } }],
        },
      ])
    );
    expect(result).toEqual(['nested-child']);
  });

  it('should recurse into if/else steps', () => {
    const result = extractReferencedWorkflowIds(
      makeDefinition([
        {
          type: 'if',
          steps: [{ type: 'workflow.execute', with: { 'workflow-id': 'if-child' } }],
          else: [{ type: 'workflow.execute', with: { 'workflow-id': 'else-child' } }],
        },
      ])
    );
    expect(result).toEqual(expect.arrayContaining(['if-child', 'else-child']));
    expect(result).toHaveLength(2);
  });

  it('should recurse into parallel branches', () => {
    const result = extractReferencedWorkflowIds(
      makeDefinition([
        {
          type: 'parallel',
          branches: [
            { steps: [{ type: 'workflow.execute', with: { 'workflow-id': 'branch-1' } }] },
            { steps: [{ type: 'workflow.executeAsync', with: { 'workflow-id': 'branch-2' } }] },
          ],
        },
      ])
    );
    expect(result).toEqual(expect.arrayContaining(['branch-1', 'branch-2']));
    expect(result).toHaveLength(2);
  });

  it('should handle deeply nested structures', () => {
    const result = extractReferencedWorkflowIds(
      makeDefinition([
        {
          type: 'if',
          steps: [
            {
              type: 'forEach',
              steps: [
                {
                  type: 'parallel',
                  branches: [
                    {
                      steps: [
                        { type: 'workflow.execute', with: { 'workflow-id': 'deeply-nested' } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          else: [],
        },
      ])
    );
    expect(result).toEqual(['deeply-nested']);
  });

  it('should skip steps with missing with block', () => {
    const result = extractReferencedWorkflowIds(makeDefinition([{ type: 'workflow.execute' }]));
    expect(result).toEqual([]);
  });

  it('should skip steps with empty workflow-id', () => {
    const result = extractReferencedWorkflowIds(
      makeDefinition([{ type: 'workflow.execute', with: { 'workflow-id': '' } }])
    );
    expect(result).toEqual([]);
  });

  it('should ignore non-workflow step types', () => {
    const result = extractReferencedWorkflowIds(
      makeDefinition([
        { type: 'console', with: { 'workflow-id': 'should-not-appear' } },
        { type: 'http', with: { url: 'http://example.com' } },
      ])
    );
    expect(result).toEqual([]);
  });
});
