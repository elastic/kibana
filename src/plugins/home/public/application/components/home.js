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
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FeatureCatalogueCategory } from '../../services';
import { getServices } from '../kibana_services';
import { AddData } from './add_data';
import { createAppNavigationHandler } from './app_navigation_handler';
import { ManageData } from './manage_data';
import { SolutionsSection } from './solutions_section';
import { Welcome } from './welcome';

const KEY_ENABLE_WELCOME = 'home:welcome:show';

export class Home extends Component {
  constructor(props) {
    super(props);

    const isWelcomeEnabled = !(
      getServices().homeConfig.disableWelcomeScreen ||
      props.localStorage.getItem(KEY_ENABLE_WELCOME) === 'false'
    );

    const body = document.querySelector('body');
    body.classList.add('isHomPage');

    this.state = {
      // If welcome is enabled, we wait for loading to complete
      // before rendering. This prevents an annoying flickering
      // effect where home renders, and then a few ms after, the
      // welcome screen fades in.
      isLoading: isWelcomeEnabled,
      isNewKibanaInstance: false,
      isWelcomeEnabled,
    };
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this.fetchIsNewKibanaInstance();

    const homeTitle = i18n.translate('home.breadcrumbs.homeTitle', { defaultMessage: 'Home' });
    getServices().chrome.setBreadcrumbs([{ text: homeTitle }]);
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

  findDirectoryById = (id) => this.props.directories.find((directory) => directory.id === id);

  getFeaturesByCategory = (category) =>
    this.props.directories
      .filter((directory) => directory.showOnHomePage && directory.category === category)
      .sort((directoryA, directoryB) => directoryA.order - directoryB.order);

  renderNormal() {
    const { addBasePath, solutions } = this.props;

    const devTools = this.findDirectoryById('console');
    const stackManagement = this.findDirectoryById('stack-management');
    const advancedSettings = this.findDirectoryById('advanced_settings');

    const addDataFeatures = this.getFeaturesByCategory(FeatureCatalogueCategory.DATA);
    const manageDataFeatures = this.getFeaturesByCategory(FeatureCatalogueCategory.ADMIN);

    // Show card for console if none of the manage data plugins are available, most likely in OSS
    if (manageDataFeatures.length < 1 && devTools) {
      manageDataFeatures.push(devTools);
    }

    return (
      <main aria-labelledby="homHeader__title" className="homWrapper" data-test-subj="homeApp">
        <header
          className={`homHeader ${
            solutions.length ? 'homHeader--hasSolutions' : 'homHeader--noSolutions'
          }`}
        >
          <div className="homHeader__inner">
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiTitle size="m">
                  <h1 id="homHeader__title">
                    <FormattedMessage id="home.pageHeader.title" defaultMessage="Home" />
                  </h1>
                </EuiTitle>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiFlexGroup className="homHeader__actions">
                  <EuiFlexItem className="homHeader__actionItem">
                    <EuiButtonEmpty href="#/tutorial_directory" iconType="indexOpen">
                      {i18n.translate('home.pageHeader.addDataButtonLabel', {
                        defaultMessage: 'Add data',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>

                  {stackManagement ? (
                    <EuiFlexItem className="homHeader__actionItem">
                      <EuiButtonEmpty
                        onClick={createAppNavigationHandler(stackManagement.path)}
                        iconType="gear"
                      >
                        {i18n.translate('home.pageHeader.stackManagementButtonLabel', {
                          defaultMessage: 'Manage',
                        })}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  ) : null}

                  {devTools ? (
                    <EuiFlexItem className="homHeader__actionItem">
                      <EuiButtonEmpty
                        onClick={createAppNavigationHandler(devTools.path)}
                        iconType="wrench"
                      >
                        {i18n.translate('home.pageHeader.devToolsButtonLabel', {
                          defaultMessage: 'Dev tools',
                        })}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </header>

        <div className="homContent">
          {solutions.length && <SolutionsSection addBasePath={addBasePath} solutions={solutions} />}

          <EuiFlexGroup
            className={`homData ${
              addDataFeatures.length === 1 && manageDataFeatures.length === 1
                ? 'homData--compressed'
                : 'homData--expanded'
            }`}
          >
            <EuiFlexItem>
              <AddData addBasePath={addBasePath} features={addDataFeatures} />
            </EuiFlexItem>

            <EuiFlexItem>
              <ManageData addBasePath={addBasePath} features={manageDataFeatures} />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiHorizontalRule margin="xl" aria-hidden="true" />

          <footer className="homFooter">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                {advancedSettings && (
                  <EuiButtonEmpty
                    iconType="home"
                    onClick={createAppNavigationHandler(
                      '/app/management/kibana/settings#defaultRoute'
                    )}
                    size="xs"
                  >
                    <FormattedMessage
                      id="home.changeHomeRouteLink"
                      defaultMessage="Display a different page on log in"
                    />
                  </EuiButtonEmpty>
                )}
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="allPlugins"
                  href="#/feature_directory"
                  size="xs"
                  flush="right"
                  iconType="apps"
                >
                  <FormattedMessage
                    id="home.appDirectory.appDirectoryButtonLabel"
                    defaultMessage="View app directory"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </footer>
        </div>
      </main>
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
        telemetry={this.props.telemetry}
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
      order: PropTypes.number,
    })
  ),
  solutions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      subtitle: PropTypes.string.isRequired,
      descriptions: PropTypes.arrayOf(PropTypes.string).isRequired,
      icon: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
      order: PropTypes.number,
    })
  ),
  find: PropTypes.func.isRequired,
  localStorage: PropTypes.object.isRequired,
  urlBasePath: PropTypes.string.isRequired,
  telemetry: PropTypes.shape({
    telemetryService: PropTypes.any,
    telemetryNotifications: PropTypes.any,
  }),
};
