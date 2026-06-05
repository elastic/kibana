/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { euiSlightShadowHover, type EuiThemeComputed, type UseEuiTheme } from '@elastic/eui';
import type { TabsBarVisualVariant } from '../../tabs_bar_visual_variant';

interface TabWithBackgroundStyleParams {
  visualVariant: TabsBarVisualVariant;
  isSelected: boolean;
  isDragging: boolean;
  hideRightSeparator: boolean;
  euiTheme: EuiThemeComputed;
  euiThemeContext: UseEuiTheme;
}

export const getTabWithBackgroundStyles = ({
  visualVariant,
  isSelected,
  isDragging,
  hideRightSeparator,
  euiTheme,
  euiThemeContext,
}: TabWithBackgroundStyleParams) => {
  if (visualVariant === 'inlineAppHeader') {
    return {
      wrapper: css`
        position: relative;
        display: inline-flex;
        flex-shrink: 0;
        border-radius: ${euiTheme.border.radius.small};
        background: ${isSelected || isDragging
          ? euiTheme.colors.backgroundBaseFormsPrepend
          : euiTheme.colors.backgroundBasePlain};
        transition: background ${euiTheme.animation.fast};
        margin-inline: ${euiTheme.size.s};
        padding: 0;

        ${isDragging ? euiSlightShadowHover(euiThemeContext) : ''}

        &::after {
          content: '';
          position: absolute;
          right: calc(-1 * ${euiTheme.size.s});
          top: 50%;
          transform: translateY(-50%);
          width: 1px;
          height: ${euiTheme.size.m};
          background-color: ${euiTheme.colors.borderBasePlain};
          transition: opacity ${euiTheme.animation.fast};
          opacity: ${hideRightSeparator || isDragging ? '0' : '1'};
          pointer-events: none;
        }
      `,
      inner: css`
        border-radius: ${euiTheme.border.radius.small};

        ${!isSelected && !isDragging
          ? `
          &:hover {
            background-color: ${euiTheme.colors.lightShade};
          }
        `
          : ''}
      `,
      showAccents: false,
    };
  }

  return {
    // tab main background and another background color on hover
    wrapper: css`
      position: relative;
      display: inline-block;
      border-radius: ${euiTheme.border.radius.small};
      background: ${isSelected || isDragging
        ? euiTheme.colors.backgroundBasePlain
        : euiTheme.colors.lightestShade};
      transition: background ${euiTheme.animation.fast};
      margin: ${euiTheme.size.xs};
      margin-bottom: 0;
      padding-bottom: ${isDragging ? '0' : euiTheme.size.xs};

      ${isSelected
        ? `
          position: relative;
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
          filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.06))
                  drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.04));
        `
        : ''}

      ${isDragging
        ? `
          ${euiSlightShadowHover(euiThemeContext)};
          border-radius: ${euiTheme.border.radius.small};
      `
        : ''}

      // right vertical separator
      &::before {
        content: '';
        position: absolute;
        right: -${euiTheme.size.xs};
        top: calc(
          50% - ${euiTheme.size.xs} / 2
        ); // 50% is the tab height midpoint, we want it centered in the middle of the whole tab bar
        transform: translateY(-50%);
        width: 1px;
        height: ${euiTheme.size.base};
        background-color: ${euiTheme.colors.borderBasePlain};
        transition: opacity ${euiTheme.animation.fast};
        opacity: ${hideRightSeparator || isDragging ? '0' : '1'};
        pointer-events: none;
      }
    `,
    inner: css`
      ${!isSelected
        ? `
        &:hover {
          background-color: ${euiTheme.colors.lightShade};
          border-radius: ${euiTheme.border.radius.small};
        }
      `
        : ''}
    `,
    showAccents: isSelected && !isDragging,
  };
};

export const getTabsBarWithBackgroundStyles = (
  visualVariant: TabsBarVisualVariant,
  euiTheme: EuiThemeComputed
) => {
  if (visualVariant === 'inlineAppHeader') {
    return css`
      background: transparent;
    `;
  }

  return css`
    // tabs bar background
    background: ${euiTheme.colors.lightestShade};
  `;
};

export const shouldApplyTabsBarGlobalChromeStyles = (visualVariant: TabsBarVisualVariant) =>
  visualVariant === 'appContainer';
