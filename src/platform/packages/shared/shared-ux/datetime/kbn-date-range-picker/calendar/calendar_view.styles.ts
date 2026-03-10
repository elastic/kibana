/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 * Returns layout styles for the DayPicker `css` prop.
 *
 * @see https://daypicker.dev/docs/styling
 */
export const calendarViewStyles = ({ euiTheme }: UseEuiTheme) => {
  const dayPicker = css`
    .rdp-root {
      width: 100%;
    }

    .rdp-months {
      max-width: initial;
      width: 100%;
    }

    .rdp-month {
      width: 100%;
    }

    .rdp-month_caption {
      color: ${euiTheme.colors.textHeading};
      display: flex;
      font-size: ${euiTheme.font.scale.s * euiTheme.base}px;
      font-weight: ${euiTheme.font.weight.bold};
      height: calc(${euiTheme.size.xl} + ${euiTheme.size.xs});
      justify-content: center;
      padding-bottom: ${euiTheme.size.s};
      padding-top: ${euiTheme.size.m};
    }

    .rdp-month_grid {
      border-collapse: separate;
      border-spacing: 0 ${euiTheme.size.xxs};
      width: 100%;
    }

    .rdp-weekday {
      border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
      color: ${euiTheme.colors.textSubdued};
      height: ${euiTheme.size.l};
      font-size: ${euiTheme.font.scale.xxs * euiTheme.base}px;
      font-weight: ${euiTheme.font.weight.semiBold};
      padding: ${euiTheme.size.xs};
      vertical-align: middle;
    }

    .rdp-weeks tr:first-child td {
      padding-top: ${euiTheme.size.s};
    }

    .rdp-day, .rdp-range_start, .rdp-range_end {
      background: transparent;
      height: ${euiTheme.size.xl};
    }
    
    .rdp-day_button {
      border: ${euiTheme.border.width.thick} solid transparent;
    }

    :not(.rdp-today) .rdp-day_button {
      font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
      font-weight: ${euiTheme.font.weight.regular};
      height: ${euiTheme.size.xl};
      width: 100%;
    }
  
    .rdp-today .rdp-day_button {
      position: relative;
      color: ${euiTheme.colors.textParagraph};

      &::after {
        content: '';
        position: absolute;
        top: ${euiTheme.size.xs};
        right: ${euiTheme.size.xs};
        /* There's no such token in EUI so we use a hardcoded value */
        width: 6px;
        /* There's no such token in EUI so we use a hardcoded value */
        height: 6px;
        background-color: ${euiTheme.colors.backgroundFilledPrimary};
        /* There's no such token in EUI so we use a hardcoded value */
        border-radius: 3px;
      }
    }
    
    .rdp-selected.rdp-range_start .rdp-day_button::after,
    .rdp-selected.rdp-range_end .rdp-day_button::after {
      background-color: ${euiTheme.colors.textInverse};
    }

    .rdp-selected .rdp-day_button {
      background-color: ${euiTheme.colors.backgroundLightPrimary};
      border: ${euiTheme.border.width.thick} solid ${euiTheme.colors.borderStrongPrimary};
      color: ${euiTheme.colors.textPrimary};
      font-weight: ${euiTheme.font.weight.semiBold};
    }
    
    .rdp-selected:not(.rdp-range_middle) .rdp-day_button {
      border-radius: ${euiTheme.border.radius.small};
      font-weight: ${euiTheme.font.weight.bold};
    }
    
    .rdp-range_middle .rdp-day_button {
      position: relative;
      background-color: ${euiTheme.colors.backgroundLightPrimary};
      border: ${euiTheme.border.width.thick} solid ${euiTheme.colors.backgroundLightPrimary};
      color: ${euiTheme.colors.textPrimary};

      /* We use the same layering method as EuiButton */
      &:hover::before {
        content: '';
        position: absolute;
        inset: 0;
        background-color: ${euiTheme.components.buttons.backgroundPrimaryHover};
        pointer-events: none;
      }
    }

    /* Left rounding: row edge or month edge (preceded by outside cell) */
    .rdp-range_middle:not(.rdp-outside):first-child .rdp-day_button,
    .rdp-outside + .rdp-range_middle:not(.rdp-outside) .rdp-day_button {
      border-radius: ${euiTheme.border.radius.small} 0 0 ${euiTheme.border.radius.small};
    }

    /* Right rounding: row edge or month edge (followed by outside cell) */
    .rdp-range_middle:not(.rdp-outside):last-child .rdp-day_button,
    .rdp-range_middle:not(.rdp-outside):has(+ .rdp-outside) .rdp-day_button {
      border-radius: 0 ${euiTheme.border.radius.small} ${euiTheme.border.radius.small} 0;
    }

    /* Remove the inward border radius on the start and end of the range when they are siblings */
    .rdp-range_start:has(+ .rdp-range_end) .rdp-day_button {
      border-radius: ${euiTheme.border.radius.small} 0 0 ${euiTheme.border.radius.small};
    }
    
    .rdp-range_start + .rdp-range_end .rdp-day_button {
      border-radius: 0 ${euiTheme.border.radius.small} ${euiTheme.border.radius.small} 0;
    }
    
    .rdp-range_end .rdp-day_button, .rdp-range_start .rdp-day_button {
      background-color: ${euiTheme.colors.backgroundFilledPrimary};
      border: ${euiTheme.border.width.thick} solid ${euiTheme.colors.backgroundFilledPrimary};
      color: ${euiTheme.colors.textInverse};
      font-weight: ${euiTheme.font.weight.bold};
    }
  }`;

  return { dayPicker };
};
