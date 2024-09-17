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
  EuiText,
  EuiAccordion,
  useGeneratedHtmlId,
  EuiTitle,
  EuiButton,
} from '@elastic/eui';
import {
  LogDocumentOverview,
  fieldConstants,
  getMessageFieldWithFallbacks,
} from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { Timestamp } from './sub_components/timestamp';
import { HoverActionPopover } from './sub_components/hover_popover_action';
import { LogLevel } from './sub_components/log_level';

export const contentLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.content', {
  defaultMessage: 'Content breakdown',
});

export function LogsOverviewHeader({ doc }: { doc: LogDocumentOverview }) {
  const hasLogLevel = Boolean(doc[fieldConstants.LOG_LEVEL_FIELD]);
  const hasTimestamp = Boolean(doc[fieldConstants.TIMESTAMP_FIELD]);
  const { field, value } = getMessageFieldWithFallbacks(doc);
  const hasBadges = hasTimestamp || hasLogLevel;
  const hasMessageField = field && value;
  const hasFlyoutHeader = hasMessageField || hasBadges;

  const accordionId = useGeneratedHtmlId({
    prefix: contentLabel,
  });

  const accordionTitle = (
    <EuiTitle size="xxs">
      <p>{contentLabel}</p>
    </EuiTitle>
  );

  const logLevelAndTimestamp = hasBadges && (
    <EuiFlexGroup responsive={false} gutterSize="m">
      {doc[fieldConstants.LOG_LEVEL_FIELD] && (
        <HoverActionPopover
          value={doc[fieldConstants.LOG_LEVEL_FIELD]}
          field={fieldConstants.LOG_LEVEL_FIELD}
        >
          <LogLevel level={doc[fieldConstants.LOG_LEVEL_FIELD]} />
        </HoverActionPopover>
      )}
      {hasTimestamp && <Timestamp timestamp={doc[fieldConstants.TIMESTAMP_FIELD]} />}
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
        <EuiFlexItem grow={false}>{logLevelAndTimestamp}</EuiFlexItem>
      </EuiFlexGroup>
      <HoverActionPopover value={value} field={field} anchorPosition="downCenter" display="block">
        <EuiCodeBlock overflowHeight={100} paddingSize="s" isCopyable language="txt" fontSize="s">
          {value}
        </EuiCodeBlock>
      </HoverActionPopover>
    </EuiFlexGroup>
  );

  return hasFlyoutHeader ? (
    <EuiAccordion
      id={accordionId}
      buttonContent={accordionTitle}
      paddingSize="m"
      initialIsOpen={true}
      data-test-subj="unifiedDocViewLogsOverviewHeader"
    >
      {hasMessageField ? contentField : logLevelAndTimestamp}
      <EuiButton
        href={`/app/observability/entities/data_stream/logs-${doc['data_stream.dataset']}-${doc['data_stream.namespace']}/management/parse`}
      >
        Parse fields out of message
      </EuiButton>
    </EuiAccordion>
  ) : null;
}
