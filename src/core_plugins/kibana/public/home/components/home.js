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
                  <a href={addBasePath('/app/kibana#/management/kibana/index')}>
                    <KuiButton buttonType="secondary">
                      Set up index patterns
                    </KuiButton>
                  </a>
                </KuiFlexItem>
              </KuiFlexGroup>

            </KuiFlexItem>
          </KuiFlexGroup>
        </div>

        <div className="kuiViewContentItem kuiVerticalRhythmXLarge">
          <KuiFlexGroup className="kuiVerticalRhythm">
            <KuiFlexItem className="kuiPanel homePanel">
              <h3 className="kuiSubTitle kuiVerticalRhythm">
                Visualize and explore data
              </h3>
              <KuiFlexGrid className="kuiVerticalRhythmSmall homeTopFeatures" columns={2}>
                { renderDirectories(FeatureCatalogueCategory.DATA) }
              </KuiFlexGrid>
            </KuiFlexItem>
            <KuiFlexItem className="kuiPanel homePanel">
              <h3 className="kuiSubTitle kuiVerticalRhythm">
                Manage and administer the Elastic stack
              </h3>
              <KuiFlexGrid className="kuiVerticalRhythmSmall homeTopFeatures" columns={2}>
                { renderDirectories(FeatureCatalogueCategory.ADMIN) }
              </KuiFlexGrid>
            </KuiFlexItem>
          </KuiFlexGroup>
        </div>

        <div className="kuiViewContentItem kuiVerticalRhythmXLarge text-center">

          <h4 className="kuiSubduedText kuiVerticalRhythmSmall">
            {`Didn't find what you were looking for?`}
          </h4>

          <a href="#/home/feature_directory">
            <KuiButton
              className="kuiVerticalRhythmSmall"
              buttonType="secondary"
            >
              View full directory of Kibana features
            </KuiButton>
          </a>

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
