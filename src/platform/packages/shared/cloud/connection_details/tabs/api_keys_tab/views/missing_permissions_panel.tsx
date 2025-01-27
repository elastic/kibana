/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ManageKeysLink } from '../components/manage_keys_link';

export const MissingPermissionsPanel: React.FC = () => {
  return (
    <>
      <EuiCallOut
        color={'warning'}
        iconType={'iInCircle'}
        title={i18n.translate('cloud.connectionDetails.tabs.apiKeys.missingPermPanel.title', {
          defaultMessage: 'Missing permissions',
        })}
      >
        <p>
          {i18n.translate('cloud.connectionDetails.tabs.apiKeys.missingPermPanel.description', {
            defaultMessage:
              'Your assigned role does not have the necessary permissions to create an API key. ' +
              'Please contact your administrator.',
          })}
        </p>
      </EuiCallOut>

      <EuiSpacer size={'m'} />

      <ManageKeysLink />
    </>
  );
};
