/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
} from '@elastic/eui';
import {
  DocumentOverview,
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

export function LogsOverviewHeader({ doc }: { doc: DocumentOverview }) {
  const hasTimestamp = Boolean(doc[fieldConstants.TIMESTAMP_FIELD]);
  const hasLogLevel = Boolean(doc[fieldConstants.LOG_LEVEL_FIELD]);
  const hasBadges = hasTimestamp || hasLogLevel;
  const { field, value } = getMessageFieldWithFallbacks(doc);
  const hasMessageField = field && value;
  const hasFlyoutHeader = hasMessageField || hasBadges;

  const accordionId = useGeneratedHtmlId({
    prefix: contentLabel,
  });

  const accordionTitle = (
    <EuiTitle size="xs">
      <p>{contentLabel}</p>
    </EuiTitle>
  );

  const logLevelAndTimestamp = (
    <EuiFlexItem grow={false}>
      {hasBadges && (
        <EuiFlexGroup responsive={false} gutterSize="m" justifyContent="flexEnd">
          {doc[fieldConstants.LOG_LEVEL_FIELD] && (
            <HoverActionPopover
              value={doc[fieldConstants.LOG_LEVEL_FIELD]}
              field={fieldConstants.LOG_LEVEL_FIELD}
            >
              <EuiFlexItem grow={false}>
                <LogLevel level={doc[fieldConstants.LOG_LEVEL_FIELD]} />
              </EuiFlexItem>
            </HoverActionPopover>
          )}
          {hasTimestamp && (
            <EuiFlexItem grow={false}>
              <Timestamp timestamp={doc[fieldConstants.TIMESTAMP_FIELD]} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
    </EuiFlexItem>
  );

  const contentField = hasMessageField && (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="logsExplorerFlyoutLogMessage">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="flexEnd" gutterSize="none" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="xs">
                {field}
              </EuiText>
            </EuiFlexItem>
            {logLevelAndTimestamp}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <HoverActionPopover
            value={value}
            field={field}
            anchorPosition="downCenter"
            display="block"
          >
            <EuiCodeBlock
              overflowHeight={100}
              paddingSize="m"
              isCopyable
              language="txt"
              fontSize="m"
            >
              {value}
            </EuiCodeBlock>
          </HoverActionPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );

  return hasFlyoutHeader ? (
    <EuiAccordion
      id={accordionId}
      buttonContent={accordionTitle}
      paddingSize="m"
      initialIsOpen={true}
      data-test-subj={`logsExplorerFlyoutHeaderSection${contentLabel}`}
    >
      <EuiFlexGroup direction="column" gutterSize="none" data-test-subj="logsExplorerFlyoutDetail">
        {hasMessageField ? contentField : logLevelAndTimestamp}
      </EuiFlexGroup>
    </EuiAccordion>
  ) : null;
}
