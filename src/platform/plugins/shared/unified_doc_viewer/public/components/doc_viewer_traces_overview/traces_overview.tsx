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
  const parsedDoc = getTraceDocumentOverview(hit);
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
      {(isTransaction ? transactionAttributeIds : spanAttributeIds).map((attributeId) => {
        const attributeConfiguration = getAttributeConfiguration(parsedDoc)[attributeId];

        if (!attributeConfiguration.content) {
          return null;
        }
        return (
          <div key={attributeId}>
            <EuiFlexGroup>
              <EuiFlexItem grow={1}>
                <EuiTitle size="xxxs">
                  <h3>{attributeConfiguration.title}</h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={2}>{attributeConfiguration.content}</EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin="xs" />
          </div>
        );
      })}
    </EuiPanel>
  );
}
