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

import React from 'react';
import PropTypes from 'prop-types';
import { Synopsis } from './synopsis';
import {
  EuiTabs,
  EuiTab,
  EuiFlexItem,
  EuiFlexGrid,
  EuiPage,
  EuiPageBody,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

import { FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

const ALL_TAB_ID = 'all';
const OTHERS_TAB_ID = 'others';

const isOtherCategory = (directory) => {
  return directory.category !== FeatureCatalogueCategory.DATA && directory.category !== FeatureCatalogueCategory.ADMIN;
};

export class FeatureDirectory extends React.Component {

  constructor(props) {
    super(props);

    this.tabs = [{
      id: ALL_TAB_ID,
      name: 'All',
    }, {
      id: FeatureCatalogueCategory.DATA,
      name: 'Data Exploration & Visualization',
    }, {
      id: FeatureCatalogueCategory.ADMIN,
      name: 'Administrative',
    }];
    if (props.directories.some(isOtherCategory)) {
      this.tabs.push({
        id: OTHERS_TAB_ID,
        name: 'Other',
      });
    }

    this.state = {
      selectedTabId: ALL_TAB_ID
    };
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

  renderDirectories = () => {
    return this.props.directories
      .filter((directory) => {
        if (this.state.selectedTabId === ALL_TAB_ID) {
          return true;
        }
        if (this.state.selectedTabId === OTHERS_TAB_ID) {
          return isOtherCategory(directory);
        }
        return this.state.selectedTabId === directory.category;
      })
      .map((directory) => {
        return (
          <EuiFlexItem key={directory.id}>
            <Synopsis
              description={directory.description}
              iconType={directory.icon}
              title={directory.title}
              url={this.props.addBasePath(directory.path)}
              wrapInPanel
            />
          </EuiFlexItem>
        );
      });
  };

  render() {
    return (
      <EuiPage className="home">
        <EuiPageBody>
          <EuiTitle size="l">
            <h1>
              Directory
            </h1>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiTabs className="homeDirectoryTabs">
            {this.renderTabs()}
          </EuiTabs>
          <EuiSpacer />
          <EuiFlexGrid columns={4}>
            { this.renderDirectories() }
          </EuiFlexGrid>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

FeatureDirectory.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  directories: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    showOnHomePage: PropTypes.bool.isRequired,
    category: PropTypes.string.isRequired
  }))
};
