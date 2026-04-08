/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { KibanaRequest } from '@kbn/core/server';
import { SearchSettingsCache } from './search_settings_cache';

describe('SearchSettingsCache', () => {
  const logger = loggingSystemMock.createLogger();

  const createMockRequest = (spaceId: string = 'default'): KibanaRequest => {
    return { headers: {}, spaceId } as any;
  };

  const createMockUiSettings = () => {
    const scopedClient = {
      get: jest.fn(),
    };

    return {
      asScopedToClient: jest.fn().mockReturnValue(scopedClient),
      _scopedClient: scopedClient,
    };
  };

  const createMockSavedObjects = () => ({
    getScopedClient: jest.fn().mockReturnValue({}),
  });

  const createMockSpacesService = () => ({
    getSpaceId: jest.fn((request: KibanaRequest) => (request as any).spaceId || 'default'),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('lifecycle', () => {
    it('should initialize cache on start and clean up on stop', async () => {
      const cache = new SearchSettingsCache(logger);
      const uiSettings = createMockUiSettings();
      const savedObjects = createMockSavedObjects();
      const spacesService = createMockSpacesService();
      const request = createMockRequest('default');

      uiSettings._scopedClient.get
        .mockResolvedValueOnce(true) // includeFrozen
        .mockResolvedValueOnce(100); // maxConcurrentShardRequests

      await cache.start(uiSettings as any, savedObjects as any, spacesService as any);

      // Trigger refresh for default space
      cache.maybeRefresh(request);
      await new Promise((resolve) => setTimeout(resolve, 0));

      const settings = cache.getSettings(request);
      expect(settings.includeFrozen).toBe(true);
      expect(settings.maxConcurrentShardRequests).toBe(100);

      cache.stop();

      // After stop, should return defaults
      const settingsAfterStop = cache.getSettings(request);
      expect(settingsAfterStop.includeFrozen).toBe(false);
      expect(settingsAfterStop.maxConcurrentShardRequests).toBe(0);
    });
  });

  describe('getSettings', () => {
    it('should return defaults when not initialized', () => {
      const cache = new SearchSettingsCache(logger);
      const request = createMockRequest();

      const settings = cache.getSettings(request);

      expect(settings).toEqual({
        includeFrozen: false,
        maxConcurrentShardRequests: 0,
      });
    });

    it('should return defaults when space not cached yet', async () => {
      const cache = new SearchSettingsCache(logger);
      const uiSettings = createMockUiSettings();
      const savedObjects = createMockSavedObjects();
      const spacesService = createMockSpacesService();

      await cache.start(uiSettings as any, savedObjects as any, spacesService as any);

      const request = createMockRequest('uncached-space');
      const settings = cache.getSettings(request);

      expect(settings).toEqual({
        includeFrozen: false,
        maxConcurrentShardRequests: 0,
      });
    });
  });

  describe('space isolation', () => {
    it('should cache settings per space', async () => {
      const cache = new SearchSettingsCache(logger);
      const uiSettings = createMockUiSettings();
      const savedObjects = createMockSavedObjects();
      const spacesService = createMockSpacesService();

      await cache.start(uiSettings as any, savedObjects as any, spacesService as any);

      const requestSpace1 = createMockRequest('space1');
      const requestSpace2 = createMockRequest('space2');

      // Mock different settings for each space
      uiSettings._scopedClient.get
        .mockResolvedValueOnce(true) // space1 includeFrozen
        .mockResolvedValueOnce(100) // space1 maxConcurrentShardRequests
        .mockResolvedValueOnce(false) // space2 includeFrozen
        .mockResolvedValueOnce(50); // space2 maxConcurrentShardRequests

      // Refresh both spaces
      cache.maybeRefresh(requestSpace1);
      cache.maybeRefresh(requestSpace2);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify each space has its own settings
      const settingsSpace1 = cache.getSettings(requestSpace1);
      expect(settingsSpace1.includeFrozen).toBe(true);
      expect(settingsSpace1.maxConcurrentShardRequests).toBe(100);

      const settingsSpace2 = cache.getSettings(requestSpace2);
      expect(settingsSpace2.includeFrozen).toBe(false);
      expect(settingsSpace2.maxConcurrentShardRequests).toBe(50);
    });
  });

  describe('default space fallback', () => {
    it('should use default space when spaces plugin unavailable', async () => {
      const cache = new SearchSettingsCache(logger);
      const uiSettings = createMockUiSettings();
      const savedObjects = createMockSavedObjects();

      uiSettings._scopedClient.get
        .mockResolvedValueOnce(true) // includeFrozen
        .mockResolvedValueOnce(100); // maxConcurrentShardRequests

      // Start without spaces service
      await cache.start(uiSettings as any, savedObjects as any);

      const request = createMockRequest('any-space');
      cache.maybeRefresh(request);
      await new Promise((resolve) => setTimeout(resolve, 0));

      const settings = cache.getSettings(request);
      expect(settings.includeFrozen).toBe(true);
      expect(settings.maxConcurrentShardRequests).toBe(100);
    });
  });

  describe('concurrent refreshes', () => {
    it('should deduplicate concurrent refresh calls for same space', async () => {
      const cache = new SearchSettingsCache(logger);
      const uiSettings = createMockUiSettings();
      const savedObjects = createMockSavedObjects();
      const spacesService = createMockSpacesService();

      let resolveGet: ((value: any) => void) | undefined;
      const getPromise = new Promise((resolve) => {
        resolveGet = resolve;
      });

      uiSettings._scopedClient.get.mockReturnValue(getPromise);

      await cache.start(uiSettings as any, savedObjects as any, spacesService as any);

      const request = createMockRequest('space1');

      // Trigger maybeRefresh multiple times for the same space
      cache.maybeRefresh(request);
      cache.maybeRefresh(request);
      cache.maybeRefresh(request);

      // Resolve the UI settings calls
      resolveGet!(true);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should only have called get twice (once for each setting), not multiple times
      expect(uiSettings._scopedClient.get).toHaveBeenCalledTimes(2);
    });

    it('should allow concurrent refreshes for different spaces', async () => {
      const cache = new SearchSettingsCache(logger);
      const uiSettings = createMockUiSettings();
      const savedObjects = createMockSavedObjects();
      const spacesService = createMockSpacesService();

      uiSettings._scopedClient.get.mockResolvedValue(true);

      await cache.start(uiSettings as any, savedObjects as any, spacesService as any);

      const requestSpace1 = createMockRequest('space1');
      const requestSpace2 = createMockRequest('space2');

      // Trigger refreshes for different spaces
      cache.maybeRefresh(requestSpace1);
      cache.maybeRefresh(requestSpace2);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should have called get 4 times (2 settings × 2 spaces)
      expect(uiSettings._scopedClient.get).toHaveBeenCalledTimes(4);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest space when cache is full', async () => {
      const cache = new SearchSettingsCache(logger);
      const uiSettings = createMockUiSettings();
      const savedObjects = createMockSavedObjects();
      const spacesService = createMockSpacesService();

      uiSettings._scopedClient.get.mockResolvedValue(true);

      await cache.start(uiSettings as any, savedObjects as any, spacesService as any);

      // Create 101 spaces (max is 100)
      const requests = Array.from({ length: 101 }, (_, i) => createMockRequest(`space${i}`));

      // Refresh all spaces
      for (const request of requests) {
        cache.maybeRefresh(request);
      }
      await new Promise((resolve) => setTimeout(resolve, 0));

      // The first space should have been evicted, so it should return defaults
      const settingsSpace0 = cache.getSettings(requests[0]);
      expect(settingsSpace0).toEqual({
        includeFrozen: false,
        maxConcurrentShardRequests: 0,
      });

      // The last space should still be cached
      const settingsSpace100 = cache.getSettings(requests[100]);
      expect(settingsSpace100.includeFrozen).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should fallback to defaults on fetch failure', async () => {
      const cache = new SearchSettingsCache(logger);
      const uiSettings = createMockUiSettings();
      const savedObjects = createMockSavedObjects();
      const spacesService = createMockSpacesService();

      uiSettings._scopedClient.get.mockRejectedValue(new Error('fetch failed'));

      await cache.start(uiSettings as any, savedObjects as any, spacesService as any);

      const request = createMockRequest('space1');
      cache.maybeRefresh(request);
      await new Promise((resolve) => setTimeout(resolve, 0));

      const settings = cache.getSettings(request);
      expect(settings).toEqual({
        includeFrozen: false,
        maxConcurrentShardRequests: 0,
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to refresh search settings cache for space space1'),
        expect.any(Error)
      );
    });
  });
});
