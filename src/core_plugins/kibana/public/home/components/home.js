import React from 'react';
import PropTypes from 'prop-types';
import { Synopsis } from './synopsis';
import {
  KuiButton,
  KuiBar,
  KuiBarSection,
  KuiFieldGroup,
  KuiFieldGroupSection,
  KuiFlexGroup,
  KuiFlexItem,
  KuiFlexGrid,
} from 'ui_framework/components';

export function Home({ addBasePath, directories, directoryCategories }) {

  const renderDirectories = (category) => {
    return directories.inTitleOrder
    .filter((directory) => {
      return directory.showOnHomePage && directory.category === category;
    })
    .map((directory) => {
      return (
        <KuiFlexItem key={directory.id}>
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
          <KuiBar className="kuiVerticalRhythmSmall">
            <KuiBarSection>
              <h1>
                Welcome to Kibana
              </h1>
            </KuiBarSection>

            <KuiBarSection>
              <KuiFieldGroup>
                <KuiFieldGroupSection>
                  <p className="kuiText kuiSubduedText">
                    Data already in Elasticsearch?
                  </p>
                </KuiFieldGroupSection>
                <KuiFieldGroupSection>
                  <KuiButton buttonType="secondary">
                    <a href={addBasePath('/app/kibana#/management/kibana/index')}>Set up index patterns</a>
                  </KuiButton>
                </KuiFieldGroupSection>
              </KuiFieldGroup>
            </KuiBarSection>
          </KuiBar>
        </div>

        <div className="kuiViewContentItem kuiVerticalRhythmXLarge">
          <KuiFlexGroup className="kuiVerticalRhythm">
            <KuiFlexItem className="kuiPanel">
              <div className="kuiPanelBody">
                <h3 className="kuiSubTitle kuiVerticalRhythm">
                  Visualize and explore data
                </h3>
                <KuiFlexGrid className="kuiVerticalRhythmSmall topFeatures" columns={2}>
                  { renderDirectories(directoryCategories.DATA) }
                </KuiFlexGrid>
              </div>
            </KuiFlexItem>
            <KuiFlexItem className="kuiPanel">
              <div className="kuiPanelBody">
                <h3 className="kuiSubTitle kuiVerticalRhythm">
                  Manage and administer the Elastic stack
                </h3>
                <KuiFlexGrid className="kuiVerticalRhythmSmall topFeatures" columns={2}>
                  { renderDirectories(directoryCategories.ADMIN) }
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
  directories: PropTypes.object.isRequired,
  directoryCategories: PropTypes.object.isRequired
};
