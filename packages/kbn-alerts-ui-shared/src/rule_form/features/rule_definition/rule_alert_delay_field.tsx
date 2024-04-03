/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldNumber } from '@elastic/eui';
import { useRuleFormDispatch } from '../../hooks';
import { INTEGER_REGEX } from '../../common/constants';
import { setAlertDelay, useSelectAlertDelay } from './slice';

export const RuleAlertDelayField: React.FC = () => {
  const alertDelay = useSelectAlertDelay();
  const dispatch = useRuleFormDispatch();
  return (
    <EuiFieldNumber
      fullWidth
      min={1}
      value={alertDelay || ''}
      name="alertDelay"
      data-test-subj="alertDelayInput"
      prepend={[
        i18n.translate('xpack.triggersActionsUI.sections.ruleForm.alertDelayFieldLabel', {
          defaultMessage: 'Alert after',
        }),
      ]}
      append={i18n.translate(
        'xpack.triggersActionsUI.sections.ruleForm.alertDelayFieldAppendLabel',
        {
          defaultMessage: 'consecutive matches',
        }
      )}
      onChange={(e) => {
        const value = e.target.value;
        if (value === '' || INTEGER_REGEX.test(value)) {
          const parsedValue = value === '' ? '' : parseInt(value, 10);
          dispatch(setAlertDelay(parsedValue || undefined));
        }
      }}
    />
  );
};
