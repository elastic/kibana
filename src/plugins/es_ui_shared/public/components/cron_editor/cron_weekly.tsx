/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect, EuiSelectOption } from '@elastic/eui';

interface Props {
  minute?: string;
  minuteOptions: EuiSelectOption[];
  hour?: string;
  hourOptions: EuiSelectOption[];
  day?: string;
  dayOptions: EuiSelectOption[];
  onChange: ({ minute, hour, day }: { minute?: string; hour?: string; day?: string }) => void;
}

export const CronWeekly: React.FunctionComponent<Props> = ({
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
      label={
        <FormattedMessage id="esUi.cronEditor.cronWeekly.fieldDateLabel" defaultMessage="Day" />
      }
      fullWidth
      data-test-subj="cronFrequencyConfiguration"
    >
      <EuiSelect
        options={dayOptions}
        value={day}
        onChange={(e) => onChange({ day: e.target.value })}
        fullWidth
        prepend={i18n.translate('esUi.cronEditor.cronWeekly.textOnLabel', {
          defaultMessage: 'On',
        })}
        data-test-subj="cronFrequencyWeeklyDaySelect"
      />
    </EuiFormRow>

    <EuiFormRow
      label={
        <FormattedMessage id="esUi.cronEditor.cronWeekly.fieldTimeLabel" defaultMessage="Time" />
      }
      fullWidth
      data-test-subj="cronFrequencyConfiguration"
    >
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiSelect
            options={hourOptions}
            value={hour}
            aria-label={i18n.translate('esUi.cronEditor.cronWeekly.hourSelectLabel', {
              defaultMessage: 'Hour',
            })}
            onChange={(e) => onChange({ hour: e.target.value })}
            fullWidth
            prepend={i18n.translate('esUi.cronEditor.cronWeekly.fieldHour.textAtLabel', {
              defaultMessage: 'At',
            })}
            data-test-subj="cronFrequencyWeeklyHourSelect"
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiSelect
            options={minuteOptions}
            value={minute}
            onChange={(e) => onChange({ minute: e.target.value })}
            aria-label={i18n.translate('esUi.cronEditor.cronWeekly.minuteSelectLabel', {
              defaultMessage: 'Minute',
            })}
            fullWidth
            prepend=":"
            data-test-subj="cronFrequencyWeeklyMinuteSelect"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  </Fragment>
);
