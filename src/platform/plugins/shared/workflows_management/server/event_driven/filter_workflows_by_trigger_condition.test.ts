/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { workflowMatchesTriggerCondition } from './filter_workflows_by_trigger_condition';

/** Definition overrides for tests; allows custom trigger types (e.g. cases.updated). */
interface TestDefinitionOverrides {
  triggers?: Array<{ type: string; with?: { condition?: string } }>;
  steps?: unknown[];
}

const createMockWorkflow = (
  overrides: Omit<Partial<WorkflowDetailDto>, 'definition'> & {
    definition?: TestDefinitionOverrides;
  } = {}
): WorkflowDetailDto =>
  ({
    id: 'wf-1',
    name: 'Test Workflow',
    enabled: true,
    definition: {
      triggers: [{ type: 'cases.updated' }],
      steps: [],
      ...overrides.definition,
    } as WorkflowDetailDto['definition'],
    ...overrides,
  } as WorkflowDetailDto);

describe('workflowMatchesTriggerCondition', () => {
  const mockLogger: Logger = {
    warn: jest.fn(),
  } as unknown as Logger;

  it('should return false when workflow has no triggers', () => {
    const workflow = createMockWorkflow({ definition: { triggers: [], steps: [] } });
    expect(workflowMatchesTriggerCondition(workflow, 'cases.updated', { severity: 'high' })).toBe(
      false
    );
  });

  it('should return false when workflow definition has no triggers', () => {
    const workflow = createMockWorkflow({ definition: { triggers: undefined as any, steps: [] } });
    expect(workflowMatchesTriggerCondition(workflow, 'cases.updated', {})).toBe(false);
  });

  it('should return false when no trigger matches the triggerId', () => {
    const workflow = createMockWorkflow({
      definition: { triggers: [{ type: 'manual' }], steps: [] },
    });
    expect(workflowMatchesTriggerCondition(workflow, 'cases.updated', {})).toBe(false);
  });

  it('should return true when trigger type matches and has no condition', () => {
    const workflow = createMockWorkflow({
      definition: { triggers: [{ type: 'cases.updated' }], steps: [] },
    });
    expect(workflowMatchesTriggerCondition(workflow, 'cases.updated', { caseId: '123' })).toBe(
      true
    );
  });

  it('should return true when trigger type matches and KQL condition matches payload', () => {
    const workflow = createMockWorkflow({
      definition: {
        triggers: [
          {
            type: 'cases.updated',
            with: { condition: 'event.severity: "high"' },
          },
        ],
        steps: [],
      },
    });
    expect(
      workflowMatchesTriggerCondition(workflow, 'cases.updated', { severity: 'high' }, mockLogger)
    ).toBe(true);
  });

  it('should return false when trigger type matches but KQL condition does not match payload', () => {
    const workflow = createMockWorkflow({
      definition: {
        triggers: [
          {
            type: 'cases.updated',
            with: { condition: 'event.severity: "high"' },
          },
        ],
        steps: [],
      },
    });
    expect(
      workflowMatchesTriggerCondition(workflow, 'cases.updated', { severity: 'low' }, mockLogger)
    ).toBe(false);
  });

  it('should return false and log when KQL condition throws', () => {
    const workflow = createMockWorkflow({
      definition: {
        triggers: [
          {
            type: 'cases.updated',
            with: { condition: 'invalid ( unclosed' },
          },
        ],
        steps: [],
      },
    });
    expect(workflowMatchesTriggerCondition(workflow, 'cases.updated', {}, mockLogger)).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should evaluate complex KQL with AND, OR, and NOT', () => {
    const workflow = createMockWorkflow({
      definition: {
        triggers: [
          {
            type: 'cases.updated',
            with: {
              condition:
                'event.severity: "high" and (event.category: "alerts" or event.category: "notifications") and not event.source: "legacy"',
            },
          },
        ],
        steps: [],
      },
    });

    expect(
      workflowMatchesTriggerCondition(
        workflow,
        'cases.updated',
        { severity: 'high', category: 'alerts', source: 'api' },
        mockLogger
      )
    ).toBe(true);

    expect(
      workflowMatchesTriggerCondition(
        workflow,
        'cases.updated',
        { severity: 'high', category: 'notifications', source: 'api' },
        mockLogger
      )
    ).toBe(true);

    expect(
      workflowMatchesTriggerCondition(
        workflow,
        'cases.updated',
        { severity: 'high', category: 'alerts', source: 'legacy' },
        mockLogger
      )
    ).toBe(false);

    expect(
      workflowMatchesTriggerCondition(
        workflow,
        'cases.updated',
        { severity: 'low', category: 'alerts', source: 'api' },
        mockLogger
      )
    ).toBe(false);

    expect(
      workflowMatchesTriggerCondition(
        workflow,
        'cases.updated',
        { severity: 'high', category: 'audit', source: 'api' },
        mockLogger
      )
    ).toBe(false);
  });
});
