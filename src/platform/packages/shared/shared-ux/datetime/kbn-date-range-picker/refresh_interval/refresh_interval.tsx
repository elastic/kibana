/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useEffect, useRef, type ChangeEvent } from 'react';
import { css } from '@emotion/react';

import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiSelect, EuiSwitch } from '@elastic/eui';

import { refreshIntervalTexts } from '../translations';
import type { AutoRefreshIntervalUnit, AutoRefreshSettings } from '../types';
import { msToAutoRefreshInterval, autoRefreshIntervalToMs } from '../utils';

const countFieldFlexItemCss = css`
  min-inline-size: 60px;
`;

const unitSelectFlexItemCss = css`
  min-inline-size: 100px;
`;

const AUTO_REFRESH_UNIT_OPTIONS: Array<{ value: AutoRefreshIntervalUnit; text: string }> = [
  { value: 's', text: refreshIntervalTexts.unitSeconds },
  { value: 'm', text: refreshIntervalTexts.unitMinutes },
  { value: 'h', text: refreshIntervalTexts.unitHours },
];

export interface RefreshIntervalProps {
  /** Current auto-refresh state. */
  value: AutoRefreshSettings;
  /** Called with the next auto-refresh state when the user changes it. */
  onChange: (value: AutoRefreshSettings) => void;
}

/**
 * "Refresh every" form: a switch to turn auto-refresh on and off, an interval count and a unit.
 * Turning auto-refresh on also starts the timer, so a second click on play is not needed.
 */
export function RefreshInterval({ value, onChange }: RefreshIntervalProps) {
  const derived = msToAutoRefreshInterval(value.intervalMs, value.intervalDisplayUnit);

  const [countInput, setCountInput] = useState<number | ''>(derived.count);

  // Sync count input when interval or display unit changes externally (not only interval ms).
  const prevDisplayKeyRef = useRef(`${value.intervalMs}\0${value.intervalDisplayUnit}`);

  useEffect(() => {
    const key = `${value.intervalMs}\0${value.intervalDisplayUnit}`;
    if (key !== prevDisplayKeyRef.current) {
      setCountInput(msToAutoRefreshInterval(value.intervalMs, value.intervalDisplayUnit).count);
      prevDisplayKeyRef.current = key;
    }
  }, [value.intervalMs, value.intervalDisplayUnit]);

  const handleToggle = useCallback(() => {
    const isEnabled = !value.isEnabled;
    onChange({ ...value, isEnabled, isPaused: !isEnabled });
  }, [onChange, value]);

  const handleCountChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const numeric = parseFloat(raw);
      const parsed = raw === '' || isNaN(numeric) ? '' : numeric;

      setCountInput(parsed);

      if (typeof parsed === 'number' && !isNaN(parsed) && parsed > 0) {
        onChange({ ...value, intervalMs: autoRefreshIntervalToMs(parsed, derived.unit) });
      }
    },
    [onChange, value, derived.unit]
  );

  const handleUnitChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const newUnit = e.target.value as AutoRefreshIntervalUnit;
      const currentCount = typeof countInput === 'number' && countInput > 0 ? countInput : 1;

      onChange({
        ...value,
        intervalMs: autoRefreshIntervalToMs(currentCount, newUnit),
        intervalDisplayUnit: newUnit,
      });
    },
    [onChange, value, countInput]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiSwitch
          label={refreshIntervalTexts.label}
          checked={value.isEnabled}
          onChange={handleToggle}
          compressed
          data-test-subj="dateRangePickerAutoRefreshToggle"
        />
      </EuiFlexItem>
      <EuiFlexItem css={countFieldFlexItemCss}>
        <EuiFieldNumber
          compressed
          fullWidth
          value={countInput}
          min={1}
          onChange={handleCountChange}
          disabled={!value.isEnabled}
          aria-label={refreshIntervalTexts.intervalCountAriaLabel}
          data-test-subj="dateRangePickerAutoRefreshIntervalCount"
        />
      </EuiFlexItem>
      <EuiFlexItem css={unitSelectFlexItemCss} grow={2}>
        <EuiSelect
          compressed
          fullWidth
          value={derived.unit}
          disabled={!value.isEnabled}
          options={AUTO_REFRESH_UNIT_OPTIONS}
          onChange={handleUnitChange}
          aria-label={refreshIntervalTexts.intervalUnitAriaLabel}
          data-test-subj="dateRangePickerAutoRefreshIntervalUnit"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
