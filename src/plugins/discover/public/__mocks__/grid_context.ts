/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flattenHit } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/public';
import { indexPatternMock } from './index_pattern';
import { dataViewWithVariousFieldTypesMock } from './data_view_with_various_field_types';
import { esHits, esHitsWithVariousFieldTypes } from './es_hits';
import { discoverServiceMock } from './services';
import { GridContext } from '../components/discover_grid/discover_grid_context';
import { convertValueToString } from '../utils/convert_value_to_string';
import type { ElasticSearchHit } from '../types';

const buildGridContext = (dataView: DataView, rows: ElasticSearchHit[]): GridContext => {
  const rowsFlattened = rows.map((hit) =>
    flattenHit(hit, dataView, { includeIgnoredValues: true })
  );

  return {
    expanded: undefined,
    setExpanded: jest.fn(),
    rows,
    rowsFlattened,
    onFilter: jest.fn(),
    indexPattern: dataView,
    isDarkMode: false,
    selectedDocs: [],
    setSelectedDocs: jest.fn(),
    valueToStringConverter: (rowIndex, columnId, options) =>
      convertValueToString({
        rowIndex,
        columnId,
        services: discoverServiceMock,
        rows,
        rowsFlattened,
        dataView,
        options,
      }),
  };
};

export const discoverGridContextMock = buildGridContext(indexPatternMock, esHits);

export const discoverGridContextWithVariousFieldTypesMock = buildGridContext(
  dataViewWithVariousFieldTypesMock,
  esHitsWithVariousFieldTypes
);
