/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { useMemo } from 'react';

import { euiCanAnimate, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const useGridRowHeaderStyles = () => {
  const { euiTheme } = useEuiTheme();

  const headerStyles = useMemo(() => {
    return css`
      height: calc(${euiTheme.size.xl} + (2 * ${euiTheme.size.s}));
      padding: ${euiTheme.size.s} 0px;

      border-bottom: 1px solid transparent; // prevents layout shift
      .kbnGridRowContainer--collapsed & {
        border-bottom: ${euiTheme.border.thin};
      }

      .kbnGridLayout--deleteRowIcon {
        margin-left: ${euiTheme.size.xs};
      }

      // these styles hide the delete + move actions by default and only show them on hover
      .kbnGridLayout--deleteRowIcon,
      .kbnGridLayout--moveRowIcon {
        opacity: 0;
        ${euiCanAnimate} {
          transition: opacity ${euiTheme.animation.extraFast} ease-in;
        }
      }
      &:hover .kbnGridLayout--deleteRowIcon,
      &:hover .kbnGridLayout--moveRowIcon {
        opacity: 1;
      }
    `;
  }, [euiTheme]);

  return headerStyles;
};
