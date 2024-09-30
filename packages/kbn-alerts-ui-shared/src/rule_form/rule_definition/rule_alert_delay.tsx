/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import {
  ALERT_DELAY_TITLE_PREFIX,
  ALERT_DELAY_TITLE_SUFFIX,
  ALERT_DELAY_TITLE,
} from '../translations';
import { useRuleFormState, useRuleFormDispatch } from '../hooks';

const INTEGER_REGEX = /^[1-9][0-9]*$/;
const INVALID_KEYS = ['-', '+', '.', 'e', 'E'];

export const RuleAlertDelay = () => {
  const { formData, baseErrors } = useRuleFormState();

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

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (INVALID_KEYS.includes(e.key)) {
      e.preventDefault();
    }
  }, []);

  return (
    <EuiFormRow
      fullWidth
      label={ALERT_DELAY_TITLE}
      isInvalid={!!baseErrors?.alertDelay?.length}
      error={baseErrors?.alertDelay}
      data-test-subj="alertDelay"
      display="rowCompressed"
    >
      <EuiFieldNumber
        fullWidth
        min={1}
        value={alertDelay?.active ?? ''}
        name="alertDelay"
        data-test-subj="alertDelayInput"
        prepend={[ALERT_DELAY_TITLE_PREFIX]}
        isInvalid={!!baseErrors?.alertDelay?.length}
        append={ALERT_DELAY_TITLE_SUFFIX}
        onChange={onAlertDelayChange}
        onKeyDown={onKeyDown}
      />
    </EuiFormRow>
  );
};
