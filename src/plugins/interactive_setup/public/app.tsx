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

import { ClusterAddressForm } from './cluster_address_form';
import type { ClusterConfigurationFormProps } from './cluster_configuration_form';
import { ClusterConfigurationForm } from './cluster_configuration_form';
import { EnrollmentTokenForm } from './enrollment_token_form';
import { ProgressIndicator } from './progress_indicator';

export const App: FunctionComponent = () => {
  const [page, setPage] = useState<'token' | 'manual' | 'success'>('token');
  const [cluster, setCluster] = useState<
    Omit<ClusterConfigurationFormProps, 'onCancel' | 'onSuccess'>
  >();

  return (
    <div className="interactiveSetup">
      <header className="interactiveSetup__header eui-textCenter">
        <EuiSpacer size="xxl" />
        <span className="interactiveSetup__logo">
          <EuiIcon type="logoElastic" size="xxl" />
        </span>
        <EuiTitle size="m">
          <h1>
            <FormattedMessage
              id="interactiveSetup.app.pageTitle"
              defaultMessage="Configure Elastic to get started"
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="xl" />
      </header>
      <div className="interactiveSetup__content">
        <EuiPanel paddingSize="l">
          <div hidden={page !== 'token'}>
            <EnrollmentTokenForm
              onCancel={() => setPage('manual')}
              onSuccess={() => setPage('success')}
            />
          </div>
          <div hidden={page !== 'manual'}>
            {cluster ? (
              <ClusterConfigurationForm
                onCancel={() => setCluster(undefined)}
                onSuccess={() => setPage('success')}
                {...cluster}
              />
            ) : (
              <ClusterAddressForm
                onCancel={() => setPage('token')}
                onSuccess={(result, values) =>
                  setCluster({
                    host: values.host,
                    authRequired: result.authRequired,
                    certificateChain: result.certificateChain,
                  })
                }
              />
            )}
          </div>
          {page === 'success' && (
            <ProgressIndicator onSuccess={() => window.location.replace(window.location.href)} />
          )}
        </EuiPanel>
      </div>
    </div>
  );
};
