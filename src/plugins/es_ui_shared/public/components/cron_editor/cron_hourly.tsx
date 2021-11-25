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
import { EuiFormRow, EuiSelect, EuiSelectOption } from '@elastic/eui';

interface Props {
  minute?: string;
  minuteOptions: EuiSelectOption[];
  onChange: ({ minute }: { minute?: string }) => void;
}

export const CronHourly: React.FunctionComponent<Props> = ({ minute, minuteOptions, onChange }) => (
  <Fragment>
    <EuiFormRow
      label={
        <FormattedMessage id="esUi.cronEditor.cronHourly.fieldTimeLabel" defaultMessage="Minute" />
      }
      fullWidth
      data-test-subj="cronFrequencyConfiguration"
    >
      <EuiSelect
        options={minuteOptions}
        value={minute}
        onChange={(e) => onChange({ minute: e.target.value })}
        fullWidth
        prepend={i18n.translate('esUi.cronEditor.cronHourly.fieldMinute.textAtLabel', {
          defaultMessage: 'At',
        })}
        data-test-subj="cronFrequencyHourlyMinuteSelect"
      />
    </EuiFormRow>
  </Fragment>
);
