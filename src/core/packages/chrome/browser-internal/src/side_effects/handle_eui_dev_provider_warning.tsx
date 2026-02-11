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
import { setEuiDevProviderWarning } from '@elastic/eui';
import { mountReactNode } from '@kbn/core-mount-utils-browser-internal';
import type { NotificationsStart } from '@kbn/core-notifications-browser';

/**
 * Ensure developers are notified if working in a context that lacks the EUI Provider.
 * @internal
 */
export function handleEuiDevProviderWarning({
  notifications,
}: {
  notifications: NotificationsStart;
}) {
  setEuiDevProviderWarning((providerError) => {
    const errorObject = new Error(providerError.toString());
    // 1. show a stack trace in the console
    // eslint-disable-next-line no-console
    console.error(errorObject);

    // 2. store error in sessionStorage so it can be detected in testing
    const storedError = {
      message: providerError.toString(),
      stack: errorObject.stack ?? 'undefined',
      pageHref: window.location.href,
      pageTitle: document.title,
    };
    sessionStorage.setItem('dev.euiProviderWarning', JSON.stringify(storedError));

    // 3. error toast / popup
    notifications.toasts.addDanger({
      title: '`EuiProvider` is missing',
      text: mountReactNode(
        <p>
          <FormattedMessage
            id="core.chrome.euiDevProviderWarning"
            defaultMessage="Kibana components must be wrapped in a React Context provider for full functionality and proper theming support. See {link}."
            values={{
              link: (
                <a href="https://docs.elastic.dev/kibana-dev-docs/react-context">
                  https://docs.elastic.dev/kibana-dev-docs/react-context
                </a>
              ),
            }}
          />
        </p>
      ),
      'data-test-subj': 'core-chrome-euiDevProviderWarning-toast',
      toastLifeTimeMs: 60 * 60 * 1000, // keep message visible for up to an hour
    });
  });
}
