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
import { useTooltip } from '../../hooks/use_tooltip';
import { BetaBadge } from '../beta_badge';
import { TOOLTIP_OFFSET } from '../../constants';

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
export const SideNavFooterItem = forwardRef<HTMLDivElement, SideNavFooterItemProps>(
  (
    { badgeType, hasContent, iconType, id, isHighlighted, isCurrent, label, ...props },
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const { euiTheme } = useEuiTheme();
    const { tooltipRef, handleMouseOut } = useTooltip();

    const wrapperStyles = css`
      display: flex;
      justify-content: center;
      width: 100%;
    `;

    const buttonProps: ComponentProps<typeof EuiButtonIcon> & { 'data-highlighted': string } = {
      'aria-current': isCurrent ? 'page' : undefined,
      'aria-label': label,
      color: isHighlighted ? 'primary' : 'text',
      'data-test-subj': `footerMenuItem-${id}`,
      'data-highlighted': isHighlighted ? 'true' : 'false',
      display: isHighlighted ? 'base' : 'empty',
      size: 's',
      iconType: 'empty', // iconType is passed in Suspense below
      ...props,
    };

    const menuItem = (
      <Suspense fallback={<EuiButtonIcon {...buttonProps} />}>
        <EuiButtonIcon {...buttonProps} iconType={iconType || 'empty'} />
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

    return (
      <div ref={ref} css={wrapperStyles}>
        {menuItem}
      </div>
    );
  }
);
