/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, forwardRef } from 'react';
import type { ReactNode, ForwardedRef, AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { EuiIcon, EuiScreenReaderOnly, EuiText, euiFontSize, useEuiTheme } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { css } from '@emotion/react';

import { useHighContrastModeStyles } from '../../hooks/use_high_contrast_mode_styles';
import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';
import { NewItemIndicator } from '../new_item_indicator';

interface MenuItemBaseProps {
  children: ReactNode;
  iconType: IconType;
  id?: string;
  isCurrent?: boolean;
  isHighlighted: boolean;
  isHorizontal?: boolean;
  isLabelVisible?: boolean;
  isNew?: boolean;
  isTruncated?: boolean;
}

type MenuItemAnchorRestProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  keyof MenuItemBaseProps | 'href'
>;

type MenuItemButtonRestProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  keyof MenuItemBaseProps
>;

interface MenuItemWithHref extends MenuItemBaseProps, MenuItemAnchorRestProps {
  href: string;
}

interface MenuItemWithoutHref extends MenuItemBaseProps, MenuItemButtonRestProps {
  href?: undefined;
}

export type MenuItemProps = MenuItemWithHref | MenuItemWithoutHref;

export const MenuItem = forwardRef<HTMLAnchorElement | HTMLButtonElement, MenuItemProps>(
  (
    {
      children,
      iconType,
      id,
      isCurrent = false,
      isHighlighted,
      isLabelVisible = true,
      isNew = false,
      isTruncated = true,
      ...props
    },
    ref
  ): JSX.Element => {
    const euiThemeContext = useEuiTheme();
    const { euiTheme } = euiThemeContext;

    const isSingleWord = typeof children === 'string' && !children.includes(' ');

    const iconWrapperClassName = `${NAVIGATION_SELECTOR_PREFIX}-iconWrapper`;

    const buttonStyles = css`
      --menu-item-text-color: ${isHighlighted
        ? euiTheme.components.buttons.textColorPrimary
        : euiTheme.components.buttons.textColorText};
      --high-contrast-hover-indicator-color: var(--menu-item-text-color);
      ${useHighContrastModeStyles(`.${iconWrapperClassName}`)};

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

      .${iconWrapperClassName} {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        height: ${euiTheme.size.xl};
        width: ${euiTheme.size.xl};
        border-radius: ${euiTheme.border.radius.medium};
        background-color: ${isHighlighted
          ? euiTheme.components.buttons.backgroundPrimary
          : euiTheme.colors.backgroundTransparent};
        z-index: 1;
      }

      .${iconWrapperClassName}::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: ${euiTheme.border.radius.medium};
        background-color: transparent;
        z-index: 0;
      }

      &:focus-visible .${iconWrapperClassName} {
        border: ${euiTheme.border.width.thick} solid
          ${isHighlighted ? euiTheme.colors.textPrimary : euiTheme.colors.textParagraph};
      }

      &:hover .${iconWrapperClassName}::before {
        background-color: ${isHighlighted
          ? euiTheme.components.buttons.backgroundPrimaryHover
          : euiTheme.components.buttons.backgroundTextHover};
      }

      &:active .${iconWrapperClassName}::before {
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
      ${euiFontSize(euiThemeContext, 'xxs', { unit: 'px' })};
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
        <div className={iconWrapperClassName}>
          <Suspense fallback={<EuiIcon aria-hidden color="currentColor" type="empty" />}>
            <EuiIcon aria-hidden color="currentColor" type={iconType || 'empty'} />
          </Suspense>
          {isNew && <NewItemIndicator isHighlighted={isHighlighted} />}
        </div>
        {isLabelVisible ? (
          <EuiText textAlign="center" css={labelStyles}>
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
    };

    if (props.href === undefined) {
      const buttonProps = props as MenuItemWithoutHref;

      return (
        <button
          id={id}
          ref={ref as ForwardedRef<HTMLButtonElement>}
          {...commonProps}
          {...buttonProps}
        >
          {content}
        </button>
      );
    } else {
      const anchorProps = props as MenuItemWithHref;

      return (
        <a
          aria-current={isCurrent ? 'page' : undefined}
          id={id}
          ref={ref as ForwardedRef<HTMLAnchorElement>}
          {...commonProps}
          {...anchorProps}
        >
          {content}
        </a>
      );
    }
  }
);
