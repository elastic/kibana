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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { debounce } from 'lodash';
import { Storage } from '../../../../../../kibana_utils/public';
import { usePager } from '../../../../utils/use_pager';
import { FieldName } from '../../../../components/field_name/field_name';
import { flattenHit } from '../../../../../../data/common';
import { SHOW_MULTIFIELDS } from '../../../../../common';
import { getServices } from '../../../../kibana_services';
import { DocViewRenderProps, FieldRecordLegacy } from '../../doc_views_types';
import { getFieldsToShow } from '../../../../utils/get_fields_to_show';
import { getIgnoredReason } from '../../../../utils/get_ignored_reason';
import { formatFieldValue } from '../../../../utils/format_value';
import { isNestedFieldParent } from '../../../../application/main/utils/nested_fields';
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

interface BrowseFieldsState {
  searchField?: string;
  pinnedFields?: string[];
  pageSize?: number;
}

const MOBILE_OPTIONS = { header: false };
const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
const BROWSE_FIELDS_STATE_KEY = 'discover:browseFieldsState';

const validatePageSize = (pageSize?: number) => {
  return pageSize && PAGE_SIZE_OPTIONS.includes(pageSize);
};

const getAllBrowseFieldsStates = (
  storage: Storage
): Record<string, BrowseFieldsState | undefined> => {
  try {
    const browseFieldsState = storage.get(BROWSE_FIELDS_STATE_KEY);
    return (browseFieldsState && JSON.parse(browseFieldsState)) || {};
  } catch {
    return {};
  }
};

const setBrowseFieldsState = (
  newState: BrowseFieldsState,
  dataViewId: string,
  storage: Storage
) => {
  const entry = getAllBrowseFieldsStates(storage);
  const prev = entry[dataViewId] || {};

  const newBrowseFieldsState = Object.assign(prev, newState);
  const newBrowseFieldsStateEntry = Object.assign(entry, {
    [dataViewId]: newBrowseFieldsState,
  });
  storage.set(BROWSE_FIELDS_STATE_KEY, JSON.stringify(newBrowseFieldsStateEntry));
};

const saveFieldSearchOptimized = debounce(
  (searchField: string, dataView: string, storage: Storage) =>
    setBrowseFieldsState({ searchField }, dataView, storage),
  500
);

