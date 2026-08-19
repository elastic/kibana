/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAvailableConnectors } from './workflow_connectors';

const mockActionType = (overrides: Record<string, unknown> = {}) => ({
  id: '.slack',
  name: 'Slack',
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'basic',
  ...overrides,
});

const mockConnector = (overrides: Record<string, unknown> = {}) => ({
  id: 'slack-1',
  name: 'Primary Slack',
  actionTypeId: '.slack',
  isPreconfigured: false,
  isDeprecated: false,
  config: {},
  ...overrides,
});

describe('getAvailableConnectors', () => {
  const request = {} as any;

  it('groups connectors by type and returns the configured action-type metadata', async () => {
    const actionsClient = { getAll: jest.fn().mockResolvedValue([mockConnector()]) };
    const actionsClientWithRequest = {
      listTypes: jest.fn().mockResolvedValue([mockActionType()]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      spaceId: 'default',
      request,
    });

    expect(result.totalConnectors).toBe(1);
    expect(result.connectorTypes['.slack']).toMatchObject({
      actionTypeId: '.slack',
      displayName: 'Slack',
      enabled: true,
      instances: [{ id: 'slack-1', name: 'Primary Slack', isPreconfigured: false }],
    });
  });

  it('includes action types that have no connector instances with an empty instances array', async () => {
    const actionsClient = { getAll: jest.fn().mockResolvedValue([]) };
    const actionsClientWithRequest = {
      listTypes: jest.fn().mockResolvedValue([mockActionType({ id: '.email', name: 'Email' })]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.email'].instances).toEqual([]);
    expect(result.totalConnectors).toBe(0);
  });

  it('drops connectors whose actionTypeId is not in the allowed action-types list', async () => {
    const actionsClient = {
      getAll: jest
        .fn()
        .mockResolvedValue([
          mockConnector(),
          mockConnector({ id: 'legacy-1', actionTypeId: '.legacy' }),
        ]),
    };
    const actionsClientWithRequest = {
      listTypes: jest.fn().mockResolvedValue([mockActionType()]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      spaceId: 'default',
      request,
    });

    expect(Object.keys(result.connectorTypes)).toEqual(['.slack']);
    expect(result.connectorTypes['.slack'].instances).toHaveLength(1);
    // `totalConnectors` still reflects the raw connector count, even those we filter out — the
    // facade previously asserted this; preserving here as regression guard.
    expect(result.totalConnectors).toBe(2);
  });

  it('groups multiple instances of the same type together', async () => {
    const actionsClient = {
      getAll: jest
        .fn()
        .mockResolvedValue([mockConnector(), mockConnector({ id: 'slack-2', name: 'Secondary' })]),
    };
    const actionsClientWithRequest = {
      listTypes: jest.fn().mockResolvedValue([mockActionType()]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.slack'].instances.map((i) => i.id)).toEqual([
      'slack-1',
      'slack-2',
    ]);
  });

  it('surfaces inference taskType config in the instance payload', async () => {
    const actionsClient = {
      getAll: jest.fn().mockResolvedValue([
        mockConnector({
          id: 'inf-1',
          name: 'Inference',
          actionTypeId: '.inference',
          config: { taskType: 'text_classification' },
        }),
      ]),
    };
    const actionsClientWithRequest = {
      listTypes: jest
        .fn()
        .mockResolvedValue([mockActionType({ id: '.inference', name: 'Inference' })]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.inference'].instances[0]).toMatchObject({
      id: 'inf-1',
      config: { taskType: 'text_classification' },
    });
  });

  it('returns an empty payload when there are neither connectors nor action types', async () => {
    const actionsClient = { getAll: jest.fn().mockResolvedValue([]) };
    const actionsClientWithRequest = { listTypes: jest.fn().mockResolvedValue([]) };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      spaceId: 'default',
      request,
    });

    expect(result).toEqual({ connectorTypes: {}, totalConnectors: 0 });
  });

  it('fires getAll and listTypes in parallel (both started before either resolves)', async () => {
    const order: string[] = [];
    const getAll = jest.fn().mockImplementation(async () => {
      order.push('getAll:start');
      await Promise.resolve();
      order.push('getAll:end');
      return [];
    });
    const listTypes = jest.fn().mockImplementation(async () => {
      order.push('listTypes:start');
      await Promise.resolve();
      order.push('listTypes:end');
      return [];
    });

    await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue({ getAll }),
      getActionsClientWithRequest: jest.fn().mockResolvedValue({ listTypes }),
      spaceId: 'default',
      request,
    });

    // Both starts precede both ends — proves parallel, not sequential.
    expect(order.indexOf('getAll:start')).toBeLessThan(order.indexOf('listTypes:end'));
    expect(order.indexOf('listTypes:start')).toBeLessThan(order.indexOf('getAll:end'));
  });
});
