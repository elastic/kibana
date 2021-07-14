/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPageTemplate } from '@elastic/eui';
import React, { FunctionComponent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EnrollmentTokenForm } from './enrollment_token_form';
import { ManualConfigurationForm } from './manual_configuration_form';
import { ProgressIndicator } from './progress_indicator';

export const App: FunctionComponent = () => {
  const [page, setPage] = useState<'token' | 'manual' | 'success'>('token');
  return (
    <EuiPageTemplate
      template="centeredBody"
      pageHeader={{
        iconType: 'logoElastic',
        pageTitle: i18n.translate('interactiveSetup.app.pageTitle', {
          defaultMessage: 'Configure Elastic to get started',
        }),
      }}
    >
      <div hidden={page !== 'token'}>
        <EnrollmentTokenForm
          onCancel={() => setPage('manual')}
          onSuccess={() => setPage('success')}
        />
      </div>
      <div hidden={page !== 'manual'}>
        <ManualConfigurationForm
          onCancel={() => setPage('token')}
          onSuccess={() => setPage('success')}
        />
      </div>
      {page === 'success' && <ProgressIndicator />}
    </EuiPageTemplate>
  );
};
