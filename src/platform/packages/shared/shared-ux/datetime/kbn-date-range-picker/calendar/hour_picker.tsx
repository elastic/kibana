/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { useEuiTheme } from '@elastic/eui';

import { Hour } from './hour';
import { hourPickerStyles } from './hour_picker.styles';

interface HourPickerProps {
  hour: number;
  onHourChange: (hour: number) => void;
}

// TODO: move to utils
const HOURS_IN_DAY = 24;
const HOURS = Array.from({ length: HOURS_IN_DAY * 2 }, (_, index) => {
  if (index % 2 === 0) {
    return `${index / 2}:00`;
  } else {
    return `${(index - 1) / 2}:30`;
  }
});

// TODO: handle interaction and state
export function HourPicker({ hour, onHourChange }: HourPickerProps) {
  const euiThemeContext = useEuiTheme();
  const styles = hourPickerStyles(euiThemeContext);

  const [selectedHour, setSelectedHour] = useState<string>();

  return (
    <div css={styles.container}>
      {HOURS.map((h) => (
        <Hour key={h} onClick={() => setSelectedHour(h)}>
          {h}
        </Hour>
      ))}
    </div>
  );
}
