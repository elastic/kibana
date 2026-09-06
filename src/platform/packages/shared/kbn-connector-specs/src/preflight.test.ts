/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runPreflight } from './preflight';
import type { ConnectorSpec, ActionContext } from './connector_spec';
import type { Logger } from '@kbn/logging';
import { z } from '@kbn/zod/v4';

const mockCtx: ActionContext = {
  client: {} as ActionContext['client'],
  getClient: jest.fn(),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger,
};

const mockConnector: ConnectorSpec = {
  metadata: {
    id: 'github',
    displayName: 'GitHub',
    description: 'GitHub connector',
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },
  actions: {
    listIssues: {
      isTool: false,
      input: z.object({}),
      handler: jest.fn().mockResolvedValue({}),
    },
    createIssue: {
      isTool: true,
      input: z.object({}),
      handler: jest.fn().mockResolvedValue({}),
    },
  },
  test: {
    enabled: true,
    handler: jest.fn().mockResolvedValue({}),
  },
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
        enabled: true,
        handler: jest.fn().mockRejectedValue(new Error('missing scope: repo')),
      },
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
