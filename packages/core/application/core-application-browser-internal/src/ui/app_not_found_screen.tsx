/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPageTemplate } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export const AppNotFound = () => (
  <EuiPageTemplate data-test-subj="appNotFoundPageContent">
    <EuiPageTemplate.EmptyPrompt
      iconType="warning"
      iconColor="danger"
      title={
        <h2>
          <FormattedMessage
            id="core.application.appNotFound.title"
            defaultMessage="Application Not Found"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="core.application.appNotFound.pageDescription"
            defaultMessage="No application was found at this URL. Try going back or choosing an app from the menu."
          />
        </p>
      }
    />
  </EuiPageTemplate>
);
