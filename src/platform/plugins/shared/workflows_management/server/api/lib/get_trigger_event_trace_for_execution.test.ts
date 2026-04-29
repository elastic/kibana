/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { getTriggerEventTraceForExecution } from './get_trigger_event_trace_for_execution';
import { WORKFLOWS_EVENTS_INDEX } from '../../../common';

describe('getTriggerEventTraceForExecution', () => {
  const logger = loggerMock.create();

  const baseExecution = (overrides: Partial<WorkflowExecutionDto>): WorkflowExecutionDto =>
    ({
      id: 'exec-1',
      workflowId: 'wf-1',
      triggeredBy: 'my-plugin.myTrigger',
      context: { metadata: { eventId: 'evt-1' } },
      ...overrides,
    } as WorkflowExecutionDto);

  it('returns ineligible when trigger is not event-driven', async () => {
    const esClient = { search: jest.fn() };
    const result = await getTriggerEventTraceForExecution({
      esClient: esClient as any,
      logger,
      execution: baseExecution({ triggeredBy: 'manual' }),
      spaceId: 'default',
      getWorkflowExecution: jest.fn(),
    });
    expect(result.eligible).toBe(false);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('searches dispatch and downstream by space and ids', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': 't1',
                eventId: 'evt-1',
                triggerId: 'my-plugin.myTrigger',
                spaceId: 'default',
                subscriptions: ['wf-a'],
                payload: { x: 1 },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({ hits: { hits: [] } });

    const getWorkflowExecution = jest
      .fn()
      .mockResolvedValue({ id: 'exec-1', workflowId: 'wf-1', context: {} } as WorkflowExecutionDto);

    const result = await getTriggerEventTraceForExecution({
      esClient: { search } as any,
      logger,
      execution: baseExecution({ dispatchEventId: 'evt-1' }),
      spaceId: 'default',
      getWorkflowExecution,
    });

    expect(result.eligible).toBe(true);
    expect(result.dispatch?.eventId).toBe('evt-1');
    expect(result.eventCausalChain).toHaveLength(1);
    expect(result.eventCausalChain[0].triggeredExecutionId).toBe('exec-1');
    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[0][0].index).toBe(WORKFLOWS_EVENTS_INDEX);
    expect(search.mock.calls[1][0].query.bool.filter).toEqual(
      expect.arrayContaining([{ term: { sourceExecutionId: 'exec-1' } }])
    );
  });

  it('builds multi-hop eventCausalChain via sourceExecutionId and parent dispatch ids', async () => {
    const d1 = {
      '@timestamp': 't0',
      eventId: 'evt-1',
      triggerId: 'root.trigger',
      spaceId: 'default',
      subscriptions: ['wf-p'],
      payload: { root: true },
    };
    const d2 = {
      '@timestamp': 't1',
      eventId: 'evt-2',
      triggerId: 'child.trigger',
      spaceId: 'default',
      subscriptions: ['wf-c'],
      payload: { child: true },
      sourceExecutionId: 'exec-parent',
    };

    const search = jest
      .fn()
      .mockResolvedValueOnce({ hits: { hits: [{ _source: d2 }] } })
      .mockResolvedValueOnce({ hits: { hits: [{ _source: d1 }] } })
      .mockResolvedValueOnce({ hits: { hits: [] } });

    const getWorkflowExecution = jest.fn((id: string) => {
      if (id === 'exec-child') {
        return Promise.resolve({
          id: 'exec-child',
          workflowId: 'wf-c',
          context: {},
        } as WorkflowExecutionDto);
      }
      if (id === 'exec-parent') {
        return Promise.resolve({
          id: 'exec-parent',
          workflowId: 'wf-p',
          dispatchEventId: 'evt-1',
          context: {},
        } as WorkflowExecutionDto);
      }
      return Promise.resolve(null);
    });

    const result = await getTriggerEventTraceForExecution({
      esClient: { search } as any,
      logger,
      execution: baseExecution({
        id: 'exec-child',
        triggeredBy: 'my-plugin.myTrigger',
        dispatchEventId: 'evt-2',
        context: {},
      }),
      spaceId: 'default',
      getWorkflowExecution,
    });

    expect(result.eventCausalChain).toHaveLength(2);
    expect(result.eventCausalChain[0].dispatch.eventId).toBe('evt-1');
    expect(result.eventCausalChain[0].triggeredExecutionId).toBe('exec-parent');
    expect(result.eventCausalChain[1].dispatch.eventId).toBe('evt-2');
    expect(result.eventCausalChain[1].triggeredExecutionId).toBe('exec-child');
    expect(result.eventCausalChain[1].emittedByExecution?.executionId).toBe('exec-parent');
    expect(search).toHaveBeenCalledTimes(3);
  });
});
