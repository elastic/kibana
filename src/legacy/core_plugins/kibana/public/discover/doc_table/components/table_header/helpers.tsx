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
import { i18n } from '@kbn/i18n';

export type SortOrder = [string, string];

export function getAriaSortLabel(columnName: string, sortOrder: SortOrder) {
  const [currentColumnName, currentDirection = 'asc'] = sortOrder;
  if (name === currentColumnName && currentDirection === 'asc') {
    return i18n.translate('kbn.docTable.tableHeader.sortByColumnDescendingAriaLabel', {
      defaultMessage: 'Sort {columnName} descending',
      values: { columnName },
    });
  }
  return i18n.translate('kbn.docTable.tableHeader.sortByColumnAscendingAriaLabel', {
    defaultMessage: 'Sort {columnName} ascending',
    values: { columnName },
  });
}

export function getSortHeaderClass(columnName: string, sortOrder: SortOrder) {
  const defaultClass = ['fa', 'fa-sort-up', 'kbnDocTableHeader__sortChange'];

  if (!sortOrder || columnName !== sortOrder[0]) return defaultClass.join(' ');
  return ['fa', sortOrder[1] === 'asc' ? 'fa-sort-up' : 'fa-sort-down'].join(' ');
}
