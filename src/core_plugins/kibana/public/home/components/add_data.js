import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiCardGroup,
  KuiCard,
  KuiCardDescription,
  KuiCardDescriptionTitle,
  KuiCardDescriptionText,
  KuiCardFooter,
} from 'ui_framework/components';

import {
  EuiButton,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';

export function AddData({ addBasePath, isCloudEnabled }) {

  const renderCards = () => {
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
            <EuiButton
              buttonType="secondary"
              href="#/home/tutorial/apm"
            >
              Add APM
            </EuiButton>
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
              <EuiButton
                buttonType="secondary"
                href="#/home/tutorial_directory/logging"
              >
                Add log data
              </EuiButton>
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
              <EuiButton
                buttonType="secondary"
                href="#/home/tutorial_directory/metrics"
              >
                Add metric data
              </EuiButton>
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
              <EuiButton
                buttonType="secondary"
                href="#/home/tutorial_directory/security"
              >
                Add security events
              </EuiButton>
            </KuiCardFooter>
          </KuiCard>
        </KuiCardGroup>
      </div>
    );
  };

  return (
    <EuiPanel paddingSize="l">
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="flexEnd"
      >
        <EuiFlexItem>
          <EuiTitle>
            <h3>Add Data to Kibana</h3>
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

      {renderCards()}

    </EuiPanel>
  );
}

AddData.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  isCloudEnabled: PropTypes.bool.isRequired,
};
