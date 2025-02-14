/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { EuiPage, EuiPageBody, EuiPageSection, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { EuiProvider } from '@elastic/eui';
import { EsqlInspector } from './components/esql_inspector';

export const App = () => {
  return (
    <EuiProvider>
      <EuiPage>
        <EuiPageBody style={{ maxWidth: 1200, margin: '0 auto' }}>
          <EuiPageHeader paddingSize="s" bottomBorder={true} pageTitle="ES|QL AST Inspector" />
          <EuiPageSection paddingSize="s">
            <p>This app gives you the AST for a particular ES|QL query.</p>
            <EuiSpacer />
            <EsqlInspector />
          </EuiPageSection>
        </EuiPageBody>
      </EuiPage>
    </EuiProvider>
  );
};
