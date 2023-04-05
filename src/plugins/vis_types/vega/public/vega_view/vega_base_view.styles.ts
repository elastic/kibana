/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';
import {
  UseEuiTheme,
  logicalCSS,
  mathWithUnits,
  euiScrollBarStyles,
  euiFontSize,
  euiBackgroundColor,
} from '@elastic/eui';

// Note that these are globally-set styles, due to vega_base_view being vanilla JS/non-React
export const vegaBaseViewStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;
  return css`
    .vgaVis {
      display: flex;
      flex: 1 1 100%;
      position: relative;
      // flex-direction determined by js
    }

    .vgaVis--autoresize {
      ${euiScrollBarStyles(euiThemeContext)};
      ${logicalCSS('max-width', '100%')}
      ${logicalCSS('max-height', '100%')}
      overflow: auto;
    }

    .vgaVis__view {
      z-index: 0;
      flex: 1 1 100%;

      display: block;

      canvas {
        display: block;
      }

      // BUG #23514: Make sure Vega doesn't display the controls in two places
      .vega-bindings {
        display: none !important;
      }
    }

    .vgaVis__controls {
      ${euiFontSize(euiThemeContext, 's')}
      display: flex;

      &:not(:empty) {
        // Adding a little bit of padding helps with the unnecessary scrollbars
        ${logicalCSS('padding-vertical', euiTheme.size.s)}
        ${logicalCSS('padding-horizontal', 0)}
      }

      &.vgaVis__controls--column {
        flex-direction: column;
      }

      &.vgaVis__controls--row {
        flex-direction: row;

        > .vega-bind {
          flex-grow: 1;
        }
      }

      > .vega-bind {
        .vega-bind-name {
          display: inline-block;
          ${logicalCSS(
            'width',
            mathWithUnits(euiTheme.size.m, (x) => x * 10 - euiTheme.base)
          )}
        }

        input[type='range'] {
          ${logicalCSS(
            'width',
            mathWithUnits(euiTheme.size.m, (x) => x * 10)
          )}
          display: inline-block;
          vertical-align: middle;
        }

        label {
          margin: 0;
          ${logicalCSS('margin-left', euiTheme.size.s)}
        }

        select {
          ${logicalCSS(
            'max-width',
            mathWithUnits(euiTheme.size.base, (x) => x * 10)
          )}
        }

        .vega-bind-radio label {
          ${logicalCSS('margin-vertical', 0)}
          ${logicalCSS('margin-right', euiTheme.size.s)}
          ${logicalCSS('margin-left', euiTheme.size.xs)}
        }
      }
    }

    // Messages

    .vgaVis__messages {
      position: absolute;
      ${logicalCSS('top', 0)}
      ${logicalCSS('width', '100%')}
      margin: auto;
      opacity: 0.8;
      z-index: 1;
      list-style: none;
    }

    .vgaVis__message {
      margin: ${euiTheme.size.s};

      .vgaVis__messageCode {
        white-space: pre-wrap;
        padding: ${euiTheme.size.s};
      }
    }

    .vgaVis__message--warn .vgaVis__messageCode {
      background-color: ${euiBackgroundColor(euiThemeContext, 'warning')};
      color: ${euiTheme.colors.warningText};
    }

    .vgaVis__message--err .vgaVis__messageCode {
      background-color: ${euiBackgroundColor(euiThemeContext, 'danger')};
      color: ${euiTheme.colors.dangerText};
    }
  `;
};
