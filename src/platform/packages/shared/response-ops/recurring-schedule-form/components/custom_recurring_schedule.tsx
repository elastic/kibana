/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useMemo } from 'react';
import { Frequency } from '@kbn/rrule';
import moment from 'moment';
import { css } from '@emotion/react';
import {
  FIELD_TYPES,
  getUseField,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { MultiButtonGroupFieldValue } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { EuiFlexGroup, EuiFlexItem, EuiFormLabel, EuiSpacer } from '@elastic/eui';
import { RECURRING_SCHEDULE_FORM_CUSTOM_FREQUENCY, WEEKDAY_OPTIONS } from '../constants';
import { getInitialByWeekday } from '../utils/get_initial_by_weekday';
import { parseSchedule } from '../utils/parse_schedule';
import { getWeekdayInfo } from '../utils/get_weekday_info';
import { RecurringSchedule } from '../types';
import {
  RECURRING_SCHEDULE_FORM_CUSTOM_REPEAT_MONTHLY_ON_DAY,
  RECURRING_SCHEDULE_FORM_WEEKDAY_SHORT,
  RECURRING_SCHEDULE_FORM_INTERVAL_EVERY,
  RECURRING_SCHEDULE_FORM_BYWEEKDAY_REQUIRED,
} from '../translations';

const UseField = getUseField({ component: Field });

const styles = {
  flexField: css`
    .euiFormRow__labelWrapper {
      margin-bottom: unset;
    }
  `,
};

export interface CustomRecurringScheduleProps {
  startDate: string;
}

export const CustomRecurringSchedule = memo(({ startDate }: CustomRecurringScheduleProps) => {
  const [{ recurringSchedule }] = useFormData<{ recurringSchedule: RecurringSchedule }>({
    watch: [
      'recurringSchedule.frequency',
      'recurringSchedule.interval',
      'recurringSchedule.customFrequency',
    ],
  });

  const parsedSchedule = useMemo(() => {
    return parseSchedule(recurringSchedule);
  }, [recurringSchedule]);

  const frequencyOptions = useMemo(
    () => RECURRING_SCHEDULE_FORM_CUSTOM_FREQUENCY(parsedSchedule?.interval),
    [parsedSchedule?.interval]
  );

  const bymonthOptions = useMemo(() => {
    if (!startDate) return [];
    const date = moment(startDate);
    const { dayOfWeek, nthWeekdayOfMonth, isLastOfMonth } = getWeekdayInfo(date, 'ddd');
    return [
      {
        id: 'day',
        label: RECURRING_SCHEDULE_FORM_CUSTOM_REPEAT_MONTHLY_ON_DAY(date),
      },
      {
        id: 'weekday',
        label:
          RECURRING_SCHEDULE_FORM_WEEKDAY_SHORT(dayOfWeek)[isLastOfMonth ? 0 : nthWeekdayOfMonth],
      },
    ];
  }, [startDate]);

  const defaultByWeekday = useMemo(() => getInitialByWeekday([], moment(startDate)), [startDate]);

  return (
    <>
      {parsedSchedule?.frequency !== Frequency.DAILY ? (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" alignItems="flexStart">
            <EuiFlexItem>
              <UseField
                path="recurringSchedule.interval"
                css={styles.flexField}
                componentProps={{
                  'data-test-subj': 'interval-field',
                  id: 'interval',
                  euiFieldProps: {
                    'data-test-subj': 'customRecurringScheduleIntervalInput',
                    min: 1,
                    prepend: (
                      <EuiFormLabel htmlFor={'interval'}>
                        {RECURRING_SCHEDULE_FORM_INTERVAL_EVERY}
                      </EuiFormLabel>
                    ),
                  },
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <UseField
                path="recurringSchedule.customFrequency"
                componentProps={{
                  'data-test-subj': 'custom-frequency-field',
                  euiFieldProps: {
                    'data-test-subj': 'customRecurringScheduleFrequencySelect',
                    options: frequencyOptions,
                  },
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      ) : null}
      {Number(parsedSchedule?.customFrequency) === Frequency.WEEKLY ||
      parsedSchedule?.frequency === Frequency.DAILY ? (
        <UseField
          path="recurringSchedule.byweekday"
          config={{
            type: FIELD_TYPES.MULTI_BUTTON_GROUP,
            label: '',
            validations: [
              {
                validator: ({ value }) => {
                  if (
                    Object.values(value as MultiButtonGroupFieldValue).every((v) => v === false)
                  ) {
                    return {
                      message: RECURRING_SCHEDULE_FORM_BYWEEKDAY_REQUIRED,
                    };
                  }
                },
              },
            ],
            defaultValue: defaultByWeekday,
          }}
          componentProps={{
            'data-test-subj': 'byweekday-field',
            euiFieldProps: {
              'data-test-subj': 'customRecurringScheduleByWeekdayButtonGroup',
              legend: 'Repeat on weekday',
              options: WEEKDAY_OPTIONS,
            },
          }}
        />
      ) : null}

      {Number(parsedSchedule?.customFrequency) === Frequency.MONTHLY ? (
        <UseField
          path="recurringSchedule.bymonth"
          componentProps={{
            'data-test-subj': 'bymonth-field',
            euiFieldProps: {
              legend: 'Repeat on weekday or month day',
              options: bymonthOptions,
            },
          }}
        />
      ) : null}
    </>
  );
});

CustomRecurringSchedule.displayName = 'CustomRecurringSchedule';
