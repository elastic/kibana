/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CanonicalAcl } from '@kbn/access-control';
import type { ConnectorWithAcl } from '@kbn/actions-plugin/server/application/connector/types';
import { httpServerMock, securityServiceMock } from '@kbn/core/server/mocks';
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

const mockGetAllWithAcl = (
  connectors: Array<ReturnType<typeof mockConnector>>,
  acls: Record<string, CanonicalAcl> = {}
) =>
  jest
    .fn()
    .mockResolvedValue(
      connectors.map((connector) => ({ connector, acl: acls[connector.id] } as ConnectorWithAcl))
    );

describe('getAvailableConnectors', () => {
  const request = httpServerMock.createKibanaRequest();
  let accessControl: ReturnType<typeof securityServiceMock.createStart>['accessControl'];

  beforeEach(() => {
    accessControl = securityServiceMock.createStart().accessControl;
  });

  it('groups connectors by type and returns the configured action-type metadata', async () => {
    const actionsClient = { getAllWithAcl: mockGetAllWithAcl([mockConnector()]) };
    const actionsClientWithRequest = {
      listTypes: jest.fn().mockResolvedValue([mockActionType()]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      accessControl,
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
    const actionsClient = { getAllWithAcl: mockGetAllWithAcl([]) };
    const actionsClientWithRequest = {
      listTypes: jest.fn().mockResolvedValue([mockActionType({ id: '.email', name: 'Email' })]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      accessControl,
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.email'].instances).toEqual([]);
    expect(result.totalConnectors).toBe(0);
  });

  it('drops connectors whose actionTypeId is not in the allowed action-types list', async () => {
    const actionsClient = {
      getAllWithAcl: mockGetAllWithAcl([
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
      accessControl,
      spaceId: 'default',
      request,
    });

    expect(Object.keys(result.connectorTypes)).toEqual(['.slack']);
    expect(result.connectorTypes['.slack'].instances).toHaveLength(1);
    // `totalConnectors` still counts every visible connector, even those of types we filter out —
    // the facade previously asserted this; preserving here as regression guard.
    expect(result.totalConnectors).toBe(2);
  });

  it('groups multiple instances of the same type together', async () => {
    const actionsClient = {
      getAllWithAcl: mockGetAllWithAcl([
        mockConnector(),
        mockConnector({ id: 'slack-2', name: 'Secondary' }),
      ]),
    };
    const actionsClientWithRequest = {
      listTypes: jest.fn().mockResolvedValue([mockActionType()]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      accessControl,
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
      getAllWithAcl: mockGetAllWithAcl([
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
      accessControl,
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.inference'].instances[0]).toMatchObject({
      id: 'inf-1',
      config: { taskType: 'text_classification' },
    });
  });

  it('surfaces selectedActions config for any connector that has it', async () => {
    const actionsClient = {
      getAllWithAcl: mockGetAllWithAcl([
        mockConnector({
          id: 'pd-1',
          name: 'PagerDuty',
          actionTypeId: '.pagerduty_mcp',
          config: { selectedActions: ['listIncidents', 'getIncident'] },
        }),
      ]),
    };
    const actionsClientWithRequest = {
      listTypes: jest
        .fn()
        .mockResolvedValue([mockActionType({ id: '.pagerduty_mcp', name: 'PagerDuty MCP' })]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      accessControl,
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.pagerduty_mcp'].instances[0]).toMatchObject({
      id: 'pd-1',
      config: { selectedActions: ['listIncidents', 'getIncident'] },
    });
  });

  it('omits config entirely for connectors with no taskType or selectedActions', async () => {
    const actionsClient = {
      getAllWithAcl: mockGetAllWithAcl([
        mockConnector({ id: 'slack-1', actionTypeId: '.slack', config: {} }),
      ]),
    };
    const actionsClientWithRequest = {
      listTypes: jest.fn().mockResolvedValue([mockActionType({ id: '.slack', name: 'Slack' })]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      accessControl,
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.slack'].instances[0].config).toBeUndefined();
  });

  it('surfaces both taskType and selectedActions for an inference connector that has both', async () => {
    const actionsClient = {
      getAllWithAcl: mockGetAllWithAcl([
        mockConnector({
          id: 'inf-2',
          actionTypeId: '.inference',
          config: { taskType: 'completion', selectedActions: ['chat'] },
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
      accessControl,
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.inference'].instances[0]).toMatchObject({
      id: 'inf-2',
      config: { taskType: 'completion', selectedActions: ['chat'] },
    });
  });

  it('includes inbound webhook types omitted from the workflows feature list', async () => {
    const inboundType = mockActionType({
      id: '.inboundWebhook',
      name: 'Inbound Webhook',
      minimumLicenseRequired: 'gold',
    });
    const actionsClient = {
      getAllWithAcl: mockGetAllWithAcl([
        mockConnector({
          id: 'testyng',
          name: 'testyng',
          actionTypeId: '.inboundWebhook',
        }),
      ]),
    };
    const actionsClientWithRequest = {
      listTypes: jest
        .fn()
        .mockResolvedValueOnce([mockActionType()])
        .mockResolvedValueOnce([mockActionType(), inboundType]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      accessControl,
      spaceId: 'default',
      request,
    });

    expect(actionsClientWithRequest.listTypes).toHaveBeenCalledTimes(2);
    expect(result.connectorTypes['.inboundWebhook']).toMatchObject({
      actionTypeId: '.inboundWebhook',
      displayName: 'Inbound Webhook',
      instances: [{ id: 'testyng', name: 'testyng', isPreconfigured: false }],
    });
  });

  it('returns an empty payload when there are neither connectors nor action types', async () => {
    const actionsClient = { getAllWithAcl: mockGetAllWithAcl([]) };
    const actionsClientWithRequest = { listTypes: jest.fn().mockResolvedValue([]) };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      accessControl,
      spaceId: 'default',
      request,
    });

    expect(result).toEqual({ connectorTypes: {}, totalConnectors: 0 });
  });

  it('fires getAllWithAcl and listTypes in parallel (both started before either resolves)', async () => {
    const order: string[] = [];
    const getAllWithAcl = jest.fn().mockImplementation(async () => {
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
      getActionsClient: jest.fn().mockResolvedValue({ getAllWithAcl }),
      getActionsClientWithRequest: jest.fn().mockResolvedValue({ listTypes }),
      accessControl,
      spaceId: 'default',
      request,
    });

    // Both starts precede both ends — proves parallel, not sequential.
    expect(order.indexOf('getAll:start')).toBeLessThan(order.indexOf('listTypes:end'));
    expect(order.indexOf('listTypes:start')).toBeLessThan(order.indexOf('getAll:end'));
  });

  describe('object-level security', () => {
    const PRIVATE_ACL: CanonicalAcl = {
      version: [1],
      owner: { type: ['user'], id: ['u_owner'] },
      general_access: ['none'],
      entries: [],
    };
    const connectors = [
      mockConnector({ id: 'public', name: 'Public Slack' }),
      mockConnector({ id: 'private', name: 'Private Slack' }),
      mockConnector({ id: 'preconfigured', name: 'Preconfigured Slack', isPreconfigured: true }),
    ];

    const listConnectors = (
      filterVisible: (objects: Array<{ id: string; acl?: CanonicalAcl }>) => string[]
    ) => {
      const scoped = securityServiceMock.createScopedAccessControl();
      scoped.filterVisible.mockImplementation(async ({ objects }) => {
        const visibleIds = filterVisible(objects);
        return objects.filter(({ id }) => visibleIds.includes(id));
      });
      accessControl.asScoped.mockReturnValue(scoped);

      const actionsClient = {
        getAllWithAcl: mockGetAllWithAcl(connectors, { private: PRIVATE_ACL }),
      };
      return {
        scoped,
        actionsClient,
        result: getAvailableConnectors({
          getActionsClient: jest.fn().mockResolvedValue(actionsClient),
          getActionsClientWithRequest: jest.fn().mockResolvedValue({
            listTypes: jest.fn().mockResolvedValue([mockActionType()]),
          }),
          accessControl,
          spaceId: 'my-space',
          request,
        }),
      };
    };

    it('keeps an unrestricted list unchanged', async () => {
      const { result, actionsClient } = listConnectors((objects) => objects.map(({ id }) => id));

      const { connectorTypes, totalConnectors } = await result;

      expect(actionsClient.getAllWithAcl).toHaveBeenCalledWith('my-space');
      expect(connectorTypes['.slack'].instances.map(({ id }) => id)).toEqual([
        'public',
        'private',
        'preconfigured',
      ]);
      expect(totalConnectors).toBe(3);
    });

    it('leaves out a restricted connector the request cannot view, and does not count it', async () => {
      const { result, scoped } = listConnectors((objects) =>
        objects.filter(({ acl }) => !acl).map(({ id }) => id)
      );

      const { connectorTypes, totalConnectors } = await result;

      expect(accessControl.asScoped).toHaveBeenCalledWith(request);
      expect(scoped.filterVisible).toHaveBeenCalledWith({
        type: 'action',
        spaceId: 'my-space',
        objects: [
          expect.objectContaining({ id: 'public', acl: undefined }),
          expect.objectContaining({ id: 'private', acl: PRIVATE_ACL }),
          expect.objectContaining({ id: 'preconfigured', acl: undefined }),
        ],
      });
      expect(connectorTypes['.slack'].instances.map(({ id }) => id)).toEqual([
        'public',
        'preconfigured',
      ]);
      expect(totalConnectors).toBe(2);
    });

    it('never returns the ACL with a connector', async () => {
      const { result } = listConnectors((objects) => objects.map(({ id }) => id));

      const { connectorTypes } = await result;

      expect(JSON.stringify(connectorTypes)).not.toContain('u_owner');
    });
  });
});
