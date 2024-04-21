/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { AppMountParameters } from "@kbn/core-application-browser";
import { EuiPage, EuiPageBody, EuiPageHeader, EuiPageSection, EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { Overview } from './overview';

const App = () => {
  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageSection>
          <EuiPageHeader pageTitle="Render embeddables" />
        </EuiPageSection>
        <EuiPageTemplate.Section>
          <EuiPageSection>
            <Overview />

            <EuiSpacer />

          </EuiPageSection>
        </EuiPageTemplate.Section>
      </EuiPageBody>
    </EuiPage>
  );
};

export const renderApp = (element: AppMountParameters['element']) => {
  ReactDOM.render(<App />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};