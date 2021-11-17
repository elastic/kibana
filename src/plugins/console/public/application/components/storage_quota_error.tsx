import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  onClearHistory: () => void;
  onDisableSavingToHistory: () => void;
}

export const StorageQuotaError = ({ onClearHistory, onDisableSavingToHistory }: Props) => {
  return (
    <>
      <EuiSpacer size="s"/>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiButtonEmpty onClick={onClearHistory}>
            <FormattedMessage id="console.notification.clearHistory" defaultMessage="Clear history"/>
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton onClick={onDisableSavingToHistory}>
            <FormattedMessage id="console.notification.disableSavingToHistory" defaultMessage="Disable saving"/>
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  )
}
