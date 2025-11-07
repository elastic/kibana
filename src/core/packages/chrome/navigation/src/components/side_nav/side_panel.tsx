/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode, useMemo } from 'react';
import { EuiSplitPanel, useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import type { MenuItem } from '../../../types';
import { SIDE_PANEL_WIDTH } from '../../hooks/use_layout_width';
import { getFocusableElements } from '../../utils/get_focusable_elements';
import { handleRovingIndex } from '../../utils/handle_roving_index';
import { updateTabIndices } from '../../utils/update_tab_indices';
import { useScroll } from '../../hooks/use_scroll';
import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';

/**
 * **Border and shadow**
 *
 * For instance, only plain or transparent panels can have a border and/or shadow.
 * Source: {@link https://eui.elastic.co/docs/components/containers/panel/}
 */
const getWrapperStyles = (theme: UseEuiTheme['euiTheme']) => css`
  box-sizing: border-box;
  border-right: ${theme.border.width.thin} ${theme.colors.borderBaseSubdued} solid;
  display: flex;
  flex-direction: column;
  width: ${SIDE_PANEL_WIDTH}px;
`;

export interface SidePanelProps {
  children: ReactNode;
  footer?: ReactNode;
  openerNode: MenuItem;
}

/**
 * Side navigation panel that opens on mouse click if the primary menu item contains a submenu.
 * Shows only in expanded mode.
 */
export const SidePanel = ({ children, footer, openerNode }: SidePanelProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const scrollStyles = useScroll();
  const wrapperStyles = useMemo(() => getWrapperStyles(euiTheme), [euiTheme]);

  const panelRef = (ref: HTMLDivElement) => {
    if (ref) {
      const elements = getFocusableElements(ref);
      updateTabIndices(elements);
    }
  };

  const navigationPanelStyles = useMemo(
    () => css`
      ${scrollStyles}
    `,
    [scrollStyles]
  );

  const panelClassName = `${NAVIGATION_SELECTOR_PREFIX}-sidePanel`;
  const panelTestSubj = `${NAVIGATION_SELECTOR_PREFIX}-panel`;

  return (
    <EuiSplitPanel.Outer
      aria-label={i18n.translate('core.ui.chrome.sideNavigation.sidePanelAriaLabel', {
        defaultMessage: `Side panel for {label}`,
        values: {
          label: openerNode.label,
        },
      })}
      borderRadius="none"
      className={panelClassName} // Used in Storybook to limit the height of the panel
      css={wrapperStyles}
      data-test-subj={`${panelTestSubj} ${panelTestSubj}-${openerNode.id}`}
      hasShadow={false}
      role="region"
    >
      <EuiSplitPanel.Inner
        color="subdued"
        css={navigationPanelStyles}
        data-test-subj={`${NAVIGATION_SELECTOR_PREFIX}-panelContent`}
        onKeyDown={handleRovingIndex}
        panelRef={panelRef}
        paddingSize="none"
      >
        {children}
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner
        color="subdued"
        data-test-subj={`${NAVIGATION_SELECTOR_PREFIX}-panelFooter`}
        paddingSize="none"
        grow={false}
      >
        {footer}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
