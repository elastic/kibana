/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, ForwardedRef, ReactNode } from 'react';
import { css } from '@emotion/react';
import { EuiToolTip, IconType, useEuiTheme } from '@elastic/eui';

import { MenuItem } from '../../../types';
import { MenuItem as MenuItemComponent } from '../menu_item';
import { useTooltip } from '../../hooks/use_tooltip';
import { BetaBadge } from '../beta_badge';

export interface SideNavPrimaryMenuItemProps extends MenuItem {
  as?: 'a' | 'button';
  children: ReactNode;
  hasContent?: boolean;
  iconType: IconType;
  isActive: boolean;
  isCollapsed: boolean;
  isHorizontal?: boolean;
  onClick?: () => void;
}

export const SideNavPrimaryMenuItem = forwardRef<HTMLAnchorElement, SideNavPrimaryMenuItemProps>(
  (
    {
      children,
      hasContent,
      href,
      iconType,
      id,
      isActive,
      isCollapsed,
      isHorizontal,
      isBeta,
      ...props
    },
    ref: ForwardedRef<HTMLAnchorElement>
  ): JSX.Element => {
    const { euiTheme } = useEuiTheme();
    const { tooltipRef, handleMouseOut } = useTooltip();

    const wrapperStyles = css`
      display: flex;
      justify-content: center;
      width: 100%;
    `;

    const betaContentStyles = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
    `;

    const getLabelWithBeta = () => (
      <div css={betaContentStyles}>
        <span>{children}</span>
        <BetaBadge isInverted={!isHorizontal} />
      </div>
    );

    const getTooltipContent = () => {
      if (isHorizontal || (isCollapsed && hasContent)) return null;
      if (isCollapsed) return isBeta ? getLabelWithBeta() : children;
      if (!isCollapsed && isBeta) return <BetaBadge isInverted />;

      return null;
    };

    const menuItemContent = isHorizontal && isBeta ? getLabelWithBeta() : children;

    const menuItem = (
      <MenuItemComponent
        data-test-subj={`sideNavPrimaryMenuItem-${id}`}
        href={href}
        iconType={iconType}
        isActive={isActive}
        isHorizontal={isHorizontal}
        isLabelVisible={isHorizontal ? true : !isCollapsed}
        ref={ref}
        {...props}
      >
        {menuItemContent}
      </MenuItemComponent>
    );

    const tooltipContent = getTooltipContent();

    if (tooltipContent) {
      return (
        <EuiToolTip
          ref={tooltipRef}
          anchorProps={{ css: wrapperStyles }}
          content={tooltipContent}
          disableScreenReaderOutput
          onMouseOut={handleMouseOut}
          position="right"
        >
          {menuItem}
        </EuiToolTip>
      );
    }

    return menuItem;
  }
);
