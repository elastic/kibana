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

export const INSTALLED_STATUS = 'installed';
export const UNINSTALLED_STATUS = 'not_installed';

import { FormattedMessage } from '@kbn/i18n/react';

export class SampleDataSetCard extends React.Component {

  isInstalled = () => {
    if (this.props.status === INSTALLED_STATUS) {
      return true;
    }

    return false;
  }

  install = () => {
    this.props.onInstall(this.props.id);
  }

  uninstall = () => {
    this.props.onUninstall(this.props.id);
  }

  renderBtn = () => {
    switch (this.props.status) {
      case INSTALLED_STATUS:
        return (
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                isLoading={this.props.isProcessing}
                onClick={this.uninstall}
                color="danger"
                data-test-subj={`removeSampleDataSet${this.props.id}`}
              >
                {this.props.isProcessing
                  ? <FormattedMessage
                    id="kbn.home.sampleDataSetCard.removingButtonLabel"
                    defaultMessage="Removing"
                  />
                  : <FormattedMessage
                    id="kbn.home.sampleDataSetCard.removeButtonLabel"
                    defaultMessage="Remove"
                  />}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                href={this.props.launchUrl}
                data-test-subj={`launchSampleDataSet${this.props.id}`}
              >
                <FormattedMessage
                  id="kbn.home.sampleDataSetCard.viewDataButtonLabel"
                  defaultMessage="View data"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        );

      case UNINSTALLED_STATUS:
        return (
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                isLoading={this.props.isProcessing}
                onClick={this.install}
                data-test-subj={`addSampleDataSet${this.props.id}`}
              >
                {this.props.isProcessing
                  ? <FormattedMessage
                    id="kbn.home.sampleDataSetCard.addingButtonLabel"
                    defaultMessage="Adding"
                  />
                  : <FormattedMessage
                    id="kbn.home.sampleDataSetCard.addButtonLabel"
                    defaultMessage="Add"
                  />
                }
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
                content={
                  <p>
                    <FormattedMessage
                      id="kbn.home.sampleDataSetCard.default.unableToVerifyErrorMessage"
                      defaultMessage="Unable to verify dataset status, error: {statusMsg}"
                      values={{ statusMsg: this.props.statusMsg }}
                    />
                  </p>
                }
              >
                <EuiButton
                  isDisabled
                  data-test-subj={`addSampleDataSet${this.props.id}`}
                >
                  <FormattedMessage
                    id="kbn.home.sampleDataSetCard.default.addButtonLabel"
                    defaultMessage="Add"
                  />
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
        className="homSampleDataSetCard"
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
    INSTALLED_STATUS,
    UNINSTALLED_STATUS,
    'unknown',
  ]).isRequired,
  isProcessing: PropTypes.bool.isRequired,
  statusMsg: PropTypes.string,
  previewUrl: PropTypes.string.isRequired,
  onInstall: PropTypes.func.isRequired,
  onUninstall: PropTypes.func.isRequired,
};
