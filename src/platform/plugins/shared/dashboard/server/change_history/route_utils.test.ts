/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';

import { getChangeHistoryClient } from './change_history_service';
import { getChangeHistoryContext } from './route_utils';

jest.mock('./change_history_service');
jest.mock('../kibana_services', () => ({
  spacesService: { getSpaceId: (req: { id: string }) => `space-for-${req.id}` },
}));

const mockedGetClient = getChangeHistoryClient as jest.MockedFunction<
  typeof getChangeHistoryClient
>;

const getContext = (hasAllRequested: boolean) =>
  ({
    core: Promise.resolve({
      elasticsearch: {
        client: {
          asCurrentUser: {
            security: {
              hasPrivileges: jest.fn().mockResolvedValue({ has_all_requested: hasAllRequested }),
            },
          },
        },
      },
    }),
  } as unknown as RequestHandlerContext);

describe('getChangeHistoryContext', () => {
  const req = { id: 'req-1' } as unknown as KibanaRequest<unknown, unknown, unknown, 'get'>;

  beforeEach(() => jest.resetAllMocks());

  it('returns a forbidden response without dashboard edit privileges', async () => {
    const res = httpServerMock.createResponseFactory();
    const forbidden = { status: 403 };
    res.forbidden.mockReturnValue(forbidden as never);
    const result = await getChangeHistoryContext(getContext(false), req, res);

    expect(result).toEqual({ error: forbidden });
    expect(mockedGetClient).not.toHaveBeenCalled();
  });

  it('returns a 503 when the change history client is not ready', async () => {
    mockedGetClient.mockImplementation(() => {
      throw new Error('not ready');
    });
    const res = httpServerMock.createResponseFactory();
    const unavailable = { status: 503 };
    res.customError.mockReturnValue(unavailable as never);
    const result = await getChangeHistoryContext(getContext(true), req, res);

    expect(res.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
    expect(result).toEqual({ error: unavailable });
  });

  it('returns the client and the space of the request', async () => {
    const client = {};
    mockedGetClient.mockReturnValue(client as never);
    const res = httpServerMock.createResponseFactory();
    const result = await getChangeHistoryContext(getContext(true), req, res);

    expect(result).toEqual({ client, spaceId: 'space-for-req-1' });
  });
});
