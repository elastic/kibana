/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexItem, EuiFlexGrid, EuiFlexGroup, EuiLink } from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { Synopsis } from './synopsis';
import { SampleDataSetCards } from './sample_data_set_cards';
import { getServices } from '../kibana_services';
import { KibanaPageTemplate } from '@kbn/kibana-react-plugin/public';
import { getTutorials } from '../load_tutorials';

const SAMPLE_DATA_TAB_ID = 'sampleData';

const integrationsTitle = i18n.translate('home.breadcrumbs.integrationsAppTitle', {
  defaultMessage: 'Integrations',
});

class TutorialDirectoryUi extends React.Component {
  constructor(props) {
    super(props);

    const extraTabs = getServices().addDataService.getAddDataTabs();

    this.tabs = [
      {
        id: SAMPLE_DATA_TAB_ID,
        name: this.props.intl.formatMessage({
          id: 'home.tutorial.tabs.sampleDataTitle',
          defaultMessage: 'Sample data',
        }),
        content: <SampleDataSetCards addBasePath={this.props.addBasePath} />,
      },
      ...extraTabs.map(({ id, name, component: Component }) => ({
        id,
        name,
        content: <Component />,
      })),
    ];

    let openTab = SAMPLE_DATA_TAB_ID;
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
        text: integrationsTitle,
        href: this.props.addBasePath(`/app/integrations/browse`),
      },
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
        id: tutorialConfig.id,
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
      id: 'sample_data',

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

  getTabs = () => {
    return this.tabs.map((tab) => ({
      label: tab.name,
      onClick: () => this.onSelectedTabChanged(tab.id),
      isSelected: tab.id === this.state.selectedTabId,
      'data-test-subj': `homeTab-${tab.id}`,
    }));
  };

  renderTabContent = () => {
    const tab = this.tabs.find(({ id }) => id === this.state.selectedTabId);
    if (tab?.content) {
      getServices().chrome.setBreadcrumbs([
        {
          text: integrationsTitle,
          href: this.props.addBasePath(`/app/integrations/browse`),
        },
        {
          text: tab.name,
        },
      ]);
      return tab.content;
    }

    return (
      <EuiFlexGrid columns={4}>
        {this.state.tutorialCards
          .filter((tutorial) => {
            return (
              this.state.selectedTabId === SAMPLE_DATA_TAB_ID ||
              this.state.selectedTabId === tutorial.category
            );
          })
          .map((tutorial) => {
            return (
              <EuiFlexItem data-test-subj={`homeTab-${tutorial.name}`} key={tutorial.name}>
                <Synopsis
                  id={tutorial.id}
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

  renderHeaderLinks = () => {
    const headerLinks = getServices().tutorialService.getDirectoryHeaderLinks();
    return headerLinks.length ? (
      <EuiFlexGroup gutterSize="m" alignItems="center">
        {headerLinks.map((HeaderLink, index) => (
          <EuiFlexItem key={index}>
            <HeaderLink />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    ) : null;
  };

  render() {
    const headerLinks = this.renderHeaderLinks();
    const tabs = this.getTabs();

    return (
      <KibanaPageTemplate
        restrictWidth={1200}
        template="empty"
        pageHeader={{
          pageTitle: (
            <FormattedMessage
              id="home.tutorial.addDataToKibanaTitle"
              defaultMessage="More ways to add data"
            />
          ),
          description: (
            <FormattedMessage
              id="home.tutorial.addDataToKibanaDescription"
              defaultMessage="In addition to adding {integrationsLink}, you can try our sample data or upload your own data."
              values={{
                integrationsLink: (
                  <EuiLink href={this.props.addBasePath(`/app/integrations/browse`)}>
                    <FormattedMessage
                      id="home.tutorial.addDataToKibanaDescription.integrations"
                      defaultMessage="integrations"
                    />
                  </EuiLink>
                ),
              }}
            />
          ),
          tabs,
          rightSideItems: headerLinks ? [headerLinks] : [],
        }}
      >
        {this.renderTabContent()}
      </KibanaPageTemplate>
    );
  }
}

TutorialDirectoryUi.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  openTab: PropTypes.string,
  isCloudEnabled: PropTypes.bool.isRequired,
};

export const TutorialDirectory = injectI18n(TutorialDirectoryUi);
