/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runPreflight, type PreflightInput } from './preflight';
import type { ConnectorSpec, ActionContext } from '../connector_spec';

const mockCtx: ActionContext = {
  client: {} as any,
  getClient: jest.fn(),
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as any,
};

const mockConnector: ConnectorSpec = {
  metadata: {
    id: 'github',
    name: 'GitHub',
    description: 'GitHub connector',
    iconPath: '',
    categories: [],
  } as any,
  actions: {
    listIssues: {
      isTool: false,
      input: {} as any,
      handler: jest.fn(),
    },
    createIssue: {
      isTool: true,
      input: {} as any,
      handler: jest.fn(),
    },
  },
  test: {
    handler: jest.fn().mockResolvedValue(undefined),
  } as any,
};

describe('CONN-007: Connector preflight health API', () => {
  it('returns ok=true for all actions when test passes', async () => {
    const results = await runPreflight(mockConnector, mockCtx, {
      connectorId: 'github-1',
    });

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it('returns ok=false for unknown action', async () => {
    const results = await runPreflight(mockConnector, mockCtx, {
      connectorId: 'github-1',
      actions: ['nonexistent'],
    });

    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(false);
    expect(results[0].error).toContain('does not exist');
  });

  it('returns ok=false when auth check fails', async () => {
    const failingConnector: ConnectorSpec = {
      ...mockConnector,
      test: {
        handler: jest.fn().mockRejectedValue(new Error('missing scope: repo')),
      } as any,
    };

    const results = await runPreflight(failingConnector, mockCtx, {
      connectorId: 'github-1',
      actions: ['listIssues'],
    });

    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(false);
    expect(results[0].error).toContain('missing scope: repo');
  });

  it('checks only specified actions when actions array is provided', async () => {
    const results = await runPreflight(mockConnector, mockCtx, {
      connectorId: 'github-1',
      actions: ['createIssue'],
    });

    expect(results).toHaveLength(1);
    expect(results[0].action).toBe('createIssue');
    expect(results[0].ok).toBe(true);
  });
});
