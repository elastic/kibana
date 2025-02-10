/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './table.scss';
import React, { useCallback, useMemo, useState } from 'react';
import useWindowSize from 'react-use/lib/useWindowSize';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSelectableMessage,
  EuiDataGrid,
  EuiDataGridProps,
  EuiDataGridCellPopoverElementProps,
  EuiI18n,
  EuiText,
  EuiCallOut,
  useResizeObserver,
  EuiSwitch,
  EuiSwitchEvent,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  SHOW_MULTIFIELDS,
  DOC_HIDE_TIME_COLUMN_SETTING,
  getShouldShowFieldHandler,
  usePager,
  getVisibleColumns,
  canPrependTimeFieldColumn,
} from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { getUnifiedDocViewerServices } from '../../plugin';
import {
  getFieldCellActions,
  getFieldValueCellActions,
  getFilterExistsDisabledWarning,
  getFilterInOutPairDisabledWarning,
} from './table_cell_actions';
import {
  DEFAULT_MARGIN_BOTTOM,
  getTabContentAvailableHeight,
} from '../doc_viewer_source/get_height';
import { TableFilters, TableFiltersProps, useTableFilters } from './table_filters';
import { TableCell } from './table_cell';
import { getPinColumnControl } from './get_pin_control';
import { FieldRow } from './field_row';

interface ItemsEntry {
  pinnedRows: FieldRow[];
  restRows: FieldRow[];
  allFields: TableFiltersProps['allFields'];
}

const MIN_NAME_COLUMN_WIDTH = 150;
const MAX_NAME_COLUMN_WIDTH = 350;
const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500];
const DEFAULT_PAGE_SIZE = 25;
const PINNED_FIELDS_KEY = 'discover:pinnedFields';
const PAGE_SIZE = 'discover:pageSize';
const HIDE_NULL_VALUES = 'unifiedDocViewer:hideNullValues';
export const SHOW_ONLY_SELECTED_FIELDS = 'unifiedDocViewer:showOnlySelectedFields';

const GRID_COLUMN_FIELD_NAME = 'name';
const GRID_COLUMN_FIELD_VALUE = 'value';

