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
import { getFieldIconType } from '@kbn/field-utils/src/utils/get_field_icon_type';
import {
  SHOW_MULTIFIELDS,
  formatFieldValue,
  getIgnoredReason,
  getShouldShowFieldHandler,
  isNestedFieldParent,
} from '@kbn/discover-utils';
import type { DocViewRenderProps, FieldRecordLegacy } from '@kbn/unified-doc-viewer/types';
import { getUnifiedDocViewerServices } from '../../../plugin';
import { ACTIONS_COLUMN, MAIN_COLUMNS } from './table_columns';

export const DocViewerLegacyTable = ({
  columns,
  hit,
  dataView,
  hideActionsColumn,
  filter,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) => {
  const { fieldFormats, uiSettings } = getUnifiedDocViewerServices();
  const showMultiFields = useMemo(() => uiSettings.get(SHOW_MULTIFIELDS), [uiSettings]);

  const mapping = useCallback((name: string) => dataView.fields.getByName(name), [dataView.fields]);
  const tableColumns = useMemo(() => {
    return !hideActionsColumn ? [ACTIONS_COLUMN, ...MAIN_COLUMNS] : MAIN_COLUMNS;
  }, [hideActionsColumn]);

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
      responsiveBreakpoint={false}
    />
  );
};
