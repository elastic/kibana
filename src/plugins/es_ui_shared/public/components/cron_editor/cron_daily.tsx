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
  onChange: ({ minute, hour }: { minute?: string; hour?: string }) => void;
}

export const CronDaily: React.FunctionComponent<Props> = ({
  minute,
  minuteOptions,
  hour,
  hourOptions,
  onChange,
}) => (
  <Fragment>
    <EuiFormRow
      label={
        <FormattedMessage id="esUi.cronEditor.cronDaily.fieldTimeLabel" defaultMessage="Time" />
      }
      fullWidth
      data-test-subj="cronFrequencyConfiguration"
    >
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiSelect
            options={hourOptions}
            value={hour}
            aria-label={i18n.translate('esUi.cronEditor.cronDaily.hourSelectLabel', {
              defaultMessage: 'Hour',
            })}
            onChange={(e) => onChange({ hour: e.target.value })}
            fullWidth
            prepend={i18n.translate('esUi.cronEditor.cronDaily.fieldHour.textAtLabel', {
              defaultMessage: 'At',
            })}
            data-test-subj="cronFrequencyDailyHourSelect"
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiSelect
            options={minuteOptions}
            value={minute}
            aria-label={i18n.translate('esUi.cronEditor.cronDaily.minuteSelectLabel', {
              defaultMessage: 'Minute',
            })}
            onChange={(e) => onChange({ minute: e.target.value })}
            fullWidth
            prepend=":"
            data-test-subj="cronFrequencyDailyMinuteSelect"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  </Fragment>
);
