/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBetaBadge, EuiThemeProvider } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import type { BadgeType } from '../../../types';

interface BetaBadgeProps {
  type: BadgeType;
  isInverted?: boolean;
  alignment?: 'bottom' | 'text-bottom';
}

/**
 * A badge to indicate that a feature is in beta.
 * It can be aligned to the middle or bottom of the text.
 */
export const BetaBadge = ({ type, isInverted, alignment = 'bottom' }: BetaBadgeProps) => {
  const betaBadgeStyles = css`
    vertical-align: ${alignment === 'text-bottom' ? 'text-bottom' : 'bottom'};
  `;

  const config =
    type === 'techPreview'
      ? {
          iconType: 'flask',
          label: i18n.translate('core.ui.chrome.sideNavigation.techPreviewBadgeLabel', {
            defaultMessage: 'Tech preview',
          }),
        }
      : {
          iconType: 'beta',
          label: i18n.translate('core.ui.chrome.sideNavigation.betaBadgeLabel', {
            defaultMessage: 'Beta',
          }),
        };

  return (
    <EuiThemeProvider
      colorMode={isInverted ? 'inverse' : undefined}
      wrapperProps={{ cloneElement: true }}
    >
      <EuiBetaBadge
        css={betaBadgeStyles}
        iconType={config.iconType}
        label={config.label}
        size="s"
      />
    </EuiThemeProvider>
  );
};
