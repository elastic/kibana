/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import type { FC } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { ContentPreviewSection } from './components';

export const App: FC = () => {
  return (
    <KibanaPageTemplate panelled>
      <KibanaPageTemplate.Header
        pageTitle="Content management POC"
        description=""
        rightSideItems={[<button>Todo</button>]}
      />
      <KibanaPageTemplate.Section>
        <EuiTitle>
          <h2>Search</h2>
        </EuiTitle>
        <EuiSpacer size="xl" />

        <ContentPreviewSection />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
