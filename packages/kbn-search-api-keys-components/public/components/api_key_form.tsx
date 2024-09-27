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
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ApiKeyFlyoutWrapper } from './api_key_flyout_wrapper';
import { useSearchApiKey, Status } from '../hooks/use_search_api_key';

export const ApiKeyForm = () => {
  const { euiTheme } = useEuiTheme();
  const [showFlyout, setShowFlyout] = useState(false);
  const { apiKey, status, handleSaveKey, showAPIKey, displayedApiKey } = useSearchApiKey();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexStart" responsive={false}>
      <EuiFlexItem grow={0}>
        <EuiTitle size="xxxs" css={{ whiteSpace: 'nowrap' }}>
          <h6>
            <FormattedMessage id="xpack.searchApiKeys.apiKeyForm.title" defaultMessage="API Key" />
          </h6>
        </EuiTitle>
      </EuiFlexItem>
      {status === Status.showUserPrivilegesError && (
        <EuiFlexItem grow={0}>
          <EuiBadge data-test-subj="apiKeyFormNoUserPrivileges">
            {i18n.translate('xpack.searchApiKeys.apiKeyForm.noUserPrivileges', {
              defaultMessage: "You don't have access to manage API keys",
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {status !== Status.showCreateButton && (
        <>
          <EuiFlexItem grow={0}>
            <EuiCode
              language="text"
              color="success"
              css={{ color: euiTheme.colors.successText }}
              data-test-subj="apiKeyFormAPIKey"
            >
              {displayedApiKey}
            </EuiCode>
          </EuiFlexItem>
          <EuiFlexItem grow={0}>
            <EuiButtonIcon
              iconType="eye"
              color="success"
              onClick={showAPIKey}
              data-test-subj="showAPIKeyButton"
              aria-label={i18n.translate('xpack.searchApiKeys.apiKeyForm.showApiKey', {
                defaultMessage: 'Show API Key',
              })}
            />
          </EuiFlexItem>
          {apiKey && (
            <EuiFlexItem grow={0}>
              <EuiCopy
                textToCopy={apiKey}
                afterMessage={i18n.translate('xpack.searchApiKeys.apiKeyForm.copyMessage', {
                  defaultMessage: 'Copied',
                })}
              >
                {(copy) => (
                  <EuiButtonIcon
                    onClick={copy}
                    iconType="copy"
                    color="success"
                    aria-label={i18n.translate('xpack.searchApiKeys.apiKeyForm.copyMessageLabel', {
                      defaultMessage: 'Copy Elasticsearch URL to clipboard',
                    })}
                  />
                )}
              </EuiCopy>
            </EuiFlexItem>
          )}
        </>
      )}
      {status === Status.showCreateButton && (
        <EuiFlexItem grow={0}>
          <EuiButton
            color="warning"
            size="s"
            iconSide="left"
            iconType="key"
            onClick={() => setShowFlyout(true)}
            data-test-subj="createAPIKeyButton"
          >
            <FormattedMessage
              id="xpack.searchApiKeys.apiKeyForm.createButton"
              defaultMessage="Create an API Key"
            />
          </EuiButton>
          {showFlyout && (
            <ApiKeyFlyoutWrapper onCancel={() => setShowFlyout(false)} onSuccess={handleSaveKey} />
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
