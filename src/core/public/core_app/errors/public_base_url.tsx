/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { HttpStart, NotificationsStart } from '../..';
import type { DocLinksStart } from '../../doc_links';
import { mountReactNode } from '../../utils';

/** Only exported for tests */
export const MISSING_CONFIG_STORAGE_KEY = `core.warnings.publicBaseUrlMissingDismissed`;

interface Deps {
  docLinks: DocLinksStart;
  http: HttpStart;
  notifications: NotificationsStart;
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
  if (missingWarningSeen || http.basePath.publicBaseUrl) {
    return;
  }

  const toast = notifications.toasts.addWarning({
    title: i18n.translate('core.ui.publicBaseUrlWarning.configRecommendedTitle', {
      defaultMessage: 'Configuration recommended',
    }),
    text: mountReactNode(
      <>
        <p>
          <FormattedMessage
            id="core.ui.publicBaseUrlWarning.configRecommendedDescription"
            defaultMessage="In a production environment, it is recommended that you configure {configKey}."
            values={{
              configKey: <code>server.publicBaseUrl</code>,
            }}
          />{' '}
          <a href={`${docLinks.links.settings}#server-publicBaseUrl`} target="_blank">
            <FormattedMessage
              id="core.ui.publicBaseUrlWarning.learnMoreLinkLabel"
              defaultMessage="Learn more."
            />
          </a>
        </p>

        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              onClick={() => {
                notifications.toasts.remove(toast);
                storage.setItem(MISSING_CONFIG_STORAGE_KEY, 'true');
              }}
              id="mute"
            >
              <FormattedMessage
                id="core.ui.publicBaseUrlWarning.muteWarningButtonLabel"
                defaultMessage="Mute warning"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    ),
  });
};
