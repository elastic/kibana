/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { layoutVar } from '@kbn/core-chrome-layout-constants';

/**
 * Sticky bar sizing aligned with {@link layout_global_css} `application.topBar.height`
 * (same as {@link AppMenuBar} / `header__actionMenu`). Height uses `layoutVar` directly
 * so it does not rely on a custom property set only on the scroll ancestor.
 *
 * Does not set `display` / flex alignment — each header row composes its own layout so
 * `EuiTitle` typography merges do not fight flex + height on the same node.
 *
 * We cannot apply border to the header because we need to account for the scrollbar.
 */
export function useMenuHeaderStyle() {
  const { euiTheme } = useEuiTheme();
  const topBarHeight = layoutVar('application.topBar.height', '49px');

  return css`
    --border-width: ${euiTheme.border.width.thin};
    // 20px is forced by section dividers
    --horizontal-padding: calc(20px - var(--border-width));

    position: sticky;
    top: 0;
    z-index: 1;
    box-sizing: border-box;
    width: 100%;
    height: ${topBarHeight};
    min-height: ${topBarHeight};
    max-height: ${topBarHeight};
    padding-inline: var(--horizontal-padding);
    margin: 0 1px;

    & h4 {
      margin-block: 0;
    }
  `;
}
