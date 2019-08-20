/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import { FieldName } from 'ui/directives/field_name/field_name';
import { FieldMapping, DocViewFilterFn } from 'ui/registry/doc_views_types';
import classNames from 'classnames';
import { DocViewTableRowBtnFilterAdd } from './table_row_btn_filter_add';
import { DocViewTableRowBtnFilterRemove } from './table_row_btn_filter_remove';
import { DocViewTableRowBtnToggleColumn } from './table_row_btn_toggle_column';
import { DocViewTableRowBtnCollapse } from './table_row_btn_collapse';
import { DocViewTableRowBtnFilterExists } from './table_row_btn_filter_exists';
import { DocViewTableRowIconNoMapping } from './table_row_icon_no_mapping';
import { DocViewTableRowIconUnderscore } from './table_row_icon_underscore';

export interface Props {
  field: string;
  fieldMapping?: FieldMapping;
  isCollapsible: boolean;
  isColumnActive: boolean;
  isMetaField: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onFilter?: DocViewFilterFn;
  onToggleColumn: () => void;
  value: string;
  valueRaw: unknown;
}

export function DocViewTableRow({
  field,
  fieldMapping,
  isCollapsible,
  isCollapsed,
  isColumnActive,
  isMetaField,
  onFilter,
  onToggleCollapse,
  onToggleColumn,
  value,
  valueRaw,
}: Props) {
  const valueClassName = classNames({
    kbnDocViewer__value: true,
    'truncate-by-height': isCollapsible && isCollapsed,
  });

  const displayUnderscoreWarning = !fieldMapping && field.indexOf('_') === 0;
  const displayNoMappingWarning =
    !fieldMapping && Array.isArray(valueRaw) && typeof value[0] === 'object';

  return (
    <tr key={field} data-test-subj={`tableDocViewRow-${field}`}>
      {onFilter && (
        <td className="kbnDocViewer__buttons">
          <DocViewTableRowBtnFilterAdd
            disabled={!fieldMapping || !fieldMapping.filterable}
            onClick={() => onFilter(fieldMapping, valueRaw, '+')}
          />
          <DocViewTableRowBtnFilterRemove
            disabled={!fieldMapping || !fieldMapping.filterable}
            onClick={() => onFilter(fieldMapping, valueRaw, '-')}
          />
          <DocViewTableRowBtnToggleColumn
            active={isColumnActive}
            disabled={typeof onToggleColumn !== 'function'}
            onClick={onToggleColumn}
          />
          <DocViewTableRowBtnFilterExists
            disabled={!fieldMapping || isMetaField || fieldMapping.scripted}
            onClick={() => onFilter('_exists_', field, '+')}
            scripted={fieldMapping && fieldMapping.scripted}
          />
        </td>
      )}
      <td className="kbnDocViewer__field">
        <FieldName field={fieldMapping} fieldName={field}></FieldName>
      </td>
      <td>
        {displayUnderscoreWarning && <DocViewTableRowIconUnderscore />}
        {displayNoMappingWarning && <DocViewTableRowIconNoMapping />}

        {isCollapsible && (
          <DocViewTableRowBtnCollapse onClick={onToggleCollapse} isCollapsed={isCollapsed} />
        )}
        <div className={valueClassName} data-test-subj={`tableDocViewRow-${field}-value`}>
          {value}
        </div>
      </td>
    </tr>
  );
}
