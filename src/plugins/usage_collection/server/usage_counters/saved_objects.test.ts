/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { serializeCounterKey, storeCounter } from './saved_objects';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';

import { UsageCounters } from '../../common';

import moment from 'moment';

describe('counterKey', () => {
  test('#serializeCounterKey returns a serialized string', () => {
    const result = serializeCounterKey({
      domainId: 'a',
      counterName: 'b',
      counterType: 'c',
      namespace: 'default',
      source: 'ui',
      date: moment('09042021', 'DDMMYYYY'),
    });

    expect(result).toEqual('a:b:c:ui:20210409:default');
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
