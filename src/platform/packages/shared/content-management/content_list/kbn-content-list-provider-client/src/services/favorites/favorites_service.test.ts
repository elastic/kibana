/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { FavoritesClient } from '@kbn/content-management-favorites-public';
import { createFavoritesService } from './favorites_service';

jest.mock('@kbn/content-management-favorites-public', () => {
  const actual = jest.requireActual('@kbn/content-management-favorites-public');
  return {
    ...actual,
    FavoritesClient: jest.fn().mockImplementation(function MockFavoritesClient(this: unknown) {
      Object.assign(this as object, { __isMock: true });
    }),
  };
});

describe('createFavoritesService', () => {
  const http = {} as HttpStart;
  const userProfile = {} as UserProfileServiceStart;
  const usageCollection = {} as UsageCollectionStart;

  beforeEach(() => {
    (FavoritesClient as unknown as jest.Mock).mockClear();
  });

  it('constructs a `FavoritesClient` with the supplied app id, saved object type, and core deps', () => {
    const service = createFavoritesService({
      appId: 'dashboards',
      savedObjectType: 'dashboard',
      http,
      userProfile,
      usageCollection,
    });

    expect(FavoritesClient).toHaveBeenCalledTimes(1);
    expect(FavoritesClient).toHaveBeenCalledWith('dashboards', 'dashboard', {
      http,
      userProfile,
      usageCollection,
    });
    expect(service).toMatchObject({ __isMock: true });
  });

  it('omits `usageCollection` when not supplied', () => {
    createFavoritesService({
      appId: 'maps',
      savedObjectType: 'map',
      http,
      userProfile,
    });

    expect(FavoritesClient).toHaveBeenCalledWith('maps', 'map', {
      http,
      userProfile,
      usageCollection: undefined,
    });
  });
});
