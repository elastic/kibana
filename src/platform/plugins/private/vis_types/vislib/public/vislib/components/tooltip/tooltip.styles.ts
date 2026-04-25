/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { css } from '@emotion/react';
import { type UseEuiTheme, euiShadow } from '@elastic/eui';

export const vislibTooltipStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;
  return css`
    .visTooltip,
    .visTooltip__sizingClone {
      ${euiShadow(euiThemeContext, 'l', { border: 'none' })};
      border-radius: ${euiTheme.border.radius.medium};
      background-color: ${euiTheme.colors.backgroundBasePlain};
      border: ${euiThemeContext.euiTheme.border.width.thin} solid
        ${euiThemeContext.euiTheme.components.tooltipBorderFloating};
      color: ${euiTheme.colors.textParagraph};
      z-index: ${euiTheme.levels.toast};
      overflow-wrap: break-word;
      visibility: hidden;
      pointer-events: none;
      position: fixed;
      max-width: calc(${euiTheme.size.xl} * 10);
      overflow: hidden;
      padding: 0;

      > :last-child {
        margin-bottom: ${euiTheme.size.s};
      }

      > * {
        margin: ${euiTheme.size.s} ${euiTheme.size.s} 0;
      }

      table {
        td,
        th {
          text-align: left;
          padding: ${euiTheme.size.xs};
          overflow-wrap: break-word;
        }
      }
    }

    .visTooltip__header {
      margin: 0 0 ${euiTheme.size.s};
      padding: ${euiTheme.size.xs} ${euiTheme.size.s};
      display: flex;
      align-items: center;
      color: ${euiTheme.colors.textParagraph};
      &:last-child {
        margin-bottom: 0;
      }

      + * {
        margin-top: ${euiTheme.size.s};
      }
    }

    .visTooltip__labelContainer,
    .visTooltip__valueContainer {
      overflow-wrap: break-word;
    }

    .visTooltip__headerIcon {
      margin-right: ${euiTheme.size.xs};
    }

    .visTooltip__headerText {
      flex: 1 1 100%;
    }

    .visTooltip__label {
      font-weight: ${euiTheme.font.weight.medium};
    }

    .visTooltip__sizingClone {
      top: -500px;
      left: -500px;
    }
  `;
};
