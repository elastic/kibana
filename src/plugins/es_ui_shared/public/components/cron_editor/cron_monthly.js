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

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';

export const CronMonthly = ({
  minute,
  minuteOptions,
  hour,
  hourOptions,
  date,
  dateOptions,
  onChange,
}) => (
  <Fragment>
    <EuiFormRow
      label={
        <FormattedMessage id="esUi.cronEditor.cronMonthly.fieldDateLabel" defaultMessage="Date" />
      }
      fullWidth
      data-test-subj="cronFrequencyConfiguration"
    >
      <EuiSelect
        options={dateOptions}
        value={date}
        onChange={e => onChange({ date: e.target.value })}
        fullWidth
        prepend={i18n.translate('esUi.cronEditor.cronMonthly.textOnTheLabel', {
          defaultMessage: 'On the',
        })}
        data-test-subj="cronFrequencyMonthlyDateSelect"
      />
    </EuiFormRow>

    <EuiFormRow
      label={
        <FormattedMessage id="esUi.cronEditor.cronMonthly.fieldTimeLabel" defaultMessage="Time" />
      }
      fullWidth
      data-test-subj="cronFrequencyConfiguration"
    >
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiSelect
            options={hourOptions}
            value={hour}
            aria-label={i18n.translate('esUi.cronEditor.cronMonthly.hourSelectLabel', {
              defaultMessage: 'Hour',
            })}
            onChange={e => onChange({ hour: e.target.value })}
            fullWidth
            prepend={i18n.translate('esUi.cronEditor.cronMonthly.fieldHour.textAtLabel', {
              defaultMessage: 'At',
            })}
            data-test-subj="cronFrequencyMonthlyHourSelect"
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiSelect
            options={minuteOptions}
            value={minute}
            aria-label={i18n.translate('esUi.cronEditor.cronMonthly.minuteSelectLabel', {
              defaultMessage: 'Minute',
            })}
            onChange={e => onChange({ minute: e.target.value })}
            fullWidth
            prepend=":"
            data-test-subj="cronFrequencyMonthlyMinuteSelect"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  </Fragment>
);

CronMonthly.propTypes = {
  minute: PropTypes.string.isRequired,
  minuteOptions: PropTypes.array.isRequired,
  hour: PropTypes.string.isRequired,
  hourOptions: PropTypes.array.isRequired,
  date: PropTypes.string.isRequired,
  dateOptions: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
};
