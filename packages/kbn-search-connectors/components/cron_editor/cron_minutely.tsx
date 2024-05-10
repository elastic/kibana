/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { Fragment } from 'react';

import { EuiFormRow, EuiSelect, EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  disabled?: boolean;
  minute?: string;
  minuteOptions: EuiSelectOption[];
  onChange: ({ minute }: { minute?: string }) => void;
}

export const CronMinutely: React.FunctionComponent<Props> = ({
  disabled,
  minute,
  minuteOptions,
  onChange,
}) => (
  <Fragment>
    <EuiFormRow
      label={
        <FormattedMessage
          id="searchConnectors.cronEditor.cronMinutely.fieldTimeLabel"
          defaultMessage="Minute"
        />
      }
      fullWidth
      data-test-subj="cronFrequencyConfiguration"
    >
      <EuiSelect
        disabled={disabled}
        options={minuteOptions}
        value={minute}
        onChange={(e) => onChange({ minute: e.target.value })}
        fullWidth
        prepend={i18n.translate(
          'searchConnectors.cronEditor.cronMinutely.fieldMinute.textAtLabel',
          {
            defaultMessage: 'Every',
          }
        )}
        append={i18n.translate(
          'searchConnectors.cronEditor.cronMinutely.fieldMinute.textAppendLabel',
          {
            defaultMessage: 'minutes',
          }
        )}
        data-test-subj="cronFrequencyMinutelyMinuteSelect"
      />
    </EuiFormRow>
  </Fragment>
);
