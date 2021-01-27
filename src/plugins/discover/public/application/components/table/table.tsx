/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
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
  const [multiFields, setMultiFields] = useState({} as Record<string, string[]>);
  const [fieldsWithParents, setFieldsWithParents] = useState([] as string[]);

  useEffect(() => {
    if (!indexPattern) {
      return;
    }
    const mapping = indexPattern.fields.getByName;
    const flattened = indexPattern.flattenHit(hit);
    const map: Record<string, string[]> = {};
    const arr: string[] = [];

    Object.keys(flattened).forEach((key) => {
      const field = mapping(key);

      if (field && field.spec?.subType?.multi?.parent) {
        const parent = field.spec.subType.multi.parent;
        if (!map[parent]) {
          map[parent] = [] as string[];
        }
        const value = map[parent];
        value.push(key);
        map[parent] = value;
        arr.push(key);
      }
    });
    setMultiFields(map);
    setFieldsWithParents(arr);
  }, [indexPattern, hit]);

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
          .filter((field) => {
            return !fieldsWithParents.includes(field);
          })
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
              <React.Fragment>
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
                {multiFields[field] ? (
                  <tr
                    key={`tableDocViewRow-multifieldsTitle-${field}`}
                    className="kbnDocViewer__multifield_row"
                    data-test-subj={`tableDocViewRow-multifieldsTitle-${field}`}
                  >
                    <td className="kbnDocViewer__field">&nbsp;</td>
                    <td className="kbnDocViewer__multifield_title">
                      <b>
                        {i18n.translate('discover.fieldChooser.discoverField.multiFields', {
                          defaultMessage: 'Multi fields',
                        })}
                      </b>
                    </td>
                  </tr>
                ) : null}
                {multiFields[field]
                  ? multiFields[field].map((multiField) => {
                      return (
                        <DocViewTableRow
                          key={multiField}
                          fieldMapping={mapping(multiField)}
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
                    })
                  : null}
              </React.Fragment>
            );
          })}
      </tbody>
    </table>
  );
}
