/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, forwardRef } from 'react';
import type { ReactNode, HTMLAttributes, ForwardedRef } from 'react';
import { EuiIcon, EuiScreenReaderOnly, EuiText, euiFontSize, useEuiTheme } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { css } from '@emotion/react';

import { useHighContrastModeStyles } from '../../hooks/use_high_contrast_mode_styles';

export interface MenuItemProps extends HTMLAttributes<HTMLAnchorElement | HTMLButtonElement> {
  as?: 'a' | 'button';
  children: ReactNode;
  href?: string;
  iconSize?: 's' | 'm';
  iconType: IconType;
  isHighlighted: boolean;
  isCurrent?: boolean;
  isLabelVisible?: boolean;
  isTruncated?: boolean;
}

export const MenuItem = forwardRef<HTMLAnchorElement | HTMLButtonElement, MenuItemProps>(
  (
    {
      as = 'a',
      children,
      href,
      iconSize = 's',
      iconType,
      id,
      isCurrent = false,
      isHighlighted,
      isLabelVisible = true,
      isTruncated = true,
      ...props
    },
    ref
  ): JSX.Element => {
    const euiThemeContext = useEuiTheme();
    const { euiTheme } = euiThemeContext;

    const isSingleWord = typeof children === 'string' && !children.includes(' ');

    const buttonStyles = css`
      --menu-item-text-color: ${isHighlighted
        ? euiTheme.components.buttons.textColorPrimary
        : euiTheme.components.buttons.textColorText};
      --high-contrast-hover-indicator-color: var(--menu-item-text-color);
      ${useHighContrastModeStyles('.iconWrapper')};

      width: 100%;
      position: relative;
      overflow: hidden;
      align-items: center;
      justify-content: center;
      display: flex;
      flex-direction: column;
      /* 3px is from Figma; there is no token */
      gap: 3px;
      /* eslint-disable-next-line @elastic/eui/no-css-color */
      color: var(--menu-item-text-color);
      /* Focus affordance with border on the iconWrapper instead */
      outline: none !important;

      .iconWrapper {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        height: ${euiTheme.size.xl};
        width: ${euiTheme.size.xl};
        border-radius: ${euiTheme.border.radius.medium};
        background-color: ${isHighlighted
          ? euiTheme.components.buttons.backgroundPrimary
          : euiTheme.components.buttons.backgroundText};
        z-index: 1;
      }

      .iconWrapper::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: ${euiTheme.border.radius.medium};
        background-color: transparent;
        z-index: 0;
      }

      /* TODO: consider using euiFocusRing (source: https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) */
      &:focus-visible .iconWrapper {
        border: ${euiTheme.border.width.thick} solid
          ${isHighlighted ? euiTheme.colors.textPrimary : euiTheme.colors.textParagraph};
      }

      &:hover .iconWrapper::before {
        background-color: ${isHighlighted
          ? euiTheme.components.buttons.backgroundPrimaryHover
          : euiTheme.components.buttons.backgroundTextHover};
      }

      &:active .iconWrapper::before {
        background-color: ${isHighlighted
          ? euiTheme.components.buttons.backgroundPrimaryActive
          : euiTheme.components.buttons.backgroundTextActive};
      }
    `;

    const truncatedStyles =
      isTruncated &&
      (isSingleWord
        ? css`
            /* Single word: stay on one line, truncate with ellipsis */
            white-space: nowrap;
            text-overflow: ellipsis;
          `
        : css`
            /* Multiple words: allow wrapping to 2 lines */
            display: -webkit-box;
            -webkit-box-orient: vertical;
            line-clamp: 2;
            -webkit-line-clamp: 2;
          `);

    const textStyles = css`
      ${euiFontSize(euiThemeContext, 'xxs', { unit: 'px' }).fontSize};
      font-weight: ${euiTheme.font.weight.semiBold};
    `;

    const labelStyles = css`
      ${truncatedStyles}
      ${textStyles}
      overflow: hidden;
      max-width: 100%;
      padding: 0 ${euiTheme.size.s};
    `;

    const content = (
      <>
        <div className="iconWrapper">
          <Suspense fallback={<EuiIcon aria-hidden color="currentColor" type="empty" />}>
            <EuiIcon aria-hidden color="currentColor" type={iconType || 'empty'} />
          </Suspense>
        </div>
        {isLabelVisible ? (
          <EuiText size="xs" textAlign="center" css={labelStyles}>
            {children}
          </EuiText>
        ) : (
          <EuiScreenReaderOnly>
            <EuiText>{children}</EuiText>
          </EuiScreenReaderOnly>
        )}
      </>
    );

    const commonProps = {
      css: buttonStyles,
      'data-menu-item': true,
      'data-highlighted': isHighlighted ? 'true' : 'false',
      ...props,
    };

    if (as === 'button') {
      return (
        <button id={id} ref={ref as ForwardedRef<HTMLButtonElement>} {...commonProps}>
          {content}
        </button>
      );
    }

    return (
      <a
        aria-current={isCurrent ? 'page' : undefined}
        href={href}
        id={id}
        ref={ref as ForwardedRef<HTMLAnchorElement>}
        {...commonProps}
      >
        {content}
      </a>
    );
  }
);
