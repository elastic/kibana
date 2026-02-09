/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, ReactNode } from 'react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiPanel, euiShadow } from '@elastic/eui';
import { getHighContrastBorder } from '@kbn/core-chrome-layout-utils';
import { useLayoutConfig } from '@kbn/core-chrome-layout-components';
import { MAIN_CONTENT_SELECTORS } from '@kbn/core-chrome-layout-constants';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { PanelResizeHandle } from './panel_resize_handle';
import type { SidebarPanelApi } from './sidebar_panel_context';
import { SidebarPanelContext } from './sidebar_panel_context';

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
  /** When this value changes, context state (label, onFocusRescue) resets. Typically the current app ID. */
  resetKey?: string;
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

/** Manages panel context API state and resets it when `resetKey` changes (e.g. on app switch). */
const usePanelApi = (resetKey?: string) => {
  const onFocusRescueRef = useRef<(() => void) | undefined>();
  const [contextLabel, setLabel] = useState<string | undefined>();

  useEffect(() => {
    setLabel(undefined);
    onFocusRescueRef.current = undefined;
  }, [resetKey]);

  const setOnFocusRescue = useCallback((cb: (() => void) | undefined) => {
    onFocusRescueRef.current = cb;
  }, []);

  const panelApi = useMemo<SidebarPanelApi>(
    () => ({ setLabel, setOnFocusRescue }),
    [setOnFocusRescue]
  );

  return { panelApi, contextLabel, onFocusRescueRef };
};

/** Rescues focus to main content (or custom callback) when the panel unmounts with focus inside. */
const useFocusRescue = (
  onFocusRescueRef: React.RefObject<(() => void) | undefined>
) => {
  const asideRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = asideRef.current;
    return () => {
      if (el?.contains(document.activeElement)) {
        (onFocusRescueRef.current ?? focusMainContent)();
      }
    };
  }, [onFocusRescueRef]);

  return asideRef;
};

const getAriaLabel = (label?: string) =>
  label
    ? i18n.translate('core.ui.chrome.sidebar.sidebarAriaLabelWithApp', {
        defaultMessage: 'Side panel: {label}',
        values: { label },
      })
    : defaultAriaLabel;

/**
 * Minimal container for sidebar app content.
 * Apps are responsible for rendering their own header using SidebarHeader component.
 *
 * Provides {@link SidebarPanelContext} so child components can configure
 * the panel's aria-label and focus rescue behavior via {@link useSidebarPanel}.
 */
export const SidebarPanel: FC<SidebarPanelProps> = ({ children, resetKey }) => {
  const { chromeStyle } = useLayoutConfig();
  const { panelApi, contextLabel, onFocusRescueRef } = usePanelApi(resetKey);
  const asideRef = useFocusRescue(onFocusRescueRef);
  const ariaLabel = getAriaLabel(contextLabel);

  return (
    <SidebarPanelContext.Provider value={panelApi}>
      <aside
        ref={asideRef}
        css={sidebarWrapperStyles}
        data-test-subj="sidebarPanel"
        aria-label={ariaLabel}
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
