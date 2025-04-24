/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode, useCallback, useState } from 'react';
import {
  EuiFocusTrap,
  EuiPanel,
  EuiPortal,
  EuiThemeProvider,
  useEuiBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import useEvent from 'react-use/lib/useEvent';

import {
  closeToolbar,
  useIsSearchInToolbar,
  useWorkspaceDispatch,
} from '@kbn/core-workspace-state';

import { WorkspaceToolbarButtonComponent } from '@kbn/core-workspace-components';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

export interface WorkspaceToolbarSearchButtonProps {
  children: ReactNode;
}

export const WorkspaceToolbarSearchButton = ({ children }: WorkspaceToolbarSearchButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useWorkspaceDispatch();
  const { euiTheme } = useEuiTheme();
  const isSearchInToolbar = useIsSearchInToolbar();

  const panelStyle = css`
    position: fixed;
    top: 80px;
    z-index: ${euiTheme.levels.modal};

    ${useEuiBreakpoint(['m', 'l'])} {
      left: calc(
        var(--kbnWorkspace--application-left) + (var(--kbnWorkspace--application-width) / 2) - 200px
      );
    }

    ${useEuiBreakpoint(['xl'])} {
      left: calc(
        var(--kbnWorkspace--application-left) + (var(--kbnWorkspace--application-width) / 2) - 300px
      );
    }
  `;

  const panel = (
    <EuiPortal>
      <EuiFocusTrap onClickOutside={() => setIsOpen(false)}>
        <EuiThemeProvider colorMode="light">
          <EuiPanel css={panelStyle}>{children}</EuiPanel>
        </EuiThemeProvider>
      </EuiFocusTrap>
    </EuiPortal>
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === '/' && (isMac ? event.metaKey : event.ctrlKey)) {
        event.preventDefault();
        setIsOpen(true);
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [setIsOpen]
  );

  useEvent('keydown', onKeyDown);

  return (
    <>
      <WorkspaceToolbarButtonComponent
        iconType="search"
        aria-label="Search"
        onClick={() => {
          if (isSearchInToolbar) {
            dispatch(closeToolbar());
          }
          setIsOpen(!isOpen);
        }}
      />
      {isOpen && panel}
    </>
  );
};
