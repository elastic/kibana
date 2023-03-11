/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { euiShadowMedium, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

/** @todo important style should be remove after fixing elastic/eui/issues/6314. */
export const popoverDragAndDropCss = (euiTheme: UseEuiTheme) =>
  css`
    // Always needed for popover with drag & drop in them
    transform: none !important;
    transition: none !important;
    filter: none !important;
    ${euiShadowMedium(euiTheme)}
  `;
