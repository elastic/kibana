/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode, HTMLAttributes, ForwardedRef } from 'react';
import React, { Suspense, forwardRef } from 'react';
import { css } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import { EuiIcon, EuiScreenReaderOnly, EuiText, euiFontSize, useEuiTheme } from '@elastic/eui';

export interface MenuItemProps extends HTMLAttributes<HTMLAnchorElement | HTMLButtonElement> {
  as?: 'a' | 'button';
  children: ReactNode;
  href: string;
  iconSize?: 's' | 'm';
  iconType: IconType;
  isHighlighted: boolean;
  isCurrent?: boolean;
  isHorizontal?: boolean;
  isLabelVisible?: boolean;
  isTruncated?: boolean;
}

export const MenuItem = forwardRef<HTMLAnchorElement | HTMLButtonElement, MenuItemProps>(
  (
    {
      as = 'a',
      children,
      isHorizontal,
      href,
      iconSize = 's',
      iconType,
      id,
      isHighlighted,
      isCurrent = false,
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
      width: 100%;
      position: relative;
      overflow: hidden;
      align-items: center;
      justify-content: ${isHorizontal ? 'initial' : 'center'};
      display: flex;
      flex-direction: ${isHorizontal ? 'row' : 'column'};
      // 3px is from Figma; there is no token
      gap: ${isHorizontal ? euiTheme.size.s : '3px'};
      outline: none !important;
      color: ${isHighlighted
        ? euiTheme.components.buttons.textColorPrimary
        : euiTheme.components.buttons.textColorText};

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
          : isHorizontal
          ? euiTheme.colors.backgroundBaseSubdued
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

      // TODO: consider using euiFocusRing
      // source: https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible
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

      &:hover,
      &:active {
        color: ${isHighlighted
          ? euiTheme.components.buttons.textColorPrimary
          : euiTheme.components.buttons.textColorText};
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

    const verticalStyles = css`
      ${euiFontSize(euiThemeContext, 'xxs', { unit: 'px' }).fontSize};
      font-weight: ${euiTheme.font.weight.semiBold};
    `;

    const horizontalStyles = css`
      font-weight: ${isHighlighted ? euiTheme.font.weight.semiBold : euiTheme.font.weight.regular};
    `;

    const content = (
      <>
        <div className="iconWrapper">
          <Suspense fallback={<EuiIcon aria-hidden color="currentColor" type={'empty'} />}>
            <EuiIcon aria-hidden color="currentColor" type={iconType || 'empty'} />
          </Suspense>
        </div>
        {isLabelVisible ? (
          <EuiText
            size={isHorizontal ? 's' : 'xs'}
            textAlign="center"
            css={css`
              ${truncatedStyles}
              ${isHorizontal ? horizontalStyles : verticalStyles}
              overflow: hidden;
              max-width: 100%;
              padding: 0 ${euiTheme.size.s};
            `}
          >
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
        <button ref={ref as ForwardedRef<HTMLButtonElement>} {...commonProps}>
          {content}
        </button>
      );
    }

    return (
      <a
        aria-current={isCurrent ? 'page' : undefined}
        href={href}
        ref={ref as ForwardedRef<HTMLAnchorElement>}
        {...commonProps}
      >
        {content}
      </a>
    );
  }
);
