/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';

import { getChangeHistoryClient } from './change_history_service';
import { transformDashboardOut } from '../api/transforms';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import {
  addToHistory,
  getHistorySequences,
  getChangeHistoryContext,
  getHistorySnapshot,
  getNextHistorySequence,
  hasContentChanged,
} from './utils';

jest.mock('./change_history_service');
const mockUseRbacForRequest = jest.fn();
const mockWarn = jest.fn();
jest.mock('../kibana_services', () => ({
  logger: { warn: (...args: unknown[]) => mockWarn(...args) },
  securityService: {
    authz: { mode: { useRbacForRequest: (...args: unknown[]) => mockUseRbacForRequest(...args) } },
  },
  spacesService: { getSpaceId: (req: { id: string }) => `space-for-${req.id}` },
}));
jest.mock('../api/transforms');

const mockedGetClient = getChangeHistoryClient as jest.MockedFunction<
  typeof getChangeHistoryClient
>;

const baseArgs = {
  dashboardId: 'dash-1',
  spaceId: 'default',
  timestamp: '2026-01-01T00:00:00.000Z',
  snapshot: { title: 'New' } as DashboardState,
};

describe('getHistorySequences', () => {
  beforeEach(() => jest.resetAllMocks());

  it('continues after the latest existing sequence', async () => {
    const client = {
      getHistory: jest.fn().mockResolvedValue({ items: [{ object: { sequence: 2 } }] }),
    };
    mockedGetClient.mockResolvedValue(client as never);
    expect((await getHistorySequences({ spaceId: 'default', dashboardId: 'dash-1' })).next).toBe(3);
  });

  it('starts at the initial sequence when there is no history', async () => {
    const client = { getHistory: jest.fn().mockResolvedValue({ items: [] }) };
    mockedGetClient.mockResolvedValue(client as never);
    expect((await getHistorySequences({ spaceId: 'default', dashboardId: 'dash-1' })).next).toBe(1);
  });

  it('starts at the initial sequence when the client is unavailable', async () => {
    mockedGetClient.mockRejectedValue(new Error('not ready'));
    expect((await getHistorySequences({ spaceId: 'default', dashboardId: 'dash-1' })).next).toBe(1);
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('dash-1'));
  });
});

describe('getNextHistorySequence', () => {
  beforeEach(() => jest.resetAllMocks());

  it('continues from the stored sequence without reading history', async () => {
    expect(
      await getNextHistorySequence({
        spaceId: 'default',
        dashboardId: 'dash-1',
        currentSequence: 4,
      })
    ).toBe(5);
    expect(mockedGetClient).not.toHaveBeenCalled();
  });

  it('continues from the history when no sequence is stored', async () => {
    const client = {
      getHistory: jest.fn().mockResolvedValue({ items: [{ object: { sequence: 7 } }] }),
    };
    mockedGetClient.mockResolvedValue(client as never);
    expect(
      await getNextHistorySequence({
        spaceId: 'default',
        dashboardId: 'dash-1',
        currentSequence: undefined,
      })
    ).toBe(8);
  });
});

