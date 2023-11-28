/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataView } from '@kbn/data-views-plugin/public';
import { SortDirection } from '@kbn/data-plugin/public';
import { createSearchSourceStub } from './_stubs';
import { fetchAnchor, updateSearchSource } from './anchor';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { searchResponseIncompleteWarningLocalCluster } from '@kbn/search-response-warnings/src/__mocks__/search_response_warnings';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { discoverServiceMock } from '../../../__mocks__/services';

describe('context app', function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let searchSourceStub: any;
  const dataView = {
    id: 'DATA_VIEW_ID',
    isTimeNanosBased: () => false,
    popularizeField: () => {},
  } as unknown as DataView;

  describe('function fetchAnchor', function () {
    beforeEach(() => {
      searchSourceStub = createSearchSourceStub([{ _id: 'hit1', _index: 'test' }]);
    });

    it('should use the `fetch$` method of the SearchSource', function () {
      return fetchAnchor(
        'id',
        dataView,
        searchSourceStub,
        [{ '@timestamp': SortDirection.desc }, { _doc: SortDirection.desc }],
        false,
        discoverServiceMock
      ).then(() => {
        expect(searchSourceStub.fetch$.calledOnce).toBe(true);
      });
    });

    it('should configure the SearchSource to not inherit from the implicit root', function () {
      return fetchAnchor(
        'id',
        dataView,
        searchSourceStub,
        [{ '@timestamp': SortDirection.desc }, { _doc: SortDirection.desc }],
        false,
        discoverServiceMock
      ).then(() => {
        const setParentSpy = searchSourceStub.setParent;
        expect(setParentSpy.calledOnce).toBe(true);
        expect(setParentSpy.firstCall.args[0]).toBe(undefined);
      });
    });

    it('should set the SearchSource data view', function () {
      return fetchAnchor(
        'id',
        dataView,
        searchSourceStub,
        [{ '@timestamp': SortDirection.desc }, { _doc: SortDirection.desc }],
        false,
        discoverServiceMock
      ).then(() => {
        const setFieldSpy = searchSourceStub.setField;
        expect(setFieldSpy.firstCall.args[1].id).toEqual('DATA_VIEW_ID');
      });
    });

    it('should set the SearchSource version flag to true', function () {
      return fetchAnchor(
        'id',
        dataView,
        searchSourceStub,
        [{ '@timestamp': SortDirection.desc }, { _doc: SortDirection.desc }],
        false,
        discoverServiceMock
      ).then(() => {
        const setVersionSpy = searchSourceStub.setField.withArgs('version');
        expect(setVersionSpy.calledOnce).toBe(true);
        expect(setVersionSpy.firstCall.args[1]).toEqual(true);
      });
    });

    it('should set the SearchSource size to 1', function () {
      return fetchAnchor(
        'id',
        dataView,
        searchSourceStub,
        [{ '@timestamp': SortDirection.desc }, { _doc: SortDirection.desc }],
        false,
        discoverServiceMock
      ).then(() => {
        const setSizeSpy = searchSourceStub.setField.withArgs('size');
        expect(setSizeSpy.calledOnce).toBe(true);
        expect(setSizeSpy.firstCall.args[1]).toEqual(1);
      });
    });

    it('should set the SearchSource query to an ids query', function () {
      return fetchAnchor(
        'id',
        dataView,
        searchSourceStub,
        [{ '@timestamp': SortDirection.desc }, { _doc: SortDirection.desc }],
        false,
        discoverServiceMock
      ).then(() => {
        const setQuerySpy = searchSourceStub.setField.withArgs('query');
        expect(setQuerySpy.calledOnce).toBe(true);
        expect(setQuerySpy.firstCall.args[1]).toEqual({
          query: {
            constant_score: {
              filter: {
                ids: {
                  values: ['id'],
                },
              },
            },
          },
          language: 'lucene',
        });
      });
    });

    it('should set the SearchSource sort order', function () {
      return fetchAnchor(
        'id',
        dataView,
        searchSourceStub,
        [{ '@timestamp': SortDirection.desc }, { _doc: SortDirection.desc }],
        false,
        discoverServiceMock
      ).then(() => {
        const setSortSpy = searchSourceStub.setField.withArgs('sort');
        expect(setSortSpy.calledOnce).toBe(true);
        expect(setSortSpy.firstCall.args[1]).toEqual([
          { '@timestamp': SortDirection.desc },
          { _doc: SortDirection.desc },
        ]);
      });
    });

    it('should update search source correctly when useNewFieldsApi set to false', function () {
      const searchSource = updateSearchSource(
        savedSearchMock.searchSource,
        'id',
        [],
        false,
        dataViewMock
      );
      const searchRequestBody = searchSource.getSearchRequestBody();
      expect(searchRequestBody._source).toBeInstanceOf(Object);
      expect(searchRequestBody.track_total_hits).toBe(false);
    });

    it('should update search source correctly when useNewFieldsApi set to true', function () {
      const searchSource = updateSearchSource(
        savedSearchMock.searchSource,
        'id',
        [],
        true,
        dataViewMock
      );
      const searchRequestBody = searchSource.getSearchRequestBody();
      expect(searchRequestBody._source).toBe(false);
      expect(searchRequestBody.track_total_hits).toBe(false);
    });

    it('should reject with an error when no hits were found', function () {
      searchSourceStub = createSearchSourceStub([]);

      return fetchAnchor(
        'id',
        dataView,
        searchSourceStub,
        [{ '@timestamp': SortDirection.desc }, { _doc: SortDirection.desc }],
        false,
        discoverServiceMock
      ).then(
        () => {
          fail('expected the promise to be rejected');
        },
        (error) => {
          expect(error).toBeInstanceOf(Error);
        }
      );
    });

    it('should return the first hit after adding an anchor marker', function () {
      searchSourceStub = createSearchSourceStub([
        { _id: '1', _index: 't' },
        { _id: '3', _index: 't' },
      ]);

      return fetchAnchor(
        'id',
        dataView,
        searchSourceStub,
        [{ '@timestamp': SortDirection.desc }, { _doc: SortDirection.desc }],
        false,
        discoverServiceMock
      ).then(({ anchorRow, interceptedWarnings }) => {
        expect(anchorRow).toHaveProperty('raw._id', '1');
        expect(anchorRow).toHaveProperty('isAnchor', true);
        expect(interceptedWarnings).toEqual([]);
      });
    });

    it('should intercept shard failures', function () {
      searchSourceStub = createSearchSourceStub([
        { _id: '1', _index: 't' },
        { _id: '3', _index: 't' },
      ]);

      const services = discoverServiceMock;
      services.data.search.showWarnings = jest.fn((adapter, callback) => {
        // @ts-expect-error for empty meta
        callback?.(searchResponseIncompleteWarningLocalCluster, {});
      });

      return fetchAnchor(
        'id',
        dataView,
        searchSourceStub,
        [{ '@timestamp': SortDirection.desc }, { _doc: SortDirection.desc }],
        false,
        services
      ).then(({ anchorRow, interceptedWarnings }) => {
        expect(anchorRow).toHaveProperty('raw._id', '1');
        expect(anchorRow).toHaveProperty('isAnchor', true);
        expect(interceptedWarnings?.length).toBe(1);
      });
    });
  });

  describe('useNewFields API', () => {
    beforeEach(() => {
      searchSourceStub = createSearchSourceStub([{ _id: 'hit1', _index: 't' }]);
    });

    it('should request fields if useNewFieldsApi set', function () {
      searchSourceStub._stubHits = [{ property1: 'value1' }, { property2: 'value2' }];

      return fetchAnchor(
        'id',
        dataView,
        searchSourceStub,
        [{ '@timestamp': SortDirection.desc }, { _doc: SortDirection.desc }],
        true,
        discoverServiceMock
      ).then(() => {
        const setFieldsSpy = searchSourceStub.setField.withArgs('fields');
        const removeFieldsSpy = searchSourceStub.removeField.withArgs('fieldsFromSource');
        expect(setFieldsSpy.calledOnce).toBe(true);
        expect(removeFieldsSpy.calledOnce).toBe(true);
        expect(setFieldsSpy.firstCall.args[1]).toEqual([{ field: '*', include_unmapped: 'true' }]);
      });
    });
  });
});
