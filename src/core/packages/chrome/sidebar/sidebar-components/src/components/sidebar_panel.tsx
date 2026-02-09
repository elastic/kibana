/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, ReactNode } from 'react';
import React, { useCallback, useId, useLayoutEffect, useMemo, useRef } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiPanel, euiShadow } from '@elastic/eui';
import { getHighContrastBorder } from '@kbn/core-chrome-layout-utils';
import { useLayoutConfig } from '@kbn/core-chrome-layout-components';
import { MAIN_CONTENT_SELECTORS } from '@kbn/core-chrome-layout-constants';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SidebarPanelContextValue } from '@kbn/core-chrome-sidebar-context';
import { SidebarPanelContext } from '@kbn/core-chrome-sidebar-context';
import { PanelResizeHandle } from './panel_resize_handle';

const sidebarWrapperStyles = (theme: UseEuiTheme) => css`
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
`;

const panelContainerStyles = (isProjectStyle: boolean) => (theme: UseEuiTheme) =>
  css`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    min-width: 0; // Allow panel to shrink

    ${isProjectStyle &&
    css`
      border-radius: ${theme.euiTheme.border.radius.medium};
      outline: ${getHighContrastBorder(theme)};
      ${euiShadow(theme, 'xs', { border: 'none' })};
    `}
  `;

export interface SidebarPanelProps {
  children: ReactNode;
}

const defaultAriaLabel = i18n.translate('core.ui.chrome.sidebar.sidebarAriaLabel', {
  defaultMessage: 'Side panel',
});

const focusMainContent = () => {
  const mainElement = document.querySelector(MAIN_CONTENT_SELECTORS.join(','));
  if (mainElement instanceof HTMLElement) {
    mainElement.focus();
  }
};

/** Rescues focus to main content (or custom callback) when the panel unmounts with focus inside. */
const useFocusRescue = () => {
  const asideRef = useRef<HTMLElement>(null);
  const onFocusRescueRef = useRef<(() => void) | undefined>();

  const setOnFocusRescue = useCallback((cb: (() => void) | undefined) => {
    onFocusRescueRef.current = cb;
  }, []);

  useLayoutEffect(() => {
    const el = asideRef.current;
    return () => {
      if (el?.contains(document.activeElement)) {
        (onFocusRescueRef.current ?? focusMainContent)();
      }
    };
  }, []);

  return { asideRef, setOnFocusRescue };
};

/**
 * Minimal container for sidebar app content.
 * Apps are responsible for rendering their own header using SidebarHeader component.
 *
 * Provides {@link SidebarPanelContext} so child components can access
 * the panel's heading ID for aria-labelledby via {@link useSidebarPanel}.
 */
export const SidebarPanel: FC<SidebarPanelProps> = ({ children }) => {
  const { chromeStyle } = useLayoutConfig();
  const headingId = useId();
  const { asideRef, setOnFocusRescue } = useFocusRescue();
  const contextValue = useMemo<SidebarPanelContextValue>(
    () => ({ headingId, setOnFocusRescue }),
    [headingId, setOnFocusRescue]
  );

  return (
    <SidebarPanelContext.Provider value={contextValue}>
      <aside
        ref={asideRef}
        css={sidebarWrapperStyles}
        data-test-subj="sidebarPanel"
        aria-labelledby={headingId}
        aria-label={defaultAriaLabel}
      >
        <PanelResizeHandle />
        <EuiPanel
          paddingSize="none"
          css={panelContainerStyles(chromeStyle === 'project')}
          hasBorder={false}
          hasShadow={false}
          borderRadius={'none'}
        >
          {children}
        </EuiPanel>
      </aside>
    </SidebarPanelContext.Provider>
  );
};
