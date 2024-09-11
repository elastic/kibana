/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  UseVirtualColumnServices,
  VirtualColumnServiceProvider,
} from '../../../application/main/hooks/grid_customisations/use_virtual_column_services';
import { Resource } from '../../discover_grid/virtual_columns/logs/resource';
import {
  Content,
  formatJsonDocumentForContent,
} from '../../discover_grid/virtual_columns/logs/content';
import * as constants from '../../../../common/data_types/logs/constants';

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
      <VirtualColumnServiceProvider services={virtualColumnServices}>
        <EuiFlexGroup
          gutterSize="s"
          wrap={!isSingleLine}
          style={{ height: '100%' }}
          {...(shouldCenter && { alignItems: 'center' })}
        >
          <EuiFlexItem grow={false}>
            <Resource
              truncated
              limited={isSingleLine}
              {...(shouldCenter && { alignItems: 'center' })}
              {...props}
            />
          </EuiFlexItem>
          <Content {...props} isSingleLine={isSingleLine} />
        </EuiFlexGroup>
      </VirtualColumnServiceProvider>
    );
  };

const SummaryPopover = (props: SummaryColumnProps & UseVirtualColumnServices) => {
  const { row, dataView, fieldFormats, services } = props;

  const availableResourceFields = getAvailableResourceFields(row);
  const shouldRenderResource = availableResourceFields.length > 0;

  const documentOverview = getLogDocumentOverview(row, { dataView, fieldFormats });
  const { field, value } = getMessageFieldWithFallbacks(documentOverview);
  const shouldRenderContent = Boolean(field && value);

  const eventOriginalValue = documentOverview[constants.EVENT_ORIGINAL_FIELD];
  const shouldRenderEventOriginal = Boolean(eventOriginalValue);

  const shouldRenderSource = !shouldRenderContent && !shouldRenderEventOriginal;

  return (
    <VirtualColumnServiceProvider services={services}>
      <EuiPanel paddingSize="s" hasShadow={false} css={{ width: 580 }}>
        {shouldRenderResource && (
          <>
            <EuiTitle size="xxs">
              <span>Resource</span>
            </EuiTitle>
            <EuiSpacer size="s" />
            <Resource wrap {...props} />
            <EuiSpacer />
          </>
        )}
        <EuiSpacer size="s" />
        <EuiTitle size="xxs">
          <span>Content</span>
        </EuiTitle>
        <EuiSpacer size="s" />
        {shouldRenderContent && (
          <>
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
          </>
        )}
        {shouldRenderEventOriginal && (
          <>
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
          </>
        )}
        {shouldRenderSource && (
          <>
            <EuiText color="subdued" size="xs">
              Document
            </EuiText>
            <JsonCodeEditor json={formatJsonDocumentForContent(row)} height={300} />
          </>
        )}
      </EuiPanel>
    </VirtualColumnServiceProvider>
  );
};
