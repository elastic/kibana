/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/src/services/types';
import type {
  EuiDataGridCellPopoverElementProps,
  EuiDataGridCellValueElementProps,
  EuiThemeFontSize,
} from '@elastic/eui';
import { EuiSpacer, EuiText, useEuiFontSize } from '@elastic/eui';
import { getFormattedFields } from '@kbn/discover-utils/src/utils/get_formatted_fields';
import { getFlattenedFields } from '@kbn/discover-utils/src/utils/get_flattened_fields';
import { css } from '@emotion/react';
import { getUnifiedDocViewerServices } from '../../../plugin';
import DocViewerTable from '../../doc_viewer_table';
import { GRID_COLUMN_FIELD_NAME } from '../../doc_viewer_table/table';

interface RenderFieldConfig {
  displayName: string;
  value: unknown;
  description?: string;
  valueCellContent?: React.ReactNode;
}

function renderNamePopover(
  fieldName: string,
  fieldConfig: RenderFieldConfig,
  cellActions: React.ReactNode
) {
  return (
    <>
      <EuiText size="s" className="eui-textTruncate">
        {fieldName}
      </EuiText>
      {fieldConfig?.description && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" className="eui-textTruncate">
            {fieldConfig.description}
          </EuiText>
        </>
      )}
      {cellActions}
    </>
  );
}

function renderValuePopover(
  fieldConfig: RenderFieldConfig,
  cellActions: React.ReactNode,
  fontSize: EuiThemeFontSize['fontSize']
) {
  return (
    <>
      <EuiText
        css={
          fontSize
            ? css`
                * {
                  font-size: ${fontSize} !important;
                }
              `
            : undefined
        }
      >
        {fieldConfig?.valueCellContent}
      </EuiText>
      {cellActions}
    </>
  );
}

export interface ContentFrameworkTableProps
  extends Pick<
    DocViewRenderProps,
    'hit' | 'dataView' | 'columnsMeta' | 'filter' | 'onAddColumn' | 'onRemoveColumn' | 'columns'
  > {
  fieldNames: string[];
  fieldConfigurations?: Record<string, FieldConfiguration>;
  title: string;
}

export type FieldConfigValue = string | number | undefined;

export interface FieldConfiguration {
  title: string;
  formatter?: (value: FieldConfigValue, formattedValue: string) => React.ReactNode;
  description?: string;
}

export function ContentFrameworkTable({
  hit,
  fieldNames,
  fieldConfigurations,
  dataView,
  columnsMeta,
  columns,
  title,
  filter,
  onAddColumn,
  onRemoveColumn,
}: ContentFrameworkTableProps) {
  const { fontSize: smallFontSize } = useEuiFontSize('s');
  const {
    fieldsMetadata: { useFieldsMetadata },
    fieldFormats,
  } = getUnifiedDocViewerServices();
  const { fieldsMetadata = {} } = useFieldsMetadata({
    attributes: ['short', 'flat_name', 'name'],
    fieldNames,
  });

  const { formattedHit, flattenedHit } = useMemo(
    () => ({
      formattedHit: getFormattedFields(hit, fieldNames, { dataView, fieldFormats }),
      flattenedHit: getFlattenedFields(hit, fieldNames),
    }),
    [dataView, fieldFormats, hit, fieldNames]
  );

  const FormattedValue = ({ value }: { value: string }) => (
    <EuiText
      className="eui-textTruncate"
      size="xs"
      // Value returned from formatFieldValue is always sanitized
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );

  const rows = fieldNames.map((fieldName) => {
    const value = flattenedHit[fieldName];
    if (!value) return undefined;
    const fieldConfiguration = fieldConfigurations?.[fieldName];
    const fieldDescription = fieldConfiguration?.description || fieldsMetadata[fieldName]?.short;
    const formattedValue = formattedHit[fieldName];

    return {
      displayName: fieldConfiguration?.title || fieldName,
      value,
      description: fieldDescription,
      valueCellContent: fieldConfiguration?.formatter ? (
        <>{fieldConfiguration.formatter(value, formattedValue)}</>
      ) : (
        <FormattedValue value={formattedValue} />
      ),
    };
  });

  const customRenderCellValue = ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
    const row = rows[rowIndex];

    if (!row) {
      return null;
    }

    if (columnId === GRID_COLUMN_FIELD_NAME) {
      return row.displayName;
    }

    return row.valueCellContent;
  };

  const customRenderCellPopover = useCallback(
    ({ rowIndex, columnId, cellActions }: EuiDataGridCellPopoverElementProps) => {
      const fieldName = fieldNames[rowIndex];
      const fieldConfig = rows[rowIndex];

      if (!fieldConfig) return null;
      if (columnId === 'name') {
        return renderNamePopover(fieldName, fieldConfig, cellActions);
      }
      return renderValuePopover(fieldConfig, cellActions, smallFontSize);
    },
    [fieldNames, rows, smallFontSize]
  );

  return (
    <div>
      <DocViewerTable
        hit={hit}
        fieldNames={fieldNames}
        dataView={dataView}
        columns={columns}
        columnsMeta={columnsMeta}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
        filter={filter}
        availableFeatures={{
          dataGridHeader: false,
          pinColumn: false,
          hideNullValuesToggle: false,
          selectedOnlyToggle: false,
        }}
        customRenderCellValue={customRenderCellValue}
        customRenderCellPopover={customRenderCellPopover}
      />
    </div>
  );
}
