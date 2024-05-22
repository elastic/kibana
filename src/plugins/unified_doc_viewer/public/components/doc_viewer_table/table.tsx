/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './table.scss';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiSpacer,
  EuiSelectableMessage,
  EuiDataGrid,
  EuiDataGridProps,
  EuiI18n,
  useResizeObserver,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { debounce } from 'lodash';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { getFieldIconType } from '@kbn/field-utils/src/utils/get_field_icon_type';
import {
  SHOW_MULTIFIELDS,
  formatFieldValue,
  getIgnoredReason,
  getShouldShowFieldHandler,
  isNestedFieldParent,
  usePager,
} from '@kbn/discover-utils';
import {
  FieldDescription,
  fieldNameWildcardMatcher,
  getFieldSearchMatchingHighlight,
  getTextBasedColumnIconType,
} from '@kbn/field-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { FieldName } from '@kbn/unified-doc-viewer';
import { getUnifiedDocViewerServices } from '../../plugin';
import { TableFieldValue } from './table_cell_value';
import { type TableRow, getFieldCellActions, getFieldValueCellActions } from './table_cell_actions';
import {
  DEFAULT_MARGIN_BOTTOM,
  getTabContentAvailableHeight,
} from '../doc_viewer_source/get_height';

export type FieldRecord = TableRow;

interface ItemsEntry {
  pinnedItems: FieldRecord[];
  restItems: FieldRecord[];
}

const MIN_NAME_COLUMN_WIDTH = 150;
const MAX_NAME_COLUMN_WIDTH = 350;
const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500];
const DEFAULT_PAGE_SIZE = 25;
const PINNED_FIELDS_KEY = 'discover:pinnedFields';
const PAGE_SIZE = 'discover:pageSize';
const SEARCH_TEXT = 'discover:searchText';

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

const getSearchText = (storage: Storage) => {
  return storage.get(SEARCH_TEXT) || '';
};
const updateSearchText = debounce(
  (newSearchText: string, storage: Storage) => storage.set(SEARCH_TEXT, newSearchText),
  500
);

