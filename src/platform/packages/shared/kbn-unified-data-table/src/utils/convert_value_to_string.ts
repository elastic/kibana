/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cellHasFormulas, createEscapeValue } from '@kbn/data-plugin/common';
import { type DataSource, IndexPatternSource } from '@kbn/data-source';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataTableRecord, ShouldShowFieldInTableHandler } from '@kbn/discover-utils/types';
import { convertValueToString as commonConvertValueToString } from '@kbn/discover-utils';
import { getFieldFromDataSource } from './get_field_from_data_source';
import type { SourceDisplayMode } from '../types';
import { SOURCE_COLUMN } from './columns';
import { sourceDocumentToJsonString } from './build_document_tree';

interface ConvertedResult {
  formattedString: string;
  withFormula: boolean;
}

const separator = ',';

export const convertValueToString = ({
  rowIndex,
  rows,
  columnId,
  dataSource,
  fieldFormats,
  options,
  sourceDisplayMode,
  shouldShowFieldHandler,
  selectedColumns,
}: {
  rowIndex: number;
  rows: DataTableRecord[];
  columnId: string;
  dataSource: DataSource | undefined;
  fieldFormats: FieldFormatsStart;
  options?: {
    compatibleWithCSV?: boolean; // values as one-liner + escaping formulas + adding wrapping quotes
    compatibleWithMarkdown?: boolean; // values as one-liner
  };
  sourceDisplayMode?: SourceDisplayMode;
  shouldShowFieldHandler?: ShouldShowFieldInTableHandler;
  selectedColumns?: string[];
}): ConvertedResult => {
  const row = rows[rowIndex];
  if (!row) {
    return {
      formattedString: '',
      withFormula: false,
    };
  }
  const dataView = dataSource instanceof IndexPatternSource ? dataSource.getDataView() : undefined;

  if (
    sourceDisplayMode === 'json' &&
    columnId === SOURCE_COLUMN &&
    shouldShowFieldHandler &&
    dataView
  ) {
    const multiline = !(options?.compatibleWithCSV || options?.compatibleWithMarkdown);
    return {
      formattedString: sourceDocumentToJsonString(
        { row, dataView, shouldShowFieldHandler, selectedColumns },
        { multiline }
      ),
      withFormula: false,
    };
  }

  const value = row.flattened?.[columnId];
  const field = getFieldFromDataSource(dataSource, columnId);

  return commonConvertValueToString({
    dataView,
    dataViewField: field,
    flattenedValue: value,
    dataTableRecord: row,
    fieldFormats,
    options,
  });
};

export const convertNameToString = (name: string): ConvertedResult => {
  return {
    formattedString: escapeFormattedValue(name),
    withFormula: cellHasFormulas(name),
  };
};

const escapeValueFn = createEscapeValue({
  separator,
  quoteValues: true,
  escapeFormulaValues: true,
});

const escapeFormattedValue = (formattedValue: string): string => {
  return escapeValueFn(formattedValue);
};
