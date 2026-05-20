/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Packaging-specific override of GridLayoutGlobalStyles for consumer builds (e.g. Cloud UI).
 *
 * WHY a separate file exists here:
 *   The upstream source at `../../src/layouts/grid_global_app_style.tsx` scopes its flyout /
 *   overlay positioning rules under `.kbnBody { … }`. That class is applied to `document.body`
 *   by `@kbn/core-chrome-browser-internal`'s `handleBodyClasses` side-effect — a Kibana-only
 *   service that is not shipped in the tarball. Without it the compensating rules never match,
 *   so `EuiCollapsibleNav` and right-side `EuiFlyout` cover the header.
 *
 *   This file re-implements the styles without the `.kbnBody` gate (matching what the
 *   `cloud-ui/autoops` vendored copy already does) so consumers get correct behaviour
 *   out of the box.
 *
 * MAINTENANCE:
 *   If `../../src/layouts/grid_global_app_style.tsx` gains a new positioning rule, mirror it
 *   here without the `.kbnBody` scope. If it drops a rule, drop it here too. Both files
 *   must stay semantically equivalent for the rules they share.
 *
 *   Upstream source of truth:
 *     src/platform/kbn-ui/chrome-layout/src/layouts/grid_global_app_style.tsx
 *     cloud-ui: autoops/src/shared/layouts/chrome/chrome-layout/layouts/grid/grid_global_app_style.tsx
 */

import React from 'react';
import { css, Global } from '@emotion/react';
import { logicalCSS, useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { APP_MAIN_SCROLL_CONTAINER_ID, layoutVar } from '@kbn/core-chrome-layout-constants';
import {
  globalLayoutStyles,
  projectModeBackgroundStyles,
} from '../../../src/layouts/grid_global_app_style';
import { CommonGlobalAppStyles } from '../../../src/layouts/global_app_styles';

export { CommonGlobalAppStyles };
import type { ChromeStyle } from '../../../src/layout.types';

// Positioning overrides for EUI portals (flyouts, overlay masks, bottom bars) when the
// app scroll root is not document.body.
// NOTE: the upstream version scopes these under `.kbnBody { }` which requires a Kibana
// side-effect. Here they are top-level so they work in any consumer.
const globalTempHackStyles = (_euiTheme: UseEuiTheme['euiTheme'], chromeStyle: ChromeStyle) => css`
  // adjust position of the classic side-navigation
  .euiFlyout.euiCollapsibleNav {
    ${logicalCSS('top', layoutVar('application.top', '0px'))};
    ${logicalCSS('left', layoutVar('application.left', '0px'))};
    ${logicalCSS('bottom', layoutVar('application.bottom', '0px'))};
  }

  // overlay mask "belowHeader" should only cover the application area
  .euiOverlayMask[data-relative-to-header='below'] {
    ${logicalCSS('top', layoutVar('application.top', '0px'))};
    ${logicalCSS('left', layoutVar('application.left', '0px'))};
    ${logicalCSS('right', layoutVar('application.right', '0px'))};
    ${logicalCSS('bottom', layoutVar('application.bottom', '0px'))};
    ${chromeStyle === 'project' && `border-radius: ${_euiTheme.border.radius.medium};`}
  }

  // adjust position of right-side flyouts relative to the application area
  .euiFlyout[class*='right'] {
    ${logicalCSS('top', layoutVar('application.top', '0px'))};
    ${logicalCSS('right', layoutVar('application.right', '0px'))};
    ${logicalCSS('bottom', layoutVar('application.bottom', '0px'))};
    // match the application area border-radius on the right edge,
    // but not for side-by-side child flyouts since they aren't positioned at the rightmost edge
    ${chromeStyle === 'project' &&
    `&:not([data-managed-flyout-layout-mode="side-by-side"][data-managed-flyout-level="child"]) {
        border-top-right-radius: ${_euiTheme.border.radius.medium};
        border-bottom-right-radius: ${_euiTheme.border.radius.medium};
        .euiFlyoutFooter {
          border-bottom-right-radius: ${_euiTheme.border.radius.medium};
        }
      }`}
  }

  // When overlay is above the header (full-viewport modal style), reset to full-viewport positioning
  .euiOverlayMask[data-relative-to-header='above']
    + [data-euiportal='true']
    .euiFlyout[class*='right'] {
    ${logicalCSS('top', 0)};
    ${logicalCSS('right', 0)};
    ${logicalCSS('bottom', 0)};
    border-radius: 0;
  }

  #${APP_MAIN_SCROLL_CONTAINER_ID} {
    ${logicalCSS('padding-right', `var(--euiPushFlyoutOffsetInlineEnd, 0px)`)};
    ${logicalCSS('padding-left', `var(--euiPushFlyoutOffsetInlineStart, 0px)`)};
    ${logicalCSS('padding-bottom', `var(--euiBottomBarOffset, 0px)`)};
  }

  body {
    ${logicalCSS('padding-right', `0px !important`)};
    ${logicalCSS('padding-left', `0px !important`)};
    ${logicalCSS('padding-bottom', `0px !important`)};
    ${logicalCSS('padding-top', `0px !important`)};
  }

  .euiBottomBar.euiBottomBar--fixed {
    left: ${layoutVar('application.left', '0px')} !important;
    right: ${layoutVar('application.right', '0px')} !important;
    bottom: ${layoutVar('application.bottom', '0px')} !important;
    border-bottom-left-radius: ${_euiTheme.border.radius.medium} !important;
    border-bottom-right-radius: ${_euiTheme.border.radius.medium} !important;
    box-shadow: ${_euiTheme.shadows.xs.down} !important;
    clip-path: inset(0 -10px -10px -10px) !important;
  }
`;

export interface GridLayoutGlobalStylesProps {
  chromeStyle?: ChromeStyle;
}

export const GridLayoutGlobalStyles = ({
  chromeStyle = 'classic',
}: GridLayoutGlobalStylesProps) => {
  const euiTheme = useEuiTheme();
  const isProjectStyle = chromeStyle === 'project';

  return (
    <>
      <Global
        styles={[
          globalLayoutStyles(euiTheme),
          globalTempHackStyles(euiTheme.euiTheme, chromeStyle),
          isProjectStyle && projectModeBackgroundStyles(euiTheme),
        ]}
      />
      <CommonGlobalAppStyles />
    </>
  );
};
