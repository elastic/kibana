/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import './discover_grid.scss';
import {
  EuiDataGridSorting,
  EuiDataGridProps,
  EuiDataGrid,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
  EuiLoadingSpinner,
  EuiIcon,
} from '@elastic/eui';
import type { DataView } from '../../../../data_views/public';
import { flattenHit } from '../../../../data/public';
import { DocViewFilterFn } from '../../services/doc_views/doc_views_types';
import { getSchemaDetectors } from './discover_grid_schema';
import { DiscoverGridFlyout } from './discover_grid_flyout';
import { DiscoverGridContext } from './discover_grid_context';
import { getRenderCellValueFn } from './get_render_cell_value';
import { DiscoverGridSettings } from './types';
import {
  getEuiGridColumns,
  getLeadControlColumns,
  getVisibleColumns,
} from './discover_grid_columns';
import {
  defaultPageSize,
  GRID_STYLE,
  pageSizeArr,
  toolbarVisibility as toolbarVisibilityDefaults,
} from './constants';
import { getDisplayedColumns } from '../../utils/columns';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  MAX_DOC_FIELDS_DISPLAYED,
  SHOW_MULTIFIELDS,
} from '../../../common';
import { DiscoverGridDocumentToolbarBtn, getDocId } from './discover_grid_document_selection';
import { SortPairArr } from '../doc_table/lib/get_sort';
import { getFieldsToShow } from '../../utils/get_fields_to_show';
import { ElasticSearchHit } from '../../types';
import { useRowHeightsOptions } from '../../utils/use_row_heights_options';
import { useDiscoverServices } from '../../utils/use_discover_services';

interface SortObj {
  id: string;
  direction: string;
}

export interface DiscoverGridProps {
  /**
   * Determines which element labels the grid for ARIA
   */
  ariaLabelledBy: string;
  /**
   * Optional class name to apply
   */
  className?: string;
  /**
   * Determines which columns are displayed
   */
  columns: string[];
  /**
   * If set, the given document is displayed in a flyout
   */
  expandedDoc?: ElasticSearchHit;
  /**
   * The used index pattern
   */
  indexPattern: DataView;
  /**
   * Determines if data is currently loaded
   */
  isLoading: boolean;
  /**
   * Function used to add a column in the document flyout
   */
  onAddColumn: (column: string) => void;
  /**
   * Function to add a filter in the grid cell or document flyout
   */
  onFilter: DocViewFilterFn;
  /**
   * Function used in the grid header and flyout to remove a column
   * @param column
   */
  onRemoveColumn: (column: string) => void;
  /**
   * Function triggered when a column is resized by the user
   */
  onResize?: (colSettings: { columnId: string; width: number }) => void;
  /**
   * Function to set all columns
   */
  onSetColumns: (columns: string[], hideTimeColumn: boolean) => void;
  /**
   * function to change sorting of the documents, skipped when isSortEnabled is set to false
   */
  onSort?: (sort: string[][]) => void;
  /**
   * Array of documents provided by Elasticsearch
   */
  rows?: ElasticSearchHit[];
  /**
   * The max size of the documents returned by Elasticsearch
   */
  sampleSize: number;
  /**
   * Function to set the expanded document, which is displayed in a flyout
   */
  setExpandedDoc: (doc?: ElasticSearchHit) => void;
  /**
   * Grid display settings persisted in Elasticsearch (e.g. column width)
   */
  settings?: DiscoverGridSettings;
  /**
   * Saved search description
   */
  searchDescription?: string;
  /**
   * Saved search title
   */
  searchTitle?: string;
  /**
   * Determines whether the time columns should be displayed (legacy settings)
   */
  showTimeCol: boolean;
  /**
   * Manage user sorting control
   */
  isSortEnabled?: boolean;
  /**
   * Current sort setting
   */
  sort: SortPairArr[];
  /**
   * How the data is fetched
   */
  useNewFieldsApi: boolean;
  /**
   * Manage pagination control
   */
  isPaginationEnabled?: boolean;
  /**
   * List of used control columns (available: 'openDetails', 'select')
   */
  controlColumnIds?: string[];
  /**
   * Row height from state
   */
  rowHeightState?: number;
  /**
   * Update row height state
   */
  onUpdateRowHeight?: (rowHeight: number) => void;
}

export const EuiDataGridMemoized = React.memo((props: EuiDataGridProps) => {
  return <EuiDataGrid {...props} />;
});

const CONTROL_COLUMN_IDS_DEFAULT = ['openDetails', 'select'];

