/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPatternsContract } from '../..';
import { SearchSourceService, SearchSourceDependencies } from './';

describe('SearchSource service', () => {
  let dependencies: jest.Mocked<SearchSourceDependencies>;

  beforeEach(() => {
    jest.resetModules();
    dependencies = {
      getConfig: jest.fn(),
      search: jest.fn(),
      onResponse: jest.fn(),
    };
  });

  describe('start()', () => {
    test('exposes proper contract', () => {
      const start = new SearchSourceService().start(
        jest.fn() as unknown as jest.Mocked<IndexPatternsContract>,
        dependencies
      );

      expect(Object.keys(start)).toEqual([
        'create',
        'createEmpty',
        'extract',
        'inject',
        'getAllMigrations',
        'telemetry',
      ]);
    });
  });
});
