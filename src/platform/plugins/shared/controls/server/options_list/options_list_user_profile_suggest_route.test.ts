/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MockedKeys } from '@kbn/utility-types-jest';
import type { CoreSetup } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { setupOptionsListUserProfileSuggestRoute } from './options_list_user_profile_suggest_route';

describe('setupOptionsListUserProfileSuggestRoute', () => {
  let mockCoreSetup: MockedKeys<CoreSetup>;
  let suggestMock: jest.Mock;

  const getHandler = () => {
    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    return mockRouter.versioned.get.mock.results[0].value.addVersion.mock.calls[0][1];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreSetup = coreMock.createSetup();
    suggestMock = jest.fn();
    const getStartServicesMock = mockCoreSetup.getStartServices as unknown as jest.MockedFunction<
      CoreSetup['getStartServices']
    >;
    getStartServicesMock.mockImplementation(
      async () => [{ userProfile: { suggest: suggestMock } }, {}, {}] as any
    );
    setupOptionsListUserProfileSuggestRoute(mockCoreSetup);
  });

  it('suggests user profiles using core userProfile service', async () => {
    suggestMock.mockResolvedValue([{ uid: 'uid-1' }]);
    const handler = getHandler();
    const request = httpServerMock.createKibanaRequest({
      query: { searchTerm: 'john' },
    });
    const response = httpServerMock.createResponseFactory();

    await handler({} as any, request, response);

    expect(suggestMock).toHaveBeenCalledWith({ name: 'john', dataPath: 'avatar' });
    expect(response.ok).toHaveBeenCalledWith({ body: [{ uid: 'uid-1' }] });
  });

  it('returns an empty list when suggest fails', async () => {
    suggestMock.mockRejectedValue(new Error('failed'));
    const handler = getHandler();
    const request = httpServerMock.createKibanaRequest({
      query: { searchTerm: 'john' },
    });
    const response = httpServerMock.createResponseFactory();

    await handler({} as any, request, response);

    expect(response.ok).toHaveBeenCalledWith({ body: [] });
  });
});
