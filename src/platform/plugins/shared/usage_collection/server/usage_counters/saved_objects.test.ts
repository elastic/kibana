/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { serializeCounterKey, storeCounter } from './saved_objects';
import type { UsageCounters } from '../../common';
import type { SavedObjectsFindResult } from '@kbn/core/server';
import { type UsageCountersSavedObjectAttributes, USAGE_COUNTERS_SAVED_OBJECT_TYPE } from '..';

describe('counterKey', () => {
  test('#serializeCounterKey returns a serialized string that omits default namespace', () => {
    const result = serializeCounterKey({
      domainId: 'a',
      counterName: 'b',
      counterType: 'c',
      namespace: 'default',
      source: 'ui',
      date: moment('09042021', 'DDMMYYYY'),
    });

    expect(result).toEqual('a:b:c:ui:20210409');
  });

  test('#serializeCounterKey returns a serialized string for non-default namespaces', () => {
    const result = serializeCounterKey({
      domainId: 'a',
      counterName: 'b',
      counterType: 'c',
      namespace: 'second',
      source: 'ui',
      date: moment('09042021', 'DDMMYYYY'),
    });

    expect(result).toEqual('second:a:b:c:ui:20210409');
  });
});

describe('storeCounter', () => {
  const internalRepository = savedObjectsRepositoryMock.create();

  const mockNow = 1617954426939;

  beforeEach(() => {
    jest.spyOn(moment, 'now').mockReturnValue(mockNow);
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('stores counter in a saved object', async () => {
    const metric: UsageCounters.v1.CounterMetric = {
      domainId: 'a',
      counterName: 'b',
      counterType: 'c',
      namespace: 'default',
      source: 'ui',
      incrementBy: 13,
    };

    await storeCounter({ metric, soRepository: internalRepository });

    expect(internalRepository.incrementCounter).toBeCalledTimes(1);
    expect(internalRepository.incrementCounter.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "usage-counter",
        "a:b:c:ui:20210409",
        Array [
          Object {
            "fieldName": "count",
            "incrementBy": 13,
          },
        ],
        Object {
          "namespace": "default",
          "refresh": false,
          "upsertAttributes": Object {
            "counterName": "b",
            "counterType": "c",
            "domainId": "a",
            "source": "ui",
          },
        },
      ]
    `);
  });
});

export const createMockSavedObjectDoc = (
  updatedAt: moment.Moment,
  id: string,
  domainId: string,
  namespace?: string
) =>
  ({
    id,
    type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    ...(namespace && { namespaces: [namespace] }),
    attributes: {
      count: 3,
      domainId,
      counterName: 'testName',
      counterType: 'count',
      source: 'server',
    },
    references: [],
    updated_at: updatedAt.format(),
    version: 'WzI5LDFd',
    score: 0,
  } as SavedObjectsFindResult<UsageCountersSavedObjectAttributes>);
