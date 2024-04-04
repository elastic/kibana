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
import { FlyoutDoc } from '../../../common/document';
import { getMessageWithFallbacks } from '../../hooks/use_doc_detail';
import { LogLevel } from '../common/log_level';
import { Timestamp } from './sub_components/timestamp';
import * as constants from '../../../common/constants';
import { flyoutContentLabel } from '../common/translations';
import { HoverActionPopover } from './sub_components/hover_popover_action';

export function LogsOverviewHeader({ doc }: { doc: FlyoutDoc }) {
  const hasTimestamp = Boolean(doc[constants.TIMESTAMP_FIELD]);
  const hasLogLevel = Boolean(doc[constants.LOG_LEVEL_FIELD]);
  const hasBadges = hasTimestamp || hasLogLevel;
  const { field, value } = getMessageWithFallbacks(doc);
  const hasMessageField = field && value;
  const hasFlyoutHeader = hasMessageField || hasBadges;

  const accordionId = useGeneratedHtmlId({
    prefix: flyoutContentLabel,
  });

  const accordionTitle = (
    <EuiTitle size="xs">
      <p>{flyoutContentLabel}</p>
    </EuiTitle>
  );

  const logLevelAndTimestamp = (
    <EuiFlexItem grow={false}>
      {hasBadges && (
        <EuiFlexGroup responsive={false} gutterSize="m" justifyContent="flexEnd">
          {doc[constants.LOG_LEVEL_FIELD] && (
            <HoverActionPopover
              value={doc[constants.LOG_LEVEL_FIELD]}
              field={constants.LOG_LEVEL_FIELD}
            >
              <EuiFlexItem grow={false}>
                <LogLevel
                  level={doc[constants.LOG_LEVEL_FIELD]}
                  renderInFlyout={true}
                  dataTestSubj="logsExplorerFlyoutLogLevel"
                />
              </EuiFlexItem>
            </HoverActionPopover>
          )}
          {hasTimestamp && (
            <EuiFlexItem grow={false}>
              <Timestamp timestamp={doc[constants.TIMESTAMP_FIELD]} />
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
      data-test-subj={`logsExplorerFlyoutHeaderSection${flyoutContentLabel}`}
    >
      <EuiFlexGroup direction="column" gutterSize="none" data-test-subj="logsExplorerFlyoutDetail">
        {hasMessageField ? contentField : logLevelAndTimestamp}
      </EuiFlexGroup>
    </EuiAccordion>
  ) : null;
}
