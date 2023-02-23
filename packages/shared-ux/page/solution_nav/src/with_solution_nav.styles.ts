/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/css';
import { euiCanAnimate, EuiThemeComputed } from '@elastic/eui';

export const WithSolutionNavStyles = (euiTheme: EuiThemeComputed<{}>) => {
  return css`
    flex: 0 1 0;
    overflow: hidden;
    ${euiCanAnimate} {
      transition: min-width ${euiTheme.animation.fast} ${euiTheme.animation.resistance};
    }
  `;
};
