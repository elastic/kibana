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

import { stubIndexPattern, stubFields } from '../stubs';
import { getSuggestionsProvider } from './value_suggestions';
import { IUiSettingsClient } from 'kibana/public';

describe('getSuggestions', () => {
  let getSuggestions: any;
  let http: any;

  describe('with value suggestions disabled', () => {
    beforeEach(() => {
      const config = { get: (key: string) => false } as IUiSettingsClient;
      http = { fetch: jest.fn() };
      getSuggestions = getSuggestionsProvider(config, http);
    });

    it('should return an empty array', async () => {
      const index = stubIndexPattern.id;
      const [field] = stubFields;
      const query = '';
      const suggestions = await getSuggestions(index, field, query);
      expect(suggestions).toEqual([]);
      expect(http.fetch).not.toHaveBeenCalled();
    });
  });

  describe('with value suggestions enabled', () => {
    beforeEach(() => {
      const config = { get: (key: string) => true } as IUiSettingsClient;
      http = { fetch: jest.fn() };
      getSuggestions = getSuggestionsProvider(config, http);
    });

    it('should return true/false for boolean fields', async () => {
      const index = stubIndexPattern.id;
      const [field] = stubFields.filter(({ type }) => type === 'boolean');
      const query = '';
      const suggestions = await getSuggestions(index, field, query);
      expect(suggestions).toEqual([true, false]);
      expect(http.fetch).not.toHaveBeenCalled();
    });

    it('should return an empty array if the field type is not a string or boolean', async () => {
      const index = stubIndexPattern.id;
      const [field] = stubFields.filter(({ type }) => type !== 'string' && type !== 'boolean');
      const query = '';
      const suggestions = await getSuggestions(index, field, query);
      expect(suggestions).toEqual([]);
      expect(http.fetch).not.toHaveBeenCalled();
    });

    it('should return an empty array if the field is not aggregatable', async () => {
      const index = stubIndexPattern.id;
      const [field] = stubFields.filter(({ aggregatable }) => !aggregatable);
      const query = '';
      const suggestions = await getSuggestions(index, field, query);
      expect(suggestions).toEqual([]);
      expect(http.fetch).not.toHaveBeenCalled();
    });

    it('should otherwise request suggestions', async () => {
      const index = stubIndexPattern.id;
      const [field] = stubFields.filter(
        ({ type, aggregatable }) => type === 'string' && aggregatable
      );
      const query = '';
      await getSuggestions(index, field, query);
      expect(http.fetch).toHaveBeenCalled();
    });

    it('should cache results if using the same index/field/query/filter', async () => {
      const index = stubIndexPattern.id;
      const [field] = stubFields.filter(
        ({ type, aggregatable }) => type === 'string' && aggregatable
      );
      const query = '';
      await getSuggestions(index, field, query);
      await getSuggestions(index, field, query);
      expect(http.fetch).toHaveBeenCalledTimes(1);
    });

    it('should cache results for only one minute', async () => {
      const index = stubIndexPattern.id;
      const [field] = stubFields.filter(
        ({ type, aggregatable }) => type === 'string' && aggregatable
      );
      const query = '';

      const { now } = Date;
      Date.now = jest.fn(() => 0);
      await getSuggestions(index, field, query);
      Date.now = jest.fn(() => 60 * 1000);
      await getSuggestions(index, field, query);
      Date.now = now;

      expect(http.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not cache results if using a different index/field/query', async () => {
      const fields = stubFields.filter(
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
      expect(http.fetch).toHaveBeenCalledTimes(8);
    });
  });
});
