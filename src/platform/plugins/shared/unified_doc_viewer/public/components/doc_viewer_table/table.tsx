/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import useWindowSize from 'react-use/lib/useWindowSize';
import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSelectableMessage,
  EuiI18n,
  useResizeObserver,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  SHOW_MULTIFIELDS,
  DOC_HIDE_TIME_COLUMN_SETTING,
  getShouldShowFieldHandler,
  getVisibleColumns,
  canPrependTimeFieldColumn,
} from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { createRestorableStateProvider } from '@kbn/restorable-state';

import { getUnifiedDocViewerServices } from '../../plugin';
import {
  DEFAULT_MARGIN_BOTTOM,
  getTabContentAvailableHeight,
} from '../doc_viewer_source/get_height';
import type { TableFiltersProps } from './table_filters';
import {
  LOCAL_STORAGE_KEY_SEARCH_TERM,
  LOCAL_STORAGE_KEY_SELECTED_FIELD_TYPES,
  TableFilters,
  useTableFiltersCallbacks,
} from './table_filters';
import { FieldRow } from './field_row';
import { TableGrid } from './table_grid';

export interface DocViewerTableRestorableState {
  // Main search input value
  searchTerm: string;
  // Array of field type filters (date, keyword, text, etc.)
  fieldTypeFilters: string[];
  // Whether null values are hidden in the table
  hideNullValues: boolean;
  // Whether to show only selected fields in the table
  showOnlySelectedFields: boolean;
  // Array of pinned field names
  pinnedFields: string[];
  // Current rows per page selection
  rowsPerPage: number;
  // Current page number
  pageNumber: number;
  // Current vertical scroll position
  scrollTop: number;
}

export const {
  withRestorableState,
  useRestorableState,
  useRestorableRef,
  useRestorableLocalStorage,
} = createRestorableStateProvider<DocViewerTableRestorableState>();

interface ItemsEntry {
  pinnedRows: FieldRow[];
  restRows: FieldRow[];
  allFields: TableFiltersProps['allFields'];
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500];
const DEFAULT_PAGE_SIZE = 25;
const PINNED_FIELDS_KEY = 'discover:pinnedFields';
const PAGE_SIZE = 'discover:pageSize';
export const HIDE_NULL_VALUES = 'unifiedDocViewer:hideNullValues';
export const SHOW_ONLY_SELECTED_FIELDS = 'unifiedDocViewer:showOnlySelectedFields';

// we keep writing to localStorage for pinned fields custom here (instead of useRestorableLocalStorage)
// to keep backward compatibility
const getPinnedFieldsFromStorage = (dataViewId: string, storage: Storage): string[] => {
  const pinnedFieldsEntry = storage.get(PINNED_FIELDS_KEY);
  if (
    typeof pinnedFieldsEntry === 'object' &&
    pinnedFieldsEntry !== null &&
    Array.isArray(pinnedFieldsEntry[dataViewId])
  ) {
    return pinnedFieldsEntry[dataViewId].filter((cur: unknown) => typeof cur === 'string');
  }
  return [];
};
const savePinnedFieldsToStorage = (newFields: string[], dataViewId: string, storage: Storage) => {
  let pinnedFieldsEntry = storage.get(PINNED_FIELDS_KEY);
  pinnedFieldsEntry =
    typeof pinnedFieldsEntry === 'object' && pinnedFieldsEntry !== null ? pinnedFieldsEntry : {};

  storage.set(PINNED_FIELDS_KEY, {
    ...pinnedFieldsEntry,
    [dataViewId]: newFields,
  });
};

