/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef } from 'react';
import type { ForwardedRef, ReactNode } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiScreenReaderOnly, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';

import { PRIMARY_NAVIGATION_ID } from '../../constants';
import { handleRovingIndex } from '../../utils/handle_roving_index';
import { getFocusableElements } from '../../utils/get_focusable_elements';
import { updateTabIndices } from '../../utils/update_tab_indices';

export interface PrimaryMenuIds {
  mainNavigationInstructionsId: string;
}

export type PrimaryMenuChildren = ReactNode | ((ids: PrimaryMenuIds) => ReactNode);
export interface SideNavPrimaryMenuProps {
  children: PrimaryMenuChildren;
  isCollapsed: boolean;
}

export const SideNavPrimaryMenu = forwardRef<HTMLElement, SideNavPrimaryMenuProps>(
  ({ children, isCollapsed }, ref: ForwardedRef<HTMLElement>): JSX.Element => {
    const { euiTheme } = useEuiTheme();
    const mainNavigationInstructionsId = useGeneratedHtmlId({
      prefix: 'main-navigation-instructions',
    });

    const styles = css`
      align-items: center;
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: ${isCollapsed ? euiTheme.size.xs : euiTheme.size.base};
      min-height: 0;
    `;

    const renderChildren = () => {
      if (typeof children === 'function') {
        return children({ mainNavigationInstructionsId });
      }
      return children;
    };

    return (
      <>
        <EuiScreenReaderOnly>
          <p id={mainNavigationInstructionsId}>
            {i18n.translate('core.ui.chrome.sideNavigation.primaryMenuInstructions', {
              defaultMessage:
                'You are in the main navigation primary menu. Use Up and Down arrow keys to navigate the menu.',
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
          onKeyDown={handleRovingIndex}
          ref={(node) => {
            if (node) {
              const elements = getFocusableElements(node);
              updateTabIndices(elements);
            }

            if (typeof ref === 'function') ref(node);
            else if (ref && 'current' in ref) ref.current = node;
          }}
        >
          {renderChildren()}
        </nav>
      </>
    );
  }
);
