/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable } from 'rxjs';
import { useEuiTheme, useEuiThemeCSSVariables } from '@elastic/eui';
import { css } from '@emotion/react';
import { MountPoint } from '@kbn/core-mount-utils-browser';
import React, { useEffect } from 'react';
import { HeaderActionMenu, useHeaderActionMenuMounter } from '../header/header_action_menu';

interface AppMenuBarProps {
  // TODO: get rid of observable
  appMenuActions$: Observable<MountPoint | undefined>;
}

export const AppMenuBar = ({ appMenuActions$ }: AppMenuBarProps) => {
  const headerActionMenuMounter = useHeaderActionMenuMounter(appMenuActions$);
  const { euiTheme } = useEuiTheme();
  const { setGlobalCSSVariables } = useEuiThemeCSSVariables();
  const zIndex =
    typeof euiTheme.levels.header === 'number'
      ? euiTheme.levels.header - 10 // We want it to appear right below the header
      : euiTheme.levels.header;

  useEffect(() => {
    if (headerActionMenuMounter.mount) {
      setGlobalCSSVariables({
        '--kbnProjectHeaderAppActionMenuHeight': euiTheme.size.xxxl,
      });
    } else {
      setGlobalCSSVariables({
        '--kbnProjectHeaderAppActionMenuHeight': null,
      });
    }
  }, [setGlobalCSSVariables, headerActionMenuMounter.mount, euiTheme.size.xxxl]);

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
        flex-shrink: 0;
      `}
    >
      <HeaderActionMenu mounter={headerActionMenuMounter} />
    </div>
  );
};
