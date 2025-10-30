/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  getMessageFieldWithFallbacks,
  type DataTableRecord,
  type LogDocumentOverview,
} from '@kbn/discover-utils';
import type { ObservabilityStreamsFeature } from '@kbn/discover-shared-plugin/public';
import { Badges } from '../badges/badges';
import { HoverActionPopover } from '../hover_popover_action';

export const ContentBreakdown = ({
  formattedDoc,
  hit,
  renderFlyoutStreamProcessingLink,
}: {
  formattedDoc: LogDocumentOverview;
  hit: DataTableRecord;
  renderFlyoutStreamProcessingLink?: ObservabilityStreamsFeature['renderFlyoutStreamProcessingLink'];
}) => {
  const { field, value, formattedValue } = getMessageFieldWithFallbacks(formattedDoc, {
    includeFormattedValue: true,
  });

  const rawFieldValue = hit && field ? hit.flattened[field] : undefined;

  const messageCodeBlockProps = formattedValue
    ? { language: 'json', children: formattedValue }
    : { language: 'txt', dangerouslySetInnerHTML: { __html: value ?? '' } };
  const hasMessageField = field && value;

  return (
    <>
      <EuiPanel paddingSize="s" hasBorder hasShadow={false}>
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          data-test-subj="unifiedDocViewLogsOverviewMessage"
        >
          <EuiFlexGroup
            alignItems="flexEnd"
            gutterSize="none"
            justifyContent="spaceBetween"
            responsive={false}
          >
            <EuiText color="subdued" size="xs">
              {field}
            </EuiText>
            <EuiFlexItem grow={false}>
              <Badges
                hasMessageField={Boolean(hasMessageField)}
                hit={hit}
                formattedDoc={formattedDoc}
                renderFlyoutStreamProcessingLink={renderFlyoutStreamProcessingLink}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          {hasMessageField && (
            <HoverActionPopover
              value={value}
              formattedValue={formattedValue}
              field={field}
              rawFieldValue={rawFieldValue}
              anchorPosition="downCenter"
              display="block"
            >
              <EuiCodeBlock
                overflowHeight={100}
                paddingSize="s"
                isCopyable
                fontSize="s"
                {...messageCodeBlockProps}
              />
            </HoverActionPopover>
          )}
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
};
