/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiFieldText, EuiFormRow, EuiIconTip } from '@elastic/eui';
import {
  ALERT_DELAY_TITLE_PREFIX,
  ALERT_DELAY_TITLE_SUFFIX,
  ALERT_DELAY_HELP_TEXT,
  ALERT_DELAY_TITLE,
} from '../translations';
import { useRuleFormState, useRuleFormDispatch } from '../hooks';

const INTEGER_REGEX = /^[1-9][0-9]*$/;

export const RuleAlertDelay = () => {
  const { formData, errors = {} } = useRuleFormState();

  const dispatch = useRuleFormDispatch();

  const { alertDelay } = formData;

  const onAlertDelayChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.validity.valid) {
        return;
      }
      const value = e.target.value;
      if (value === '') {
        dispatch({
          type: 'setAlertDelay',
          payload: null,
        });
      } else if (INTEGER_REGEX.test(value)) {
        const parsedValue = parseInt(value, 10);
        dispatch({
          type: 'setAlertDelay',
          payload: { active: parsedValue },
        });
      }
    },
    [dispatch]
  );

  return (
    <EuiFormRow
      fullWidth
      label={ALERT_DELAY_TITLE}
      isInvalid={errors.alertDelay?.length > 0}
      error={errors.alertDelay}
      data-test-subj="alertDelay"
      display="rowCompressed"
    >
      <EuiFieldText
        fullWidth
        inputMode="numeric"
        pattern="[1-9][0-9]*"
        value={alertDelay?.active ?? ''}
        name="alertDelay"
        data-test-subj="alertDelayInput"
        placeholder={ALERT_DELAY_TITLE}
        prepend={[
          ALERT_DELAY_TITLE_PREFIX,
          <EuiIconTip position="right" type="questionInCircle" content={ALERT_DELAY_HELP_TEXT} />,
        ]}
        isInvalid={errors.alertDelay?.length > 0}
        append={ALERT_DELAY_TITLE_SUFFIX}
        onChange={onAlertDelayChange}
      />
    </EuiFormRow>
  );
};
