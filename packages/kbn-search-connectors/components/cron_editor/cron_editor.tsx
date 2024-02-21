/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component, Fragment } from 'react';

import { EuiSelect, EuiFormRow, EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  MINUTE_OPTIONS,
  HOUR_OPTIONS,
  DAY_OPTIONS,
  DATE_OPTIONS,
  MONTH_OPTIONS,
  UNITS,
  frequencyToFieldsMap,
  frequencyToBaselineFieldsMap,
  EVERY_MINUTE_OPTIONS,
} from './constants';
import { CronDaily } from './cron_daily';
import { CronHourly } from './cron_hourly';
import { CronMinutely } from './cron_minutely';
import { CronMonthly } from './cron_monthly';
import { CronWeekly } from './cron_weekly';
import { CronYearly } from './cron_yearly';
import { cronExpressionToParts, cronPartsToExpression } from './services';
import { Frequency, Field, FieldToValueMap } from '../../types/cron_editor';

const excludeBlockListedFrequencies = (
  units: EuiSelectOption[],
  blockListedUnits: string[] = []
): EuiSelectOption[] => {
  if (blockListedUnits.length === 0) {
    return units;
  }

  return units.filter(({ value }) => !blockListedUnits.includes(value as string));
};

interface Props {
  autoFocus?: boolean;
  cronExpression: string;
  disabled?: boolean;
  fieldToPreferredValueMap: FieldToValueMap;
  frequency: Frequency;
  frequencyBlockList?: string[];
  onChange: ({
    cronExpression,
    fieldToPreferredValueMap,
    frequency,
  }: {
    cronExpression: string;
    fieldToPreferredValueMap: FieldToValueMap;
    frequency: Frequency;
  }) => void;
}

type State = FieldToValueMap;

export class CronEditor extends Component<Props, State> {
  static getDerivedStateFromProps(props: Props) {
    const { cronExpression } = props;
    return cronExpressionToParts(cronExpression);
  }

  constructor(props: Props) {
    super(props);

    const { cronExpression } = props;
    const parsedCron = cronExpressionToParts(cronExpression);
    this.state = {
      ...parsedCron,
    };
  }

  onChangeFrequency = (frequency: Frequency) => {
    const { onChange, fieldToPreferredValueMap } = this.props;

    // Update fields which aren't editable with acceptable baseline values.
    const editableFields = Object.keys(frequencyToFieldsMap[frequency]) as Field[];
    const inheritedFields = editableFields.reduce<FieldToValueMap>(
      (fieldBaselines, field) => {
        if (fieldToPreferredValueMap[field] != null) {
          fieldBaselines[field] = fieldToPreferredValueMap[field];
        }
        return fieldBaselines;
      },
      { ...frequencyToBaselineFieldsMap[frequency] }
    );

    const newCronExpression = cronPartsToExpression(inheritedFields);

    onChange({
      frequency,
      cronExpression: newCronExpression,
      fieldToPreferredValueMap,
    });
  };

  onChangeFields = (fields: FieldToValueMap) => {
    const { onChange, frequency, fieldToPreferredValueMap } = this.props;

    const editableFields = Object.keys(frequencyToFieldsMap[frequency]) as Field[];
    const newFieldToPreferredValueMap: FieldToValueMap = {};

    const editedFields = editableFields.reduce<FieldToValueMap>(
      (accumFields, field) => {
        if (fields[field] !== undefined) {
          accumFields[field] = fields[field];
          // If the user changes a field's value, we want to maintain that value in the relevant
          // field, even as the frequency field changes. For example, if the user selects "Monthly"
          // frequency and changes the "Hour" field to "10", that field should still say "10" if the
          // user changes the frequency to "Weekly". We'll support this UX by storing these values
          // in the fieldToPreferredValueMap.
          newFieldToPreferredValueMap[field] = fields[field];
        } else {
          accumFields[field] = this.state[field];
        }
        return accumFields;
      },
      { ...frequencyToBaselineFieldsMap[frequency] }
    );

    const newCronExpression = cronPartsToExpression(editedFields);

    onChange({
      frequency,
      cronExpression: newCronExpression,
      fieldToPreferredValueMap: {
        ...fieldToPreferredValueMap,
        ...newFieldToPreferredValueMap,
      },
    });
  };

  renderForm() {
    const { frequency, disabled } = this.props;

    const { minute, hour, day, date, month } = this.state;

    switch (frequency) {
      case 'MINUTE':
        return (
          <CronMinutely
            disabled={disabled}
            minute={minute}
            minuteOptions={EVERY_MINUTE_OPTIONS}
            onChange={this.onChangeFields}
          />
        );

      case 'HOUR':
        return (
          <CronHourly
            disabled={disabled}
            minute={minute}
            minuteOptions={MINUTE_OPTIONS}
            onChange={this.onChangeFields}
          />
        );

      case 'DAY':
        return (
          <CronDaily
            disabled={disabled}
            minute={minute}
            minuteOptions={MINUTE_OPTIONS}
            hour={hour}
            hourOptions={HOUR_OPTIONS}
            onChange={this.onChangeFields}
          />
        );

      case 'WEEK':
        return (
          <CronWeekly
            disabled={disabled}
            minute={minute}
            minuteOptions={MINUTE_OPTIONS}
            hour={hour}
            hourOptions={HOUR_OPTIONS}
            day={day}
            dayOptions={DAY_OPTIONS}
            onChange={this.onChangeFields}
          />
        );

      case 'MONTH':
        return (
          <CronMonthly
            disabled={disabled}
            minute={minute}
            minuteOptions={MINUTE_OPTIONS}
            hour={hour}
            hourOptions={HOUR_OPTIONS}
            date={date}
            dateOptions={DATE_OPTIONS}
            onChange={this.onChangeFields}
          />
        );

      case 'YEAR':
        return (
          <CronYearly
            disabled={disabled}
            minute={minute}
            minuteOptions={MINUTE_OPTIONS}
            hour={hour}
            hourOptions={HOUR_OPTIONS}
            date={date}
            dateOptions={DATE_OPTIONS}
            month={month}
            monthOptions={MONTH_OPTIONS}
            onChange={this.onChangeFields}
          />
        );

      default:
        return;
    }
  }

  render() {
    const { disabled, frequency, frequencyBlockList } = this.props;

    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage
              id="searchConnectors.cronEditor.fieldFrequencyLabel"
              defaultMessage="Frequency"
            />
          }
          fullWidth
        >
          <EuiSelect
            disabled={disabled}
            autoFocus={this.props.autoFocus}
            options={excludeBlockListedFrequencies(UNITS, frequencyBlockList)}
            value={frequency}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              this.onChangeFrequency(e.target.value as Frequency)
            }
            fullWidth
            prepend={i18n.translate('searchConnectors.cronEditor.textEveryLabel', {
              defaultMessage: 'Every',
            })}
            data-test-subj="cronFrequencySelect"
          />
        </EuiFormRow>

        {this.renderForm()}
      </Fragment>
    );
  }
}
