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
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';
import { getAriaSortLabel, getSortHeaderClass } from './helpers';
// @ts-ignore
import { shortenDottedString } from '../../../../../common/utils/shorten_dotted_string';

interface Props {
  name: string;
  displayName: string;
  sortOrder: [string, string];
  onMoveColumnRight?: (name: string) => void;
  onMoveColumnLeft?: (name: string) => void;
  onRemoveColumn?: (name: string) => void;
  onCycleSortOrder?: (name: string) => void;
}

export function TableHeaderColumn({
  name,
  displayName,
  sortOrder,
  onRemoveColumn,
  onMoveColumnLeft,
  onMoveColumnRight,
  onCycleSortOrder,
}: Props) {
  return (
    <th key={name} data-test-subj="docTableHeaderField">
      <span data-test-subj={`docTableHeader-${name}`}>
        {displayName}
        {onCycleSortOrder && (
          <EuiToolTip
            content={i18n.translate('kbn.docTable.tableHeader.sortByColumnTooltip', {
              defaultMessage: 'Sort by {columnName}',
              values: { columnName: displayName },
            })}
          >
            <button
              data-test-subj={`docTableHeaderFieldSort_${name}`}
              id={`docTableHeaderFieldSort${name}`}
              aria-label={getAriaSortLabel(name, sortOrder)}
              className={getSortHeaderClass(name, sortOrder)}
              onClick={() => onCycleSortOrder && onCycleSortOrder(name)}
            ></button>
          </EuiToolTip>
        )}
      </span>
      {onRemoveColumn && (
        <EuiToolTip
          content={
            <FormattedMessage
              id="kbn.docTable.tableHeader.removeColumnButtonTooltip"
              defaultMessage="Remove column"
            />
          }
        >
          <button
            className="fa fa-remove kbnDocTableHeader__move"
            onClick={() => onRemoveColumn(name)}
            aria-label={i18n.translate('kbn.docTable.tableHeader.removeColumnButtonAriaLabel', {
              defaultMessage: 'Remove {columnName} column',
              values: { columnName: name },
            })}
            data-test-subj="docTableRemoveHeader-{{name}}"
          ></button>
        </EuiToolTip>
      )}
      {onMoveColumnLeft && (
        <EuiToolTip
          content={
            <FormattedMessage
              id="kbn.docTable.tableHeader.moveColumnLeftButtonTooltip"
              defaultMessage="Move column to the left"
            />
          }
        >
          <button
            className="fa fa-angle-double-left kbnDocTableHeader__move"
            onClick={() => onMoveColumnLeft(name)}
            aria-label={i18n.translate('kbn.docTable.tableHeader.moveColumnLeftButtonAriaLabel', {
              defaultMessage: 'Move {columnName} column to the left',
              values: { columnName: name },
            })}
          ></button>
        </EuiToolTip>
      )}
      {onMoveColumnRight && (
        <EuiToolTip
          content={
            <FormattedMessage
              id="kbn.docTable.tableHeader.moveColumnRightButtonTooltip"
              defaultMessage="Move column to the right"
            />
          }
        >
          <button
            className="fa fa-angle-double-right kbnDocTableHeader__move"
            onClick={() => onMoveColumnRight(name)}
            aria-label={i18n.translate('kbn.docTable.tableHeader.moveColumnRightButtonAriaLabel', {
              defaultMessage: 'Move {columnName} column to the right',
              values: { columnName: name },
            })}
          ></button>
        </EuiToolTip>
      )}
    </th>
  );
}
