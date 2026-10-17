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

import { getChangeHistoryClient } from './change_history_service';
import { getChangeHistoryContext } from './route_utils';

jest.mock('./change_history_service');
const mockUseRbacForRequest = jest.fn();
jest.mock('../kibana_services', () => ({
  securityService: {
    authz: { mode: { useRbacForRequest: (...args: unknown[]) => mockUseRbacForRequest(...args) } },
  },
  spacesService: { getSpaceId: (req: { id: string }) => `space-for-${req.id}` },
}));

const mockedGetClient = getChangeHistoryClient as jest.MockedFunction<
  typeof getChangeHistoryClient
>;

const hasPrivileges = jest.fn();
const getSavedObject = jest.fn();

const getContext = (hasAllRequested: boolean) => {
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
    getSavedObject.mockResolvedValue({ attributes: {} });
    const client = { getHistory: jest.fn().mockResolvedValue({ items: [] }) };
    mockedGetClient.mockReturnValue(client as never);
    const res = httpServerMock.createResponseFactory();
    const result = await getChangeHistoryContext(getContext(false), req, res, 'dash-1');

    expect(hasPrivileges).not.toHaveBeenCalled();
    expect(result).toEqual({ client, spaceId: 'space-for-req-1', currentSequence: undefined });
  });

  it('returns a forbidden response without dashboard edit privileges', async () => {
    const res = httpServerMock.createResponseFactory();
    const forbidden = { status: 403 };
    res.forbidden.mockReturnValue(forbidden as never);
    const result = await getChangeHistoryContext(getContext(false), req, res, 'dash-1');

    expect(result).toEqual({ error: forbidden });
    expect(mockedGetClient).not.toHaveBeenCalled();
  });

  it('returns forbidden when the user cannot access the dashboard saved object', async () => {
    getSavedObject.mockRejectedValue(SavedObjectsErrorHelpers.decorateForbiddenError(new Error()));
    const res = httpServerMock.createResponseFactory();
    const forbidden = { status: 403 };
    res.forbidden.mockReturnValue(forbidden as never);
    const result = await getChangeHistoryContext(getContext(true), req, res, 'dash-1');

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
    const result = await getChangeHistoryContext(getContext(true), req, res, 'dash-1');

    expect(result).toEqual({ error: notFound });
    expect(mockedGetClient).not.toHaveBeenCalled();
  });

  it('checks dashboard edit privileges on the space of the request', async () => {
    mockedGetClient.mockReturnValue({} as never);
    await getChangeHistoryContext(
      getContext(true),
      req,
      httpServerMock.createResponseFactory(),
      'dash-1'
    );

    expect(hasPrivileges).toHaveBeenCalledWith({
      application: [
        {
          application: 'kibana-.kibana',
          resources: ['space:space-for-req-1'],
          privileges: ['feature_dashboard_v2.all'],
        },
      ],
    });
  });

  it('returns a 503 when the change history client is not ready', async () => {
    mockedGetClient.mockImplementation(() => {
      throw new Error('not ready');
    });
    const res = httpServerMock.createResponseFactory();
    const unavailable = { status: 503 };
    res.customError.mockReturnValue(unavailable as never);
    const result = await getChangeHistoryContext(getContext(true), req, res, 'dash-1');

    expect(res.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
    expect(result).toEqual({ error: unavailable });
  });

  it('returns the client, the space of the request and the latest history sequence', async () => {
    const client = {
      getHistory: jest.fn().mockResolvedValue({ items: [{ object: { sequence: 3 } }] }),
    };
    mockedGetClient.mockReturnValue(client as never);
    const res = httpServerMock.createResponseFactory();
    const result = await getChangeHistoryContext(getContext(true), req, res, 'dash-1');

    expect(result).toEqual({ client, spaceId: 'space-for-req-1', currentSequence: 3 });
  });
});
