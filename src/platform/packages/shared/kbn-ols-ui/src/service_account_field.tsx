/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  type EuiFormRowProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Principal } from '@kbn/ols';
import { SERVICE_ACCOUNT_ID_PATTERN } from './principal_picker';

export interface ServiceAccountFieldProps {
  onAdd: (principal: Principal) => void;
  /** Principals that cannot be added, such as the owner and existing entries. */
  excluded: Principal[];
  isDisabled?: boolean;
}

/**
 * Adds a service account by its ID. Kibana checks that the account exists when access is saved.
 */
export const ServiceAccountField = ({ onAdd, excluded, isDisabled }: ServiceAccountFieldProps) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();

  const add = () => {
    const id = value.trim();
    if (!SERVICE_ACCOUNT_ID_PATTERN.test(id)) {
      setError(
        i18n.translate('olsUi.serviceAccountField.invalid', {
          defaultMessage: 'Enter an ID in the namespace/service form, such as kibana/my-service.',
        })
      );
      return;
    }
    if (
      excluded.some(({ type, id: excludedId }) => type === 'service_account' && excludedId === id)
    ) {
      setError(
        i18n.translate('olsUi.serviceAccountField.duplicate', {
          defaultMessage: 'This service account already has access.',
        })
      );
      return;
    }
    onAdd({ type: 'service_account', id });
    setValue('');
  };

  const rowProps: Partial<EuiFormRowProps> = error
    ? { isInvalid: true, error }
    : {
        helpText: i18n.translate('olsUi.serviceAccountField.helpText', {
          defaultMessage: 'Kibana checks that the account exists when you save.',
        }),
      };

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('olsUi.serviceAccountField.label', {
        defaultMessage: 'Add a service account',
      })}
      {...rowProps}
    >
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiFieldText
            fullWidth
            value={value}
            isInvalid={!!error}
            disabled={isDisabled}
            placeholder={i18n.translate('olsUi.serviceAccountField.placeholder', {
              defaultMessage: 'Service account ID, such as kibana/my-service',
            })}
            onChange={(event) => {
              setValue(event.target.value);
              setError(undefined);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                add();
              }
            }}
            data-test-subj="accessPanelServiceAccountInput"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={add}
            isDisabled={isDisabled || !value.trim()}
            data-test-subj="accessPanelServiceAccountAdd"
          >
            {i18n.translate('olsUi.serviceAccountField.add', { defaultMessage: 'Add' })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
