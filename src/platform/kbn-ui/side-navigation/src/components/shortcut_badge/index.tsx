/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiNotificationBadge, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';

interface ShortcutBadgeProps {
  number: number;
}

/**
 * Decorative number on the top-right corner of a primary nav icon button.
 */
export const ShortcutBadge = ({ number }: ShortcutBadgeProps) => {
  const { euiTheme } = useEuiTheme();

  // Inset past the icon button's rounded corner so the badge sits inside the stroke.
  const badgeStyles = css`
    position: absolute;
    top: ${euiTheme.size.xxs};
    right: ${euiTheme.size.xxs};
    display: flex;
    line-height: 0;
    pointer-events: none;
    z-index: ${euiTheme.levels.content};
    opacity: 0.85;
  `;

  return (
    <span
      aria-hidden={true}
      css={badgeStyles}
      data-test-subj={`${NAVIGATION_SELECTOR_PREFIX}-shortcutBadge`}
    >
      <EuiNotificationBadge aria-hidden={true} color="subdued">
        {number}
      </EuiNotificationBadge>
    </span>
  );
};
