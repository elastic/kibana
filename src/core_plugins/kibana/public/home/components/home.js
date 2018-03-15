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
              iconUrl={addBasePath(directory.icon)}
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
        addBasePath={addBasePath}
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
