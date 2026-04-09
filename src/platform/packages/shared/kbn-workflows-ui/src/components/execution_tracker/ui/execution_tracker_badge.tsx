/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import type { FC } from 'react';
import { BADGE_COMPLETED_LABEL, BADGE_FAILED_LABEL, BADGE_RUNNING_LABEL } from './translations';
import { useExecutionTracker } from '../model/execution_tracker_context';

export const ExecutionTrackerBadge: FC = () => {
  const { counts, isFlyoutOpen, setFlyoutOpen } = useExecutionTracker();
  const { euiTheme } = useEuiTheme();

  const toggleFlyout = useCallback(() => {
    setFlyoutOpen(!isFlyoutOpen);
  }, [isFlyoutOpen, setFlyoutOpen]);

  if (counts.total === 0) {
    return null;
  }

  return (
    <div
      css={css`
        position: fixed;
        bottom: ${euiTheme.size.l};
        right: ${euiTheme.size.l};
        z-index: ${Number(euiTheme.levels.flyout) - 1};
        cursor: pointer;
      `}
      onClick={toggleFlyout}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          toggleFlyout();
        }
      }}
    >
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
        {counts.running > 0 && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="primary">{BADGE_RUNNING_LABEL(counts.running)}</EuiBadge>
          </EuiFlexItem>
        )}
        {counts.completed > 0 && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="success">{BADGE_COMPLETED_LABEL(counts.completed)}</EuiBadge>
          </EuiFlexItem>
        )}
        {counts.failed > 0 && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="danger">{BADGE_FAILED_LABEL(counts.failed)}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};
