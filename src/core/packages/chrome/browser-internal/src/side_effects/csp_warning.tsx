/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { mountReactNode } from '@kbn/core-mount-utils-browser-internal';
import type { NotificationsStart } from '@kbn/core-notifications-browser';

export interface CspWarningDeps {
  browserSupportsCsp: boolean;
  warnLegacyBrowsers: boolean;
  getNotifications: () => Promise<NotificationsStart>;
}

/** Shows a warning toast if the browser doesn't support CSP. */
export function showCspWarningIfNeeded({
  browserSupportsCsp,
  warnLegacyBrowsers,
  getNotifications,
}: CspWarningDeps): void {
  if (browserSupportsCsp || !warnLegacyBrowsers) {
    return;
  }

  getNotifications().then((notifications) => {
    notifications.toasts.addWarning({
      title: mountReactNode(
        <FormattedMessage
          id="core.chrome.legacyBrowserWarning"
          defaultMessage="Your browser does not meet the security requirements for Kibana."
        />
      ),
    });
  });
}