describe('addToHistory', () => {
  const getContext = (user: unknown = { username: 'elastic', profile_uid: 'u_1' }) =>
    ({
      core: Promise.resolve({ security: { authc: { getCurrentUser: () => user } } }),
    }) as unknown as RequestHandlerContext;

  const getClient = (latestHistorySnapshot?: DashboardState) => ({
    getHistory: jest.fn().mockResolvedValue({
      items: latestHistorySnapshot ? [{ object: { snapshot: latestHistorySnapshot } }] : [],
    }),
    log: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => jest.resetAllMocks());

  it('logs without an actor when there is no authenticated user (security disabled)', async () => {
    const client = getClient();
    mockedGetClient.mockResolvedValue(client as never);
    await addToHistory({ ...baseArgs, ctx: getContext(null), sequence: 1 });
    expect(client.log).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ username: '', userProfileId: undefined })
    );
  });

  it('does nothing when the change history client is not ready', async () => {
    mockedGetClient.mockRejectedValue(new Error('not ready'));
    await expect(
      addToHistory({ ...baseArgs, ctx: getContext(), sequence: 1 })
    ).resolves.toBeUndefined();
  });

  it('logs the first version without a change count', async () => {
    const client = getClient();
    mockedGetClient.mockResolvedValue(client as never);
    await addToHistory({ ...baseArgs, ctx: getContext(), sequence: 1 });

    expect(client.log).toHaveBeenCalledWith(
      {
        objectType: 'dashboard',
        objectId: 'dash-1',
        sequence: 1,
        snapshot: baseArgs.snapshot,
        timestamp: baseArgs.timestamp,
      },
      expect.objectContaining({
        action: 'dashboard_update',
        username: 'elastic',
        userProfileId: 'u_1',
        spaceId: 'default',
        data: { metadata: {} },
      })
    );
  });

  it('logs deletes with their sequence and waits for refresh so that a recreated ID continues after it', async () => {
    const client = getClient();
    mockedGetClient.mockResolvedValue(client as never);
    await addToHistory({ ...baseArgs, ctx: getContext(), sequence: 4, type: 'delete' });

    expect(client.log).toHaveBeenCalledWith(
      expect.objectContaining({ objectId: 'dash-1', sequence: 4 }),
      expect.objectContaining({ action: 'dashboard_delete', refresh: 'wait_for' })
    );
  });

  it('stores the change count compared with the previous snapshot', async () => {
    const client = getClient();
    mockedGetClient.mockResolvedValue(client as never);
    await addToHistory({
      ...baseArgs,
      ctx: getContext(),
      sequence: 2,
      previousSnapshot: { title: 'Old' } as DashboardState,
    });

    expect(client.log.mock.calls[0][1].data.metadata).toEqual({ changeCount: 1 });
    expect(client.log.mock.calls[0][1].refresh).toBeUndefined();
  });

  it('does not read history to compute the change count, since it lags behind saves', async () => {
    // e.g. v1 is still the latest searchable event while saving v3
    const client = getClient({ ...baseArgs.snapshot, title: 'v1' } as DashboardState);
    mockedGetClient.mockResolvedValue(client as never);
    await addToHistory({
      ...baseArgs,
      ctx: getContext(),
      sequence: 3,
      previousSnapshot: baseArgs.snapshot,
    });

    expect(client.getHistory).not.toHaveBeenCalled();
  });

  it('records restoredFrom and waits for refresh on restore', async () => {
    const client = getClient();
    mockedGetClient.mockResolvedValue(client as never);
    await addToHistory({
      ...baseArgs,
      ctx: getContext(),
      previousSnapshot: { title: 'Old' } as DashboardState,
      sequence: 5,
      restoredFrom: 2,
    });

    const options = client.log.mock.calls[0][1];
    expect(options.data.metadata).toEqual({ changeCount: 1, restoredFrom: 2 });
    expect(options.refresh).toBe('wait_for');
  });

  it('swallows history write failures', async () => {
    const client = getClient();
    client.log.mockRejectedValue(new Error('boom'));
    mockedGetClient.mockResolvedValue(client as never);
    await expect(
      addToHistory({ ...baseArgs, ctx: getContext(), sequence: 1 })
    ).resolves.toBeUndefined();
  });
});

describe('getHistorySnapshot', () => {
  const args = {
    dashboardId: 'dash-1',
    attributes: {} as never,
    references: [],
    strictValidationSchema: {} as never,
  };

  it('transforms the stored state using the dashboard-app panel format', () => {
    (transformDashboardOut as jest.Mock).mockReturnValue({
      dashboardState: { title: 'New' },
      warnings: [],
    });
    const snapshot = getHistorySnapshot(args);

    expect(transformDashboardOut).toHaveBeenCalledWith(
      args.attributes,
      args.references,
      true,
      args.strictValidationSchema
    );
    expect(snapshot).toEqual({ title: 'New' });
  });

  it('returns undefined when the state cannot be transformed', () => {
    (transformDashboardOut as jest.Mock).mockImplementation(() => {
      throw new Error('bad panel');
    });
    expect(getHistorySnapshot(args)).toBeUndefined();
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('dash-1'));
  });
});

const getObject = (attributes: Partial<DashboardSavedObjectAttributes>, references = []) => ({
  attributes: { title: 'Dashboard', ...attributes } as DashboardSavedObjectAttributes,
  references,
});

describe('hasContentChanged', () => {
  it('is false when the content is unchanged', () => {
    expect(hasContentChanged(getObject({}), getObject({}))).toBe(false);
  });

  it('ignores the history sequence', () => {
    expect(
      hasContentChanged(getObject({ historySequence: 1 }), getObject({ historySequence: 2 }))
    ).toBe(false);
    expect(hasContentChanged(getObject({ historySequence: 1 }), getObject({}))).toBe(false);
  });

  it('is true when attributes change', () => {
    expect(hasContentChanged(getObject({}), getObject({ title: 'Changed' }))).toBe(true);
  });

  it('is true when references change', () => {
    const next = { ...getObject({}), references: [{ id: '1', name: 'panel_0', type: 'lens' }] };
    expect(hasContentChanged(getObject({}), next)).toBe(true);
  });
});

const hasPrivileges = jest.fn();
const getSavedObject = jest.fn();

const getRouteContext = (hasAllRequested: boolean) => {
  hasPrivileges.mockResolvedValue({ has_all_requested: hasAllRequested });
  return {
    core: Promise.resolve({
      elasticsearch: {
        client: {
          asCurrentUser: {
            security: { hasPrivileges },
          },
        },
      },
      savedObjects: { client: { get: getSavedObject } },
    }),
  } as unknown as RequestHandlerContext;
};

