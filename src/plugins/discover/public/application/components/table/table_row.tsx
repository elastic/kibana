/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import classNames from 'classnames';
import React, { ReactNode } from 'react';
import { FieldMapping, DocViewFilterFn } from '../../doc_views/doc_views_types';
import { DocViewTableRowBtnFilterAdd } from './table_row_btn_filter_add';
import { DocViewTableRowBtnFilterRemove } from './table_row_btn_filter_remove';
import { DocViewTableRowBtnToggleColumn } from './table_row_btn_toggle_column';
import { DocViewTableRowBtnCollapse } from './table_row_btn_collapse';
import { DocViewTableRowBtnFilterExists } from './table_row_btn_filter_exists';
import { DocViewTableRowIconUnderscore } from './table_row_icon_underscore';
import { FieldName } from '../field_name/field_name';

export interface Props {
  field: string;
  fieldMapping?: FieldMapping;
  fieldType: string;
  displayUnderscoreWarning: boolean;
  isCollapsible: boolean;
  isColumnActive: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onFilter?: DocViewFilterFn;
  onToggleColumn?: () => void;
  value: string | ReactNode;
  valueRaw: unknown;
}

export function DocViewTableRow({
  field,
  fieldMapping,
  fieldType,
  displayUnderscoreWarning,
  isCollapsible,
  isCollapsed,
  isColumnActive,
  onFilter,
  onToggleCollapse,
  onToggleColumn,
  value,
  valueRaw,
}: Props) {
  const valueClassName = classNames({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    kbnDocViewer__value: true,
    'truncate-by-height': isCollapsible && isCollapsed,
  });

  return (
    <tr key={field} data-test-subj={`tableDocViewRow-${field}`}>
      <td className="kbnDocViewer__field">
        <FieldName
          fieldName={field}
          fieldType={fieldType}
          fieldMapping={fieldMapping}
          scripted={Boolean(fieldMapping?.scripted)}
        />
      </td>
      <td>
        {isCollapsible && (
          <DocViewTableRowBtnCollapse onClick={onToggleCollapse} isCollapsed={isCollapsed} />
        )}
        {displayUnderscoreWarning && <DocViewTableRowIconUnderscore />}
        <div
          className={valueClassName}
          data-test-subj={`tableDocViewRow-${field}-value`}
          /*
           * Justification for dangerouslySetInnerHTML:
           * We just use values encoded by our field formatters
           */
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: value as string }}
        />
      </td>
      {typeof onFilter === 'function' && (
        <td className="kbnDocViewer__buttons">
          <DocViewTableRowBtnFilterAdd
            disabled={!fieldMapping || !fieldMapping.filterable}
            onClick={() => onFilter(fieldMapping, valueRaw, '+')}
          />
          <DocViewTableRowBtnFilterRemove
            disabled={!fieldMapping || !fieldMapping.filterable}
            onClick={() => onFilter(fieldMapping, valueRaw, '-')}
          />
          {typeof onToggleColumn === 'function' && (
            <DocViewTableRowBtnToggleColumn active={isColumnActive} onClick={onToggleColumn} />
          )}
          <DocViewTableRowBtnFilterExists
            disabled={!fieldMapping || !fieldMapping.filterable}
            onClick={() => onFilter('_exists_', field, '+')}
            scripted={fieldMapping && fieldMapping.scripted}
          />
        </td>
      )}
    </tr>
  );
}
