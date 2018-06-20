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

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiCard,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';

import {
  installSampleDataSet,
  uninstallSampleDataSet
} from '../sample_data_sets';

export class SampleDataSetCard extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      isProcessingRequest: false,
    };
  }

  startRequest = async () => {
    const {
      getConfig,
      setConfig,
      id,
      name,
      onRequestComplete,
      defaultIndex,
      clearIndexPatternsCache,
    } = this.props;

    this.setState({
      isProcessingRequest: true,
    });

    if (this.isInstalled()) {
      await uninstallSampleDataSet(id, name, defaultIndex, getConfig, setConfig, clearIndexPatternsCache);
    } else {
      await installSampleDataSet(id, name, defaultIndex, getConfig, setConfig, clearIndexPatternsCache);
    }

    onRequestComplete();

    this.setState({
      isProcessingRequest: false,
    });
  }

  isInstalled = () => {
    if (this.props.status === 'installed') {
      return true;
    }

    return false;
  }

  renderBtn = () => {
    switch (this.props.status) {
      case 'installed':
        return (
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                isLoading={this.state.isProcessingRequest}
                onClick={this.startRequest}
                color="danger"
                data-test-subj={`removeSampleDataSet${this.props.id}`}
              >
                {this.state.isProcessingRequest ? 'Removing' : 'Remove'}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                href={this.props.launchUrl}
                data-test-subj={`launchSampleDataSet${this.props.id}`}
              >
                View data
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        );

      case 'not_installed':
        return (
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                isLoading={this.state.isProcessingRequest}
                onClick={this.startRequest}
                data-test-subj={`addSampleDataSet${this.props.id}`}
              >
                {this.state.isProcessingRequest ? 'Adding' : 'Add'}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        );

      default: {
        return (
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="top"
                content={<p>{`Unable to verify dataset status, error: ${this.props.statusMsg}`}</p>}
              >
                <EuiButton
                  isDisabled
                  data-test-subj={`addSampleDataSet${this.props.id}`}
                >
                  {'Add'}
                </EuiButton>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }
    }
  }

  render() {
    return (
      <EuiCard
        image={this.props.previewUrl}
        title={this.props.name}
        description={this.props.description}
        betaBadgeLabel={this.isInstalled() ? 'INSTALLED' : null}
        footer={this.renderBtn()}
        data-test-subj={`sampleDataSetCard${this.props.id}`}
      />
    );
  }
}

SampleDataSetCard.propTypes = {
  id: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  launchUrl: PropTypes.string.isRequired,
  status: PropTypes.oneOf([
    'installed',
    'not_installed',
    'unknown',
  ]).isRequired,
  statusMsg: PropTypes.string,
  onRequestComplete: PropTypes.func.isRequired,
  getConfig: PropTypes.func.isRequired,
  setConfig: PropTypes.func.isRequired,
  clearIndexPatternsCache: PropTypes.func.isRequired,
  defaultIndex: PropTypes.string.isRequired,
  previewUrl: PropTypes.string.isRequired,
};
