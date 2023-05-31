/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './table.scss';
import React, { useCallback, useMemo } from 'react';
import { EuiInMemoryTable } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/common';
import { getFieldIconType } from '@kbn/unified-field-list-plugin/public';
import { getShouldShowFieldHandler } from '@kbn/unified-discover';
import { formatFieldValue, DataTableRecord } from '@kbn/unified-discover';
import { getIgnoredReason, isNestedFieldParent } from '@kbn/unified-doc-viewer/src';
import type { DocViewFilterFn, FieldRecordLegacy } from '@kbn/unified-doc-viewer/src/types';
import { useUnifiedDocViewerServices } from '@kbn/unified-doc-viewer/../../hooks';
import { ACTIONS_COLUMN, MAIN_COLUMNS } from './table_columns';

export interface DocViewRenderProps {
  hit: DataTableRecord;
  dataView: DataView;
  columns?: string[];
  filter?: DocViewFilterFn;
  onAddColumn?: (columnName: string) => void;
  onRemoveColumn?: (columnName: string) => void;
}

export const DocViewerTableLegacy = ({
  dataView,
  hit,
  columns,
  onRemoveColumn,
  onAddColumn,
  filter,
}: DocViewRenderProps) => {
  const { fieldFormats, uiSettings } = useUnifiedDocViewerServices();

  // TODO: Replace this constant
  const showMultiFields = useMemo(() => uiSettings.get('discover:showMultiFields'), [uiSettings]);

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
