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

import React, { useCallback, useMemo, useState, useContext, ReactNode } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import './discover_grid.scss';
import { i18n } from '@kbn/i18n';
import {
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiCheckbox,
  htmlIdGenerator,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
} from '@elastic/eui';
import { IndexPattern } from '../../../kibana_services';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';
import { getDefaultSort } from '../../angular/doc_table/lib/get_default_sort';
import { CellPopover } from './discover_grid_popover';
import {
  getSchemaDetectors,
  getEuiGridColumns,
  getPopoverContents,
  getVisibleColumns,
} from './discover_grid_helpers';
import { DiscoverGridFlyoutAdvancedGrid } from './discover_grid_flyout_advanced_grid';
import { DiscoverGridFlyout } from './discover_grid_flyout';

type Direction = 'asc' | 'desc';
type SortArr = [string, Direction];
interface SortObj {
  id: string;
  direction: Direction;
}
interface GridContext {
  viewed: number;
  setViewed: (id: number) => void;
  selected: number[];
  setSelected: (ids: number[]) => void;
  showSelected: boolean;
  setShowSelected: (value: boolean) => void;
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

const Selection = () => {
  const { selected, showSelected, setShowSelected } = useContext<GridContext>(DiscoverGridContext);
  return (
    <EuiButtonEmpty
      size="xs"
      iconType="arrowDown"
      color="primary"
      className="euiDataGrid__controlBtn"
      onClick={() => setShowSelected(!showSelected)}
    >
      {selected.length} {selected.length === 1 ? 'hit' : 'hits'} selected
    </EuiButtonEmpty>
  );
};
const toolbarVisibility = {
  showColumnSelector: {
    allowHide: false,
    allowReorder: true,
  },
  showStyleSelector: false,
  additionalControls: <Selection />,
};
const gridStyle = {
  border: 'horizontal',
  fontSize: 's',
  cellPadding: 's',
};
const pageSizeArr = [25, 50, 100, 500];
const defaultPageSize = 50;

const DiscoverGridContext = React.createContext<GridContext>({
  viewed: -1,
  setViewed: () => void 0,
  selected: [],
  setSelected: () => void 0,
  showSelected: false,
  setShowSelected: () => void 0,
});

export const ViewButton = ({ rowIndex }: { rowIndex: number }) => {
  const { viewed, setViewed } = useContext<GridContext>(DiscoverGridContext);

  return (
    <button
      aria-label={i18n.translate('discover.grid.viewDoc', {
        defaultMessage: 'Toggle dialog with details',
      })}
      onClick={() => setViewed(rowIndex)}
      className="dscTable__buttonToggle"
    >
      <EuiIcon size="s" type={viewed === rowIndex ? 'eyeClosed' : 'eye'} />
    </button>
  );
};

export const SelectButton = ({ col, rows }: { col: any; rows: ElasticSearchHit[] }) => {
  const { selected, setSelected } = useContext<GridContext>(DiscoverGridContext);
  const rowIndex = col.rowIndex;
  const isChecked = selected.includes(rowIndex);

  return (
    <EuiCheckbox
      id={`${rowIndex}`}
      aria-label={`Select row ${rowIndex}, ${rows[rowIndex]._id}`}
      checked={isChecked}
      onChange={(e) => {
        if (e.target.checked) {
          setSelected([...selected, rowIndex]);
        } else {
          setSelected(selected.filter((idx: number) => idx !== rowIndex));
        }
      }}
    />
  );
};

const ValueWithFilter = ({
  value,
  columnId,
  row,
  indexPattern,
  onFilter,
}: {
  value: ReactNode;
  columnId: string;
  row: ElasticSearchHit;
  indexPattern: IndexPattern;
  onFilter: DocViewFilterFn;
}) => {
  const [hover, setHover] = useState(false);
  const createFilter = (type: '-' | '+') => {
    return onFilter(
      indexPattern.fields.getByName(columnId),
      indexPattern.flattenHit(row)[columnId],
      type
    );
  };
  if (hover) {
    return (
      <EuiFlexGroup
        direction={'row'}
        onMouseLeave={() => setHover(false)}
        onBlur={() => setHover(false)}
        gutterSize="none"
        alignItems="center"
        responsive={false}
        className="eui-textTruncate"
      >
        <EuiFlexItem className="eui-textTruncate">{value}</EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: '40px' }}>
          <div>
            <EuiButtonIcon
              iconSize="s"
              iconType="magnifyWithPlus"
              aria-label={i18n.translate('discover.grid.ariaFilterOn', {
                defaultMessage: 'Filter on {value}',
                values: { value: '' },
              })}
              onClick={() => createFilter('+')}
              style={{
                padding: 0,
                minHeight: 'auto',
                minWidth: 'auto',
                paddingRight: 2,
                paddingLeft: 2,
                paddingTop: 0,
                paddingBottom: 0,
              }}
            />
            <EuiButtonIcon
              iconSize="s"
              iconType="magnifyWithMinus"
              aria-label={i18n.translate('discover.grid.ariaFilterOn', {
                defaultMessage: 'Filter out {value}',
                values: { value: '' },
              })}
              onClick={() => createFilter('-')}
              style={{
                padding: 0,
                minHeight: 'auto',
                minWidth: 'auto',
                paddingRight: 2,
                paddingLeft: 2,
                paddingTop: 0,
                paddingBottom: 0,
              }}
            />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else {
    return (
      <div
        className="eui-textTruncate"
        onMouseOver={() => setHover(true)}
        onFocus={() => setHover(true)}
      >
        {value}
      </div>
    );
  }
};

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
        // TODO Field formatters need to be fixed
        const value = (
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
        } else if (indexPattern.fields.getByName(columnId)?.filterable) {
          return (
            <ValueWithFilter
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
      () => getEuiGridColumns(columns, indexPattern, showTimeCol, timeString),
      [columns, indexPattern, showTimeCol, timeString]
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
          rowCellRender: (col: number) => <SelectButton col={col} rows={rows} />,
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
              rows={rows}
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
            <DiscoverGridFlyoutAdvancedGrid
              indexPattern={indexPattern}
              rows={rows}
              selected={selected}
              columns={columns}
              onFilter={onFilter}
              onRemoveColumn={onRemoveColumn}
              onAddColumn={onAddColumn}
              onClose={() => setShowSelected(false)}
            />
          )}
        </>
      </DiscoverGridContext.Provider>
    );
  }
);
