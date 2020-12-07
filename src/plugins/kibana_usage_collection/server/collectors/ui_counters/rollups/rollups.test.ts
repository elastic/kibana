/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import moment from 'moment';
import { isSavedObjectOlderThan, rollUiCounterIndices } from './rollups';
import { savedObjectsRepositoryMock, loggingSystemMock } from '../../../../../../core/server/mocks';
import { SavedObjectsFindResult } from 'kibana/server';
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

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    savedObjectClient = savedObjectsRepositoryMock.create();
  });

  it('returns undefined if no savedObjectsClient initialised yet', async () => {
    await expect(rollUiCounterIndices(logger, undefined)).resolves.toBe(undefined);
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
    await expect(rollUiCounterIndices(logger, savedObjectClient)).resolves.toEqual([]);
    expect(savedObjectClient.find).toBeCalled();
    expect(savedObjectClient.delete).not.toBeCalled();
    expect(logger.warn).toHaveBeenCalledTimes(0);
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
    await expect(rollUiCounterIndices(logger, savedObjectClient)).resolves.toHaveLength(2);
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
    await expect(rollUiCounterIndices(logger, savedObjectClient)).resolves.toEqual(undefined);
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
    await expect(rollUiCounterIndices(logger, savedObjectClient)).resolves.toEqual(undefined);
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
