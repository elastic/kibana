/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreSetup, CoreStart } from '../../../../core/server';
import { coreMock } from '../../../../core/server/mocks';

import { DataPluginStart } from '../plugin';
import { createFieldFormatsStartMock } from '../field_formats/mocks';
import { createIndexPatternsStartMock } from '../index_patterns/mocks';

import { SearchService, SearchServiceSetupDependencies } from './search_service';
import { bfetchPluginMock } from '../../../bfetch/server/mocks';
import { of } from 'rxjs';

describe('Search service', () => {
  let plugin: SearchService;
  let mockCoreSetup: MockedKeys<CoreSetup<object, DataPluginStart>>;
  let mockCoreStart: MockedKeys<CoreStart>;

  beforeEach(() => {
    const mockLogger: any = {
      debug: () => {},
    };
    const context = coreMock.createPluginInitializerContext({});
    context.config.create = jest.fn().mockImplementation(() => {
      return of({
        search: {
          aggs: {
            shardDelay: {
              enabled: true,
            },
          },
        },
      });
    });
    plugin = new SearchService(context, mockLogger);
    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
  });

  describe('setup()', () => {
    it('exposes proper contract', async () => {
      const bfetch = bfetchPluginMock.createSetupContract();
      const setup = plugin.setup(mockCoreSetup, ({
        packageInfo: { version: '8' },
        bfetch,
        expressions: {
          registerFunction: jest.fn(),
          registerType: jest.fn(),
        },
      } as unknown) as SearchServiceSetupDependencies);
      expect(setup).toHaveProperty('aggs');
      expect(setup).toHaveProperty('registerSearchStrategy');
    });
  });

  describe('start()', () => {
    it('exposes proper contract', async () => {
      const start = plugin.start(mockCoreStart, {
        fieldFormats: createFieldFormatsStartMock(),
        indexPatterns: createIndexPatternsStartMock(),
      });
      expect(start).toHaveProperty('aggs');
      expect(start).toHaveProperty('getSearchStrategy');
    });
  });
});
