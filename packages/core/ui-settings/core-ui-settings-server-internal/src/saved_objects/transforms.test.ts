/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { SavedObject } from '@kbn/core-saved-objects-common';
import type { UpgradeableConfigAttributes } from '../create_or_upgrade_saved_config';
import { transformDefaultIndex } from './transforms';

/**
 * Test each transform function individually, not the entire exported `transforms` array.
 */
describe('#transformDefaultIndex', () => {
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return early if the config object has already been transformed', async () => {
    const result = await transformDefaultIndex({
      savedObjectsClient,
      configAttributes: { isDefaultIndexMigrated: true } as UpgradeableConfigAttributes, // We don't care about the other attributes
    });

    expect(savedObjectsClient.resolve).not.toHaveBeenCalled();
    expect(result).toEqual(null); // This is the only time we expect a null result
  });

  it('should return early if configAttributes is undefined', async () => {
    const result = await transformDefaultIndex({ savedObjectsClient, configAttributes: undefined });

    expect(savedObjectsClient.resolve).not.toHaveBeenCalled();
    expect(result).toEqual({ isDefaultIndexMigrated: true });
  });

  it('should return early if the defaultIndex attribute is undefined', async () => {
    const result = await transformDefaultIndex({
      savedObjectsClient,
      configAttributes: { defaultIndex: undefined } as UpgradeableConfigAttributes, // We don't care about the other attributes
    });

    expect(savedObjectsClient.resolve).not.toHaveBeenCalled();
    expect(result).toEqual({ isDefaultIndexMigrated: true });
  });

  describe('should resolve the data view for the defaultIndex and return the result according to the outcome', () => {
    it('outcome: exactMatch', async () => {
      savedObjectsClient.resolve.mockResolvedValue({
        outcome: 'exactMatch',
        alias_target_id: 'another-index', // This wouldn't realistically be set if the outcome is exactMatch, but we're including it in this test to assert that the returned defaultIndex will be 'some-index'
        saved_object: {} as SavedObject, // Doesn't matter
      });
      const result = await transformDefaultIndex({
        savedObjectsClient,
        configAttributes: { defaultIndex: 'some-index' } as UpgradeableConfigAttributes, // We don't care about the other attributes
      });

      expect(savedObjectsClient.resolve).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.resolve).toHaveBeenCalledWith('index-pattern', 'some-index');
      expect(result).toEqual({ isDefaultIndexMigrated: true, defaultIndex: 'some-index' });
    });

    for (const outcome of ['aliasMatch' as const, 'conflict' as const]) {
      it(`outcome: ${outcome}`, async () => {
        savedObjectsClient.resolve.mockResolvedValue({
          outcome,
          alias_target_id: 'another-index',
          saved_object: {} as SavedObject, // Doesn't matter
        });
        const result = await transformDefaultIndex({
          savedObjectsClient,
          configAttributes: { defaultIndex: 'some-index' } as UpgradeableConfigAttributes, // We don't care about the other attributes
        });

        expect(savedObjectsClient.resolve).toHaveBeenCalledTimes(1);
        expect(savedObjectsClient.resolve).toHaveBeenCalledWith('index-pattern', 'some-index');
        expect(result).toEqual({ isDefaultIndexMigrated: true, defaultIndex: 'another-index' });
      });
    }

    it('returns the expected result if resolve fails with a Not Found error', async () => {
      savedObjectsClient.resolve.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('Oh no!')
      );
      const result = await transformDefaultIndex({
        savedObjectsClient,
        configAttributes: { defaultIndex: 'some-index' } as UpgradeableConfigAttributes, // We don't care about the other attributes
      });

      expect(savedObjectsClient.resolve).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.resolve).toHaveBeenCalledWith('index-pattern', 'some-index');
      expect(result).toEqual({ isDefaultIndexMigrated: true, defaultIndex: 'some-index' });
    });

    it('returns the expected result if resolve fails with another error', async () => {
      savedObjectsClient.resolve.mockRejectedValue(
        SavedObjectsErrorHelpers.createIndexAliasNotFoundError('Oh no!')
      );
      const result = await transformDefaultIndex({
        savedObjectsClient,
        configAttributes: { defaultIndex: 'some-index' } as UpgradeableConfigAttributes, // We don't care about the other attributes
      });

      expect(savedObjectsClient.resolve).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.resolve).toHaveBeenCalledWith('index-pattern', 'some-index');
      expect(result).toEqual({ isDefaultIndexMigrated: false, defaultIndex: 'some-index' });
    });
  });
});
