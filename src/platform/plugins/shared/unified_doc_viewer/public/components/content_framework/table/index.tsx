/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/src/services/types';
import type { EuiDataGridCellPopoverElementProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiText, EuiToolTip, useEuiTheme, useResizeObserver } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getFormattedFields } from '@kbn/discover-utils/src/utils/get_formatted_fields';
import { getFlattenedFields } from '@kbn/discover-utils/src/utils/get_flattened_fields';
import { css } from '@emotion/react';
import useWindowSize from 'react-use/lib/useWindowSize';
import { getUnifiedDocViewerServices } from '../../../plugin';
import { FieldRow } from '../../doc_viewer_table/field_row';
import { TableGrid } from '../../doc_viewer_table/table_grid';
import { FormattedValue } from './components/formatted_value';
import { NamePopoverContent } from './components/name_popover_content';
import { ValuePopoverContent } from './components/value_popover_content';

const DEFAULT_INITIAL_PAGE_SIZE = 25;

/**
 * Helper to flatten nested objects into dot-notation keys
 */
function flattenObject(obj: Record<string, unknown>, prefix: string = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

/**
 * Gets field value from either flattened hit or _source with attributes.* or resource.attributes.* prefix
 */
function getFieldValue(
  fieldName: string,
  flattenedHit: Record<string, unknown>,
  flattenedSource: Record<string, unknown>
): unknown {
  // Check mapped field first
  if (flattenedHit[fieldName] !== undefined) {
    return flattenedHit[fieldName];
  }
  
  // Check _source for unmapped attributes.* or resource.attributes.* fields
  const attributesField = `attributes.${fieldName}`;
  const resourceAttributesField = `resource.attributes.${fieldName}`;
  
  if (flattenedSource[attributesField] !== undefined) {
    return flattenedSource[attributesField];
  }
  
  if (flattenedSource[resourceAttributesField] !== undefined) {
    return flattenedSource[resourceAttributesField];
  }
  
  return undefined;
}

export type FieldConfigValue = string | number | undefined;

export interface FieldConfiguration {
  title: string;
  formatter?: (value: FieldConfigValue, formattedValue: string) => React.ReactNode;
  description?: string;
}

export interface TableFieldConfiguration {
  name: string;
  value: unknown;
  description?: string;
  type?: string;
  valueCellContent: (params?: { truncate?: boolean }) => React.ReactNode;
  isFromSource?: boolean; // indicates field comes from unmapped _source data
}

export interface ContentFrameworkTableProps
  extends Pick<
    DocViewRenderProps,
    | 'hit'
    | 'dataView'
    | 'columnsMeta'
    | 'textBasedHits'
    | 'filter'
    | 'onAddColumn'
    | 'onRemoveColumn'
    | 'columns'
  > {
  fieldNames: string[];
  fieldConfigurations?: Record<string, FieldConfiguration>;
  id: string;
  'data-test-subj'?: string;
}

export function ContentFrameworkTable({
  hit,
  fieldNames,
  fieldConfigurations,
  dataView,
  columns,
  id,
  textBasedHits,
  'data-test-subj': dataTestSubj,
  filter,
  onAddColumn,
  onRemoveColumn,
}: ContentFrameworkTableProps) {
  const { euiTheme } = useEuiTheme();
  const {
    fieldsMetadata: { useFieldsMetadata },
    fieldFormats,
  } = getUnifiedDocViewerServices();
  const { fieldsMetadata = {} } = useFieldsMetadata({
    attributes: ['short', 'type'],
    fieldNames,
  });

  const { formattedHit, flattenedHit, flattenedSource } = useMemo(
    () => ({
      formattedHit: getFormattedFields(hit, fieldNames, { dataView, fieldFormats }),
      flattenedHit: getFlattenedFields(hit, fieldNames),
      flattenedSource: hit.raw._source ? flattenObject(hit.raw._source) : {},
    }),
    [dataView, fieldFormats, hit, fieldNames]
  );

  const isEsqlMode = Array.isArray(textBasedHits);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  useWindowSize(); // trigger re-render on window resize to recalculate the grid container height
  const { width: containerWidth } = useResizeObserver(containerRef);

  const { fields, rows } = useMemo(
    () =>
      fieldNames.reduce(
        (acc, fieldName) => {
          const value = getFieldValue(fieldName, flattenedHit, flattenedSource);
          const fieldConfiguration = fieldConfigurations?.[fieldName];
          const fieldDescription =
            fieldConfiguration?.description || fieldsMetadata[fieldName]?.short;
          const formattedValue = formattedHit[fieldName] || String(value || '');

          if (value === undefined) return acc;

          // Check if field comes from _source (unmapped)
          const isFromSource = flattenedHit[fieldName] === undefined && value !== undefined;

          acc.fields[fieldName] = {
            name: fieldConfiguration?.title || fieldName,
            value,
            description: fieldDescription,
            type: fieldsMetadata[fieldName]?.type,
            isFromSource,
            valueCellContent: ({ truncate }: { truncate?: boolean } = { truncate: true }) => {
              return fieldConfiguration?.formatter ? (
                <>{fieldConfiguration.formatter(value, formattedValue)}</>
              ) : (
                <FormattedValue value={formattedValue} truncate={truncate} />
              );
            },
          };

          acc.rows.push(
            new FieldRow({
              name: fieldName,
              displayNameOverride: fieldName,
              flattenedValue: value,
              hit,
              dataView,
              fieldFormats,
              isPinned: false,
              columnsMeta: {},
            })
          );

          return acc;
        },
        { fields: {} as Record<string, TableFieldConfiguration>, rows: [] as FieldRow[] }
      ),
    [
      dataView,
      fieldConfigurations,
      fieldFormats,
      fieldNames,
      fieldsMetadata,
      flattenedHit,
      flattenedSource,
      formattedHit,
      hit,
    ]
  );

  const cellValueRenderer = useCallback(
    ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      const fieldName = rows[rowIndex]?.name;
      const fieldConfig = fields[fieldName];

      if (!fieldConfig) return null;
      if (columnId === 'name') {
        const rowDataTestSubj = `${dataTestSubj}${fieldConfig.name
          .replace(/ (\w)/g, (_, c) => c.toUpperCase())
          .replace(/^\w/, (c) => c.toUpperCase())}`;

        return (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText
                  size="xs"
                  css={{ fontWeight: euiTheme.font.weight.bold }}
                  data-test-subj={rowDataTestSubj}
                >
                  {fieldConfig.name}
                </EuiText>
              </EuiFlexItem>
              {fieldConfig.isFromSource && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.translate(
                      'unifiedDocViewer.docView.table.unmappedFieldTooltip',
                      {
                        defaultMessage:
                          'This field is not indexed and comes from the _source metadata',
                      }
                    )}
                  >
                    <EuiIcon type="indexEdit" size="m" />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </>
        );
      }
      return fieldConfig.valueCellContent();
    },
    [rows, fields, dataTestSubj, euiTheme.font.weight.bold]
  );

  const cellPopoverRenderer = useCallback(
    (props: EuiDataGridCellPopoverElementProps) => {
      const { columnId, cellActions, rowIndex } = props;
      const fieldName = rows[rowIndex]?.name;
      const fieldConfig = fields[fieldName];
      if (!fieldConfig) return null;
      if (columnId === 'name') {
        return (
          <NamePopoverContent
            fieldName={fieldName}
            fieldConfig={fieldConfig}
            cellActions={cellActions}
          />
        );
      }
      return <ValuePopoverContent fieldConfig={fieldConfig} cellActions={cellActions} />;
    },
    [rows, fields]
  );

  if (Object.keys(hit.flattened).length === 0) {
    return null;
  }

  return (
    <div
      ref={setContainerRef}
      // EUI Override: .euiDataGrid__virtualized is necessary to prevent a blank space at the bottom of the grid due to an internal height calculation
      css={css`
        .euiDataGrid__virtualized {
          height: auto !important;
        }
        .euiDataGridRow:last-of-type .euiDataGridRowCell {
          border-bottom: none;
        }
      `}
      data-test-subj={dataTestSubj}
    >
      <TableGrid
        data-test-subj="ContentFrameworkTableTableGrid"
        id={id}
        containerWidth={containerWidth}
        rows={rows}
        isEsqlMode={isEsqlMode}
        filter={filter}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
        columns={columns}
        initialPageSize={DEFAULT_INITIAL_PAGE_SIZE}
        customRenderCellValue={cellValueRenderer}
        customRenderCellPopover={cellPopoverRenderer}
        gridStyle={{ stripes: false, rowHover: 'none', header: 'shade' }}
      />
    </div>
  );
}
