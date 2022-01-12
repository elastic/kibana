/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { EuiLoadingSpinner, EuiText, EuiPage, EuiPageBody, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { HttpSetup } from '../../http';
import { NotificationsSetup } from '../../notifications';
import { loadStatus, ProcessedServerResponse } from './lib';
import { MetricTiles, ServerStatus, StatusSection, VersionHeader } from './components';

interface StatusAppProps {
  http: HttpSetup;
  notifications: NotificationsSetup;
}

interface StatusAppState {
  loading: boolean;
  fetchError: boolean;
  data: ProcessedServerResponse | null;
}

export class StatusApp extends Component<StatusAppProps, StatusAppState> {
  constructor(props: StatusAppProps) {
    super(props);
    this.state = {
      loading: true,
      fetchError: false,
      data: null,
    };
  }

  async componentDidMount() {
    const { http, notifications } = this.props;
    try {
      const data = await loadStatus({ http, notifications });
      this.setState({ loading: false, fetchError: false, data });
    } catch (e) {
      this.setState({ fetchError: true, loading: false, data: null });
    }
  }

  render() {
    const { loading, fetchError, data } = this.state;

    // If we're still loading, return early with a spinner
    if (loading) {
      return <EuiLoadingSpinner size="l" />;
    }

    if (fetchError) {
      return (
        <EuiText color="danger">
          <FormattedMessage
            id="core.statusPage.statusApp.loadingErrorText"
            defaultMessage="An error occurred loading the status"
          />
        </EuiText>
      );
    }

    const { metrics, coreStatus, pluginStatus, serverState, name, version } = data!;

    return (
      <EuiPage className="stsPage" data-test-subj="statusPageRoot">
        <EuiPageBody restrictWidth>
          <ServerStatus name={name} serverState={serverState} />
          <EuiSpacer />

          <VersionHeader version={version} />
          <EuiSpacer />

          <MetricTiles metrics={metrics} />
          <EuiSpacer />

          <StatusSection
            id="core"
            title={i18n.translate('core.statusPage.coreStatus.sectionTitle', {
              defaultMessage: 'Core status',
            })}
            statuses={coreStatus}
          />
          <EuiSpacer />

          <StatusSection
            id="plugins"
            title={i18n.translate('core.statusPage.statusApp.statusTitle', {
              defaultMessage: 'Plugin status',
            })}
            statuses={pluginStatus}
          />
        </EuiPageBody>
      </EuiPage>
    );
  }
}
