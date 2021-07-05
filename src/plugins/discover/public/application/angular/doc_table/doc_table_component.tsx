/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { TableHeader } from './components/table_header/table_header';
import { DOC_HIDE_TIME_COLUMN_SETTING, SORT_DEFAULT_ORDER_SETTING } from '../../../../common';
import { getServices, IndexPattern } from '../../../kibana_services';
import { UI_SETTINGS } from '../../../../../data/public';
import { SortOrder } from './components/table_header/helpers';
import { DocTableRow, TableRow } from './components/table_row/table_row';
import { DocViewFilterFn } from '../../doc_views/doc_views_types';

interface DocTableProps {
  columns: string[];
  rows: DocTableRow[];
  minimumVisibleRows?: number;
  infiniteScroll: boolean;
  totalHitCount?: number;
  isLoading?: boolean;
  indexPattern: IndexPattern;
  onSort?: (sort: string[][]) => void;
  onAddColumn?: (column: string) => void;
  onMoveColumn?: (columns: string, newIdx: number) => void;
  onRemoveColumn?: (column: string) => void;
  sorting: string[][];
  filter: DocViewFilterFn;
  useNewFieldsApi?: boolean;
}

export const DocTable = ({
  columns,
  rows,
  minimumVisibleRows,
  infiniteScroll,
  totalHitCount,
  isLoading,
  indexPattern,
  onSort,
  onAddColumn,
  onMoveColumn,
  onRemoveColumn,
  sorting,
  filter,
  useNewFieldsApi,
}: DocTableProps) => {
  const { uiSettings } = getServices();

  const defaultSortOrder = uiSettings.get(SORT_DEFAULT_ORDER_SETTING, 'desc');
  const hideTimeColumn = uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false);
  const isShortDots = uiSettings.get(UI_SETTINGS.SHORT_DOTS_ENABLE);

  const tableRows = rows.map((current) => {
    return (
      <TableRow
        columns={columns}
        filter={filter}
        indexPattern={indexPattern}
        row={current}
        useNewFieldsApi={!!useNewFieldsApi}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
      />
    );
  });

  return (
    <div className="kbnDocTableWrapper">
      {rows.length &&
        (infiniteScroll ? (
          <table className="kbn-table table" data-test-subj="docTable">
            <thead>
              <TableHeader
                columns={columns}
                defaultSortOrder={defaultSortOrder}
                hideTimeColumn={hideTimeColumn}
                indexPattern={indexPattern}
                isShortDots={isShortDots}
                onChangeSortOrder={onSort}
                onMoveColumn={onMoveColumn}
                onRemoveColumn={onRemoveColumn}
                sortOrder={sorting as SortOrder[]}
              />
            </thead>
            <tbody>{tableRows}</tbody>
          </table>
        ) : (
          <div />
        ))}
      {rows && !rows.length && (
        <div className="kbnDocTable__error">
          <EuiText size="xs" color="subdued">
            <EuiIcon type="visualizeApp" size="m" color="subdued" />
            <EuiSpacer size="m" />
            <FormattedMessage
              id="discover.docTable.noResultsTitle"
              defaultMessage="No results found"
            />
          </EuiText>
        </div>
      )}
    </div>
  );
};
