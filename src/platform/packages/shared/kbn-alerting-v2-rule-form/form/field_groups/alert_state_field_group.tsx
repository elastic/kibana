/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow } from '@elastic/eui';
import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import type { FormValues } from '../types';
import type { RuleFieldsServices } from '../rule_fields';
import { FieldGroup } from './field_group';
import { RecoverySelect } from '../fields/recovery_select';
import { RecoveryQueryFlyout } from '../../flyout/recovery_query_flyout';

interface AlertStateFieldGroupProps {
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  services: RuleFieldsServices;
}

export const AlertStateFieldGroup: React.FC<AlertStateFieldGroupProps> = ({
  control,
  setValue,
  services,
}) => {
  const [isQueryFlyoutOpen, setIsQueryFlyoutOpen] = useState(false);
  const recoveryPolicyType = useWatch({ control, name: 'recovery_policy.type' });
  const prevRecoveryPolicyType = useRef(recoveryPolicyType);

  // Automatically open the flyout when type changes to 'query'
  useEffect(() => {
    if (recoveryPolicyType === 'query' && prevRecoveryPolicyType.current !== 'query') {
      setIsQueryFlyoutOpen(true);
    }
    prevRecoveryPolicyType.current = recoveryPolicyType;
  }, [recoveryPolicyType]);

  return (
    <FieldGroup
      title={i18n.translate('xpack.esqlRuleForm.alertStateManagement', {
        defaultMessage: 'Alert state management',
      })}
    >
      <EuiFormRow
        label={i18n.translate('xpack.esqlRuleForm.recoveryLabel', {
          defaultMessage: 'Recovery',
        })}
        helpText={i18n.translate('xpack.esqlRuleForm.recoveryHelpText', {
          defaultMessage: 'Select when alerts should recover.',
        })}
      >
        <Controller
          name="recovery_policy.type"
          control={control}
          render={({ field }) => <RecoverySelect {...field} />}
        />
      </EuiFormRow>

      {recoveryPolicyType === 'query' && isQueryFlyoutOpen && (
        <RecoveryQueryFlyout
          control={control}
          setValue={setValue}
          services={services}
          onClose={() => setIsQueryFlyoutOpen(false)}
        />
      )}
    </FieldGroup>
  );
};
