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
import { FormattedMessage } from '@kbn/i18n/react';
import _ from 'lodash';

interface Props {
  indexPattern: any;
  hideTimeColumn: number;
  totalItems: number;
  columns: string[];
  headerClass: (name: string) => string;
  cycleSortOrder: (name: string) => string;
  getShortDotsName: (name: string) => string;
  isSortableColumn: (name: string) => boolean;
  getAriaLabelForColumn: (name: string) => string;
  tooltip: (name: string) => string;
  moveColumnLeft: (name: string) => boolean;
  onRemoveColumn: (name: string) => void;
  canMoveColumnRight: (name: string) => boolean;
  canRemoveColumn: (name: string) => boolean;
  canMoveColumnLeft: (name: string) => boolean;
  moveColumnRight: (name: string) => void;
  onChangeSortOrder: () => void;
}

export function TableHeader({
  indexPattern,
  hideTimeColumn,
  columns,
  headerClass,
  cycleSortOrder,
  getShortDotsName,
  getAriaLabelForColumn,
  tooltip,
  moveColumnLeft,
  onRemoveColumn,
  canRemoveColumn,
  canMoveColumnLeft,
  canMoveColumnRight,
  moveColumnRight,
  onChangeSortOrder,
}: Props) {
  function isSortableColumn(columnName: string) {
    return (
      !!indexPattern &&
      typeof onChangeSortOrder === 'function' &&
      _.get(indexPattern, ['fields', 'byName', columnName, 'sortable'], false)
    );
  }

  return (
    <tr>
      <td></td>
      {indexPattern.timeFieldName && !hideTimeColumn && (
        <th data-test-subj="docTableHeaderField" scope="col">
          <span>
            <FormattedMessage
              id="kbn.docTable.tableHeader.timeHeaderCellTitle"
              defaultMessage="Time"
            />
            <button
              id="docTableHeaderFieldSort{{indexPattern.timeFieldName}}"
              label="{{ getAriaLabelForColumn(indexPattern.timeFieldName) }}"
              className={headerClass(indexPattern.timeFieldName)}
              onClick={() => cycleSortOrder(indexPattern.timeFieldName)}
              tooltip="{{ ::'kbn.docTable.tableHeader.sortByTimeTooltip' | i18n: {defaultMessage: 'Sort by time'} }}"
            ></button>
          </span>
        </th>
      )}
      {columns.map((name: string) => (
        <th data-test-subj="docTableHeaderField">
          <span data-test-subj="docTableHeader-{{name}}">
            {getShortDotsName(name)}
            {isSortableColumn(name) && (
              <button
                data-test-subj="docTableHeaderFieldSort_{{name}}"
                id={`docTableHeaderFieldSort${name}`}
                aria-label={getAriaLabelForColumn(name)}
                className={headerClass(name)}
                onClick={() => cycleSortOrder(name)}
                tooltip={tooltip(name)}
                tooltip-append-to-body="1"
              ></button>
            )}
          </span>
          {canRemoveColumn(name) && (
            <button
              className="fa fa-remove kbnDocTableHeader__move"
              onClick={() => onRemoveColumn(name)}
              tooltip-append-to-body="1"
              tooltip="{{ ::'kbn.docTable.tableHeader.removeColumnButtonTooltip' | i18n: {defaultMessage: 'Remove column'} }}"
              aria-label="{{ 'kbn.docTable.tableHeader.removeColumnButtonAriaLabel' | i18n: {
        defaultMessage: 'Remove {columnName} column',
        values: {columnName: name}
      }}}"
              data-test-subj="docTableRemoveHeader-{{name}}"
            ></button>
          )}
          {canMoveColumnLeft(name) && (
            <button
              className="fa fa-angle-double-left kbnDocTableHeader__move"
              oncClick={() => moveColumnLeft(name)}
              tooltip="{{ ::'kbn.docTable.tableHeader.moveColumnLeftButtonTooltip' | i18n: {defaultMessage: 'Move column to the left'} }}"
              aria-label="{{ 'kbn.docTable.tableHeader.moveColumnLeftButtonAriaLabel' | i18n: {
        defaultMessage: 'Move {columnName} column to the left',
        values: {columnName: name}
      } }}"
            ></button>
          )}
          {canMoveColumnRight(name) && (
            <button
              className="fa fa-angle-double-right kbnDocTableHeader__move"
              onClick={() => moveColumnRight(name)}
              tooltip="{{ ::'kbn.docTable.tableHeader.moveColumnRightButtonTooltip' | i18n: {defaultMessage: 'Move column to the right'} }}"
              aria-label="{{ 'kbn.docTable.tableHeader.moveColumnRightButtonAriaLabel' | i18n: {
        defaultMessage: 'Move {columnName} column to the right',
        values: {columnName: name}
      } }}"
            ></button>
          )}
        </th>
      ))}
    </tr>
  );
}
