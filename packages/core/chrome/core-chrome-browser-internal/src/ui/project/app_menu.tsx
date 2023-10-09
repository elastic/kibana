/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEuiTheme, EuiResizeObserver } from '@elastic/eui';
import { css } from '@emotion/react';
import { MountPoint } from '@kbn/core-mount-utils-browser';
import React from 'react';
import { HeaderActionMenu } from '../header/header_action_menu';

interface AppMenuBarProps {
  headerActionMenuMounter: { mount: MountPoint<HTMLElement> | undefined };
}
export const AppMenuBar = ({ headerActionMenuMounter }: AppMenuBarProps) => {
  const { euiTheme } = useEuiTheme();
  const [height, setHeight] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    if (height === null) return;
    const kbnAppWrapper = document.querySelector('.kbnAppWrapper') as HTMLElement;
    if (!kbnAppWrapper) return; // should never happen

    kbnAppWrapper.style.setProperty('--kbnProjectHeaderAppActionMenuHeight', `${height}px`);
    return () => {
      kbnAppWrapper.style.removeProperty('--kbnProjectHeaderAppActionMenuHeight');
    };
  }, [height]);

  return (
    <EuiResizeObserver onResize={(d) => setHeight(d.height)}>
      {(resizeRef) => (
        <div
          className="header__actionMenu"
          data-test-subj="kibanaProjectHeaderActionMenu"
          ref={resizeRef}
          css={css`
            z-index: ${euiTheme.levels.header};
            background: ${euiTheme.colors.emptyShade};
            border-bottom: ${height ? euiTheme.border.thin : 'none'};
            justify-content: end;
            align-items: center;
            padding: ${height ? euiTheme.size.s : 0};
            margin-bottom: -${euiTheme.border.width.thin};
            /* fixates the elements position in the viewport, removes the element from the flow of the page */
            position: sticky;
            /* position below the primary fixed EuiHeader in the viewport */
            top: var(--euiFixedHeadersOffset, 0);
          `}
        >
          <HeaderActionMenu mounter={headerActionMenuMounter} />
        </div>
      )}
    </EuiResizeObserver>
  );
};
