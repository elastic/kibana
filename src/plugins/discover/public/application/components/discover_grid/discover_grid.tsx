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
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import './discover_grid.scss';
import { i18n } from '@kbn/i18n';
import {
  EuiDataGrid,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';
import { IndexPattern } from '../../../kibana_services';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';
import { getDefaultSort } from '../../angular/doc_table/lib/get_default_sort';
import {
  getEuiGridColumns,
  getPopoverContents,
  getSchemaDetectors,
  getVisibleColumns,
} from './discover_grid_helpers';
import { DiscoverGridFlyout } from './discover_grid_flyout';
import { DiscoverGridContext } from './discover_grid_context';
import { getRenderCellValueFn } from './get_render_cell_value';
import { DiscoverGridSettings } from './types';
import { SortPairArr } from '../../angular/doc_table/lib/get_sort';
import { leadControlColumns } from './discover_grid_columns';

interface SortObj {
  id: string;
  direction: string;
}

interface Props {
  ariaLabelledBy: string;
  columns: string[];
  getContextAppHref: (id: string) => string;
  indexPattern: IndexPattern;
  onAddColumn: (column: string) => void;
  onFilter: DocViewFilterFn;
  onRemoveColumn: (column: string) => void;
  onResize?: (colSettings: { columnId: string; width: number }) => void;
  onSetColumns: (columns: string[]) => void;
  onSort: (props: any) => void;
  rows?: ElasticSearchHit[];
  sampleSize: number;
  settings?: DiscoverGridSettings;
  searchDescription?: string;
  searchTitle?: string;
  showTimeCol: boolean;
  sort: SortPairArr[];
}

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
    settings,
    indexPattern,
    ariaLabelledBy,
    searchTitle,
    searchDescription,
    onSort,
    onResize,
    sampleSize,
    onFilter,
    getContextAppHref,
    onRemoveColumn,
    onAddColumn,
    showTimeCol,
    onSetColumns,
  }: Props) => {
    const [showSelected, setShowSelected] = useState(false);
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
    const renderCellValue = useMemo(() => getRenderCellValueFn(indexPattern, rows), [
      rows,
      indexPattern,
    ]);

    const toolbarVisibility = {
      showColumnSelector: {
        allowHide: false,
        allowReorder: true,
      },
      showStyleSelector: false,
    };

    /**
     * Render variables
     */
    const rowsLength = rows ? rows.length : 0;
    const pageCount = Math.ceil(rowsLength / pagination.pageSize);
    const isOnLastPage = pagination.pageIndex === pageCount - 1;
    const showDisclaimer = rowsLength === sampleSize && isOnLastPage;
    const randomId = useMemo(() => String(htmlIdGenerator()), []);

    const rowCount = useMemo(() => (rows ? rows.length : 0), [rows]);
    const euiGridColumns = useMemo(
      () => getEuiGridColumns(columns, settings, indexPattern, showTimeCol, timeString),
      [columns, indexPattern, showTimeCol, timeString, settings]
    );
    const schemaDetectors = useMemo(() => getSchemaDetectors(), []);
    const popoverContents = useMemo(() => getPopoverContents(), []);
    const columnsVisibility = useMemo(
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
    const lead = useMemo(() => leadControlColumns(rows), [rows]);

    if (!rowCount || !rows) {
      return (
        <I18nProvider>
          <div className="euiDataGrid__noResults">
            <EuiText size="xs" color="subdued">
              <EuiIcon type="discoverApp" size="m" color="subdued" />
              <EuiSpacer size="s" />
              <FormattedMessage id="discover.noResultsFound" defaultMessage="No results found" />
            </EuiText>
          </div>
        </I18nProvider>
      );
    }

    return (
      <I18nProvider>
        <DiscoverGridContext.Provider
          value={{
            showSelected,
            setShowSelected,
            viewed,
            setViewed,
            rows,
            onFilter,
            indexPattern,
          }}
        >
          <>
            <EuiDataGridMemoized
              aria-labelledby={ariaLabelledBy}
              aria-describedby={randomId}
              data-test-subj="docTable"
              sorting={sorting}
              rowCount={rowCount}
              columns={euiGridColumns}
              renderCellValue={renderCellValue}
              leadingControlColumns={lead}
              columnVisibility={columnsVisibility}
              pagination={paginationObj}
              toolbarVisibility={toolbarVisibility}
              gridStyle={gridStyle}
              schemaDetectors={schemaDetectors}
              popoverContents={popoverContents}
              onColumnResize={(col: { columnId: string; width: number }) => {
                if (onResize) {
                  onResize(col);
                }
              }}
            />

            {showDisclaimer && (
              <p className="dscTable__footer">
                <FormattedMessage
                  id="discover.howToSeeOtherMatchingDocumentsDescriptionGrid"
                  defaultMessage="These are the first {sampleSize} documents matching your search, refine your search to see others."
                  values={{ sampleSize }}
                />
                <a href={`#${ariaLabelledBy}`}>
                  <FormattedMessage id="discover.backToTopLinkText" defaultMessage="Back to top." />
                </a>
              </p>
            )}
            {searchTitle && (
              <EuiScreenReaderOnly>
                <p id={String(randomId)}>
                  {searchDescription ? (
                    <FormattedMessage
                      id="discover.searchGenerationWithDescriptionGrid"
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
          </>
        </DiscoverGridContext.Provider>
      </I18nProvider>
    );
  }
);
