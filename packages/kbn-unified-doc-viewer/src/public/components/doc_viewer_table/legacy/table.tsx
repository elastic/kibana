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
import { getFieldIconType } from '@kbn/unified-field-list-plugin/public';
import { useDiscoverServices } from '@kbn/discover-plugin/public/hooks/use_discover_services';
import { SHOW_MULTIFIELDS } from '@kbn/discover-plugin/common';
import {
  DocViewRenderProps,
  FieldRecordLegacy,
} from '@kbn/discover-plugin/public/services/doc_views/doc_views_types';
import { getShouldShowFieldHandler } from '@kbn/discover-plugin/public/utils/get_should_show_field_handler';
import { isNestedFieldParent } from '@kbn/discover-plugin/public/application/main/utils/nested_fields';
import { getIgnoredReason } from '@kbn/discover-plugin/public/utils/get_ignored_reason';
import { formatFieldValue } from '@kbn/discover-plugin/public/utils/format_value';
import { ACTIONS_COLUMN, MAIN_COLUMNS } from './table_columns';

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

  const shouldShowFieldHandler = useMemo(
    () => getShouldShowFieldHandler(Object.keys(hit.flattened), dataView, showMultiFields),
    [hit.flattened, dataView, showMultiFields]
  );

  const items: FieldRecordLegacy[] = Object.keys(hit.flattened)
    .filter(shouldShowFieldHandler)
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
        ? getFieldIconType(fieldMapping)
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
