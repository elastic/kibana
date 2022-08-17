/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/css';
import { euiThemeVars } from '@kbn/ui-theme';

export const colors = {
  subdued: css`
    fill: ${euiThemeVars.euiTextSubduedColor};
  `,
  accent: css`
    fill: ${euiThemeVars.euiColorVis0};
  `,
};

export const noFill = css`
  fill: none;
`;
