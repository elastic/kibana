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

import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { Synopsis } from './synopsis';
import { SampleDataSetCards } from './sample_data_set_cards';
import { getServices } from '../kibana_services';

import {
  EuiPage,
  EuiTabs,
  EuiTab,
  EuiFlexItem,
  EuiFlexGrid,
  EuiSpacer,
  EuiTitle,
  EuiPageBody,
} from '@elastic/eui';

import { getTutorials } from '../load_tutorials';

import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

const ALL_TAB_ID = 'all';
const SAMPLE_DATA_TAB_ID = 'sampleData';

const homeTitle = i18n.translate('home.breadcrumbs.homeTitle', { defaultMessage: 'Home' });
const addDataTitle = i18n.translate('home.breadcrumbs.addDataTitle', {
  defaultMessage: 'Add data',
});

class TutorialDirectoryUi extends React.Component {
  constructor(props) {
    super(props);

    this.tabs = [
      {
        id: ALL_TAB_ID,
        name: this.props.intl.formatMessage({
          id: 'home.tutorial.tabs.allTitle',
          defaultMessage: 'All',
        }),
      },
      {
        id: 'logging',
        name: this.props.intl.formatMessage({
          id: 'home.tutorial.tabs.loggingTitle',
          defaultMessage: 'Logs',
        }),
      },
      {
        id: 'metrics',
        name: this.props.intl.formatMessage({
          id: 'home.tutorial.tabs.metricsTitle',
          defaultMessage: 'Metrics',
        }),
      },
      {
        id: 'security',
        name: this.props.intl.formatMessage({
          id: 'home.tutorial.tabs.securitySolutionTitle',
          defaultMessage: 'Security',
        }),
      },
      {
        id: SAMPLE_DATA_TAB_ID,
        name: this.props.intl.formatMessage({
          id: 'home.tutorial.tabs.sampleDataTitle',
          defaultMessage: 'Sample data',
        }),
      },
    ];

    let openTab = ALL_TAB_ID;
    if (
      props.openTab &&
      this.tabs.some((tab) => {
        return tab.id === props.openTab;
      })
    ) {
      openTab = props.openTab;
    }
    this.state = {
      selectedTabId: openTab,
      tutorialCards: [],
    };
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async componentDidMount() {
    this._isMounted = true;

    getServices().chrome.setBreadcrumbs([
      {
        text: homeTitle,
        href: '#/',
      },
      { text: addDataTitle },
    ]);

    const tutorialConfigs = await getTutorials();

    if (!this._isMounted) {
      return;
    }

    let tutorialCards = tutorialConfigs.map((tutorialConfig) => {
      // add base path to SVG based icons
      let icon = tutorialConfig.euiIconType;
      if (icon && icon.includes('/')) {
        icon = this.props.addBasePath(icon);
      }

      return {
        category: tutorialConfig.category,
        icon: icon,
        name: tutorialConfig.name,
        description: tutorialConfig.shortDescription,
        url: this.props.addBasePath(`#/tutorial/${tutorialConfig.id}`),
        elasticCloud: tutorialConfig.elasticCloud,
        // Beta label is skipped on the tutorial overview page for now. Too many beta labels.
        //isBeta: tutorialConfig.isBeta,
      };
    });

    // Add card for sample data that only gets show in "all" tab
    tutorialCards.push({
      name: this.props.intl.formatMessage({
        id: 'home.tutorial.card.sampleDataTitle',
        defaultMessage: 'Sample Data',
      }),
      description: this.props.intl.formatMessage({
        id: 'home.tutorial.card.sampleDataDescription',
        defaultMessage: 'Get started exploring Kibana with these "one click" data sets.',
      }),
      url: this.props.addBasePath('#/tutorial_directory/sampleData'),
      elasticCloud: true,
      onClick: this.onSelectedTabChanged.bind(null, SAMPLE_DATA_TAB_ID),
    });

    if (this.props.isCloudEnabled) {
      tutorialCards = tutorialCards.filter((tutorial) => {
        return _.has(tutorial, 'elasticCloud');
      });
    }

    tutorialCards.sort((a, b) => {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    this.setState({
      // eslint-disable-line react/no-did-mount-set-state
      tutorialCards: tutorialCards,
    });
  }

  onSelectedTabChanged = (id) => {
    this.setState({
      selectedTabId: id,
    });
  };

  renderTabs = () => {
    return this.tabs.map((tab, index) => (
      <EuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.selectedTabId}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  renderTabContent = () => {
    if (this.state.selectedTabId === SAMPLE_DATA_TAB_ID) {
      return <SampleDataSetCards addBasePath={this.props.addBasePath} />;
    }

    return (
      <EuiFlexGrid columns={4}>
        {this.state.tutorialCards
          .filter((tutorial) => {
            return (
              this.state.selectedTabId === ALL_TAB_ID ||
              this.state.selectedTabId === tutorial.category
            );
          })
          .map((tutorial) => {
            return (
              <EuiFlexItem key={tutorial.name}>
                <Synopsis
                  iconType={tutorial.icon}
                  description={tutorial.description}
                  title={tutorial.name}
                  wrapInPanel
                  url={tutorial.url}
                  onClick={tutorial.onClick}
                  isBeta={tutorial.isBeta}
                />
              </EuiFlexItem>
            );
          })}
      </EuiFlexGrid>
    );
  };

  render() {
    return (
      <EuiPage restrictWidth={1200}>
        <EuiPageBody>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage id="home.tutorial.addDataToKibanaTitle" defaultMessage="Add data" />
            </h1>
          </EuiTitle>

          <EuiSpacer size="m" />

          <EuiTabs>{this.renderTabs()}</EuiTabs>
          <EuiSpacer />
          {this.renderTabContent()}
        </EuiPageBody>
      </EuiPage>
    );
  }
}

TutorialDirectoryUi.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  openTab: PropTypes.string,
  isCloudEnabled: PropTypes.bool.isRequired,
};

export const TutorialDirectory = injectI18n(TutorialDirectoryUi);
