/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HTMLAttributes } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, euiSlightShadowHover } from '@elastic/eui';
import { useChromeStyle } from './use_chrome_style';
import type { TabsServices } from '../../types';

export interface TabWithBackgroundProps extends HTMLAttributes<HTMLElement> {
  isSelected: boolean;
  isDragging?: boolean;
  services: TabsServices;
  children: React.ReactNode;
}

export const TabWithBackground = React.forwardRef<HTMLDivElement, TabWithBackgroundProps>(
  ({ isSelected, isDragging, services, children, ...otherProps }, ref) => {
    const euiThemeContext = useEuiTheme();
    const { euiTheme } = euiThemeContext;
    const { isProjectChromeStyle } = useChromeStyle(services);
    const selectedTabBackgroundColor = isProjectChromeStyle
      ? euiTheme.colors.backgroundBasePlain
      : euiTheme.colors.emptyShade;

    const Accent = ({ direction }: { direction: 'left' | 'right' }) => {
      if (!isSelected || isDragging) {
        return <></>;
      }

      return (
        <svg
          css={css`
            height: 8px;
            width: 8px;
            position: absolute;
            bottom: -4px;
            ${direction === 'left' ? 'left: -8px;' : 'right: -8px;'};
            ${direction === 'left' ? 'transform: scaleX(-1);' : ''};
          `}
          xmlns="http://www.w3.org/2000/svg"
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
        >
          <path
            d="M8 7.92676C7.67329 7.97351 7.33964 8 7 8H8V7.92676ZM0 8H7C3.13401 8 0 4.86599 0 1C0 0.660412 0.0255308 0.326664 0.0722656 0H0V8Z"
            fill="white"
          />
        </svg>
      );
    };

    return (
      <div
        {...otherProps}
        ref={ref}
        // tab main background and another background color on hover
        css={css`
          display: inline-block;
          background: ${
            isSelected || isDragging ? selectedTabBackgroundColor : euiTheme.colors.lightestShade
          };
          border-radius: ${euiTheme.border.radius.small};
          margin: 0 4px 0 0;
          color: ${isSelected || isDragging ? euiTheme.colors.text : euiTheme.colors.subduedText};
          border:${euiTheme.border.thin}
          transition: background ${euiTheme.animation.fast};
          ${
            isDragging
              ? `
              ${euiSlightShadowHover(euiThemeContext)};
              border-radius: ${euiTheme.border.radius.small};
          `
              : ''
          }

          ${
            isSelected
              ? `
              border-bottom-left-radius: 0;
              border-bottom-right-radius: 0;
              position: relative;
              filter: drop-shadow(0px 0px 2px hsla(216.67,29.51%,23.92%,0.16))
                      drop-shadow(0px 1px 4px hsla(216.67,29.51%,23.92%,0.06))
                      drop-shadow(0px 2px 8px hsla(216.67,29.51%,23.92%,0.04));
              clip-path: inset(-8px -8px -4px -8px);

              &:after {
                content: '';
                position: absolute;
                left: 0;
                right: 0;
                width: 100%;
                bottom: -4px;
                height: 4px;
                background: ${euiTheme.colors.backgroundBasePlain};
              }
            `
              : `
              &:hover {
                background-color: ${euiTheme.colors.lightShade};
              }
          `
          }
        `}
      >
        <Accent direction="left" />
        <Accent direction="right" />
        <div
          // a top shadow for an unselected tab to make sure that it stays visible when the tab is hovered
          css={css`
            background: 'transparent';
            transition: background ${euiTheme.animation.fast};
          `}
        >
          {children}
        </div>
      </div>
    );
  }
);
