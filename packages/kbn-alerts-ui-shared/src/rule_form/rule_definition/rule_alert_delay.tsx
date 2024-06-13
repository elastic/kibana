/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { ALERT_DELAY_TITLE_PREFIX, ALERT_DELAY_TITLE_SUFFIX } from '../translations';
import { RuleFormErrors, Rule, RuleTypeParams } from '../../common';

const INTEGER_REGEX = /^[1-9][0-9]*$/;
const INVALID_KEYS = ['-', '+', '.', 'e', 'E'];

export interface RuleAlertDelayProps {
  alertDelay?: Rule<RuleTypeParams>['alertDelay'] | null;
  errors?: RuleFormErrors;
  onChange: (property: string, value: unknown) => void;
}

export const RuleAlertDelay = (props: RuleAlertDelayProps) => {
  const { alertDelay, errors = {}, onChange } = props;

  const onAlertDelayChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      if (value === '') {
        onChange('alertDelay', null);
      } else if (INTEGER_REGEX.test(value)) {
        const parsedValue = parseInt(value, 10);
        onChange('alertDelay', { active: parsedValue });
      }
    },
    [onChange]
  );

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (INVALID_KEYS.includes(e.key)) {
      e.preventDefault();
    }
  }, []);

  return (
    <EuiFormRow
      fullWidth
      isInvalid={errors.alertDelay?.length > 0}
      error={errors.alertDelay}
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
        isInvalid={errors.alertDelay?.length > 0}
        append={ALERT_DELAY_TITLE_SUFFIX}
        onChange={onAlertDelayChange}
        onKeyDown={onKeyDown}
      />
    </EuiFormRow>
  );
};
