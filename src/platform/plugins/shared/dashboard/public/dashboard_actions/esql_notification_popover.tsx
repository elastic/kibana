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
  EuiFormLabel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';

import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import { apiCanLockHoverActions, useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import type { EsqlNotificationActionApi } from './esql_notification_action';

const esqlLabel = i18n.translate('dashboard.panel.esql', { defaultMessage: 'ES|QL' });

export function EsqlNotificationPopover({ api }: { api: EsqlNotificationActionApi }) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
    if (apiCanLockHoverActions(api)) {
      api.lockHoverActions(false);
    }
  }, [api]);

  const [esqlQueries] = useBatchedPublishingSubjects(api.esql$);

  if (!esqlQueries || esqlQueries.length === 0) return null;

  return (
    <EuiPopover
      button={
        <EuiToolTip content={esqlLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            color="text"
            iconType="code"
            onClick={() => {
              setIsPopoverOpen(!isPopoverOpen);
              if (apiCanLockHoverActions(api)) {
                api?.lockHoverActions(!api.hasLockedHoverActions$.value);
              }
            }}
            data-test-subj={`embeddablePanelEsqlNotification-${api.uuid}`}
            aria-label={esqlLabel}
          />
        </EuiToolTip>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="upCenter"
      aria-label={esqlLabel}
    >
      <div
        css={css`
          min-width: 300px;
          display: flex;
          flex-direction: column;
          gap: ${euiThemeVars.euiSizeS};
        `}
      >
        <EuiFormLabel>
          {esqlLabel}
        </EuiFormLabel>
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
      </div>
    </EuiPopover>
  );
}
