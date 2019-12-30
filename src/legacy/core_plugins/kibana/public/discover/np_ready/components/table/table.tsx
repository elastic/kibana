/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useState } from 'react';
import { DocViewTableRow } from './table_row';
import { arrayContainsObjects, trimAngularSpan } from './table_helper';
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
  const mapping = indexPattern.fields.getByName;
  const flattened = indexPattern.flattenHit(hit);
  const formatted = indexPattern.formatHit(hit, 'html');
  const [fieldRowOpen, setFieldRowOpen] = useState({} as Record<string, boolean>);

  function toggleValueCollapse(field: string) {
    fieldRowOpen[field] = fieldRowOpen[field] !== true;
    setFieldRowOpen({ ...fieldRowOpen });
  }

  return (
    <table className="table table-condensed kbnDocViewerTable">
      <tbody>
        {Object.keys(flattened)
          .sort()
          .map(field => {
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
            const isArrayOfObjects =
              Array.isArray(flattened[field]) && arrayContainsObjects(flattened[field]);
            const displayUnderscoreWarning = !mapping(field) && field.indexOf('_') === 0;
            const displayNoMappingWarning =
              !mapping(field) && !displayUnderscoreWarning && !isArrayOfObjects;

            return (
              <DocViewTableRow
                key={field}
                field={field}
                fieldMapping={mapping(field)}
                displayUnderscoreWarning={displayUnderscoreWarning}
                displayNoMappingWarning={displayNoMappingWarning}
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
