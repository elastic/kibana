/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useCallback,
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type FocusEvent,
} from 'react';
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
  /**
   * Lowest interval the user can set, in milliseconds. A lower count is not applied while
   * typing and is raised to the lowest whole count of the selected unit once focus leaves the
   * form, so picking a unit right after typing a count still uses the typed count. An interval
   * below the minimum that the user didn't edit is left as is.
   * @default 0
   */
  minIntervalMs?: number;
  /**
   * Show the current state without letting the user change it.
   * @default false
   */
  readOnly?: boolean;
}

/** Lowest whole count of `unit` that is at least `minIntervalMs`, and never below 1. */
const getMinCount = (minIntervalMs: number, unit: AutoRefreshIntervalUnit): number =>
  Math.max(1, Math.ceil(minIntervalMs / autoRefreshIntervalToMs(1, unit)));

/** Whether `count` can be applied as an interval count: a whole number above zero. */
const isApplicableCount = (count: number | ''): count is number =>
  typeof count === 'number' && Number.isInteger(count) && count > 0;

/**
 * "Refresh every" form: a switch to turn auto-refresh on and off, an interval count and a unit.
 * Turning auto-refresh on also starts the timer, so a second click on play is not needed.
 * A count that can't be applied (empty, decimal, zero or negative) goes back to the current
 * interval once focus leaves the form.
 */
export function RefreshInterval({
  value,
  onChange,
  minIntervalMs = 0,
  readOnly = false,
}: RefreshIntervalProps) {
  const derived = msToAutoRefreshInterval(value.intervalMs, value.intervalDisplayUnit);
  const minCount = getMinCount(minIntervalMs, derived.unit);

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

      if (!isApplicableCount(parsed)) return;

      const intervalMs = autoRefreshIntervalToMs(parsed, derived.unit);
      if (intervalMs >= minIntervalMs) {
        onChange({ ...value, intervalMs, intervalDisplayUnit: derived.unit });
      }
    },
    [onChange, value, derived.unit, minIntervalMs]
  );

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLDivElement>) => {
      if (e.currentTarget.contains(e.relatedTarget)) return;
      if (countInput === derived.count) return;
      if (!isApplicableCount(countInput)) {
        setCountInput(derived.count);
        return;
      }
      if (autoRefreshIntervalToMs(countInput, derived.unit) >= minIntervalMs) return;

      setCountInput(minCount);
      onChange({
        ...value,
        intervalMs: autoRefreshIntervalToMs(minCount, derived.unit),
        intervalDisplayUnit: derived.unit,
      });
    },
    [countInput, derived.count, derived.unit, minIntervalMs, minCount, onChange, value]
  );

  const handleUnitChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const newUnit = e.target.value as AutoRefreshIntervalUnit;
      const currentCount = isApplicableCount(countInput) ? countInput : 1;
      const count = Math.max(currentCount, getMinCount(minIntervalMs, newUnit));

      onChange({
        ...value,
        intervalMs: autoRefreshIntervalToMs(count, newUnit),
        intervalDisplayUnit: newUnit,
      });
    },
    [onChange, value, countInput, minIntervalMs]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap onBlur={handleBlur}>
      <EuiFlexItem grow={false}>
        <EuiSwitch
          label={refreshIntervalTexts.label}
          checked={value.isEnabled}
          onChange={handleToggle}
          disabled={readOnly}
          compressed
          data-test-subj="dateRangePickerAutoRefreshToggle"
        />
      </EuiFlexItem>
      <EuiFlexItem css={countFieldFlexItemCss}>
        <EuiFieldNumber
          compressed
          fullWidth
          value={countInput}
          min={minCount}
          step={1}
          onChange={handleCountChange}
          disabled={readOnly || !value.isEnabled}
          aria-label={refreshIntervalTexts.intervalCountAriaLabel}
          data-test-subj="dateRangePickerAutoRefreshIntervalCount"
        />
      </EuiFlexItem>
      <EuiFlexItem css={unitSelectFlexItemCss} grow={2}>
        <EuiSelect
          compressed
          fullWidth
          value={derived.unit}
          disabled={readOnly || !value.isEnabled}
          options={AUTO_REFRESH_UNIT_OPTIONS}
          onChange={handleUnitChange}
          aria-label={refreshIntervalTexts.intervalUnitAriaLabel}
          data-test-subj="dateRangePickerAutoRefreshIntervalUnit"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
