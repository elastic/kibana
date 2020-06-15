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

import React, { ReactNode, useCallback, useMemo, useState } from 'react';
import './discover_grid.scss';
import { i18n } from '@kbn/i18n';
import {
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiIcon,
  EuiScreenReaderOnly,
  htmlIdGenerator,
} from '@elastic/eui';
import { IndexPattern } from '../../../kibana_services';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';
import { shortenDottedString } from '../../helpers';
import { getDefaultSort } from '../../angular/doc_table/lib/get_default_sort';
import { CellPopover } from './discover_grid_popover';
import { DiscoverGridFlyout } from './discover_grid_flyout';

type Direction = 'asc' | 'desc';
type SortArr = [string, Direction];
const kibanaJSON = 'kibana-json';
const geoPoint = 'geo-point';
interface SortObj {
  id: string;
  direction: Direction;
}

interface Props {
  rows: ElasticSearchHit[];
  columns: string[];
  sort: SortArr[];
  ariaLabelledBy: string;
  indexPattern: IndexPattern;
  searchTitle?: string;
  searchDescription?: string;
  sampleSize: number;
  onFilter: DocViewFilterFn;
  useShortDots: boolean;
  showTimeCol: boolean;
  onSort: Function;
  getContextAppHref: (id: string | number | Record<string, unknown>) => string;
  onRemoveColumn: (column: string) => void;
  onAddColumn: (column: string) => void;
  onSetColumns: (columns: string[]) => void;
}

const pageSizeArr = [25, 50, 100];

