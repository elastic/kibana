/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { transparentize, type EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/css';

export const SolutionSideNavItemStyles = (euiTheme: EuiThemeComputed<{}>) => css`
  font-weight: ${euiTheme.font.weight.regular};
  &.solutionSideNavItem--isPrimary * {
    font-weight: ${euiTheme.font.weight.bold};
  }
  &:focus,
  &:focus-within,
  &:hover,
  &.solutionSideNavItem--isActive {
    background-color: ${transparentize(euiTheme.colors.primary, 0.1)};
  }
  .solutionSideNavItemButton:focus,
  .solutionSideNavItemButton:focus-within,
  .solutionSideNavItemButton:hover {
    transform: none; /* prevent translationY transform that causes misalignment within the list item */
    background-color: ${transparentize(euiTheme.colors.primary, 0.2)};
  }
`;
