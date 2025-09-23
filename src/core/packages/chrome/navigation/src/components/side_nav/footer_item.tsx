/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KeyboardEvent, ForwardedRef } from 'react';
import React, { forwardRef } from 'react';
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

    const menuItem = (
      <EuiButtonIcon
        aria-current={isCurrent ? 'page' : undefined}
        aria-label={label}
        color={isHighlighted ? 'primary' : 'text'}
        data-highlighted={isHighlighted ? 'true' : 'false'}
        data-test-subj={`footerMenuItem-${id}`}
        display={isHighlighted ? 'base' : 'empty'}
        iconType={iconType || 'empty'}
        size="s"
        {...props}
      />
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
