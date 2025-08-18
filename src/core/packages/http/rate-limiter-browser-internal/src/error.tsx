/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiEmptyPrompt, EuiPage, EuiPageBody, EuiPageSection } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import useInterval from 'react-use/lib/useInterval';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { getRetryAfter } from './utils';

interface RateLimiterErrorProps {
  error: IHttpFetchError;
}

export function RateLimiterError({ error }: RateLimiterErrorProps) {
  const retryAfter = useMemo(() => getRetryAfter(error), [error]);
  const [counter, setCounter] = useState(retryAfter);
  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  useInterval(() => setCounter(counter - 1), counter > 0 ? 1000 : null);

  return (
    <EuiPage css={{ minHeight: '100vh', alignItems: 'center' }} data-test-subj="rateLimiterScreen">
      <EuiPageBody>
        <EuiPageSection alignment="center">
          <EuiEmptyPrompt
            iconType="warning"
            iconColor="danger"
            title={
              <h2>
                <FormattedMessage
                  id="core.http.rateLimiter.errorPageTitle"
                  defaultMessage="Server is overloaded"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="core.http.rateLimiter.errorPageDescription"
                  defaultMessage="Try refreshing the page. If that doesn't work, wait a few seconds and try again."
                />
              </p>
            }
            actions={[
              <EuiButton
                color="primary"
                fill
                disabled={counter > 0}
                onClick={handleReload}
                data-test-subj="reload"
              >
                <FormattedMessage
                  id="core.http.rateLimiter.reloadButtonLabel"
                  defaultMessage="Reload{timeout, plural, =0 {} other { (#)}}"
                  values={{ timeout: counter }}
                />
              </EuiButton>,
            ]}
          />
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
}
