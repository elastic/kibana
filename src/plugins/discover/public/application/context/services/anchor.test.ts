/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataView } from '../../../../../data_views/public';
import { SortDirection } from '../../../../../data/public';
import { createSearchSourceStub } from './_stubs';
import { fetchAnchor, updateSearchSource } from './anchor';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { EsHitRecordList } from '../../types';

describe('context app', function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let searchSourceStub: any;
  const indexPattern = {
    id: 'INDEX_PATTERN_ID',
    isTimeNanosBased: () => false,
    popularizeField: () => {},
  } as unknown as DataView;

  describe('function fetchAnchor', function () {
    beforeEach(() => {
      searchSourceStub = createSearchSourceStub([{ _id: 'hit1' }] as unknown as EsHitRecordList);
    });

    it('should use the `fetch` method of the SearchSource', function () {
      return fetchAnchor('id', indexPattern, searchSourceStub, [
        { '@timestamp': SortDirection.desc },
        { _doc: SortDirection.desc },
      ]).then(() => {
        expect(searchSourceStub.fetch.calledOnce).toBe(true);
      });
    });

    it('should configure the SearchSource to not inherit from the implicit root', function () {
      return fetchAnchor('id', indexPattern, searchSourceStub, [
        { '@timestamp': SortDirection.desc },
        { _doc: SortDirection.desc },
      ]).then(() => {
        const setParentSpy = searchSourceStub.setParent;
        expect(setParentSpy.calledOnce).toBe(true);
        expect(setParentSpy.firstCall.args[0]).toBe(undefined);
      });
    });

    it('should set the SearchSource index pattern', function () {
      return fetchAnchor('id', indexPattern, searchSourceStub, [
        { '@timestamp': SortDirection.desc },
        { _doc: SortDirection.desc },
      ]).then(() => {
        const setFieldSpy = searchSourceStub.setField;
        expect(setFieldSpy.firstCall.args[1].id).toEqual('INDEX_PATTERN_ID');
      });
    });

    it('should set the SearchSource version flag to true', function () {
      return fetchAnchor('id', indexPattern, searchSourceStub, [
        { '@timestamp': SortDirection.desc },
        { _doc: SortDirection.desc },
      ]).then(() => {
        const setVersionSpy = searchSourceStub.setField.withArgs('version');
        expect(setVersionSpy.calledOnce).toBe(true);
        expect(setVersionSpy.firstCall.args[1]).toEqual(true);
      });
    });

    it('should set the SearchSource size to 1', function () {
      return fetchAnchor('id', indexPattern, searchSourceStub, [
        { '@timestamp': SortDirection.desc },
        { _doc: SortDirection.desc },
      ]).then(() => {
        const setSizeSpy = searchSourceStub.setField.withArgs('size');
        expect(setSizeSpy.calledOnce).toBe(true);
        expect(setSizeSpy.firstCall.args[1]).toEqual(1);
      });
    });

    it('should set the SearchSource query to an ids query', function () {
      return fetchAnchor('id', indexPattern, searchSourceStub, [
        { '@timestamp': SortDirection.desc },
        { _doc: SortDirection.desc },
      ]).then(() => {
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
      return fetchAnchor('id', indexPattern, searchSourceStub, [
        { '@timestamp': SortDirection.desc },
        { _doc: SortDirection.desc },
      ]).then(() => {
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
        indexPatternMock
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
        indexPatternMock
      );
      const searchRequestBody = searchSource.getSearchRequestBody();
      expect(searchRequestBody._source).toBe(false);
      expect(searchRequestBody.track_total_hits).toBe(false);
    });

    it('should reject with an error when no hits were found', function () {
      searchSourceStub._stubHits = [];

      return fetchAnchor('id', indexPattern, searchSourceStub, [
        { '@timestamp': SortDirection.desc },
        { _doc: SortDirection.desc },
      ]).then(
        () => {
          fail('expected the promise to be rejected');
        },
        (error) => {
          expect(error).toBeInstanceOf(Error);
        }
      );
    });

    it('should return the first hit after adding an anchor marker', function () {
      searchSourceStub._stubHits = [{ property1: 'value1' }, { property2: 'value2' }];

      return fetchAnchor('id', indexPattern, searchSourceStub, [
        { '@timestamp': SortDirection.desc },
        { _doc: SortDirection.desc },
      ]).then((anchorDocument) => {
        expect(anchorDocument).toHaveProperty('property1', 'value1');
        expect(anchorDocument).toHaveProperty('isAnchor', true);
      });
    });
  });

  describe('useNewFields API', () => {
    beforeEach(() => {
      searchSourceStub = createSearchSourceStub([{ _id: 'hit1' }] as unknown as EsHitRecordList);
    });

    it('should request fields if useNewFieldsApi set', function () {
      searchSourceStub._stubHits = [{ property1: 'value1' }, { property2: 'value2' }];

      return fetchAnchor(
        'id',
        indexPattern,
        searchSourceStub,
        [{ '@timestamp': SortDirection.desc }, { _doc: SortDirection.desc }],
        true
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
