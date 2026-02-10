/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Control, UseFormSetValue } from 'react-hook-form';
import type { FormValues } from '../form/types';
import type { RuleFieldsServices } from '../form/rule_fields';
import { RecoveryQueryFields } from '../form/fields/recovery_query_fields';

export interface RecoveryQueryFlyoutProps {
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  services: RuleFieldsServices;
  onClose: () => void;
}

/**
 * Child flyout for configuring recovery query settings.
 * Uses EUI's flyout session management with session="inherit"
 * to integrate with the parent rule form flyout.
 */
export const RecoveryQueryFlyout: React.FC<RecoveryQueryFlyoutProps> = ({
  control,
  setValue,
  services,
  onClose,
}) => {
  const flyoutTitleId = 'recoveryQueryFlyoutTitle';

  return (
    <EuiFlyout
      session="inherit"
      aria-labelledby={flyoutTitleId}
      flyoutMenuProps={{
        title: i18n.translate('xpack.esqlRuleForm.recoveryQueryFlyoutTitle', {
          defaultMessage: 'Configure Recovery Query',
        }),
      }}
      onClose={onClose}
      size="m"
    >
      <EuiFlyoutBody>
        <RecoveryQueryFields control={control} setValue={setValue} services={services} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate('xpack.esqlRuleForm.recoveryQueryFlyout.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={onClose}>
              {i18n.translate('xpack.esqlRuleForm.recoveryQueryFlyout.applyButton', {
                defaultMessage: 'Apply',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
