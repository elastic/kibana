/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { padLeft } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { EuiSelect, EuiFormRow } from '@elastic/eui';

import {
  getOrdinalValue,
  getDayName,
  getMonthName,
  cronExpressionToParts,
  cronPartsToExpression,
  MINUTE,
  HOUR,
  DAY,
  WEEK,
  MONTH,
  YEAR,
} from './services';

import { CronHourly } from './cron_hourly';
import { CronDaily } from './cron_daily';
import { CronWeekly } from './cron_weekly';
import { CronMonthly } from './cron_monthly';
import { CronYearly } from './cron_yearly';

function makeSequence(min, max) {
  const values = [];
  for (let i = min; i <= max; i++) {
    values.push(i);
  }
  return values;
}

const MINUTE_OPTIONS = makeSequence(0, 59).map(value => ({
  value: value.toString(),
  text: padLeft(value, 2, '0'),
}));

const HOUR_OPTIONS = makeSequence(0, 23).map(value => ({
  value: value.toString(),
  text: padLeft(value, 2, '0'),
}));

const DAY_OPTIONS = makeSequence(1, 7).map(value => ({
  value: value.toString(),
  text: getDayName(value - 1),
}));

const DATE_OPTIONS = makeSequence(1, 31).map(value => ({
  value: value.toString(),
  text: getOrdinalValue(value),
}));

const MONTH_OPTIONS = makeSequence(1, 12).map(value => ({
  value: value.toString(),
  text: getMonthName(value - 1),
}));

const UNITS = [
  {
    value: MINUTE,
    text: 'minute',
  },
  {
    value: HOUR,
    text: 'hour',
  },
  {
    value: DAY,
    text: 'day',
  },
  {
    value: WEEK,
    text: 'week',
  },
  {
    value: MONTH,
    text: 'month',
  },
  {
    value: YEAR,
    text: 'year',
  },
];

const frequencyToFieldsMap = {
  [MINUTE]: {},
  [HOUR]: {
    minute: true,
  },
  [DAY]: {
    hour: true,
    minute: true,
  },
  [WEEK]: {
    day: true,
    hour: true,
    minute: true,
  },
  [MONTH]: {
    date: true,
    hour: true,
    minute: true,
  },
  [YEAR]: {
    month: true,
    date: true,
    hour: true,
    minute: true,
  },
};

const frequencyToBaselineFieldsMap = {
  [MINUTE]: {
    second: '0',
    minute: '*',
    hour: '*',
    date: '*',
    month: '*',
    day: '?',
  },
  [HOUR]: {
    second: '0',
    minute: '0',
    hour: '*',
    date: '*',
    month: '*',
    day: '?',
  },
  [DAY]: {
    second: '0',
    minute: '0',
    hour: '0',
    date: '*',
    month: '*',
    day: '?',
  },
  [WEEK]: {
    second: '0',
    minute: '0',
    hour: '0',
    date: '?',
    month: '*',
    day: '7',
  },
  [MONTH]: {
    second: '0',
    minute: '0',
    hour: '0',
    date: '1',
    month: '*',
    day: '?',
  },
  [YEAR]: {
    second: '0',
    minute: '0',
    hour: '0',
    date: '1',
    month: '1',
    day: '?',
  },
};

export class CronEditor extends Component {
  static propTypes = {
    fieldToPreferredValueMap: PropTypes.object.isRequired,
    frequency: PropTypes.string.isRequired,
    cronExpression: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
  };

  static getDerivedStateFromProps(props) {
    const { cronExpression } = props;
    return cronExpressionToParts(cronExpression);
  }

  constructor(props) {
    super(props);

    const { cronExpression } = props;

    const parsedCron = cronExpressionToParts(cronExpression);

    this.state = {
      ...parsedCron,
    };
  }

  onChangeFrequency = frequency => {
    const { onChange, fieldToPreferredValueMap } = this.props;

    // Update fields which aren't editable with acceptable baseline values.
    const editableFields = Object.keys(frequencyToFieldsMap[frequency]);
    const inheritedFields = editableFields.reduce(
      (baselineFields, field) => {
        if (fieldToPreferredValueMap[field] != null) {
          baselineFields[field] = fieldToPreferredValueMap[field];
        }
        return baselineFields;
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

  onChangeFields = fields => {
    const { onChange, frequency, fieldToPreferredValueMap } = this.props;

    const editableFields = Object.keys(frequencyToFieldsMap[frequency]);
    const newFieldToPreferredValueMap = {};

    const editedFields = editableFields.reduce(
      (accumFields, field) => {
        if (fields[field] !== undefined) {
          accumFields[field] = fields[field];
          // Once the user touches a field, we want to persist its value as the user changes
          // the cron frequency.
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
    const { frequency } = this.props;

    const { minute, hour, day, date, month } = this.state;

    switch (frequency) {
      case MINUTE:
        return;

      case HOUR:
        return (
          <CronHourly
            minute={minute}
            minuteOptions={MINUTE_OPTIONS}
            onChange={this.onChangeFields}
          />
        );

      case DAY:
        return (
          <CronDaily
            minute={minute}
            minuteOptions={MINUTE_OPTIONS}
            hour={hour}
            hourOptions={HOUR_OPTIONS}
            onChange={this.onChangeFields}
          />
        );

      case WEEK:
        return (
          <CronWeekly
            minute={minute}
            minuteOptions={MINUTE_OPTIONS}
            hour={hour}
            hourOptions={HOUR_OPTIONS}
            day={day}
            dayOptions={DAY_OPTIONS}
            onChange={this.onChangeFields}
          />
        );

      case MONTH:
        return (
          <CronMonthly
            minute={minute}
            minuteOptions={MINUTE_OPTIONS}
            hour={hour}
            hourOptions={HOUR_OPTIONS}
            date={date}
            dateOptions={DATE_OPTIONS}
            onChange={this.onChangeFields}
          />
        );

      case YEAR:
        return (
          <CronYearly
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
    const { frequency } = this.props;

    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage id="esUi.cronEditor.fieldFrequencyLabel" defaultMessage="Frequency" />
          }
          fullWidth
        >
          <EuiSelect
            options={UNITS}
            value={frequency}
            onChange={e => this.onChangeFrequency(e.target.value)}
            fullWidth
            prepend={i18n.translate('esUi.cronEditor.textEveryLabel', {
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
