/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef } from 'react';
import type { ReactNode } from 'react';
import { EuiPanel, useEuiOverflowScroll, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { useRovingIndex } from '../../hooks/use_roving_index';

export interface SideNavPanelProps {
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Side navigation panel that opens on mouse click if the page contains sub-pages.
 *
 * `paddingSize="m"` is already `16px`, so we have to manually set `12px` padding
 *
 * TODO: pass ref to EuiPanel
 */
export const SideNavPanel = ({ children, footer }: SideNavPanelProps): JSX.Element => {
  const ref = useRef<HTMLDivElement | null>(null);

  const { euiTheme } = useEuiTheme();

  useRovingIndex(ref);

  return (
    <div
      role="region"
      aria-label={i18n.translate('core.ui.chrome.sideNavigation.sidePanelAriaLabel', {
        defaultMessage: 'Side panel',
      })}
      ref={ref}
    >
      <EuiPanel
        className="side_panel"
        css={css`
          ${useEuiOverflowScroll('y')}
          border-right: ${euiTheme.border.width.thin} ${euiTheme.colors.borderBaseSubdued} solid;
          height: 100%;
          scroll-padding-top: 44px; /* account for fixed header when scrolling to elements */
          display: flex;
          flex-direction: column;
        `}
        color="subdued"
        // > For instance, only plain or transparent panels can have a border and/or shadow.
        // source: https://eui.elastic.co/docs/components/containers/panel/
        // hasBorder
        paddingSize="none"
        borderRadius="none"
        grow={false}
      >
        <div
          css={css`
            flex-grow: 1;
            overflow-y: auto;
          `}
        >
          {children}
        </div>
        {footer}
      </EuiPanel>
    </div>
  );
};
