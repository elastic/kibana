/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexItem, EuiFormRow, EuiFlexGroup, EuiFieldNumber, EuiSelect } from '@elastic/eui';
import { getTimeOptions } from '../../../common/helpers/get_time_options';
import {
  useSelectIntervalUnit,
  useSelectIntervalNumber,
  setIntervalNumber,
  setIntervalUnit,
} from './slice';
import { useRuleFormDispatch } from '../../hooks';

const INTEGER_REGEX = /^[1-9][0-9]*$/;

const getHelpTextForInterval = () => {
  if (!config || !config.minimumScheduleInterval) {
    return '';
  }

  // No help text if there is an error
  if (errors['schedule.interval'].length > 0) {
    return '';
  }

  if (config.minimumScheduleInterval.enforce) {
    // Always show help text if minimum is enforced
    return i18n.translate('xpack.triggersActionsUI.sections.ruleForm.checkEveryHelpText', {
      defaultMessage: 'Interval must be at least {minimum}.',
      values: {
        minimum: formatDuration(config.minimumScheduleInterval.value, true),
      },
    });
  } else if (
    rule.schedule.interval &&
    parseDuration(rule.schedule.interval) < parseDuration(config.minimumScheduleInterval.value)
  ) {
    // Only show help text if current interval is less than suggested
    return i18n.translate(
      'xpack.triggersActionsUI.sections.ruleForm.checkEveryHelpSuggestionText',
      {
        defaultMessage:
          'Intervals less than {minimum} are not recommended due to performance considerations.',
        values: {
          minimum: formatDuration(config.minimumScheduleInterval.value, true),
        },
      }
    );
  } else {
    return '';
  }
};

export const RuleScheduleField = ({ errors }) => {
  const ruleIntervalNumber = useSelectIntervalNumber();
  const ruleIntervalUnit = useSelectIntervalUnit();
  const dispatch = useRuleFormDispatch();

  return (
    <EuiFlexItem>
      <EuiFormRow
        fullWidth
        data-test-subj="intervalFormRow"
        display="rowCompressed"
        helpText={getHelpTextForInterval()}
        isInvalid={errors['schedule.interval'].length > 0}
        error={errors['schedule.interval']}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={2}>
            <EuiFieldNumber
              prepend={labelForRuleChecked}
              fullWidth
              min={1}
              isInvalid={errors['schedule.interval'].length > 0}
              value={ruleIntervalNumber || ''}
              name="interval"
              data-test-subj="intervalInput"
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || INTEGER_REGEX.test(value)) {
                  const parsedValue = value === '' ? '' : parseInt(value, 10);
                  dispatch(setIntervalNumber(parsedValue));
                }
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiSelect
              fullWidth
              value={ruleIntervalUnit}
              options={getTimeOptions(ruleInterval ?? 1)}
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
