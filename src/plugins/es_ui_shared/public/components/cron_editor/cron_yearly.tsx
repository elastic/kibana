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
  date?: string;
  dateOptions: EuiSelectOption[];
  month?: string;
  monthOptions: EuiSelectOption[];
  onChange: ({
    minute,
    hour,
    date,
    month,
  }: {
    minute?: string;
    hour?: string;
    date?: string;
    month?: string;
  }) => void;
}

export const CronYearly: React.FunctionComponent<Props> = ({
  minute,
  minuteOptions,
  hour,
  hourOptions,
  date,
  dateOptions,
  month,
  monthOptions,
  onChange,
}) => (
  <Fragment>
    <EuiFormRow
      label={
        <FormattedMessage id="esUi.cronEditor.cronYearly.fieldMonthLabel" defaultMessage="Month" />
      }
      fullWidth
      data-test-subj="cronFrequencyConfiguration"
    >
      <EuiSelect
        options={monthOptions}
        value={month}
        onChange={(e) => onChange({ month: e.target.value })}
        fullWidth
        prepend={i18n.translate('esUi.cronEditor.cronYearly.fieldMonth.textInLabel', {
          defaultMessage: 'In',
        })}
        data-test-subj="cronFrequencyYearlyMonthSelect"
      />
    </EuiFormRow>

    <EuiFormRow
      label={
        <FormattedMessage id="esUi.cronEditor.cronYearly.fieldDateLabel" defaultMessage="Date" />
      }
      fullWidth
      data-test-subj="cronFrequencyConfiguration"
    >
      <EuiSelect
        options={dateOptions}
        value={date}
        onChange={(e) => onChange({ date: e.target.value })}
        fullWidth
        prepend={i18n.translate('esUi.cronEditor.cronYearly.fieldDate.textOnTheLabel', {
          defaultMessage: 'On the',
        })}
        data-test-subj="cronFrequencyYearlyDateSelect"
      />
    </EuiFormRow>

    <EuiFormRow
      label={
        <FormattedMessage id="esUi.cronEditor.cronYearly.fieldTimeLabel" defaultMessage="Time" />
      }
      fullWidth
      data-test-subj="cronFrequencyConfiguration"
    >
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiSelect
            options={hourOptions}
            value={hour}
            aria-label={i18n.translate('esUi.cronEditor.cronYearly.hourSelectLabel', {
              defaultMessage: 'Hour',
            })}
            onChange={(e) => onChange({ hour: e.target.value })}
            fullWidth
            prepend={i18n.translate('esUi.cronEditor.cronYearly.fieldHour.textAtLabel', {
              defaultMessage: 'At',
            })}
            data-test-subj="cronFrequencyYearlyHourSelect"
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiSelect
            options={minuteOptions}
            value={minute}
            aria-label={i18n.translate('esUi.cronEditor.cronYearly.minuteSelectLabel', {
              defaultMessage: 'Minute',
            })}
            onChange={(e) => onChange({ minute: e.target.value })}
            fullWidth
            prepend=":"
            data-test-subj="cronFrequencyYearlyMinuteSelect"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  </Fragment>
);
