/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPageTemplate, EuiPanel, EuiText } from '@elastic/eui';
import React from 'react';

export const App = () => {
  return (
    <EuiPageTemplate
      restrictWidth={false}
      template="empty"
      pageHeader={{
        iconType: 'logoElastic',
        pageTitle: 'Welcome to Elastic',
      }}
    >
      <EuiPanel>
        <EuiText>Kibana server is not ready yet.</EuiText>
      </EuiPanel>
    </EuiPageTemplate>
  );
};
