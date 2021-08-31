/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate, OverviewPageFooter } from '../../../../kibana_react/public';
import { HOME_APP_BASE_PATH } from '../../../common/constants';
import { FeatureCatalogueCategory } from '../../services';
import { getServices } from '../kibana_services';
import { AddData } from './add_data';
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

    const body = document.querySelector('body');
    body.classList.remove('isHomPage');
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

      const { isNewInstance } = await this.props.http.get('/internal/home/new_instance_status');

      this.endLoading({ isNewKibanaInstance: isNewInstance });
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
    const { application, trackUiMetric } = getServices();
    const isDarkMode = getServices().uiSettings?.get('theme:darkMode') || false;
    const devTools = this.findDirectoryById('console');
    const manageDataFeatures = this.getFeaturesByCategory(FeatureCatalogueCategory.ADMIN);

    // Show card for console if none of the manage data plugins are available, most likely in OSS
    if (manageDataFeatures.length < 1 && devTools) {
      manageDataFeatures.push(devTools);
    }

    return (
      <KibanaPageTemplate
        data-test-subj="homeApp"
        pageHeader={{
          bottomBorder: false,
          pageTitle: <FormattedMessage id="home.header.title" defaultMessage="Welcome home" />,
        }}
        template="empty"
      >
        <SolutionsSection addBasePath={addBasePath} solutions={solutions} />

        <AddData addBasePath={addBasePath} application={application} isDarkMode={isDarkMode} />

        <ManageData
          addBasePath={addBasePath}
          application={application}
          features={manageDataFeatures}
        />

        <OverviewPageFooter
          addBasePath={addBasePath}
          path={HOME_APP_BASE_PATH}
          onSetDefaultRoute={() => {
            trackUiMetric(METRIC_TYPE.CLICK, 'set_home_as_default_route');
          }}
          onChangeDefaultRoute={() => {
            trackUiMetric(METRIC_TYPE.CLICK, 'change_to_different_default_route');
          }}
        />
      </KibanaPageTemplate>
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
  solutions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
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
