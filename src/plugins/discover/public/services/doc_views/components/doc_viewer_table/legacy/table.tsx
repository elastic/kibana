/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import '../table.scss';
import React, { useCallback, useMemo } from 'react';
import { EuiInMemoryTable } from '@elastic/eui';
import { getTypeForFieldIcon } from '../../../../../utils/get_type_for_field_icon';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';
import { SHOW_MULTIFIELDS } from '../../../../../../common';
import { DocViewRenderProps, FieldRecordLegacy } from '../../../doc_views_types';
import { ACTIONS_COLUMN, MAIN_COLUMNS } from './table_columns';
import { getFieldsToShow } from '../../../../../utils/get_fields_to_show';
import { getIgnoredReason } from '../../../../../utils/get_ignored_reason';
import { formatFieldValue } from '../../../../../utils/format_value';
import { isNestedFieldParent } from '../../../../../application/main/utils/nested_fields';

export const DocViewerLegacyTable = ({
  columns,
  hit,
  dataView,
  filter,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) => {
  const { fieldFormats, uiSettings } = useDiscoverServices();
  const showMultiFields = useMemo(() => uiSettings.get(SHOW_MULTIFIELDS), [uiSettings]);

  const mapping = useCallback((name: string) => dataView.fields.getByName(name), [dataView.fields]);
  const tableColumns = useMemo(() => {
    return filter ? [ACTIONS_COLUMN, ...MAIN_COLUMNS] : MAIN_COLUMNS;
  }, [filter]);
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

  const onSetRowProps = useCallback(({ field: { field } }: FieldRecordLegacy) => {
    return {
      key: field,
      className: 'kbnDocViewer__tableRow',
      'data-test-subj': `tableDocViewRow-${field}`,
    };
  }, []);

  const fieldsToShow = getFieldsToShow(Object.keys(hit.flattened), dataView, showMultiFields);

  const items: FieldRecordLegacy[] = Object.keys(hit.flattened)
    .filter((fieldName) => {
      return fieldsToShow.includes(fieldName);
    })
    .sort((fieldA, fieldB) => {
      const mappingA = mapping(fieldA);
      const mappingB = mapping(fieldB);
      const nameA = !mappingA || !mappingA.displayName ? fieldA : mappingA.displayName;
      const nameB = !mappingB || !mappingB.displayName ? fieldB : mappingB.displayName;
      return nameA.localeCompare(nameB);
    })
    .map((field) => {
      const fieldMapping = mapping(field);
      const displayName = fieldMapping?.displayName ?? field;
      const fieldType = isNestedFieldParent(field, dataView)
        ? 'nested'
        : fieldMapping
        ? getTypeForFieldIcon(fieldMapping)
        : undefined;
      const ignored = getIgnoredReason(fieldMapping ?? field, hit.raw._ignored);
      return {
        action: {
          onToggleColumn,
          onFilter: filter,
          isActive: !!columns?.includes(field),
          flattenedField: hit.flattened[field],
        },
        field: {
          field,
          displayName,
          fieldMapping,
          fieldType,
          scripted: Boolean(fieldMapping?.scripted),
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
    });

  return (
    <EuiInMemoryTable
      tableLayout="auto"
      className="kbnDocViewer__table"
      items={items}
      columns={tableColumns}
      rowProps={onSetRowProps}
      pagination={false}
      responsive={false}
    />
  );
};
