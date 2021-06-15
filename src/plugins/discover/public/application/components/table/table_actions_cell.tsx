/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { DocViewTableRowBtnFilterRemove } from './table_row_btn_filter_remove';
import { DocViewTableRowBtnFilterExists } from './table_row_btn_filter_exists';
import { DocViewTableRowBtnToggleColumn } from './table_row_btn_toggle_column';
import { DocViewTableRowBtnFilterAdd } from './table_row_btn_filter_add';
import { IndexPatternField } from '../../../../../data/public';
import { DocViewFilterFn } from '../../doc_views/doc_views_types';

interface TableActionsProps {
  isActive: boolean;
  fieldName: string;
  formattedField: unknown;
  flattenedField: unknown;
  fieldMapping: IndexPatternField | undefined;
  onFilter: DocViewFilterFn;
  onToggleColumn: (field: string) => void;
}

export const TableActions = ({
  isActive,
  fieldName,
  fieldMapping,
  formattedField,
  flattenedField,
  onToggleColumn,
  onFilter,
}: TableActionsProps) => {
  const toggleColumn = () => {
    onToggleColumn(fieldName);
  };

  return (
    <Fragment>
      <DocViewTableRowBtnFilterAdd
        disabled={!fieldMapping || !fieldMapping.filterable}
        onClick={() => onFilter(fieldMapping, flattenedField, '+')}
      />
      <DocViewTableRowBtnFilterRemove
        disabled={!fieldMapping || !fieldMapping.filterable}
        onClick={() => onFilter(fieldMapping, flattenedField, '-')}
      />
      <DocViewTableRowBtnToggleColumn
        active={isActive}
        fieldname={fieldName}
        onClick={toggleColumn}
      />
      <DocViewTableRowBtnFilterExists
        disabled={!fieldMapping || !fieldMapping.filterable}
        onClick={() => onFilter('_exists_', fieldName, '+')}
        scripted={fieldMapping && fieldMapping.scripted}
      />
    </Fragment>
  );
};
