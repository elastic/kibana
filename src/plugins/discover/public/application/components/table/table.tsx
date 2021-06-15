/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import './table.scss';
import { EuiBasicTableColumn, EuiInMemoryTable } from '@elastic/eui';
import { IndexPattern, IndexPatternField } from '../../../../../data/public';
import { isNestedFieldParent } from '../../apps/main/utils/nested_fields';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';
import { FieldName } from '../field_name/field_name';
import { TableActions } from './table_actions_cell';
import { TableFieldValue } from './table_value_cell';

interface DocViewerTableProps {
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

const TABLE_ROW_PROPS = { className: 'docView__TableRow' };

const DOC_VIEW_COLUMNS: Array<EuiBasicTableColumn<FieldRecord>> = [
  {
    field: 'action',
    name: 'Action',
    width: '100px',
    sortable: false,
    render: (
      { flattenedField, isActive, onFilter, onToggleColumn }: FieldRecord['action'],
      { field: { fieldName, fieldMapping }, value: { formattedField } }: FieldRecord
    ) => {
      return (
        onFilter && (
          <TableActions
            isActive={isActive}
            fieldName={fieldName}
            fieldMapping={fieldMapping}
            formattedField={formattedField}
            flattenedField={flattenedField}
            onFilter={onFilter}
            onToggleColumn={onToggleColumn}
          />
        )
      );
    },
  },
  {
    field: 'field',
    name: 'Field',
    sortable: true,
    render: ({ fieldName, fieldType, fieldMapping, scripted }: FieldRecord['field']) => {
      return (
        <FieldName
          fieldName={fieldName}
          fieldType={fieldType}
          fieldMapping={fieldMapping}
          scripted={scripted}
          className="docView__fieldNameCell"
        />
      );
    },
  },
  {
    field: 'value',
    name: 'Value',
    truncateText: false,
    render: (
      { formattedField }: FieldRecord['value'],
      { field: { fieldName, fieldMapping } }: FieldRecord
    ) => {
      return (
        <TableFieldValue
          formattedField={formattedField}
          fieldName={fieldName}
          fieldMapping={fieldMapping}
        />
      );
    },
  },
];

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
      const fieldType = isNestedFieldParent(fieldName, indexPattern)
        ? 'nested'
        : indexPattern.fields.getByName(fieldName)?.type;
      const fieldMapping = mapping(fieldName);
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
      className="docViewTable"
      items={items}
      columns={DOC_VIEW_COLUMNS}
      pagination={true}
      rowProps={TABLE_ROW_PROPS}
    />
  );
};
