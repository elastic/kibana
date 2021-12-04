/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './table.scss';
import React, { useCallback, useState } from 'react';
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
import { TableActions } from './table_actions';
import { TableFieldValue } from './table_cell_value';

export interface FieldRecord extends FieldRecordLegacy {
  field: {
    pinned: boolean;
    onTogglePinned: (field: string) => void;
  } & FieldRecordLegacy['field'];
}

interface ItemsEntry {
  pinnedItems: FieldRecord[];
  restItems: FieldRecord[];
}

const MOBILE_OPTIONS = { header: false };
const PINNED_FIELDS_KEY = 'discover:pinnedFields';

export const DocViewerTable = ({
  columns,
  hit,
  indexPattern,
  filter,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) => {
  const [query, setQuery] = useState('');
  const { storage, uiSettings } = getServices();
  const showMultiFields = uiSettings.get(SHOW_MULTIFIELDS);
  const storedPinnedFields = storage.get(PINNED_FIELDS_KEY);
  const [pinnedFields, setPinnedFields] = useState<string[]>(
    (storedPinnedFields && JSON.parse(storedPinnedFields)[indexPattern.id!]) || []
  );
  const flattened = flattenHit(hit, indexPattern, { source: true, includeIgnoredValues: true });
  const fieldsToShow = getFieldsToShow(Object.keys(flattened), indexPattern, showMultiFields);
  const showActionsColumn = !!filter;

  const searchPlaceholder = i18n.translate('discover.docView.table.searchPlaceHolder', {
    defaultMessage: 'Search field names',
  });

  const mapping = useCallback(
    (name: string) => indexPattern?.fields.getByName(name),
    [indexPattern?.fields]
  );

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

      const curStoredPinnedFields = storage.get(PINNED_FIELDS_KEY);
      const newStoredPinnedFields = Object.assign(
        (curStoredPinnedFields && JSON.parse(curStoredPinnedFields)) || {},
        {
          [indexPattern.id!]: newPinned,
        }
      );
      storage.set(PINNED_FIELDS_KEY, JSON.stringify(newStoredPinnedFields));
      setPinnedFields(newPinned);
    },
    [indexPattern.id, pinnedFields, storage]
  );

  const fieldToItem = useCallback(
    (field: string) => {
      const fieldMapping = mapping(field);
      const displayName = fieldMapping?.displayName ?? field;
      const fieldType = isNestedFieldParent(field, indexPattern) ? 'nested' : fieldMapping?.type;

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
          formattedValue: formatFieldValue(flattened[field], hit, indexPattern, fieldMapping),
          ignored,
        },
      };
    },
    [
      columns,
      filter,
      flattened,
      hit,
      indexPattern,
      mapping,
      onToggleColumn,
      onTogglePinned,
      pinnedFields,
    ]
  );

  const handleOnChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.currentTarget.value);
  }, []);

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
          if (displayName.includes(query)) {
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
      initialPageSize: 25,
      totalItems: restItems.length,
    });
  const showPagination = totalPages !== 0;

  const headers = [
    showActionsColumn && (
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
          action: { flattenedField, isActive, onFilter },
          field: { field, fieldMapping, displayName, fieldType, scripted, pinned },
          value: { formattedValue, ignored },
        }: FieldRecord) => {
          return (
            <EuiTableRow key={field} className="kbnDocViewer__tableRow" isSelected={pinned}>
              {showActionsColumn && (
                <EuiTableRowCell
                  key={field + '-actions'}
                  align="center"
                  width={62}
                  className="kbnDocViewer__tableActionsCell"
                  textOnly={false}
                  mobileOptions={MOBILE_OPTIONS}
                >
                  <TableActions
                    isActive={isActive}
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
    [onToggleColumn, onTogglePinned, showActionsColumn]
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
          value={query}
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
            itemsPerPageOptions={[25, 50, 100]}
            pageCount={totalPages}
            onChangeItemsPerPage={changePageSize}
            onChangePage={changePageIndex}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
