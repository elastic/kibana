/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { ListOperatorTypeEnum as OperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import {
  UseFieldValueAutocompleteProps,
  UseFieldValueAutocompleteReturn,
  useFieldValueAutocomplete,
} from '.';
import { autocompleteStartMock } from '../../autocomplete/index.mock';
import {
  DataViewField,
  DataViewFieldMap,
  DataViewSpec,
  FieldSpec,
} from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { fields, getField } from '@kbn/data-views-plugin/common/mocks';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';

const getMockIndexPattern = (): DataViewSpec => ({
  ...createStubDataView({
    spec: { id: '1234', title: 'logstash-*' },
  }).toSpec(),
  fields: ((): DataViewFieldMap => {
    const fieldMap: DataViewFieldMap = Object.create(null);
    for (const field of fields) {
      fieldMap[field.name] = { ...field };
    }
    return fieldMap;
  })(),
});

describe('use_field_value_autocomplete', () => {
  const onErrorMock = jest.fn();
  const getValueSuggestionsMock = jest.fn().mockResolvedValue(['value 1', 'value 2']);

  afterEach(() => {
    onErrorMock.mockClear();
    getValueSuggestionsMock.mockClear();
  });

  test('initializes hook', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          autocompleteService: {
            ...autocompleteStartMock,
            getValueSuggestions: getValueSuggestionsMock,
          },
          fieldValue: '',
          indexPattern: undefined,
          fieldFormats: fieldFormatsMock,
          operatorType: OperatorTypeEnum.MATCH,
          query: '',
          selectedField: undefined,
        })
      );
      await waitForNextUpdate();

      expect(result.current).toEqual([false, true, [], result.current[3]]);
    });
  });

  test('does not call autocomplete service if "operatorType" is "exists"', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          autocompleteService: {
            ...autocompleteStartMock,
            getValueSuggestions: getValueSuggestionsMock,
          },
          fieldValue: '',
          indexPattern: getMockIndexPattern(),
          fieldFormats: fieldFormatsMock,
          operatorType: OperatorTypeEnum.EXISTS,
          query: '',
          selectedField: getField('machine.os'),
        })
      );
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [false, true, [], result.current[3]];

      expect(getValueSuggestionsMock).not.toHaveBeenCalled();
      expect(result.current).toEqual(expectedResult);
    });
  });

  test('does not call autocomplete service if "selectedField" is undefined', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          autocompleteService: {
            ...autocompleteStartMock,
            getValueSuggestions: getValueSuggestionsMock,
          },
          fieldValue: '',
          indexPattern: getMockIndexPattern(),
          fieldFormats: fieldFormatsMock,
          operatorType: OperatorTypeEnum.EXISTS,
          query: '',
          selectedField: undefined,
        })
      );
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [false, true, [], result.current[3]];

      expect(getValueSuggestionsMock).not.toHaveBeenCalled();
      expect(result.current).toEqual(expectedResult);
    });
  });

  test('does not call autocomplete service if "indexPattern" is undefined', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          autocompleteService: {
            ...autocompleteStartMock,
            getValueSuggestions: getValueSuggestionsMock,
          },
          fieldValue: '',
          indexPattern: undefined,
          fieldFormats: fieldFormatsMock,
          operatorType: OperatorTypeEnum.EXISTS,
          query: '',
          selectedField: getField('machine.os'),
        })
      );
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [false, true, [], result.current[3]];

      expect(getValueSuggestionsMock).not.toHaveBeenCalled();
      expect(result.current).toEqual(expectedResult);
    });
  });

  test('it uses full path name for nested fields to fetch suggestions', async () => {
    const suggestionsMock = jest.fn().mockResolvedValue([]);

    await act(async () => {
      const selectedField: FieldSpec | undefined = getField('nestedField.child');
      if (selectedField == null) {
        throw new TypeError('selectedField for this test should always be defined');
      }

      const { signal } = new AbortController();
      const { waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          autocompleteService: {
            ...autocompleteStartMock,
            getValueSuggestions: suggestionsMock,
          },
          fieldValue: '',
          indexPattern: getMockIndexPattern(),
          fieldFormats: fieldFormatsMock,
          operatorType: OperatorTypeEnum.MATCH,
          query: '',
          selectedField: { ...selectedField, name: 'child' },
        })
      );
      // Note: initial `waitForNextUpdate` is hook initialization
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(suggestionsMock).toHaveBeenCalledWith({
        field: { ...getField('nestedField.child'), name: 'nestedField.child' },
        indexPattern: {
          fields: [
            {
              aggregatable: true,
              esTypes: ['integer'],
              filterable: true,
              name: 'response',
              searchable: true,
              type: 'number',
            },
          ],
          id: '1234',
          title: 'logstash-*',
        },
        query: '',
        signal,
        useTimeRange: false,
      });
    });
  });

  test('returns "isSuggestingValues" of false if field type is boolean', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          autocompleteService: {
            ...autocompleteStartMock,
            getValueSuggestions: getValueSuggestionsMock,
          },
          fieldValue: '',
          indexPattern: getMockIndexPattern(),
          fieldFormats: fieldFormatsMock,
          operatorType: OperatorTypeEnum.MATCH,
          query: '',
          selectedField: getField('ssl'),
        })
      );
      // Note: initial `waitForNextUpdate` is hook initialization
      await waitForNextUpdate();
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [false, false, [], result.current[3]];

      expect(getValueSuggestionsMock).not.toHaveBeenCalled();
      expect(result.current).toEqual(expectedResult);
    });
  });

  test('returns "isSuggestingValues" of false to note that autocomplete service is not in use if no autocomplete suggestions available', async () => {
    const suggestionsMock = jest.fn().mockResolvedValue([]);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          autocompleteService: {
            ...autocompleteStartMock,
            getValueSuggestions: suggestionsMock,
          },
          fieldValue: '',
          indexPattern: getMockIndexPattern(),
          fieldFormats: fieldFormatsMock,
          operatorType: OperatorTypeEnum.MATCH,
          query: '',
          selectedField: getField('bytes'),
        })
      );
      // Note: initial `waitForNextUpdate` is hook initialization
      await waitForNextUpdate();
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [false, false, [], result.current[3]];

      expect(suggestionsMock).toHaveBeenCalled();
      expect(result.current).toEqual(expectedResult);
    });
  });

  test('returns suggestions', async () => {
    await act(async () => {
      const { signal } = new AbortController();
      const { result, waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          autocompleteService: {
            ...autocompleteStartMock,
            getValueSuggestions: getValueSuggestionsMock,
          },
          fieldValue: '',
          indexPattern: getMockIndexPattern(),
          fieldFormats: fieldFormatsMock,
          operatorType: OperatorTypeEnum.MATCH,
          query: '',
          selectedField: getField('@tags'),
        })
      );
      // Note: initial `waitForNextUpdate` is hook initialization
      await waitForNextUpdate();
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [
        false,
        true,
        ['value 1', 'value 2'],
        result.current[3],
      ];

      expect(getValueSuggestionsMock).toHaveBeenCalledWith({
        field: getField('@tags'),
        indexPattern: getMockIndexPattern(),
        fieldFormats: fieldFormatsMock,
        query: '',
        signal,
        useTimeRange: false,
      });
      expect(result.current).toEqual(expectedResult);
    });
  });

  test('returns new suggestions on subsequent calls', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          autocompleteService: {
            ...autocompleteStartMock,
            getValueSuggestions: getValueSuggestionsMock,
          },
          fieldValue: '',
          indexPattern: getMockIndexPattern(),
          fieldFormats: fieldFormatsMock,
          operatorType: OperatorTypeEnum.MATCH,
          query: '',
          selectedField: getField('@tags'),
        })
      );
      // Note: initial `waitForNextUpdate` is hook initialization
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current[3]).not.toBeNull();

      // TODO: Added check for typescripts sake, if null,
      // would not reach below logic as test would stop above
      if (result.current[3] != null) {
        result.current[3]({
          fieldSelected: getField('@tags') as DataViewField, // as-cast - see above.
          patterns: createStubDataView({
            spec: {
              id: '1234',
              title: 'logstash-*',
              fields: ((): DataViewFieldMap => {
                const fieldMap: DataViewFieldMap = Object.create(null);
                for (const field of fields) {
                  fieldMap[field.name] = { ...field };
                }
                return fieldMap;
              })(),
            },
          }),
          searchQuery: '',
          value: 'hello',
        });
      }

      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [
        false,
        true,
        ['value 1', 'value 2'],
        result.current[3],
      ];

      expect(getValueSuggestionsMock).toHaveBeenCalledTimes(2);
      expect(result.current).toEqual(expectedResult);
    });
  });
});
