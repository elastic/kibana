/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiIcon,
  EuiToolTip,
  euiCanAnimate,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';

import type { SecondaryMenuItem } from '../../../types';
import { BetaBadge } from '../beta_badge';
import { useHighContrastModeStyles } from '../../hooks/use_high_contrast_mode_styles';
import { useScrollToActive } from '../../hooks/use_scroll_to_active';
import { useOverflowWidth } from '../../hooks/use_overflow_width';
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
  const [labelRef, labelOverflowWidth] = useOverflowWidth<HTMLSpanElement>();
  const isLabelOverflowing = labelOverflowWidth > 0;
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

  // Slide the hidden part of the label into view at a steady speed after a short
  // hover delay; snap back instantly on mouse leave. The measured width comes in as a
  // unitless CSS variable so these classes stay static across items.
  const marqueeDelay = euiTheme.animation.slow;
  const marqueeDuration = 'calc(var(--label-overflow-width) * 20ms)';
  const fadeWidth = euiTheme.size.l;
  const fadeDuration = euiTheme.animation.normal;

  // Each edge fades only while text is hidden past it: the start fade comes in as the
  // slide begins, the end fade goes out as it finishes. Registered properties let the
  // gradient stops animate. Keyframes instead of transitions because a delayed custom
  // property transition can outlive a quick hover, showing the start fade at rest.
  const fadeStartIn = keyframes`
    from {
      --label-fade-start: 0px;
    }
    to {
      --label-fade-start: ${fadeWidth};
    }
  `;
  const fadeEndOut = keyframes`
    from {
      --label-fade-end: ${fadeWidth};
    }
    to {
      --label-fade-end: 0px;
    }
  `;

  const labelTextStyles = css`
    display: block;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    ${isLabelOverflowing &&
    css`
      @property --label-fade-start {
        syntax: '<length>';
        inherits: false;
        initial-value: 0px;
      }
      @property --label-fade-end {
        syntax: '<length>';
        inherits: false;
        initial-value: 0px;
      }
      --label-fade-start: 0px;
      --label-fade-end: ${fadeWidth};
      mask-image: linear-gradient(
        to right,
        transparent,
        black var(--label-fade-start),
        black calc(100% - var(--label-fade-end)),
        transparent
      );
      button:hover &,
      a:hover & {
        --label-fade-start: ${fadeWidth};
        --label-fade-end: 0px;
        ${euiCanAnimate} {
          animation: ${fadeStartIn} ${fadeDuration} ${marqueeDelay} both,
            ${fadeEndOut} ${fadeDuration}
              calc(${marqueeDelay} + ${marqueeDuration} - ${fadeDuration}) both;
        }
      }
    `}
  `;

  const labelInnerStyles = css`
    display: inline-block;
    ${isLabelOverflowing &&
    css`
      button:hover &,
      a:hover & {
        transform: translateX(calc(var(--label-overflow-width) * -1px));
        ${euiCanAnimate} {
          transition: transform ${marqueeDuration} linear ${marqueeDelay};
        }
      }
    `}
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

  const content = (
    <div css={labelAndBadgeStyles}>
      <span
        ref={labelRef}
        css={labelTextStyles}
        style={
          isLabelOverflowing
            ? ({ '--label-overflow-width': labelOverflowWidth } as CSSProperties)
            : undefined
        }
      >
        <span css={labelInnerStyles}>{children}</span>
      </span>
      {getBadge()}
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
