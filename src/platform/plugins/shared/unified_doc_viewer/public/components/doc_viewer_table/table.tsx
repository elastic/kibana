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
import useLocalStorage from 'react-use/lib/useLocalStorage';
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

import { getUnifiedDocViewerServices } from '../../plugin';
import {
  DEFAULT_MARGIN_BOTTOM,
  getTabContentAvailableHeight,
} from '../doc_viewer_source/get_height';
import type { TableFiltersProps } from './table_filters';
import { LOCAL_STORAGE_KEY_SEARCH_TERM, TableFilters, useTableFilters } from './table_filters';
import { FieldRow } from './field_row';
import { TableGrid } from './table_grid';

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

const getPinnedFields = (dataViewId: string, storage: Storage): string[] => {
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
const updatePinnedFieldsState = (newFields: string[], dataViewId: string, storage: Storage) => {
  let pinnedFieldsEntry = storage.get(PINNED_FIELDS_KEY);
  pinnedFieldsEntry =
    typeof pinnedFieldsEntry === 'object' && pinnedFieldsEntry !== null ? pinnedFieldsEntry : {};

  storage.set(PINNED_FIELDS_KEY, {
    ...pinnedFieldsEntry,
    [dataViewId]: newFields,
  });
};

const getPageSize = (storage: Storage): number => {
  const pageSize = Number(storage.get(PAGE_SIZE));
  return pageSize && PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE;
};
const updatePageSize = (newPageSize: number, storage: Storage) => {
  storage.set(PAGE_SIZE, newPageSize);
};

export const DocViewerTable = ({
  columns,
  columnsMeta,
  hit,
  dataView,
  textBasedHits,
  filter,
  decreaseAvailableHeightBy,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) => {
  const styles = useMemoCss(componentStyles);

  const isEsqlMode = Array.isArray(textBasedHits);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const { fieldFormats, storage, uiSettings } = getUnifiedDocViewerServices();
  const showMultiFields = uiSettings.get(SHOW_MULTIFIELDS);
  const currentDataViewId = dataView.id!;

  const [pinnedFields, setPinnedFields] = useState<string[]>(
    getPinnedFields(currentDataViewId, storage)
  );
  const [areNullValuesHidden, setAreNullValuesHidden] = useLocalStorage(HIDE_NULL_VALUES, false);
  const [showOnlySelectedFields, setShowOnlySelectedFields] = useLocalStorage(
    SHOW_ONLY_SELECTED_FIELDS,
    false
  );

  const flattened = hit.flattened;
  const shouldShowFieldHandler = useMemo(
    () => getShouldShowFieldHandler(Object.keys(flattened), dataView, showMultiFields),
    [flattened, dataView, showMultiFields]
  );

  const mapping = useCallback((name: string) => dataView.fields.getByName(name), [dataView.fields]);

  const onTogglePinned = useCallback(
    (field: string) => {
      const newPinned = pinnedFields.includes(field)
        ? pinnedFields.filter((curField) => curField !== field)
        : [...pinnedFields, field];

      updatePinnedFieldsState(newPinned, currentDataViewId, storage);
      setPinnedFields(newPinned);
    },
    [currentDataViewId, pinnedFields, storage]
  );

  const { onFilterField, onFindSearchTermMatch, ...tableFiltersProps } = useTableFilters({
    storage,
    storageKey: LOCAL_STORAGE_KEY_SEARCH_TERM,
  });

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
            isEsqlMode && areNullValuesHidden && flattened[curFieldName] == null;
          if (shouldHideNullValue) {
            return acc;
          }

          const isPinned = pinnedFields.includes(curFieldName);
          const row = fieldToItem(curFieldName, isPinned);

          if (isPinned) {
            acc.pinnedRows.push(row);
          } else {
            if (onFilterField(row)) {
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
      areNullValuesHidden,
      shouldShowOnlySelectedFields,
      fieldToItem,
      flattened,
      isEsqlMode,
      onFilterField,
      pinnedFields,
      shouldShowFieldHandler,
    ]
  );

  const rows = useMemo(() => [...pinnedRows, ...restRows], [pinnedRows, restRows]);

  const initialPageSize = getPageSize(storage);

  const onChangePageSize = useCallback(
    (newPageSize: number) => {
      updatePageSize(newPageSize, storage);
    },
    [storage]
  );

  useWindowSize(); // trigger re-render on window resize to recalculate the grid container height
  const { width: containerWidth } = useResizeObserver(containerRef);

  const onHideNullValuesChange = useCallback(
    (e: EuiSwitchEvent) => {
      setAreNullValuesHidden(e.target.checked);
    },
    [setAreNullValuesHidden]
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
        <TableFilters {...tableFiltersProps} allFields={allFields} />
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
                checked={areNullValuesHidden ?? false}
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
            onFindSearchTermMatch={onFindSearchTermMatch}
            searchTerm={tableFiltersProps.searchTerm}
            initialPageSize={initialPageSize}
            onChangePageSize={onChangePageSize}
            pinnedFields={pinnedFields}
            onTogglePinned={onTogglePinned}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

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
