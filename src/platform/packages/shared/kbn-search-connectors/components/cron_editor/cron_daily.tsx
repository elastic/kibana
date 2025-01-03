/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect, EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  disabled?: boolean;
  minute?: string;
  minuteOptions: EuiSelectOption[];
  hour?: string;
  hourOptions: EuiSelectOption[];
  onChange: ({ minute, hour }: { minute?: string; hour?: string }) => void;
}

export const CronDaily: React.FunctionComponent<Props> = ({
  disabled,
  minute,
  minuteOptions,
  hour,
  hourOptions,
  onChange,
}) => (
  <Fragment>
    <EuiFormRow
      label={
        <FormattedMessage
          id="searchConnectors.cronEditor.cronDaily.fieldTimeLabel"
          defaultMessage="Time"
        />
      }
      fullWidth
      data-test-subj="cronFrequencyConfiguration"
    >
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiSelect
            disabled={disabled}
            options={hourOptions}
            value={hour}
            aria-label={i18n.translate('searchConnectors.cronEditor.cronDaily.hourSelectLabel', {
              defaultMessage: 'Hour',
            })}
            onChange={(e) => onChange({ hour: e.target.value })}
            fullWidth
            prepend={i18n.translate('searchConnectors.cronEditor.cronDaily.fieldHour.textAtLabel', {
              defaultMessage: 'At',
            })}
            data-test-subj="cronFrequencyDailyHourSelect"
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiSelect
            disabled={disabled}
            options={minuteOptions}
            value={minute}
            aria-label={i18n.translate('searchConnectors.cronEditor.cronDaily.minuteSelectLabel', {
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
