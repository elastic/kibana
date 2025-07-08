/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { BrowserRouter as Router } from '@kbn/shared-ux-router';
import { EuiPageTemplate, EuiTitle, EuiText } from '@elastic/eui';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

interface AppDeps {
  basename: string;
  navigation: NavigationPublicPluginStart;
}

export const App = ({ basename, navigation }: AppDeps) => {
  return (
    <Router basename={basename}>
      <navigation.ui.TopNavMenu
        appName="global_flyout_orchestrator_example"
        showSearchBar={true}
        useDefaultBehaviors={true}
      />
      <EuiPageTemplate restrictWidth="1000px">
        <EuiPageTemplate.Header>
          <EuiTitle size="l">
            <h1>Hello World</h1>
          </EuiTitle>
        </EuiPageTemplate.Header>
        <EuiPageTemplate.Section>
          <EuiTitle>
            <h2>Hello Title</h2>
          </EuiTitle>
          <EuiText>
            <p>Hello Text</p>
          </EuiText>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </Router>
  );
};
