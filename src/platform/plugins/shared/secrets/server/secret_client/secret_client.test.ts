/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SecretClient } from './secret_client';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import type { Logger } from '@kbn/core/server';
import sinon from 'sinon';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const soClient = savedObjectsClientMock.create();
const esoClient = encryptedSavedObjectsMock.createClient();
let clock: sinon.SinonFakeTimers;

describe('SecretClient', () => {
  let secretClient: SecretClient;

  beforeAll(() => {
    clock = sinon.useFakeTimers(new Date('2025-12-15T12:00:00.000Z'));
  });

  beforeEach(() => {
    clock.reset();
    jest.resetAllMocks();
    jest.restoreAllMocks();
    secretClient = new SecretClient({ soClient, esoClient, logger });
  });

  describe('create()', () => {
    it('should create a secret and do not return the secret', async () => {
      const createdAt = new Date().toISOString();
      const command = { name: 'test', description: 'test', secret: 'test' };
      soClient.create.mockResolvedValueOnce({
        id: '1',
        type: 'secret',
        attributes: { ...command, createdAt, updatedAt: createdAt },
        references: [],
      });
      const result = await secretClient.create(command);
      expect(soClient.create).toHaveBeenCalledWith('secret', {
        ...command,
        createdAt,
        updatedAt: createdAt,
      });
      expect(result).toEqual({
        id: '1',
        ...command,
        secret: '[ENCRYPTED]',
        createdAt,
        updatedAt: createdAt,
      });
    });
  });

  describe('get()', () => {
    it('should find a secret by name and return the decrypted secret', async () => {
      const createdAt = new Date().toISOString();
      const expectedResult = {
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: '1',
            type: 'secret',
            score: 1,
            attributes: {
              name: 'test',
              description: 'test',
              secret: 'test',
              createdAt,
              updatedAt: createdAt,
            },
            references: [],
          },
        ],
      };
      soClient.find.mockResolvedValueOnce(expectedResult);
      esoClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
        id: '1',
        type: 'secret',
        references: [],
        attributes: { secret: 'test' },
      });
      const secret = await secretClient.get('test');
      expect(secret).toEqual({
        id: '1',
        name: 'test',
        description: 'test',
        secret: 'test',
        createdAt,
        updatedAt: createdAt,
      });
    });
  });
  describe('search()', () => {
    it('should search for secrets by name and return the placeholder encrypted secrets', async () => {
      const createdAt = new Date().toISOString();
      const expectedResult = {
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: '1',
            type: 'secret',
            score: 1,
            attributes: {
              name: 'test',
              description: 'test',
              secret: 'test',
              createdAt,
              updatedAt: createdAt,
            },
            references: [],
          },
        ],
      };
      soClient.find.mockResolvedValueOnce(expectedResult);
      esoClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
        id: '1',
        type: 'secret',
        references: [],
        attributes: { secret: 'test' },
      });
      const secrets = await secretClient.search({ name: 'test' });
      expect(secrets).toEqual({
        results: [
          {
            id: '1',
            name: 'test',
            description: 'test',
            secret: '[ENCRYPTED]',
            createdAt,
            updatedAt: createdAt,
          },
        ],
        page: 1,
        size: 100,
        total: 1,
      });
    });
  });
});
