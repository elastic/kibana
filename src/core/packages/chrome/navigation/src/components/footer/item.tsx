/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, forwardRef } from 'react';
import type { KeyboardEvent, ForwardedRef, ComponentProps } from 'react';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { EuiButtonIconProps, IconType } from '@elastic/eui';
import { css } from '@emotion/react';

import type { MenuItem } from '../../../types';
import { BetaBadge } from '../beta_badge';
import { NAVIGATION_SELECTOR_PREFIX, TOOLTIP_OFFSET } from '../../constants';
import { focusMainContent } from '../../utils/focus_main_content';
import { useHighContrastModeStyles } from '../../hooks/use_high_contrast_mode_styles';
import { useTooltip } from '../../hooks/use_tooltip';
import { NewItemIndicator } from '../new_item_indicator';

export interface FooterItemProps extends Omit<EuiButtonIconProps, 'iconType'>, MenuItem {
  hasContent?: boolean;
  iconType: IconType;
  isCurrent?: boolean;
  isHighlighted: boolean;
  isNew: boolean;
  label: string;
  onClick?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
}

/**
 * A footer item that leverages the "Toggle button" pattern from EUI.
 *
 * @see {@link https://eui.elastic.co/docs/components/navigation/buttons/button/#toggle-button}
 */
export const FooterItem = forwardRef<HTMLAnchorElement, FooterItemProps>(
  (
    { badgeType, hasContent, iconType, id, isCurrent, isHighlighted, isNew, label, ...props },
    ref: ForwardedRef<HTMLAnchorElement>
  ) => {
    const { euiTheme } = useEuiTheme();
    const { tooltipRef, handleMouseOut } = useTooltip();
    const highContrastModeStyles = useHighContrastModeStyles();

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

    const buttonStyles = css`
      --high-contrast-hover-indicator-color: ${isHighlighted
        ? euiTheme.colors.textPrimary
        : euiTheme.colors.textParagraph};
      ${highContrastModeStyles}
    `;

    const buttonWrapperStyles = css`
      position: relative;
      display: inline-flex;
    `;

    const footerItemTestSubj = `${NAVIGATION_SELECTOR_PREFIX}-footerItem-${id}`;

    const buttonProps: ComponentProps<typeof EuiButtonIcon> & {
      'data-highlighted': string;
      'data-menu-item': string;
    } = {
      'aria-current': isCurrent ? 'page' : undefined,
      'aria-label': label,
      buttonRef: ref,
      color: isHighlighted ? 'primary' : 'text',
      'data-highlighted': isHighlighted ? 'true' : 'false',
      'data-test-subj': footerItemTestSubj,
      'data-menu-item': 'true',
      display: isHighlighted ? 'base' : 'empty',
      iconType: 'empty', // `iconType` is passed in Suspense below
      onKeyDown: handleFooterItemKeyDown,
      size: 's',
      css: buttonStyles,
      ...props,
    };

    const menuItem = (
      <div css={buttonWrapperStyles}>
        <Suspense fallback={<EuiButtonIcon buttonRef={ref} {...buttonProps} />}>
          <EuiButtonIcon buttonRef={ref} {...buttonProps} iconType={iconType || 'empty'} />
        </Suspense>
        {isNew && <NewItemIndicator isHighlighted={isHighlighted} />}
      </div>
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
          anchorProps={{
            css: wrapperStyles,
          }}
          content={tooltipContent}
          disableScreenReaderOutput
          onMouseOut={handleMouseOut}
          position="right"
          ref={tooltipRef}
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
