/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useMemo } from 'react';
import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ToolItem } from '../tool_item';
import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';
import { getHighContrastSeparator } from '../../hooks/use_high_contrast_mode_styles';

const getFooterToolbarWrapperStyles = (euiThemeContext: UseEuiTheme, isCollapsed: boolean) => {
  const { euiTheme: theme } = euiThemeContext;
  return css`
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: ${theme.size.xs};
    justify-content: center;
    padding-top: ${isCollapsed ? theme.size.s : theme.size.m};
    position: relative;
    width: 100%;

    ${getHighContrastSeparator(euiThemeContext, { side: 'top' })}
  `;
};

export interface FooterToolbarProps {
  children?: ReactNode;
  isCollapsed: boolean;
}

interface FooterToolbarComponent
  extends ForwardRefExoticComponent<FooterToolbarProps & RefAttributes<HTMLDivElement>> {
  Item: typeof ToolItem;
}

const FooterToolbarBase = forwardRef<HTMLDivElement, FooterToolbarProps>(
  ({ children, isCollapsed }, ref) => {
    const euiThemeContext = useEuiTheme();

    const wrapperStyles = useMemo(
      () => getFooterToolbarWrapperStyles(euiThemeContext, isCollapsed),
      [euiThemeContext, isCollapsed]
    );

    return (
      <div
        aria-label={i18n.translate('core.ui.chrome.sideNavigation.footerToolbarAriaLabel', {
          defaultMessage: 'Side navigation tools',
        })}
        css={wrapperStyles}
        data-test-subj={`${NAVIGATION_SELECTOR_PREFIX}-footerToolbar`}
        ref={ref}
        role="group"
      >
        {children}
      </div>
    );
  }
);

export const FooterToolbar = Object.assign(FooterToolbarBase, {
  Item: ToolItem,
}) satisfies FooterToolbarComponent;
