/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { checkPersistedSessionsProgress } from './check_persisted_sessions';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import moment from 'moment';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { SearchSessionsConfigSchema } from '../../../config';

describe('checkPersistedSessionsProgress', () => {
  let mockClient: any;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  const config: SearchSessionsConfigSchema = {
    enabled: true,
    pageSize: 5,
    notTouchedInProgressTimeout: moment.duration(1, 'm'),
    notTouchedTimeout: moment.duration(5, 'm'),
    maxUpdateRetries: 3,
    defaultExpiration: moment.duration(7, 'd'),
    trackingInterval: moment.duration(10, 's'),
    cleanupInterval: moment.duration(10, 's'),
    expireInterval: moment.duration(10, 'm'),
    monitoringTaskTimeout: moment.duration(5, 'm'),
    management: {} as any,
  };
  const mockLogger: any = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
    mockClient = {
      asyncSearch: {
        status: jest.fn(),
        delete: jest.fn(),
      },
      eql: {
        status: jest.fn(),
        delete: jest.fn(),
      },
    };
  });

  test('fetches only running persisted sessions', async () => {
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
    } as any);

    await checkPersistedSessionsProgress(
      {
        savedObjectsClient,
        client: mockClient,
        logger: mockLogger,
      },
      config
    );

    const [findInput] = savedObjectsClient.find.mock.calls[0];

    expect(findInput.filter.arguments[0].arguments[0].value).toBe(
      'search-session.attributes.persisted'
    );
    expect(findInput.filter.arguments[0].arguments[1].value).toBe('true');
    expect(findInput.filter.arguments[1].arguments[0].value).toBe(
      'search-session.attributes.status'
    );
    expect(findInput.filter.arguments[1].arguments[1].value).toBe('in_progress');
  });
});