export const DiscoverGrid = React.memo(
  ({
    rows,
    columns,
    sort,
    indexPattern,
    ariaLabelledBy,
    searchTitle,
    searchDescription,
    useShortDots,
    onSort,
    sampleSize,
    onFilter,
    getContextAppHref,
    onRemoveColumn,
    onAddColumn,
    showTimeCol,
    onSetColumns,
  }: Props) => {
    const timeString = i18n.translate('discover.timeLabel', {
      defaultMessage: 'Time',
    });
    const [flyoutRow, setFlyoutRow] = useState<number | undefined>(undefined);
    const buildColumns = useCallback(
      (cols: any) => {
        return cols.map(
          (columnName: string): EuiDataGridColumn => {
            const column: EuiDataGridColumn = {
              id: columnName,
              schema: indexPattern.getFieldByName(columnName)?.type,
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
              case 'object':
                column.schema = kibanaJSON;
                break;
              case 'geo_point':
                column.schema = geoPoint;
                break;
              default:
                column.schema = undefined;
                break;
            }

            if (useShortDots) {
              column.display = <>{shortenDottedString(columnName)}</>;
            }
            if (column.id === indexPattern.timeFieldName) {
              column.display = `${timeString} (${indexPattern.timeFieldName})`;
            }

            return column;
          }
        );
      },
      [indexPattern, useShortDots, timeString]
    );

    const getColumns = useCallback(() => {
      const timeFieldName = indexPattern.timeFieldName;

      if (showTimeCol && !columns.find((col) => col === timeFieldName)) {
        return [
          {
            id: indexPattern.timeFieldName,
            display: `${timeString} (${indexPattern.timeFieldName})`,
            schema: 'datetime',
            initialWidth: 200,
          } as EuiDataGridColumn,
          ...buildColumns(columns),
        ];
      }

      return buildColumns(columns);
    }, [columns, showTimeCol, timeString, indexPattern.timeFieldName, buildColumns]);

    const getVisibleColumns = useCallback(() => {
      const timeFieldName = indexPattern.timeFieldName;

      if (showTimeCol && !columns.find((col) => col === timeFieldName)) {
        return [timeFieldName, ...columns];
      }

      return columns;
    }, [showTimeCol, columns, indexPattern.timeFieldName]);

    /**
     * Pagination
     */
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: pageSizeArr[0] });
    const onChangeItemsPerPage = useCallback(
      (pageSize) => setPagination((paginationData) => ({ ...paginationData, pageSize })),
      [setPagination]
    );
    const onChangePage = useCallback(
      (pageIndex) => setPagination((paginationData) => ({ ...paginationData, pageIndex })),
      [setPagination]
    );

    /**
     * Sorting
     */
    const sortingColumns = useMemo(() => {
      return sort.length === 0
        ? getDefaultSort(indexPattern).map(
            ([id, direction]) => ({ id, direction } as { id: string; direction: 'asc' | 'desc' })
          )
        : sort.map(([id, direction]) => ({ id, direction }));
    }, [sort, indexPattern]);
    const onTableSort = useCallback(
      (sortingColumnsData) => {
        onSort(sortingColumnsData.map(({ id, direction }: SortObj) => [id, direction]));
      },
      [onSort]
    );

    /**
     * Cell rendering
     */
    const renderCellValue = useCallback(
      ({ rowIndex, columnId, isDetails }: EuiDataGridCellValueElementProps) => {
        const row = rows[rowIndex];

        if (typeof row === 'undefined') {
          return '-';
        }

        const value = (
          // TODO Field formatters need to be fixed
          // eslint-disable-next-line react/no-danger
          <span dangerouslySetInnerHTML={{ __html: indexPattern.formatField(row, columnId) }} />
        );

        if (isDetails && indexPattern.fields.getByName(columnId)?.filterable) {
          const createFilter = (fieldName: string, type: '-' | '+') => {
            return onFilter(
              indexPattern.fields.getByName(fieldName),
              indexPattern.flattenHit(row)[fieldName],
              type
            );
          };
          return (
            <CellPopover
              value={value}
              onPositiveFilterClick={() => createFilter(columnId, '+')}
              onNegativeFilterClick={() => createFilter(columnId, '-')}
            />
          );
        }
        return value;
      },
      [rows, indexPattern, onFilter]
    );

    /**
     * Render variables
     */
    const pageCount = Math.ceil(rows.length / pagination.pageSize);
    const isOnLastPage = pagination.pageIndex === pageCount - 1;
    const showDisclaimer = rows.length === sampleSize && isOnLastPage;
    const randomId = useMemo(() => String(htmlIdGenerator()), []);
    let searchString: ReactNode = <></>;
    if (searchTitle) {
      if (searchDescription) {
        searchString = i18n.translate('discover.searchGenerationWithDescription', {
          defaultMessage: 'Table generated by search {searchTitle} ({searchDescription})',
          values: { searchTitle, searchDescription },
        });
      } else {
        searchString = i18n.translate('discover.searchGeneration', {
          defaultMessage: 'Table generated by search {searchTitle}',
          values: { searchTitle },
        });
      }
    }

    const rowCount = useMemo(() => (rows ? rows.length : 0), [rows]);
    const leadingControlControls = useMemo(
      () => [
        {
          id: 'openDetails',
          width: 31,
          headerCellRender: () => (
            <EuiScreenReaderOnly>
              <span>
                {i18n.translate('discover.controlColumnHeader', {
                  defaultMessage: 'Control column',
                })}
              </span>
            </EuiScreenReaderOnly>
          ),
          rowCellRender: ({ rowIndex }: { rowIndex: number }) => (
            <button
              aria-label={i18n.translate('discover.grid.viewDoc', {
                defaultMessage: 'Toggle dialog with details',
              })}
              onClick={() => setFlyoutRow(rowIndex)}
              className="dscTable__buttonToggle"
            >
              <EuiIcon size="s" type={flyoutRow === rowIndex ? 'eyeClosed' : 'eye'} />
            </button>
          ),
        },
      ],
      [flyoutRow]
    );

    if (!rowCount) {
      return null;
    }

    return (
      <>
        <EuiDataGrid
          aria-labelledby={ariaLabelledBy}
          aria-describedby={randomId}
          sorting={{ columns: sortingColumns, onSort: onTableSort }}
          rowCount={rowCount}
          columns={getColumns()}
          renderCellValue={renderCellValue}
          leadingControlColumns={leadingControlControls}
          columnVisibility={{
            visibleColumns: getVisibleColumns() as string[],
            setVisibleColumns: (newColumns) => {
              onSetColumns(newColumns);
            },
          }}
          pagination={{
            ...pagination,
            onChangeItemsPerPage,
            onChangePage,
            pageSizeOptions: pageSizeArr,
          }}
          toolbarVisibility={{
            showColumnSelector: {
              allowHide: false,
              allowReorder: true,
            },
            showStyleSelector: false,
          }}
          gridStyle={{
            border: 'horizontal',
            fontSize: 's',
            cellPadding: 's',
          }}
          schemaDetectors={[
            {
              type: kibanaJSON,
              detector() {
                return 0; // this schema is always explicitly defined
              },
              comparator() {
                // Eventually this column will be non-sortable: https://github.com/elastic/eui/issues/2623
                return 1;
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
              comparator() {
                // TODO @myasonik this column is not sortable
                return 1;
              },
              sortTextAsc: '',
              sortTextDesc: '',
              icon: 'tokenGeo',
            },
          ]}
          // TODO @dsnide can make edits here per type
          // Types [geoPoint], [kibanaJSON], numeric, datetime
          popoverContents={{
            [geoPoint]: ({ children }) => {
              return <span className="geo-point">{children}</span>;
            },
          }}
        />
        {showDisclaimer && (
          <>
            <p className="dscTable__footer">
              {i18n.translate('discover.howToSeeOtherMatchingDocumentsDescription', {
                defaultMessage:
                  'These are the first {sampleSize} documents matching your search, refine your search to see others. ',
                values: { sampleSize },
              })}
              <a href={`#${ariaLabelledBy}`}>
                {i18n.translate('discover.backToTopLinkText', {
                  defaultMessage: 'Back to top.',
                })}
              </a>
            </p>
          </>
        )}
        {searchString && (
          <EuiScreenReaderOnly>
            <p id={String(randomId)}>{searchString}</p>
          </EuiScreenReaderOnly>
        )}
        {typeof flyoutRow !== 'undefined' && (
          <DiscoverGridFlyout
            indexPattern={indexPattern}
            getContextAppHref={getContextAppHref}
            hit={rows[flyoutRow]}
            columns={columns}
            onFilter={onFilter}
            onClose={() => setFlyoutRow(undefined)}
            onRemoveColumn={onRemoveColumn}
            onAddColumn={onAddColumn}
          />
        )}
      </>
    );
  }
);
