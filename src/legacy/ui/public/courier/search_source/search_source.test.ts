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
import { IndexPattern } from '../../../../core_plugins/data/public/index_patterns';

jest.mock('ui/new_platform');

jest.mock('../fetch', () => ({
  fetchSoon: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../chrome', () => ({
  dangerouslyGetActiveInjector: () => ({
    get: jest.fn(),
  }),
}));

const getComputedFields = () => ({
  storedFields: [],
  scriptFields: [],
  docvalueFields: [],
});
const indexPattern = ({ title: 'foo', getComputedFields } as unknown) as IndexPattern;
const indexPattern2 = ({ title: 'foo', getComputedFields } as unknown) as IndexPattern;

describe('SearchSource', function() {
  describe('#setField()', function() {
    it('sets the value for the property', function() {
      const searchSource = new SearchSource();
      searchSource.setField('aggs', 5);
      expect(searchSource.getField('aggs')).toBe(5);
    });
  });

  describe('#getField()', function() {
    it('gets the value for the property', function() {
      const searchSource = new SearchSource();
      searchSource.setField('aggs', 5);
      expect(searchSource.getField('aggs')).toBe(5);
    });
  });

  describe(`#setField('index')`, function() {
    describe('auto-sourceFiltering', function() {
      describe('new index pattern assigned', function() {
        it('generates a searchSource filter', function() {
          const searchSource = new SearchSource();
          expect(searchSource.getField('index')).toBe(undefined);
          expect(searchSource.getField('source')).toBe(undefined);
          searchSource.setField('index', indexPattern);
          expect(searchSource.getField('index')).toBe(indexPattern);
          expect(typeof searchSource.getField('source')).toBe('function');
        });

        it('removes created searchSource filter on removal', function() {
          const searchSource = new SearchSource();
          searchSource.setField('index', indexPattern);
          searchSource.setField('index', undefined);
          expect(searchSource.getField('index')).toBe(undefined);
          expect(searchSource.getField('source')).toBe(undefined);
        });
      });

      describe('new index pattern assigned over another', function() {
        it('replaces searchSource filter with new', function() {
          const searchSource = new SearchSource();
          searchSource.setField('index', indexPattern);
          const searchSourceFilter1 = searchSource.getField('source');
          searchSource.setField('index', indexPattern2);
          expect(searchSource.getField('index')).toBe(indexPattern2);
          expect(typeof searchSource.getField('source')).toBe('function');
          expect(searchSource.getField('source')).not.toBe(searchSourceFilter1);
        });

        it('removes created searchSource filter on removal', function() {
          const searchSource = new SearchSource();
          searchSource.setField('index', indexPattern);
          searchSource.setField('index', indexPattern2);
          searchSource.setField('index', undefined);
          expect(searchSource.getField('index')).toBe(undefined);
          expect(searchSource.getField('source')).toBe(undefined);
        });
      });
    });
  });

  describe('#onRequestStart()', () => {
    it('should be called when starting a request', async () => {
      const searchSource = new SearchSource({ index: indexPattern });
      const fn = jest.fn();
      searchSource.onRequestStart(fn);
      const options = {};
      await searchSource.fetch(options);
      expect(fn).toBeCalledWith(searchSource, options);
    });

    it('should not be called on parent searchSource', async () => {
      const parent = new SearchSource();
      const searchSource = new SearchSource({ index: indexPattern });

      const fn = jest.fn();
      searchSource.onRequestStart(fn);
      const parentFn = jest.fn();
      parent.onRequestStart(parentFn);
      const options = {};
      await searchSource.fetch(options);

      expect(fn).toBeCalledWith(searchSource, options);
      expect(parentFn).not.toBeCalled();
    });

    it('should be called on parent searchSource if callParentStartHandlers is true', async () => {
      const parent = new SearchSource();
      const searchSource = new SearchSource({ index: indexPattern }).setParent(parent, {
        callParentStartHandlers: true,
      });

      const fn = jest.fn();
      searchSource.onRequestStart(fn);
      const parentFn = jest.fn();
      parent.onRequestStart(parentFn);
      const options = {};
      await searchSource.fetch(options);

      expect(fn).toBeCalledWith(searchSource, options);
      expect(parentFn).toBeCalledWith(searchSource, options);
    });
  });
});
