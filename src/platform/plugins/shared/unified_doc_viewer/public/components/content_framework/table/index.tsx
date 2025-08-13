/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/src/services/types';
import { getSpanDocumentOverview } from '@kbn/discover-utils';
import { getFlattenedSpanDocumentOverview } from '@kbn/discover-utils/src';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getUnifiedDocViewerServices } from '../../../plugin';
import { DataGrid, DataGridField } from './components/data_grid';
import { getSpanFieldConfiguration } from '../../observability/traces/doc_viewer_span_overview/resources/get_span_field_configuration';

export interface ContentFrameworkTableProps
  extends Pick<
    DocViewRenderProps,
    'hit' | 'dataView' | 'columnsMeta' | 'filter' | 'onAddColumn' | 'onRemoveColumn' | 'columns'
  > {
  fieldNames: string[];
  title: string;
}

export function ContentFrameworkTable({
  hit,
  fieldNames,
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
    fieldFormats,
  } = getUnifiedDocViewerServices();
  const { fieldsMetadata = {} } = useFieldsMetadata({
    attributes: ['short', 'flat_name', 'name'],
    fieldNames,
  });

  const { formattedDoc, flattenedDoc } = useMemo(
    // TODO unify this so it works for any doc, not just spans or transactions
    () => ({
      formattedDoc: getSpanDocumentOverview(hit, { dataView, fieldFormats }),
      flattenedDoc: getFlattenedSpanDocumentOverview(hit),
    }),
    [dataView, fieldFormats, hit]
  );
  const fieldConfigurations = useMemo(
    () => getSpanFieldConfiguration({ attributes: formattedDoc, flattenedDoc }),
    [formattedDoc, flattenedDoc]
  );

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

        {description && (
          <EuiFlexItem grow={false}>
            <EuiIconTip
              title={id}
              content={description}
              size="s"
              color="subdued"
              aria-label={`${id}: ${description}`}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };

  if (!hit.flattened) {
    return null;
  }
  const fields: Record<string, DataGridField> = fieldNames.reduce<Record<string, DataGridField>>(
    (acc, fieldName) => {
      const value = hit.flattened[fieldName] as string; // make sure it's a string
      const fieldConfiguration = fieldConfigurations[fieldName];
      const fieldDescription =
        fieldConfiguration?.fieldMetadata?.short || fieldsMetadata[fieldName]?.short;

      if (!value) return acc;

      acc[fieldName] = {
        name: fieldConfiguration?.title || fieldName,
        value,
        nameCellContent: nameCellValue({
          id: fieldName,
          name: fieldConfiguration?.title || fieldName,
          ...(fieldDescription && { description: fieldDescription }),
        }),
        valueCellContent: fieldConfiguration ? (
          <>{fieldConfiguration?.content(value, fieldConfiguration?.formattedValue)}</>
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
