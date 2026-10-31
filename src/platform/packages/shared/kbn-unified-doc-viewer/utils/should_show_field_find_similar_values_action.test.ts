/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import {
  getFindSimilarValuesValue,
  shouldShowFieldFindSimilarValuesAction,
} from './should_show_field_find_similar_values_action';

const createDataView = (isTimeBased: boolean) => ({ isTimeBased: () => isTimeBased } as DataView);
const createField = (esTypes: string[]) => ({ esTypes } as DataViewField);

describe('shouldShowFieldFindSimilarValuesAction', () => {
  const onFindSimilarValues = jest.fn();

  it('should show for a text field of a time based data view', () => {
    expect(
      shouldShowFieldFindSimilarValuesAction({
        dataView: createDataView(true),
        dataViewField: createField(['text']),
        onFindSimilarValues,
      })
    ).toBe(true);
  });

  it('should not show without a callback', () => {
    expect(
      shouldShowFieldFindSimilarValuesAction({
        dataView: createDataView(true),
        dataViewField: createField(['text']),
        onFindSimilarValues: undefined,
      })
    ).toBe(false);
  });

  it('should not show for non text fields', () => {
    expect(
      shouldShowFieldFindSimilarValuesAction({
        dataView: createDataView(true),
        dataViewField: createField(['keyword']),
        onFindSimilarValues,
      })
    ).toBe(false);
  });

  it('should not show for a data view that is not time based', () => {
    expect(
      shouldShowFieldFindSimilarValuesAction({
        dataView: createDataView(false),
        dataViewField: createField(['text']),
        onFindSimilarValues,
      })
    ).toBe(false);
  });

  it('should not show without a data view or field', () => {
    expect(
      shouldShowFieldFindSimilarValuesAction({
        dataView: undefined,
        dataViewField: createField(['text']),
        onFindSimilarValues,
      })
    ).toBe(false);
    expect(
      shouldShowFieldFindSimilarValuesAction({
        dataView: createDataView(true),
        dataViewField: undefined,
        onFindSimilarValues,
      })
    ).toBe(false);
  });
});

describe('getFindSimilarValuesValue', () => {
  it('should return the value as a string', () => {
    expect(getFindSimilarValuesValue('message')).toBe('message');
    expect(getFindSimilarValuesValue(5)).toBe('5');
  });

  it('should use the first value of a multi-valued field', () => {
    expect(getFindSimilarValuesValue(['first', 'second'])).toBe('first');
  });

  it('should return undefined for an empty value', () => {
    expect(getFindSimilarValuesValue(undefined)).toBeUndefined();
    expect(getFindSimilarValuesValue(null)).toBeUndefined();
    expect(getFindSimilarValuesValue('')).toBeUndefined();
    expect(getFindSimilarValuesValue([])).toBeUndefined();
  });
});
