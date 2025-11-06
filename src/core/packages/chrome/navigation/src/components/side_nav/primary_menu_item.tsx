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
  isHighlighted: boolean;
  isCurrent?: boolean;
  isCollapsed: boolean;
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
      isHighlighted,
      isCurrent,
      isCollapsed,
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

    const badgeLabel =
      badgeType === 'beta'
        ? i18n.translate('core.ui.chrome.sideNavigation.betaTooltipLabel', {
            defaultMessage: 'Beta',
          })
        : badgeType === 'techPreview'
        ? i18n.translate('core.ui.chrome.sideNavigation.techPreviewTooltipLabel', {
            defaultMessage: 'Tech preview',
          })
        : undefined;

    const getLabelWithBeta = (label: ReactNode) => (
      <div css={betaContentStyles}>
        <span>{label}</span>
        {badgeType && <BetaBadge type={badgeType} isInverted />}
      </div>
    );

    const getTooltipContent = () => {
      if (hasContent) return null;
      if (isCollapsed) return badgeType ? getLabelWithBeta(children) : children;
      if (!isCollapsed && badgeType) return getLabelWithBeta(badgeLabel ? badgeLabel : children);

      return null;
    };

    const menuItem = (
      <MenuItemComponent
        data-test-subj={`sideNavPrimaryMenuItem-${id}`}
        href={href}
        iconType={iconType}
        id={id}
        isCurrent={isCurrent}
        isHighlighted={isHighlighted}
        isLabelVisible={!isCollapsed}
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
