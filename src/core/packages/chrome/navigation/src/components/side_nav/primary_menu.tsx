/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import type { ForwardedRef, ReactNode } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';

import { PRIMARY_NAVIGATION_ID } from '../../constants';
import { useRovingIndex } from '../../hooks/use_roving_index';

export interface SideNavPrimaryMenuProps {
  children: ReactNode;
  isCollapsed: boolean;
}

export const SideNavPrimaryMenu = forwardRef<HTMLElement, SideNavPrimaryMenuProps>(
  ({ children, isCollapsed }, forwardedRef: ForwardedRef<HTMLElement>): JSX.Element => {
    const { euiTheme } = useEuiTheme();
    const localRef = useRef<HTMLElement>(null);

    useRovingIndex(localRef);

    useImperativeHandle(forwardedRef, () => localRef.current!);

    return (
      <nav
        id={PRIMARY_NAVIGATION_ID}
        aria-label={i18n.translate('core.ui.chrome.sideNavigation.primaryMenuAriaLabel', {
          defaultMessage: 'Main',
        })}
        ref={localRef}
        css={css`
          align-items: center;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: ${isCollapsed ? euiTheme.size.xs : euiTheme.size.base};
          min-height: 0;
        `}
      >
        {children}
      </nav>
    );
  }
);
