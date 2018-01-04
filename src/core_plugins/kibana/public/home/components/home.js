import React from 'react';
import PropTypes from 'prop-types';
import { Synopsis } from './synopsis';
import {
  KuiLinkButton,
} from 'ui_framework/components';

import {
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

export function Home({ addBasePath, directories }) {

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


  return (
    <EuiPage className="home">

      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="flexEnd"
      >
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>Welcome to Kibana</h1>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <p className="kuiText kuiSubduedText">
                Data already in Elasticsearch?
              </p>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <KuiLinkButton
                buttonType="secondary"
                href={addBasePath('/app/kibana#/management/kibana/index')}
              >
                Set up index patterns
              </KuiLinkButton>
            </EuiFlexItem>
          </EuiFlexGroup>

        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiFlexGroup className="kuiVerticalRhythm">
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
          <KuiLinkButton
            buttonType="secondary"
            href="#/home/feature_directory"
          >
            View full directory of Kibana plugins
          </KuiLinkButton>
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
  }))
};
