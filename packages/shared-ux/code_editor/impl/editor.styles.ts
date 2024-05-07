/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

export const styles = {
  container: css`
    position: relative;
    height: 100%;
  `,
  fullscreenContainer: css`
    position: absolute;
    left: 0;
    top: 0;
  `,
  keyboardHint: (euiTheme: EuiThemeComputed) => css`
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    &:focus {
      z-index: ${euiTheme.levels.mask};
    }
  `,
  controls: {
    base: (euiTheme: EuiThemeComputed) => css`
      position: absolute;
      top: ${euiTheme.size.xs};
      right: ${euiTheme.size.base};
      z-index: ${euiTheme.levels.menu};
    `,
    fullscreen: (euiTheme: EuiThemeComputed) => css`
      top: ${euiTheme.size.l};
      right: ${euiTheme.size.l};
    `,
  },
};
