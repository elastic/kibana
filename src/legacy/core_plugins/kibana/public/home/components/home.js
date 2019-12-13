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
import PropTypes from 'prop-types';
import { Synopsis } from './synopsis';
import { AddData } from './add_data';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiPage,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlexGrid,
  EuiText,
  EuiPageBody,
  EuiScreenReaderOnly,
} from '@elastic/eui';

import { Welcome } from './welcome';
import { FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';
import { getServices } from '../kibana_services';

const KEY_ENABLE_WELCOME = 'home:welcome:show';

export class Home extends Component {
  constructor(props) {
    super(props);

    const isWelcomeEnabled = !(
      getServices().getInjected('disableWelcomeScreen') ||
      props.localStorage.getItem(KEY_ENABLE_WELCOME) === 'false'
    );
    const currentOptInStatus = getServices().getInjected('telemetryOptedIn');
    this.state = {
      // If welcome is enabled, we wait for loading to complete
      // before rendering. This prevents an annoying flickering
      // effect where home renders, and then a few ms after, the
      // welcome screen fades in.
      isLoading: isWelcomeEnabled,
      isNewKibanaInstance: false,
      isWelcomeEnabled,
      currentOptInStatus
    };
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this.fetchIsNewKibanaInstance();
  }

  fetchIsNewKibanaInstance = async () => {
    try {
      // Set a max-time on this query so we don't hang the page too long...
      // Worst case, we don't show the welcome screen when we should.
      setTimeout(() => {
        if (this.state.isLoading) {
          this.setState({ isWelcomeEnabled: false });
        }
      }, 500);

      const resp = await this.props.find({
        type: 'index-pattern',
        fields: ['title'],
        search: `*`,
        search_fields: ['title'],
        perPage: 1,
      });

      this.endLoading({ isNewKibanaInstance: resp.total === 0 });
    } catch (err) {
      // An error here is relatively unimportant, as it only means we don't provide
      // some UI niceties.
      this.endLoading();
    }
  };

  endLoading = (state = {}) => {
    if (this._isMounted) {
      this.setState({
        ...state,
        isLoading: false,
      });
    }
  };

  skipWelcome = () => {
    this.props.localStorage.setItem(KEY_ENABLE_WELCOME, 'false');
    this._isMounted && this.setState({ isWelcomeEnabled: false });
  };

  renderDirectories = category => {
    const { addBasePath, directories } = this.props;
    return directories
      .filter(directory => {
        return directory.showOnHomePage && directory.category === category;
      })
      .map(directory => {
        return (
          <EuiFlexItem className="homHome__synopsisItem" key={directory.id}>
            <Synopsis
              description={directory.description}
              iconType={directory.icon}
              title={directory.title}
              url={addBasePath(directory.path)}
            />
          </EuiFlexItem>
        );
      });
  };

  renderNormal() {
    const { apmUiEnabled, mlEnabled } = this.props;

    return (
      <EuiPage restrictWidth={1200} data-test-subj="homeApp">
        <EuiPageBody className="eui-displayBlock">

          <EuiScreenReaderOnly>
            <h1>
              <FormattedMessage
                id="kbn.home.welcomeHomePageHeader"
                defaultMessage="Kibana home"
              />
            </h1>
          </EuiScreenReaderOnly>

          <AddData
            apmUiEnabled={apmUiEnabled}
            mlEnabled={mlEnabled}
            isNewKibanaInstance={this.state.isNewKibanaInstance}
          />

          <EuiSpacer size="l" />

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiPanel paddingSize="l">
                <EuiTitle size="s">
                  <h2>
                    <FormattedMessage
                      id="kbn.home.directories.visualize.nameTitle"
                      defaultMessage="Visualize and Explore Data"
                    />
                  </h2>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiFlexGrid columns={2} gutterSize="s">
                  {this.renderDirectories(FeatureCatalogueCategory.DATA)}
                </EuiFlexGrid>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel paddingSize="l">
                <EuiTitle size="s">
                  <h2>
                    <FormattedMessage
                      id="kbn.home.directories.manage.nameTitle"
                      defaultMessage="Manage and Administer the Elastic Stack"
                    />
                  </h2>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiFlexGrid columns={2}>
                  {this.renderDirectories(FeatureCatalogueCategory.ADMIN)}
                </EuiFlexGrid>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false} className="eui-textCenter">
              <EuiText size="s" color="subdued">
                <p>
                  <FormattedMessage
                    id="kbn.home.directories.notFound.description"
                    defaultMessage="Didn’t find what you were looking for?"
                  />
                </p>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiButton href="#/home/feature_directory">
                <FormattedMessage
                  id="kbn.home.directories.notFound.viewFullButtonLabel"
                  defaultMessage="View full directory of Kibana plugins"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageBody>
      </EuiPage>
    );
  }

  // For now, loading is just an empty page, as we'll show something
  // in 250ms, no matter what, and a blank page prevents an odd flicker effect.
  renderLoading() {
    return '';
  }

  renderWelcome() {
    return (
      <Welcome
        onSkip={this.skipWelcome}
        urlBasePath={this.props.urlBasePath}
        onOptInSeen={this.props.onOptInSeen}
        currentOptInStatus={this.state.currentOptInStatus}
      />
    );
  }

  render() {
    const { isLoading, isWelcomeEnabled, isNewKibanaInstance } = this.state;

    if (isWelcomeEnabled) {
      if (isLoading) {
        return this.renderLoading();
      }
      if (isNewKibanaInstance) {
        return this.renderWelcome();
      }
    }

    return this.renderNormal();
  }
}

Home.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  directories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
      showOnHomePage: PropTypes.bool.isRequired,
      category: PropTypes.string.isRequired,
    })
  ),
  apmUiEnabled: PropTypes.bool.isRequired,
  find: PropTypes.func.isRequired,
  localStorage: PropTypes.object.isRequired,
  urlBasePath: PropTypes.string.isRequired,
  mlEnabled: PropTypes.bool.isRequired,
  onOptInSeen: PropTypes.func.isRequired,
};
