/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { createSeries } from '../__mocks__';
import { isSplitWithDateHistogram } from './buckets_columns';

describe('isSplitWithDateHistogram', () => {
  const dataView = stubLogstashDataView;
  const series = createSeries({ terms_field: dataView.fields[0].name, split_mode: 'terms' });
  const splitFieldsWithMultipleDateFields = [dataView.fields[0].name, dataView.fields[2].name];
  test.each<[string, Parameters<typeof isSplitWithDateHistogram>, boolean | null]>([
    [
      'null if split_mode is terms, terms_field is specified and splitFields contains date field and others',
      [series, splitFieldsWithMultipleDateFields, dataView],
      null,
    ],
    [
      'true if split_mode is terms, terms_field is specified and splitFields contains date field',
      [series, [dataView.fields[2].name], dataView],
      true,
    ],
    [
      'false if no terms field is specified',
      [createSeries({ split_mode: 'terms' }), splitFieldsWithMultipleDateFields, dataView],
      false,
    ],
    [
      'false if split_mode is not terms',
      [
        createSeries({ terms_field: dataView.fields[0].name, split_mode: 'some-split-mode' }),
        splitFieldsWithMultipleDateFields,
        dataView,
      ],
      false,
    ],
    ['false if splitFields array is empty', [series, [], dataView], false],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(isSplitWithDateHistogram(...input)).toBeNull();
    } else {
      expect(isSplitWithDateHistogram(...input)).toBe(expected);
    }
  });
});
