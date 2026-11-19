/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepContext } from '@kbn/workflows';
import { getLastRunStepDefinition, resolveLastRunWindow } from './get_last_run_step';
import type { StepHandlerContext } from '../../step_registry/types';

const NOW = new Date('2026-10-27T12:00:00.000Z');

describe('resolveLastRunWindow', () => {
  it('starts the window when the last successful run started', () => {
    expect(
      resolveLastRunWindow({
        lastSuccess: {
          id: 'run-1',
          startedAt: '2026-10-27T09:30:00.000Z',
          finishedAt: '2026-10-27T09:40:00.000Z',
        },
        now: NOW,
      })
    ).toEqual({
      first_run: false,
      since: '2026-10-27T09:30:00.000Z',
      hours_since: 3,
      last_success: {
        execution_id: 'run-1',
        started_at: '2026-10-27T09:30:00.000Z',
        finished_at: '2026-10-27T09:40:00.000Z',
      },
    });
  });

  it('uses default_hours on the first run', () => {
    expect(resolveLastRunWindow({ now: NOW, defaultHours: 48 })).toEqual({
      first_run: true,
      since: '2026-10-25T12:00:00.000Z',
      hours_since: 48,
    });
  });

  it('defaults the first window to 24 hours', () => {
    expect(resolveLastRunWindow({ now: NOW })).toMatchObject({ first_run: true, hours_since: 24 });
  });

  it('never reaches further back than max_hours', () => {
    expect(
      resolveLastRunWindow({
        lastSuccess: { id: 'run-1', startedAt: '2026-09-01T00:00:00.000Z' },
        now: NOW,
        maxHours: 168,
      })
    ).toMatchObject({ since: '2026-10-20T12:00:00.000Z', hours_since: 168 });
  });

  it('reports at least one hour, for a run right after the last one', () => {
    expect(
      resolveLastRunWindow({
        lastSuccess: { id: 'run-1', startedAt: '2026-10-27T11:59:30.000Z' },
        now: NOW,
      })
    ).toMatchObject({ hours_since: 1 });
  });
});

describe('workflow.getLastRun', () => {
  const createContext = (
    callKibanaApi: jest.Mock,
    input: { default_hours?: number; max_hours?: number } = {}
  ): StepHandlerContext<typeof getLastRunStepDefinition.inputSchema> => ({
    input,
    config: {},
    rawInput: input,
    contextManager: {
      getContext: jest.fn(
        () =>
          ({
            workflow: { id: 'wf/1', spaceId: 'space-1' },
            execution: { id: 'run-current' },
          } as StepContext)
      ),
      getFakeRequest: jest.fn(),
      getScopedEsClient: jest.fn(),
      renderInputTemplate: jest.fn((value) => value),
      callKibanaApi,
    },
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    stepId: 'last_run',
    stepType: 'workflow.getLastRun',
  });

  const respondWith = (results: Array<{ id: string; startedAt: string; finishedAt?: string }>) =>
    jest.fn().mockResolvedValue({ status: 200, headers: {}, body: { results } });

  it("reads its own workflow's completed production runs, newest first", async () => {
    const callKibanaApi = respondWith([]);

    await getLastRunStepDefinition.handler(createContext(callKibanaApi));

    expect(callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/workflows/workflow/wf%2F1/executions',
      query: {
        statuses: 'completed',
        executionTypes: 'production',
        sortField: 'finishedAt',
        sortOrder: 'desc',
        size: 3,
        omitStepRuns: true,
      },
    });
  });

  it('starts the window at the last successful run, skipping the current one', async () => {
    const result = await getLastRunStepDefinition.handler(
      createContext(
        respondWith([
          { id: 'run-current', startedAt: '2026-10-27T11:00:00.000Z' },
          { id: 'run-1', startedAt: '2026-10-27T09:30:00.000Z' },
        ])
      )
    );

    expect(result.output).toEqual(
      expect.objectContaining({
        first_run: false,
        since: '2026-10-27T09:30:00.000Z',
        last_success: expect.objectContaining({ execution_id: 'run-1' }),
      })
    );
  });

  it('treats the run as the first one when only the current run is listed', async () => {
    const result = await getLastRunStepDefinition.handler(
      createContext(respondWith([{ id: 'run-current', startedAt: '2026-10-27T11:00:00.000Z' }]), {
        default_hours: 6,
      })
    );

    expect(result.output).toEqual(expect.objectContaining({ first_run: true, hours_since: 6 }));
    expect(result.output).not.toHaveProperty('last_success');
  });

  it('fails the step when the history cannot be read', async () => {
    const callKibanaApi = jest.fn().mockRejectedValue(new Error('HTTP 403: Forbidden'));

    const result = await getLastRunStepDefinition.handler(createContext(callKibanaApi));

    expect(result.error?.message).toBe('Failed to read the last run: HTTP 403: Forbidden');
  });
});
