/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { IndexPatternsContract } from '../../index_patterns/index_patterns';
import { SearchSourceService, SearchSourceDependencies } from './';

describe('SearchSource service', () => {
  let dependencies: jest.Mocked<SearchSourceDependencies>;

  beforeEach(() => {
    jest.resetModules();
    dependencies = {
      getConfig: jest.fn(),
      search: jest.fn(),
      onResponse: jest.fn(),
      legacy: {
        callMsearch: jest.fn(),
        loadingCount$: new BehaviorSubject(0),
      },
    };
  });

  describe('start()', () => {
    test('exposes proper contract', () => {
      const start = new SearchSourceService().start(
        (jest.fn() as unknown) as jest.Mocked<IndexPatternsContract>,
        dependencies
      );

      expect(Object.keys(start)).toEqual(['create', 'createEmpty']);
    });
  });
});
