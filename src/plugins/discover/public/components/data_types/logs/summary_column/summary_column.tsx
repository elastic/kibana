/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ROWS_HEIGHT_OPTIONS,
  type DataGridCellValueElementProps,
  DataGridDensity,
} from '@kbn/unified-data-table';
import React from 'react';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import {
  ShouldShowFieldInTableHandler,
  getLogDocumentOverview,
  getMessageFieldWithFallbacks,
} from '@kbn/discover-utils';
import { JsonCodeEditor } from '@kbn/unified-doc-viewer-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataGridCellServicesProvider } from '../../../../application/main/hooks/grid_customisations/use_data_grid_cell_services';
import { Resource, StaticResource } from './resource';
import { Content } from './content';
import { contentLabel, jsonLabel, resourceLabel } from '../translations';
import { createResourceFields, formatJsonDocumentForContent } from './utils';

export interface SummaryColumnFactoryDeps {
  data: DataPublicPluginStart;
  params: SummaryColumnsGridParams;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
}

export type SummaryColumnProps = DataGridCellValueElementProps;

export interface SummaryColumnsGridParams {
  dataView: DataView;
  density: DataGridDensity | undefined;
  rowHeight: number | undefined;
}

const SummaryColumn = (props: SummaryColumnProps & SummaryColumnFactoryDeps) => {
  const { isDetails, params } = props;

  if (isDetails) {
    return <SummaryCellPopover {...props} />;
  }

  return <SummaryCell {...props} density={params.density} rowHeight={params.rowHeight} />;
};

// eslint-disable-next-line import/no-default-export
export default SummaryColumn;

const SummaryCell = ({
  density: maybeNullishDensity,
  rowHeight: maybeNullishRowHeight,
  ...props
}: SummaryColumnProps & SummaryColumnFactoryDeps & Omit<SummaryColumnsGridParams, 'dataView'>) => {
  const { data, dataView, row } = props;

  const density = maybeNullishDensity ?? DataGridDensity.COMPACT;
  const isCompressed = density === DataGridDensity.COMPACT;

  const rowHeight = maybeNullishRowHeight ?? ROWS_HEIGHT_OPTIONS.single;
  const isSingleLine = rowHeight === ROWS_HEIGHT_OPTIONS.single || rowHeight === 1;
  const shouldCenter = isSingleLine || rowHeight === ROWS_HEIGHT_OPTIONS.auto;

  const resourceFields = createResourceFields(row);
  const shouldRenderResource = resourceFields.length > 0;

  return (
    <DataGridCellServicesProvider services={{ data, dataView }}>
      <EuiFlexGroup
        gutterSize="s"
        wrap={!isSingleLine}
        style={{ height: '100%' }}
        {...(shouldCenter && { alignItems: 'center' })}
      >
        {shouldRenderResource && (
          <EuiFlexItem grow={false}>
            <Resource
              fields={resourceFields}
              limited={isSingleLine}
              {...(shouldCenter && { alignItems: 'center' })}
            />
          </EuiFlexItem>
        )}
        <Content {...props} isSingleLine={isSingleLine} isCompressed={isCompressed} />
      </EuiFlexGroup>
    </DataGridCellServicesProvider>
  );
};

const SummaryCellPopover = (props: SummaryColumnProps & SummaryColumnFactoryDeps) => {
  const { row, data, dataView, fieldFormats } = props;

  const resourceFields = createResourceFields(row);
  const shouldRenderResource = resourceFields.length > 0;

  const documentOverview = getLogDocumentOverview(row, { dataView, fieldFormats });
  const { field, value } = getMessageFieldWithFallbacks(documentOverview);
  const shouldRenderContent = Boolean(field && value);

  const shouldRenderSource = !shouldRenderContent;

  return (
    <DataGridCellServicesProvider services={{ data, dataView }}>
      <EuiFlexGroup direction="column" css={{ width: 580 }}>
        {shouldRenderResource && (
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiTitle size="xxs">
              <span>{resourceLabel}</span>
            </EuiTitle>
            <StaticResource fields={resourceFields} />
          </EuiFlexGroup>
        )}
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiTitle size="xxs">
            <span>{contentLabel}</span>
          </EuiTitle>
          {shouldRenderContent && (
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiText color="subdued" size="xs">
                {field}
              </EuiText>
              <EuiCodeBlock
                overflowHeight={100}
                paddingSize="s"
                isCopyable
                language="txt"
                fontSize="s"
              >
                {value}
              </EuiCodeBlock>
            </EuiFlexGroup>
          )}
          {shouldRenderSource && (
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiText color="subdued" size="xs">
                {jsonLabel}
              </EuiText>
              <JsonCodeEditor json={formatJsonDocumentForContent(row).raw} height={300} />
            </EuiFlexGroup>
          )}
        </EuiFlexGroup>
      </EuiFlexGroup>
    </DataGridCellServicesProvider>
  );
};
