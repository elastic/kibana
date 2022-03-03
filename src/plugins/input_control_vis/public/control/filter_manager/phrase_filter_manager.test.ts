/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';
import expect from '@kbn/expect';

import { FilterManager as QueryFilterManager, DataViewsContract } from '../../../../data/public';
import { DataView } from '../../../../data_views/public';
import { PhraseFilterManager } from './phrase_filter_manager';

describe('PhraseFilterManager', function () {
  const controlId = 'control1';

  describe('createFilter', function () {
    const indexPatternId = '1';
    const fieldMock = {
      name: 'field1',
      format: {
        convert: (value: any) => value,
      },
    };
    const indexPatternMock: DataView = {
      id: indexPatternId,
      fields: {
        getByName: (name: string) => {
          const fields: any = { field1: fieldMock };
          return fields[name];
        },
      },
    } as DataView;
    const indexPatternsServiceMock = {
      get: jest.fn().mockReturnValue(Promise.resolve(indexPatternMock)),
    } as unknown as jest.Mocked<DataViewsContract>;
    const queryFilterMock: QueryFilterManager = {} as QueryFilterManager;
    let filterManager: PhraseFilterManager;
    beforeEach(async () => {
      filterManager = new PhraseFilterManager(
        controlId,
        'field1',
        '1',
        indexPatternsServiceMock,
        queryFilterMock
      );
      await filterManager.init();
    });

    test('should create match phrase filter from single value', function () {
      const newFilter = filterManager.createFilter(['ios']);
      expect(newFilter).to.have.property('meta');
      expect(newFilter.meta.index).to.be(indexPatternId);
      expect(newFilter.meta.controlledBy).to.be(controlId);
      expect(newFilter.meta.key).to.be('field1');
      expect(newFilter).to.have.property('query');
      expect(JSON.stringify(newFilter.query, null, '')).to.be('{"match_phrase":{"field1":"ios"}}');
    });

    test('should create bool filter from multiple values', function () {
      const newFilter = filterManager.createFilter(['ios', 'win xp']);
      expect(newFilter).to.have.property('meta');
      expect(newFilter.meta.index).to.be(indexPatternId);
      expect(newFilter.meta.controlledBy).to.be(controlId);
      expect(newFilter.meta.key).to.be('field1');
      expect(newFilter).to.have.property('query');
      const query = newFilter.query!;
      expect(query).to.have.property('bool');
      expect(query.bool.should.length).to.be(2);
      expect(JSON.stringify(query.bool.should[0], null, '')).to.be(
        '{"match_phrase":{"field1":"ios"}}'
      );
      expect(JSON.stringify(query.bool.should[1], null, '')).to.be(
        '{"match_phrase":{"field1":"win xp"}}'
      );
    });
  });

  describe('getValueFromFilterBar', function () {
    class MockFindFiltersPhraseFilterManager extends PhraseFilterManager {
      mockFilters: Filter[];

      constructor(
        id: string,
        fieldName: string,
        indexPatternId: string,
        indexPatternsService: DataViewsContract,
        queryFilter: QueryFilterManager
      ) {
        super(id, fieldName, indexPatternId, indexPatternsService, queryFilter);
        this.mockFilters = [];
      }

      findFilters() {
        return this.mockFilters;
      }

      setMockFilters(mockFilters: Filter[]) {
        this.mockFilters = mockFilters;
      }
    }

    const indexPatternsServiceMock = {} as DataViewsContract;
    const queryFilterMock: QueryFilterManager = {} as QueryFilterManager;
    let filterManager: MockFindFiltersPhraseFilterManager;
    beforeEach(() => {
      filterManager = new MockFindFiltersPhraseFilterManager(
        controlId,
        'field1',
        '1',
        indexPatternsServiceMock,
        queryFilterMock
      );
    });

    test('should extract value from match phrase filter', function () {
      filterManager.setMockFilters([
        {
          meta: {},
          query: {
            match: {
              field1: {
                query: 'ios',
                type: 'phrase',
              },
            },
          },
        },
      ] as Filter[]);
      expect(filterManager.getValueFromFilterBar()).to.eql(['ios']);
    });

    test('should extract value from multiple filters', function () {
      filterManager.setMockFilters([
        {
          meta: {},
          query: {
            match: {
              field1: {
                query: 'ios',
                type: 'phrase',
              },
            },
          },
        },
        {
          query: {
            match: {
              field1: {
                query: 'win xp',
                type: 'phrase',
              },
            },
          },
        },
      ] as Filter[]);
      expect(filterManager.getValueFromFilterBar()).to.eql(['ios', 'win xp']);
    });

    test('should extract value from bool filter', function () {
      filterManager.setMockFilters([
        {
          meta: {},
          query: {
            bool: {
              should: [
                {
                  match_phrase: {
                    field1: 'ios',
                  },
                },
                {
                  match_phrase: {
                    field1: 'win xp',
                  },
                },
              ],
            },
          },
        },
      ] as Filter[]);
      expect(filterManager.getValueFromFilterBar()).to.eql(['ios', 'win xp']);
    });

    test('should return undefined when filter value can not be extracted from Kibana filter', function () {
      filterManager.setMockFilters([
        {
          meta: {},
          query: {
            match: {
              myFieldWhichIsNotField1: {
                query: 'ios',
                type: 'phrase',
              },
            },
          },
        },
      ] as Filter[]);
      expect(filterManager.getValueFromFilterBar()).to.eql(undefined);
    });
  });
});
