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

jest.mock('ui/new_platform');

import { mockFields, mockIndexPattern } from 'ui/index_patterns';
import { getSuggestionsProvider } from './value_suggestions';

describe('getSuggestions', () => {
  let getSuggestions: any;
  let fetch: any;

  describe('with value suggestions disabled', () => {
    beforeEach(() => {
      const config = { get: () => false };
      fetch = jest.fn();
      getSuggestions = getSuggestionsProvider(config, fetch);
    });

    it('should return an empty array', async () => {
      const index = mockIndexPattern.id;
      const [field] = mockFields;
      const query = '';
      const suggestions = await getSuggestions(index, field, query);
      expect(suggestions).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('with value suggestions enabled', () => {
    beforeEach(() => {
      const config = { get: () => true };
      fetch = jest.fn();
      getSuggestions = getSuggestionsProvider(config, fetch);
    });

    it('should return true/false for boolean fields', async () => {
      const index = mockIndexPattern.id;
      const [field] = mockFields.filter(({ type }) => type === 'boolean');
      const query = '';
      const suggestions = await getSuggestions(index, field, query);
      expect(suggestions).toEqual([true, false]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should return an empty array if the field type is not a string or boolean', async () => {
      const index = mockIndexPattern.id;
      const [field] = mockFields.filter(({ type }) => type !== 'string' && type !== 'boolean');
      const query = '';
      const suggestions = await getSuggestions(index, field, query);
      expect(suggestions).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should return an empty array if the field is not aggregatable', async () => {
      const index = mockIndexPattern.id;
      const [field] = mockFields.filter(({ aggregatable }) => !aggregatable);
      const query = '';
      const suggestions = await getSuggestions(index, field, query);
      expect(suggestions).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should otherwise request suggestions', async () => {
      const index = mockIndexPattern.id;
      const [field] = mockFields.filter(
        ({ type, aggregatable }) => type === 'string' && aggregatable
      );
      const query = '';
      await getSuggestions(index, field, query);
      expect(fetch).toHaveBeenCalled();
    });

    it('should cache results if using the same index/field/query/filter', async () => {
      const index = mockIndexPattern.id;
      const [field] = mockFields.filter(
        ({ type, aggregatable }) => type === 'string' && aggregatable
      );
      const query = '';
      await getSuggestions(index, field, query);
      await getSuggestions(index, field, query);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should cache results for only one minute', async () => {
      const index = mockIndexPattern.id;
      const [field] = mockFields.filter(
        ({ type, aggregatable }) => type === 'string' && aggregatable
      );
      const query = '';

      const { now } = Date;
      Date.now = jest.fn(() => 0);
      await getSuggestions(index, field, query);
      Date.now = jest.fn(() => 60 * 1000);
      await getSuggestions(index, field, query);
      Date.now = now;

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should not cache results if using a different index/field/query', async () => {
      const fields = mockFields.filter(
        ({ type, aggregatable }) => type === 'string' && aggregatable
      );
      await getSuggestions('index', fields[0], '');
      await getSuggestions('index', fields[0], 'query');
      await getSuggestions('index', fields[1], '');
      await getSuggestions('index', fields[1], 'query');
      await getSuggestions('logstash-*', fields[0], '');
      await getSuggestions('logstash-*', fields[0], 'query');
      await getSuggestions('logstash-*', fields[1], '');
      await getSuggestions('logstash-*', fields[1], 'query');
      expect(fetch).toHaveBeenCalledTimes(8);
    });
  });
});
