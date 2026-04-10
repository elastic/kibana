/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiNotificationBadge, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { FC } from 'react';
import {
  BADGE_COMPLETED_LABEL,
  BADGE_FAILED_LABEL,
  BADGE_RUNNING_LABEL,
  EXECUTION_TRACKER_TITLE,
} from './translations';
import type { ExecutionTrackerService } from '../execution_tracker_service';

interface ExecutionTrackerBadgeProps {
  service: ExecutionTrackerService;
}

/**
 * Compact icon button that shows execution counts on hover and opens the
 * execution tracker flyout on click. Designed to be rendered in the Chrome
 * header via `chrome.navControls.registerRight()`.
 */
export const ExecutionTrackerBadge: FC<ExecutionTrackerBadgeProps> = ({ service }) => {
  const { euiTheme } = useEuiTheme();

  const subscribe = useCallback(
    (cb: () => void) => {
      const sub = service.state$.subscribe(cb);
      return () => sub.unsubscribe();
    },
    [service]
  );
  const getSnapshot = useCallback(() => service.state$.getValue(), [service]);
  const state = useSyncExternalStore(subscribe, getSnapshot);

  const { counts, isFlyoutOpen } = state;

  const tooltipContent = useMemo(() => {
    const parts: string[] = [];
    if (counts.running > 0) {
      parts.push(BADGE_RUNNING_LABEL(counts.running));
    }
    if (counts.completed > 0) {
      parts.push(BADGE_COMPLETED_LABEL(counts.completed));
    }
    if (counts.failed > 0) {
      parts.push(BADGE_FAILED_LABEL(counts.failed));
    }
    return parts.join(', ');
  }, [counts]);

  return (
    <EuiToolTip content={tooltipContent || EXECUTION_TRACKER_TITLE} position="bottom">
      <span
        css={css`
          position: relative;
          display: inline-flex;
        `}
      >
        <EuiButtonIcon
          iconType="workflow"
          aria-label={EXECUTION_TRACKER_TITLE}
          onClick={service.toggleFlyout}
          color={isFlyoutOpen ? 'primary' : 'text'}
          size="s"
        />
        {counts.total > 0 && (
          <EuiNotificationBadge
            css={css`
              position: absolute;
              top: -${euiTheme.size.xs};
              right: -${euiTheme.size.xs};
              pointer-events: none;
            `}
            color={counts.failed > 0 ? 'accent' : counts.completed > 0 ? 'success' : 'subdued'}
          >
            {counts.total}
          </EuiNotificationBadge>
        )}
      </span>
    </EuiToolTip>
  );
};
