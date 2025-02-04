/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import {
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getTraceDocumentOverview } from '@kbn/discover-utils';
import { spanAttributeIds, transactionAttributeIds } from './resources/attribute_ids';
import { getUnifiedDocViewerServices } from '../../plugin';
import { getAttributeConfiguration } from './resources/get_attribute_configuration';
export type TracesOverviewProps = DocViewRenderProps;

export function TracesOverview({
  columns,
  dataView,
  hit,
  filter,
  onAddColumn,
  onRemoveColumn,
}: TracesOverviewProps) {
  const { fieldFormats } = getUnifiedDocViewerServices();
  const parsedDoc = getTraceDocumentOverview(hit, { dataView, fieldFormats });

  const isTransaction = !parsedDoc['parent.id'];
  const detailTitle = `${isTransaction ? 'Transaction' : 'Span'} ${i18n.translate(
    'unifiedDocViewer.docViewerTracesOverview.title',
    {
      defaultMessage: 'detail',
    }
  )}`;

  return (
    <EuiPanel color="transparent" hasShadow={false} paddingSize="none">
      <EuiSpacer size="m" />
      <EuiTitle size="s">
        <h1>{detailTitle}</h1>
      </EuiTitle>
      <EuiSpacer size="m" />
      {(isTransaction ? transactionAttributeIds : spanAttributeIds).map((attributeId) => (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiTitle size="xxxs">
                <h3>{getAttributeConfiguration(parsedDoc)[attributeId].title}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>{getAttributeConfiguration(parsedDoc)[attributeId].content}</EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="xs" />
        </>
      ))}
    </EuiPanel>
  );
}
