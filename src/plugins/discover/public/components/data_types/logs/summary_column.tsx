/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ROWS_HEIGHT_OPTIONS, type DataGridCellValueElementProps } from '@kbn/unified-data-table';
import React from 'react';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getLogDocumentOverview, getMessageFieldWithFallbacks } from '@kbn/discover-utils';
import { JsonCodeEditor } from '@kbn/unified-doc-viewer-plugin/public';
import { getAvailableResourceFields } from '../../../utils/get_available_resource_fields';
import {
  DataGridCellServicesProviderProps,
  DataGridCellServicesProvider,
} from '../../../application/main/hooks/grid_customisations/use_data_grid_cell_services';
import {
  Resource,
  StaticResource,
  createResourceFields,
} from '../../discover_grid/virtual_columns/logs/resource';
import {
  Content,
  formatJsonDocumentForContent,
} from '../../discover_grid/virtual_columns/logs/content';
import * as constants from '../../../../common/data_types/logs/constants';
import { contentLabel, documentLabel, resourceLabel } from './translations';

type SummaryColumnProps = DataGridCellValueElementProps;

interface SummaryColumnsGridParams {
  rowHeight: number | undefined;
}

export const getSummaryColumn =
  ({ data, params }: { data: DataPublicPluginStart; params: SummaryColumnsGridParams }) =>
  (props: SummaryColumnProps) => {
    const { isDetails, dataView } = props;
    const virtualColumnServices = { data, dataView };

    const rowHeight = params.rowHeight ?? ROWS_HEIGHT_OPTIONS.single;
    const isSingleLine = rowHeight === ROWS_HEIGHT_OPTIONS.single || rowHeight === 1;
    const shouldCenter =
      rowHeight === ROWS_HEIGHT_OPTIONS.single || rowHeight === ROWS_HEIGHT_OPTIONS.auto;

    if (isDetails) {
      return <SummaryPopover {...props} services={virtualColumnServices} />;
    }

    return (
      <DataGridCellServicesProvider services={virtualColumnServices}>
        <EuiFlexGroup
          gutterSize="s"
          wrap={!isSingleLine}
          style={{ height: '100%' }}
          {...(shouldCenter && { alignItems: 'center' })}
        >
          <EuiFlexItem grow={false}>
            <Resource
              limited={isSingleLine}
              {...(shouldCenter && { alignItems: 'center' })}
              {...props}
            />
          </EuiFlexItem>
          <Content {...props} isSingleLine={isSingleLine} />
        </EuiFlexGroup>
      </DataGridCellServicesProvider>
    );
  };

const SummaryPopover = (props: SummaryColumnProps & DataGridCellServicesProviderProps) => {
  const { row, dataView, fieldFormats, services } = props;

  const resourceFields = createResourceFields(row);
  const shouldRenderResource = resourceFields.length > 0;

  const documentOverview = getLogDocumentOverview(row, { dataView, fieldFormats });
  const { field, value } = getMessageFieldWithFallbacks(documentOverview);
  const shouldRenderContent = Boolean(field && value);

  const eventOriginalValue = documentOverview[constants.EVENT_ORIGINAL_FIELD];
  const shouldRenderEventOriginal = Boolean(eventOriginalValue);

  const shouldRenderSource = !shouldRenderContent && !shouldRenderEventOriginal;

  return (
    <DataGridCellServicesProvider services={services}>
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
          {shouldRenderEventOriginal && (
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiText color="subdued" size="xs">
                {constants.EVENT_ORIGINAL_FIELD}
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
                {documentLabel}
              </EuiText>
              <JsonCodeEditor json={formatJsonDocumentForContent(row).raw} height={300} />
            </EuiFlexGroup>
          )}
        </EuiFlexGroup>
      </EuiFlexGroup>
    </DataGridCellServicesProvider>
  );
};
