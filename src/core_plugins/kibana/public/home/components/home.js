import React from 'react';
import PropTypes from 'prop-types';
import { Synopsis } from './synopsis';
import {
  KuiButton,
  KuiFlexGroup,
  KuiFlexItem,
  KuiFlexGrid,
} from 'ui_framework/components';
import { FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

export function Home({ addBasePath, directories }) {

  const renderDirectories = (category) => {
    return directories
    .filter((directory) => {
      return directory.showOnHomePage && directory.category === category;
    })
    .map((directory) => {
      return (
        <KuiFlexItem style={{ minHeight: 64 }} key={directory.id}>
          <Synopsis
            description={directory.description}
            iconUrl={addBasePath(directory.icon)}
            title={directory.title}
            url={addBasePath(directory.path)}
          />
        </KuiFlexItem>
      );
    });
  };


  return (
    <div className="kuiView home">
      <div className="kuiViewContent">

        <div className="kuiViewContentItem kuiVerticalRhythmXLarge">
          <KuiFlexGroup
            className="kuiVerticalRhythmSmall"
            justifyContent="spaceBetween"
            alignItems="flexEnd"
          >
            <KuiFlexItem>
              <h1 className="kuiTitle">
                Welcome to Kibana
              </h1>
            </KuiFlexItem>

            <KuiFlexItem grow={false}>
              <KuiFlexGroup alignItems="center">
                <KuiFlexItem grow={false}>
                  <p className="kuiText kuiSubduedText">
                    Data already in Elasticsearch?
                  </p>
                </KuiFlexItem>

                <KuiFlexItem grow={false}>
                  <KuiButton buttonType="secondary">
                    <a href={addBasePath('/app/kibana#/management/kibana/index')}>Set up index patterns</a>
                  </KuiButton>
                </KuiFlexItem>
              </KuiFlexGroup>

            </KuiFlexItem>
          </KuiFlexGroup>
        </div>

        <div className="kuiViewContentItem kuiVerticalRhythmXLarge">
          <KuiFlexGroup className="kuiVerticalRhythm">
            <KuiFlexItem className="kuiPanel">
              <div className="kuiPanelBody">
                <h3 className="kuiSubTitle kuiVerticalRhythm">
                  Visualize and explore data
                </h3>
                <KuiFlexGrid className="kuiVerticalRhythmSmall topFeatures" columns={2}>
                  { renderDirectories(FeatureCatalogueCategory.DATA) }
                </KuiFlexGrid>
              </div>
            </KuiFlexItem>
            <KuiFlexItem className="kuiPanel">
              <div className="kuiPanelBody">
                <h3 className="kuiSubTitle kuiVerticalRhythm">
                  Manage and administer the Elastic stack
                </h3>
                <KuiFlexGrid className="kuiVerticalRhythmSmall topFeatures" columns={2}>
                  { renderDirectories(FeatureCatalogueCategory.ADMIN) }
                </KuiFlexGrid>
              </div>
            </KuiFlexItem>
          </KuiFlexGroup>
        </div>

        <div className="kuiViewContentItem kuiVerticalRhythmXLarge center">

          <h4 className="kuiSubduedText kuiVerticalRhythmSmall">
            {`Didn't find what you were looking for?`}
          </h4>

          <KuiButton
            className="kuiVerticalRhythmSmall"
            buttonType="secondary"
          >
            <a href="#/home/feature_directory">View full directory of Kibana features</a>
          </KuiButton>

        </div>

      </div>
    </div>
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
