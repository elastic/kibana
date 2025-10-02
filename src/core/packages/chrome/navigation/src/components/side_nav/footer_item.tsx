/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KeyboardEvent, ForwardedRef, ComponentProps } from 'react';
import React, { Suspense, forwardRef } from 'react';
import { css } from '@emotion/react';
import type { EuiButtonIconProps, IconType } from '@elastic/eui';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';

import type { MenuItem } from '../../../types';
import { BetaBadge } from '../beta_badge';
import { TOOLTIP_OFFSET } from '../../constants';
import { focusMainContent } from '../../utils/focus_main_content';
import { useTooltip } from '../../hooks/use_tooltip';

export interface SideNavFooterItemProps extends Omit<EuiButtonIconProps, 'iconType'>, MenuItem {
  hasContent?: boolean;
  iconType: IconType;
  isHighlighted: boolean;
  isCurrent?: boolean;
  label: string;
  onClick?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
}

/**
 * Toggle button pattern: https://eui.elastic.co/docs/components/navigation/buttons/button/#toggle-button
 */
export const SideNavFooterItem = forwardRef<HTMLAnchorElement, SideNavFooterItemProps>(
  (
    { badgeType, hasContent, iconType, id, isCurrent, isHighlighted, label, ...props },
    ref: ForwardedRef<HTMLAnchorElement>
  ) => {
    const { euiTheme } = useEuiTheme();
    const { tooltipRef, handleMouseOut } = useTooltip();

    const handleFooterItemKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        // Required for entering the popover with Enter or Space key
        // Otherwise the navigation happens immediately
        e.preventDefault();
        focusMainContent();
      }
    };

    const wrapperStyles = css`
      display: flex;
      justify-content: center;
      width: 100%;
    `;

    const buttonProps: ComponentProps<typeof EuiButtonIcon> & {
      'data-highlighted': string;
      'data-menu-item': string;
    } = {
      'aria-current': isCurrent ? 'page' : undefined,
      'aria-label': label,
      buttonRef: ref,
      color: isHighlighted ? 'primary' : 'text',
      'data-highlighted': isHighlighted ? 'true' : 'false',
      'data-test-subj': `footerMenuItem-${id}`,
      'data-menu-item': 'true',
      display: isHighlighted ? 'base' : 'empty',
      iconType: 'empty', // `iconType` is passed in Suspense below
      onKeyDown: handleFooterItemKeyDown,
      size: 's',
      ...props,
    };

    const menuItem = (
      <Suspense fallback={<EuiButtonIcon buttonRef={ref} {...buttonProps} />}>
        <EuiButtonIcon buttonRef={ref} {...buttonProps} iconType={iconType || 'empty'} />
      </Suspense>
    );

    if (!hasContent) {
      const tooltipStyles = css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.s};
      `;
      const tooltipContent = badgeType ? (
        <span css={tooltipStyles}>
          {label}
          <BetaBadge type={badgeType} isInverted />
        </span>
      ) : (
        label
      );

      return (
        <EuiToolTip
          ref={tooltipRef}
          anchorProps={{
            css: wrapperStyles,
          }}
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

    return <div css={wrapperStyles}>{menuItem}</div>;
  }
);
