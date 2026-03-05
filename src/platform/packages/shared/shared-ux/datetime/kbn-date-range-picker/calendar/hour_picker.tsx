/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useEuiTheme } from '@elastic/eui';

import { Hour } from './hour';
import { hourPickerStyles } from './hour_picker.styles';

interface HourPickerProps {
  selectedHour: string | undefined;
  onHourChange: (hour: string) => void;
  /** Accessible label for the picker group. @default "Select hour" */
  'aria-label'?: string;
  /**
   * When true, the selected slot is a rounded approximation — renders with a light primary
   * background to signal the picker is displaying an approximate, not an exact, value.
   * @default false
   */
  isApproximate?: boolean;
}

export interface HourPickerHandle {
  scrollToSelected: () => void;
}

export const HOURS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
    .toString()
    .padStart(2, '0');
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour}:${minute}`;
});

export const HourPicker = forwardRef<HourPickerHandle, HourPickerProps>(function HourPicker(
  { selectedHour, onHourChange, 'aria-label': ariaLabel = 'Select hour', isApproximate = false },
  ref
) {
  const euiThemeContext = useEuiTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const styles = hourPickerStyles(euiThemeContext);

  const scrollToSelected = () => {
    requestAnimationFrame(() => {
      containerRef.current
        ?.querySelector<HTMLElement>('[aria-current="true"]')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  };

  useImperativeHandle(ref, () => ({ scrollToSelected }));

  useEffect(() => {
    scrollToSelected();
  }, []);

  return (
    <div ref={containerRef} css={styles.container} role="group" aria-label={ariaLabel}>
      {HOURS.map((h) => (
        <Hour
          key={h}
          onClick={() => onHourChange(h)}
          isSelected={h === selectedHour}
          isApproximate={isApproximate && h === selectedHour}
        >
          {h}
        </Hour>
      ))}
    </div>
  );
});
