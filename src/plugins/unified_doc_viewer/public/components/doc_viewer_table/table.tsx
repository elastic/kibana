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
  EuiTable,
  EuiTableBody,
  EuiTableRowCell,
  EuiTableRow,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiText,
  EuiTablePagination,
  EuiSelectableMessage,
  EuiI18n,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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
  containsEcsFields,
  fieldNameWildcardMatcher,
  getFieldSearchMatchingHighlight,
  getTextBasedColumnIconType,
} from '@kbn/field-utils';
import type { DocViewRenderProps, FieldRecordLegacy } from '@kbn/unified-doc-viewer/types';
import { FieldName } from '@kbn/unified-doc-viewer';
import { getUnifiedDocViewerServices } from '../../plugin';
import { TableFieldValue } from './table_cell_value';
import { TableActions } from './table_cell_actions';

export interface FieldRecord {
  action: Omit<FieldRecordLegacy['action'], 'isActive'>;
  field: {
    pinned: boolean;
    onTogglePinned: (field: string) => void;
  } & FieldRecordLegacy['field'];
  value: FieldRecordLegacy['value'];
}

interface ItemsEntry {
  pinnedItems: FieldRecord[];
  restItems: FieldRecord[];
}

const MOBILE_OPTIONS = { header: false };
const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
const PINNED_FIELDS_KEY = 'discover:pinnedFields';
const PAGE_SIZE = 'discover:pageSize';
const SEARCH_TEXT = 'discover:searchText';

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
  hideActionsColumn,
  filter,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) => {
  const showActionsInsideTableCell = useIsWithinBreakpoints(['xl'], true);

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
    (field: string) => {
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
          isActive: !!columns?.includes(field),
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
      columns,
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

  const { curPageIndex, pageSize, totalPages, startIndex, changePageIndex, changePageSize } =
    usePager({
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

  const headers = [
    !hideActionsColumn && (
      <EuiTableHeaderCell
        key="header-cell-actions"
        align="left"
        width={showActionsInsideTableCell && filter ? 150 : 62}
        isSorted={false}
      >
        <EuiText size="xs">
          <strong>
            <FormattedMessage
              id="unifiedDocViewer.fieldChooser.discoverField.actions"
              defaultMessage="Actions"
            />
          </strong>
        </EuiText>
      </EuiTableHeaderCell>
    ),
    <EuiTableHeaderCell key="header-cell-name" align="left" width="30%" isSorted={false}>
      <EuiText size="xs">
        <strong>
          <FormattedMessage
            id="unifiedDocViewer.fieldChooser.discoverField.name"
            defaultMessage="Field"
          />
        </strong>
      </EuiText>
    </EuiTableHeaderCell>,
    <EuiTableHeaderCell key="header-cell-value" align="left" isSorted={false}>
      <EuiText size="xs">
        <strong>
          <FormattedMessage
            id="unifiedDocViewer.fieldChooser.discoverField.value"
            defaultMessage="Value"
          />
        </strong>
      </EuiText>
    </EuiTableHeaderCell>,
  ];

  const renderRows = useCallback(
    (items: FieldRecord[]) => {
      return items.map(
        ({
          action: { flattenedField, onFilter },
          field: { field, fieldMapping, fieldType, scripted, pinned },
          value: { formattedValue, ignored },
        }: FieldRecord) => {
          return (
            <EuiTableRow key={field} className="kbnDocViewer__tableRow" isSelected={pinned}>
              {!hideActionsColumn && (
                <EuiTableRowCell
                  key={field + '-actions'}
                  align={showActionsInsideTableCell ? 'left' : 'center'}
                  width={showActionsInsideTableCell ? undefined : 62}
                  className="kbnDocViewer__tableActionsCell"
                  textOnly={false}
                  mobileOptions={MOBILE_OPTIONS}
                >
                  <TableActions
                    mode={showActionsInsideTableCell ? 'inline' : 'as_popover'}
                    field={field}
                    pinned={pinned}
                    fieldMapping={fieldMapping}
                    flattenedField={flattenedField}
                    onFilter={onFilter}
                    onToggleColumn={onToggleColumn}
                    ignoredValue={!!ignored}
                    onTogglePinned={onTogglePinned}
                  />
                </EuiTableRowCell>
              )}
              <EuiTableRowCell
                key={field + '-field-name'}
                align="left"
                width="30%"
                className="kbnDocViewer__tableFieldNameCell"
                textOnly={false}
                mobileOptions={MOBILE_OPTIONS}
              >
                <FieldName
                  fieldName={field}
                  fieldType={fieldType}
                  fieldMapping={fieldMapping}
                  scripted={scripted}
                  highlight={getFieldSearchMatchingHighlight(
                    fieldMapping?.displayName ?? field,
                    searchText
                  )}
                  useEcsInfo={containsEcsFields(dataView.getFieldByName.bind(dataView))}
                />
              </EuiTableRowCell>
              <EuiTableRowCell
                key={field + '-value'}
                align="left"
                className="kbnDocViewer__tableValueCell"
                textOnly={false}
                mobileOptions={MOBILE_OPTIONS}
              >
                <TableFieldValue
                  field={field}
                  formattedValue={formattedValue}
                  rawValue={flattenedField}
                  ignoreReason={ignored}
                />
              </EuiTableRowCell>
            </EuiTableRow>
          );
        }
      );
    },
    [
      hideActionsColumn,
      showActionsInsideTableCell,
      onToggleColumn,
      onTogglePinned,
      searchText,
      dataView,
    ]
  );

  const rowElements = [
    ...renderRows(pinnedItems),
    ...renderRows(restItems.slice(startIndex, pageSize + startIndex)),
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
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

      {rowElements.length === 0 ? (
        <EuiSelectableMessage style={{ minHeight: 300 }}>
          <p>
            <EuiI18n
              token="unifiedDocViewer.docViews.table.noFieldFound"
              default="No fields found"
            />
          </p>
        </EuiSelectableMessage>
      ) : (
        <EuiFlexItem grow={false}>
          <EuiTable responsive={false}>
            <EuiTableHeader>{headers}</EuiTableHeader>
            <EuiTableBody>{rowElements}</EuiTableBody>
          </EuiTable>
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiSpacer size="m" />
      </EuiFlexItem>

      {showPagination && (
        <EuiFlexItem grow={false}>
          <EuiTablePagination
            activePage={curPageIndex}
            itemsPerPage={pageSize}
            itemsPerPageOptions={PAGE_SIZE_OPTIONS}
            pageCount={totalPages}
            onChangeItemsPerPage={onChangePageSize}
            onChangePage={changePageIndex}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
