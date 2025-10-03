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
import { EuiSplitPanel, useEuiOverflowScroll, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { useRovingIndex } from '../../hooks/use_roving_index';
import type { MenuItem } from '../../../types';
import { SIDE_PANEL_WIDTH } from '../../hooks/use_layout_width';

export interface SideNavPanelProps {
  children: ReactNode;
  footer?: ReactNode;
  openerNode: MenuItem;
}

/**
 * Side navigation panel that opens on mouse click if the primary menu item contains a submenu.
 * Shows only in expanded mode.
 */
export const SideNavPanel = ({ children, footer, openerNode }: SideNavPanelProps): JSX.Element => {
  const ref = useRef<HTMLDivElement | null>(null);

  const { euiTheme } = useEuiTheme();

  useRovingIndex(ref);

  const wrapperStyles = css`
    // > For instance, only plain or transparent panels can have a border and/or shadow.
    // source: https://eui.elastic.co/docs/components/containers/panel/
    border-right: ${euiTheme.border.width.thin} ${euiTheme.colors.borderBaseSubdued} solid;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: ${SIDE_PANEL_WIDTH}px;
  `;

  const navigationPanelStyles = css`
    ${useEuiOverflowScroll('y')}

    // Account for fixed header when scrolling to elements
    scroll-padding-top: var(--header-height);
  `;

  return (
    <EuiSplitPanel.Outer
      aria-label={i18n.translate('core.ui.chrome.sideNavigation.sidePanelAriaLabel', {
        defaultMessage: `Side panel for {label}`,
        values: {
          label: openerNode.label,
        },
      })}
      borderRadius="none"
      // Used in Storybook to limit the height of the panel
      className="side-nav-panel"
      css={wrapperStyles}
      data-test-subj={`side-navigation-panel side-navigation-panel_${openerNode.id}`}
      hasShadow={false}
      role="region"
    >
      <EuiSplitPanel.Inner
        color="subdued"
        css={navigationPanelStyles}
        data-test-subj="side-navigation-panel-content"
        panelRef={ref}
        paddingSize="none"
      >
        {children}
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner
        color="subdued"
        data-test-subj="side-navigation-panel-footer"
        paddingSize="none"
        grow={false}
      >
        {footer}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
