/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, EuiFormRow, EuiLiveAnnouncer, EuiSpacer } from '@elastic/eui';
import * as React from 'react';
import { i18n } from '@kbn/i18n';
import type { ApiKey } from './types';
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
  const [announcement, setAnnouncement] = React.useState('');
  const formatLabels = React.useMemo(
    () => ({
      encoded: i18n.translate('cloud.connectionDetails.apiKeyFormat.encoded.title', {
        defaultMessage: 'Encoded',
      }),
      beats: i18n.translate('cloud.connectionDetails.apiKeyFormat.beats.title', {
        defaultMessage: 'Beats',
      }),
      logstash: i18n.translate('cloud.connectionDetails.apiKeyFormat.logstash.title', {
        defaultMessage: 'Logstash',
      }),
    }),
    []
  );
  const keyValue = format === 'encoded' ? apiKey.encoded : `${apiKey.id}:${apiKey.key}`;
  const screenReaderHint = i18n.translate(
    'cloud.connectionDetails.apiKeys.successForm.screenReaderHint',
    {
      defaultMessage: 'Press to copy the API key to the clipboard.',
    }
  );

  const handleCopySuccess = React.useCallback(() => {
    const message = i18n.translate('cloud.connectionDetails.apiKeys.copySuccessAnnouncement', {
      defaultMessage: 'API key copied to clipboard in {format} format.',
      values: {
        format: formatLabels[format],
      },
    });
    setAnnouncement(message);
  }, [formatLabels, format]);

  React.useEffect(() => {
    setAnnouncement(
      i18n.translate('cloud.connectionDetails.apiKeys.successForm.mountAnnouncement', {
        defaultMessage:
          'API key created successfully. Current format is {format}. You can change the format in the dropdown and copy the API key using the copy button.',
        values: {
          format: formatLabels[format],
        },
      })
    );
  }, [formatLabels, format]);

  return (
    <>
      <EuiLiveAnnouncer>{announcement}</EuiLiveAnnouncer>
      <EuiCallOut
        color="success"
        iconType="check"
        title={i18n.translate('cloud.connectionDetails.apiKeys.successForm.title', {
          defaultMessage: 'Created API key "{name}"',
          values: { name: apiKey.name },
        })}
        data-test-subj="connectionDetailsApiKeySuccessForm"
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
          data-test-subj="connectionDetailsApiKeyValueRow"
        >
          <CopyInput
            value={keyValue}
            onCopyClick={onCopyClick}
            onCopySuccess={handleCopySuccess}
            screenReaderHint={screenReaderHint}
          />
        </EuiFormRow>
      </EuiCallOut>

      <EuiSpacer size={'m'} />

      <ManageKeysLink />
    </>
  );
};
