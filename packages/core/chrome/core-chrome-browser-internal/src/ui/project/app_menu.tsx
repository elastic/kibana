/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem, EuiThemeProvider, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { MountPoint } from '@kbn/core-mount-utils-browser';
import React from 'react';
import { HeaderActionMenu } from '../header/header_action_menu';
import { SIZE_COLLAPSED, SIZE_EXPANDED } from './navigation';

interface AppMenuBarProps {
  isOpen: boolean;
  headerActionMenuMounter: { mount: MountPoint<HTMLElement> | undefined };
}
export const AppMenuBar = ({ isOpen, headerActionMenuMounter }: AppMenuBarProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiThemeProvider>
      <div
        className="header__actionMenu"
        data-test-subj="kibanaProjectHeaderActionMenu"
        css={css`
          /* span the width of the body content (viewport - width of side nav) */
          width: calc(100% - ${isOpen ? SIZE_EXPANDED : SIZE_COLLAPSED}px);
        `}
      >
        <EuiFlexGroup
          css={css`
            /* EuiPanel-like styling */
            padding: ${euiTheme.size.s};
            border-bottom: 1px solid ${euiTheme.colors.lightShade};
            background: ${euiTheme.colors.emptyShade};
          `}
        >
          <EuiFlexItem
            grow={false}
            css={css`
              /* force the item to use all space to the left, pushing content to the right edge of the viewport */
              margin-left: auto;
            `}
          >
            <HeaderActionMenu mounter={headerActionMenuMounter} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div className="header__actionMenu__clearFix" />
    </EuiThemeProvider>
  );
};
