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
import { escapeRegExp } from 'lodash';
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
            const isArrayOfObjects =
              Array.isArray(flattened[field]) && arrayContainsObjects(flattened[field]);
            const displayUnderscoreWarning = !mapping(field) && field.indexOf('_') === 0;
            const displayNoMappingWarning =
              !mapping(field) && !displayUnderscoreWarning && !isArrayOfObjects;

            // Discover doesn't flatten arrays of objects, so for documents with an `object` or `nested` field that
            // contains an array, Discover will only detect the top level root field. We want to detect when those
            // root fields are `nested` so that we can display the proper icon and label. However, those root
            // `nested` fields are not a part of the index pattern. Their children are though, and contain nested path
            // info. So to detect nested fields we look through the index pattern for nested children
            // whose path begins with the current field. There are edge cases where
            // this could incorrectly identify a plain `object` field as `nested`. Say we had the following document
            // where `foo` is a plain object field and `bar` is a nested field.
            // {
            //   "foo": [
            //   {
            //     "bar": [
            //       {
            //         "baz": "qux"
            //       }
            //     ]
            //   },
            //   {
            //     "bar": [
            //       {
            //         "baz": "qux"
            //       }
            //     ]
            //   }
            // ]
            // }
            //
            // The following code will search for `foo`, find it at the beginning of the path to the nested child field
            // `foo.bar.baz` and incorrectly mark `foo` as nested. Any time we're searching for the name of a plain object
            // field that happens to match a segment of a nested path, we'll get a false positive.
            // We're aware of this issue and we'll have to live with
            // it in the short term. The long term fix will be to add info about the `nested` and `object` root fields
            // to the index pattern, but that has its own complications which you can read more about in the following
            // issue: https://github.com/elastic/kibana/issues/54957
            const isNestedField =
              !indexPattern.fields.getByName(field) &&
              !!indexPattern.fields.getAll().find((patternField) => {
                // We only want to match a full path segment
                const nestedRootRegex = new RegExp(escapeRegExp(field) + '(\\.|$)');
                return nestedRootRegex.test(patternField.subType?.nested?.path ?? '');
              });
            const fieldType = isNestedField ? 'nested' : indexPattern.fields.getByName(field)?.type;

            return (
              <DocViewTableRow
                key={field}
                field={field}
                fieldMapping={mapping(field)}
                fieldType={String(fieldType)}
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
