/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  onClearHistory: () => void;
  onDisableSavingToHistory: () => void;
}

export const StorageQuotaError = ({ onClearHistory, onDisableSavingToHistory }: Props) => (
  <EuiFlexGroup alignItems="center">
    <EuiFlexItem>
      <EuiButtonEmpty onClick={onClearHistory}>
        <FormattedMessage id="console.notification.clearHistory" defaultMessage="Clear history" />
      </EuiButtonEmpty>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiButton onClick={onDisableSavingToHistory}>
        <FormattedMessage
          id="console.notification.disableSavingToHistory"
          defaultMessage="Disable saving"
        />
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);
