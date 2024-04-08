/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { EuiFlexItem, EuiFormRow, EuiFlexGroup, EuiFieldNumber, EuiSelect } from '@elastic/eui';
import { parseDuration, formatDuration } from '../../../common/helpers/parse_duration';
import { getTimeOptions } from '../../../common/helpers/get_time_options';
import {
  useSelectIntervalUnit,
  useSelectIntervalNumber,
  setIntervalNumber,
  setIntervalUnit,
} from './slice';
import { useConfig, useValidation } from '../../contexts';
import { useRuleFormDispatch, useRuleFormSelector } from '../../hooks';
import { RuleFormConfig } from '../../types';

const getHelpTextForInterval = (
  currentInterval: string,
  minimumScheduleInterval: RuleFormConfig['minimumScheduleInterval']
) => {
  if (!minimumScheduleInterval) {
    return '';
  }

  if (minimumScheduleInterval.enforce) {
    // Always show help text if minimum is enforced
    return i18n.translate('alertsUIShared.ruleForm.ruleDefinition.checkEveryHelpText', {
      defaultMessage: 'Interval must be at least {minimum}.',
      values: {
        minimum: formatDuration(minimumScheduleInterval.value, true),
      },
    });
  } else if (
    currentInterval &&
    parseDuration(currentInterval) < parseDuration(minimumScheduleInterval.value)
  ) {
    // Only show help text if current interval is less than suggested
    return i18n.translate('alertsUIShared.ruleForm.ruleDefinition.checkEveryHelpSuggestionText', {
      defaultMessage:
        'Intervals less than {minimum} are not recommended due to performance considerations.',
      values: {
        minimum: formatDuration(minimumScheduleInterval.value, true),
      },
    });
  } else {
    return '';
  }
};

const labelForRuleChecked = [
  i18n.translate('alertsUIShared.ruleForm.ruleDefinition.ruleScheduleField.checkFieldLabel', {
    defaultMessage: 'Every',
  }),
];

export const RuleScheduleField: React.FC = () => {
  const ruleIntervalNumber = useSelectIntervalNumber();
  const ruleIntervalUnit = useSelectIntervalUnit();
  const currentInterval = useRuleFormSelector((state) => state.ruleDefinition.schedule.interval);
  const dispatch = useRuleFormDispatch();
  const { minimumScheduleInterval } = useConfig();

  const intervalError = useValidation().ruleDefinition.errors.schedule.interval;
  const hasIntervalError = useMemo(() => intervalError.length > 0, [intervalError]);
  const displayedIntervalError = useMemo(
    () =>
      hasIntervalError
        ? intervalError.map((error, i) => <span key={`intervalError-${i}`}>{error.text}</span>)
        : undefined,
    [intervalError, hasIntervalError]
  );

  const helpText = useMemo(
    () =>
      minimumScheduleInterval && !hasIntervalError // No help text if there is an error
        ? getHelpTextForInterval(currentInterval, minimumScheduleInterval)
        : '',
    [currentInterval, minimumScheduleInterval, hasIntervalError]
  );

  return (
    <EuiFlexItem>
      <EuiFormRow
        fullWidth
        data-test-subj="intervalFormRow"
        display="rowCompressed"
        helpText={helpText}
        isInvalid={hasIntervalError}
        error={displayedIntervalError}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={2}>
            <EuiFieldNumber
              prepend={labelForRuleChecked}
              fullWidth
              min={1}
              isInvalid={hasIntervalError}
              value={ruleIntervalNumber || ''}
              name="interval"
              data-test-subj="intervalInput"
              onChange={(e) => {
                const value = e.target.value;
                const parsedValue = value === '' ? '' : parseInt(value, 10);
                dispatch(setIntervalNumber(parsedValue));
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiSelect
              fullWidth
              value={ruleIntervalUnit}
              options={getTimeOptions(ruleIntervalNumber ?? 1)}
              onChange={(e) => {
                dispatch(setIntervalUnit(e.target.value));
              }}
              data-test-subj="intervalInputUnit"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiFlexItem>
  );
};
