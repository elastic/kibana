/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';

/**
 * Sticky positioning for secondary / nested menu titles.
 * Padding is set on `SecondaryMenu` and `nested_secondary_menu/header` so popover insets stay in sync.
 * We cannot apply border to the header because we need to account for the scrollbar.
 */
export function useMenuHeaderStyle() {
  return css`
    position: sticky;
    top: 0;
    z-index: 1;
    box-sizing: border-box;
    margin: 0 1px;
    height: auto;
    min-height: 0;
  `;
}
