/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type RecoveryPolicyType = 'query' | 'no_breach';

const RECOVERY_OPTIONS: Array<{ value: RecoveryPolicyType; text: string }> = [
  {
    value: 'query',
    text: i18n.translate('xpack.esqlRuleForm.recoverySelect.queryOption', {
      defaultMessage: 'Query',
    }),
  },
  {
    value: 'no_breach',
    text: i18n.translate('xpack.esqlRuleForm.recoverySelect.noBreachOption', {
      defaultMessage: 'No breach',
    }),
  },
];

interface Props {
  value?: RecoveryPolicyType;
  onChange: (value: RecoveryPolicyType) => void;
}

export const RecoverySelect = React.forwardRef<HTMLSelectElement, Props>(
  ({ value, onChange }, ref) => {
    return (
      <EuiSelect
        options={RECOVERY_OPTIONS}
        value={value}
        onChange={(e) => onChange(e.target.value as RecoveryPolicyType)}
        aria-label={i18n.translate('xpack.esqlRuleForm.recoverySelect.ariaLabel', {
          defaultMessage: 'Select recovery option',
        })}
        data-test-subj="recoverySelect"
        inputRef={ref}
      />
    );
  }
);
