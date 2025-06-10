/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useMemo, useState } from 'react';
import type { Moment } from 'moment';
import moment from 'moment';
import { Frequency } from '@kbn/rrule';
import {
  FIELD_TYPES,
  useFormData,
  getUseField,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSplitPanel,
} from '@elastic/eui';
import {
  DEFAULT_FREQUENCY_OPTIONS,
  DEFAULT_PRESETS,
  RecurrenceEnd,
  RECURRENCE_END_OPTIONS,
  RECURRENCE_END_NEVER,
} from '../constants';
import { CustomRecurringSchedule } from './custom_recurring_schedule';
import { recurringSummary } from '../utils/recurring_summary';
import { parseSchedule } from '../utils/parse_schedule';
import { getPresets } from '../utils/get_presets';
import { getWeekdayInfo } from '../utils/get_weekday_info';
import { RecurringSchedule } from '../types';
import {
  RECURRING_SCHEDULE_FORM_FREQUENCY_DAILY,
  RECURRING_SCHEDULE_FORM_FREQUENCY_WEEKLY_ON,
  RECURRING_SCHEDULE_FORM_FREQUENCY_NTH_WEEKDAY,
  RECURRING_SCHEDULE_FORM_FREQUENCY_YEARLY_ON,
  RECURRING_SCHEDULE_FORM_FREQUENCY_CUSTOM,
  RECURRING_SCHEDULE_FORM_TIMEZONE,
  RECURRING_SCHEDULE_FORM_COUNT_AFTER,
  RECURRING_SCHEDULE_FORM_COUNT_OCCURRENCE,
  RECURRING_SCHEDULE_FORM_RECURRING_SUMMARY_PREFIX,
} from '../translations';

/**
 * Using EuiForm in `div` mode since this is meant to be integrated in a larger form
 */
const UseField = getUseField({ component: Field });
export const toMoment = (value: string): Moment => moment(value);
export const toString = (value: Moment): string => value.toISOString();

export interface RecurringScheduleFieldsProps {
  startDate?: string;
  endDate?: string;
  timezone?: string[];
  allowInfiniteRecurrence?: boolean;
}

/**
 * Renders form fields for the recurring schedule
 */
