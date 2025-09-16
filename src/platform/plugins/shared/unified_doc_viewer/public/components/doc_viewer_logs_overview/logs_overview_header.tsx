/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import type { DataTableRecord, LogDocumentOverview } from '@kbn/discover-utils';
import { fieldConstants, getMessageFieldWithFallbacks } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import type { ObservabilityStreamsFeature } from '@kbn/discover-shared-plugin/public';
import { Timestamp } from './sub_components/timestamp';
import { HoverActionPopover } from './sub_components/hover_popover_action';
import { LogLevel } from './sub_components/log_level';
import { ContentFrameworkSection } from '../..';

export const contentLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.content', {
  defaultMessage: 'Content breakdown',
});

export function LogsOverviewHeader({
  doc,
  formattedDoc,
  renderFlyoutStreamProcessingLink,
}: {
  formattedDoc: LogDocumentOverview;
  doc: DataTableRecord;
  renderFlyoutStreamProcessingLink?: ObservabilityStreamsFeature['renderFlyoutStreamProcessingLink'];
}) {
  const hasLogLevel = Boolean(formattedDoc[fieldConstants.LOG_LEVEL_FIELD]);
  const hasTimestamp = Boolean(formattedDoc[fieldConstants.TIMESTAMP_FIELD]);
  const { field, value, formattedValue } = getMessageFieldWithFallbacks(formattedDoc, {
    includeFormattedValue: true,
  });
  const rawFieldValue = doc && field ? doc.flattened[field] : undefined;
  const messageCodeBlockProps = formattedValue
    ? { language: 'json', children: formattedValue }
    : { language: 'txt', dangerouslySetInnerHTML: { __html: value ?? '' } };
  const hasMessageField = field && value;
  const hasBadges = hasTimestamp || hasLogLevel || hasMessageField;
  const hasFlyoutHeader = hasMessageField || hasBadges;

  const accordionId = useGeneratedHtmlId({
    prefix: contentLabel,
  });

  const badges = hasBadges && (
    <EuiFlexGroup responsive={false} gutterSize="m" alignItems="center">
      {hasMessageField &&
        renderFlyoutStreamProcessingLink &&
        renderFlyoutStreamProcessingLink({ doc })}
      {formattedDoc[fieldConstants.LOG_LEVEL_FIELD] && (
        <HoverActionPopover
          value={formattedDoc[fieldConstants.LOG_LEVEL_FIELD]}
          field={fieldConstants.LOG_LEVEL_FIELD}
        >
          <LogLevel level={formattedDoc[fieldConstants.LOG_LEVEL_FIELD]} />
        </HoverActionPopover>
      )}
      {hasTimestamp && <Timestamp timestamp={formattedDoc[fieldConstants.TIMESTAMP_FIELD]} />}
    </EuiFlexGroup>
  );

  const contentField = hasMessageField && (
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
        <EuiFlexItem grow={false}>{badges}</EuiFlexItem>
      </EuiFlexGroup>
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
    </EuiFlexGroup>
  );

  return hasFlyoutHeader ? (
    <ContentFrameworkSection
      id={accordionId}
      title={contentLabel}
      data-test-subj="unifiedDocViewLogsOverviewHeader"
    >
      {hasMessageField ? contentField : badges}
    </ContentFrameworkSection>
  ) : null;
}
