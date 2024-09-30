/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFlexItem, EuiFormRow, EuiFlexGroup, EuiSelect, EuiFieldNumber } from '@elastic/eui';
import {
  parseDuration,
  formatDuration,
  getDurationUnitValue,
  getDurationNumberInItsUnit,
} from '../utils/parse_duration';
import { getTimeOptions } from '../utils/get_time_options';
import {
  SCHEDULE_TITLE_PREFIX,
  INTERVAL_MINIMUM_TEXT,
  INTERVAL_WARNING_TEXT,
} from '../translations';
import { useRuleFormState, useRuleFormDispatch } from '../hooks';
import { MinimumScheduleInterval } from '../../common';

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

export const RuleSchedule = () => {
  const { formData, baseErrors, minimumScheduleInterval } = useRuleFormState();

  const dispatch = useRuleFormDispatch();

  const {
    schedule: { interval },
  } = formData;

  const hasIntervalError = useMemo(() => {
    return !!baseErrors?.interval?.length;
  }, [baseErrors]);

  const intervalNumber = useMemo(() => {
    return getDurationNumberInItsUnit(interval ?? 1);
  }, [interval]);

  const intervalUnit = useMemo(() => {
    return getDurationUnitValue(interval);
  }, [interval]);

  const helpText = useMemo(
    () =>
      minimumScheduleInterval && !hasIntervalError // No help text if there is an error
        ? getHelpTextForInterval(interval, minimumScheduleInterval)
        : '',
    [interval, minimumScheduleInterval, hasIntervalError]
  );

  const onIntervalNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.validity.valid) {
        return;
      }
      const value = e.target.value.trim();
      if (INTEGER_REGEX.test(value)) {
        const parsedValue = parseInt(value, 10);
        dispatch({
          type: 'setSchedule',
          payload: {
            interval: `${parsedValue}${intervalUnit}`,
          },
        });
      }
    },
    [intervalUnit, dispatch]
  );

  const onIntervalUnitChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      dispatch({
        type: 'setSchedule',
        payload: {
          interval: `${intervalNumber}${e.target.value}`,
        },
      });
    },
    [intervalNumber, dispatch]
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
      isInvalid={hasIntervalError}
      error={baseErrors?.interval}
    >
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={2}>
          <EuiFieldNumber
            fullWidth
            prepend={[SCHEDULE_TITLE_PREFIX]}
            isInvalid={hasIntervalError}
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