export const RecurringScheduleFormFields = memo(
  ({
    startDate,
    endDate,
    timezone,
    allowInfiniteRecurrence = true,
  }: RecurringScheduleFieldsProps) => {
    const [formData] = useFormData<{ recurringSchedule: RecurringSchedule }>({
      watch: [
        'recurringSchedule.frequency',
        'recurringSchedule.interval',
        'recurringSchedule.ends',
        'recurringSchedule.until',
        'recurringSchedule.count',
        'recurringSchedule.customFrequency',
        'recurringSchedule.byweekday',
        'recurringSchedule.bymonth',
      ],
    });

    const [today] = useState<Moment>(moment());

    const { options, presets } = useMemo(() => {
      if (!startDate) {
        return { options: DEFAULT_FREQUENCY_OPTIONS, presets: DEFAULT_PRESETS };
      }
      const date = moment(startDate);
      const { dayOfWeek, nthWeekdayOfMonth, isLastOfMonth } = getWeekdayInfo(date);
      return {
        options: [
          {
            text: RECURRING_SCHEDULE_FORM_FREQUENCY_DAILY,
            value: Frequency.DAILY,
            'data-test-subj': 'recurringScheduleOptionDaily',
          },
          {
            text: RECURRING_SCHEDULE_FORM_FREQUENCY_WEEKLY_ON(dayOfWeek),
            value: Frequency.WEEKLY,
            'data-test-subj': 'recurringScheduleOptionWeekly',
          },
          {
            text: RECURRING_SCHEDULE_FORM_FREQUENCY_NTH_WEEKDAY(dayOfWeek)[
              isLastOfMonth ? 0 : nthWeekdayOfMonth
            ],
            value: Frequency.MONTHLY,
            'data-test-subj': 'recurringScheduleOptionMonthly',
          },
          {
            text: RECURRING_SCHEDULE_FORM_FREQUENCY_YEARLY_ON(date),
            value: Frequency.YEARLY,
            'data-test-subj': 'recurringScheduleOptionYearly',
          },
          {
            text: RECURRING_SCHEDULE_FORM_FREQUENCY_CUSTOM,
            value: 'CUSTOM',
            'data-test-subj': 'recurringScheduleOptionCustom',
          },
        ],
        presets: getPresets(date),
      };
    }, [startDate]);

    const parsedSchedule = useMemo(() => parseSchedule(formData.recurringSchedule), [formData]);

    return (
      <EuiSplitPanel.Outer hasShadow={false} hasBorder={true} data-test-subj="recurring-form">
        <EuiSplitPanel.Inner color="subdued">
          <UseField
            path="recurringSchedule.frequency"
            componentProps={{
              'data-test-subj': 'frequency-field',
              euiFieldProps: {
                'data-test-subj': 'recurringScheduleRepeatSelect',
                options,
              },
            }}
          />
          {(parsedSchedule?.frequency === Frequency.DAILY ||
            parsedSchedule?.frequency === 'CUSTOM') && (
            <CustomRecurringSchedule data-test-subj="custom-recurring-form" />
          )}
          <UseField
            path="recurringSchedule.ends"
            componentProps={{
              'data-test-subj': 'ends-field',
              euiFieldProps: {
                legend: 'Recurrence ends',
                options: allowInfiniteRecurrence
                  ? [RECURRENCE_END_NEVER, ...RECURRENCE_END_OPTIONS]
                  : RECURRENCE_END_OPTIONS,
              },
            }}
          />
          {parsedSchedule?.ends === RecurrenceEnd.ON_DATE ? (
            <>
              <EuiSpacer size="m" />
              <EuiFlexGroup alignItems="flexEnd">
                <EuiFlexItem grow={3}>
                  <UseField
                    path="recurringSchedule.until"
                    config={{
                      type: FIELD_TYPES.DATE_PICKER,
                      label: '',
                      defaultValue: Boolean(endDate)
                        ? moment(endDate).endOf('day').toISOString()
                        : '',
                      validations: [],
                      serializer: toString,
                      deserializer: toMoment,
                    }}
                    componentProps={{
                      'data-test-subj': 'until-field',
                      euiFieldProps: {
                        showTimeSelect: false,
                        minDate: today,
                      },
                    }}
                  />
                </EuiFlexItem>
                {timezone ? (
                  <EuiFlexItem grow={1}>
                    <EuiComboBox
                      data-test-subj="disabled-timezone-field"
                      id="disabled-timezone"
                      isDisabled
                      singleSelection={{ asPlainText: true }}
                      selectedOptions={[{ label: timezone[0] }]}
                      isClearable={false}
                      prepend={
                        <EuiFormLabel htmlFor={'disabled-timezone'}>
                          {RECURRING_SCHEDULE_FORM_TIMEZONE}
                        </EuiFormLabel>
                      }
                    />
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </>
          ) : null}
          {parsedSchedule?.ends === RecurrenceEnd.AFTER_X ? (
            <UseField
              path="recurringSchedule.count"
              componentProps={{
                'data-test-subj': 'count-field',
                id: 'count',
                euiFieldProps: {
                  'data-test-subj': 'recurringScheduleAfterXOccurenceInput',
                  type: 'number',
                  min: 1,
                  prepend: (
                    <EuiFormLabel htmlFor={'count'}>
                      {RECURRING_SCHEDULE_FORM_COUNT_AFTER}
                    </EuiFormLabel>
                  ),
                  append: (
                    <EuiFormLabel htmlFor={'count'}>
                      {RECURRING_SCHEDULE_FORM_COUNT_OCCURRENCE}
                    </EuiFormLabel>
                  ),
                },
              }}
            />
          ) : null}
        </EuiSplitPanel.Inner>
        <EuiHorizontalRule margin="none" />
        <EuiSplitPanel.Inner>
          {RECURRING_SCHEDULE_FORM_RECURRING_SUMMARY_PREFIX(
            recurringSummary(moment(startDate), parsedSchedule, presets)
          )}
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    );
  }
);

RecurringScheduleFormFields.displayName = 'RecurringScheduleFormFields';
