/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiSplitPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import type { MenuItem } from '../../../types';
import { SIDE_PANEL_WIDTH } from '../../hooks/use_layout_width';
import { getFocusableElements } from '../../utils/get_focusable_elements';
import { updateTabIndices } from '../../utils/update_tab_indices';
import { handleRovingIndex } from '../../utils/handle_roving_index';
import { useScroll } from '../../hooks/use_scroll';

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
  const { euiTheme } = useEuiTheme();
  const scrollStyles = useScroll();

  const wrapperStyles = css`
    // > For instance, only plain or transparent panels can have a border and/or shadow.
    // source: https://eui.elastic.co/docs/components/containers/panel/
    box-sizing: border-box;
    border-right: ${euiTheme.border.width.thin} ${euiTheme.colors.borderBaseSubdued} solid;
    display: flex;
    flex-direction: column;
    width: ${SIDE_PANEL_WIDTH}px;
  `;

  const navigationPanelStyles = css`
    ${scrollStyles};
  `;

  return (
    <EuiSplitPanel.Outer
      aria-label={i18n.translate('core.ui.chrome.sideNavigation.sidePanelAriaLabel', {
        defaultMessage: `Side panel for {label}`,
        values: {
          label: openerNode.label,
        },
      })}
      color={'transparent'}
      borderRadius="none"
      // Used in Storybook to limit the height of the panel
      className="side-nav-panel"
      css={wrapperStyles}
      data-test-subj={`side-navigation-panel side-navigation-panel_${openerNode.id}`}
      hasShadow={false}
      role="region"
    >
      <EuiSplitPanel.Inner
        color="transparent"
        css={navigationPanelStyles}
        data-test-subj="side-navigation-panel-content"
        onKeyDown={handleRovingIndex}
        panelRef={(ref) => {
          if (ref) {
            const elements = getFocusableElements(ref);
            updateTabIndices(elements);
          }
        }}
        paddingSize="none"
      >
        {children}
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner
        color="transparent"
        data-test-subj="side-navigation-panel-footer"
        paddingSize="none"
        grow={false}
      >
        {footer}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