export const DocViewerTable = ({
  columns,
  hit,
  indexPattern: dataView,
  filter,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) => {
  const { storage, uiSettings } = getServices();
  const showMultiFields = uiSettings.get(SHOW_MULTIFIELDS);
  const currentDataViewId = dataView.id!;
  const isSingleDocView = !filter;

  const {
    searchField: initialSearchField,
    pinnedFields: initialPinnedFields,
    pageSize: initialPageSize,
  }: Required<BrowseFieldsState> = useMemo(() => {
    const state = getAllBrowseFieldsStates(storage)[currentDataViewId] || {};
    return {
      pinnedFields: isSingleDocView ? [] : state.pinnedFields || [],
      searchField: state.searchField || '',
      pageSize: (validatePageSize(state.pageSize) && state.pageSize) || DEFAULT_PAGE_SIZE,
    };
  }, [storage, currentDataViewId, isSingleDocView]);
  const [searchField, setSearchField] = useState(initialSearchField);
  const [pinnedFields, setPinnedFields] = useState<string[]>(initialPinnedFields);

  const flattened = flattenHit(hit, dataView, { source: true, includeIgnoredValues: true });
  const fieldsToShow = getFieldsToShow(Object.keys(flattened), dataView, showMultiFields);

  const searchPlaceholder = i18n.translate('discover.docView.table.searchPlaceHolder', {
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

      setBrowseFieldsState({ pinnedFields: newPinned }, currentDataViewId, storage);
      setPinnedFields(newPinned);
    },
    [currentDataViewId, pinnedFields, storage]
  );

  const fieldToItem = useCallback(
    (field: string) => {
      const fieldMapping = mapping(field);
      const displayName = fieldMapping?.displayName ?? field;
      const fieldType = isNestedFieldParent(field, dataView) ? 'nested' : fieldMapping?.type;

      const ignored = getIgnoredReason(fieldMapping ?? field, hit._ignored);

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
          formattedValue: formatFieldValue(flattened[field], hit, dataView, fieldMapping),
          ignored,
        },
      };
    },
    [
      columns,
      filter,
      flattened,
      hit,
      dataView,
      mapping,
      onToggleColumn,
      onTogglePinned,
      pinnedFields,
    ]
  );

  const handleOnChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newSearchField = event.currentTarget.value;
      saveFieldSearchOptimized(newSearchField, currentDataViewId, storage);
      setSearchField(newSearchField);
    },
    [currentDataViewId, storage]
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
        if (!fieldsToShow.includes(curFieldName)) {
          return acc;
        }

        if (pinnedFields.includes(curFieldName)) {
          acc.pinnedItems.push(fieldToItem(curFieldName));
        } else {
          const fieldMapping = mapping(curFieldName);
          const displayName = fieldMapping?.displayName ?? curFieldName;
          if (displayName.includes(searchField)) {
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
      initialPageSize,
      totalItems: restItems.length,
    });
  const showPagination = totalPages !== 0;

  const onChangePageSize = useCallback(
    (newPageSize: number) => {
      setBrowseFieldsState({ pageSize: newPageSize }, currentDataViewId, storage);
      changePageSize(newPageSize);
    },
    [changePageSize, currentDataViewId, storage]
  );

  const headers = [
    !isSingleDocView && (
      <EuiTableHeaderCell align="left" width={62} isSorted={false}>
        <EuiText size="xs">
          <strong>
            <FormattedMessage
              id="discover.fieldChooser.discoverField.actions"
              defaultMessage="Actions"
            />
          </strong>
        </EuiText>
      </EuiTableHeaderCell>
    ),
    <EuiTableHeaderCell align="left" width="30%" isSorted={false}>
      <EuiText size="xs">
        <strong>
          <FormattedMessage id="discover.fieldChooser.discoverField.name" defaultMessage="Field" />
        </strong>
      </EuiText>
    </EuiTableHeaderCell>,
    <EuiTableHeaderCell align="left" isSorted={false}>
      <EuiText size="xs">
        <strong>
          <FormattedMessage id="discover.fieldChooser.discoverField.value" defaultMessage="Value" />
        </strong>
      </EuiText>
    </EuiTableHeaderCell>,
  ];

  const renderRows = useCallback(
    (items: FieldRecord[]) => {
      return items.map(
        ({
          action: { flattenedField, onFilter },
          field: { field, fieldMapping, displayName, fieldType, scripted, pinned },
          value: { formattedValue, ignored },
        }: FieldRecord) => {
          return (
            <EuiTableRow key={field} className="kbnDocViewer__tableRow" isSelected={pinned}>
              {!isSingleDocView && (
                <EuiTableRowCell
                  key={field + '-actions'}
                  align="center"
                  width={62}
                  className="kbnDocViewer__tableActionsCell"
                  textOnly={false}
                  mobileOptions={MOBILE_OPTIONS}
                >
                  <TableActions
                    field={field}
                    pinned={pinned}
                    fieldMapping={fieldMapping}
                    flattenedField={flattenedField}
                    onFilter={onFilter!}
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
                  fieldName={displayName}
                  fieldType={fieldType}
                  fieldMapping={fieldMapping}
                  scripted={scripted}
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
    [onToggleColumn, onTogglePinned, isSingleDocView]
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
          value={searchField}
        />
      </EuiFlexItem>

      {rowElements.length === 0 ? (
        <EuiSelectableMessage style={{ minHeight: 300 }}>
          <p>
            <EuiI18n token="discover.docViews.table.noFieldFound" default="No fields found" />
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
