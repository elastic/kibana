/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { DocViewTableRowBtnFilterRemove } from './table_row_btn_filter_remove';
import { DocViewTableRowBtnFilterExists } from './table_row_btn_filter_exists';
import { DocViewTableRowBtnToggleColumn } from './table_row_btn_toggle_column';
import { DocViewTableRowBtnFilterAdd } from './table_row_btn_filter_add';

interface TableActionsProps {
  field: string;
  isActive: boolean;
  flattenedField: unknown;
  fieldMapping?: DataViewField;
  onFilter: DocViewFilterFn;
  onToggleColumn: ((field: string) => void) | undefined;
  ignoredValue: boolean;
}

export const TableActions = ({
  isActive,
  field,
  fieldMapping,
  flattenedField,
  onToggleColumn,
  onFilter,
  ignoredValue,
}: TableActionsProps) => {
  return (
    <div className="kbnDocViewer__buttons">
      {onFilter && (
        <DocViewTableRowBtnFilterAdd
          disabled={!fieldMapping || !fieldMapping.filterable || ignoredValue}
          onClick={() => onFilter(fieldMapping, flattenedField, '+')}
        />
      )}
      {onFilter && (
        <DocViewTableRowBtnFilterRemove
          disabled={!fieldMapping || !fieldMapping.filterable || ignoredValue}
          onClick={() => onFilter(fieldMapping, flattenedField, '-')}
        />
      )}
      {onToggleColumn && (
        <DocViewTableRowBtnToggleColumn
          active={isActive}
          fieldname={field}
          onClick={() => onToggleColumn(field)}
        />
      )}
      {onFilter && (
        <DocViewTableRowBtnFilterExists
          disabled={!fieldMapping || !fieldMapping.filterable}
          onClick={() => onFilter('_exists_', field, '+')}
          scripted={fieldMapping && fieldMapping.scripted}
        />
      )}
    </div>
  );
};
