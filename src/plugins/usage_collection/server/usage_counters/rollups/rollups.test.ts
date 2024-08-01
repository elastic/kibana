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
import { USAGE_COUNTERS_SAVED_OBJECT_TYPE } from '..';
import { createMockSavedObjectDoc } from '../saved_objects.test';
import type { IUsageCounter } from '../usage_counter';

describe('rollUsageCountersIndices', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let internalRepository: ReturnType<typeof savedObjectsRepositoryMock.create>;
  let getRegisteredUsageCounters: () => IUsageCounter[];

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    internalRepository = savedObjectsRepositoryMock.create();
    getRegisteredUsageCounters = () => [
      {
        domainId: 'testDomain',
        incrementCounter: jest.fn(),
      },
      {
        domainId: 'retention_3',
        retentionPeriodDays: 3,
        incrementCounter: jest.fn(),
      },
    ];
  });

  it('returns undefined if no savedObjectsClient initialised yet', async () => {
    await expect(
      rollUsageCountersIndices({
        logger,
        getRegisteredUsageCounters,
        internalRepository: undefined,
      })
    ).resolves.toBe(undefined);
    expect(logger.warn).toHaveBeenCalledTimes(0);
  });

  it('does not delete any documents on empty saved objects', async () => {
    internalRepository.find.mockImplementation(async ({ type, page = 1, perPage = 10 }) => {
      switch (type) {
        case USAGE_COUNTERS_SAVED_OBJECT_TYPE:
          return { saved_objects: [], total: 0, page, per_page: perPage };
        default:
          throw new Error(`Unexpected type [${type}]`);
      }
    });
    await expect(
      rollUsageCountersIndices({ logger, getRegisteredUsageCounters, internalRepository })
    ).resolves.toEqual(0);
    expect(internalRepository.find).toHaveBeenCalledTimes(getRegisteredUsageCounters().length);
    expect(internalRepository.bulkDelete).not.toBeCalled();
    expect(logger.warn).toHaveBeenCalledTimes(0);
    expect(logger.debug).toHaveBeenCalledTimes(0);
  });

  it(`deletes documents older than the retention period`, async () => {
    const mockSavedObjects = [
      createMockSavedObjectDoc(moment().subtract(5, 'days'), 'doc-id-0', 'testDomain'),
      createMockSavedObjectDoc(moment().subtract(9, 'days'), 'doc-id-1', 'testDomain'), // old
      createMockSavedObjectDoc(moment().subtract(2, 'days'), 'doc-id-2', 'retention_3'),
      createMockSavedObjectDoc(moment().subtract(4, 'days'), 'doc-id-3', 'retention_3'), // old
      createMockSavedObjectDoc(moment().subtract(6, 'days'), 'doc-id-4', 'testDomain', 'secondary'), // old
    ];

    internalRepository.find.mockImplementationOnce(async ({ type, page = 1, perPage = 10 }) => {
      switch (type) {
        case USAGE_COUNTERS_SAVED_OBJECT_TYPE:
          return {
            saved_objects: [mockSavedObjects[1], mockSavedObjects[4]],
            total: mockSavedObjects.length,
            page,
            per_page: perPage,
          };
        default:
          throw new Error(`Unexpected type [${type}]`);
      }
    });
    internalRepository.find.mockImplementationOnce(async ({ type, page = 1, perPage = 10 }) => {
      switch (type) {
        case USAGE_COUNTERS_SAVED_OBJECT_TYPE:
          return {
            saved_objects: [mockSavedObjects[3]],
            total: mockSavedObjects.length,
            page,
            per_page: perPage,
          };
        default:
          throw new Error(`Unexpected type [${type}]`);
      }
    });
    await expect(
      rollUsageCountersIndices({ logger, getRegisteredUsageCounters, internalRepository })
    ).resolves.toEqual(3);
    expect(internalRepository.find).toHaveBeenCalledTimes(getRegisteredUsageCounters().length);
    expect(internalRepository.find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: USAGE_COUNTERS_SAVED_OBJECT_TYPE })
    );
    expect(internalRepository.find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: USAGE_COUNTERS_SAVED_OBJECT_TYPE })
    );
    expect(internalRepository.bulkDelete).toHaveBeenCalledTimes(3);
    expect(internalRepository.bulkDelete.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Array [
            Object {
              "id": "doc-id-1",
              "type": "usage-counter",
            },
          ],
          Object {
            "namespace": "default",
          },
        ],
        Array [
          Array [
            Object {
              "id": "doc-id-4",
              "type": "usage-counter",
            },
          ],
          Object {
            "namespace": "secondary",
          },
        ],
        Array [
          Array [
            Object {
              "id": "doc-id-3",
              "type": "usage-counter",
            },
          ],
          Object {
            "namespace": "default",
          },
        ],
      ]
    `);
    expect(logger.warn).toHaveBeenCalledTimes(0);
  });

  it(`logs warnings on savedObject.find failure`, async () => {
    internalRepository.find.mockImplementation(async () => {
      throw new Error(`Expected error!`);
    });
    await expect(
      rollUsageCountersIndices({ logger, getRegisteredUsageCounters, internalRepository })
    ).resolves.toEqual(0);
    // we abort operation if the find for a given domain fails
    expect(internalRepository.find).toHaveBeenCalledTimes(1);
    expect(internalRepository.bulkDelete).not.toBeCalled();
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
      rollUsageCountersIndices({ logger, getRegisteredUsageCounters, internalRepository })
    ).resolves.toEqual(1);
    expect(internalRepository.find).toHaveBeenCalledTimes(2);
    expect(internalRepository.bulkDelete).toHaveBeenCalledTimes(1);
    expect(internalRepository.bulkDelete.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Array [
            Object {
              "id": "doc-id-6",
              "type": "usage-counter",
            },
          ],
          Object {
            "namespace": "default",
          },
        ],
      ]
    `);
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });
});
