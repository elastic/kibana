/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/src/services/types';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getUnifiedDocViewerServices } from '../../../plugin';
import { DataGrid, DataGridField } from './components/data_grid';

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
  formatter?: (value: FieldConfigValue) => React.ReactNode;
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
  const { euiTheme } = useEuiTheme();
  const {
    fieldsMetadata: { useFieldsMetadata },
  } = getUnifiedDocViewerServices();
  const { fieldsMetadata = {} } = useFieldsMetadata({
    attributes: ['short', 'flat_name', 'name'],
    fieldNames,
  });

  const nameCellValue = ({
    id,
    name,
    description,
  }: {
    id: string;
    name: string;
    description?: string;
  }) => {
    return (
      <EuiFlexGroup gutterSize="xs" responsive={false}>
        <EuiFlexItem
          grow={false}
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
        >
          {name}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIconTip
            title={id}
            content={description ? <>{description}</> : null}
            size="s"
            color="subdued"
            aria-label={description ? `${id}: ${description}` : id}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  if (!hit.flattened) {
    return null;
  }
  const fields: Record<string, DataGridField> = fieldNames.reduce<Record<string, DataGridField>>(
    (acc, fieldName) => {
      const value = hit.flattened[fieldName] as string; // make sure it's a string
      const fieldConfiguration = fieldConfigurations?.[fieldName];
      const fieldDescription = fieldConfiguration?.description || fieldsMetadata[fieldName]?.short;

      if (!value) return acc;

      acc[fieldName] = {
        name: fieldConfiguration?.title || fieldName,
        value,
        nameCellContent: nameCellValue({
          id: fieldName,
          name: fieldConfiguration?.title || fieldName,
          ...(fieldDescription && { description: fieldDescription }),
        }),
        valueCellContent: fieldConfiguration?.formatter ? (
          <>{fieldConfiguration?.formatter(value)}</>
        ) : (
          value
        ),
      };

      return acc;
    },
    {}
  );

  return (
    <div>
      <DataGrid
        hit={hit}
        fields={fields}
        dataView={dataView}
        columns={columns}
        columnsMeta={columnsMeta}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
        filter={filter}
        isEsqlMode={false}
        title={title}
        data-test-subj="ContentFrameworkTableDataGrid"
      />
    </div>
  );
}
