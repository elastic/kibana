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

import {
  EuiPage,
  EuiTabs,
  EuiTab,
  EuiFlexItem,
  EuiFlexGrid,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';


import { getTutorials } from '../load_tutorials';

const ALL = 'all';

export class TutorialDirectory extends React.Component {

  constructor(props) {
    super(props);

    this.tabs = [{
      id: ALL,
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
    }];

    let openTab = ALL;
    if (props.openTab && this.tabs.some(tab => { return tab.id === props.openTab; })) {
      openTab = props.openTab;
    }
    this.state = {
      selectedTabId: openTab,
      tutorials: []
    };
  }

  async componentWillMount() {
    let tutorials = await getTutorials();
    if (this.props.isCloudEnabled) {
      tutorials = tutorials.filter(tutorial => {
        return _.has(tutorial, 'elasticCloud');
      });
    }
    tutorials.sort((a, b) => {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    this.setState({
      tutorials: tutorials,
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

  renderTutorials = () => {
    return this.state.tutorials
      .filter((tutorial) => {
        if (this.state.selectedTabId === ALL) {
          return true;
        }
        return this.state.selectedTabId === tutorial.category;
      })
      .map((tutorial) => {
        return (
          <EuiFlexItem key={tutorial.name}>
            <Synopsis
              iconType={tutorial.euiIconType}
              description={tutorial.shortDescription}
              title={tutorial.name}
              wrapInPanel
              url={this.props.addBasePath(`#/home/tutorial/${tutorial.id}`)}
            />
          </EuiFlexItem>
        );
      });
  };

  render() {
    return (
      <EuiPage className="home">

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
          { this.renderTutorials() }
        </EuiFlexGrid>

      </EuiPage>
    );
  }
}

TutorialDirectory.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  openTab: PropTypes.string,
  isCloudEnabled: PropTypes.bool.isRequired,
};
