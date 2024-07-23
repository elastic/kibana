/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiButton, EuiProvider } from '@elastic/eui';

import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

const useErrors = () => {
  return useState(false);
};

export const FatalComponent = () => {
  const [hasError, setHasError] = useErrors();

  if (hasError) {
    const fatalError = new Error('Example of unknown error type');
    throw fatalError;
  }

  return (
    <EuiButton
      onClick={() => {
        setHasError(true);
      }}
      data-test-subj="fatalErrorBtn"
    >
      Click for fatal error
    </EuiButton>
  );
};

export const RecoverableComponent = () => {
  const [hasError, setHasError] = useErrors();

  if (hasError) {
    // FIXME: use network interception to disable responses
    // for chunk requests and attempt to lazy-load a component
    // https://github.com/elastic/kibana/issues/170777
    const upgradeError = new Error('ChunkLoadError');
    upgradeError.name = 'ChunkLoadError';
    throw upgradeError;
  }

  return (
    <EuiButton
      onClick={() => {
        setHasError(true);
      }}
      data-test-subj="recoverableErrorBtn"
    >
      Click for recoverable error
    </EuiButton>
  );
};

export class ErrorBoundaryExamplePlugin implements Plugin<void, void, SetupDeps> {
  public setup(core: CoreSetup, deps: SetupDeps) {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'errorBoundaryExample',
      title: 'Error Boundary Example',
      async mount({ element }: AppMountParameters) {
        // Using the "EuiProvider" here rather than KibanaRenderContextProvider, because KibanaRenderContextProvider
        // wraps KibanaErrorBoundaryProvider and KibanaErrorBoundary and we want to test it directly, not a wrapper.
        ReactDOM.render(
          <EuiProvider>
            <KibanaErrorBoundaryProvider analytics={core.analytics}>
              <KibanaErrorBoundary>
                <KibanaPageTemplate>
                  <KibanaPageTemplate.Header
                    pageTitle="KibanaErrorBoundary example"
                    data-test-subj="errorBoundaryExampleHeader"
                  />
                  <KibanaPageTemplate.Section grow={false}>
                    <FatalComponent />
                  </KibanaPageTemplate.Section>
                  <KibanaPageTemplate.Section>
                    <RecoverableComponent />
                  </KibanaPageTemplate.Section>
                </KibanaPageTemplate>
              </KibanaErrorBoundary>
            </KibanaErrorBoundaryProvider>
          </EuiProvider>,
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    // This section is only needed to get this example plugin to show up in our Developer Examples.
    deps.developerExamples.register({
      appId: 'errorBoundaryExample',
      title: 'Error Boundary Example Application',
      description: `Build a plugin that registers an application that simply says "Error Boundary Example"`,
    });
  }
  public start(_core: CoreStart) {
    return {};
  }
  public stop() {}
}
