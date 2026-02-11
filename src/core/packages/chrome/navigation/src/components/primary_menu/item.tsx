/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef } from 'react';
import type { ForwardedRef, ReactNode } from 'react';
import { EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { css } from '@emotion/react';

import type { MenuItem } from '../../../types';
import { BetaBadge } from '../beta_badge';
import { MenuItem as MenuItemComponent } from '../menu_item';
import { NAVIGATION_SELECTOR_PREFIX, TOOLTIP_OFFSET } from '../../constants';
import { useTooltip } from '../../hooks/use_tooltip';

export interface PrimaryMenuItemProps extends Omit<MenuItem, 'href'> {
  as?: 'a' | 'button';
  children: ReactNode;
  hasContent?: boolean;
  href?: string;
  iconType: IconType;
  isCollapsed: boolean;
  isCurrent?: boolean;
  isHighlighted: boolean;
  isHorizontal?: boolean;
  isNew: boolean;
  onClick?: () => void;
  'aria-posinset'?: number;
  'aria-setsize'?: number;
}

export const PrimaryMenuItem = forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  PrimaryMenuItemProps
>(
  (
    {
      badgeType,
      children,
      hasContent,
      href,
      iconType,
      id,
      isCollapsed,
      isCurrent,
      isHighlighted,
      isHorizontal,
      isNew,
      ...props
    },
    ref: ForwardedRef<HTMLAnchorElement | HTMLButtonElement>
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

    const getBadgeContent = (label?: ReactNode) => (
      <div css={betaContentStyles}>
        {label && <span>{label}</span>}
        {badgeType && <BetaBadge type={badgeType} isInverted />}
      </div>
    );

    const getTooltipContent = () => {
      if (hasContent) return null;
      if (isCollapsed) return badgeType ? getBadgeContent(children) : children;
      if (!isCollapsed && badgeType) return getBadgeContent();

      return null;
    };

    const primaryItemTestSubj = `${NAVIGATION_SELECTOR_PREFIX}-primaryItem-${id}`;

    const menuItem = (
      <MenuItemComponent
        data-test-subj={primaryItemTestSubj}
        href={href}
        iconType={iconType}
        id={id}
        isCurrent={isCurrent}
        isHighlighted={isHighlighted}
        isLabelVisible={!isCollapsed}
        isNew={isNew}
        ref={ref}
        {...props}
      >
        {children}
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
