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
import { EuiSpacer, EuiText, useEuiTheme, useResizeObserver } from '@elastic/eui';
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

  const { formattedHit, flattenedHit } = useMemo(
    () => ({
      formattedHit: getFormattedFields(hit, fieldNames, { dataView, fieldFormats }),
      flattenedHit: getFlattenedFields(hit, fieldNames),
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
          const value = flattenedHit[fieldName];
          const fieldConfiguration = fieldConfigurations?.[fieldName];
          const fieldDescription =
            fieldConfiguration?.description || fieldsMetadata[fieldName]?.short;
          const formattedValue = formattedHit[fieldName];

          if (!value) return acc;

          acc.fields[fieldName] = {
            name: fieldConfiguration?.title || fieldName,
            value,
            description: fieldDescription,
            type: fieldsMetadata[fieldName]?.type,
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
            <EuiText
              size="xs"
              css={{ fontWeight: euiTheme.font.weight.bold }}
              data-test-subj={rowDataTestSubj}
            >
              {fieldConfig.name}
            </EuiText>
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
