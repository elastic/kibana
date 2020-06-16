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

import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import './discover_grid.scss';
import { i18n } from '@kbn/i18n';
import {
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiIcon,
  EuiScreenReaderOnly,
  htmlIdGenerator,
} from '@elastic/eui';
import { IndexPattern } from '../../../kibana_services';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';
import { getDefaultSort } from '../../angular/doc_table/lib/get_default_sort';
import { CellPopover } from './discover_grid_popover';
import { DiscoverGridFlyout } from './discover_grid_flyout';
import {
  getSchemaDetectors,
  getEuiGridColumns,
  getPopoverContents,
  getVisibleColumns,
} from './discover_grid_helpers';

type Direction = 'asc' | 'desc';
type SortArr = [string, Direction];
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
  showTimeCol: boolean;
  onSort: Function;
  getContextAppHref: (id: string | number | Record<string, unknown>) => string;
  onRemoveColumn: (column: string) => void;
  onAddColumn: (column: string) => void;
  onSetColumns: (columns: string[]) => void;
}

const pageSizeArr = [25, 50, 100, 500];
const defaultPageSize = 50;

export const DiscoverGrid = React.memo(
  ({
    rows,
    columns,
    sort,
    indexPattern,
    ariaLabelledBy,
    searchTitle,
    searchDescription,
    onSort,
    sampleSize,
    onFilter,
    getContextAppHref,
    onRemoveColumn,
    onAddColumn,
    showTimeCol,
    onSetColumns,
  }: Props) => {
    const timeString = useMemo(
      () =>
        i18n.translate('discover.timeLabel', {
          defaultMessage: 'Time',
        }),
      []
    );
    const [flyoutRow, setFlyoutRow] = useState<number | undefined>(undefined);

    /**
     * Pagination
     */
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: defaultPageSize });
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
              onClick={() =>
                flyoutRow === rowIndex ? setFlyoutRow(undefined) : setFlyoutRow(rowIndex)
              }
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
          columns={getEuiGridColumns(columns, indexPattern, showTimeCol, timeString)}
          renderCellValue={renderCellValue}
          leadingControlColumns={leadingControlControls}
          columnVisibility={{
            visibleColumns: getVisibleColumns(columns, indexPattern, showTimeCol) as string[],
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
          schemaDetectors={getSchemaDetectors()}
          popoverContents={getPopoverContents()}
        />
        {showDisclaimer && (
          <>
            <p className="dscTable__footer">
              <FormattedMessage
                id="discover.howToSeeOtherMatchingDocumentsDescription"
                defaultMessage="These are the first {sampleSize} documents matching your search, refine your search to see others."
                values={{ sampleSize }}
              />
              <a href={`#${ariaLabelledBy}`}>
                <FormattedMessage id="discover.backToTopLinkText" defaultMessage="Back to top" />
              </a>
            </p>
          </>
        )}
        {searchTitle && (
          <EuiScreenReaderOnly>
            <p id={String(randomId)}>
              {searchDescription ? (
                <FormattedMessage
                  id="discover.searchGenerationWithDescription"
                  defaultMessage="Table generated by search {searchTitle} ({searchDescription})"
                  values={{ searchTitle, searchDescription }}
                />
              ) : (
                <FormattedMessage
                  id="discover.searchGenerationWithDescription"
                  defaultMessage="Table generated by search {searchTitle}"
                  values={{ searchTitle }}
                />
              )}
            </p>
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
