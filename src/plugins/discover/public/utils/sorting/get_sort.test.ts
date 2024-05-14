/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSortForEmbeddable } from './get_sort';
import {
  stubDataView,
  stubDataViewWithoutTimeField,
} from '@kbn/data-views-plugin/common/data_view.stub';
import { uiSettingsMock } from '../../__mocks__/ui_settings';

describe('getSortForEmbeddable', function () {
  describe('getSortForEmbeddable function', function () {
    test('should return an array of arrays for sortable fields', function () {
      expect(getSortForEmbeddable([['bytes', 'desc']], stubDataView, undefined, false)).toEqual([
        ['bytes', 'desc'],
      ]);
      expect(getSortForEmbeddable([['bytes', 'desc']], stubDataView, undefined, true)).toEqual([
        ['bytes', 'desc'],
      ]);
    });

    test('should return an array of arrays from an array of elasticsearch sort objects', function () {
      expect(getSortForEmbeddable([{ bytes: 'desc' }], stubDataView, undefined, false)).toEqual([
        ['bytes', 'desc'],
      ]);
    });

    test('should sort by an empty array when an unsortable field is given', function () {
      expect(
        getSortForEmbeddable([{ 'non-sortable': 'asc' }], stubDataView, undefined, false)
      ).toEqual([]);
      expect(
        getSortForEmbeddable([{ 'non-sortable': 'asc' }], stubDataView, undefined, true)
      ).toEqual([['non-sortable', 'asc']]);
      expect(getSortForEmbeddable([{ lol_nope: 'asc' }], stubDataView, undefined, false)).toEqual(
        []
      );
      expect(
        getSortForEmbeddable(
          [{ 'non-sortable': 'asc' }],
          stubDataViewWithoutTimeField,
          undefined,
          false
        )
      ).toEqual([]);
    });

    test('should return an empty array when passed an empty sort array', () => {
      expect(getSortForEmbeddable([], stubDataView, undefined, false)).toEqual([]);
      expect(getSortForEmbeddable([], stubDataView, undefined, true)).toEqual([]);
      expect(getSortForEmbeddable([], stubDataViewWithoutTimeField, undefined, false)).toEqual([]);
    });

    test('should provide fallback results', () => {
      expect(getSortForEmbeddable(undefined, undefined, undefined, false)).toEqual([]);
      expect(getSortForEmbeddable(undefined, stubDataView, undefined, false)).toEqual([]);
      expect(getSortForEmbeddable(undefined, stubDataView, uiSettingsMock, false)).toEqual([
        ['@timestamp', 'desc'],
      ]);
      expect(getSortForEmbeddable(undefined, stubDataView, uiSettingsMock, true)).toEqual([]);
    });
  });
});
