/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { useEuiTheme } from '@elastic/eui';

interface CalendarViewProps {
  month: Date;
  range: DateRange | undefined;
  setRange: (range?: DateRange) => void;
}

export function CalendarView({ month, range, setRange }: CalendarViewProps) {
  const { euiTheme } = useEuiTheme();

  const dayPickerStyles = useMemo(() => {
    return {
      root: {
        width: '100%',
        padding: '0 24px',
      },
      months: {
        width: '100%',
      },
      month: {
        width: '100%',
        margin: 0,
      },
      month_caption: {
        position: 'sticky',
        top: 0,
        backgroundColor: euiTheme.colors.emptyShade,
        zIndex: 1,
        padding: `${euiTheme.size.m} 0`,
      },
      caption_label: {
        fontSize: euiTheme.font.scale.l.fontSize,
        fontWeight: euiTheme.font.weight.bold,
        lineHeight: euiTheme.font.scale.l.lineHeight,
      },
      weekdays: {
        marginBottom: euiTheme.size.s,
      },
      weekday: {
        color: euiTheme.colors.subduedText,
        fontSize: euiTheme.font.scale.s.fontSize,
        fontWeight: euiTheme.font.weight.regular,
        textAlign: 'center' as const,
      },
      week: {
        marginBottom: euiTheme.size.xs,
      },
      day: {
        padding: 0,
      },
      day_button: {
        width: '100%',
        minHeight: euiTheme.size.xxxl,
        border: 'none',
        borderRadius: euiTheme.border.radius.medium,
        transition: `background-color ${euiTheme.animation.fast} ease-in-out`,
      },
      range_start: {
        backgroundColor: euiTheme.colors.primary,
        color: euiTheme.colors.ghost,
        borderRadius: `${euiTheme.border.radius.medium} 0 0 ${euiTheme.border.radius.medium}`,
      },
      range_end: {
        backgroundColor: euiTheme.colors.primary,
        color: euiTheme.colors.ghost,
        borderRadius: `0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium} 0`,
      },
      range_middle: {
        backgroundColor: euiTheme.colors.lightestShade,
      },
      today: {
        border: `2px solid ${euiTheme.colors.primary}`,
        fontWeight: euiTheme.font.weight.bold,
      },
    };
  }, [euiTheme]);

  return (
    <DayPicker
      mode="range"
      month={month}
      selected={range}
      onSelect={setRange}
      required={false}
      disableNavigation
      hideNavigation
      styles={dayPickerStyles}
    />
  );
}
