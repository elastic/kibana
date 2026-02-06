/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import * as React from 'react';
import { i18n } from '@kbn/i18n';
import { ManageKeysLink } from '../../components/manage_keys_link';

export interface ConfigurationFormControlledProps {
  name: string;
  loading?: boolean;
  error?: Error | unknown;
  onNameChange: React.ChangeEventHandler<HTMLInputElement>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
}

export const ConfigurationFormControlled: React.FC<ConfigurationFormControlledProps> = ({
  name,
  loading,
  error,
  onNameChange,
  onSubmit,
}) => {
  const body = (
    <>
      {!!error && (
        <>
          <EuiCallOut
            announceOnMount={true}
            color="danger"
            iconType="error"
            title={i18n.translate('cloud.connectionDetails.tab.apiKeys.error.title', {
              defaultMessage: 'Error',
            })}
          >
            {error instanceof Error ? error.message : String(error)}
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}

      <EuiFormRow
        label={i18n.translate('cloud.connectionDetails.tab.apiKeys.nameField.label', {
          defaultMessage: 'API key name',
        })}
        helpText={i18n.translate('cloud.connectionDetails.tab.apiKeys.nameField.helpText', {
          defaultMessage: 'A good name makes it clear what your API key does.',
        })}
        error={'test'}
        isDisabled={loading}
        fullWidth
      >
        <EuiFieldText
          name="api-key-name"
          disabled={loading}
          isLoading={loading}
          value={name}
          onChange={onNameChange}
          data-test-subj={'connectionDetailsApiKeyNameInput'}
        />
      </EuiFormRow>
    </>
  );

  const footer = (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>
        <ManageKeysLink />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          type="submit"
          isLoading={loading}
          data-test-subj="connectionDetailsApiKeySubmitBtn"
        >
          {i18n.translate('cloud.connectionDetails.tab.apiKeys.nameField.createButton.label', {
            defaultMessage: 'Create API key',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiForm
      component="form"
      fullWidth
      onSubmit={onSubmit}
      data-test-subj={'connectionDetailsApiKeyConfigForm'}
    >
      {body}
      <EuiSpacer />
      {footer}
    </EuiForm>
  );
};
