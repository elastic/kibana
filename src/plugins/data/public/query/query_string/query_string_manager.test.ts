/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { Storage } from '@kbn/kibana-utils-plugin/public/storage';
import { StubBrowserStorage } from '@kbn/test-jest-helpers';
import { AggregateQuery, Query } from '../../../common/query';
import { QueryStringManager } from './query_string_manager';

describe('QueryStringManager', () => {
  let service: QueryStringManager;

  beforeEach(() => {
    service = new QueryStringManager(
      new Storage(new StubBrowserStorage()),
      coreMock.createSetup().uiSettings
    );
  });

  test('getUpdates$ is a cold emits only after query changes', () => {
    const obs$ = service.getUpdates$();
    const emittedValues: Array<Query | AggregateQuery> = [];
    obs$.subscribe((v) => {
      emittedValues.push(v);
    });
    expect(emittedValues).toHaveLength(0);

    const newQuery = { query: 'new query', language: 'kquery' };
    service.setQuery(newQuery);
    expect(emittedValues).toHaveLength(1);
    expect(emittedValues[0]).toEqual(newQuery);

    service.setQuery({ ...newQuery });
    expect(emittedValues).toHaveLength(1);
  });
});
