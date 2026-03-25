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

import { useDateRangePickerContext } from '../date_range_picker_context';
import { settingsPanelTexts } from '../translations';
import type { AutoRefreshIntervalUnit, AutoRefreshSettings } from '../types';
import { msToAutoRefreshInterval, autoRefreshIntervalToMs } from '../utils';

const countFieldFlexItemCss = css`
  min-inline-size: 60px;
`;

const unitSelectFlexItemCss = css`
  min-inline-size: 100px;
`;

const AUTO_REFRESH_UNIT_OPTIONS: Array<{ value: AutoRefreshIntervalUnit; text: string }> = [
  { value: 's', text: settingsPanelTexts.autoRefreshUnitSeconds },
  { value: 'm', text: settingsPanelTexts.autoRefreshUnitMinutes },
  { value: 'h', text: settingsPanelTexts.autoRefreshUnitHours },
];

/**
 * "Refresh every" row which contains switch toggle to enable/disable auto-refresh, count input and unit select.
 */
export function AutoRefresh({ autoRefresh }: { autoRefresh: AutoRefreshSettings }) {
  const { settings, onSettingsChange } = useDateRangePickerContext();

  const derived = msToAutoRefreshInterval(autoRefresh.interval, autoRefresh.intervalUnit);

  const [countInput, setCountInput] = useState<number | ''>(derived.count);

  // Sync count input when interval or display unit changes externally (not only interval ms).
  const prevAutoRefreshDisplayKeyRef = useRef(
    `${autoRefresh.interval}\0${autoRefresh.intervalUnit ?? ''}`
  );

  useEffect(() => {
    const key = `${autoRefresh.interval}\0${autoRefresh.intervalUnit ?? ''}`;
    if (key !== prevAutoRefreshDisplayKeyRef.current) {
      setCountInput(msToAutoRefreshInterval(autoRefresh.interval, autoRefresh.intervalUnit).count);
      prevAutoRefreshDisplayKeyRef.current = key;
    }
  }, [autoRefresh.interval, autoRefresh.intervalUnit]);

  const handleToggle = useCallback(() => {
    onSettingsChange({
      ...settings,
      autoRefresh: {
        ...autoRefresh,
        isEnabled: !autoRefresh.isEnabled,
      },
    });
  }, [settings, onSettingsChange, autoRefresh]);

  const handleCountChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const numeric = parseFloat(raw);
      const parsed = raw === '' || isNaN(numeric) ? '' : numeric;

      setCountInput(parsed);

      if (typeof parsed === 'number' && !isNaN(parsed) && parsed > 0) {
        onSettingsChange({
          ...settings,
          autoRefresh: {
            ...autoRefresh,
            interval: autoRefreshIntervalToMs(parsed, derived.unit),
          },
        });
      }
    },
    [settings, onSettingsChange, autoRefresh, derived.unit]
  );

  const handleUnitChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const newUnit = e.target.value as AutoRefreshIntervalUnit;
      const currentCount = typeof countInput === 'number' && countInput > 0 ? countInput : 1;

      onSettingsChange({
        ...settings,
        autoRefresh: {
          ...autoRefresh,
          interval: autoRefreshIntervalToMs(currentCount, newUnit),
          intervalUnit: newUnit,
        },
      });
    },
    [settings, onSettingsChange, autoRefresh, countInput]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiSwitch
          label={settingsPanelTexts.autoRefreshLabel}
          checked={autoRefresh.isEnabled}
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
          disabled={!autoRefresh.isEnabled}
          aria-label={settingsPanelTexts.autoRefreshIntervalCountAriaLabel}
          data-test-subj="dateRangePickerAutoRefreshIntervalCount"
        />
      </EuiFlexItem>
      <EuiFlexItem css={unitSelectFlexItemCss} grow={2}>
        <EuiSelect
          compressed
          fullWidth
          value={derived.unit}
          disabled={!autoRefresh.isEnabled}
          options={AUTO_REFRESH_UNIT_OPTIONS}
          onChange={handleUnitChange}
          aria-label={settingsPanelTexts.autoRefreshIntervalUnitAriaLabel}
          data-test-subj="dateRangePickerAutoRefreshIntervalUnit"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
