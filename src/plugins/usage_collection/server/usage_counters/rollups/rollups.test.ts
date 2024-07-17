/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { savedObjectsRepositoryMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { rollUsageCountersIndices } from './rollups';
import { USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS } from './constants';
import { USAGE_COUNTERS_SAVED_OBJECT_TYPE } from '..';
import { createMockSavedObjectDoc } from '../saved_objects.test';
import { GetUsageCounter } from '../types';

describe('rollUsageCountersIndices', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let internalRepository: ReturnType<typeof savedObjectsRepositoryMock.create>;
  let usageCounters: GetUsageCounter;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    internalRepository = savedObjectsRepositoryMock.create();
    usageCounters = {
      getUsageCounterByDomainId: jest.fn().mockImplementation((domainId) => {
        let retentionPeriodDays = USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS;
        if (domainId.startsWith('retention_')) {
          const daysString = domainId.split('_').pop();
          retentionPeriodDays = Number(daysString!);
        }

        return {
          retentionPeriodDays,
          incrementCounter: jest.fn(),
        };
      }),
    };
  });

  it('returns undefined if no savedObjectsClient initialised yet', async () => {
    await expect(
      rollUsageCountersIndices({
        logger,
        usageCounters,
        internalRepository: undefined,
      })
    ).resolves.toBe(undefined);
    expect(logger.warn).toHaveBeenCalledTimes(0);
  });

  it('does not delete any documents on empty saved objects', async () => {
    internalRepository.find.mockImplementationOnce(async ({ type, page = 1, perPage = 10 }) => {
      switch (type) {
        case USAGE_COUNTERS_SAVED_OBJECT_TYPE:
          return { saved_objects: [], total: 0, page, per_page: perPage };
        default:
          throw new Error(`Unexpected type [${type}]`);
      }
    });
    await expect(
      rollUsageCountersIndices({ logger, usageCounters, internalRepository })
    ).resolves.toEqual([]);
    expect(internalRepository.find).toHaveBeenCalledTimes(1);
    expect(internalRepository.delete).not.toBeCalled();
    expect(logger.warn).toHaveBeenCalledTimes(0);
  });

  it(`deletes documents older than the retention period`, async () => {
    const mockSavedObjects = [
      createMockSavedObjectDoc(moment().subtract(5, 'days'), 'doc-id-1', 'testDomain'),
      createMockSavedObjectDoc(moment().subtract(9, 'days'), 'doc-id-2', 'testDomain'), // old
      createMockSavedObjectDoc(moment().subtract(2, 'days'), 'doc-id-3', 'retention_3'),
      createMockSavedObjectDoc(moment().subtract(4, 'days'), 'doc-id-4', 'retention_3'), // old
      createMockSavedObjectDoc(moment().subtract(6, 'days'), 'doc-id-5', 'testDomain', 'secondary'), // old
    ];

    internalRepository.find.mockImplementationOnce(async ({ type, page = 1, perPage = 10 }) => {
      switch (type) {
        case USAGE_COUNTERS_SAVED_OBJECT_TYPE:
          return {
            saved_objects: mockSavedObjects,
            total: mockSavedObjects.length,
            page,
            per_page: perPage,
          };
        default:
          throw new Error(`Unexpected type [${type}]`);
      }
    });
    await expect(
      rollUsageCountersIndices({ logger, usageCounters, internalRepository })
    ).resolves.toHaveLength(3);
    expect(internalRepository.find).toHaveBeenCalledTimes(1);
    expect(internalRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ type: USAGE_COUNTERS_SAVED_OBJECT_TYPE })
    );
    expect(internalRepository.delete).toHaveBeenCalledTimes(3);
    expect(internalRepository.delete).toHaveBeenNthCalledWith(
      1,
      USAGE_COUNTERS_SAVED_OBJECT_TYPE,
      'doc-id-2'
    );
    expect(internalRepository.delete).toHaveBeenNthCalledWith(
      2,
      USAGE_COUNTERS_SAVED_OBJECT_TYPE,
      'doc-id-4'
    );
    expect(internalRepository.delete).toHaveBeenNthCalledWith(
      3,
      USAGE_COUNTERS_SAVED_OBJECT_TYPE,
      'doc-id-5',
      { namespace: 'secondary' }
    );
    expect(logger.warn).toHaveBeenCalledTimes(0);
  });

  it(`logs warnings on savedObject.find failure`, async () => {
    internalRepository.find.mockImplementationOnce(async () => {
      throw new Error(`Expected error!`);
    });
    await expect(
      rollUsageCountersIndices({ logger, usageCounters, internalRepository })
    ).resolves.toEqual(undefined);
    expect(internalRepository.find).toBeCalled();
    expect(internalRepository.delete).not.toBeCalled();
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it(`logs warnings on savedObject.delete failure`, async () => {
    const mockSavedObjects = [
      createMockSavedObjectDoc(moment().subtract(7, 'days'), 'doc-id-6', 'testDomain'),
    ];

    internalRepository.find.mockImplementationOnce(async ({ type, page = 1, perPage = 10 }) => {
      switch (type) {
        case USAGE_COUNTERS_SAVED_OBJECT_TYPE:
          return { saved_objects: mockSavedObjects, total: 0, page, per_page: perPage };
        default:
          throw new Error(`Unexpected type [${type}]`);
      }
    });
    internalRepository.delete.mockImplementationOnce(async () => {
      throw new Error(`Expected error!`);
    });
    await expect(
      rollUsageCountersIndices({ logger, usageCounters, internalRepository })
    ).resolves.toEqual(undefined);
    expect(internalRepository.find).toBeCalled();
    expect(internalRepository.delete).toHaveBeenCalledTimes(1);
    expect(internalRepository.delete).toHaveBeenNthCalledWith(
      1,
      USAGE_COUNTERS_SAVED_OBJECT_TYPE,
      'doc-id-6'
    );
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });
});