export const DocViewerTable = ({
  columns,
  columnsMeta,
  hit,
  dataView,
  filter,
  decreaseAvailableHeightBy,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) => {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const { fieldFormats, storage, uiSettings } = getUnifiedDocViewerServices();
  const showMultiFields = uiSettings.get(SHOW_MULTIFIELDS);
  const currentDataViewId = dataView.id!;

  const [searchText, setSearchText] = useState(getSearchText(storage));
  const [pinnedFields, setPinnedFields] = useState<string[]>(
    getPinnedFields(currentDataViewId, storage)
  );

  const flattened = hit.flattened;
  const shouldShowFieldHandler = useMemo(
    () => getShouldShowFieldHandler(Object.keys(flattened), dataView, showMultiFields),
    [flattened, dataView, showMultiFields]
  );

  const searchPlaceholder = i18n.translate('unifiedDocViewer.docView.table.searchPlaceHolder', {
    defaultMessage: 'Search field names',
  });

  const mapping = useCallback((name: string) => dataView.fields.getByName(name), [dataView.fields]);

  const isAddedAsColumn = useCallback(
    (field: string) => {
      return columns?.includes(field) ?? false;
    },
    [columns]
  );

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

  const fieldToItem = useCallback(
    (field: string): TableRow => {
      const fieldMapping = mapping(field);
      const displayName = fieldMapping?.displayName ?? field;
      const columnMeta = columnsMeta?.[field];
      const columnIconType = getTextBasedColumnIconType(columnMeta);
      const fieldType = columnIconType
        ? columnIconType // for text-based results types come separately
        : isNestedFieldParent(field, dataView)
        ? 'nested'
        : fieldMapping
        ? getFieldIconType(fieldMapping)
        : undefined;

      const ignored = getIgnoredReason(fieldMapping ?? field, hit.raw._ignored);

      return {
        action: {
          onToggleColumn,
          onFilter: filter,
          flattenedField: flattened[field],
          isAddedAsColumn,
        },
        field: {
          field,
          displayName,
          fieldMapping,
          fieldType,
          scripted: Boolean(fieldMapping?.scripted),
          pinned: pinnedFields.includes(displayName),
          onTogglePinned,
        },
        value: {
          formattedValue: formatFieldValue(
            hit.flattened[field],
            hit.raw,
            fieldFormats,
            dataView,
            fieldMapping
          ),
          ignored,
        },
      };
    },
    [
      mapping,
      dataView,
      hit,
      onToggleColumn,
      filter,
      columnsMeta,
      flattened,
      pinnedFields,
      onTogglePinned,
      fieldFormats,
      isAddedAsColumn,
    ]
  );

  const handleOnChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newSearchText = event.currentTarget.value;
      updateSearchText(newSearchText, storage);
      setSearchText(newSearchText);
    },
    [storage]
  );

  const { pinnedItems, restItems } = Object.keys(flattened)
    .sort((fieldA, fieldB) => {
      const mappingA = mapping(fieldA);
      const mappingB = mapping(fieldB);
      const nameA = !mappingA || !mappingA.displayName ? fieldA : mappingA.displayName;
      const nameB = !mappingB || !mappingB.displayName ? fieldB : mappingB.displayName;
      return nameA.localeCompare(nameB);
    })
    .reduce<ItemsEntry>(
      (acc, curFieldName) => {
        if (!shouldShowFieldHandler(curFieldName)) {
          return acc;
        }

        if (pinnedFields.includes(curFieldName)) {
          acc.pinnedItems.push(fieldToItem(curFieldName));
        } else {
          const fieldMapping = mapping(curFieldName);
          if (
            !searchText?.trim() ||
            fieldNameWildcardMatcher(
              { name: curFieldName, displayName: fieldMapping?.displayName },
              searchText
            )
          ) {
            // filter only unpinned fields
            acc.restItems.push(fieldToItem(curFieldName));
          }
        }

        return acc;
      },
      {
        pinnedItems: [],
        restItems: [],
      }
    );

  const { curPageIndex, pageSize, totalPages, changePageIndex, changePageSize } = usePager({
    initialPageSize: getPageSize(storage),
    totalItems: restItems.length,
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

  const rows = useMemo(() => [...pinnedItems, ...restItems], [pinnedItems, restItems]);

  const fieldCellActions = useMemo(
    () => getFieldCellActions({ rows, filter, onToggleColumn }),
    [rows, filter, onToggleColumn]
  );
  const fieldValueCellActions = useMemo(
    () => getFieldValueCellActions({ rows, filter }),
    [rows, filter]
  );

  const { width: containerWidth } = useResizeObserver(containerRef);

  const gridColumns: EuiDataGridProps['columns'] = useMemo(
    () => [
      {
        id: 'name',
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
        id: 'value',
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

  const renderCellValue: EuiDataGridProps['renderCellValue'] = useCallback(
    ({ rowIndex, columnId, isDetails }) => {
      const row = rows[rowIndex];

      if (!row) {
        return null;
      }

      const {
        action: { flattenedField },
        field: { field, fieldMapping, fieldType, scripted, pinned },
        value: { formattedValue, ignored },
      } = row;

      if (columnId === 'name') {
        return (
          <div>
            <FieldName
              fieldName={field}
              fieldType={fieldType}
              fieldMapping={fieldMapping}
              scripted={scripted}
              highlight={getFieldSearchMatchingHighlight(
                fieldMapping?.displayName ?? field,
                searchText
              )}
              isPinned={pinned}
            />

            {isDetails && fieldMapping?.customDescription ? (
              <div>
                <FieldDescription field={fieldMapping} truncate={false} />
              </div>
            ) : null}
          </div>
        );
      }

      if (columnId === 'value') {
        return (
          <TableFieldValue
            field={field}
            formattedValue={formattedValue}
            rawValue={flattenedField}
            ignoreReason={ignored}
          />
        );
      }

      return null;
    },
    [rows, searchText]
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
        <EuiFieldSearch
          aria-label={searchPlaceholder}
          fullWidth
          onChange={handleOnChange}
          placeholder={searchPlaceholder}
          value={searchText}
          data-test-subj="unifiedDocViewerFieldsSearchInput"
        />
      </EuiFlexItem>

      {rows.length === 0 ? (
        <EuiSelectableMessage style={{ minHeight: 300 }}>
          <p>
            <EuiI18n
              token="unifiedDocViewer.docViews.table.noFieldFound"
              default="No fields found"
            />
          </p>
        </EuiSelectableMessage>
      ) : (
        <>
          <EuiFlexItem grow={false}>
            <EuiSpacer size="s" />
          </EuiFlexItem>
          <EuiFlexItem
            grow={Boolean(containerHeight)}
            css={css`
              min-block-size: 0;
              display: block;
            `}
          >
            <EuiDataGrid
              {...GRID_PROPS}
              aria-label={i18n.translate('unifiedDocViewer.fieldsTable.ariaLabel', {
                defaultMessage: 'Field values',
              })}
              className="kbnDocViewer__fieldsGrid"
              columns={gridColumns}
              toolbarVisibility={false}
              rowCount={rows.length}
              renderCellValue={renderCellValue}
              pagination={pagination}
            />
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
};
