/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import React from 'react';
import { EuiFlexItem, EuiFlexGrid, EuiFlexGroup } from '@elastic/eui';
import type { InjectedIntl } from '@kbn/i18n-react';
import { injectI18n, FormattedMessage } from '@kbn/i18n-react';
import { SampleDataTab } from '@kbn/home-sample-data-tab';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { TutorialsCategory } from '../../../common/constants';
import { Synopsis } from './synopsis';
import type { HomeKibanaServices } from '../kibana_services';
import { getServices } from '../kibana_services';
import { getTutorials } from '../load_tutorials';
import type { TutorialType } from '../../services/tutorials/types';

const SAMPLE_DATA_TAB_ID = 'sampleData';
const integrationsTitle = i18n.translate('home.breadcrumbs.integrationsAppTitle', {
  defaultMessage: 'Integrations',
});

interface TutorialDirectoryUiProps {
  addBasePath: HomeKibanaServices['addBasePath'];
  openTab: string;
  isCloudEnabled: boolean;
  intl: InjectedIntl;
}
interface TutorialCard extends Pick<TutorialType, 'id' | 'category' | 'name'> {
  url: string;
  description: TutorialType['shortDescription'];
  icon?: string;
  isBeta?: boolean;
  onClick?: () => void;
}

interface TutorialDirectoryUiState {
  selectedTabId: TutorialDirectoryUiProps['openTab'];
  tutorialCards: TutorialCard[];
}

class TutorialDirectoryUi extends React.Component<
  TutorialDirectoryUiProps,
  TutorialDirectoryUiState
> {
  private _isMounted: boolean;
  tabs: Array<{ id: string; name: string; content: JSX.Element }>;

  constructor(props: TutorialDirectoryUiProps) {
    super(props);
    const extraTabs = getServices().addDataService.getAddDataTabs();
    this.tabs = [
      ...extraTabs.map(({ id, name, getComponent }) => ({
        id,
        name,
        content: getComponent(),
      })),
      {
        id: SAMPLE_DATA_TAB_ID,
        name: this.props.intl.formatMessage({
          id: 'home.tutorial.tabs.sampleDataTitle',
          defaultMessage: 'Sample data',
        }),
        content: <SampleDataTab />,
      },
    ];

    this._isMounted = false;
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
    this.setBreadcrumbs();
    const tutorialConfigs: TutorialType[] = await getTutorials();
    if (!this._isMounted) {
      return;
    }

    let tutorialCards: TutorialCard[] = tutorialConfigs.map((tutorialConfig: TutorialType) => {
      // add base path to SVG based icons
      let icon = tutorialConfig.euiIconType;
      if (icon && icon.includes('/')) {
        icon = this.props.addBasePath(icon);
      }

      return {
        id: tutorialConfig.id,
        category: tutorialConfig.category,
        icon,
        name: tutorialConfig.name,
        description: tutorialConfig.shortDescription,
        url: this.props.addBasePath(`#/tutorial/${tutorialConfig.id}`),
        elasticCloud: tutorialConfig.elasticCloud,
        isBeta: tutorialConfig.isBeta,
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
      category: TutorialsCategory.OTHER,
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
      tutorialCards,
    });
  }

  componentDidUpdate(
    _prevProps: TutorialDirectoryUiProps,
    prevState: Readonly<TutorialDirectoryUiState>
  ) {
    // Update selected tab when URL changes (e.g., browser back/forward)
    if (_prevProps.openTab !== this.props.openTab) {
      const newTab = this.props.openTab;
      // Validate that the tab exists
      const tabExists = this.tabs.some((tab) => tab.id === newTab);
      if (!tabExists) {
        // If the tab does not exist, redirect to the default tab
        getServices().history.push(`#/tutorial_directory/${SAMPLE_DATA_TAB_ID}`);
      } else if (newTab !== this.state.selectedTabId) {
        this.setState({
          selectedTabId: newTab,
        });
      }
    }

    if (prevState.selectedTabId !== this.state.selectedTabId) {
      this.setBreadcrumbs();
    }
  }

  setBreadcrumbs = () => {
    const tab = this.getSelectedTab();
    const breadcrumbs = [
      {
        text: integrationsTitle,
        href: this.props.addBasePath(`/app/integrations/browse`),
      },
    ];

    if (tab?.name) {
      breadcrumbs.push({
        text: tab.name,
        href: '',
      });
    }

    getServices().chrome.setBreadcrumbs(breadcrumbs, {
      project: {
        value: breadcrumbs,
      },
    });
  };

  onSelectedTabChanged = (id: string) => {
    this.setState({
      selectedTabId: id,
    });
    // Update URL to reflect the selected tab
    getServices().history.push(`#/tutorial_directory/${id}`);
  };

  getTabs = () => {
    return this.tabs.map((tab) => ({
      label: tab.name,
      onClick: () => this.onSelectedTabChanged(tab.id),
      isSelected: tab.id === this.state.selectedTabId,
      'data-test-subj': `homeTab-${tab.id}`,
    }));
  };

  getSelectedTab = () => {
    return this.tabs.find(({ id }) => id === this.state.selectedTabId);
  };

  renderTabContent = () => {
    const tab = this.getSelectedTab();

    if (tab?.content) {
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
        pageHeader={{
          pageTitle: (
            <FormattedMessage id="home.tutorial.addDataToKibanaTitle" defaultMessage="Add data" />
          ),
          description: (
            <FormattedMessage
              id="home.tutorial.addDataToKibanaDescription"
              defaultMessage="Try our sample data or upload your own data."
            />
          ),
          tabs,
          rightSideItems: headerLinks ? [headerLinks] : [],
        }}
      >
        <KibanaPageTemplate.Section>{this.renderTabContent()}</KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }
}

export const TutorialDirectory = injectI18n(TutorialDirectoryUi);
