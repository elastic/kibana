/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { dataViewComplexMock } from './data_view_complex';
import { esHitsComplex } from './es_hits_complex';
import { servicesMock } from './services';
import { DataTableContext } from '../src/table_context';
import { convertValueToString } from '../src/utils/convert_value_to_string';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils/types';

const buildTableContext = (dataView: DataView, rows: EsHitRecord[]): DataTableContext => {
  const usedRows = rows.map((row) => {
    return buildDataTableRecord(row, dataView);
  });

  return {
    expanded: undefined,
    setExpanded: jest.fn(),
    rows: usedRows,
    onFilter: jest.fn(),
    dataView,
    isDarkMode: false,
    selectedDocs: [],
    setSelectedDocs: jest.fn(),
    valueToStringConverter: (rowIndex, columnId, options) =>
      convertValueToString({
        rowIndex,
        columnId,
        fieldFormats: servicesMock.fieldFormats,
        rows: usedRows,
        dataView,
        options,
      }),
  };
};

export const dataTableContextMock = buildTableContext(dataViewMock, esHitsMock);

export const dataTableContextComplexMock = buildTableContext(dataViewComplexMock, esHitsComplex);
