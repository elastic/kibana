/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { UseEuiTheme } from '@elastic/eui';

export const removeEuiFocusRing = css`
  outline: none;
  &:focus-visible {
    outline-style: none;
  }
`;

export const passDownFocusRing = (euiTheme: UseEuiTheme['euiTheme'], target: string) => css`
  ${removeEuiFocusRing}
  ${target} {
    /* Safari & Firefox */
    outline: ${euiTheme.focus.width} solid currentColor;
  }
  &:focus-visible ${target} {
    /* Chrome */
    outline-style: auto;
  }
  &:not(:focus-visible) ${target} {
    outline: none;
  }
`;
