/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, EuiFormRow, EuiSpacer } from '@elastic/eui';
import * as React from 'react';
import { i18n } from '@kbn/i18n';
import { ApiKey } from './types';
import { FormatSelect, type Format } from './format_select';
import { CopyInput } from '../../../../components/copy_input';
import { ManageKeysLink } from '../../components/manage_keys_link';

export interface SuccessFormControlledProps {
  apiKey: ApiKey;
  format: Format;
  onFormatChange: (format: Format) => void;
  onCopyClick?: () => void;
}

export const SuccessFormControlled: React.FC<SuccessFormControlledProps> = ({
  apiKey,
  format,
  onFormatChange,
  onCopyClick,
}) => {
  const keyValue = format === 'encoded' ? apiKey.encoded : `${apiKey.id}:${apiKey.key}`;

  return (
    <>
      <EuiCallOut
        color="success"
        iconType="check"
        title={i18n.translate('cloud.connectionDetails.apiKeys.successForm.title', {
          defaultMessage: 'Created API key "{name}"',
          values: { name: apiKey.name },
        })}
        data-test-subj={'connectionDetailsApiKeySuccessForm'}
      >
        <p>
          {i18n.translate('cloud.connectionDetails.apiKeys.successForm.message', {
            defaultMessage:
              'Copy your API key below now. It will not be available ' +
              'after you close this dialogue. The API key will expire in 90 days.',
          })}
        </p>

        <EuiFormRow
          label={i18n.translate('cloud.connectionDetails.apiKeys.successForm.keyFormatTitle', {
            defaultMessage: 'API key format',
          })}
          fullWidth
        >
          <FormatSelect value={format} onChange={onFormatChange} />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('cloud.connectionDetails.apiKeys.successForm.keyValueTitle', {
            defaultMessage: 'API key value',
          })}
          fullWidth
          data-test-subj={'connectionDetailsApiKeyValueRow'}
        >
          <CopyInput value={keyValue} onCopyClick={onCopyClick} />
        </EuiFormRow>
      </EuiCallOut>

      <EuiSpacer size={'m'} />

      <ManageKeysLink />
    </>
  );
};
