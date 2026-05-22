/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

// The structure of this styles file is slightly different from other style files in this folder/component — that's intentional, we're trying things out, I think this is better: each separate style is a function, instead of the function wrapping all styles e.g. `root`, `part`…

const root = () => css`
  white-space: nowrap;
`;

const part = ({ euiTheme }: UseEuiTheme) => css`
  &:hover {
    color: ${euiTheme.colors.textPrimary};
    background-color: ${euiTheme.colors.backgroundLightPrimary};
  }
`;

export { root, part };
