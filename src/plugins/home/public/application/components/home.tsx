/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate, OverviewPageFooter } from '@kbn/kibana-react-plugin/public';
import { HOME_APP_BASE_PATH } from '../../../common/constants';
import type {
  FeatureCatalogueEntry,
  FeatureCatalogueSolution,
  FeatureCatalogueCategory,
} from '../../services';
import { getServices } from '../kibana_services';
import { AddData } from './add_data';
import { ManageData } from './manage_data';
import { SolutionsSection } from './solutions_section';
import { Welcome } from './welcome';

const KEY_ENABLE_WELCOME = 'home:welcome:show';

export interface HomeProps {
  addBasePath: (url: string) => string;
  directories: FeatureCatalogueEntry[];
  solutions: FeatureCatalogueSolution[];
  localStorage: Storage;
  urlBasePath: string;
  hasUserDataView: () => Promise<boolean>;
}

interface State {
  isLoading: boolean;
  isNewKibanaInstance: boolean;
  isWelcomeEnabled: boolean;
}

export class Home extends Component<HomeProps, State> {
  private _isMounted = false;

  constructor(props: HomeProps) {
    super(props);

    const isWelcomeEnabled =
      !getServices().homeConfig.disableWelcomeScreen &&
      getServices().application.capabilities.navLinks.integrations &&
      props.localStorage.getItem(KEY_ENABLE_WELCOME) !== 'false';

    const body = document.querySelector('body')!;
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

  public componentWillUnmount() {
    this._isMounted = false;

    const body = document.querySelector('body')!;
    body.classList.remove('isHomPage');
  }

  public componentDidMount() {
    this._isMounted = true;
    this.fetchIsNewKibanaInstance();

    const homeTitle = i18n.translate('home.breadcrumbs.homeTitle', { defaultMessage: 'Home' });
    getServices().chrome.setBreadcrumbs([{ text: homeTitle }]);
  }

  private async fetchIsNewKibanaInstance() {
    try {
      // Set a max-time on this query so we don't hang the page too long...
      // Worst case, we don't show the welcome screen when we should.
      setTimeout(() => {
        if (this.state.isLoading) {
          this.setState({ isWelcomeEnabled: false });
        }
      }, 10000);

      const hasUserIndexPattern = await this.props.hasUserDataView();

      this.endLoading({ isNewKibanaInstance: !hasUserIndexPattern });
    } catch (err) {
      // An error here is relatively unimportant, as it only means we don't provide
      // some UI niceties.
      this.endLoading();
    }
  }

  private endLoading(state = {}) {
    if (this._isMounted) {
      this.setState({
        ...state,
        isLoading: false,
      });
    }
  }

  public skipWelcome() {
    this.props.localStorage.setItem(KEY_ENABLE_WELCOME, 'false');
    if (this._isMounted) this.setState({ isWelcomeEnabled: false });
  }

  private findDirectoryById(id: string) {
    return this.props.directories.find((directory) => directory.id === id);
  }

  private getFeaturesByCategory(category: FeatureCatalogueCategory) {
    return this.props.directories
      .filter((directory) => directory.showOnHomePage && directory.category === category)
      .sort((directoryA, directoryB) => (directoryA.order ?? -1) - (directoryB.order ?? -1));
  }

  private renderNormal() {
    const { addBasePath, solutions } = this.props;
    const { application, trackUiMetric } = getServices();
    const isDarkMode = getServices().uiSettings?.get('theme:darkMode') || false;
    const devTools = this.findDirectoryById('console');
    const manageDataFeatures = this.getFeaturesByCategory('admin');

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
  private renderLoading() {
    return '';
  }

  private renderWelcome() {
    return <Welcome onSkip={() => this.skipWelcome()} urlBasePath={this.props.urlBasePath} />;
  }

  public render() {
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
