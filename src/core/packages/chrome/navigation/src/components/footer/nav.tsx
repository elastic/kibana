/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useMemo } from 'react';
import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiScreenReaderOnly,
  useEuiTheme,
  useGeneratedHtmlId,
  type UseEuiTheme,
} from '@elastic/eui';

import { FooterItem } from './item';
import { getFocusableElements } from '../../utils/get_focusable_elements';
import { handleRovingIndex } from '../../utils/handle_roving_index';
import { updateTabIndices } from '../../utils/update_tab_indices';
import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';
import { getHighContrastSeparator } from '../../hooks/use_high_contrast_mode_styles';

const getFooterNavWrapperStyles = (euiThemeContext: UseEuiTheme, isCollapsed: boolean) => {
  const { euiTheme: theme } = euiThemeContext;
  return css`
    align-items: center;
    display: flex;
    position: relative;
    flex-direction: column;
    gap: ${theme.size.xs};
    justify-content: center;
    padding-top: ${isCollapsed ? theme.size.s : theme.size.m};

    ${getHighContrastSeparator(euiThemeContext, { side: 'top' })}
  `;
};

export interface FooterNavIds {
  footerNavigationInstructionsId: string;
}

export type FooterNavChildren = ReactNode | ((ids: FooterNavIds) => ReactNode);

export interface FooterNavProps {
  children: FooterNavChildren;
  isCollapsed: boolean;
}

interface FooterNavComponent
  extends ForwardRefExoticComponent<FooterNavProps & RefAttributes<HTMLElement>> {
  Item: typeof FooterItem;
}

const FooterNavBase = forwardRef<HTMLElement, FooterNavProps>(({ children, isCollapsed }, ref) => {
  const euiThemeContext = useEuiTheme();
  const footerNavigationInstructionsId = useGeneratedHtmlId({
    prefix: 'footer-navigation-instructions',
  });

  const handleRef = (node: HTMLElement | null) => {
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }

    if (node) {
      const elements = getFocusableElements(node);
      updateTabIndices(elements);
    }
  };

  const wrapperStyles = useMemo(
    () => getFooterNavWrapperStyles(euiThemeContext, isCollapsed),
    [euiThemeContext, isCollapsed]
  );

  const renderChildren = () => {
    if (typeof children === 'function') {
      return children({ footerNavigationInstructionsId });
    }
    return children;
  };

  return (
    <>
      <EuiScreenReaderOnly>
        <p id={footerNavigationInstructionsId}>
          {i18n.translate('core.ui.chrome.sideNavigation.footerInstructions', {
            defaultMessage:
              'You are in the main navigation footer menu. Use Up and Down arrow keys to navigate the menu.',
          })}
        </p>
      </EuiScreenReaderOnly>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <nav
        aria-label={i18n.translate('core.ui.chrome.sideNavigation.footerNavAriaLabel', {
          defaultMessage: 'Footer navigation',
        })}
        css={wrapperStyles}
        onKeyDown={handleRovingIndex}
        ref={handleRef}
        data-test-subj={`${NAVIGATION_SELECTOR_PREFIX}-footer`}
      >
        {renderChildren()}
      </nav>
    </>
  );
});

export const FooterNav = Object.assign(FooterNavBase, {
  Item: FooterItem,
}) satisfies FooterNavComponent;
