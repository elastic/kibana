/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { DocViewTableRow } from './table_row';
import { trimAngularSpan } from './table_helper';
import { isNestedFieldParent } from '../../apps/main/utils/nested_fields';
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

  const toggleColumn = useCallback(
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
            const displayUnderscoreWarning = !mapping(field) && field.indexOf('_') === 0;

            const fieldType = isNestedFieldParent(field, indexPattern)
              ? 'nested'
              : indexPattern.fields.getByName(field)?.type;
            return (
              <React.Fragment key={field}>
                <DocViewTableRow
                  field={field}
                  fieldMapping={mapping(field)}
                  fieldType={String(fieldType)}
                  displayUnderscoreWarning={displayUnderscoreWarning}
                  isCollapsed={isCollapsed}
                  isCollapsible={isCollapsible}
                  isColumnActive={!!columns?.includes(field)}
                  onFilter={filter}
                  onToggleCollapse={() => toggleValueCollapse(field)}
                  onToggleColumn={() => toggleColumn(field)}
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
                    <td className="kbnDocViewer__multifield_title" colSpan={2}>
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
                          isColumnActive={Array.isArray(columns) && columns.includes(multiField)}
                          onFilter={filter}
                          onToggleCollapse={() => {
                            toggleValueCollapse(multiField);
                          }}
                          onToggleColumn={() => toggleColumn(multiField)}
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
