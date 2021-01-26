/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useState } from 'react';
import { DocViewTableRow } from './table_row';
import { trimAngularSpan } from './table_helper';
import { isNestedFieldParent } from '../../helpers/nested_fields';
import { DocViewRenderProps } from '../../doc_views/doc_views_types';

const COLLAPSE_LINE_LENGTH = 350;

export function DocViewTable({
  hit,
  indexPattern,
  filter,
  columns,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) {
  const [fieldRowOpen, setFieldRowOpen] = useState({} as Record<string, boolean>);
  if (!indexPattern) {
    return null;
  }
  const mapping = indexPattern.fields.getByName;
  const flattened = indexPattern.flattenHit(hit);
  const formatted = indexPattern.formatHit(hit, 'html');

  function toggleValueCollapse(field: string) {
    fieldRowOpen[field] = !fieldRowOpen[field];
    setFieldRowOpen({ ...fieldRowOpen });
  }

  return (
    <table className="table table-condensed kbnDocViewerTable">
      <tbody>
        {Object.keys(flattened)
          .sort((fieldA, fieldB) => {
            const mappingA = mapping(fieldA);
            const mappingB = mapping(fieldB);
            const nameA = !mappingA || !mappingA.displayName ? fieldA : mappingA.displayName;
            const nameB = !mappingB || !mappingB.displayName ? fieldB : mappingB.displayName;
            return nameA.localeCompare(nameB);
          })
          .map((field) => {
            const valueRaw = flattened[field];
            const value = trimAngularSpan(String(formatted[field]));

            const isCollapsible = value.length > COLLAPSE_LINE_LENGTH;
            const isCollapsed = isCollapsible && !fieldRowOpen[field];
            const toggleColumn =
              onRemoveColumn && onAddColumn && Array.isArray(columns)
                ? () => {
                    if (columns.includes(field)) {
                      onRemoveColumn(field);
                    } else {
                      onAddColumn(field);
                    }
                  }
                : undefined;
            const displayUnderscoreWarning = !mapping(field) && field.indexOf('_') === 0;

            const fieldType = isNestedFieldParent(field, indexPattern)
              ? 'nested'
              : indexPattern.fields.getByName(field)?.type;

            return (
              <DocViewTableRow
                key={field}
                field={field}
                fieldMapping={mapping(field)}
                fieldType={String(fieldType)}
                displayUnderscoreWarning={displayUnderscoreWarning}
                isCollapsed={isCollapsed}
                isCollapsible={isCollapsible}
                isColumnActive={Array.isArray(columns) && columns.includes(field)}
                onFilter={filter}
                onToggleCollapse={() => toggleValueCollapse(field)}
                onToggleColumn={toggleColumn}
                value={value}
                valueRaw={valueRaw}
              />
            );
          })}
      </tbody>
    </table>
  );
}
