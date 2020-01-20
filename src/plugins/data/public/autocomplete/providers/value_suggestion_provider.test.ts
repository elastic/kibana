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

import { stubIndexPattern, stubFields } from '../../stubs';
import { setupValueSuggestionProvider, ValueSuggestionsGetFn } from './value_suggestion_provider';
import { IUiSettingsClient, CoreSetup } from 'kibana/public';

describe('FieldSuggestions', () => {
  let getValueSuggestions: ValueSuggestionsGetFn;
  let http: any;
  let shouldSuggestValues: boolean;

  beforeEach(() => {
    const uiSettings = { get: (key: string) => shouldSuggestValues } as IUiSettingsClient;
    http = { fetch: jest.fn() };

    getValueSuggestions = setupValueSuggestionProvider({ http, uiSettings } as CoreSetup);
  });

  describe('with value suggestions disabled', () => {
    it('should return an empty array', async () => {
      const suggestions = await getValueSuggestions({
        indexPattern: stubIndexPattern,
        field: stubFields[0],
        query: '',
      });

      expect(suggestions).toEqual([]);
      expect(http.fetch).not.toHaveBeenCalled();
    });
  });

  describe('with value suggestions enabled', () => {
    shouldSuggestValues = true;

    it('should return true/false for boolean fields', async () => {
      const [field] = stubFields.filter(({ type }) => type === 'boolean');
      const suggestions = await getValueSuggestions({
        indexPattern: stubIndexPattern,
        field,
        query: '',
      });

      expect(suggestions).toEqual([true, false]);
      expect(http.fetch).not.toHaveBeenCalled();
    });

    it('should return an empty array if the field type is not a string or boolean', async () => {
      const [field] = stubFields.filter(({ type }) => type !== 'string' && type !== 'boolean');
      const suggestions = await getValueSuggestions({
        indexPattern: stubIndexPattern,
        field,
        query: '',
      });

      expect(suggestions).toEqual([]);
      expect(http.fetch).not.toHaveBeenCalled();
    });

    it('should return an empty array if the field is not aggregatable', async () => {
      const [field] = stubFields.filter(({ aggregatable }) => !aggregatable);
      const suggestions = await getValueSuggestions({
        indexPattern: stubIndexPattern,
        field,
        query: '',
      });

      expect(suggestions).toEqual([]);
      expect(http.fetch).not.toHaveBeenCalled();
    });

    it('should otherwise request suggestions', async () => {
      const [field] = stubFields.filter(
        ({ type, aggregatable }) => type === 'string' && aggregatable
      );

      await getValueSuggestions({
        indexPattern: stubIndexPattern,
        field,
        query: '',
      });

      expect(http.fetch).toHaveBeenCalled();
    });

    it('should cache results if using the same index/field/query/filter', async () => {
      const [field] = stubFields.filter(
        ({ type, aggregatable }) => type === 'string' && aggregatable
      );
      const args = {
        indexPattern: stubIndexPattern,
        field,
        query: '',
      };

      await getValueSuggestions(args);
      await getValueSuggestions(args);

      expect(http.fetch).toHaveBeenCalledTimes(1);
    });

    it('should cache results for only one minute', async () => {
      const [field] = stubFields.filter(
        ({ type, aggregatable }) => type === 'string' && aggregatable
      );
      const args = {
        indexPattern: stubIndexPattern,
        field,
        query: '',
      };

      const { now } = Date;
      Date.now = jest.fn(() => 0);

      await getValueSuggestions(args);

      Date.now = jest.fn(() => 60 * 1000);
      await getValueSuggestions(args);
      Date.now = now;

      expect(http.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not cache results if using a different index/field/query', async () => {
      const fields = stubFields.filter(
        ({ type, aggregatable }) => type === 'string' && aggregatable
      );

      await getValueSuggestions({
        indexPattern: stubIndexPattern,
        field: fields[0],
        query: '',
      });
      await getValueSuggestions({
        indexPattern: stubIndexPattern,
        field: fields[0],
        query: 'query',
      });
      await getValueSuggestions({
        indexPattern: stubIndexPattern,
        field: fields[1],
        query: '',
      });
      await getValueSuggestions({
        indexPattern: stubIndexPattern,
        field: fields[1],
        query: 'query',
      });

      const customIndexPattern = {
        ...stubIndexPattern,
        title: 'customIndexPattern',
      };

      await getValueSuggestions({
        indexPattern: customIndexPattern,
        field: fields[0],
        query: '',
      });
      await getValueSuggestions({
        indexPattern: customIndexPattern,
        field: fields[0],
        query: 'query',
      });
      await getValueSuggestions({
        indexPattern: customIndexPattern,
        field: fields[1],
        query: '',
      });
      await getValueSuggestions({
        indexPattern: customIndexPattern,
        field: fields[1],
        query: 'query',
      });

      expect(http.fetch).toHaveBeenCalledTimes(8);
    });
  });
});
