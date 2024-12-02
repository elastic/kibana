/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { DOC_HIDE_TIME_COLUMN_SETTING, SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import { TableHeaderColumn } from './table_header_column';
import { getDisplayedColumns } from './helpers';
import { getDefaultSort } from '../../../../utils/sorting';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

interface Props {
  columns: string[];
  dataView: DataView;
  onChangeSortOrder?: (sortOrder: SortOrder[]) => void;
  onMoveColumn?: (name: string, index: number) => void;
  onRemoveColumn?: (name: string) => void;
  sortOrder: SortOrder[];
}

export function TableHeader({
  columns,
  dataView,
  onChangeSortOrder,
  onMoveColumn,
  onRemoveColumn,
  sortOrder,
}: Props) {
  const { uiSettings } = useDiscoverServices();
  const [defaultSortOrder, hideTimeColumn, isShortDots] = useMemo(
    () => [
      uiSettings.get(SORT_DEFAULT_ORDER_SETTING, 'desc'),
      uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false),
      uiSettings.get(FORMATS_UI_SETTINGS.SHORT_DOTS_ENABLE),
    ],
    [uiSettings]
  );
  const displayedColumns = getDisplayedColumns(columns, dataView, hideTimeColumn, isShortDots);

  return (
    <tr data-test-subj="docTableHeader" className="kbnDocTableHeader">
      <th css={{ width: '24px' }} />
      {displayedColumns.map((col, index) => {
        return (
          <TableHeaderColumn
            key={`${col.name}-${index}`}
            {...col}
            customLabel={dataView.getFieldByName(col.name)?.customLabel}
            isTimeColumn={dataView.timeFieldName === col.name}
            sortOrder={
              sortOrder.length
                ? sortOrder
                : getDefaultSort(dataView, defaultSortOrder, hideTimeColumn, false)
            }
            onMoveColumn={onMoveColumn}
            onRemoveColumn={onRemoveColumn}
            onChangeSortOrder={onChangeSortOrder}
          />
        );
      })}
    </tr>
  );
}
