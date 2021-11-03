/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiInMemoryTable } from '@elastic/eui';
import { IndexPattern, IndexPatternField } from '../../../../../data/public';
import { flattenHit } from '../../../../../data/common';
import { SHOW_MULTIFIELDS } from '../../../../common';
import { getServices } from '../../../kibana_services';
import { isNestedFieldParent } from '../../apps/main/utils/nested_fields';
import {
  DocViewFilterFn,
  ElasticSearchHit,
  DocViewRenderProps,
} from '../../doc_views/doc_views_types';
import { ACTIONS_COLUMN, MAIN_COLUMNS } from './table_columns';
import { getFieldsToShow } from '../../helpers/get_fields_to_show';
import { getIgnoredReason, IgnoredReason } from '../../helpers/get_ignored_reason';
import { formatFieldValue } from '../../helpers/format_value';

export interface DocViewerTableProps {
  columns?: string[];
  filter?: DocViewFilterFn;
  hit: ElasticSearchHit;
  indexPattern: IndexPattern;
  onAddColumn?: (columnName: string) => void;
  onRemoveColumn?: (columnName: string) => void;
}

export interface FieldRecord {
  action: {
    isActive: boolean;
    onFilter?: DocViewFilterFn;
    onToggleColumn: (field: string) => void;
    flattenedField: unknown;
  };
  field: {
    displayName: string;
    field: string;
    scripted: boolean;
    fieldType?: string;
    fieldMapping?: IndexPatternField;
  };
  value: {
    formattedValue: string;
    ignored?: IgnoredReason;
  };
}

export const DocViewerTable = ({
  columns,
  hit,
  indexPattern,
  filter,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) => {
  const showMultiFields = getServices().uiSettings.get(SHOW_MULTIFIELDS);

  const mapping = useCallback(
    (name: string) => indexPattern?.fields.getByName(name),
    [indexPattern?.fields]
  );

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

  const onSetRowProps = useCallback(({ field: { field } }: FieldRecord) => {
    return {
      key: field,
      className: 'kbnDocViewer__tableRow',
      'data-test-subj': `tableDocViewRow-${field}`,
    };
  }, []);

  if (!indexPattern) {
    return null;
  }

  const flattened = flattenHit(hit, indexPattern, { source: true, includeIgnoredValues: true });
  const fieldsToShow = getFieldsToShow(Object.keys(flattened), indexPattern, showMultiFields);

  const items: FieldRecord[] = Object.keys(flattened)
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
        },
        value: {
          formattedValue: formatFieldValue(flattened[field], hit, indexPattern, fieldMapping),
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

// Required for usage in React.lazy
// eslint-disable-next-line import/no-default-export
export default DocViewerTable;
