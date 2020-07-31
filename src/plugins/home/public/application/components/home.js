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
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HOME_APP_BASE_PATH } from '../../../common/constants';
import { FeatureCatalogueHomePageSection } from '../../services';
import { getServices } from '../kibana_services';
import { AddData } from './add_data';
import { createAppNavigationHandler } from './app_navigation_handler';
import { ChangeHomeRoute } from './change_home_route';
import { ManageData } from './manage_data';
import { SolutionsSection } from './solutions_section';
import { Synopsis } from './synopsis';
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

  renderFeatureCard = (directory) =>
    directory ? (
      <EuiFlexItem className="homHome__synopsisItem" key={directory.id}>
        <Synopsis
          onClick={createAppNavigationHandler(directory.path)}
          description={directory.description}
          iconType={directory.icon}
          title={directory.title}
          url={this.props.addBasePath(directory.path)}
          wrapInPanel
        />
      </EuiFlexItem>
    ) : null;

  renderFeatureCardsBySection = (section) =>
    this.props.directories
      .filter((directory) => directory.homePageSection === section)
      .sort((directoryA, directoryB) => directoryA.order - directoryB.order)
      .map(this.renderFeatureCard);

  renderNormal() {
    const { addBasePath, directories, solutions } = this.props;

    const devTools = this.findDirectoryById('console');
    const stackManagement = this.findDirectoryById('stack-management');
    const advancedSettings = this.findDirectoryById('advanced_settings');

    const addDataFeatureCards = this.renderFeatureCardsBySection(
      FeatureCatalogueHomePageSection.ADD_DATA
    );
    const manageDataFeatureCards = this.renderFeatureCardsBySection(
      FeatureCatalogueHomePageSection.MANAGE_DATA
    );

    // Show card for console if none of the manage data plugins are available, most likely in OSS
    if (manageDataFeatureCards.length < 1 && devTools) {
      manageDataFeatureCards.push(this.renderFeatureCard(devTools));
    }

    return (
      <div className="homPageContainer">
        <div className="homPageHeaderContainer">
          <header className="homPageHeader">
            <EuiFlexGroup gutterSize="none">
              <EuiFlexItem className="homPageHeader__title">
                <EuiTitle size="m">
                  <h1>
                    <FormattedMessage
                      id="home.pageHeader.welcomeNoUserTitle"
                      defaultMessage="Welcome to {ELASTIC}!"
                      values={{ ELASTIC: 'Elastic' }}
                    />
                  </h1>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup className="homPageHeader__menu" alignItems="flexEnd">
                  <EuiFlexItem className="homPageHeader__menuItem">
                    <EuiButtonEmpty href="#/tutorial_directory" iconType="plusInCircle">
                      {i18n.translate('home.pageHeader.addDataButtonLabel', {
                        defaultMessage: 'Add data',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  {stackManagement ? (
                    <EuiFlexItem className="homPageHeader__menuItem">
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
                    <EuiFlexItem className="homPageHeader__menuItem">
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
          </header>
        </div>
        <div className="homPageMainContainer">
          <main className="homPageMain" data-test-subj="homeApp">
            <SolutionsSection
              addBasePath={addBasePath}
              directories={directories}
              solutions={solutions}
            />

            {/* If there is only one card in each add and manage data section, this displays the two sections side by side */}
            {addDataFeatureCards.length === 1 && manageDataFeatureCards.length === 1 ? (
              <EuiFlexGroup>
                <EuiFlexItem>
                  <AddData cards={addDataFeatureCards} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <ManageData cards={manageDataFeatureCards} />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <Fragment>
                <AddData cards={addDataFeatureCards} />
                <ManageData cards={manageDataFeatureCards} />
              </Fragment>
            )}

            <EuiHorizontalRule margin="xl" />

            <EuiFlexGroup
              className="homPageFooter"
              alignItems="center"
              gutterSize="s"
              justifyContent="spaceBetween"
            >
              <EuiFlexItem grow={1}>
                {advancedSettings ? <ChangeHomeRoute defaultRoute={HOME_APP_BASE_PATH} /> : null}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty href="#/feature_directory" size="xs" flush="right" iconType="apps">
                  <FormattedMessage
                    id="home.appDirectory.appDirectoryButtonLabel"
                    defaultMessage="View app directory"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </main>
        </div>
      </div>
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
      homePageSection: PropTypes.string,
      category: PropTypes.string.isRequired,
      solution: PropTypes.string,
      order: PropTypes.number,
    })
  ),
  solutions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
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
