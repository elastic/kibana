/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { dataViewComplexMock } from './data_view_complex';
import { esHitsComplex } from './es_hits_complex';
import { servicesMock } from './services';
import { DataTableContext } from '../src/table_context';
import { convertValueToString } from '../src/utils/convert_value_to_string';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { UseSelectedDocsState } from '../src/hooks/use_selected_docs';

const buildTableContext = (dataView: DataView, rows: DataTableRecord[]): DataTableContext => {
  return {
    expanded: undefined,
    setExpanded: jest.fn(),
    getRowByIndex: jest.fn((index) => rows[index]),
    onFilter: jest.fn(),
    dataView,
    isDarkMode: false,
    selectedDocsState: buildSelectedDocsState([]),
    pageIndex: 0,
    pageSize: 10,
    valueToStringConverter: (rowIndex, columnId, options) =>
      convertValueToString({
        rowIndex,
        columnId,
        fieldFormats: servicesMock.fieldFormats,
        rows,
        dataView,
        columnsMeta: undefined,
        options,
      }),
  };
};

export const dataTableContextRowsMock = esHitsMock.map((row) =>
  buildDataTableRecord(row, dataViewMock)
);

export const dataTableContextMock = buildTableContext(dataViewMock, dataTableContextRowsMock);

export const dataTableContextComplexRowsMock = esHitsComplex.map((row) =>
  buildDataTableRecord(row, dataViewComplexMock)
);

export const dataTableContextComplexMock = buildTableContext(
  dataViewComplexMock,
  dataTableContextComplexRowsMock
);

export function buildSelectedDocsState(selectedDocIds: string[]): UseSelectedDocsState {
  const selectedDocsSet = new Set(selectedDocIds);

  return {
    isDocSelected: (docId: string) => selectedDocsSet.has(docId),
    getCountOfFilteredSelectedDocs: (docIds: string[]) =>
      docIds.reduce((acc, docId) => (selectedDocsSet.has(docId) ? acc + 1 : acc), 0),
    getSelectedDocsOrderedByRows: (rows: DataTableRecord[]) =>
      rows.filter((row) => selectedDocsSet.has(row.id)),
    hasSelectedDocs: selectedDocsSet.size > 0,
    selectedDocsCount: selectedDocsSet.size,
    docIdsInSelectionOrder: selectedDocIds,
    toggleDocSelection: jest.fn(),
    toggleMultipleDocsSelection: jest.fn(),
    selectAllDocs: jest.fn(),
    selectMoreDocs: jest.fn(),
    deselectSomeDocs: jest.fn(),
    replaceSelectedDocs: jest.fn(),
    clearAllSelectedDocs: jest.fn(),
  };
}
