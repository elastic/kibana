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
  KuiLinkButton,
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

  const renderPromo = () => {
    const cardStyle = {
      width: '250px',
      'minWidth': '200px'
    };
    return (
      <div className="kuiVerticalRhythm">
        <KuiCardGroup>
          <KuiCard style={cardStyle}>
            <KuiCardDescription>
              <KuiCardDescriptionTitle>
                <img
                  src={addBasePath('/plugins/kibana/assets/app_apm.svg')}
                />
                <p>
                  APM
                </p>
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
                <img
                  src={addBasePath('/plugins/kibana/assets/app_logging.svg')}
                />
                <p>
                  Logging
                </p>
              </KuiCardDescriptionTitle>

              <KuiCardDescriptionText>
                Ingest data from popular logging platforms and get immediate dashboards.
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
                <img
                  src={addBasePath('/plugins/kibana/assets/app_monitoring.svg')}
                />
                <p>
                  Metrics
                </p>
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
                <img
                  src={addBasePath('/plugins/kibana/assets/app_security.svg')}
                />
                <p>
                  Security analytics
                </p>
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
      </div>
    );
  };

  return (
    <div className="kuiView home">
      <div className="kuiViewContent kuiViewContent--constrainedWidth">
        <div className="kuiViewContentItem kuiVerticalRhythmXLarge">
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

          <p className="kuiText kuiSubduedText kuiVerticalRhythm kuiVerticalRhythmSmall">
            These turn-key solutions will help you quickly add data into Kibana and turn it into
            pre-built dashboards / monitoring systems.
          </p>

          { renderPromo() }

        </div>

        <div className="kuiViewContentItem kuiVerticalRhythmXLarge">
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
                    <a href="#/home/directory">View full feature directory</a>
                  </KuiButton>
                </KuiFieldGroupSection>
              </KuiFieldGroup>
            </KuiBarSection>
          </KuiBar>

          <p className="kuiText kuiSubduedText kuiVerticalRhythm kuiVerticalRhythmSmall">
            Use Kibana to visualize data and adminster your Elastic stack.
          </p>

          <KuiFlexGroup className="kuiVerticalRhythm">
            <KuiFlexItem className="kuiPanel">
              <div className="kuiPanelBody">
                <h3 className="kuiSubTitle kuiVerticalRhythm">
                  Visualize and explore data
                </h3>
                <KuiFlexGrid className="kuiVerticalRhythmSmall" columns={2}>
                  { renderDirectories(directoryCategories.DATA) }
                </KuiFlexGrid>
              </div>
            </KuiFlexItem>
            <KuiFlexItem className="kuiPanel">
              <div className="kuiPanelBody">
                <h3 className="kuiSubTitle kuiVerticalRhythm">
                  Manage and administer the Elastic stack
                </h3>
                <KuiFlexGrid className="kuiVerticalRhythmSmall" columns={2}>
                  { renderDirectories(directoryCategories.ADMIN) }
                </KuiFlexGrid>
              </div>
            </KuiFlexItem>
          </KuiFlexGroup>

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
