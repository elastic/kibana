/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { useMemo } from 'react';

/**
 * Returns layout styles for the DayPicker `styles` prop (applied as inline styles on UI elements)
 * and CSS custom properties for the wrapper div (cascade into react-day-picker's class-based rules).
 *
 * Range selection states (range_start, range_end, range_middle) are styled via CSS variables
 * because react-day-picker v9 applies them on `.rdp-range_start .rdp-day_button` child selectors,
 * which inline styles on the parent <td> cannot reach.
 */
export const useCalendarViewStyles = () => {
  const { euiTheme } = useEuiTheme();

  const dayPicker = useMemo(
    () => ({
      root: {
        width: '100%',
      },
      months: {
        width: '100%',
      },
      month: {
        padding: `0 ${euiTheme.size.base}`,
      },
      month_caption: {
        display: 'flex',
        fontSize: euiTheme.font.scale.xs * euiTheme.base,
        justifyContent: 'center',
      },
    }),
    [euiTheme]
  );

  return { dayPicker };
};
