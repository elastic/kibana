/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transparentize, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { css as cssClassName } from '@emotion/css';
import { useMemo } from 'react';
import { FOCUSED_STEP_DECORATION_INSET_PX } from '../../styles/constants';

/** Border + shadow block class used for focused / newly inserted steps. */
export function useStepHighlightBlockClass(): string {
  const { euiTheme } = useEuiTheme();
  const borderColor = euiTheme.colors.vis.euiColorVis2;
  const shadowSmall = useEuiShadow('s');

  return useMemo(
    () =>
      // Pseudo-element sizes the decoration; parent decoration box is 0×0.
      cssClassName`
        position: relative;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: ${FOCUSED_STEP_DECORATION_INSET_PX}px;
          border: 1px solid ${borderColor};
          border-radius: 4px;
          ${shadowSmall}
          background-color: ${transparentize(borderColor, 0.02)};
          pointer-events: none;
      }`,
    [borderColor, shadowSmall]
  );
}
