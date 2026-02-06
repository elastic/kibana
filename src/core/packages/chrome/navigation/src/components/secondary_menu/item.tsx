/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiButton, EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { css } from '@emotion/react';

import { SIDE_PANEL_CONTENT_GAP } from '@kbn/core-chrome-layout-constants';
import type { SecondaryMenuItem } from '../../../types';
import { BetaBadge } from '../beta_badge';
import { useHighContrastModeStyles } from '../../hooks/use_high_contrast_mode_styles';
import { useScrollToActive } from '../../hooks/use_scroll_to_active';
import {
  BADGE_SPACING_OFFSET,
  ITEM_HORIZONTAL_SPACING_OFFSET,
  NAVIGATION_SELECTOR_PREFIX,
  SUB_MENU_ICON_SPACING_OFFSET,
} from '../../constants';
import { SIDE_PANEL_WIDTH } from '../../hooks/use_layout_width';

export interface SecondaryMenuItemProps extends Omit<SecondaryMenuItem, 'href'> {
  children: ReactNode;
  hasSubmenu?: boolean;
  href?: string;
  iconType?: IconType;
  isCurrent?: boolean;
  isHighlighted: boolean;
  isNew?: boolean;
  onClick?: () => void;
  testSubjPrefix?: string;
}

/**
 * `EuiButton` and `EuiButtonEmpty` are used for consistency with the component library.
 * The only style overrides are making the button labels left-aligned.
 */
export const SecondaryMenuItemComponent = ({
  badgeType,
  children,
  hasSubmenu,
  href,
  iconType,
  id,
  isCurrent,
  isExternal,
  isHighlighted,
  isNew = false,
  testSubjPrefix,
  ...props
}: SecondaryMenuItemProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const highContrastModeStyles = useHighContrastModeStyles();
  const activeItemRef = useScrollToActive<HTMLLIElement>(isCurrent);
  const resolvedTestSubjPrefix = testSubjPrefix ?? `${NAVIGATION_SELECTOR_PREFIX}-secondaryItem`;

  const iconSide = iconType ? 'left' : 'right';
  const iconProps = {
    iconSide: iconSide as 'left' | 'right',
    iconType: isExternal ? 'popout' : iconType,
    ...(isExternal && { target: '_blank' }),
  };

  const buttonStyles = css`
    font-weight: ${isHighlighted ? euiTheme.font.weight.semiBold : euiTheme.font.weight.regular};
    // 6px comes from Figma, no token
    padding: 6px ${euiTheme.size.s};
    width: 100%;

    > span {
      justify-content: ${iconSide === 'left' ? 'flex-start' : 'space-between'};
    }

    svg:not(.euiBetaBadge__icon) {
      color: ${iconSide === 'right' ? euiTheme.colors.textDisabled : 'inherit'};
    }

    --high-contrast-hover-indicator-color: ${isHighlighted
      ? euiTheme.colors.textPrimary
      : euiTheme.colors.textParagraph};
    ${highContrastModeStyles};
  `;

  const labelAndBadgeStyles = css`
    align-items: center;
    display: flex;
    gap: ${euiTheme.size.xs};
  `;

  const getMaxWidth = () => {
    const isInSidePanel = testSubjPrefix?.includes('sidePanel');
    let maxWidth = SIDE_PANEL_WIDTH - ITEM_HORIZONTAL_SPACING_OFFSET;
    // Secondary item label inside side panel (narrower)
    if (isInSidePanel) maxWidth -= SIDE_PANEL_CONTENT_GAP;
    // Secondary item label + badge
    if (isNew || badgeType) maxWidth -= BADGE_SPACING_OFFSET;
    // Secondary item label + right arrow (More menu)
    if (hasSubmenu) maxWidth -= SUB_MENU_ICON_SPACING_OFFSET;
    return maxWidth;
  };

  const labelTextStyles = css`
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: ${getMaxWidth()}px;
  `;

  /* Always show non-new badges. Show new ones if isNew check allows it
  badgeType might be undefined for primary items with new secondary items,
  we still want to show the new badge in nested menu if the child item is new */
  const getBadge = () => {
    if (badgeType && badgeType !== 'new') return <BetaBadge type={badgeType} />;
    if (isNew) return <BetaBadge type="new" />;
  };

  const content = (
    <div css={labelAndBadgeStyles}>
      <span css={labelTextStyles} title={typeof children === 'string' ? children : undefined}>
        {children}
      </span>
      {getBadge()}
    </div>
  );

  return (
    <li ref={activeItemRef} role="none">
      {isHighlighted ? (
        <EuiButton
          id={id}
          aria-current={isCurrent ? 'page' : undefined}
          css={buttonStyles}
          data-highlighted="true"
          data-test-subj={`${resolvedTestSubjPrefix}-${id}`}
          fullWidth
          href={hasSubmenu ? undefined : href}
          size="s"
          textProps={false}
          {...iconProps}
          {...props}
        >
          {content}
        </EuiButton>
      ) : (
        <EuiButtonEmpty
          id={id}
          aria-current={isCurrent ? 'page' : undefined}
          color="text"
          css={buttonStyles}
          data-highlighted="false"
          data-test-subj={`${resolvedTestSubjPrefix}-${id}`}
          href={hasSubmenu ? undefined : href}
          size="s"
          textProps={false}
          {...iconProps}
          {...props}
        >
          {content}
        </EuiButtonEmpty>
      )}
    </li>
  );
};
