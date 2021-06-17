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
import { isNestedFieldParent } from '../../apps/main/utils/nested_fields';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';
import { DOC_VIEW_COLUMNS } from './table_columns';

export interface DocViewerTableProps {
  columns?: string[];
  filter?: DocViewFilterFn;
  hit: ElasticSearchHit;
  indexPattern?: IndexPattern;
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
    fieldName: string;
    fieldType: string;
    fieldMapping: IndexPatternField | undefined;
    scripted: boolean;
  };
  value: {
    formattedField: unknown;
  };
}

const PAGINATION = { pageSize: 50 };

export const DocViewerTable = ({
  columns,
  hit,
  indexPattern,
  filter,
  onAddColumn,
  onRemoveColumn,
}: DocViewerTableProps) => {
  const mapping = useCallback((name) => indexPattern?.fields.getByName(name), [
    indexPattern?.fields,
  ]);

  const formattedHit = useMemo(() => indexPattern?.formatHit(hit, 'html'), [hit, indexPattern]);

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

  const onSetRowProps = useCallback(({ field: { fieldName } }: FieldRecord) => {
    return {
      className: 'kbnDocViewer_tableRow',
      'data-test-subj': `tableDocViewRow-${fieldName}`,
    };
  }, []);

  if (!indexPattern) {
    return null;
  }

  const flattened = indexPattern.flattenHit(hit);
  const items: FieldRecord[] = Object.keys(flattened)
    .sort((fieldA, fieldB) => {
      const mappingA = mapping(fieldA);
      const mappingB = mapping(fieldB);
      const nameA = !mappingA || !mappingA.displayName ? fieldA : mappingA.displayName;
      const nameB = !mappingB || !mappingB.displayName ? fieldB : mappingB.displayName;
      return nameA.localeCompare(nameB);
    })
    .map((fieldName) => {
      const fieldMapping = mapping(fieldName);
      const fieldType = isNestedFieldParent(fieldName, indexPattern)
        ? 'nested'
        : fieldMapping?.type;

      return {
        action: {
          onToggleColumn,
          onFilter: filter,
          isActive: !!columns?.includes(fieldName),
          flattenedField: flattened[fieldName],
        },
        field: {
          fieldName,
          fieldType: fieldType!,
          scripted: Boolean(fieldMapping?.scripted),
          fieldMapping,
        },
        value: { formattedField: formattedHit[fieldName] },
      };
    });

  return (
    <EuiInMemoryTable
      items={items}
      columns={DOC_VIEW_COLUMNS}
      pagination={PAGINATION}
      rowProps={onSetRowProps}
    />
  );
};
