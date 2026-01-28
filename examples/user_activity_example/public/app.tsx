/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import {
  EuiPageTemplate,
  EuiButton,
  EuiText,
  EuiCallOut,
  EuiSpacer,
  EuiCode,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { TRACK_ACTION_ROUTE } from '../common';

interface Props {
  coreStart: CoreStart;
}

function UserActivityExample({ coreStart }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const trackAction = useCallback(async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await coreStart.http.post<{ success: boolean; message: string }>(
        TRACK_ACTION_ROUTE
      );
      setResult(response);
    } catch (e) {
      setResult({ success: false, message: 'Failed to track action' });
    }

    setIsLoading(false);
  }, [coreStart.http]);

  return (
    <KibanaRenderContextProvider {...coreStart}>
      <EuiPageTemplate>
        <EuiPageTemplate.Header>
          <EuiText>
            <h1>User Activity Example</h1>
          </EuiText>
        </EuiPageTemplate.Header>
        <EuiPageTemplate.Section>
          <EuiText>
            <p>
              This example demonstrates how to use the <EuiCode>userActivity</EuiCode> service to
              track user actions. Click the button below to trigger a server-side action that will
              be logged.
            </p>
            <p>
              Make sure you have enabled the service in <EuiCode>kibana.yml</EuiCode>:
            </p>
            <pre>
              {`user_activity:
  enabled: true`}
            </pre>
          </EuiText>

          <EuiSpacer />

          <EuiButton onClick={trackAction} disabled={isLoading} fill>
            {isLoading ? <EuiLoadingSpinner size="m" /> : 'Track User Action'}
          </EuiButton>

          <EuiSpacer />

          {result && (
            <EuiCallOut
              announceOnMount
              title={result.success ? 'Success!' : 'Error'}
              color={result.success ? 'success' : 'danger'}
              iconType={result.success ? 'check' : 'warning'}
            >
              <p>{result.message}</p>
            </EuiCallOut>
          )}
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </KibanaRenderContextProvider>
  );
}

export const renderApp = (coreStart: CoreStart, element: AppMountParameters['element']) => {
  ReactDOM.render(<UserActivityExample coreStart={coreStart} />, element);
  return () => ReactDOM.unmountComponentAtNode(element);
};
