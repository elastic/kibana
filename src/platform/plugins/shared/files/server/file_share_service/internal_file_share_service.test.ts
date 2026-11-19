/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { FileShare } from '../../common/types';
import { FileShareNotFoundError, FileShareTokenInvalidError } from './errors';
import { InternalFileShareService } from './internal_file_share_service';

const createShareSO = (opts: { validUntil: number }): SavedObject<FileShare> => ({
  id: 'share-id',
  type: 'fileShare',
  attributes: {
    created: new Date().toISOString(),
    name: 'my-share',
    token: 'abc123',
    valid_until: opts.validUntil,
  },
  references: [{ name: 'file.png', id: 'file-id', type: 'file' }],
});

const createFindResponse = (
  objs: Array<SavedObject<FileShare>>
): SavedObjectsFindResponse<FileShare> => ({
  saved_objects: objs.map((o) => ({ ...o, score: 1 })),
  total: objs.length,
  per_page: 20,
  page: 1,
});

describe('InternalFileShareService', () => {
  let savedObjects: ReturnType<typeof savedObjectsClientMock.create>;
  let service: InternalFileShareService;

  beforeEach(() => {
    savedObjects = savedObjectsClientMock.create();
    service = new InternalFileShareService(savedObjects);
  });

  describe('getByToken', () => {
    it('throws FileShareNotFoundError when no share matches the token', async () => {
      savedObjects.find.mockResolvedValue(createFindResponse([]));

      await expect(service.getByToken('missing-token')).rejects.toBeInstanceOf(
        FileShareNotFoundError
      );
    });

    it('throws FileShareTokenInvalidError when valid_until is in the past (ms)', async () => {
      // valid_until is stored in milliseconds — a value less than Date.now() means expired.
      const oneMinuteAgoMs = Date.now() - 60 * 1000;
      savedObjects.find.mockResolvedValue(
        createFindResponse([createShareSO({ validUntil: oneMinuteAgoMs })])
      );

      await expect(service.getByToken('abc123')).rejects.toBeInstanceOf(FileShareTokenInvalidError);
    });

    it('returns the share when valid_until is in the future (ms)', async () => {
      const oneDayFromNowMs = Date.now() + 24 * 60 * 60 * 1000;
      savedObjects.find.mockResolvedValue(
        createFindResponse([createShareSO({ validUntil: oneDayFromNowMs })])
      );

      await expect(service.getByToken('abc123')).resolves.toEqual(
        expect.objectContaining({
          id: 'share-id',
          name: 'my-share',
          validUntil: oneDayFromNowMs,
          fileId: 'file-id',
        })
      );
    });

    it('does not return the share when valid_until is 1 second in the past (ms)', async () => {
      const oneSecondAgoMs = Date.now() - 1000;
      savedObjects.find.mockResolvedValue(
        createFindResponse([createShareSO({ validUntil: oneSecondAgoMs })])
      );

      await expect(service.getByToken('abc123')).rejects.toBeInstanceOf(FileShareTokenInvalidError);
    });
  });
});
