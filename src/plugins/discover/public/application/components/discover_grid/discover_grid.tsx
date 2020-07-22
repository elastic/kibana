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
  EuiScreenReaderOnly,
  htmlIdGenerator,
} from '@elastic/eui';
import { IndexPattern } from '../../../kibana_services';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';
import { getDefaultSort } from '../../angular/doc_table/lib/get_default_sort';
import { DiscoverGridPopover } from './discover_grid_popover';
import {
  getEuiGridColumns,
  getPopoverContents,
  getSchemaDetectors,
  getVisibleColumns,
} from './discover_grid_helpers';
import { DiscoverGridFlyoutSelection } from './discover_grid_flyout_selection';
import { DiscoverGridFlyout } from './discover_grid_flyout';
import { DiscoverGridValueWithFilter } from './discover_value_with_filter';
import { DiscoverGridToolbarSelection } from './discover_grid_toolbar_selection';
import { DiscoverGridContext } from './discover_grid_context';
import { DiscoverGridSelectButton } from './discover_grid_select_button';
import { ViewButton } from './discover_grid_view_button';

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
  onSort: (props: any) => void;
  getContextAppHref: (id: string | number | Record<string, unknown>) => string;
  onRemoveColumn: (column: string) => void;
  onAddColumn: (column: string) => void;
  onSetColumns: (columns: string[]) => void;
}

const toolbarVisibility = {
  showColumnSelector: {
    allowHide: false,
    allowReorder: true,
  },
  showStyleSelector: false,
  additionalControls: <DiscoverGridToolbarSelection />,
};
const gridStyle = {
  border: 'horizontal',
  fontSize: 's',
  cellPadding: 's',
  rowHover: 'none',
};
const pageSizeArr = [25, 50, 100, 500];
const defaultPageSize = 50;

export const EuiDataGridMemoized = React.memo((props: any) => <EuiDataGrid {...props} />);

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
    const [showSelected, setShowSelected] = useState(false);
    const [selected, setSelected] = useState<number[]>([]);
    const [viewed, setViewed] = useState<number>(-1);
    const timeString = useMemo(
      () =>
        i18n.translate('discover.timeLabel', {
          defaultMessage: 'Time',
        }),
      []
    );

    /**
     * Pagination
     */
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: defaultPageSize });

    const paginationObj = useMemo(() => {
      const onChangeItemsPerPage = (pageSize: number) =>
        setPagination((paginationData) => ({ ...paginationData, pageSize }));

      const onChangePage = (pageIndex: number) =>
        setPagination((paginationData) => ({ ...paginationData, pageIndex }));

      return {
        ...pagination,
        onChangeItemsPerPage,
        onChangePage,
        pageSizeOptions: pageSizeArr,
      };
    }, [pagination]);

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
        const field = indexPattern.fields.getByName(columnId);
        const formatSource = () => {
          const formatted = indexPattern.formatHit(row);

          return (
            <dl className="dscFormatSource">
              {Object.keys(formatted).map((key) => (
                <span key={key}>
                  <dt className="dscFormatSource__title">{key}</dt>
                  <dd
                    className="dscFormatSource__description"
                    /* eslint-disable-next-line react/no-danger */
                    dangerouslySetInnerHTML={{ __html: formatted[key] }}
                  />
                </span>
              ))}
            </dl>
          );
        };
        // TODO Field formatters need to be fixed
        const value =
          field && field.type === '_source' ? (
            formatSource()
          ) : (
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
            <DiscoverGridPopover
              value={value}
              onPositiveFilterClick={() => createFilter(columnId, '+')}
              onNegativeFilterClick={() => createFilter(columnId, '-')}
            />
          );
        } else if (indexPattern.fields.getByName(columnId)?.filterable) {
          return (
            <DiscoverGridValueWithFilter
              value={value}
              columnId={columnId}
              indexPattern={indexPattern}
              row={row}
              onFilter={onFilter}
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
    const euiGridColumns = useMemo(
      () => getEuiGridColumns(columns, indexPattern, showTimeCol, timeString, onSetColumns, onSort),
      [columns, indexPattern, showTimeCol, timeString, onSetColumns, onSort]
    );
    const schemaDetectors = useMemo(() => getSchemaDetectors(), []);
    const popoverContents = useMemo(() => getPopoverContents(), []);
    const colummsVisibility = useMemo(
      () => ({
        visibleColumns: getVisibleColumns(columns, indexPattern, showTimeCol) as string[],
        setVisibleColumns: (newColumns: string[]) => {
          onSetColumns(newColumns);
        },
      }),
      [columns, indexPattern, showTimeCol, onSetColumns]
    );
    const sorting = useMemo(() => ({ columns: sortingColumns, onSort: onTableSort }), [
      sortingColumns,
      onTableSort,
    ]);
    const lead = useMemo(() => {
      return [
        {
          id: 'checkBox',
          width: 31,
          headerCellRender: () => (
            <EuiScreenReaderOnly>
              <span>
                {i18n.translate('discover.selectColumnHeader', {
                  defaultMessage: 'Select column',
                })}
              </span>
            </EuiScreenReaderOnly>
          ),
          rowCellRender: (col: number) => <DiscoverGridSelectButton col={col} rows={rows} />,
        },
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
          rowCellRender: ViewButton,
        },
      ];
    }, [rows]);

    if (!rowCount) {
      return null;
    }

    return (
      <DiscoverGridContext.Provider
        value={{ selected, setSelected, showSelected, setShowSelected, viewed, setViewed }}
      >
        <>
          <EuiDataGridMemoized
            aria-labelledby={ariaLabelledBy}
            aria-describedby={randomId}
            sorting={sorting}
            rowCount={rowCount}
            columns={euiGridColumns}
            renderCellValue={renderCellValue}
            leadingControlColumns={lead}
            columnVisibility={colummsVisibility}
            pagination={paginationObj}
            toolbarVisibility={toolbarVisibility}
            gridStyle={gridStyle}
            schemaDetectors={schemaDetectors}
            popoverContents={popoverContents}
          />

          {showDisclaimer && (
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
          {viewed > -1 && rows[viewed] && (
            <DiscoverGridFlyout
              indexPattern={indexPattern}
              getContextAppHref={getContextAppHref}
              hit={rows[viewed]}
              columns={columns}
              onFilter={onFilter}
              onRemoveColumn={onRemoveColumn}
              onAddColumn={onAddColumn}
              onClose={() => {
                setViewed(-1);
              }}
            />
          )}
          {showSelected && selected.length > 0 && (
            <DiscoverGridFlyoutSelection
              indexPattern={indexPattern}
              rows={rows}
              selected={selected}
              onClose={() => setShowSelected(false)}
            />
          )}
        </>
      </DiscoverGridContext.Provider>
    );
  }
);
