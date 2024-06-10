/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiFlexItem, EuiFormRow, EuiFlexGroup, EuiSelect, EuiFieldNumber } from '@elastic/eui';
import {
  parseDuration,
  formatDuration,
  getDurationUnitValue,
  getDurationNumberInItsUnit,
} from '../utils/parse_duration';
import { getTimeOptions } from '../utils/get_time_options';
import { MinimumScheduleInterval, RuleFormErrors } from '../types';
import {
  SCHEDULE_TITLE_PREFIX,
  INTERVAL_MINIMUM_TEXT,
  INTERVAL_WARNING_TEXT,
} from '../translations';

const INTEGER_REGEX = /^[1-9][0-9]*$/;
const INVALID_KEYS = ['-', '+', '.', 'e', 'E'];

const getHelpTextForInterval = (
  currentInterval: string,
  minimumScheduleInterval: MinimumScheduleInterval
) => {
  if (!minimumScheduleInterval) {
    return '';
  }

  if (minimumScheduleInterval.enforce) {
    // Always show help text if minimum is enforced
    return INTERVAL_MINIMUM_TEXT(formatDuration(minimumScheduleInterval.value, true));
  } else if (
    currentInterval &&
    parseDuration(currentInterval) < parseDuration(minimumScheduleInterval.value)
  ) {
    // Only show help text if current interval is less than suggested
    return INTERVAL_WARNING_TEXT(formatDuration(minimumScheduleInterval.value, true));
  } else {
    return '';
  }
};

export interface RuleScheduleProps {
  interval: string;
  minimumScheduleInterval?: MinimumScheduleInterval;
  errors?: RuleFormErrors;
  onChange: (property: string, value: unknown) => void;
}

export const RuleSchedule = (props: RuleScheduleProps) => {
  const { interval, minimumScheduleInterval, errors = {}, onChange } = props;

  const hasIntervalError = errors.interval?.length > 0;

  const intervalNumber = getDurationNumberInItsUnit(interval);

  const intervalUnit = getDurationUnitValue(interval);

  // No help text if there is an error
  const helpText =
    minimumScheduleInterval && !hasIntervalError
      ? getHelpTextForInterval(interval, minimumScheduleInterval)
      : '';

  const onIntervalNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      if (INTEGER_REGEX.test(value)) {
        const parsedValue = parseInt(value, 10);
        onChange('interval', `${parsedValue}${intervalUnit}`);
      }
    },
    [intervalUnit, onChange]
  );

  const onIntervalUnitChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange('interval', `${intervalNumber}${e.target.value}`);
    },
    [intervalNumber, onChange]
  );

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (INVALID_KEYS.includes(e.key)) {
      e.preventDefault();
    }
  }, []);

  return (
    <EuiFormRow
      fullWidth
      data-test-subj="ruleSchedule"
      display="rowCompressed"
      helpText={helpText}
      isInvalid={errors.interval?.length > 0}
      error={errors.interval}
    >
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={2}>
          <EuiFieldNumber
            fullWidth
            prepend={[SCHEDULE_TITLE_PREFIX]}
            isInvalid={errors.interval?.length > 0}
            value={intervalNumber}
            name="interval"
            data-test-subj="ruleScheduleNumberInput"
            onChange={onIntervalNumberChange}
            onKeyDown={onKeyDown}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <EuiSelect
            fullWidth
            value={intervalUnit}
            options={getTimeOptions(intervalNumber ?? 1)}
            onChange={onIntervalUnitChange}
            data-test-subj="ruleScheduleUnitInput"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
