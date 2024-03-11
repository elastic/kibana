/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAppContext } from '../../hooks/use_app_context';

export const SELECTED_CONNECTOR_LOCAL_STORAGE_KEY =
  'xpack.observabilityAiAssistant.lastUsedConnector';

export function SearchConnectorTab() {
  const { application } = useAppContext();
  const url = application.getUrlForApp('enterprise_search', { path: '/content/connectors' });

  return (
    <>
      <EuiText>
        {i18n.translate(
          'aiAssistantManagementObservability.searchConnectorTab.searchConnectorsEnablesYouTextLabel',
          {
            defaultMessage:
              'Connectors enable you to index content from external sources thereby making it available for the AI Assistant. This can greatly improve the relevance of the AI Assistant’s responses.',
          }
        )}
      </EuiText>

      <EuiText>
        <FormattedMessage
          id="aiAssistantManagementObservability.searchConnectorTab.searchConnectorsManagementLink"
          defaultMessage="You can manage connectors under {searchConnectorLink}."
          values={{
            searchConnectorLink: (
              <EuiLink
                data-test-subj="pluginsSearchConnectorTabSearchConnectorsManagementPageLink"
                href={url}
              >
                {i18n.translate(
                  'aiAssistantManagementObservability.searchConnectorTab.searchConnectorsManagementPageLinkLabel',
                  { defaultMessage: 'Connectors' }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
}
