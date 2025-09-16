/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ForwardedRef, ReactNode } from 'react';
import React, { forwardRef } from 'react';
import { css } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import { EuiToolTip, useEuiTheme } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { MenuItem } from '../../../types';
import { MenuItem as MenuItemComponent } from '../menu_item';
import { useTooltip } from '../../hooks/use_tooltip';
import { BetaBadge } from '../beta_badge';
import { TOOLTIP_OFFSET } from '../../constants';

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
      badgeType,
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

    const getLabelWithBeta = (label: ReactNode) => (
      <div css={betaContentStyles}>
        <span>{label}</span>
        {badgeType && <BetaBadge type={badgeType} isInverted={!isHorizontal} />}
      </div>
    );

    const getTooltipContent = () => {
      if (isHorizontal || (isCollapsed && hasContent)) return null;
      if (isCollapsed) return badgeType ? getLabelWithBeta(children) : children;
      if (!isCollapsed && badgeType)
        return getLabelWithBeta(
          badgeType === 'beta'
            ? i18n.translate('core.ui.chrome.sideNavigation.betaTooltipLabel', {
                defaultMessage: 'Beta',
              })
            : badgeType === 'techPreview'
            ? i18n.translate('core.ui.chrome.sideNavigation.techPreviewTooltipLabel', {
                defaultMessage: 'Tech preview',
              })
            : children
        );

      return null;
    };

    const menuItemContent = isHorizontal && badgeType ? getLabelWithBeta(children) : children;

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
          repositionOnScroll
          offset={TOOLTIP_OFFSET}
        >
          {menuItem}
        </EuiToolTip>
      );
    }

    return menuItem;
  }
);
