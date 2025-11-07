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

import type { SecondaryMenuItem } from '../../../types';
import { BetaBadge } from '../beta_badge';
import { useHighContrastModeStyles } from '../../hooks/use_high_contrast_mode_styles';
import { useScrollToActive } from '../../hooks/use_scroll_to_active';
import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';

export interface SecondaryMenuItemProps extends Omit<SecondaryMenuItem, 'href'> {
  children: ReactNode;
  hasSubmenu?: boolean;
  href?: string;
  iconType?: IconType;
  isCurrent?: boolean;
  isHighlighted: boolean;
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

  const content = (
    <div css={labelAndBadgeStyles}>
      {children}
      {badgeType && <BetaBadge type={badgeType} />}
    </div>
  );

  return (
    <li ref={activeItemRef}>
      {isHighlighted ? (
        <EuiButton
          id={id}
          aria-current={isCurrent ? 'page' : undefined}
          id={id}
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
          id={id}
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
