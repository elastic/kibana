/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, ForwardedRef, ReactNode } from 'react';
import { css } from '@emotion/react';
import {
  EuiIcon,
  EuiScreenReaderOnly,
  EuiText,
  EuiToolTip,
  IconType,
  useEuiTheme,
} from '@elastic/eui';

import { useMenuItemClick } from '../../hooks/use_menu_item_click';

export interface SideNavPrimaryMenuItemProps {
  children: ReactNode;
  hasContent?: boolean;
  horizontal?: boolean;
  href?: string;
  iconType?: IconType;
  isCollapsed: boolean;
  isCurrent: boolean;
  onClick?: () => void;
}

export const SideNavPrimaryMenuItem = forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  SideNavPrimaryMenuItemProps
>(
  (
    { children, hasContent, horizontal, href, iconType, isCollapsed, isCurrent, onClick, ...props },
    ref: ForwardedRef<HTMLAnchorElement | HTMLButtonElement>
  ): JSX.Element => {
    const { euiTheme } = useEuiTheme();

    const handleClick = useMenuItemClick(onClick);

    const isSingleWord = typeof children === 'string' && !children.includes(' ');

    const label = (
      <EuiText
        className="label"
        size={horizontal ? 's' : 'xs'}
        textAlign="center"
        css={css`
          overflow: hidden;
          max-width: 100%;
          padding: 0 4px;

          ${isSingleWord
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
              `}
        `}
        title={typeof children === 'string' ? children : undefined}
      >
        {children}
      </EuiText>
    );

    const wrapperStyles = css`
      display: flex;
      justify-content: center;
      width: 100%;
    `;

    const buttonStyles = css`
      width: 100%;
      position: relative;
      overflow: hidden;
      align-items: center;
      justify-content: ${horizontal ? 'initial' : 'center'};
      display: flex;
      flex-direction: ${horizontal ? 'row' : 'column'};
      // 3px is from Figma; there is no token
      gap: ${horizontal ? euiTheme.size.s : '3px'};
      outline: none !important;
      color: ${isCurrent
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
        background-color: ${isCurrent
          ? euiTheme.components.buttons.backgroundPrimary
          : horizontal
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

      // source: https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible
      &:focus-visible .iconWrapper {
        border: 2px solid ${isCurrent ? euiTheme.colors.textPrimary : euiTheme.colors.textParagraph};
      }

      &:hover .iconWrapper::before {
        background-color: ${isCurrent
          ? euiTheme.components.buttons.backgroundPrimaryHover
          : euiTheme.components.buttons.backgroundTextHover};
      }

      &:active .iconWrapper::before {
        background-color: ${isCurrent
          ? euiTheme.components.buttons.backgroundPrimaryActive
          : euiTheme.components.buttons.backgroundTextActive};
      }

      &:hover,
      &:active {
        color: ${isCurrent
          ? euiTheme.components.buttons.textColorPrimary
          : euiTheme.components.buttons.textColorText};
      }
    `;

    const content = (
      <>
        <div className="iconWrapper">
          <EuiIcon aria-hidden color="currentColor" type={iconType || 'empty'} />
        </div>
        {isCollapsed && !horizontal ? <EuiScreenReaderOnly>{label}</EuiScreenReaderOnly> : label}
      </>
    );

    const menuItem = hasContent ? (
      <button
        ref={ref as ForwardedRef<HTMLButtonElement>}
        css={buttonStyles}
        onClick={handleClick}
        data-menu-item
        type="button"
        {...props}
      >
        {content}
      </button>
    ) : (
      <a
        ref={ref as ForwardedRef<HTMLAnchorElement>}
        aria-current={isCurrent ? 'page' : undefined}
        css={buttonStyles}
        href={href}
        onClick={handleClick}
        data-menu-item
        {...props}
      >
        {content}
      </a>
    );

    if (!horizontal && isCollapsed && !hasContent) {
      return (
        <EuiToolTip
          anchorProps={{
            css: wrapperStyles,
          }}
          content={children}
          position="right"
          disableScreenReaderOutput
        >
          {menuItem}
        </EuiToolTip>
      );
    }

    return menuItem;
  }
);
