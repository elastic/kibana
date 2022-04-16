/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import * as Rx from 'rxjs';
import { isSavedObjectOlderThan, rollUiCounterIndices } from './rollups';
import { savedObjectsRepositoryMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsFindResult } from '@kbn/core/server';

import {
  UICounterSavedObjectAttributes,
  UI_COUNTER_SAVED_OBJECT_TYPE,
} from '../ui_counter_saved_object_type';
import { UI_COUNTERS_KEEP_DOCS_FOR_DAYS } from './constants';

const createMockSavedObjectDoc = (updatedAt: moment.Moment, id: string) =>
  ({
    id,
    type: 'ui-counter',
    attributes: {
      count: 3,
    },
    references: [],
    updated_at: updatedAt.format(),
    version: 'WzI5LDFd',
    score: 0,
  } as SavedObjectsFindResult<UICounterSavedObjectAttributes>);

describe('isSavedObjectOlderThan', () => {
  it(`returns true if doc is older than x days`, () => {
    const numberOfDays = 1;
    const startDate = moment().format();
    const doc = createMockSavedObjectDoc(moment().subtract(2, 'days'), 'some-id');
    const result = isSavedObjectOlderThan({
      numberOfDays,
      startDate,
      doc,
    });
    expect(result).toBe(true);
  });

  it(`returns false if doc is exactly x days old`, () => {
    const numberOfDays = 1;
    const startDate = moment().format();
    const doc = createMockSavedObjectDoc(moment().subtract(1, 'days'), 'some-id');
    const result = isSavedObjectOlderThan({
      numberOfDays,
      startDate,
      doc,
    });
    expect(result).toBe(false);
  });

  it(`returns false if doc is younger than x days`, () => {
    const numberOfDays = 2;
    const startDate = moment().format();
    const doc = createMockSavedObjectDoc(moment().subtract(1, 'days'), 'some-id');
    const result = isSavedObjectOlderThan({
      numberOfDays,
      startDate,
      doc,
    });
    expect(result).toBe(false);
  });
});

describe('rollUiCounterIndices', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let savedObjectClient: ReturnType<typeof savedObjectsRepositoryMock.create>;
  let stopUsingUiCounterIndicies$: Rx.Subject<void>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    savedObjectClient = savedObjectsRepositoryMock.create();
    stopUsingUiCounterIndicies$ = new Rx.Subject();
  });

  it('returns undefined if no savedObjectsClient initialised yet', async () => {
    await expect(
      rollUiCounterIndices(logger, stopUsingUiCounterIndicies$, undefined)
    ).resolves.toBe(undefined);
    expect(logger.warn).toHaveBeenCalledTimes(0);
  });

  it('does not delete any documents on empty saved objects', async () => {
    savedObjectClient.find.mockImplementation(async ({ type, page = 1, perPage = 10 }) => {
      switch (type) {
        case UI_COUNTER_SAVED_OBJECT_TYPE:
          return { saved_objects: [], total: 0, page, per_page: perPage };
        default:
          throw new Error(`Unexpected type [${type}]`);
      }
    });
    await expect(
      rollUiCounterIndices(logger, stopUsingUiCounterIndicies$, savedObjectClient)
    ).resolves.toEqual([]);
    expect(savedObjectClient.find).toBeCalled();
    expect(savedObjectClient.delete).not.toBeCalled();
    expect(logger.warn).toHaveBeenCalledTimes(0);
  });
  it('calls Subject complete() on empty saved objects', async () => {
    savedObjectClient.find.mockImplementation(async ({ type, page = 1, perPage = 10 }) => {
      switch (type) {
        case UI_COUNTER_SAVED_OBJECT_TYPE:
          return { saved_objects: [], total: 0, page, per_page: perPage };
        default:
          throw new Error(`Unexpected type [${type}]`);
      }
    });
    await expect(
      rollUiCounterIndices(logger, stopUsingUiCounterIndicies$, savedObjectClient)
    ).resolves.toEqual([]);
    expect(stopUsingUiCounterIndicies$.isStopped).toBe(true);
  });

  it(`deletes documents older than ${UI_COUNTERS_KEEP_DOCS_FOR_DAYS} days`, async () => {
    const mockSavedObjects = [
      createMockSavedObjectDoc(moment().subtract(5, 'days'), 'doc-id-1'),
      createMockSavedObjectDoc(moment().subtract(1, 'days'), 'doc-id-2'),
      createMockSavedObjectDoc(moment().subtract(6, 'days'), 'doc-id-3'),
    ];

    savedObjectClient.find.mockImplementation(async ({ type, page = 1, perPage = 10 }) => {
      switch (type) {
        case UI_COUNTER_SAVED_OBJECT_TYPE:
          return { saved_objects: mockSavedObjects, total: 0, page, per_page: perPage };
        default:
          throw new Error(`Unexpected type [${type}]`);
      }
    });
    await expect(
      rollUiCounterIndices(logger, stopUsingUiCounterIndicies$, savedObjectClient)
    ).resolves.toHaveLength(2);
    expect(savedObjectClient.find).toBeCalled();
    expect(savedObjectClient.delete).toHaveBeenCalledTimes(2);
    expect(savedObjectClient.delete).toHaveBeenNthCalledWith(
      1,
      UI_COUNTER_SAVED_OBJECT_TYPE,
      'doc-id-1'
    );
    expect(savedObjectClient.delete).toHaveBeenNthCalledWith(
      2,
      UI_COUNTER_SAVED_OBJECT_TYPE,
      'doc-id-3'
    );
    expect(logger.warn).toHaveBeenCalledTimes(0);
  });

  it(`logs warnings on savedObject.find failure`, async () => {
    savedObjectClient.find.mockImplementation(async () => {
      throw new Error(`Expected error!`);
    });
    await expect(
      rollUiCounterIndices(logger, stopUsingUiCounterIndicies$, savedObjectClient)
    ).resolves.toEqual(undefined);
    expect(savedObjectClient.find).toBeCalled();
    expect(savedObjectClient.delete).not.toBeCalled();
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it(`logs warnings on savedObject.delete failure`, async () => {
    const mockSavedObjects = [createMockSavedObjectDoc(moment().subtract(5, 'days'), 'doc-id-1')];

    savedObjectClient.find.mockImplementation(async ({ type, page = 1, perPage = 10 }) => {
      switch (type) {
        case UI_COUNTER_SAVED_OBJECT_TYPE:
          return { saved_objects: mockSavedObjects, total: 0, page, per_page: perPage };
        default:
          throw new Error(`Unexpected type [${type}]`);
      }
    });
    savedObjectClient.delete.mockImplementation(async () => {
      throw new Error(`Expected error!`);
    });
    await expect(
      rollUiCounterIndices(logger, stopUsingUiCounterIndicies$, savedObjectClient)
    ).resolves.toEqual(undefined);
    expect(savedObjectClient.find).toBeCalled();
    expect(savedObjectClient.delete).toHaveBeenCalledTimes(1);
    expect(savedObjectClient.delete).toHaveBeenNthCalledWith(
      1,
      UI_COUNTER_SAVED_OBJECT_TYPE,
      'doc-id-1'
    );
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });
});
