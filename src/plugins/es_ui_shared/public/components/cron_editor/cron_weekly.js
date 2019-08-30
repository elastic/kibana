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

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiText,
} from '@elastic/eui';

export const CronWeekly = ({
  minute,
  minuteOptions,
  hour,
  hourOptions,
  day,
  dayOptions,
  onChange,
}) => (
  <Fragment>
    <EuiFormRow
      label={(
        <FormattedMessage
          id="esUi.cronEditor.cronWeekly.fieldDateLabel"
          defaultMessage="Day"
        />
      )}
      fullWidth
      data-test-subj="cronFrequencyConfiguration"
    >
      <EuiSelect
        options={dayOptions}
        value={day}
        onChange={e => onChange({ day: e.target.value })}
        fullWidth
        prepend={(
          <EuiText size="xs">
            <strong>
              <FormattedMessage
                id="esUi.cronEditor.cronWeekly.textOnLabel"
                defaultMessage="On"
              />
            </strong>
          </EuiText>
        )}
        data-test-subj="cronFrequencyWeeklyDaySelect"
      />
    </EuiFormRow>

    <EuiFormRow
      label={(
        <FormattedMessage
          id="esUi.cronEditor.cronWeekly.fieldTimeLabel"
          defaultMessage="Time"
        />
      )}
      fullWidth
      data-test-subj="cronFrequencyConfiguration"
    >
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiSelect
            options={hourOptions}
            value={hour}
            onChange={e => onChange({ hour: e.target.value })}
            fullWidth
            prepend={(
              <EuiText size="xs">
                <strong>
                  <FormattedMessage
                    id="esUi.cronEditor.cronWeekly.fieldHour.textAtLabel"
                    defaultMessage="At"
                  />
                </strong>
              </EuiText>
            )}
            data-test-subj="cronFrequencyWeeklyHourSelect"
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiSelect
            options={minuteOptions}
            value={minute}
            onChange={e => onChange({ minute: e.target.value })}
            fullWidth
            prepend={(
              <EuiText size="xs">
                <strong>
                  :
                </strong>
              </EuiText>
            )}
            data-test-subj="cronFrequencyWeeklyMinuteSelect"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  </Fragment>
);

CronWeekly.propTypes = {
  minute: PropTypes.string.isRequired,
  minuteOptions: PropTypes.array.isRequired,
  hour: PropTypes.string.isRequired,
  hourOptions: PropTypes.array.isRequired,
  day: PropTypes.string.isRequired,
  dayOptions: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
};
