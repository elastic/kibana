/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';

import { Hour } from './hour';
import { hourPickerStyles } from './hour_picker.styles';

interface HourPickerProps {
  selectedHour: string | undefined;
  onHourChange: (hour: string) => void;
}

const HOURS_IN_DAY = 24;
const HOURS = Array.from({ length: HOURS_IN_DAY * 2 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? '00' : '30';
  return `${hour}:${minute}`;
});

export function HourPicker({ selectedHour, onHourChange }: HourPickerProps) {
  const euiThemeContext = useEuiTheme();
  const styles = hourPickerStyles(euiThemeContext);

  return (
    <div css={styles.container}>
      {HOURS.map((h) => (
        <Hour key={h} onClick={() => onHourChange(h)} isSelected={h === selectedHour}>
          {h}
        </Hour>
      ))}
    </div>
  );
}
