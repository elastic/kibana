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
import { SampleDataSetCard } from './sample_data_set_card';

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
import { listSampleDataSets } from '../sample_data_sets';

const ALL_TAB_ID = 'all';
const SAMPLE_DATA_TAB_ID = 'sampleData';

export class TutorialDirectory extends React.Component {

  constructor(props) {
    super(props);

    this.tabs = [{
      id: ALL_TAB_ID,
      name: 'All',
    }, {
      id: 'logging',
      name: 'Logging',
    }, {
      id: 'metrics',
      name: 'Metrics',
    }, {
      id: 'security',
      name: 'Security Analytics',
    }, {
      id: SAMPLE_DATA_TAB_ID,
      name: 'Sample Data',
    }];

    let openTab = ALL_TAB_ID;
    if (props.openTab && this.tabs.some(tab => { return tab.id === props.openTab; })) {
      openTab = props.openTab;
    }
    this.state = {
      selectedTabId: openTab,
      tutorialCards: [],
      sampleDataSets: [],
    };
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async componentDidMount() {
    this._isMounted = true;

    this.loadSampleDataSets();

    const tutorialConfigs = await getTutorials();

    if (!this._isMounted) {
      return;
    }

    let tutorialCards = tutorialConfigs.map(tutorialConfig => {
      return {
        category: tutorialConfig.category,
        icon: tutorialConfig.euiIconType,
        name: tutorialConfig.name,
        description: tutorialConfig.shortDescription,
        url: this.props.addBasePath(`#/home/tutorial/${tutorialConfig.id}`),
        elasticCloud: tutorialConfig.elasticCloud,
        // Beta label is skipped on the tutorial overview page for now. Too many beta labels.
        //isBeta: tutorialConfig.isBeta,
      };
    });

    // Add card for sample data that only gets show in "all" tab
    tutorialCards.push({
      name: 'Sample Data',
      description: 'Get started exploring Kibana with these "one click" data sets.',
      url: this.props.addBasePath('#/home/tutorial_directory/sampleData'),
      elasticCloud: true,
      onClick: this.onSelectedTabChanged.bind(null, SAMPLE_DATA_TAB_ID),
    });

    if (this.props.isCloudEnabled) {
      tutorialCards = tutorialCards.filter(tutorial => {
        return _.has(tutorial, 'elasticCloud');
      });
    }

    tutorialCards.sort((a, b) => {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    this.setState({ // eslint-disable-line react/no-did-mount-set-state
      tutorialCards: tutorialCards,
    });
  }

  loadSampleDataSets = async () => {
    const sampleDataSets = await listSampleDataSets();

    if (!this._isMounted) {
      return;
    }

    this.setState({
      sampleDataSets: sampleDataSets.sort((a, b) => {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      }),
    });
  }

  onSelectedTabChanged = id => {
    this.setState({
      selectedTabId: id,
    });
  };

  renderTabs = () => {
    return this.tabs.map((tab, index) => (
      <EuiTab
        className="homeDirectoryTab"
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.selectedTabId}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));
  }

  renderTab = () => {
    if (this.state.selectedTabId === SAMPLE_DATA_TAB_ID) {
      return this.renderSampleDataSetsTab();
    }

    return this.renderTutorialsTab();
  }

  renderTutorialsTab = () => {
    return this.state.tutorialCards
      .filter((tutorial) => {
        return this.state.selectedTabId === ALL_TAB_ID || this.state.selectedTabId === tutorial.category;
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
      });
  };

  renderSampleDataSetsTab = () => {
    return this.state.sampleDataSets.map(sampleDataSet => {
      return (
        <EuiFlexItem key={sampleDataSet.id}>
          <SampleDataSetCard
            id={sampleDataSet.id}
            description={sampleDataSet.description}
            name={sampleDataSet.name}
            launchUrl={this.props.addBasePath(`/app/kibana#/dashboard/${sampleDataSet.overviewDashboard}`)}
            status={sampleDataSet.status}
            statusMsg={sampleDataSet.statusMsg}
            onRequestComplete={this.loadSampleDataSets}
            getConfig={this.props.getConfig}
            setConfig={this.props.setConfig}
            clearIndexPatternsCache={this.props.clearIndexPatternsCache}
            defaultIndex={sampleDataSet.defaultIndex}
            previewUrl={this.props.addBasePath(sampleDataSet.previewImagePath)}
          />
        </EuiFlexItem>
      );
    });
  }

  render() {
    return (
      <EuiPage className="home">
        <EuiPageBody>

          <a className="kuiLink" href="#/home">Home</a>
          <EuiSpacer size="s" />
          <EuiTitle size="l">
            <h1>
              Add Data to Kibana
            </h1>
          </EuiTitle>

          <EuiSpacer size="m" />

          <EuiTabs>
            {this.renderTabs()}
          </EuiTabs>
          <EuiSpacer />
          <EuiFlexGrid columns={4}>
            { this.renderTab() }
          </EuiFlexGrid>

        </EuiPageBody>
      </EuiPage>
    );
  }
}

TutorialDirectory.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  openTab: PropTypes.string,
  isCloudEnabled: PropTypes.bool.isRequired,
  getConfig: PropTypes.func.isRequired,
  setConfig: PropTypes.func.isRequired,
  clearIndexPatternsCache: PropTypes.func.isRequired,
};
