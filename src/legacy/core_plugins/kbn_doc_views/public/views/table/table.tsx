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
import { DocViewRenderProps } from 'ui/registry/doc_views';
import { DocViewTableRow } from './table_row';


const COLLAPSE_LINE_LENGTH = 350;

export function DocViewTable({
  hit,
  indexPattern,
  filter,
  columns,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) {
  const mapping = indexPattern.fields.byName;
  const flattened = indexPattern.flattenHit(hit);
  const formatted = indexPattern.formatHit(hit, 'text');
  const [fieldRowOpen, setFieldRowOpen] = useState({} as Record<string, boolean>);

  function toggleValueCollapse(field: string) {
    fieldRowOpen[field] = fieldRowOpen[field] !== true;
    setFieldRowOpen({ ...fieldRowOpen });
  }

  const toggleColumn = (columnName: string) => {
    if (columns.includes(columnName)) {
      onRemoveColumn(columnName);
    } else {
      onAddColumn(columnName);
    }
  };
  // the formatting of array of objects with formatHit is optimzed for angular
  // and since it's still in use in other places, we do some local formatting here
  const formatValue = (field: string) => {
    const value = flattened[field];
    if (Array.isArray(value) && value.every(v => typeof v !== 'object')) {
      return value.join(', ');
    } else if (Array.isArray(value)) {
      return value.map(v => JSON.stringify(v, null, 2)).join('\n');
    } else if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    } else {
      return typeof formatted[field] === 'undefined' ? value : formatted[field];
    }
  };

  return (
    <table className="table table-condensed">
      <tbody>
        {Object.keys(flattened)
          .sort()
          .map(field => {
            const value = formatValue(field);
            const isCollapsible = value.length > COLLAPSE_LINE_LENGTH;
            const isCollapsed = isCollapsible && !fieldRowOpen[field];

            return (
              <DocViewTableRow
                key={field}
                field={field}
                fieldMapping={mapping[field]}
                isCollapsed={isCollapsed}
                isCollapsible={value.length > COLLAPSE_LINE_LENGTH}
                isColumnActive={columns && columns.includes(field)}
                isMetaField={indexPattern.metaFields.includes(field)}
                onFilter={filter}
                onToggleCollapse={() => toggleValueCollapse(field)}
                onToggleColumn={() => toggleColumn(field)}
                value={value}
                valueRaw={flattened[field]}
              />
            );
          })}
      </tbody>
    </table>
  );
}
