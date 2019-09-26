/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SearchSource } from '../search_source';

jest.mock('ui/new_platform', () => ({
  npSetup: {
    core: {
      injectedMetadata: {
        getInjectedVar: () => 0,
      }
    }
  }
}));

jest.mock('../fetch', () => ({
  fetchSoon: jest.fn(),
}));

const indexPattern = { title: 'foo' };
const indexPattern2 = { title: 'foo' };

describe('SearchSource', function () {
  describe('#setField()', function () {
    it('sets the value for the property', function () {
      const searchSource = new SearchSource();
      searchSource.setField('aggs', 5);
      expect(searchSource.getField('aggs')).toBe(5);
    });

    it('throws an error if the property is not accepted', function () {
      const searchSource = new SearchSource();
      expect(() => searchSource.setField('index', 5)).toThrow();
    });
  });

  describe('#getField()', function () {
    it('gets the value for the property', function () {
      const searchSource = new SearchSource();
      searchSource.setField('aggs', 5);
      expect(searchSource.getField('aggs')).toBe(5);
    });

    it('throws an error if the property is not accepted', function () {
      const searchSource = new SearchSource();
      expect(() => searchSource.getField('unacceptablePropName')).toThrow();
    });
  });

  describe(`#setField('index')`, function () {
    describe('auto-sourceFiltering', function () {
      describe('new index pattern assigned', function () {
        it('generates a searchSource filter', function () {
          const searchSource = new SearchSource();
          expect(searchSource.getField('index')).toBe(undefined);
          expect(searchSource.getField('source')).toBe(undefined);
          searchSource.setField('index', indexPattern);
          expect(searchSource.getField('index')).toBe(indexPattern);
          expect(typeof searchSource.getField('source')).toBe('function');
        });

        it('removes created searchSource filter on removal', function () {
          const searchSource = new SearchSource();
          searchSource.setField('index', indexPattern);
          searchSource.setField('index', null);
          expect(searchSource.getField('index')).toBe(undefined);
          expect(searchSource.getField('source')).toBe(undefined);
        });
      });

      describe('new index pattern assigned over another', function () {
        it('replaces searchSource filter with new', function () {
          const searchSource = new SearchSource();
          searchSource.setField('index', indexPattern);
          const searchSourceFilter1 = searchSource.getField('source');
          searchSource.setField('index', indexPattern2);
          expect(searchSource.getField('index')).toBe(indexPattern2);
          expect(typeof searchSource.getField('source')).toBe('function');
          expect(searchSource.getField('source')).not.toBe(searchSourceFilter1);
        });

        it('removes created searchSource filter on removal', function () {
          const searchSource = new SearchSource();
          searchSource.setField('index', indexPattern);
          searchSource.setField('index', indexPattern2);
          searchSource.setField('index', null);
          expect(searchSource.getField('index')).toBe(undefined);
          expect(searchSource.getField('source')).toBe(undefined);
        });
      });

      describe('ip assigned before custom searchSource filter', function () {
        it('custom searchSource filter becomes new searchSource', function () {
          const searchSource = new SearchSource();
          const football = {};
          searchSource.setField('index', indexPattern);
          expect(typeof searchSource.getField('source')).toBe('function');
          searchSource.setField('source', football);
          expect(searchSource.getField('index')).toBe(indexPattern);
          expect(searchSource.getField('source')).toBe(football);
        });

        it('custom searchSource stays after removal', function () {
          const searchSource = new SearchSource();
          const football = {};
          searchSource.setField('index', indexPattern);
          searchSource.setField('source', football);
          searchSource.setField('index', null);
          expect(searchSource.getField('index')).toBe(undefined);
          expect(searchSource.getField('source')).toBe(football);
        });
      });

      describe('ip assigned after custom searchSource filter', function () {
        it('leaves the custom filter in place', function () {
          const searchSource = new SearchSource();
          const football = {};
          searchSource.setField('source', football);
          searchSource.setField('index', indexPattern);
          expect(searchSource.getField('index')).toBe(indexPattern);
          expect(searchSource.getField('source')).toBe(football);
        });

        it('custom searchSource stays after removal', function () {
          const searchSource = new SearchSource();
          const football = {};
          searchSource.setField('source', football);
          searchSource.setField('index', indexPattern);
          searchSource.setField('index', null);
          expect(searchSource.getField('index')).toBe(undefined);
          expect(searchSource.getField('source')).toBe(football);
        });
      });
    });
  });

  describe('#onRequestStart()', () => {
    it('should be called when starting a request', async () => {
      const searchSource = new SearchSource();
      const fn = jest.fn();
      searchSource.onRequestStart(fn);
      const request = {};
      const options = {};
      searchSource.requestIsStarting(request, options);
      expect(fn).toBeCalledWith(searchSource, request, options);
    });

    it('should not be called on parent searchSource', async () => {
      const parent = new SearchSource();
      const searchSource = new SearchSource().setParent(parent);

      const fn = jest.fn();
      searchSource.onRequestStart(fn);
      const parentFn = jest.fn();
      parent.onRequestStart(parentFn);
      const request = {};
      const options = {};
      searchSource.requestIsStarting(request, options);

      expect(fn).toBeCalledWith(searchSource, request, options);
      expect(parentFn).not.toBeCalled();
    });

    it('should be called on parent searchSource if callParentStartHandlers is true', async () => {
      const parent = new SearchSource();
      const searchSource = new SearchSource().setParent(parent, { callParentStartHandlers: true });

      const fn = jest.fn();
      searchSource.onRequestStart(fn);
      const parentFn = jest.fn();
      parent.onRequestStart(parentFn);
      const request = {};
      const options = {};
      searchSource.requestIsStarting(request, options);

      expect(fn).toBeCalledWith(searchSource, request, options);
      expect(parentFn).toBeCalledWith(searchSource, request, options);
    });
  });
});
