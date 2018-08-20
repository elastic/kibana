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

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Synopsis } from './synopsis';
import { AddData } from './add_data';
import { RecentlyAccessed, recentlyAccessedShape } from './recently_accessed';

import {
  EuiButton,
  EuiPage,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlexGrid,
  EuiText,
} from '@elastic/eui';

import { FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

export function Home({ addBasePath, directories, apmUiEnabled, recentlyAccessed }) {

  const renderDirectories = (category) => {
    return directories
      .filter((directory) => {
        return directory.showOnHomePage && directory.category === category;
      })
      .map((directory) => {
        return (
          <EuiFlexItem style={{ minHeight: 64 }} key={directory.id}>
            <Synopsis
              description={directory.description}
              iconType={directory.icon}
              title={directory.title}
              url={addBasePath(directory.path)}
            />
          </EuiFlexItem>
        );
      });
  };

  let recentlyAccessedPanel;
  if (recentlyAccessed.length > 0) {
    recentlyAccessedPanel = (
      <Fragment>
        <RecentlyAccessed
          recentlyAccessed={recentlyAccessed}
        />
        <EuiSpacer size="l" />
      </Fragment>
    );
  }

  return (
    <EuiPage className="home">

      {recentlyAccessedPanel}

      <AddData
        apmUiEnabled={apmUiEnabled}
      />

      <EuiSpacer size="l" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel paddingSize="l">
            <EuiTitle>
              <h3>
                Visualize and Explore Data
              </h3>
            </EuiTitle>
            <EuiSpacer size="m"/>
            <EuiFlexGrid columns={2}>
              { renderDirectories(FeatureCatalogueCategory.DATA) }
            </EuiFlexGrid>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="l">
            <EuiTitle>
              <h3>
                Manage and Administer the Elastic Stack
              </h3>
            </EuiTitle>
            <EuiSpacer size="m"/>
            <EuiFlexGrid columns={2}>
              { renderDirectories(FeatureCatalogueCategory.ADMIN) }
            </EuiFlexGrid>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiText>
            <p>
              Didn’t find what you were looking for?
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiButton
            href="#/home/feature_directory"
          >
            View full directory of Kibana plugins
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

    </EuiPage>
  );
}

Home.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  directories: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    showOnHomePage: PropTypes.bool.isRequired,
    category: PropTypes.string.isRequired
  })),
  apmUiEnabled: PropTypes.bool.isRequired,
  recentlyAccessed: PropTypes.arrayOf(recentlyAccessedShape).isRequired,
};
