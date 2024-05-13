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
  EuiDataGridColumnCellActionProps,
  EuiI18n,
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
  fieldNameWildcardMatcher,
  getFieldSearchMatchingHighlight,
  getTextBasedColumnIconType,
} from '@kbn/field-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { FieldName } from '@kbn/unified-doc-viewer';
import { getUnifiedDocViewerServices } from '../../plugin';
import { TableFieldValue } from './table_cell_value';
import {
  type TableRow,
  FilterIn,
  FilterOut,
  FilterExist,
  ToggleColumn,
  PinToggle,
} from './table_cell_actions';

export type FieldRecord = TableRow;

interface ItemsEntry {
  pinnedItems: FieldRecord[];
  restItems: FieldRecord[];
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];
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
    cellPadding: 's',
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
  availableHeight,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) => {
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

  const onToggleColumn = useCallback(
    (field: string) => {
      if (!onRemoveColumn || !onAddColumn || !columns) {
        return;
      }
      if (columns.includes(field)) {
        onRemoveColumn(field);
      } else {
        onAddColumn(field);
      }
    },
    [onRemoveColumn, onAddColumn, columns]
  );

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

  const gridColumns: EuiDataGridProps['columns'] = useMemo(
    () => [
      {
        id: 'name',
        displayAsText: i18n.translate('unifiedDocViewer.fieldChooser.discoverField.name', {
          defaultMessage: 'Field',
        }),
        initialWidth: 270, // TODO: what should be the default width?
        actions: false,
        visibleCellActions: 3,
        cellActions: [
          ...(filter
            ? [
                ({ Component, rowIndex }: EuiDataGridColumnCellActionProps) => {
                  return <FilterExist row={rows[rowIndex]} Component={Component} />;
                },
              ]
            : []),
          ({ Component, rowIndex }) => {
            return <ToggleColumn row={rows[rowIndex]} Component={Component} />;
          },
          ({ Component, rowIndex }) => {
            return <PinToggle row={rows[rowIndex]} Component={Component} />;
          },
        ],
      },
      {
        id: 'value',
        displayAsText: i18n.translate('unifiedDocViewer.fieldChooser.discoverField.value', {
          defaultMessage: 'Value',
        }),
        actions: false,
        visibleCellActions: 2,
        cellActions: filter
          ? [
              ({ Component, rowIndex }) => {
                return <FilterIn row={rows[rowIndex]} Component={Component} />;
              },
              ({ Component, rowIndex }) => {
                return <FilterOut row={rows[rowIndex]} Component={Component} />;
              },
            ]
          : [],
      },
    ],
    [filter, rows]
  );

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }) => {
      const row = rows[rowIndex];

      if (!row) {
        return null;
      }

      const {
        action: { flattenedField },
        field: { field, fieldMapping, fieldType, scripted },
        value: { formattedValue, ignored },
      } = row;

      if (columnId === 'name') {
        return (
          <EuiFlexGroup responsive={false} gutterSize="s">
            <FieldName
              fieldName={field}
              fieldType={fieldType}
              fieldMapping={fieldMapping}
              scripted={scripted}
              highlight={getFieldSearchMatchingHighlight(
                fieldMapping?.displayName ?? field,
                searchText
              )}
            />
            {/* TODO: how to highlight pinned fields? */}
          </EuiFlexGroup>
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

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      css={
        // TODO: clean up
        availableHeight
          ? css`
              height: ${availableHeight - 2 * 16 - 32}px; // vertical paddings and tabs height
            `
          : css`
              min-height: 500px;
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
          <EuiFlexItem grow>
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
