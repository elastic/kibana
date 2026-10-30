/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { FavoritesClient } from './favorites_client';

const setup = (enabled = true, type = '../type?') => {
  const http = httpServiceMock.createStartContract();
  const userProfile = userProfileServiceMock.createStart();
  userProfile.getEnabled$.mockReturnValue(of(enabled));
  const client = new FavoritesClient<{ label: string }>('test', type, { http, userProfile });
  return { http, client };
};

test('encodes favorite types and IDs while preserving metadata', async () => {
  const { http, client } = setup();
  await client.getFavorites();
  expect(http.get).toHaveBeenCalledWith('/internal/content_management/favorites/..%2Ftype%3F');
  await client.addFavorite({ id: '../a?b#c%/café', metadata: { label: 'label' } });
  expect(http.post).toHaveBeenLastCalledWith(
    '/internal/content_management/favorites/..%2Ftype%3F/..%2Fa%3Fb%23c%25%2Fcaf%C3%A9/favorite',
    { body: JSON.stringify({ metadata: { label: 'label' } }) }
  );
  await client.removeFavorite({ id: '../a?b#c%/café' });
  expect(http.post).toHaveBeenLastCalledWith(
    '/internal/content_management/favorites/..%2Ftype%3F/..%2Fa%3Fb%23c%25%2Fcaf%C3%A9/unfavorite'
  );
});

test('preserves ordinary favorite paths', async () => {
  const { http, client } = setup(true, 'dashboard');
  await client.getFavorites();
  await client.addFavorite({ id: '123', metadata: { label: 'label' } });
  await client.removeFavorite({ id: '123' });
  expect(http.get).toHaveBeenCalledWith('/internal/content_management/favorites/dashboard');
  expect(http.post).toHaveBeenNthCalledWith(
    1,
    '/internal/content_management/favorites/dashboard/123/favorite',
    { body: JSON.stringify({ metadata: { label: 'label' } }) }
  );
  expect(http.post).toHaveBeenNthCalledWith(
    2,
    '/internal/content_management/favorites/dashboard/123/unfavorite'
  );
});

test('does not request favorites when user profiles are unavailable', async () => {
  const { http, client } = setup(false);
  await expect(client.getFavorites()).resolves.toEqual({ favoriteIds: [], favoriteMetadata: {} });
  await expect(client.addFavorite({ id: '123', metadata: { label: 'label' } })).resolves.toEqual({
    favoriteIds: [],
  });
  await expect(client.removeFavorite({ id: '123' })).resolves.toEqual({ favoriteIds: [] });
  expect(http.get).not.toHaveBeenCalled();
  expect(http.post).not.toHaveBeenCalled();
});
