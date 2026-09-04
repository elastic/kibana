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
import { EuiCallOut, EuiIcon, EuiPageTemplate, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { DATA_ROUTE } from '../common/constants';

interface DocData {
  message: string;
  greeting: string;
  initializedAt: string;
}

interface DemoAppProps {
  http: CoreStart['http'];
}

// Because the plugin's manifest sets `enableLazyInitialize`, core has already gated this app
// behind its own loading screen (`core.deferredInit`) until deferred init succeeded — by the
// time this component mounts, `DATA_ROUTE` is guaranteed to serve normally on the first hit.
const DemoApp: React.FC<DemoAppProps> = ({ http }) => {
  const [doc, setDoc] = useState<DocData | null>(null);

  useEffect(() => {
    http.get<DocData>(DATA_ROUTE).then(setDoc);
  }, [http]);

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header>
        <EuiText>
          <h1>
            <FormattedMessage
              id="deferredInitExample.app.pageTitle"
              defaultMessage="Deferred Init Example"
            />
          </h1>
        </EuiText>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section>
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="deferredInitExample.app.stepsTitle"
              defaultMessage="What lazy initialization did"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        {/* Hardcoded summary of the deferred-init phases that ran server-side. */}
        <EuiText size="s">
          <p>
            <EuiIcon type="check" color="success" aria-hidden={true} />{' '}
            <FormattedMessage
              id="deferredInitExample.app.step.migrations"
              defaultMessage="Ran saved object migrations"
            />
          </p>
          <p>
            <EuiIcon type="check" color="success" aria-hidden={true} />{' '}
            <FormattedMessage
              id="deferredInitExample.app.step.defaultState"
              defaultMessage="Initialized default state"
            />
          </p>
          <p>
            <EuiIcon type="check" color="success" aria-hidden={true} />{' '}
            <FormattedMessage
              id="deferredInitExample.app.step.dependency"
              defaultMessage="Loaded deferredInitExampleDependency's start contract via loadPluginContract"
            />
          </p>
          <p>
            <EuiIcon type="check" color="success" aria-hidden={true} />{' '}
            <FormattedMessage
              id="deferredInitExample.app.step.index"
              defaultMessage="Created the Elasticsearch index and mappings"
            />
          </p>
          <p>
            <EuiIcon type="check" color="success" aria-hidden={true} />{' '}
            <FormattedMessage
              id="deferredInitExample.app.step.document"
              defaultMessage="Wrote the default state document"
            />
          </p>
        </EuiText>
        <EuiSpacer />
        {doc !== null && (
          <EuiCallOut
            announceOnMount
            title={
              <FormattedMessage
                id="deferredInitExample.app.successTitle"
                defaultMessage="Initialization complete"
              />
            }
            color="success"
            iconType="check"
          >
            <EuiText>
              <p>
                <strong>
                  <FormattedMessage
                    id="deferredInitExample.app.docMessageLabel"
                    defaultMessage="Message:"
                  />
                </strong>{' '}
                {doc.message}
              </p>
              <p>
                <strong>
                  <FormattedMessage
                    id="deferredInitExample.app.docGreetingLabel"
                    defaultMessage="Greeting from deferredInitExampleDependency:"
                  />
                </strong>{' '}
                {doc.greeting}
              </p>
              <p>
                <strong>
                  <FormattedMessage
                    id="deferredInitExample.app.docInitializedAtLabel"
                    defaultMessage="Initialized at:"
                  />
                </strong>{' '}
                {doc.initializedAt}
              </p>
            </EuiText>
          </EuiCallOut>
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

export const renderApp = (coreStart: CoreStart, params: AppMountParameters): (() => void) => {
  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <DemoApp http={coreStart.http} />
    </KibanaRenderContextProvider>,
    params.element
  );
  return () => ReactDOM.unmountComponentAtNode(params.element);
};
