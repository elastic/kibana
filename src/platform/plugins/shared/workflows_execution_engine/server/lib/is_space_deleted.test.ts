/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { coreMock, loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { isSpaceDeleted } from './is_space_deleted';

describe('isSpaceDeleted', () => {
  const logger = loggingSystemMock.createLogger();
  let savedObjects: ReturnType<typeof coreMock.createStart>['savedObjects'];
  let repository: ReturnType<typeof savedObjectsRepositoryMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();
    savedObjects = coreMock.createStart().savedObjects;
    repository = savedObjectsRepositoryMock.create();
    savedObjects.createInternalRepository.mockReturnValue(repository);
  });

  it.each(['default', '*'])('does not look up the %s space', async (spaceId) => {
    await expect(isSpaceDeleted(savedObjects, spaceId, logger)).resolves.toBe(false);
    expect(savedObjects.createInternalRepository).not.toHaveBeenCalled();
  });

  it('returns true when the space saved object is not found', async () => {
    repository.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('space', 'gone')
    );

    await expect(isSpaceDeleted(savedObjects, 'gone', logger)).resolves.toBe(true);
    expect(savedObjects.createInternalRepository).toHaveBeenCalledWith(['space']);
    expect(repository.get).toHaveBeenCalledWith('space', 'gone');
  });

  it('returns false when the space exists', async () => {
    repository.get.mockResolvedValue({
      id: 'present',
      type: 'space',
      references: [],
      attributes: {},
    });

    await expect(isSpaceDeleted(savedObjects, 'present', logger)).resolves.toBe(false);
  });

  it('returns false when the lookup fails for another reason', async () => {
    repository.get.mockRejectedValue(SavedObjectsErrorHelpers.createUnsupportedTypeError('space'));

    await expect(isSpaceDeleted(savedObjects, 'unknown', logger)).resolves.toBe(false);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Failed to check whether space unknown exists')
    );
  });
});