const GRID_PROPS: Pick<EuiDataGridProps, 'columnVisibility' | 'rowHeightsOptions' | 'gridStyle'> = {
  columnVisibility: {
    visibleColumns: ['name', 'value'],
    setVisibleColumns: () => null,
  },
  rowHeightsOptions: { defaultHeight: 'auto' },
  gridStyle: {
    border: 'horizontal',
    stripes: true,
    rowHover: 'highlight',
    header: 'underline',
    cellPadding: 'm',
    fontSize: 's',
  },
};

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
  const { euiTheme } = useEuiTheme();
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

  const onToggleColumn = useMemo(() => {
    if (!onRemoveColumn || !onAddColumn || !columns) {
      return undefined;
    }
    return (field: string) => {
      if (columns.includes(field)) {
        onRemoveColumn(field);
      } else {
        onAddColumn(field);
      }
    };
  }, [onRemoveColumn, onAddColumn, columns]);

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

  const { onFilterField, onFindSearchTermMatch, ...tableFiltersProps } = useTableFilters(storage);

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

  const leadingControlColumns = useMemo(() => {
    return [getPinColumnControl({ rows, onTogglePinned })];
  }, [rows, onTogglePinned]);

  const { curPageIndex, pageSize, totalPages, changePageIndex, changePageSize } = usePager({
    initialPageSize: getPageSize(storage),
    totalItems: rows.length,
  });
  const showPagination = totalPages !== 0;

  const onChangePageSize = useCallback(
    (newPageSize: number) => {
      updatePageSize(newPageSize, storage);
      changePageSize(newPageSize);
    },
    [changePageSize, storage]
  );

  const pagination = useMemo(() => {
    return showPagination
      ? {
          onChangeItemsPerPage: onChangePageSize,
          onChangePage: changePageIndex,
          pageIndex: curPageIndex,
          pageSize,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }
      : undefined;
  }, [showPagination, curPageIndex, pageSize, onChangePageSize, changePageIndex]);

  const fieldCellActions = useMemo(
    () => getFieldCellActions({ rows, isEsqlMode, onFilter: filter, onToggleColumn }),
    [rows, isEsqlMode, filter, onToggleColumn]
  );
  const fieldValueCellActions = useMemo(
    () => getFieldValueCellActions({ rows, isEsqlMode, onFilter: filter }),
    [rows, isEsqlMode, filter]
  );

  useWindowSize(); // trigger re-render on window resize to recalculate the grid container height
  const { width: containerWidth } = useResizeObserver(containerRef);

  const gridColumns: EuiDataGridProps['columns'] = useMemo(
    () => [
      {
        id: GRID_COLUMN_FIELD_NAME,
        displayAsText: i18n.translate('unifiedDocViewer.fieldChooser.discoverField.name', {
          defaultMessage: 'Field',
        }),
        initialWidth: Math.min(
          Math.max(Math.round(containerWidth * 0.3), MIN_NAME_COLUMN_WIDTH),
          MAX_NAME_COLUMN_WIDTH
        ),
        actions: false,
        visibleCellActions: 3,
        cellActions: fieldCellActions,
      },
      {
        id: GRID_COLUMN_FIELD_VALUE,
        displayAsText: i18n.translate('unifiedDocViewer.fieldChooser.discoverField.value', {
          defaultMessage: 'Value',
        }),
        actions: false,
        visibleCellActions: 2,
        cellActions: fieldValueCellActions,
      },
    ],
    [fieldCellActions, fieldValueCellActions, containerWidth]
  );

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

  const renderCellValue: EuiDataGridProps['renderCellValue'] = useCallback(
    ({ rowIndex, columnId, isDetails }) => {
      return (
        <TableCell
          searchTerm={tableFiltersProps.searchTerm}
          rows={rows}
          rowIndex={rowIndex}
          columnId={columnId}
          isDetails={isDetails}
          onFindSearchTermMatch={onFindSearchTermMatch}
        />
      );
    },
    [rows, tableFiltersProps.searchTerm, onFindSearchTermMatch]
  );

  const renderCellPopover = useCallback(
    (props: EuiDataGridCellPopoverElementProps) => {
      const { columnId, children, cellActions, rowIndex } = props;
      const row = rows[rowIndex];

      let warningMessage: string | undefined;
      if (columnId === GRID_COLUMN_FIELD_VALUE) {
        warningMessage = getFilterInOutPairDisabledWarning(row, filter);
      } else if (columnId === GRID_COLUMN_FIELD_NAME) {
        warningMessage = getFilterExistsDisabledWarning(row, filter);
      }

      return (
        <>
          <EuiText size="s">{children}</EuiText>
          {cellActions}
          {Boolean(warningMessage) && (
            <div>
              <EuiSpacer size="xs" />
              <EuiCallOut title={warningMessage} color="warning" size="s" />
            </div>
          )}
        </>
      );
    },
    [rows, filter]
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
        <EuiSelectableMessage css={{ minHeight: 300 }}>
          <p>
            <EuiI18n
              token="unifiedDocViewer.docViews.table.noFieldFound"
              default="No fields found"
            />
          </p>
        </EuiSelectableMessage>
      ) : (
        <EuiFlexItem
          grow={Boolean(containerHeight)}
          css={css`
            min-block-size: 0;
            display: block;
            .euiDataGridRow {
              &:hover {
                // we keep using a deprecated shade until proper token is available
                background-color: ${euiTheme.colors.lightestShade};
              }
            }
          `}
        >
          <EuiDataGrid
            key={`fields-table-${hit.id}`}
            {...GRID_PROPS}
            aria-label={i18n.translate('unifiedDocViewer.fieldsTable.ariaLabel', {
              defaultMessage: 'Field values',
            })}
            className="kbnDocViewer__fieldsGrid"
            columns={gridColumns}
            toolbarVisibility={false}
            rowCount={rows.length}
            renderCellValue={renderCellValue}
            renderCellPopover={renderCellPopover}
            pagination={pagination}
            leadingControlColumns={leadingControlColumns}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
