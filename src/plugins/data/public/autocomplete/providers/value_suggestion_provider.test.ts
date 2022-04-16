/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubIndexPattern, stubFields } from '../../stubs';
import type { TimefilterSetup } from '../../query';
import { setupValueSuggestionProvider } from './value_suggestion_provider';
import type { ValueSuggestionsGetFn } from './value_suggestion_provider';
import { IUiSettingsClient, CoreSetup } from '@kbn/core/public';
import { UI_SETTINGS } from '../../../common';

describe('FieldSuggestions', () => {
  let getValueSuggestions: ValueSuggestionsGetFn;
  let http: any;
  let uiConfig: Record<string, any> = {};
  const uiSettings = {
    get: (key: string) => uiConfig[key],
  } as IUiSettingsClient;

  beforeEach(() => {
    http = { fetch: jest.fn().mockResolvedValue([]) };

    getValueSuggestions = setupValueSuggestionProvider({ http, uiSettings } as CoreSetup, {
      timefilter: {
        timefilter: {
          createFilter: () => {
            return {
              time: 'fake',
            };
          },
          getTime: () => {
            return {
              to: 'now',
              from: 'now-15m',
            };
          },
        },
      } as unknown as TimefilterSetup,
    });
  });

  describe('with value suggestions disabled', () => {
    uiConfig = { [UI_SETTINGS.FILTERS_EDITOR_SUGGEST_VALUES]: false };

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
    uiConfig = { [UI_SETTINGS.FILTERS_EDITOR_SUGGEST_VALUES]: true };

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
        useTimeRange: false,
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
        useTimeRange: false,
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
        useTimeRange: false,
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
        useTimeRange: false,
      });
      await getValueSuggestions({
        indexPattern: stubIndexPattern,
        field: fields[0],
        query: 'query',
        useTimeRange: false,
      });
      await getValueSuggestions({
        indexPattern: stubIndexPattern,
        field: fields[1],
        query: '',
        useTimeRange: false,
      });
      await getValueSuggestions({
        indexPattern: stubIndexPattern,
        field: fields[1],
        query: 'query',
        useTimeRange: false,
      });

      const customIndexPattern = {
        ...stubIndexPattern,
        title: 'customIndexPattern',
        useTimeRange: false,
      };

      await getValueSuggestions({
        indexPattern: customIndexPattern,
        field: fields[0],
        query: '',
        useTimeRange: false,
      });
      await getValueSuggestions({
        indexPattern: customIndexPattern,
        field: fields[0],
        query: 'query',
        useTimeRange: false,
      });
      await getValueSuggestions({
        indexPattern: customIndexPattern,
        field: fields[1],
        query: '',
        useTimeRange: false,
      });
      await getValueSuggestions({
        indexPattern: customIndexPattern,
        field: fields[1],
        query: 'query',
        useTimeRange: false,
      });

      expect(http.fetch).toHaveBeenCalledTimes(8);
    });

    it('should apply timefilter', async () => {
      const [field] = stubFields.filter(
        ({ type, aggregatable }) => type === 'string' && aggregatable
      );

      await getValueSuggestions({
        indexPattern: stubIndexPattern,
        field,
        query: '',
        useTimeRange: true,
      });
      const callParams = http.fetch.mock.calls[0][1];

      expect(JSON.parse(callParams.body).filters).toHaveLength(1);
      expect(http.fetch).toHaveBeenCalled();
    });

    it('should use terms_enum', async () => {
      uiConfig = {
        [UI_SETTINGS.FILTERS_EDITOR_SUGGEST_VALUES]: true,
        [UI_SETTINGS.AUTOCOMPLETE_VALUE_SUGGESTION_METHOD]: 'terms_enum',
      };
      const [field] = stubFields.filter(
        ({ type, aggregatable }) => type === 'string' && aggregatable
      );

      await getValueSuggestions({
        indexPattern: stubIndexPattern,
        field,
        query: '',
        useTimeRange: true,
      });
      const callParams = http.fetch.mock.calls[0][1];

      expect(JSON.parse(callParams.body)).toHaveProperty('method', 'terms_enum');
    });

    it('should use terms_agg', async () => {
      uiConfig = {
        [UI_SETTINGS.FILTERS_EDITOR_SUGGEST_VALUES]: true,
        [UI_SETTINGS.AUTOCOMPLETE_VALUE_SUGGESTION_METHOD]: 'terms_agg',
      };
      const [field] = stubFields.filter(
        ({ type, aggregatable }) => type === 'string' && aggregatable
      );

      await getValueSuggestions({
        indexPattern: stubIndexPattern,
        field,
        query: '',
        useTimeRange: true,
      });
      const callParams = http.fetch.mock.calls[0][1];

      expect(JSON.parse(callParams.body)).toHaveProperty('method', 'terms_agg');
    });

    it('should use method passed in', async () => {
      uiConfig = {
        [UI_SETTINGS.FILTERS_EDITOR_SUGGEST_VALUES]: true,
        [UI_SETTINGS.AUTOCOMPLETE_VALUE_SUGGESTION_METHOD]: 'terms_agg',
      };
      const [field] = stubFields.filter(
        ({ type, aggregatable }) => type === 'string' && aggregatable
      );

      await getValueSuggestions({
        indexPattern: stubIndexPattern,
        field,
        query: '',
        useTimeRange: true,
        method: 'terms_agg',
      });
      const callParams = http.fetch.mock.calls[0][1];

      expect(JSON.parse(callParams.body)).toHaveProperty('method', 'terms_agg');
    });
  });
});
