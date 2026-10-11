/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { EuiDescriptionList, EuiPageTemplate, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { DOC_ROUTE, STATUS_ROUTE } from '../common';
import type { InitStatusBody, PluginInitializeExampleDoc } from '../common';

interface AppProps {
  http: CoreStart['http'];
}

// Core mounts this only once the server plugin's initialize() has succeeded on the instance that
// served the page, so both gated routes below answer 200 on the first try.
const App: React.FC<AppProps> = ({ http }) => {
  const [doc, setDoc] = useState<PluginInitializeExampleDoc | null>(null);
  const [status, setStatus] = useState<InitStatusBody | null>(null);

  useEffect(() => {
    http.get<PluginInitializeExampleDoc>(DOC_ROUTE).then(setDoc);
    http.get<InitStatusBody>(STATUS_ROUTE).then(setStatus);
  }, [http]);

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header
        pageTitle={
          <FormattedMessage
            id="pluginInitializeExample.app.pageTitle"
            defaultMessage="Plugin initialize() example"
          />
        }
      />
      <EuiPageTemplate.Section>
        <EuiText>
          <p>
            <FormattedMessage
              id="pluginInitializeExample.app.description"
              defaultMessage="This app mounted because initialize() has succeeded on the Kibana instance serving it. Everything below comes from routes core gated until then."
            />
          </p>
        </EuiText>
        <EuiSpacer />
        {doc && (
          <EuiDescriptionList
            type="column"
            listItems={[
              {
                title: (
                  <FormattedMessage
                    id="pluginInitializeExample.app.docInstanceUuid"
                    defaultMessage="Document last written by instance"
                  />
                ),
                description: doc.instanceUuid,
              },
              {
                title: (
                  <FormattedMessage
                    id="pluginInitializeExample.app.docInitializedAt"
                    defaultMessage="Written at"
                  />
                ),
                description: doc.initializedAt,
              },
              {
                title: (
                  <FormattedMessage
                    id="pluginInitializeExample.app.docAttempt"
                    defaultMessage="Succeeded on attempt"
                  />
                ),
                description: String(doc.attempt),
              },
            ]}
          />
        )}
        {status && (
          <>
            <EuiSpacer />
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="pluginInitializeExample.app.status"
                  defaultMessage="initialize() status on this instance: {state}, {attempts, plural, one {# failed attempt} other {# failed attempts}} before it succeeded."
                  values={{ state: <code>{status.state}</code>, attempts: status.attempts }}
                />
              </p>
            </EuiText>
          </>
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

export const renderApp = (coreStart: CoreStart, { element }: AppMountParameters): (() => void) => {
  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <App http={coreStart.http} />
    </KibanaRenderContextProvider>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
