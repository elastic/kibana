import './home.less';
import React from 'react';
import PropTypes from 'prop-types';
import { Synopsis } from './synopsis';
import {
  KuiButton,
  KuiBar,
  KuiBarSection,
  KuiFieldGroup,
  KuiFieldGroupSection,
  KuiCardGroup,
  KuiCard,
  KuiCardDescription,
  KuiCardDescriptionTitle,
  KuiCardDescriptionText,
  KuiCardFooter,
  KuiLinkButton
} from 'ui_framework/components';

export function Home({ addBasePath, directories, directoryCategories }) {

  const renderDirectories = (category) => {
    return directories.inTitleOrder
    .filter((directory) => {
      return directory.showOnHomePage && directory.category === category;
    })
    .map((directory) => {
      return (
        <Synopsis
          key={directory.id}
          description={directory.description}
          title={directory.title}
          url={addBasePath(directory.path)}
        />
      );
    });
  };

  const renderPromo = () => {
    const cardStyle = {
      width: '250px',
      'minWidth': '200px'
    };
    return (
      <KuiCardGroup className="kuiVerticalRhythmSmall">
        <KuiCard style={cardStyle}>
          <KuiCardDescription>
            <KuiCardDescriptionTitle>
              APM
            </KuiCardDescriptionTitle>

            <KuiCardDescriptionText>
              APM helps you locate and fix performance bottlenecks in your application
            </KuiCardDescriptionText>
          </KuiCardDescription>

          <KuiCardFooter>
            <KuiLinkButton
              buttonType="secondary"
              href={addBasePath('/app/kibana#/home/directory/data_sources')}
            >
              Learn more
            </KuiLinkButton>
          </KuiCardFooter>
        </KuiCard>

        <KuiCard style={cardStyle}>
          <KuiCardDescription>
            <KuiCardDescriptionTitle>
              Logging
            </KuiCardDescriptionTitle>

            <KuiCardDescriptionText>
              Injest data from popular logging platforms and get immediate dashboards.
            </KuiCardDescriptionText>
          </KuiCardDescription>

          <KuiCardFooter>
            <KuiLinkButton
              buttonType="secondary"
              href={addBasePath('/app/kibana#/home/directory/data_sources')}
            >
              Select data source
            </KuiLinkButton>
          </KuiCardFooter>
        </KuiCard>

        <KuiCard style={cardStyle}>
          <KuiCardDescription>
            <KuiCardDescriptionTitle>
              Metrics
            </KuiCardDescriptionTitle>

            <KuiCardDescriptionText>
              Choose from Apache, MongoDB, Docker, MySQL, and more...
            </KuiCardDescriptionText>
          </KuiCardDescription>

          <KuiCardFooter>
            <KuiLinkButton
              buttonType="secondary"
              href={addBasePath('/app/kibana#/home/directory/data_sources')}
            >
              Select data source
            </KuiLinkButton>
          </KuiCardFooter>
        </KuiCard>

        <KuiCard style={cardStyle}>
          <KuiCardDescription>
            <KuiCardDescriptionTitle>
              Security analytics
            </KuiCardDescriptionTitle>

            <KuiCardDescriptionText>
              Ingest data from popular security solutions and get immediately insights.
            </KuiCardDescriptionText>
          </KuiCardDescription>

          <KuiCardFooter>
            <KuiLinkButton
              buttonType="secondary"
              href={addBasePath('/app/kibana#/home/directory/data_sources')}
            >
              Select data source
            </KuiLinkButton>
          </KuiCardFooter>
        </KuiCard>
      </KuiCardGroup>
    );
  };

  return (
    <div className="kuiView home">
      <div className="kuiViewContent kuiViewContent--constrainedWidth">
        <div className="kuiViewContentItem kuiVerticalRhythm">
          <KuiBar className="kuiVerticalRhythmSmall">
            <KuiBarSection>
              <div className="kuiTitle">
                Add data to Kibana
              </div>
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

          <p className="kuiText kuiSubduedText kuiVerticalRhythmSmall">
            These turn-key solutions will help you quickly add data into Kibana and turn it into
            pre-built dashboards / monitoring systems.
          </p>

          { renderPromo() }

        </div>

        <div className="kuiViewContentItem kuiVerticalRhythm">
          <KuiBar className="kuiVerticalRhythmSmall">
            <KuiBarSection>
              <div className="kuiTitle">
                Feature directory
              </div>
            </KuiBarSection>

            <KuiBarSection>
              <KuiFieldGroup>
                <KuiFieldGroupSection>
                  <KuiButton buttonType="secondary">
                    <a href="#/home/directory">View feature directory</a>
                  </KuiButton>
                </KuiFieldGroupSection>
              </KuiFieldGroup>
            </KuiBarSection>
          </KuiBar>

          <div className="homeDirectoryPreview kuiVerticalRhythmSmall">
            <div className="kuiPanel homeDirectoryPreview__panel">
              <div className="kuiPanelBody">
                <h3 className="kuiSubTitle">
                  Visualize and explore data
                </h3>
                { renderDirectories(directoryCategories.DATA) }
              </div>
            </div>

            <div className="kuiPanel homeDirectoryPreview__panel">
              <div className="kuiPanelBody">
                <h3 className="kuiSubTitle">
                  Manage and administer the Elastic stack
                </h3>
                { renderDirectories(directoryCategories.ADMIN) }
              </div>
            </div>
          </div>

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
