/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { IconType } from '@elastic/eui';
import { EuiBadge, EuiBetaBadge, EuiThemeProvider, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import type { BadgeType } from '../../../types';

interface BetaBadgeProps {
  type: BadgeType;
  isInverted?: boolean;
  alignment?: 'bottom' | 'text-bottom';
}

interface BadgeConfig {
  iconType?: IconType;
  label: string;
}

/**
 * A badge to indicate that a feature is in beta, tech preview, or new.
 * It can be aligned to the middle or bottom of the text.
 */
export const BetaBadge = ({ type, isInverted, alignment = 'bottom' }: BetaBadgeProps) => {
  const { euiTheme } = useEuiTheme();
  const isNew = type === 'new';
  const betaBadgeStyles = css`
    vertical-align: ${alignment === 'text-bottom' ? 'text-bottom' : 'bottom'};
  `;

  const config: Record<BadgeType, BadgeConfig> = {
    techPreview: {
      iconType: 'flask',
      label: i18n.translate('core.ui.chrome.sideNavigation.techPreviewBadgeLabel', {
        defaultMessage: 'Tech preview',
      }),
    },
    beta: {
      iconType: 'beta',
      label: i18n.translate('core.ui.chrome.sideNavigation.betaBadgeLabel', {
        defaultMessage: 'Beta',
      }),
    },
    new: {
      label: i18n.translate('core.ui.chrome.sideNavigation.newBadgeLabel', {
        defaultMessage: 'New',
      }),
    },
  };

  return (
    <EuiThemeProvider colorMode={isInverted ? 'dark' : undefined}>
      {isNew ? (
        <EuiBadge children={config[type].label} color={euiTheme.colors.backgroundFilledPrimary} />
      ) : (
        <EuiBetaBadge
          css={betaBadgeStyles}
          iconType={config[type].iconType}
          label={config[type].label}
          size="s"
        />
      )}
    </EuiThemeProvider>
  );
};