describe('getChangeHistoryContext', () => {
  const req = { id: 'req-1' } as unknown as KibanaRequest<unknown, unknown, unknown, 'get'>;

  beforeEach(() => {
    jest.resetAllMocks();
    mockUseRbacForRequest.mockReturnValue(true);
    getSavedObject.mockResolvedValue({ attributes: {} });
  });

  it('skips the privileges check when security is disabled', async () => {
    mockUseRbacForRequest.mockReturnValue(false);
    const client = { getHistory: jest.fn().mockResolvedValue({ items: [] }) };
    mockedGetClient.mockResolvedValue(client as never);
    const res = httpServerMock.createResponseFactory();
    const result = await getChangeHistoryContext(getRouteContext(false), req, res, 'dash-1');

    expect(hasPrivileges).not.toHaveBeenCalled();
    expect(result).toEqual({ client, spaceId: 'space-for-req-1', currentSequence: undefined });
  });

  it('returns a forbidden response without dashboard edit privileges', async () => {
    const res = httpServerMock.createResponseFactory();
    const forbidden = { status: 403 };
    res.forbidden.mockReturnValue(forbidden as never);
    const result = await getChangeHistoryContext(getRouteContext(false), req, res, 'dash-1');

    expect(result).toEqual({ error: forbidden });
    expect(mockedGetClient).not.toHaveBeenCalled();
  });

  it('returns forbidden when the user cannot access the dashboard saved object', async () => {
    getSavedObject.mockRejectedValue(SavedObjectsErrorHelpers.decorateForbiddenError(new Error()));
    const res = httpServerMock.createResponseFactory();
    const forbidden = { status: 403 };
    res.forbidden.mockReturnValue(forbidden as never);
    const result = await getChangeHistoryContext(getRouteContext(true), req, res, 'dash-1');

    expect(getSavedObject).toHaveBeenCalledWith('dashboard', 'dash-1');
    expect(result).toEqual({ error: forbidden });
    expect(mockedGetClient).not.toHaveBeenCalled();
  });

  it('returns not found when the dashboard saved object does not exist', async () => {
    getSavedObject.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('dashboard', 'dash-1')
    );
    const res = httpServerMock.createResponseFactory();
    const notFound = { status: 404 };
    res.notFound.mockReturnValue(notFound as never);
    const result = await getChangeHistoryContext(getRouteContext(true), req, res, 'dash-1');

    expect(result).toEqual({ error: notFound });
    expect(mockedGetClient).not.toHaveBeenCalled();
  });

  it('checks dashboard edit privileges on the space of the request', async () => {
    mockedGetClient.mockResolvedValue({} as never);
    await getChangeHistoryContext(
      getRouteContext(true),
      req,
      httpServerMock.createResponseFactory(),
      'dash-1'
    );

    expect(hasPrivileges).toHaveBeenCalledWith({
      application: [
        {
          application: 'kibana-.kibana',
          resources: ['space:space-for-req-1'],
          privileges: ['saved_object:dashboard/update'],
        },
      ],
    });
  });

  it('does not require the complete feature_dashboard_v2.all bundle (customized editor role)', async () => {
    mockedGetClient.mockResolvedValue({} as never);
    await getChangeHistoryContext(
      getRouteContext(true),
      req,
      httpServerMock.createResponseFactory(),
      'dash-1'
    );

    const [{ application }] = hasPrivileges.mock.calls[0];
    expect(application[0].privileges).not.toContain('feature_dashboard_v2.all');
  });

  it('returns a 503 when the change history client is not ready', async () => {
    mockedGetClient.mockRejectedValue(new Error('not ready'));
    const res = httpServerMock.createResponseFactory();
    const unavailable = { status: 503 };
    res.customError.mockReturnValue(unavailable as never);
    const result = await getChangeHistoryContext(getRouteContext(true), req, res, 'dash-1');

    expect(res.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
    expect(result).toEqual({ error: unavailable });
  });

  it('uses the saved object history sequence even when history is behind', async () => {
    getSavedObject.mockResolvedValue({ attributes: { historySequence: 5 } });
    const client = {
      getHistory: jest.fn().mockResolvedValue({ items: [{ object: { sequence: 3 } }] }),
    };
    mockedGetClient.mockResolvedValue(client as never);
    const res = httpServerMock.createResponseFactory();
    const result = await getChangeHistoryContext(getRouteContext(true), req, res, 'dash-1');

    expect(result).toEqual({ client, spaceId: 'space-for-req-1', currentSequence: 5 });
  });

  it('falls back to the latest history sequence when the saved object has none', async () => {
    const client = {
      getHistory: jest.fn().mockResolvedValue({ items: [{ object: { sequence: 3 } }] }),
    };
    mockedGetClient.mockResolvedValue(client as never);
    const res = httpServerMock.createResponseFactory();
    const result = await getChangeHistoryContext(getRouteContext(true), req, res, 'dash-1');

    expect(result).toEqual({ client, spaceId: 'space-for-req-1', currentSequence: 3 });
  });
});
