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
  headerActionMenuMounter: { mount: MountPoint<HTMLElement> | undefined };
}
export const AppMenuBar = ({ headerActionMenuMounter }: AppMenuBarProps) => {
  const { euiTheme } = useEuiTheme();
  const zIndex =
    typeof euiTheme.levels.header === 'number'
      ? euiTheme.levels.header - 1 // We want it to appear right below the header
      : euiTheme.levels.header;

  return (
    <div
      className="header__actionMenu"
      data-test-subj="kibanaProjectHeaderActionMenu"
      css={css`
        z-index: ${zIndex};
        background: ${euiTheme.colors.body};
        border-bottom: ${euiTheme.border.thin};
        display: flex;
        justify-content: end;
        align-items: center;
        padding: 0 ${euiTheme.size.s};
        height: var(--kbnProjectHeaderAppActionMenuHeight, ${euiTheme.size.xxxl});
        margin-bottom: -${euiTheme.border.width.thin};
        /* fixates the elements position in the viewport, removes the element from the flow of the page */
        position: sticky;
        /* position below the primary fixed EuiHeader in the viewport */
        top: var(--euiFixedHeadersOffset, 0);
      `}
    >
      <HeaderActionMenu mounter={headerActionMenuMounter} />
    </div>
  );
};
