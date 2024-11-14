/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import {
  UseEuiTheme,
  logicalCSS,
  logicalTextAlignCSS,
  mathWithUnits,
  euiTextTruncate,
  euiBreakpoint,
} from '@elastic/eui';
// @ts-expect-error style types not defined
import { euiToolTipStyles } from '@elastic/eui/lib/components/tool_tip/tool_tip.styles';

// Style tooltip popup (gets created dynamically at the top level if dashboard has a Vega vis)
// Adapted from https://github.com/vega/vega-tooltip

export const vegaVisTooltipStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;
  // Merge EUI tooltip styles into ours
  const euiStyles = euiToolTipStyles(euiThemeContext);

  // Note that these are globally-set styles, due to vega_tooltip being vanilla JS/non-React
  return css`
    .vgaVis__tooltip {
      ${euiStyles.euiToolTip}

      ${logicalCSS('max-width', '100%')}
        position: fixed;

      h2 {
        ${logicalCSS('margin-bottom', euiTheme.size.s)}
      }

      &--textTruncate {
        td {
          ${euiTextTruncate()}
        }
      }

      td {
        ${logicalCSS('padding-vertical', euiTheme.size.xs)}

        &.key {
          ${logicalCSS(
            'max-width',
            mathWithUnits(euiTheme.size.base, (x) => x * 10)
          )}
          color: ${euiTheme.colors.lightShade};
          ${logicalTextAlignCSS('right')}
          ${logicalCSS('padding-right', euiTheme.size.xs)}
        }

        &.value {
          ${logicalCSS(
            'max-width',
            mathWithUnits(euiTheme.size.l, (x) => x * 10)
          )}
          ${logicalTextAlignCSS('left')}
        }
      }

      ${euiBreakpoint(euiThemeContext, ['xs', 'm'])} {
        td {
          &.key {
            ${logicalCSS(
              'max-width',
              mathWithUnits(euiTheme.size.base, (x) => x * 6)
            )}
          }

          &.value {
            ${logicalCSS(
              'max-width',
              mathWithUnits(euiTheme.size.base, (x) => x * 10)
            )}
          }
        }
      }
    }

    // Positions
    .vgaVis__tooltip--left {
      ${euiStyles.left}
    }
    .vgaVis__tooltip--right {
      ${euiStyles.right}
    }
    .vgaVis__tooltip--top {
      ${euiStyles.top}
    }
    .vgaVis__tooltip--bottom {
      ${euiStyles.bottom}
    }
  `;
};
