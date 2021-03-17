/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDataGridColumn, EuiScreenReaderOnly, EuiCheckbox } from '@elastic/eui';
import { ExpandButton } from './discover_grid_expand_button';
import { DiscoverGridSettings } from './types';
import { IndexPattern } from '../../../../../data/common/index_patterns/index_patterns';
import { buildCellActions } from './discover_grid_cell_actions';
import { getSchemaByKbnType } from './discover_grid_schema';
import { DiscoverGridContext } from './discover_grid_context';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';

export const getDocId = (doc: ElasticSearchHit & { _routing?: string }) => {
  const routing = doc._routing ? doc._routing : '';
  return [doc._index, doc._id, routing].join(' - ');
};

const SelectButton = ({ rowIndex }: { rowIndex: number }) => {
  const ctx = useContext(DiscoverGridContext);
  const doc = useMemo(() => ctx.rows[rowIndex], [ctx.rows, rowIndex]);
  const id = useMemo(() => getDocId(doc), [doc]);
  const checked = useMemo(() => ctx.selectedDocs.includes(id), [ctx.selectedDocs, id]);
  return (
    <EuiCheckbox
      id={id}
      label=""
      checked={checked}
      onChange={() => {
        if (checked) {
          const newSelection = ctx.selectedDocs.filter((docId) => docId !== id);
          ctx.setSelectedDocs(newSelection);
        } else {
          ctx.setSelectedDocs([...ctx.selectedDocs, id]);
        }
      }}
    />
  );
};

export function getLeadControlColumns() {
  return [
    {
      id: 'openDetails',
      width: 32,
      headerCellRender: () => (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('discover.controlColumnHeader', {
              defaultMessage: 'Control column',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      rowCellRender: ExpandButton,
    },
    {
      id: 'select',
      width: 32,
      rowCellRender: SelectButton,
      headerCellRender: () => (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('discover.selectColumnHeader', {
              defaultMessage: 'Select column',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
    },
  ];
}

export function buildEuiGridColumn(
  columnName: string,
  columnWidth: number | undefined = 0,
  indexPattern: IndexPattern,
  defaultColumns: boolean
) {
  const timeString = i18n.translate('discover.timeLabel', {
    defaultMessage: 'Time',
  });
  const indexPatternField = indexPattern.getFieldByName(columnName);
  const column: EuiDataGridColumn = {
    id: columnName,
    schema: getSchemaByKbnType(indexPatternField?.type),
    isSortable: indexPatternField?.sortable === true,
    display:
      columnName === '_source'
        ? i18n.translate('discover.grid.documentHeader', {
            defaultMessage: 'Document',
          })
        : indexPatternField?.displayName,
    actions: {
      showHide:
        defaultColumns || columnName === indexPattern.timeFieldName
          ? false
          : {
              label: i18n.translate('discover.removeColumnLabel', {
                defaultMessage: 'Remove column',
              }),
              iconType: 'cross',
            },
      showMoveLeft: !defaultColumns,
      showMoveRight: !defaultColumns,
    },
    cellActions: indexPatternField ? buildCellActions(indexPatternField) : [],
  };

  if (column.id === indexPattern.timeFieldName) {
    column.display = `${timeString} (${indexPattern.timeFieldName})`;
    column.initialWidth = 180;
  }
  if (columnWidth > 0) {
    column.initialWidth = Number(columnWidth);
  }
  return column;
}

export function getEuiGridColumns(
  columns: string[],
  settings: DiscoverGridSettings | undefined,
  indexPattern: IndexPattern,
  showTimeCol: boolean,
  defaultColumns: boolean
) {
  const timeFieldName = indexPattern.timeFieldName;
  const getColWidth = (column: string) => settings?.columns?.[column]?.width ?? 0;

  if (showTimeCol && indexPattern.timeFieldName && !columns.find((col) => col === timeFieldName)) {
    const usedColumns = [indexPattern.timeFieldName, ...columns];
    return usedColumns.map((column) =>
      buildEuiGridColumn(column, getColWidth(column), indexPattern, defaultColumns)
    );
  }

  return columns.map((column) =>
    buildEuiGridColumn(column, getColWidth(column), indexPattern, defaultColumns)
  );
}

export function getVisibleColumns(
  columns: string[],
  indexPattern: IndexPattern,
  showTimeCol: boolean
) {
  const timeFieldName = indexPattern.timeFieldName;

  if (showTimeCol && !columns.find((col) => col === timeFieldName)) {
    return [timeFieldName, ...columns];
  }

  return columns;
}
