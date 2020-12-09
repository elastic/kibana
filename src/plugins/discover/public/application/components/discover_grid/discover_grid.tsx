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
import {
  EuiDataGridSorting,
  EuiDataGridStyle,
  EuiDataGridProps,
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
import { getPopoverContents, getSchemaDetectors } from './discover_grid_schema';
import { DiscoverGridFlyout } from './discover_grid_flyout';
import { DiscoverGridContext } from './discover_grid_context';
import { getRenderCellValueFn } from './get_render_cell_value';
import { DiscoverGridSettings } from './types';
import { SortPairArr } from '../../angular/doc_table/lib/get_sort';
import {
  getEuiGridColumns,
  getLeadControlColumns,
  getVisibleColumns,
} from './discover_grid_columns';
import { defaultPageSize, gridStyle, pageSizeArr, toolbarVisibility } from './constants';
import { DiscoverServices } from '../../../build_services';

interface SortObj {
  id: string;
  direction: string;
}

export interface DiscoverGridProps {
  ariaLabelledBy: string;
  columns: string[];
  defaultColumns: boolean;
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
  services: DiscoverServices;
  showTimeCol: boolean;
  sort: SortPairArr[];
}

export const EuiDataGridMemoized = React.memo((props: EuiDataGridProps) => {
  return <EuiDataGrid {...props} />;
});

export const DiscoverGrid = ({
  ariaLabelledBy,
  columns,
  defaultColumns,
  indexPattern,
  onAddColumn,
  onFilter,
  onRemoveColumn,
  onResize,
  onSetColumns,
  onSort,
  rows,
  sampleSize,
  searchDescription,
  searchTitle,
  services,
  settings,
  showTimeCol,
  sort,
}: DiscoverGridProps) => {
  const [expanded, setExpanded] = useState<ElasticSearchHit | undefined>(undefined);

  /**
   * Pagination
   */
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: defaultPageSize });

  const rowsLength = rows ? rows.length : 0;
  const pageCount = Math.ceil(rowsLength / pagination.pageSize);
  const isOnLastPage = pagination.pageIndex === pageCount - 1;

  const paginationObj = useMemo(() => {
    const onChangeItemsPerPage = (pageSize: number) =>
      setPagination((paginationData) => ({ ...paginationData, pageSize }));

    const onChangePage = (pageIndex: number) =>
      setPagination((paginationData) => ({ ...paginationData, pageIndex }));

    return {
      onChangeItemsPerPage,
      onChangePage,
      pageIndex: pagination.pageIndex > pageCount - 1 ? 0 : pagination.pageIndex,
      pageSize: pagination.pageSize,
      pageSizeOptions: pageSizeArr,
    };
  }, [pagination, pageCount]);

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

  /**
   * Render variables
   */
  const showDisclaimer = rowsLength === sampleSize && isOnLastPage;
  const randomId = useMemo(() => htmlIdGenerator()(), []);

  const rowCount = useMemo(() => (rows ? rows.length : 0), [rows]);
  const euiGridColumns = useMemo(
    () => getEuiGridColumns(columns, settings, indexPattern, showTimeCol, defaultColumns),
    [columns, indexPattern, showTimeCol, settings, defaultColumns]
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
  const lead = useMemo(() => getLeadControlColumns(), []);

  if (!rowCount || !rows) {
    return (
      <div className="euiDataGrid__noResults">
        <EuiText size="xs" color="subdued">
          <EuiIcon type="discoverApp" size="m" color="subdued" />
          <EuiSpacer size="s" />
          <FormattedMessage id="discover.noResultsFound" defaultMessage="No results found" />
        </EuiText>
      </div>
    );
  }

  return (
    <DiscoverGridContext.Provider
      value={{
        expanded,
        setExpanded,
        rows,
        onFilter,
        indexPattern,
      }}
    >
      <>
        <EuiDataGridMemoized
          aria-describedby={randomId}
          aria-labelledby={ariaLabelledBy}
          columns={euiGridColumns}
          columnVisibility={columnsVisibility}
          data-test-subj="docTable"
          gridStyle={gridStyle as EuiDataGridStyle}
          leadingControlColumns={lead}
          onColumnResize={(col: { columnId: string; width: number }) => {
            if (onResize) {
              onResize(col);
            }
          }}
          pagination={paginationObj}
          popoverContents={popoverContents}
          renderCellValue={renderCellValue}
          rowCount={rowCount}
          schemaDetectors={schemaDetectors}
          sorting={sorting as EuiDataGridSorting}
          toolbarVisibility={
            defaultColumns
              ? {
                  ...toolbarVisibility,
                  showColumnSelector: false,
                }
              : toolbarVisibility
          }
        />

        {showDisclaimer && (
          <p className="dscDiscoverGrid__footer">
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
        {expanded && (
          <DiscoverGridFlyout
            indexPattern={indexPattern}
            hit={expanded}
            columns={columns}
            onFilter={onFilter}
            onRemoveColumn={onRemoveColumn}
            onAddColumn={onAddColumn}
            onClose={() => setExpanded(undefined)}
            services={services}
          />
        )}
      </>
    </DiscoverGridContext.Provider>
  );
};
