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
import { resolveMatchingWorkflowSubscriptions } from './resolve_workflow_subscriptions';

interface TestDefinitionOverrides {
  triggers?: Array<{ type: string; on?: { condition?: string } }>;
  steps?: unknown[];
}

const createMockWorkflow = (
  id: string,
  overrides: Omit<Partial<WorkflowDetailDto>, 'definition' | 'id'> & {
    definition?: TestDefinitionOverrides;
  } = {}
): WorkflowDetailDto =>
  ({
    id,
    name: `Workflow ${id}`,
    enabled: true,
    definition: {
      triggers: [{ type: 'cases.updated' }],
      steps: [],
      ...overrides.definition,
    } as WorkflowDetailDto['definition'],
    yaml: '',
    valid: true,
    ...overrides,
  } as WorkflowDetailDto);

describe('resolveMatchingWorkflowSubscriptions', () => {
  const mockLogger: Logger = {
    warn: jest.fn(),
  } as unknown as Logger;

  it('should return only workflows whose trigger condition matches the event context', async () => {
    const matchingWorkflow = createMockWorkflow('wf-1', {
      definition: {
        triggers: [{ type: 'cases.updated', on: { condition: 'event.severity: "high"' } }],
        steps: [],
      },
    });
    const nonMatchingWorkflow = createMockWorkflow('wf-2', {
      definition: {
        triggers: [{ type: 'cases.updated', on: { condition: 'event.severity: "low"' } }],
        steps: [],
      },
    });

    const getWorkflowsSubscribedToTrigger = jest
      .fn()
      .mockResolvedValue([matchingWorkflow, nonMatchingWorkflow]);
    const api = { getWorkflowsSubscribedToTrigger };

    const result = await resolveMatchingWorkflowSubscriptions(
      {
        triggerId: 'cases.updated',
        spaceId: 'default',
        eventContext: { severity: 'high' },
      },
      { api, logger: mockLogger }
    );

    expect(getWorkflowsSubscribedToTrigger).toHaveBeenCalledWith('cases.updated', 'default');
    expect(result.workflows).toHaveLength(1);
    expect(result.workflows[0].id).toBe('wf-1');
    expect(result.stats).toEqual({
      subscribedCount: 2,
      disabledCount: 0,
      kqlFalseCount: 1,
      kqlErrorCount: 0,
      matchedCount: 1,
    });
  });

  it('should return empty array when getWorkflowsSubscribedToTrigger returns empty', async () => {
    const getWorkflowsSubscribedToTrigger = jest.fn().mockResolvedValue([]);
    const api = { getWorkflowsSubscribedToTrigger };

    const result = await resolveMatchingWorkflowSubscriptions(
      {
        triggerId: 'cases.updated',
        spaceId: 'default',
        eventContext: {},
      },
      { api, logger: mockLogger }
    );

    expect(result.workflows).toEqual([]);
    expect(result.stats).toEqual({
      subscribedCount: 0,
      disabledCount: 0,
      kqlFalseCount: 0,
      kqlErrorCount: 0,
      matchedCount: 0,
    });
  });

  it('should return all workflows when none have a condition', async () => {
    const wf1 = createMockWorkflow('wf-1', {
      definition: { triggers: [{ type: 'cases.updated' }], steps: [] },
    });
    const wf2 = createMockWorkflow('wf-2', {
      definition: { triggers: [{ type: 'cases.updated' }], steps: [] },
    });
    const getWorkflowsSubscribedToTrigger = jest.fn().mockResolvedValue([wf1, wf2]);
    const api = { getWorkflowsSubscribedToTrigger };

    const result = await resolveMatchingWorkflowSubscriptions(
      {
        triggerId: 'cases.updated',
        spaceId: 'default',
        eventContext: { caseId: '123' },
      },
      { api, logger: mockLogger }
    );

    expect(result.workflows).toHaveLength(2);
    expect(result.workflows.map((w) => w.id)).toEqual(['wf-1', 'wf-2']);
    expect(result.stats.matchedCount).toBe(2);
    expect(result.stats.subscribedCount).toBe(2);
  });

  it('should call getWorkflowsSubscribedToTrigger with the given spaceId', async () => {
    const getWorkflowsSubscribedToTrigger = jest.fn().mockResolvedValue([]);
    const api = { getWorkflowsSubscribedToTrigger };

    await resolveMatchingWorkflowSubscriptions(
      {
        triggerId: 'alerts.created',
        spaceId: 'space-1',
        eventContext: {},
      },
      { api, logger: mockLogger }
    );
    expect(getWorkflowsSubscribedToTrigger).toHaveBeenCalledWith('alerts.created', 'space-1');

    getWorkflowsSubscribedToTrigger.mockClear();
    await resolveMatchingWorkflowSubscriptions(
      {
        triggerId: 'alerts.created',
        spaceId: 'space-2',
        eventContext: {},
      },
      { api, logger: mockLogger }
    );
    expect(getWorkflowsSubscribedToTrigger).toHaveBeenCalledWith('alerts.created', 'space-2');
  });

  it('should return only enabled workflows', async () => {
    const enabledWorkflow = createMockWorkflow('wf-enabled', {
      enabled: true,
      definition: { triggers: [{ type: 'cases.updated' }], steps: [] },
    });
    const disabledWorkflow = createMockWorkflow('wf-disabled', {
      enabled: false,
      definition: { triggers: [{ type: 'cases.updated' }], steps: [] },
    });
    const getWorkflowsSubscribedToTrigger = jest
      .fn()
      .mockResolvedValue([enabledWorkflow, disabledWorkflow]);
    const api = { getWorkflowsSubscribedToTrigger };

    const result = await resolveMatchingWorkflowSubscriptions(
      {
        triggerId: 'cases.updated',
        spaceId: 'default',
        eventContext: {},
      },
      { api, logger: mockLogger }
    );

    expect(result.workflows).toHaveLength(1);
    expect(result.workflows[0].id).toBe('wf-enabled');
    expect(result.workflows[0].enabled).toBe(true);
    expect(result.stats).toEqual({
      subscribedCount: 2,
      disabledCount: 1,
      kqlFalseCount: 0,
      kqlErrorCount: 0,
      matchedCount: 1,
    });
  });
});