export const DiscoverGrid = ({
  ariaLabelledBy,
  columns,
  indexPattern,
  isLoading,
  expandedDoc,
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
  setExpandedDoc,
  settings,
  showTimeCol,
  sort,
  useNewFieldsApi,
  isSortEnabled = true,
  isPaginationEnabled = true,
  controlColumnIds = CONTROL_COLUMN_IDS_DEFAULT,
  className,
  rowHeightState,
  onUpdateRowHeight,
}: DiscoverGridProps) => {
  const services = useDiscoverServices();
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [isFilterActive, setIsFilterActive] = useState(false);
  const displayedColumns = getDisplayedColumns(columns, indexPattern);
  const defaultColumns = displayedColumns.includes('_source');
  const usedSelectedDocs = useMemo(() => {
    if (!selectedDocs.length || !rows?.length) {
      return [];
    }
    const idMap = rows.reduce((map, row) => map.set(getDocId(row), true), new Map());
    // filter out selected docs that are no longer part of the current data
    const result = selectedDocs.filter((docId) => idMap.get(docId));
    if (result.length === 0 && isFilterActive) {
      setIsFilterActive(false);
    }
    return result;
  }, [selectedDocs, rows, isFilterActive]);

  const displayedRows = useMemo(() => {
    if (!rows) {
      return [];
    }
    if (!isFilterActive || usedSelectedDocs.length === 0) {
      return rows;
    }
    const rowsFiltered = rows.filter((row) => usedSelectedDocs.includes(getDocId(row)));
    if (!rowsFiltered.length) {
      // in case the selected docs are no longer part of the sample of 500, show all docs
      return rows;
    }
    return rowsFiltered;
  }, [rows, usedSelectedDocs, isFilterActive]);

  /**
   * Pagination
   */
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: defaultPageSize });
  const rowCount = useMemo(() => (displayedRows ? displayedRows.length : 0), [displayedRows]);
  const pageCount = useMemo(
    () => Math.ceil(rowCount / pagination.pageSize),
    [rowCount, pagination]
  );
  const isOnLastPage = pagination.pageIndex === pageCount - 1;

  const paginationObj = useMemo(() => {
    const onChangeItemsPerPage = (pageSize: number) =>
      setPagination((paginationData) => ({ ...paginationData, pageSize }));

    const onChangePage = (pageIndex: number) =>
      setPagination((paginationData) => ({ ...paginationData, pageIndex }));

    return isPaginationEnabled
      ? {
          onChangeItemsPerPage,
          onChangePage,
          pageIndex: pagination.pageIndex > pageCount - 1 ? 0 : pagination.pageIndex,
          pageSize: pagination.pageSize,
          pageSizeOptions: pageSizeArr,
        }
      : undefined;
  }, [pagination, pageCount, isPaginationEnabled]);

  /**
   * Sorting
   */
  const sortingColumns = useMemo(() => sort.map(([id, direction]) => ({ id, direction })), [sort]);

  const onTableSort = useCallback(
    (sortingColumnsData) => {
      if (isSortEnabled && onSort) {
        onSort(sortingColumnsData.map(({ id, direction }: SortObj) => [id, direction]));
      }
    },
    [onSort, isSortEnabled]
  );

  const showMultiFields = services.uiSettings.get(SHOW_MULTIFIELDS);

  const fieldsToShow = useMemo(() => {
    const indexPatternFields = indexPattern.fields.getAll().map((fld) => fld.name);
    return getFieldsToShow(indexPatternFields, indexPattern, showMultiFields);
  }, [indexPattern, showMultiFields]);

  /**
   * Cell rendering
   */
  const renderCellValue = useMemo(
    () =>
      getRenderCellValueFn(
        indexPattern,
        displayedRows,
        displayedRows
          ? displayedRows.map((hit) =>
              flattenHit(hit, indexPattern, { includeIgnoredValues: true })
            )
          : [],
        useNewFieldsApi,
        fieldsToShow,
        services.uiSettings.get(MAX_DOC_FIELDS_DISPLAYED)
      ),
    [indexPattern, displayedRows, useNewFieldsApi, fieldsToShow, services.uiSettings]
  );

  /**
   * Render variables
   */
  const showDisclaimer = rowCount === sampleSize && isOnLastPage;
  const randomId = useMemo(() => htmlIdGenerator()(), []);

  const euiGridColumns = useMemo(
    () =>
      getEuiGridColumns(
        displayedColumns,
        settings,
        indexPattern,
        showTimeCol,
        defaultColumns,
        isSortEnabled
      ),
    [displayedColumns, indexPattern, showTimeCol, settings, defaultColumns, isSortEnabled]
  );

  const hideTimeColumn = useMemo(
    () => services.uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false),
    [services.uiSettings]
  );
  const schemaDetectors = useMemo(() => getSchemaDetectors(), []);
  const columnsVisibility = useMemo(
    () => ({
      visibleColumns: getVisibleColumns(displayedColumns, indexPattern, showTimeCol) as string[],
      setVisibleColumns: (newColumns: string[]) => {
        onSetColumns(newColumns, hideTimeColumn);
      },
    }),
    [displayedColumns, indexPattern, showTimeCol, hideTimeColumn, onSetColumns]
  );
  const sorting = useMemo(() => {
    if (isSortEnabled) {
      return { columns: sortingColumns, onSort: onTableSort };
    }
    return { columns: sortingColumns, onSort: () => {} };
  }, [sortingColumns, onTableSort, isSortEnabled]);
  const lead = useMemo(
    () => getLeadControlColumns().filter(({ id }) => controlColumnIds.includes(id)),
    [controlColumnIds]
  );

  const additionalControls = useMemo(
    () =>
      usedSelectedDocs.length ? (
        <DiscoverGridDocumentToolbarBtn
          isFilterActive={isFilterActive}
          rows={rows!}
          selectedDocs={usedSelectedDocs}
          setSelectedDocs={setSelectedDocs}
          setIsFilterActive={setIsFilterActive}
        />
      ) : null,
    [usedSelectedDocs, isFilterActive, rows, setIsFilterActive]
  );

  const showDisplaySelector = useMemo(
    () =>
      !!onUpdateRowHeight
        ? {
            allowDensity: false,
            allowRowHeight: true,
          }
        : undefined,
    [onUpdateRowHeight]
  );

  const toolbarVisibility = useMemo(
    () =>
      defaultColumns
        ? {
            ...toolbarVisibilityDefaults,
            showColumnSelector: false,
            showSortSelector: isSortEnabled,
            additionalControls,
            showDisplaySelector,
          }
        : {
            ...toolbarVisibilityDefaults,
            showSortSelector: isSortEnabled,
            additionalControls,
            showDisplaySelector,
          },
    [showDisplaySelector, defaultColumns, additionalControls, isSortEnabled]
  );

  const rowHeightsOptions = useRowHeightsOptions({
    rowHeightState,
    onUpdateRowHeight,
  });

  if (!rowCount && isLoading) {
    return (
      <div className="euiDataGrid__loading">
        <EuiText size="xs" color="subdued">
          <EuiLoadingSpinner />
          <EuiSpacer size="s" />
          <FormattedMessage id="discover.loadingResults" defaultMessage="Loading results" />
        </EuiText>
      </div>
    );
  }

  if (!rowCount) {
    return (
      <div
        className="euiDataGrid__noResults"
        data-render-complete={!isLoading}
        data-shared-item=""
        data-title={searchTitle}
        data-description={searchDescription}
        data-document-number={0}
      >
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
        expanded: expandedDoc,
        setExpanded: setExpandedDoc,
        rows: displayedRows,
        onFilter,
        indexPattern,
        isDarkMode: services.uiSettings.get('theme:darkMode'),
        selectedDocs: usedSelectedDocs,
        setSelectedDocs: (newSelectedDocs) => {
          setSelectedDocs(newSelectedDocs);
          if (isFilterActive && newSelectedDocs.length === 0) {
            setIsFilterActive(false);
          }
        },
      }}
    >
      <span
        data-test-subj="discoverDocTable"
        data-render-complete={!isLoading}
        data-shared-item=""
        data-title={searchTitle}
        data-description={searchDescription}
        data-document-number={displayedRows.length}
        className={className}
      >
        <EuiDataGridMemoized
          aria-describedby={randomId}
          aria-labelledby={ariaLabelledBy}
          columns={euiGridColumns}
          columnVisibility={columnsVisibility}
          data-test-subj="docTable"
          leadingControlColumns={lead}
          onColumnResize={onResize}
          pagination={paginationObj}
          renderCellValue={renderCellValue}
          rowCount={rowCount}
          schemaDetectors={schemaDetectors}
          sorting={sorting as EuiDataGridSorting}
          toolbarVisibility={toolbarVisibility}
          rowHeightsOptions={rowHeightsOptions}
          gridStyle={GRID_STYLE}
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
        {expandedDoc && (
          <DiscoverGridFlyout
            indexPattern={indexPattern}
            hit={expandedDoc}
            hits={displayedRows}
            // if default columns are used, dont make them part of the URL - the context state handling will take care to restore them
            columns={defaultColumns ? [] : displayedColumns}
            onFilter={onFilter}
            onRemoveColumn={onRemoveColumn}
            onAddColumn={onAddColumn}
            onClose={() => setExpandedDoc(undefined)}
            setExpandedDoc={setExpandedDoc}
          />
        )}
      </span>
    </DiscoverGridContext.Provider>
  );
};
