/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';
import type { IRouter } from '@kbn/core/server';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { registerExecutionFilterSuggestionsRoute } from './filter_suggestions';
import { WORKFLOW_EXECUTION_FILTER_SUGGESTIONS_PATH } from '../../../../common';
import type { RouteDependencies } from '../types';

describe('POST /internal/workflows/executions/_filter_suggestions', () => {
  let handler: (...args: any[]) => Promise<any>;
  let routeConfig: any;
  let aggregateExecutions: jest.Mock;

  const response = {
    ok: jest.fn((params?: any) => ({ type: 'ok', ...params })),
    badRequest: jest.fn((params?: any) => ({ type: 'badRequest', ...params })),
    customError: jest.fn((params?: any) => ({ type: 'customError', ...params })),
    notFound: jest.fn((params?: any) => ({ type: 'notFound', ...params })),
    forbidden: jest.fn((params?: any) => ({ type: 'forbidden', ...params })),
    conflict: jest.fn((params?: any) => ({ type: 'conflict', ...params })),
  };

  const context = {
    workflows: Promise.resolve({ isWorkflowsAvailable: true }),
    licensing: Promise.resolve({
      license: { isAvailable: true, isActive: true, hasAtLeast: () => true, type: 'enterprise' },
    }),
  };

  const createRequest = (overrides: Record<string, unknown> = {}) => ({
    events: { aborted$: new Subject<void>() },
    authzResult: {
      [WorkflowsManagementApiActions.readExecution]: true,
      [WorkflowsManagementApiActions.readManagedExecution]: false,
    },
    body: {
      kind: 'dsl',
      index: 'anything-the-browser-sent',
      size: 10,
      fieldName: 'status',
      filters: [],
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    aggregateExecutions = jest.fn().mockResolvedValue({
      aggregations: { suggestions: { buckets: [{ key: 'completed', doc_count: 3 }] } },
      hits: { total: { value: 0, relation: 'eq' }, hits: [] },
    });

    const router = {
      versioned: {
        post: jest.fn().mockImplementation((config: any) => {
          routeConfig = config;
          return {
            addVersion: jest.fn().mockImplementation((_versionConfig: any, routeHandler: any) => {
              handler = routeHandler;
              return { addVersion: jest.fn() };
            }),
          };
        }),
      },
    } as unknown as jest.Mocked<IRouter>;

    registerExecutionFilterSuggestionsRoute({
      router,
      api: { aggregateExecutions } as any,
      spaces: { getSpaceId: jest.fn().mockReturnValue('marketing') } as any,
      getAutocompleteSettings: () => ({ terminateAfter: 100_000, timeout: 1_000 }),
    } as unknown as RouteDependencies);
  });

  it('requires the workflow execution read privilege', () => {
    expect(routeConfig.path).toBe(WORKFLOW_EXECUTION_FILTER_SUGGESTIONS_PATH);
    expect(routeConfig.access).toBe('internal');
    expect(routeConfig.security.authz.requiredPrivileges).toContain(
      WorkflowsManagementApiActions.readExecution
    );
  });

  it('aggregates the executions index with the internal user and returns suggestions', async () => {
    const result = await handler(context, createRequest(), response);

    expect(aggregateExecutions).toHaveBeenCalledTimes(1);
    // The data access layer resolves the index, so the route must not pass one through.
    expect(aggregateExecutions.mock.calls[0][0]).not.toHaveProperty('index');
    expect(result).toEqual({
      type: 'ok',
      body: expect.objectContaining({ suggestions: [{ value: 'completed', docCount: 3 }] }),
    });
  });

  it('scopes the aggregation to the current space and hides step and managed executions', async () => {
    await handler(context, createRequest(), response);

    const { query } = aggregateExecutions.mock.calls[0][0];
    expect(query.bool.filter).toContainEqual({
      bool: {
        must: [],
        should: [],
        filter: [
          {
            bool: {
              should: [
                { term: { spaceId: 'marketing' } },
                { bool: { must_not: { exists: { field: 'spaceId' } } } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
        must_not: [{ exists: { field: 'stepId' } }, { term: { managed: true } }],
      },
    });
  });

  it('includes managed executions for a caller that may read them', async () => {
    await handler(
      context,
      createRequest({
        authzResult: {
          [WorkflowsManagementApiActions.readExecution]: true,
          [WorkflowsManagementApiActions.readManagedExecution]: true,
        },
      }),
      response
    );

    const { query } = aggregateExecutions.mock.calls[0][0];
    const [requiredFilter] = query.bool.filter.filter((f: any) => f.bool?.must_not?.length);
    expect(requiredFilter.bool.must_not).toEqual([{ exists: { field: 'stepId' } }]);
  });

  it('rejects a field that is not part of the executions filter set', async () => {
    const result = await handler(
      context,
      createRequest({
        body: {
          kind: 'dsl',
          index: '.workflows-executions',
          size: 10,
          fieldName: 'workflowDefinition.name',
        },
      }),
      response
    );

    expect(aggregateExecutions).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: 'badRequest',
      body: { message: 'Unsupported filter field: workflowDefinition.name' },
    });
  });

  it('drops caller-supplied runtime mappings', async () => {
    await handler(
      context,
      createRequest({
        body: {
          kind: 'dsl',
          index: '.workflows-executions',
          size: 10,
          fieldName: 'status',
          runtimeFieldMap: { evil: { type: 'keyword', script: { source: 'emit("x")' } } },
        },
      }),
      response
    );

    expect(aggregateExecutions.mock.calls[0][0].runtime_mappings).toEqual({});
  });
});
