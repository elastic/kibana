/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EsQuerySortValue, SortDirection } from '../../../../../../data/public';
import { createIndexPatternsStub, createSearchSourceStub } from './_stubs';
import { AnchorHitRecord, fetchAnchorProvider } from './anchor';

describe('context app', function () {
  let fetchAnchor: (
    indexPatternId: string,
    anchorId: string,
    sort: EsQuerySortValue[]
  ) => Promise<AnchorHitRecord>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let searchSourceStub: any;

  describe('function fetchAnchor', function () {
    beforeEach(() => {
      searchSourceStub = createSearchSourceStub([
        { _id: 'hit1', fields: [], sort: [], _source: {} },
      ]);
      fetchAnchor = fetchAnchorProvider(createIndexPatternsStub(), searchSourceStub);
    });

    it('should use the `fetch` method of the SearchSource', function () {
      return fetchAnchor('INDEX_PATTERN_ID', 'id', [
        { '@timestamp': SortDirection.desc },
        { _doc: SortDirection.desc },
      ]).then(() => {
        expect(searchSourceStub.fetch.calledOnce).toBe(true);
      });
    });

    it('should configure the SearchSource to not inherit from the implicit root', function () {
      return fetchAnchor('INDEX_PATTERN_ID', 'id', [
        { '@timestamp': SortDirection.desc },
        { _doc: SortDirection.desc },
      ]).then(() => {
        const setParentSpy = searchSourceStub.setParent;
        expect(setParentSpy.calledOnce).toBe(true);
        expect(setParentSpy.firstCall.args[0]).toBe(undefined);
      });
    });

    it('should set the SearchSource index pattern', function () {
      return fetchAnchor('INDEX_PATTERN_ID', 'id', [
        { '@timestamp': SortDirection.desc },
        { _doc: SortDirection.desc },
      ]).then(() => {
        const setFieldSpy = searchSourceStub.setField;
        expect(setFieldSpy.firstCall.args[1].id).toEqual('INDEX_PATTERN_ID');
      });
    });

    it('should set the SearchSource version flag to true', function () {
      return fetchAnchor('INDEX_PATTERN_ID', 'id', [
        { '@timestamp': SortDirection.desc },
        { _doc: SortDirection.desc },
      ]).then(() => {
        const setVersionSpy = searchSourceStub.setField.withArgs('version');
        expect(setVersionSpy.calledOnce).toBe(true);
        expect(setVersionSpy.firstCall.args[1]).toEqual(true);
      });
    });

    it('should set the SearchSource size to 1', function () {
      return fetchAnchor('INDEX_PATTERN_ID', 'id', [
        { '@timestamp': SortDirection.desc },
        { _doc: SortDirection.desc },
      ]).then(() => {
        const setSizeSpy = searchSourceStub.setField.withArgs('size');
        expect(setSizeSpy.calledOnce).toBe(true);
        expect(setSizeSpy.firstCall.args[1]).toEqual(1);
      });
    });

    it('should set the SearchSource query to an ids query', function () {
      return fetchAnchor('INDEX_PATTERN_ID', 'id', [
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
      return fetchAnchor('INDEX_PATTERN_ID', 'id', [
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

    it('should reject with an error when no hits were found', function () {
      searchSourceStub._stubHits = [];

      return fetchAnchor('INDEX_PATTERN_ID', 'id', [
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

      return fetchAnchor('INDEX_PATTERN_ID', 'id', [
        { '@timestamp': SortDirection.desc },
        { _doc: SortDirection.desc },
      ]).then((anchorDocument) => {
        expect(anchorDocument).toHaveProperty('property1', 'value1');
        expect(anchorDocument).toHaveProperty('$$_isAnchor', true);
      });
    });
  });

  describe('useNewFields API', () => {
    beforeEach(() => {
      searchSourceStub = createSearchSourceStub([
        { _id: 'hit1', fields: [], sort: [], _source: {} },
      ]);
      fetchAnchor = fetchAnchorProvider(createIndexPatternsStub(), searchSourceStub, true);
    });

    it('should request fields if useNewFieldsApi set', function () {
      searchSourceStub._stubHits = [{ property1: 'value1' }, { property2: 'value2' }];

      return fetchAnchor('INDEX_PATTERN_ID', 'id', [
        { '@timestamp': SortDirection.desc },
        { _doc: SortDirection.desc },
      ]).then(() => {
        const setFieldsSpy = searchSourceStub.setField.withArgs('fields');
        const removeFieldsSpy = searchSourceStub.removeField.withArgs('fieldsFromSource');
        expect(setFieldsSpy.calledOnce).toBe(true);
        expect(removeFieldsSpy.calledOnce).toBe(true);
        expect(setFieldsSpy.firstCall.args[1]).toEqual([{ field: '*', include_unmapped: 'true' }]);
      });
    });
  });
});
