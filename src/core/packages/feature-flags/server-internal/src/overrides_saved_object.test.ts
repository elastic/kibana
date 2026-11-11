/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ValidationError } from '@kbn/config-schema';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import {
  FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID,
  FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
  MAX_RUNTIME_OVERRIDES,
  featureFlagsOverridesAttributesSchema,
  normalizeOverrides,
  updateStoredOverrides,
} from './overrides_saved_object';

const document = (overrides: Record<string, unknown>, version: string) => ({
  id: FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID,
  type: FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
  attributes: { overrides },
  references: [],
  version,
});

describe('feature flag override saved object', () => {
  test('keeps only boolean, number, and string overrides', () => {
    expect(
      normalizeOverrides({
        on: true,
        limit: 2,
        name: 'blue',
        nested: { ignored: true },
        missing: undefined,
      })
    ).toEqual({ on: true, limit: 2, name: 'blue' });
  });

  test('rejects more than the maximum number of overrides', () => {
    const overrides = Object.fromEntries(
      Array.from({ length: MAX_RUNTIME_OVERRIDES + 1 }, (_, index) => [`flag.${index}`, true])
    );
    expect(() => featureFlagsOverridesAttributesSchema.validate({ overrides })).toThrow(
      ValidationError
    );
  });

  test('creates the document when it does not exist yet', async () => {
    const repository = savedObjectsRepositoryMock.create();
    repository.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(
        FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
        FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID
      )
    );
    repository.create.mockResolvedValue(document({ 'my.flag': true }, 'v1'));

    await expect(
      updateStoredOverrides(repository, (current) => ({ ...current, 'my.flag': true }))
    ).resolves.toEqual({ 'my.flag': true });

    expect(repository.create).toHaveBeenCalledWith(
      FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
      { overrides: { 'my.flag': true } },
      expect.objectContaining({ id: FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID, overwrite: false })
    );
  });

  test('retries a version conflict and merges onto the winning document', async () => {
    const repository = savedObjectsRepositoryMock.create();
    repository.get
      .mockResolvedValueOnce(document({ kept: true }, 'v1'))
      .mockResolvedValueOnce(document({ kept: true, other: 'yes' }, 'v2'));
    repository.update
      .mockRejectedValueOnce(SavedObjectsErrorHelpers.decorateConflictError(new Error('conflict')))
      .mockResolvedValueOnce(document({ kept: true, other: 'yes', 'my.flag': 4 }, 'v3'));

    await expect(
      updateStoredOverrides(repository, (current) => ({ ...current, 'my.flag': 4 }))
    ).resolves.toEqual({ kept: true, other: 'yes', 'my.flag': 4 });

    expect(repository.update).toHaveBeenNthCalledWith(
      2,
      FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
      FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID,
      { overrides: { kept: true, other: 'yes', 'my.flag': 4 } },
      expect.objectContaining({ version: 'v2', mergeAttributes: false })
    );
  });
});
