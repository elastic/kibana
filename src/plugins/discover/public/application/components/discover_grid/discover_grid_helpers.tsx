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
import React, { ReactNode, useContext } from 'react';
import { EuiCodeBlock, EuiDataGridColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IndexPattern, IndexPatternField } from '../../../../../data/common';
import { DiscoverGridSettings } from './types';
import { DiscoverGridContext } from './discover_grid_context';

const kibanaJSON = 'kibana-json';
const geoPoint = 'geo-point';

export function getEuiGridColumns(
  columns: string[],
  settings: DiscoverGridSettings | undefined,
  indexPattern: IndexPattern,
  showTimeCol: boolean,
  timeString: string
) {
  const timeFieldName = indexPattern.timeFieldName;
  const getColWidth = (column: string) => {
    if (settings?.columns && settings.columns[column]) {
      return settings.columns[column].width || 0;
    }
    return 0;
  };

  if (showTimeCol && indexPattern.timeFieldName && !columns.find((col) => col === timeFieldName)) {
    const usedColumns = [indexPattern.timeFieldName, ...columns];
    return usedColumns.map((column) =>
      buildEuiGridColumn(column, getColWidth(column), indexPattern, timeString)
    );
  }

  return columns.map((column) =>
    buildEuiGridColumn(column, getColWidth(column), indexPattern, timeString)
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

const FilterInBtn = ({ Component, rowIndex, columnId }: any) => {
  const context = useContext(DiscoverGridContext);
  return (
    <Component
      onClick={() => {
        const row = context.rows[rowIndex];
        const flattened = context.indexPattern.flattenHit(row);

        if (flattened) {
          context.onFilter(columnId, flattened[columnId], '+');
        }
      }}
      iconType="plusInCircle"
      aria-label={i18n.translate('discover.grid.filterForAria', {
        defaultMessage: 'Filter for {value}',
        values: { value: columnId },
      })}
    >
      {i18n.translate('discover.grid.filterFor', {
        defaultMessage: 'Filter for',
      })}
    </Component>
  );
};

const FilterOutBtn = ({ Component, rowIndex, columnId }: any) => {
  const context = useContext(DiscoverGridContext);
  return (
    <Component
      onClick={() => {
        const row = context.rows[rowIndex];
        const flattened = context.indexPattern.flattenHit(row);

        if (flattened) {
          context.onFilter(columnId, flattened[columnId], '-');
        }
      }}
      iconType="minusInCircle"
      aria-label={i18n.translate('discover.grid.filterOutAria', {
        defaultMessage: 'Filter out {value}',
        values: { value: columnId },
      })}
    >
      {i18n.translate('discover.grid.filterOut', {
        defaultMessage: 'Filter out',
      })}
    </Component>
  );
};

export function buildCellActions(field: IndexPatternField) {
  if (!field.aggregatable) {
    return undefined;
  }

  return [FilterInBtn, FilterOutBtn];
}

export function buildEuiGridColumn(
  columnName: string,
  columnWidth: number | undefined = 0,
  indexPattern: IndexPattern,
  timeString: string
) {
  const indexPatternField = indexPattern.getFieldByName(columnName);
  const column: EuiDataGridColumn = {
    id: columnName,
    schema: indexPatternField?.type,
    isSortable: indexPatternField?.sortable,
    display: indexPatternField?.displayName,
    actions: {
      showHide: { label: 'Remove column' },
      showSortAsc: { label: 'Sort ASC' },
      showSortDesc: { label: 'Sort DESC' },
    },
    cellActions: indexPatternField ? buildCellActions(indexPatternField) : [],
  };

  // Default DataGrid schemas: boolean, numeric, datetime, json, currency
  // Default indexPattern types: KBN_FIELD_TYPES in src/plugins/data/common/kbn_field_types/types.ts
  switch (column.schema) {
    case 'date':
      column.schema = 'datetime';
      break;
    case 'number':
      column.schema = 'numeric';
      break;
    case '_source':
      column.schema = kibanaJSON;
      break;
    case 'object':
      column.schema = 'json';
      break;
    case 'geo_point':
      column.schema = geoPoint;
      break;
    default:
      column.schema = 'json';
      break;
  }

  if (column.id === indexPattern.timeFieldName) {
    column.display = `${timeString} (${indexPattern.timeFieldName})`;
    column.initialWidth = 180;
  }
  if (columnWidth > 0) {
    column.initialWidth = Number(columnWidth);
  }
  return column;
}

// Types [geoPoint], [kibanaJSON], numeric, datetime
export function getSchemaDetectors() {
  return [
    {
      type: kibanaJSON,
      detector() {
        return 0; // this schema is always explicitly defined
      },
      sortTextAsc: '', // Eventually this column will be non-sortable: https://github.com/elastic/eui/issues/2623
      sortTextDesc: '', // Eventually this column will be non-sortable: https://github.com/elastic/eui/issues/2623
      icon: '', // Eventually this column will be non-sortable: https://github.com/elastic/eui/issues/2623
      color: '', // Eventually this column will be non-sortable: https://github.com/elastic/eui/issues/2623
    },
    {
      type: geoPoint,
      detector() {
        return 0; // this schema is always explicitly defined
      },
      sortTextAsc: '',
      sortTextDesc: '',
      icon: 'tokenGeo',
    },
  ];
}

export function getPopoverContents() {
  return {
    [geoPoint]: ({ children }: { children: ReactNode }) => {
      return <span className="geo-point">{children}</span>;
    },
    [kibanaJSON]: ({ children }: { children: ReactNode }) => {
      return (
        <EuiCodeBlock language="json" paddingSize="none" transparentBackground={true}>
          {children}
        </EuiCodeBlock>
      );
    },
  };
}
