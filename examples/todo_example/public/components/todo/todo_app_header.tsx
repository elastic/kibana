/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

export const TodoAppHeader = () => (
  <KibanaPageTemplate.Header paddingSize="xl">
    <EuiTitle
      children={
        <h1>
          <FormattedMessage defaultMessage="My Todo List" id="todoExample.app.pageTitle" />
        </h1>
      }
    />
  </KibanaPageTemplate.Header>
);
