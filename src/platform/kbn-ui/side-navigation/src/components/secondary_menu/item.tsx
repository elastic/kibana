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
import { EuiButton, EuiButtonEmpty, EuiIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { css } from '@emotion/react';

import type { SecondaryMenuItem } from '../../../types';
import { BetaBadge } from '../beta_badge';
import { useHighContrastModeStyles } from '../../hooks/use_high_contrast_mode_styles';
import { useScrollToActive } from '../../hooks/use_scroll_to_active';
import { useLabelMarquee } from '../../hooks/use_label_marquee';
import { NAVIGATION_SELECTOR_PREFIX, TOOLTIP_OFFSET } from '../../constants';

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
    iconType: isExternal ? 'external' : iconType,
    ...(isExternal && { target: '_blank' }),
  };
  const submenuIconClassName = `${NAVIGATION_SELECTOR_PREFIX}-submenuIcon`;

  const buttonStyles = css`
    font-weight: ${isHighlighted ? euiTheme.font.weight.semiBold : euiTheme.font.weight.regular};
    // 6px comes from Figma, no token
    padding: 6px ${euiTheme.size.s};
    width: 100%;

    > span {
      justify-content: ${iconSide === 'left' ? 'flex-start' : 'space-between'};
    }

    svg:not(.euiBetaBadge__icon):not(.${submenuIconClassName}) {
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
    flex: 1;
    gap: ${euiTheme.size.xs};
    min-width: 0;
  `;

  const submenuIconStyles = css`
    flex-shrink: 0;
    margin-left: auto;
    opacity: 0.6;
  `;

  /* Always show non-new badges. Show new ones if isNew check allows it
  badgeType might be undefined for primary items with new secondary items,
  we still want to show the new badge in nested menu if the child item is new */
  const getBadge = () => {
    if (badgeType && badgeType !== 'new') return <BetaBadge type={badgeType} />;
    if (isNew) return <BetaBadge type="new" />;
  };
  const badge = getBadge();

  const {
    isOverflowing: isLabelOverflowing,
    labelProps,
    trackProps,
  } = useLabelMarquee({
    gutter: euiTheme.size.s,
    isLabelFirst: !iconType,
    isLabelLast: !badge && !hasSubmenu && !isExternal,
  });

  const content = (
    <div css={labelAndBadgeStyles}>
      <span {...labelProps}>
        <span {...trackProps}>{children}</span>
      </span>
      {badge}
      {hasSubmenu && (
        <EuiIcon
          aria-hidden={true}
          className={submenuIconClassName}
          color={euiTheme.colors.textDisabled}
          css={submenuIconStyles}
          size="m"
          type="chevronSingleRight"
        />
      )}
    </div>
  );

  return (
    <li ref={activeItemRef} role="none">
      {/* Always rendered so the measured label never remounts; empty content never shows. */}
      <EuiToolTip
        content={isLabelOverflowing ? children : undefined}
        disableScreenReaderOutput
        display="block"
        offset={TOOLTIP_OFFSET}
        position="right"
        repositionOnScroll
      >
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
      </EuiToolTip>
    </li>
  );
};
