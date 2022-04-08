/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import type { DataView } from 'src/plugins/data_views/public';
import { TableHeaderColumn } from './table_header_column';
import { SortOrder, getDisplayedColumns } from './helpers';
import { getDefaultSort } from '../../lib/get_default_sort';
import { useDiscoverServices } from '../../../../utils/use_discover_services';
import { DOC_HIDE_TIME_COLUMN_SETTING, SORT_DEFAULT_ORDER_SETTING } from '../../../../../common';
import { FORMATS_UI_SETTINGS } from '../../../../../../field_formats/common';

interface Props {
  columns: string[];
  indexPattern: DataView;
  onChangeSortOrder?: (sortOrder: SortOrder[]) => void;
  onMoveColumn?: (name: string, index: number) => void;
  onRemoveColumn?: (name: string) => void;
  sortOrder: SortOrder[];
}

export function TableHeader({
  columns,
  indexPattern,
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
  const displayedColumns = getDisplayedColumns(columns, indexPattern, hideTimeColumn, isShortDots);

  return (
    <tr data-test-subj="docTableHeader" className="kbnDocTableHeader">
      <th style={{ width: '24px' }} />
      {displayedColumns.map((col) => {
        return (
          <TableHeaderColumn
            key={col.name}
            {...col}
            customLabel={indexPattern.getFieldByName(col.name)?.customLabel}
            isTimeColumn={indexPattern.timeFieldName === col.name}
            sortOrder={
              sortOrder.length
                ? sortOrder
                : getDefaultSort(indexPattern, defaultSortOrder, hideTimeColumn)
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
