/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CopyInput } from '../../../components/copy_input';

export interface EndpointUrlProps {
  url: string;
  onCopyClick?: () => void;
}

export const EndpointUrlRow: React.FC<EndpointUrlProps> = ({ url, onCopyClick }) => {
  return (
    <EuiFormRow
      label={i18n.translate('cloud.connectionDetails.tab.endpoints.endpointField.label', {
        defaultMessage: 'Elasticsearch endpoint',
      })}
      helpText={i18n.translate('cloud.connectionDetails.tab.endpoints.endpointField.helpText', {
        defaultMessage: 'The most common method for establishing an Elasticsearch connection.',
      })}
      fullWidth
      data-test-subj="connectionDetailsEsUrl"
    >
      <CopyInput
        value={url}
        onCopyClick={() => onCopyClick?.()}
        aria-label={i18n.translate('cloud.connectionDetails.tab.endpoints.endpointField.copy', {
          defaultMessage: 'Copy Elasticsearch endpoint to clipboard',
        })}
      />
    </EuiFormRow>
  );
};
