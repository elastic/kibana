/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { SearchSettingsCache } from './search_settings_cache';

describe('SearchSettingsCache', () => {
  const logger = loggingSystemMock.createLogger();

  const createMockUiSettings = () => {
    const globalClient = {
      get: jest.fn(),
    };

    return {
      globalAsScopedToClient: jest.fn().mockReturnValue(globalClient),
      _globalClient: globalClient,
    };
  };

  const createMockSavedObjects = () => ({
    createInternalRepository: jest.fn().mockReturnValue({}),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('lifecycle', () => {
    it('should initialize cache on start and clean up on stop', async () => {
      const cache = new SearchSettingsCache(logger);
      const uiSettings = createMockUiSettings();
      const savedObjects = createMockSavedObjects();

      uiSettings._globalClient.get
        .mockResolvedValueOnce(true) // includeFrozen
        .mockResolvedValueOnce(100); // maxConcurrentShardRequests

      await cache.start(uiSettings as any, savedObjects as any);

      const settings = cache.getSettings();
      expect(settings.includeFrozen).toBe(true);
      expect(settings.maxConcurrentShardRequests).toBe(100);

      cache.stop();

      // After stop, should return defaults
      const settingsAfterStop = cache.getSettings();
      expect(settingsAfterStop.includeFrozen).toBe(false);
      expect(settingsAfterStop.maxConcurrentShardRequests).toBe(0);
    });
  });

  describe('getSettings', () => {
    it('should return defaults when not initialized', () => {
      const cache = new SearchSettingsCache(logger);

      const settings = cache.getSettings();

      expect(settings).toEqual({
        includeFrozen: false,
        maxConcurrentShardRequests: 0,
      });
    });
  });

  describe('concurrent refreshes', () => {
    it('should deduplicate concurrent refresh calls', async () => {
      const cache = new SearchSettingsCache(logger);
      const uiSettings = createMockUiSettings();
      const savedObjects = createMockSavedObjects();

      let resolveGet: ((value: any) => void) | undefined;
      const getPromise = new Promise((resolve) => {
        resolveGet = resolve;
      });

      uiSettings._globalClient.get.mockReturnValue(getPromise);

      // Start the cache (triggers first refresh)
      const startPromise = cache.start(uiSettings as any, savedObjects as any);

      // Trigger maybeRefresh multiple times while the first refresh is still pending
      cache.maybeRefresh();
      cache.maybeRefresh();
      cache.maybeRefresh();

      // Resolve the UI settings calls
      resolveGet!(true);
      await startPromise;

      // Should only have called get twice (once for each setting), not multiple times
      expect(uiSettings._globalClient.get).toHaveBeenCalledTimes(2);
    });
  });
});
