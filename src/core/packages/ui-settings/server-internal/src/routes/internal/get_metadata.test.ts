/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { registerInternalGetMetadataRoute } from './get_metadata';

const createClientMock = () => ({
  getRegistered: jest.fn().mockReturnValue({}),
  getUserProvided: jest.fn().mockResolvedValue({}),
});

const setup = () => {
  const router = httpServiceMock.createRouter();
  registerInternalGetMetadataRoute(router);

  const client = createClientMock();
  const globalClient = createClientMock();
  const context = { core: Promise.resolve({ uiSettings: { client, globalClient } }) };
  const response = httpServerMock.createResponseFactory();
  const callRoute = (path: string) => {
    const [, handler] = router.get.mock.calls.find(([config]) => config.path === path) ?? [];
    if (!handler) {
      throw new Error(`No route registered for ${path}`);
    }
    return handler(context, httpServerMock.createKibanaRequest(), response);
  };

  return { router, client, globalClient, response, callRoute };
};

describe('registerInternalGetMetadataRoute', () => {
  it('registers the namespace and global metadata routes as internal', () => {
    const { router } = setup();

    expect(router.get.mock.calls.map(([config]) => [config.path, config.options])).toEqual([
      ['/internal/kibana/settings/metadata', { access: 'internal' }],
      ['/internal/kibana/global_settings/metadata', { access: 'internal' }],
    ]);
  });

  it.each([
    ['/internal/kibana/settings/metadata', 'client'],
    ['/internal/kibana/global_settings/metadata', 'globalClient'],
  ] as const)(
    '%s returns the definitions merged with user values from the %s',
    async (path, clientName) => {
      const mocks = setup();
      const scopeClient = mocks[clientName];
      scopeClient.getRegistered.mockReturnValue({
        title: { name: 'Title', value: 'Kibana', description: 'The title of the page' },
        theme: { name: 'Theme', value: 'light', options: ['light', 'dark'] },
      });
      scopeClient.getUserProvided.mockResolvedValue({
        title: { userValue: 'My Kibana' },
        unregistered: { userValue: 'leftover', isOverridden: true },
      });

      await mocks.callRoute(path);

      expect(mocks.response.ok).toHaveBeenCalledWith({
        body: {
          settings: {
            title: {
              name: 'Title',
              value: 'Kibana',
              description: 'The title of the page',
              userValue: 'My Kibana',
            },
            theme: { name: 'Theme', value: 'light', options: ['light', 'dark'] },
            unregistered: { userValue: 'leftover', isOverridden: true },
          },
        },
      });
      const otherClient = mocks[clientName === 'client' ? 'globalClient' : 'client'];
      expect(otherClient.getRegistered).not.toHaveBeenCalled();
      expect(otherClient.getUserProvided).not.toHaveBeenCalled();
    }
  );

  it('returns the status code of a saved objects error', async () => {
    const { client, response, callRoute } = setup();
    const error = SavedObjectsErrorHelpers.decorateForbiddenError(new Error('Forbidden'));
    client.getUserProvided.mockRejectedValue(error);

    await callRoute('/internal/kibana/settings/metadata');

    expect(response.customError).toHaveBeenCalledWith({ body: error, statusCode: 403 });
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('rethrows other errors', async () => {
    const { client, callRoute } = setup();
    client.getUserProvided.mockRejectedValue(new Error('Unexpected failure'));

    await expect(callRoute('/internal/kibana/settings/metadata')).rejects.toThrow(
      'Unexpected failure'
    );
  });
});