const InternalDocViewerTable = ({
  columns,
  columnsMeta,
  hit,
  dataView,
  textBasedHits,
  filter,
  decreaseAvailableHeightBy,
  onAddColumn,
  onRemoveColumn,
  hideFilteringOnComputedColumns,
}: DocViewRenderProps) => {
  const styles = useMemoCss(componentStyles);

  const isEsqlMode = Array.isArray(textBasedHits);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const { fieldFormats, storage, uiSettings } = getUnifiedDocViewerServices();
  const showMultiFields = uiSettings.get(SHOW_MULTIFIELDS);
  const currentDataViewId = dataView.id!;

  const [searchTerm, setSearchTerm] = useRestorableLocalStorage(
    'searchTerm',
    LOCAL_STORAGE_KEY_SEARCH_TERM,
    ''
  );
  const [fieldTypeFilters, setFieldTypeFilters] = useRestorableLocalStorage(
    'fieldTypeFilters',
    LOCAL_STORAGE_KEY_SELECTED_FIELD_TYPES,
    []
  );
  const [hideNullValues, setHideNullValues] = useRestorableLocalStorage(
    'hideNullValues',
    HIDE_NULL_VALUES,
    false
  );
  const [showOnlySelectedFields, setShowOnlySelectedFields] = useRestorableLocalStorage(
    'showOnlySelectedFields',
    SHOW_ONLY_SELECTED_FIELDS,
    false
  );

  const tableFiltersCallbacks = useTableFiltersCallbacks({
    searchTerm,
    selectedFieldTypes: fieldTypeFilters,
  });

  const [pinnedFields, setPinnedFields] = useRestorableState(
    'pinnedFields',
    getPinnedFieldsFromStorage(currentDataViewId, storage),
    { shouldStoreDefaultValueRightAway: true }
  );

  const flattened = hit.flattened;
  const shouldShowFieldHandler = useMemo(
    () =>
      getShouldShowFieldHandler(Object.keys(flattened), dataView, isEsqlMode || showMultiFields),
    [flattened, dataView, isEsqlMode, showMultiFields]
  );

  const mapping = useCallback((name: string) => dataView.fields.getByName(name), [dataView.fields]);

  const onTogglePinned = useCallback(
    (field: string) => {
      const newPinned = pinnedFields.includes(field)
        ? pinnedFields.filter((curField) => curField !== field)
        : [...pinnedFields, field];
      setPinnedFields(newPinned); // Updates restorable and URL state
      savePinnedFieldsToStorage(newPinned, currentDataViewId, storage); // Persists to localStorage
    },
    [currentDataViewId, pinnedFields, storage, setPinnedFields]
  );

  const onChangeSearchTerm = useCallback(
    (newSearchTerm: string) => {
      setSearchTerm(newSearchTerm);
    },
    [setSearchTerm]
  );

  const onChangeFieldTypes = useCallback(
    (newFieldTypes: string[]) => {
      setFieldTypeFilters(newFieldTypes);
    },
    [setFieldTypeFilters]
  );

  const fieldToItem = useCallback(
    (field: string, isPinned: boolean): FieldRow => {
      return new FieldRow({
        name: field,
        flattenedValue: flattened[field],
        hit,
        dataView,
        fieldFormats,
        isPinned,
        columnsMeta,
      });
    },
    [dataView, hit, columnsMeta, flattened, fieldFormats]
  );

  const fieldsFromColumns = useMemo(
    () => columns?.filter((column) => column !== '_source') || [],
    [columns]
  );

  const isShowOnlySelectedFieldsDisabled = !fieldsFromColumns?.length;

  const shouldShowOnlySelectedFields = useMemo(
    () => showOnlySelectedFields && !isShowOnlySelectedFieldsDisabled,
    [showOnlySelectedFields, isShowOnlySelectedFieldsDisabled]
  );

  const displayedFieldNames = useMemo(() => {
    if (shouldShowOnlySelectedFields) {
      return getVisibleColumns(
        fieldsFromColumns,
        dataView,
        canPrependTimeFieldColumn(
          columns,
          dataView.timeFieldName,
          columnsMeta,
          !uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false),
          isEsqlMode
        )
      );
    }
    return Object.keys(flattened).sort((fieldA, fieldB) => {
      const mappingA = mapping(fieldA);
      const mappingB = mapping(fieldB);
      const nameA = !mappingA || !mappingA.displayName ? fieldA : mappingA.displayName;
      const nameB = !mappingB || !mappingB.displayName ? fieldB : mappingB.displayName;
      return nameA.localeCompare(nameB);
    });
  }, [
    fieldsFromColumns,
    flattened,
    shouldShowOnlySelectedFields,
    mapping,
    dataView,
    columns,
    columnsMeta,
    isEsqlMode,
    uiSettings,
  ]);

  const { pinnedRows, restRows, allFields } = useMemo(
    () =>
      displayedFieldNames.reduce<ItemsEntry>(
        (acc, curFieldName) => {
          if (!shouldShowOnlySelectedFields && !shouldShowFieldHandler(curFieldName)) {
            return acc;
          }
          const shouldHideNullValue =
            isEsqlMode && hideNullValues && flattened[curFieldName] == null;
          if (shouldHideNullValue) {
            return acc;
          }

          const isPinned = pinnedFields.includes(curFieldName);
          const row = fieldToItem(curFieldName, isPinned);

          if (isPinned) {
            acc.pinnedRows.push(row);
          } else {
            if (tableFiltersCallbacks.onFilterField(row)) {
              // filter only unpinned fields
              acc.restRows.push(row);
            }
          }

          acc.allFields.push({
            name: curFieldName,
            displayName: row.dataViewField?.displayName,
            type: row.fieldType,
          });

          return acc;
        },
        {
          pinnedRows: [],
          restRows: [],
          allFields: [],
        }
      ),
    [
      displayedFieldNames,
      hideNullValues,
      shouldShowOnlySelectedFields,
      fieldToItem,
      flattened,
      isEsqlMode,
      tableFiltersCallbacks,
      pinnedFields,
      shouldShowFieldHandler,
    ]
  );

  const rows = useMemo(() => [...pinnedRows, ...restRows], [pinnedRows, restRows]);

  const [initialPageSizeRaw, setInitialPageSizeRaw] = useRestorableLocalStorage(
    'rowsPerPage',
    PAGE_SIZE,
    DEFAULT_PAGE_SIZE
  );

  // Ensure initialPageSize is always a valid option
  const initialPageSize = useMemo(
    () => (PAGE_SIZE_OPTIONS.includes(initialPageSizeRaw) ? initialPageSizeRaw : DEFAULT_PAGE_SIZE),
    [initialPageSizeRaw]
  );

  const onChangePageSize = useCallback(
    (newPageSize: number) => {
      setInitialPageSizeRaw(newPageSize);
    },
    [setInitialPageSizeRaw]
  );

  const [pageNumber, setPageNumber] = useRestorableState('pageNumber', 0);

  const onChangePageNumber = useCallback(
    (newPageNumber: number) => {
      setPageNumber(newPageNumber);
    },
    [setPageNumber]
  );

  useWindowSize(); // trigger re-render on window resize to recalculate the grid container height
  const { width: containerWidth } = useResizeObserver(containerRef);

  const onHideNullValuesChange = useCallback(
    (e: EuiSwitchEvent) => {
      setHideNullValues(e.target.checked);
    },
    [setHideNullValues]
  );

  const onShowOnlySelectedFieldsChange = useCallback(
    (e: EuiSwitchEvent) => {
      setShowOnlySelectedFields(e.target.checked);
    },
    [setShowOnlySelectedFields]
  );

  const containerHeight = containerRef
    ? getTabContentAvailableHeight(containerRef, decreaseAvailableHeightBy ?? DEFAULT_MARGIN_BOTTOM)
    : 0;

  return (
    <EuiFlexGroup
      ref={setContainerRef}
      direction="column"
      gutterSize="none"
      responsive={false}
      css={
        containerHeight
          ? css`
              height: ${containerHeight}px;
            `
          : css`
              display: block;
            `
      }
    >
      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <TableFilters
          searchTerm={searchTerm}
          onChangeSearchTerm={onChangeSearchTerm}
          selectedFieldTypes={fieldTypeFilters}
          onChangeFieldTypes={onChangeFieldTypes}
          allFields={allFields}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          responsive={false}
          wrap={true}
          direction="row"
          justifyContent="flexEnd"
          alignItems="center"
          gutterSize="m"
        >
          {filter && (
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={i18n.translate('unifiedDocViewer.showOnlySelectedFields.switchLabel', {
                  defaultMessage: 'Selected only',
                  description: 'Switch label to show only selected fields in the table',
                })}
                checked={showOnlySelectedFields ?? false}
                disabled={isShowOnlySelectedFieldsDisabled}
                onChange={onShowOnlySelectedFieldsChange}
                compressed
                data-test-subj="unifiedDocViewerShowOnlySelectedFieldsSwitch"
              />
            </EuiFlexItem>
          )}
          {isEsqlMode && (
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={i18n.translate('unifiedDocViewer.hideNullValues.switchLabel', {
                  defaultMessage: 'Hide null fields',
                  description: 'Switch label to hide fields with null values in the table',
                })}
                checked={hideNullValues ?? false}
                onChange={onHideNullValuesChange}
                compressed
                data-test-subj="unifiedDocViewerHideNullValuesSwitch"
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
      </EuiFlexItem>

      {rows.length === 0 ? (
        <EuiSelectableMessage css={styles.noFieldsFound}>
          <p>
            <EuiI18n
              token="unifiedDocViewer.docViews.table.noFieldFound"
              default="No fields found"
            />
          </p>
        </EuiSelectableMessage>
      ) : (
        <EuiFlexItem grow={Boolean(containerHeight)} css={styles.fieldsGridWrapper}>
          <TableGrid
            id={`fields-table-${hit.id}`}
            containerWidth={containerWidth}
            rows={rows}
            isEsqlMode={isEsqlMode}
            filter={filter}
            onAddColumn={onAddColumn}
            onRemoveColumn={onRemoveColumn}
            columns={columns}
            onFindSearchTermMatch={tableFiltersCallbacks.onFindSearchTermMatch}
            searchTerm={searchTerm}
            initialPageSize={initialPageSize}
            onChangePageSize={onChangePageSize}
            initialPageIndex={pageNumber}
            onChangePageIndex={onChangePageNumber}
            pinnedFields={pinnedFields}
            onTogglePinned={onTogglePinned}
            hideFilteringOnComputedColumns={hideFilteringOnComputedColumns}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const DocViewerTable = withRestorableState(InternalDocViewerTable);

const componentStyles = {
  fieldsGridWrapper: () =>
    css({
      minBlockSize: 0,
      display: 'block',
    }),
  noFieldsFound: css({
    minHeight: 300,
  }),
};
