/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { type UseEuiTheme, euiFontSize, euiScrollBarStyles } from '@elastic/eui';
import chroma from 'chroma-js';
export const vislibLayoutStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;
  const visLineColor = chroma(euiTheme.colors.darkShade).alpha(0.2).css();
  const visHoverBackgroundColor = chroma(euiTheme.colors.fullShade).alpha(0.1).css();

  return css`
    // BEM NOTE: These selectors could not be renamed.
    // Most come from an external libray, others are too general for
    // search and replace. The SVG itself doesn't have a class, nor
    // could it be easily found to apply to all chart types.
    // At least wrapping selectors inside .visWrapper will narrow scope.

    // sass-lint:disable-block no-mergeable-selectors
    // Keep SVG and non-renamable selectors separately
    .visWrapper {
      display: flex;
      flex: 1 1 100%;
      flex-direction: row;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
      padding: ${euiTheme.size.s} 0;

      svg {
        overflow: visible;
      }

      // SVG Element Default Styling
      rect {
        opacity: 1;

        &:hover {
          opacity: 0.8;
        }
      }

      circle {
        opacity: 0;

        &:hover {
          opacity: 1;
          stroke-width: ${euiTheme.size.s};
          stroke-opacity: 0.8;
        }
      }

      .grid > path {
        stroke: ${visLineColor};
      }

      .label-line {
        fill: none;
        stroke-width: 2px;
        stroke: ${visLineColor};
      }

      .label-text {
        font-size: ${euiFontSize(euiThemeContext, 'xs').fontSize};
        font-weight: ${euiTheme.font.weight.regular};
      }

      .y-axis-div {
        flex: 1 1 ${euiTheme.size.l};
        min-width: 1px;
        min-height: ${euiTheme.size.m};
        margin: calc(${euiTheme.size.xs} + 1px) 0;
      }

      .x-axis-div {
        min-height: 0;
        min-width: 1px;
        margin: 0 calc(${euiTheme.size.xs} + 1px);
        width: 100%;

        svg {
          float: left; /* for some reason svg wont get positioned in top left corner of container div without this */
        }
      }

      .tick text {
        font-size: calc(${euiFontSize(euiThemeContext, 'xs').fontSize} - 1px);
        fill: ${euiTheme.colors.darkShade};
      }

      .axis-title text {
        font-size: ${euiFontSize(euiThemeContext, 'xs').fontSize};
        font-weight: ${euiTheme.font.weight.bold};
        fill: ${euiTheme.colors.textParagraph};
      }

      .y-axis-title {
        min-height: calc(${euiTheme.size.m} + 2px);
        min-width: 1px;
      }

      .x-axis-title {
        min-width: ${euiTheme.size.base};
      }

      .chart-title {
        flex: 1 1 100%;
        min-height: calc(${euiTheme.size.m} + 2px);
        min-width: calc(${euiTheme.size.m} + 2px);

        text {
          font-size: calc(${euiFontSize(euiThemeContext, 'xs').fontSize} - 1px);
          fill: ${euiTheme.colors.darkShade};
        }
      }

      .chart {
        flex: 1 1 100%;
        min-height: 0;
        min-width: 0;
        overflow: visible;
        ${euiScrollBarStyles(euiThemeContext)};
        > svg {
          display: block;
        }
      }

      .chart-row,
      .chart-column {
        flex: 1 1 auto;
        min-height: 0;
        min-width: 0;
      }

      // Needs to come after .y-axis-div
      .visWrapper__chart--first {
        margin-top: 0;
        margin-left: 0;
      }

      .visWrapper__chart--last {
        margin-bottom: 0;
        margin-right: 0;
      }

      .axis {
        shape-rendering: crispEdges;
        stroke-width: 1px;

        line,
        path {
          stroke: ${euiTheme.border.color};
          fill: none;
          shape-rendering: crispEdges;
        }
      }

      .chart-label,
      .label-text,
      .chart-text {
        fill: ${euiTheme.colors.darkShade};
      }

      /* Brush Styling */
      .brush .extent {
        shape-rendering: crispEdges;
        fill: ${visHoverBackgroundColor};
      }

      .series > path,
      .series > rect {
        stroke-opacity: 1;
        stroke-width: 0;
      }

      .series > path {
        fill-opacity: 0.8;
      }

      .blur_shape {
        // sass-lint:disable-block no-important
        opacity: 0.3 !important;
      }

      .slice {
        stroke-width: calc(${euiTheme.size.xs} / 2);
        stroke: ${euiTheme.colors.emptyShade};

        &:hover {
          opacity: 0.8;
        }
      }

      .line {
        circle {
          opacity: 1;

          &:hover {
            stroke-width: ${euiTheme.size.s};
            stroke-opacity: 0.8;
          }
        }
      }

      .endzone {
        pointer-events: none;
        fill: ${visHoverBackgroundColor};
      }
    }

    .visWrapper__column {
      display: flex;
      flex: 1 0 0;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
    }

    .visWrapper__splitCharts--column {
      display: flex;
      flex: 1 0 20px;
      flex-direction: row;
      min-height: 0;
      min-width: 0;

      .visWrapper__chart {
        margin-top: 0;
        margin-bottom: 0;
      }
    }

    .visWrapper__splitCharts--row {
      display: flex;
      flex-direction: column;
      flex: 1 1 100%;
      min-height: 0;
      min-width: 0;

      .visWrapper__chart {
        margin-left: 0;
        margin-right: 0;
      }
    }

    .visWrapper__chart {
      display: flex;
      flex: 1 0 0;
      overflow: visible;
      margin: 5px;
      min-height: 0;
      min-width: 0;
    }

    // General Axes

    .visAxis__column--top .axis-div svg {
      margin-bottom: -5px;
    }

    // Y Axes

    .visAxis--x,
    .visAxis--y {
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
    }

    .visAxis--x {
      overflow: visible;
    }

    .visAxis__spacer--y {
      min-height: 0;
    }

    .visAxis__column--y {
      display: flex;
      flex-direction: row;
      flex: 1 0 calc(${euiTheme.size.xl} + ${euiTheme.size.xs});
      min-height: 0;
      min-width: 0;
    }

    .visAxis__splitTitles--y {
      display: flex;
      flex-direction: column;
      min-height: ${euiTheme.size.m};
      min-width: 0;
    }

    .visAxis__splitTitles--x {
      display: flex;
      flex-direction: row;
      min-height: 1px;
      max-height: ${euiTheme.size.base};
      min-width: ${euiTheme.size.base};
    }

    .visAxis__splitAxes--x,
    .visAxis__splitAxes--y {
      display: flex;
      flex-direction: column;
      min-height: calc(${euiTheme.size.base} + ${euiTheme.size.xs});
      min-width: 0;
    }

    .visAxis__splitAxes--x {
      flex-direction: row;
      min-height: 0;
    }
  `;
};
