/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { deserializeCounterKey, serializeCounterKey, storeCounter } from './saved_objects';
import { savedObjectsRepositoryMock } from '../../../../core/server/mocks';
import { CounterMetric } from './usage_counter';
import moment from 'moment';

describe('counterKey', () => {
  test('#serializeCounterKey returns a serialized string', () => {
    const result = serializeCounterKey({
      domainId: 'a',
      counterName: 'b',
      counterType: 'c',
      date: moment('09042021', 'DDMMYYYY'),
    });

    expect(result).toMatchInlineSnapshot(`"a:09042021:c:b"`);
  });

  test('#deserializeCounterKey', () => {
    const key = deserializeCounterKey('a:09042021:c:b');
    expect(key).toMatchInlineSnapshot(`
      Object {
        "counterName": "b",
        "counterType": "c",
        "domainId": "a",
      }
    `);
  });
});

describe('storeCounter', () => {
  const internalRepository = savedObjectsRepositoryMock.create();

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('stores counter in a saved object', async () => {
    const counterMetric: CounterMetric = {
      domainId: 'a',
      counterName: 'b',
      counterType: 'c',
      incrementBy: 13,
    };

    await storeCounter(counterMetric, internalRepository);

    expect(internalRepository.incrementCounter).toBeCalledTimes(1);
    expect(internalRepository.incrementCounter.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "usage-counters",
        "a:09042021:c:b",
        Array [
          Object {
            "fieldName": "count",
            "incrementBy": 13,
          },
        ],
      ]
    `);
  });
});
