/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';
import {
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { HttpSetup } from '../../http';
import { NotificationsSetup } from '../../notifications';
import { loadStatus, ProcessedServerResponse } from './lib';
import { MetricTiles, StatusTable, ServerStatus } from './components';

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

    // Extract the items needed to render each component
    const { metrics, statuses, serverState, name, version } = data!;
    const { build_hash: buildHash, build_number: buildNumber } = version;

    return (
      <EuiPage className="stsPage" data-test-subj="statusPageRoot">
        <EuiPageBody restrictWidth>
          <ServerStatus name={name} serverState={serverState} />

          <EuiSpacer />

          <MetricTiles metrics={metrics} />

          <EuiSpacer />

          <EuiPageContent grow={false}>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h2>
                    <FormattedMessage
                      id="core.statusPage.statusApp.statusTitle"
                      defaultMessage="Plugin status"
                    />
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <p data-test-subj="statusBuildNumber">
                        <FormattedMessage
                          id="core.statusPage.statusApp.statusActions.buildText"
                          defaultMessage="BUILD {buildNum}"
                          values={{
                            buildNum: <strong>{buildNumber}</strong>,
                          }}
                        />
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <p data-test-subj="statusBuildHash">
                        <FormattedMessage
                          id="core.statusPage.statusApp.statusActions.commitText"
                          defaultMessage="COMMIT {buildSha}"
                          values={{
                            buildSha: <strong>{buildHash}</strong>,
                          }}
                        />
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer />

            <StatusTable statuses={statuses} />
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
