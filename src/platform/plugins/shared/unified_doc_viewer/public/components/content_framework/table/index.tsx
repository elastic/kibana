/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/src/services/types';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getFormattedFields } from '@kbn/discover-utils/src/utils/get_formatted_fields';
import { getFlattenedFields } from '@kbn/discover-utils/src/utils/get_flattened_fields';
import { getUnifiedDocViewerServices } from '../../../plugin';
import type { KeyValueDataGridField } from './components/key_value_data_grid';
import { KeyValueDataGrid } from './components/key_value_data_grid';

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
  const { euiTheme } = useEuiTheme();

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

  if (Object.keys(hit.flattened).length === 0) {
    return null;
  }

  const FormattedValue = ({ value }: { value: string }) => (
    <EuiText
      className="eui-textTruncate"
      size="xs"
      // Value returned from formatFieldValue is always sanitized
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );

  const fields: Record<string, KeyValueDataGridField> = fieldNames.reduce<
    Record<string, KeyValueDataGridField>
  >((acc, fieldName) => {
    const value = flattenedHit[fieldName];
    const fieldConfiguration = fieldConfigurations?.[fieldName];
    const fieldDescription = fieldConfiguration?.description || fieldsMetadata[fieldName]?.short;
    const formattedValue = formattedHit[fieldName];

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
        <>{fieldConfiguration?.formatter(value, formattedValue)}</>
      ) : (
        <FormattedValue value={formattedValue} />
      ),
    };

    return acc;
  }, {});

  return (
    <div>
      <KeyValueDataGrid
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
        data-test-subj="ContentFrameworkTableKeyValueDataGrid"
      />
    </div>
  );
}
