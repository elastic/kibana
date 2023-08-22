/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { MountPoint } from '@kbn/core-mount-utils-browser';
import React from 'react';
import { HeaderActionMenu } from '../header/header_action_menu';

interface AppMenuBarProps {
  isOpen: boolean;
  headerActionMenuMounter: { mount: MountPoint<HTMLElement> | undefined };
}
export const AppMenuBar = ({ headerActionMenuMounter }: AppMenuBarProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      className="header__actionMenu"
      data-test-subj="kibanaProjectHeaderActionMenu"
      css={css`
        z-index: ${euiTheme.levels.header};
        background: ${euiTheme.colors.emptyShade};
        border-bottom: ${euiTheme.border.thin};
        display: flex;
        justify-content: end;
        align-items: center;
        padding: ${euiTheme.size.s};
        margin-bottom: -${euiTheme.border.width.thin};
        /* fixates the elements position in the viewport, removes the element from the flow of the page */
        position: sticky;
        /* position below the primary fixed EuiHeader in the viewport */
        top: 48px;
      `}
    >
      <HeaderActionMenu mounter={headerActionMenuMounter} />
    </div>
  );
};
