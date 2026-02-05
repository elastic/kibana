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
  EuiHorizontalRule,
  EuiScreenReaderOnly,
  useEuiTheme,
  useGeneratedHtmlId,
  useIsWithinBreakpoints,
  type UseEuiTheme,
} from '@elastic/eui';

import { FooterItem } from './item';
import { getFocusableElements } from '../../utils/get_focusable_elements';
import { handleRovingIndex } from '../../utils/handle_roving_index';
import { updateTabIndices } from '../../utils/update_tab_indices';
import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';
import { getHighContrastSeparator } from '../../hooks/use_high_contrast_mode_styles';

const getFooterWrapperStyles = (euiThemeContext: UseEuiTheme, isCollapsed: boolean) => {
  const { euiTheme: theme } = euiThemeContext;
  return {
    root: css`
      align-items: center;
      display: flex;
      position: relative;
      flex-direction: column;
      gap: ${theme.size.xs};
      justify-content: center;
      padding-top: ${isCollapsed ? theme.size.s : theme.size.m};

      ${getHighContrastSeparator(euiThemeContext, { side: 'top' })}
    `,
    collapseDivider: css`
      position: relative;
      background-color: transparent;

      ${getHighContrastSeparator(euiThemeContext, { side: 'top' })}
    `,
  };
};

export interface FooterIds {
  footerNavigationInstructionsId: string;
}

export type FooterChildren = ReactNode | ((ids: FooterIds) => ReactNode);

export interface FooterProps {
  children: FooterChildren;
  isCollapsed: boolean;
  collapseButton?: ReactNode;
}

interface FooterComponent
  extends ForwardRefExoticComponent<FooterProps & RefAttributes<HTMLElement>> {
  Item: typeof FooterItem;
}

const FooterBase = forwardRef<HTMLElement, FooterProps>(
  ({ children, isCollapsed, collapseButton }, ref) => {
    const euiThemeContext = useEuiTheme();
    const isSmall = useIsWithinBreakpoints(['xs', 's']);
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
      () => getFooterWrapperStyles(euiThemeContext, isCollapsed),
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
        {/* The footer itself is not interactive but the children are */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <footer
          aria-label={i18n.translate('core.ui.chrome.sideNavigation.footerAriaLabel', {
            defaultMessage: 'Side navigation',
          })}
          css={wrapperStyles.root}
          onKeyDown={handleRovingIndex}
          ref={handleRef}
          data-test-subj={`${NAVIGATION_SELECTOR_PREFIX}-footer`}
        >
          {renderChildren()}
          {!isSmall && (
            <>
              <EuiHorizontalRule margin="xs" css={wrapperStyles.collapseDivider} />
              {collapseButton}
            </>
          )}
        </footer>
      </>
    );
  }
);

export const Footer = Object.assign(FooterBase, {
  Item: FooterItem,
}) satisfies FooterComponent;
