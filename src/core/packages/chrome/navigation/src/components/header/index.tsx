/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef } from 'react';
import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';

import { ToolItem } from '../tool_item';
import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';

export interface HeaderToolbarProps {
  children: ReactNode;
}

export const HeaderToolbar = forwardRef<HTMLDivElement, HeaderToolbarProps>(({ children }, ref) => {
  const { euiTheme } = useEuiTheme();

  const wrapperStyles = css`
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.xs};
    justify-content: center;
    width: 100%;
  `;

  return (
    <div
      aria-label={i18n.translate('core.ui.chrome.sideNavigation.headerToolbarAriaLabel', {
        defaultMessage: 'Header tools',
      })}
      css={wrapperStyles}
      data-test-subj={`${NAVIGATION_SELECTOR_PREFIX}-headerToolbar`}
      ref={ref}
      role="group"
    >
      {children}
    </div>
  );
}) as ForwardRefExoticComponent<HeaderToolbarProps & RefAttributes<HTMLDivElement>> & {
  Item: typeof ToolItem;
};

HeaderToolbar.Item = ToolItem;
