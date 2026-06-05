/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HTMLAttributes } from 'react';
import React, { useEffect } from 'react';
import { css as cssString } from '@emotion/css';
import { useEuiTheme } from '@elastic/eui';
import type { TabsServices } from '../../types';
import {
  DEFAULT_TABS_BAR_VISUAL_VARIANT,
  type TabsBarVisualVariant,
} from '../../tabs_bar_visual_variant';
import {
  getTabsBarWithBackgroundStyles,
  shouldApplyTabsBarGlobalChromeStyles,
} from './tab_visual_variant_styles';

const globalCss = cssString`
  // Disables the overscroll behavior to prevent the page from bouncing when scrolling
  overscroll-behavior: none;

  // Removes the shadow from the global header
  .header__secondBar,
  [data-test-subj='kibanaProjectHeaderActionMenu'] {
    box-shadow: none;
  }
`;

export interface TabsBarWithBackgroundProps extends HTMLAttributes<HTMLElement> {
  services: TabsServices;
  visualVariant?: TabsBarVisualVariant;
  children: React.ReactNode;
}

export const TabsBarWithBackground: React.FC<TabsBarWithBackgroundProps> = ({
  services,
  visualVariant = DEFAULT_TABS_BAR_VISUAL_VARIANT,
  children,
  ...otherProps
}) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const applyGlobalChromeStyles = shouldApplyTabsBarGlobalChromeStyles(visualVariant);

  useEffect(() => {
    if (!applyGlobalChromeStyles) {
      return;
    }

    document.body.classList.add(globalCss);

    return () => {
      document.body.classList.remove(globalCss);
    };
  }, [applyGlobalChromeStyles]);

  return (
    <div
      {...otherProps}
      className={
        visualVariant === 'inlineAppHeader'
          ? 'unifiedTabs__tabsBar--inlineAppHeader'
          : 'unifiedTabs__tabsBar--appContainer'
      }
      css={getTabsBarWithBackgroundStyles(visualVariant, euiTheme)}
    >
      {children}
    </div>
  );
};
