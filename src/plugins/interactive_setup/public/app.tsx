/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './app.scss';

import { EuiIcon, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { useState } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

import { EnrollmentTokenForm } from './enrollment_token_form';
import { ManualConfigurationForm } from './manual_configuration_form';
import { ProgressIndicator } from './progress_indicator';

export const App: FunctionComponent = () => {
  const [page, setPage] = useState<'token' | 'manual' | 'success'>('token');

  return (
    <div className="interactiveSetup login-form">
      <header className="interactiveSetup__header">
        <div className="interactiveSetup__content eui-textCenter">
          <EuiSpacer size="xxl" />
          <span className="interactiveSetup__logo">
            <EuiIcon type="logoElastic" size="xxl" />
          </span>
          <EuiTitle size="m" className="interactiveSetup__title">
            <h1>
              <FormattedMessage
                id="interactiveSetup.app.pageTitle"
                defaultMessage="Configure Elastic to get started"
              />
            </h1>
          </EuiTitle>
          <EuiSpacer size="xl" />
        </div>
      </header>
      <div className="interactiveSetup__content interactiveSetup-body">
        <EuiPanel paddingSize="l">
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
          {page === 'success' && (
            <ProgressIndicator onSuccess={() => window.location.replace('/')} />
          )}
        </EuiPanel>
      </div>
    </div>
  );
};
