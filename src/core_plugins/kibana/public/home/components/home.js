import React from 'react';
import PropTypes from 'prop-types';
import { Synopsis } from './synopsis';
import {
  KuiLinkButton,
  KuiCardGroup,
  KuiCard,
  KuiCardDescription,
  KuiCardDescriptionTitle,
  KuiCardDescriptionText,
  KuiCardFooter,
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
  EuiTextColor,
} from '@elastic/eui';

import { FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

import chrome from 'ui/chrome';
const kbnBaseUrl = chrome.getInjected('kbnBaseUrl');

export function Home({ addBasePath, directories, isCloudEnabled }) {

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

  const renderPromo = () => {
    const cardStyle = {
      width: '250px',
      'minWidth': '200px'
    };

    let apmCard;
    if (!isCloudEnabled) {
      apmCard = (
        <KuiCard style={cardStyle} className="euiPanel">
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
              APM automatically collects in-depth performance metrics and errors from inside your applications.
            </KuiCardDescriptionText>
          </KuiCardDescription>

          <KuiCardFooter>
            <KuiLinkButton
              buttonType="secondary"
              href={addBasePath(`${kbnBaseUrl}#/home/tutorial/apm`)}
            >
              Add APM
            </KuiLinkButton>
          </KuiCardFooter>
        </KuiCard>
      );
    }
    return (
      <div className="kuiVerticalRhythm">
        <KuiCardGroup>

          {apmCard}

          <KuiCard style={cardStyle} className="euiPanel">
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
                Ingest logs from popular data sources and easily visualize in preconfigured dashboards.
              </KuiCardDescriptionText>
            </KuiCardDescription>

            <KuiCardFooter>
              <KuiLinkButton
                buttonType="secondary"
                href={addBasePath(`${kbnBaseUrl}#/home/tutorial_directory/logging`)}
              >
                Add log data
              </KuiLinkButton>
            </KuiCardFooter>
          </KuiCard>

          <KuiCard style={cardStyle} className="euiPanel">
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
                Collect metrics from the operating system and services running on your servers.
              </KuiCardDescriptionText>
            </KuiCardDescription>

            <KuiCardFooter>
              <KuiLinkButton
                buttonType="secondary"
                href={addBasePath(`${kbnBaseUrl}#/home/tutorial_directory/metrics`)}
              >
                Add metric data
              </KuiLinkButton>
            </KuiCardFooter>
          </KuiCard>

          <KuiCard style={cardStyle} className="euiPanel">
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
                Centralize security events for interactive investigation in ready-to-go visualizations.
              </KuiCardDescriptionText>
            </KuiCardDescription>

            <KuiCardFooter>
              <KuiLinkButton
                buttonType="secondary"
                href={addBasePath(`${kbnBaseUrl}#/home/tutorial_directory/security`)}
              >
                Add security events
              </KuiLinkButton>
            </KuiCardFooter>
          </KuiCard>
        </KuiCardGroup>
      </div>
    );
  };

  return (
    <EuiPage className="home">

      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="flexEnd"
      >
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>Add Data to Kibana</h1>
          </EuiTitle>
          <EuiText>
            <p>
              Use these solutions to quickly turn your data into pre-built dashboards and monitoring systems.
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiTextColor color="subdued">
            <EuiText>
              <p>
                Data already in Elasticsearch?
              </p>
            </EuiText>
          </EuiTextColor>
          <EuiSpacer size="s" />
          <a href="#/management/kibana/index" className="euiButton euiButton--primary euiButton--small">
            <span className="euiButton__content">
              Set up index patterns
            </span>
          </a>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />


      { renderPromo() }

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
  })),
  isCloudEnabled: PropTypes.bool.isRequired,
};
