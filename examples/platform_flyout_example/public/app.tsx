/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPageHeader, EuiPageSection, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { GreyboxExample } from './examples/greybox_example';
import { StartDeps } from './plugin';
import { ObservabilityExample } from './examples/observability_example';
import { SecurityExample } from './examples/security_example';

const tabs = ['greybox', 'observability', 'security'] as const;

const App = ({
  core,
  deps,
  mountParams,
}: {
  core: CoreStart;
  deps: StartDeps;
  mountParams: AppMountParameters;
}) => {
  const [selectedTab, setSelectedTab] = useState<(typeof tabs)[number]>('security');

  const tabContent = useMemo(() => {
    switch (selectedTab) {
      case 'greybox':
        return <GreyboxExample />;
      case 'observability':
        return <ObservabilityExample />;
      case 'security':
        return <SecurityExample />;
    }
  }, [selectedTab]);

  return (
    <KibanaRenderContextProvider {...core}>
      <EuiPageHeader
        paddingSize="l"
        restrictWidth={true}
        bottomBorder="extended"
        pageTitle="Journey flyouts"
        description="This example app demonstrates how to use the Journey Flyouts API for flyout-to-flyout interactions, and for showing detail content side by side with main content."
      />
      <EuiPageSection restrictWidth={false} alignment={'top'} color={'plain'} grow={true}>
        <EuiTabs>
          <EuiTab onClick={() => setSelectedTab('greybox')} isSelected={selectedTab === 'greybox'}>
            Greybox example
          </EuiTab>
          <EuiTab
            onClick={() => setSelectedTab('observability')}
            isSelected={selectedTab === 'observability'}
          >
            Observability POC
          </EuiTab>
          <EuiTab
            onClick={() => setSelectedTab('security')}
            isSelected={selectedTab === 'security'}
          >
            Security POC
          </EuiTab>
        </EuiTabs>
        <EuiSpacer />

        {tabContent}
      </EuiPageSection>
    </KibanaRenderContextProvider>
  );
};

export const renderApp = (core: CoreStart, deps: StartDeps, mountParams: AppMountParameters) => {
  ReactDOM.render(<App core={core} deps={deps} mountParams={mountParams} />, mountParams.element);

  return () => ReactDOM.unmountComponentAtNode(mountParams.element);
};
