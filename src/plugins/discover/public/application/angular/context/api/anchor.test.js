/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createIndexPatternsStub, createSearchSourceStub, createTimefilterStub } from './_stubs';

import { fetchAnchorProvider } from './anchor';

describe('context app', function () {
  describe('function fetchAnchor', function () {
    let fetchAnchor;
    let searchSourceStub;
    let timefilterStub;

    beforeEach(() => {
      searchSourceStub = createSearchSourceStub([{ _id: 'hit1' }]);
      timefilterStub = createTimefilterStub();
      fetchAnchor = fetchAnchorProvider(
        createIndexPatternsStub(),
        searchSourceStub,
        timefilterStub
      );
    });

    it('should use the `fetch` method of the SearchSource', function () {
      return fetchAnchor({
        indexPatternId: 'INDEX_PATTERN_ID',
        anchorId: 'id',
        sort: [{ '@timestamp': 'desc' }, { _doc: 'desc' }],
        timeRange: { from: 'now-7d', to: 'now' },
        routing: undefined,
      }).then(() => {
        expect(searchSourceStub.fetch.calledOnce).toBe(true);
      });
    });

    it('should configure the SearchSource to not inherit from the implicit root', function () {
      return fetchAnchor({
        indexPatternId: 'INDEX_PATTERN_ID',
        anchorId: 'id',
        sort: [{ '@timestamp': 'desc' }, { _doc: 'desc' }],
        timeRange: { from: 'now-7d', to: 'now' },
        routing: undefined,
      }).then(() => {
        const setParentSpy = searchSourceStub.setParent;
        expect(setParentSpy.calledOnce).toBe(true);
        expect(setParentSpy.firstCall.args[0]).toBe(undefined);
      });
    });

    it('should set the SearchSource index pattern', function () {
      return fetchAnchor({
        indexPatternId: 'INDEX_PATTERN_ID',
        anchorId: 'id',
        sort: [{ '@timestamp': 'desc' }, { _doc: 'desc' }],
        timeRange: { from: 'now-7d', to: 'now' },
        routing: undefined,
      }).then(() => {
        const setFieldSpy = searchSourceStub.setField;
        expect(setFieldSpy.firstCall.args[1].id).toEqual('INDEX_PATTERN_ID');
      });
    });

    it('should set the SearchSource version flag to true', function () {
      return fetchAnchor({
        indexPatternId: 'INDEX_PATTERN_ID',
        anchorId: 'id',
        sort: [{ '@timestamp': 'desc' }, { _doc: 'desc' }],
        timeRange: { from: 'now-7d', to: 'now' },
        routing: undefined,
      }).then(() => {
        const setVersionSpy = searchSourceStub.setField.withArgs('version');
        expect(setVersionSpy.calledOnce).toBe(true);
        expect(setVersionSpy.firstCall.args[1]).toEqual(true);
      });
    });

    it('should set the SearchSource size to 1', function () {
      return fetchAnchor({
        indexPatternId: 'INDEX_PATTERN_ID',
        anchorId: 'id',
        sort: [{ '@timestamp': 'desc' }, { _doc: 'desc' }],
        timeRange: { from: 'now-7d', to: 'now' },
        routing: undefined,
      }).then(() => {
        const setSizeSpy = searchSourceStub.setField.withArgs('size');
        expect(setSizeSpy.calledOnce).toBe(true);
        expect(setSizeSpy.firstCall.args[1]).toEqual(1);
      });
    });

    it('should set the SearchSource query to an ids query', function () {
      return fetchAnchor({
        indexPatternId: 'INDEX_PATTERN_ID',
        anchorId: 'id',
        sort: [{ '@timestamp': 'desc' }, { _doc: 'desc' }],
        timeRange: { from: 'now-7d', to: 'now' },
        routing: undefined,
      }).then(() => {
        const setQuerySpy = searchSourceStub.setField.withArgs('filter');
        expect(setQuerySpy.calledOnce).toBe(true);
        expect(setQuerySpy.firstCall.args[1]).toEqual(
          expect.arrayContaining([{ ids: { values: ['id'] } }])
        );
      });
    });

    it('should have a backwards-compatible SearchSource query when user bookmarked without time', function () {
      return fetchAnchor({
        indexPatternId: 'INDEX_PATTERN_ID',
        anchorId: 'id',
        sort: [{ '@timestamp': 'desc' }, { _doc: 'desc' }],
        timeRange: null,
        routing: null,
      }).then(() => {
        const setQuerySpy = searchSourceStub.setField.withArgs('filter');
        expect(setQuerySpy.calledOnce).toBe(true);
        expect(setQuerySpy.firstCall.args[1]).toHaveLength(1);
      });
    });

    it('should get a time query when it is requested', function () {
      return fetchAnchor({
        indexPatternId: 'INDEX_PATTERN_ID',
        anchorId: 'id',
        sort: [{ '@timestamp': 'desc' }, { _doc: 'desc' }],
        timeRange: { from: 'start', to: 'end' },
        routing: undefined,
      }).then(() => {
        expect(timefilterStub.createFilter.firstCall.args[1]).toEqual({
          from: 'start',
          to: 'end',
        });
      });
    });

    it('should set the SearchSource sort order', function () {
      return fetchAnchor({
        indexPatternId: 'INDEX_PATTERN_ID',
        anchorId: 'id',
        sort: [{ '@timestamp': 'desc' }, { _doc: 'desc' }],
        timeRange: { from: 'now-7d', to: 'now' },
        routing: undefined,
      }).then(() => {
        const setSortSpy = searchSourceStub.setField.withArgs('sort');
        expect(setSortSpy.calledOnce).toBe(true);
        expect(setSortSpy.firstCall.args[1]).toEqual([{ '@timestamp': 'desc' }, { _doc: 'desc' }]);
      });
    });

    it('should not assign the routing parameter by default', function () {
      return fetchAnchor({
        indexPatternId: 'INDEX_PATTERN_ID',
        anchorId: 'id',
        sort: [{ '@timestamp': 'desc' }, { _doc: 'desc' }],
        timeRange: { from: 'now-7d', to: 'now' },
        routing: undefined,
      }).then(() => {
        const setRoutingSpy = searchSourceStub.setField.withArgs('routing');
        expect(setRoutingSpy.calledOnce).toBe(false);
      });
    });

    it('should assign the routing parameter if needed', function () {
      return fetchAnchor({
        indexPatternId: 'INDEX_PATTERN_ID',
        anchorId: 'id',
        sort: [{ '@timestamp': 'desc' }, { _doc: 'desc' }],
        timeRange: { from: 'now-7d', to: 'now' },
        routing: 'shard',
      }).then(() => {
        const setRoutingSpy = searchSourceStub.setField.withArgs('routing');
        expect(setRoutingSpy.calledOnce).toBe(true);
        expect(setRoutingSpy.firstCall.args[1]).toEqual('shard');
      });
    });

    it('should reject with an error when no hits were found', function () {
      searchSourceStub._stubHits = [];

      return fetchAnchor({
        indexPatternId: 'INDEX_PATTERN_ID',
        anchorId: 'id',
        sort: [{ '@timestamp': 'desc' }, { _doc: 'desc' }],
        timeRange: { from: 'now-7d', to: 'now' },
        routing: undefined,
      }).then(
        () => {
          expect().fail('expected the promise to be rejected');
        },
        (error) => {
          expect(error).toBeInstanceOf(Error);
        }
      );
    });

    it('should return the first hit after adding an anchor marker', function () {
      searchSourceStub._stubHits = [{ property1: 'value1' }, { property2: 'value2' }];

      return fetchAnchor({
        indexPatternId: 'INDEX_PATTERN_ID',
        anchorId: 'id',
        sort: [{ '@timestamp': 'desc' }, { _doc: 'desc' }],
        timeRange: { from: 'now-7d', to: 'now' },
        routing: undefined,
      }).then((anchorDocument) => {
        expect(anchorDocument).toHaveProperty('property1', 'value1');
        expect(anchorDocument).toHaveProperty('$$_isAnchor', true);
      });
    });
  });

  describe('useNewFields API', () => {
    let fetchAnchor;
    let searchSourceStub;
    let timefilterStub;

    beforeEach(() => {
      searchSourceStub = createSearchSourceStub([{ _id: 'hit1' }]);
      timefilterStub = createTimefilterStub();
      fetchAnchor = fetchAnchorProvider(
        createIndexPatternsStub(),
        searchSourceStub,
        timefilterStub,
        true
      );
    });

    it('should request fields if useNewFieldsApi set', function () {
      searchSourceStub._stubHits = [{ property1: 'value1' }, { property2: 'value2' }];

      return fetchAnchor({
        indexPatternId: 'INDEX_PATTERN_ID',
        anchorId: 'id',
        sort: [{ '@timestamp': 'desc' }, { _doc: 'desc' }],
      }).then(() => {
        const setFieldsSpy = searchSourceStub.setField.withArgs('fields');
        const removeFieldsSpy = searchSourceStub.removeField.withArgs('fieldsFromSource');
        expect(setFieldsSpy.calledOnce).toBe(true);
        expect(removeFieldsSpy.calledOnce).toBe(true);
        expect(setFieldsSpy.firstCall.args[1]).toEqual(['*']);
      });
    });
  });
});
