/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';

import {
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiPopover,
  EuiPopoverTitle,
  EuiToolTip,
} from '@elastic/eui';

import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  apiCanLockHoverActions,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';

import type { EsqlNotificationActionApi } from './esql_notification_action';

const viewEsqlLabel = i18n.translate('dashboard.panel.viewEsql', {
  defaultMessage: 'View ES|QL query',
});

export function EsqlNotificationPopover({ api }: { api: EsqlNotificationActionApi }) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
    if (apiCanLockHoverActions(api)) {
      api.lockHoverActions(false);
    }
  }, [api]);

  const esqlQueries = useStateFromPublishingSubject(api.esql$);

  return (
    <EuiPopover
      button={
        <EuiToolTip content={viewEsqlLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            color="text"
            iconType="code"
            onClick={() => {
              setIsPopoverOpen(!isPopoverOpen);
              if (apiCanLockHoverActions(api)) {
                api?.lockHoverActions(!isPopoverOpen);
              }
            }}
            data-test-subj={`embeddablePanelEsqlNotification-${api.uuid}`}
            aria-label={viewEsqlLabel}
          />
        </EuiToolTip>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="upCenter"
      aria-label={viewEsqlLabel}
    >
      <EuiPopoverTitle>
        {i18n.translate('dashboard.panel.esqlTitle', { defaultMessage: 'ES|QL query' })}
      </EuiPopoverTitle>
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        css={css`
          min-width: 300px;
          max-height: 400px;
          overflow-y: auto;
        `}
      >
        {esqlQueries.map((query, index) => (
          <EuiCodeBlock
            key={index}
            language="esql"
            paddingSize="s"
            tabIndex={0}
            data-test-subj={`esqlNotificationPopover__query-${index}`}
          >
            {query.esql}
          </EuiCodeBlock>
        ))}
      </EuiFlexGroup>
    </EuiPopover>
  );
}
