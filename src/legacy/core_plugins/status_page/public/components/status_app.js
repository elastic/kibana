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

import loadStatus from '../lib/load_status';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
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

import MetricTiles from './metric_tiles';
import StatusTable from './status_table';
import ServerStatus from './server_status';

class StatusApp extends Component {
  static propTypes = {
    buildNum: PropTypes.number.isRequired,
    buildSha: PropTypes.string.isRequired,
  };

  constructor() {
    super();
    this.state = {
      loading: true,
      fetchError: false,
      data: null,
    };
  }

  componentDidMount = async function() {
    const data = await loadStatus();

    if (data) {
      this.setState({ loading: false, data: data });
    } else {
      this.setState({ fetchError: true, loading: false });
    }
  };

  render() {
    const { buildNum, buildSha } = this.props;
    const { loading, fetchError, data } = this.state;

    // If we're still loading, return early with a spinner
    if (loading) {
      return <EuiLoadingSpinner size="l" />;
    }

    if (fetchError) {
      return (
        <EuiText color="danger">
          <FormattedMessage
            id="statusPage.statusApp.loadingErrorText"
            defaultMessage="An error occurred loading the status"
          />
        </EuiText>
      );
    }

    // Extract the items needed to render each component
    const { metrics, statuses, serverState, name } = data;

    return (
      <EuiPage className="stsPage">
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
                      id="statusPage.statusApp.statusTitle"
                      defaultMessage="Plugin status"
                    />
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <p>
                        <FormattedMessage
                          id="statusPage.statusApp.statusActions.buildText"
                          defaultMessage="BUILD {buildNum}"
                          values={{
                            buildNum: <strong>{buildNum}</strong>,
                          }}
                        />
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <p>
                        <FormattedMessage
                          id="statusPage.statusApp.statusActions.commitText"
                          defaultMessage="COMMIT {buildSha}"
                          values={{
                            buildSha: <strong>{buildSha}</strong>,
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

export default StatusApp;
