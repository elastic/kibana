/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFavoritesForTypes } from './get_favorites_for_types';
import { favoritesSavedObjectType } from './favorites_saved_object';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';

describe('getFavoritesForTypes', () => {
  const createMockSavedObjectClient = () =>
    ({
      get: jest.fn(),
    } as unknown as jest.Mocked<SavedObjectsClientContract>);

  const createMockLogger = () =>
    ({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logger>);

  const userId = 'user-123';

  it('should return favorites for multiple types', async () => {
    const savedObjectClient = createMockSavedObjectClient();
    const logger = createMockLogger();

    savedObjectClient.get.mockImplementation(async (type, id) => {
      if (id === 'dashboard:user-123') {
        return {
          id,
          type: favoritesSavedObjectType.name,
          attributes: { favoriteIds: ['dash-1', 'dash-2'] },
          references: [],
        };
      }
      if (id === 'visualization:user-123') {
        return {
          id,
          type: favoritesSavedObjectType.name,
          attributes: { favoriteIds: ['viz-1'] },
          references: [],
        };
      }
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    });

    const result = await getFavoritesForTypes(['dashboard', 'visualization'], userId, {
      savedObjectClient,
      logger,
    });

    expect(result.get('dashboard')).toEqual(['dash-1', 'dash-2']);
    expect(result.get('visualization')).toEqual(['viz-1']);
    expect(result.size).toBe(2);
  });

  it('should omit types with no favorites saved object', async () => {
    const savedObjectClient = createMockSavedObjectClient();
    const logger = createMockLogger();

    savedObjectClient.get.mockImplementation(async (type, id) => {
      if (id === 'dashboard:user-123') {
        return {
          id,
          type: favoritesSavedObjectType.name,
          attributes: { favoriteIds: ['dash-1'] },
          references: [],
        };
      }
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    });

    const result = await getFavoritesForTypes(['dashboard', 'visualization'], userId, {
      savedObjectClient,
      logger,
    });

    expect(result.get('dashboard')).toEqual(['dash-1']);
    expect(result.has('visualization')).toBe(false);
    expect(result.size).toBe(1);
  });

  it('should omit types with empty favoriteIds array', async () => {
    const savedObjectClient = createMockSavedObjectClient();
    const logger = createMockLogger();

    savedObjectClient.get.mockImplementation(async () => {
      return {
        id: 'test',
        type: favoritesSavedObjectType.name,
        attributes: { favoriteIds: [] },
        references: [],
      };
    });

    const result = await getFavoritesForTypes(['dashboard'], userId, {
      savedObjectClient,
      logger,
    });

    expect(result.size).toBe(0);
  });

  it('should return empty map when no types have favorites', async () => {
    const savedObjectClient = createMockSavedObjectClient();
    const logger = createMockLogger();

    savedObjectClient.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('favorites', 'test')
    );

    const result = await getFavoritesForTypes(['dashboard', 'visualization'], userId, {
      savedObjectClient,
      logger,
    });

    expect(result.size).toBe(0);
  });

  it('should throw and log non-404 errors', async () => {
    const savedObjectClient = createMockSavedObjectClient();
    const logger = createMockLogger();

    const unexpectedError = new Error('Database connection failed');
    savedObjectClient.get.mockRejectedValue(unexpectedError);

    await expect(
      getFavoritesForTypes(['dashboard'], userId, {
        savedObjectClient,
        logger,
      })
    ).rejects.toThrow('Database connection failed');

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error fetching favorites for type dashboard')
    );
  });

  it('should handle undefined favoriteIds gracefully', async () => {
    const savedObjectClient = createMockSavedObjectClient();
    const logger = createMockLogger();

    savedObjectClient.get.mockResolvedValue({
      id: 'dashboard:user-123',
      type: favoritesSavedObjectType.name,
      attributes: {}, // No favoriteIds
      references: [],
    });

    const result = await getFavoritesForTypes(['dashboard'], userId, {
      savedObjectClient,
      logger,
    });

    expect(result.size).toBe(0);
  });
});
