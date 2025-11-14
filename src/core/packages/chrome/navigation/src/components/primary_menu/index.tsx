/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useMemo } from 'react';
import type { ForwardedRef, ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiScreenReaderOnly,
  useEuiTheme,
  useGeneratedHtmlId,
  type UseEuiTheme,
} from '@elastic/eui';

import { PrimaryMenuItem } from './item';
import { getFocusableElements } from '../../utils/get_focusable_elements';
import { handleRovingIndex } from '../../utils/handle_roving_index';
import { updateTabIndices } from '../../utils/update_tab_indices';
import { PRIMARY_NAVIGATION_ID } from '../../constants';

const getPrimaryMenuStyles = (theme: UseEuiTheme['euiTheme'], isCollapsed: boolean) => css`
  align-items: center;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: ${isCollapsed ? theme.size.xs : theme.size.base};
  min-height: 0;
`;

export interface PrimaryMenuProps {
  children: ReactNode;
  isCollapsed: boolean;
}

interface PrimaryMenuComponent
  extends ForwardRefExoticComponent<PrimaryMenuProps & RefAttributes<HTMLElement>> {
  Item: typeof PrimaryMenuItem;
}

export const PrimaryMenuBase = forwardRef<HTMLElement, PrimaryMenuProps>(
  ({ children, isCollapsed }, ref: ForwardedRef<HTMLElement>): JSX.Element => {
    const { euiTheme } = useEuiTheme();
    const mainNavigationInstructionsId = useGeneratedHtmlId({
      prefix: 'main-navigation-instructions',
    });
    const popoverEnterAndExitInstructionsId = 'popover-enter-exit-instructions';
    const popoverNavigationInstructionsId = 'popover-navigation-instructions';

    const styles = useMemo(
      () => getPrimaryMenuStyles(euiTheme, isCollapsed),
      [euiTheme, isCollapsed]
    );

    const handleRef = (node: HTMLElement | null) => {
      if (node) {
        const elements = getFocusableElements(node);
        updateTabIndices(elements);

        // Add aria-describedby with keyboard navigation instructions to the first focusable element only
        if (elements.length > 0) {
          const firstElement = elements[0];
          const existingDescribedBy = firstElement.getAttribute('aria-describedby');
          if (!existingDescribedBy?.includes(mainNavigationInstructionsId)) {
            const enhancedDescribedBy = existingDescribedBy
              ? `${mainNavigationInstructionsId} ${existingDescribedBy}`
              : mainNavigationInstructionsId;
            firstElement.setAttribute('aria-describedby', enhancedDescribedBy);
          }
        }
      }

      if (typeof ref === 'function') ref(node);
      else if (ref && 'current' in ref) ref.current = node;
    };

    return (
      <>
        <EuiScreenReaderOnly>
          <p id={mainNavigationInstructionsId}>
            {i18n.translate('core.ui.chrome.sideNavigation.primaryMenuInstructions', {
              defaultMessage:
                'You are focused on a primary menu. Use up and down arrow keys to navigate between items and press Enter to activate',
            })}
          </p>
        </EuiScreenReaderOnly>
        {/* Rendered once for all popovers */}
        <EuiScreenReaderOnly>
          <span id={popoverEnterAndExitInstructionsId}>
            {i18n.translate('core.ui.chrome.sideNavigation.popoverInstruction', {
              defaultMessage: 'Press Enter to go to the submenu and Escape to exit',
            })}
          </span>
        </EuiScreenReaderOnly>
        <EuiScreenReaderOnly>
          <p id={popoverNavigationInstructionsId}>
            {i18n.translate('core.ui.chrome.sideNavigation.popoverNavigationInstructions', {
              defaultMessage: 'Use up and down arrow keys to navigate and press Enter to activate',
            })}
          </p>
        </EuiScreenReaderOnly>
        {/* The nav itself is not interactive but the children are */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <nav
          aria-label={i18n.translate('core.ui.chrome.sideNavigation.primaryMenuAriaLabel', {
            defaultMessage: 'Main',
          })}
          css={styles}
          id={PRIMARY_NAVIGATION_ID}
          data-test-subj={PRIMARY_NAVIGATION_ID}
          onKeyDown={handleRovingIndex}
          ref={handleRef}
        >
          {children}
        </nav>
      </>
    );
  }
);

export const PrimaryMenu = Object.assign(PrimaryMenuBase, {
  Item: PrimaryMenuItem,
}) satisfies PrimaryMenuComponent;
