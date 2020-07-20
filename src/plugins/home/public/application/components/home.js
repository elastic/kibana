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

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Synopsis } from './synopsis';
import { ChangeHomeRoute } from './change_home_route';
import { SolutionsPanel } from './solutions_panel';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButtonEmpty,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Welcome } from './welcome';
import { getServices } from '../kibana_services';
import { HOME_APP_BASE_PATH } from '../../../common/constants';
import { createAppNavigationHandler } from './app_navigation_handler';

const KEY_ENABLE_WELCOME = 'home:welcome:show';

export class Home extends Component {
  constructor(props) {
    super(props);

    const isWelcomeEnabled = !(
      getServices().homeConfig.disableWelcomeScreen ||
      props.localStorage.getItem(KEY_ENABLE_WELCOME) === 'false'
    );
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

  findDirectoryById = (id) =>
    this.props.directories.find((directory) => directory.showOnHomePage && directory.id === id);

  renderDirectory = (directory) => {
    const { addBasePath } = this.props;

    return directory ? (
      <EuiFlexItem className="homHome__synopsisItem" key={directory.id}>
        <Synopsis
          onClick={createAppNavigationHandler(directory.path)}
          description={directory.description}
          iconType={directory.icon}
          title={directory.title}
          url={addBasePath(directory.path)}
          wrapInPanel
        />
      </EuiFlexItem>
    ) : null;
  };

  renderNormal() {
    const { addBasePath, canChangeHomeRoute = true } = this.props;

    const fileDataVisualizer = this.findDirectoryById('ml_file_data_visualizer');
    const ingestManager = this.findDirectoryById('ingestManager');
    const security = this.findDirectoryById('security');
    const monitoring = this.findDirectoryById('monitoring');
    const snapshotRestore = this.findDirectoryById('snapshot_restore');
    const indexLifecycleManagement = this.findDirectoryById('index_lifecycle_management');
    const console = this.findDirectoryById('console');
    const stackManagement = this.findDirectoryById('stack-management');

    return (
      <Fragment>
        <header className="homPageHeader">
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem>
              <EuiScreenReaderOnly>
                <h1>
                  <FormattedMessage id="home.welcomeHomePageHeader" defaultMessage="Kibana home" />
                </h1>
              </EuiScreenReaderOnly>
              <EuiFlexGroup gutterSize="none">
                <EuiTitle size="m">
                  <h1>
                    <FormattedMessage
                      id="home.pageHeader.welcomeNoUserTitle"
                      defaultMessage="Welcome to {ELASTIC}!"
                      values={{ ELASTIC: 'Elastic' }}
                    />
                  </h1>
                </EuiTitle>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="flexEnd">
                <EuiFlexItem>
                  <EuiButtonEmpty href="#/tutorial_directory" iconType="plusInCircle">
                    {i18n.translate('home.pageHeader.addDataButtonLabel', {
                      defaultMessage: 'Add data',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                {stackManagement ? (
                  <EuiFlexItem>
                    <EuiButtonEmpty
                      onClick={createAppNavigationHandler(stackManagement.path)}
                      iconType="gear"
                    >
                      {i18n.translate('home.pageHeader.stackManagementButtonLabel', {
                        defaultMessage: 'Manage stack',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                ) : null}
                {console ? (
                  <EuiFlexItem>
                    <EuiButtonEmpty
                      onClick={createAppNavigationHandler(console.path)}
                      iconType="wrench"
                    >
                      {i18n.translate('home.pageHeader.devToolsButtonLabel', {
                        defaultMessage: 'Dev tools',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem>
                  <EuiButtonEmpty href="#/feature_directory" iconType="apps">
                    {i18n.translate('home.pageHeader.appDirectoryButtonLabel', {
                      defaultMessage: 'App directory',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </header>
        <div className="homPageContainer">
          <main className="homPage" data-test-subj="homeApp">
            <div className="homSolutionsPanel">
              <SolutionsPanel
                addBasePath={addBasePath}
                observability={this.findDirectoryById('observability')}
                enterpriseSearch={this.findDirectoryById('appSearch')}
                securitySolution={this.findDirectoryById('securitySolution')}
              />

              <EuiHorizontalRule margin="xl" />
              <EuiSpacer size="s" />

              <div className="homAddData">
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
                  <EuiFlexItem grow={1}>
                    <EuiTitle size="s">
                      <h3>
                        {i18n.translate('home.addData.sectionTitle', {
                          defaultMessage: 'Add your data',
                        })}
                      </h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      iconType="tableDensityExpanded"
                      href="#/tutorial_directory/sampleData"
                      size="xs"
                    >
                      <FormattedMessage
                        id="home.addData.sampleDataButtonLabel"
                        defaultMessage="Try our sample data"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer />

                <EuiFlexGroup>
                  <EuiFlexItem grow={1}>
                    <EuiFlexGroup justifyContent="spaceAround">
                      {this.renderDirectory(fileDataVisualizer)}
                      <EuiFlexItem className="homHome__synopsisItem">
                        <Synopsis
                          description={i18n.translate('home.addData.addIntegrationDescription', {
                            defaultMessage: 'Add data from a variety of common sources.',
                          })}
                          iconType="indexOpen"
                          title={i18n.translate('home.addData.addIntegrationTitle', {
                            defaultMessage: 'Add an integration',
                          })}
                          url="#/tutorial_directory"
                          wrapInPanel
                        />
                      </EuiFlexItem>
                      {this.renderDirectory(ingestManager, {
                        isBeta: true,
                        betaLabel: 'Experimental',
                      })}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>

              {security || monitoring || snapshotRestore || indexLifecycleManagement ? (
                <Fragment>
                  <EuiHorizontalRule margin="xl" />
                  <EuiSpacer size="s" />

                  <div className="homManageData">
                    <EuiTitle size="s">
                      <h3>
                        {i18n.translate('home.manageData.sectionTitle', {
                          defaultMessage: 'Manage your data',
                        })}
                      </h3>
                    </EuiTitle>

                    <EuiSpacer />

                    <EuiFlexGroup justifyContent="spaceAround">
                      {this.renderDirectory(security)}
                      {this.renderDirectory(monitoring)}
                      {this.renderDirectory(snapshotRestore)}
                      {this.renderDirectory(indexLifecycleManagement)}
                    </EuiFlexGroup>
                  </div>
                </Fragment>
              ) : null}

              {canChangeHomeRoute && (
                <Fragment>
                  <EuiHorizontalRule margin="xl" />
                  <ChangeHomeRoute defaultRoute={HOME_APP_BASE_PATH} />
                </Fragment>
              )}
            </div>
          </main>
        </div>
      </Fragment>
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
