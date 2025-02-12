/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPageHeader, EuiPageSection } from '@elastic/eui';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import React from 'react';
import ReactDOM from 'react-dom';
import { JourneyFlyoutExample } from './journey_flyout_example';
import { StartDeps } from './plugin';

const App = ({
  core,
  deps,
  mountParams,
}: {
  core: CoreStart;
  deps: StartDeps;
  mountParams: AppMountParameters;
}) => {
  return (
    <KibanaRenderContextProvider {...core}>
      <EuiPageHeader
        paddingSize="l"
        restrictWidth={true}
        bottomBorder="extended"
        pageTitle="Journey flyout example"
        description="In progress..."
      />
      <EuiPageSection restrictWidth={true} alignment={'top'} color={'plain'} grow={true}>
        <JourneyFlyoutExample />
      </EuiPageSection>
    </KibanaRenderContextProvider>
  );
};

export const renderApp = (core: CoreStart, deps: StartDeps, mountParams: AppMountParameters) => {
  ReactDOM.render(<App core={core} deps={deps} mountParams={mountParams} />, mountParams.element);

  return () => ReactDOM.unmountComponentAtNode(mountParams.element);
};
