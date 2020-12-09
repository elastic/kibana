/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from 'react-intl';

import { HttpSetup, NotificationsSetup } from '../..';
import { DocLinksSetup } from '../../doc_links';
import { mountReactNode } from '../../utils';

/** Only exported for tests */
export const MISSING_CONFIG_STORAGE_KEY = `core.warnings.publicBaseUrlMissingDismissed`;
export const MISMATCHED_CONFIG_STORAGE_KEY = `core.warnings.publicBaseUrlMismatchedDismissed`;

/** Small helper component for the toast content */
const WarningToastContent: React.FC<{ docLinks: DocLinksSetup; onMute: () => void }> = ({
  children,
  docLinks,
  onMute,
}) => {
  return (
    <>
      <p>
        {children}
        <a href={`${docLinks.links.settings}#server-publicBaseUrl`} target="_blank">
          <FormattedMessage
            id="core.ui.publicBaseUrlWarning.seeDocumentationLinkLabel"
            defaultMessage="See the documentation."
          />
        </a>
      </p>

      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={onMute} id="mute">
            <FormattedMessage
              id="core.ui.publicBaseUrlWarning.muteWarningButtonLabel"
              defaultMessage="Mute warning"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

interface Deps {
  docLinks: DocLinksSetup;
  http: HttpSetup;
  notifications: NotificationsSetup;
  // Exposed for easier testing
  storage?: Storage;
  location?: Location;
}

export const setupPublicBaseUrlConfigWarning = ({
  docLinks,
  http,
  notifications,
  storage = window.localStorage,
  location = window.location,
}: Deps) => {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return;
  }

  const missingWarningSeen = storage.getItem(MISSING_CONFIG_STORAGE_KEY) === 'true';
  const mismatchedWarningSeen = storage.getItem(MISMATCHED_CONFIG_STORAGE_KEY) === 'true';

  if (!missingWarningSeen && !http.basePath.publicBaseUrl) {
    const toast = notifications.toasts.addWarning({
      title: i18n.translate('core.ui.publicBaseUrlWarning.configMissingTitle', {
        defaultMessage: 'Configuration missing',
      }),
      text: mountReactNode(
        <WarningToastContent
          docLinks={docLinks}
          onMute={() => {
            notifications.toasts.remove(toast);
            storage.setItem(MISSING_CONFIG_STORAGE_KEY, 'true');
          }}
        >
          <FormattedMessage
            id="core.ui.publicBaseUrlWarning.configMissingDescription"
            defaultMessage="{configKey} should be configured when running in a production environment. Some features may not behave correctly."
            values={{
              configKey: <code>server.publicBaseUrl</code>,
            }}
          />
        </WarningToastContent>
      ),
    });
  } else if (
    !mismatchedWarningSeen &&
    http.basePath.publicBaseUrl &&
    !location.toString().startsWith(http.basePath.publicBaseUrl)
  ) {
    const toast = notifications.toasts.addWarning({
      title: i18n.translate('core.ui.publicBaseUrlWarning.configMismatchTitle', {
        defaultMessage: 'Configuration issue',
      }),
      text: mountReactNode(
        <WarningToastContent
          docLinks={docLinks}
          onMute={() => {
            notifications.toasts.remove(toast);
            storage.setItem(MISMATCHED_CONFIG_STORAGE_KEY, 'true');
          }}
        >
          <FormattedMessage
            id="core.ui.publicBaseUrlWarning.configMismatchDescription"
            defaultMessage="{configKey} does match the URL that you are using to access Kibana. Some features may not behave correctly."
            values={{
              configKey: <code>server.publicBaseUrl</code>,
            }}
          />
        </WarningToastContent>
      ),
    });
  }
};
