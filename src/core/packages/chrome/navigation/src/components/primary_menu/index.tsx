/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef } from 'react';
import type { ForwardedRef, ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';

import { PRIMARY_NAVIGATION_ID } from '../../constants';
import { PrimaryMenuItem } from './item';
import { getFocusableElements } from '../../utils/get_focusable_elements';
import { handleRovingIndex } from '../../utils/handle_roving_index';
import { updateTabIndices } from '../../utils/update_tab_indices';

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

    const styles = css`
      align-items: center;
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: ${isCollapsed ? euiTheme.size.xs : euiTheme.size.base};
      min-height: 0;
    `;

    return (
      // The nav itself is not interactive but the children are
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
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
        {children}
      </nav>
    );
  }
);

export const PrimaryMenu = Object.assign(PrimaryMenuBase, {
  Item: PrimaryMenuItem,
}) satisfies PrimaryMenuComponent;
