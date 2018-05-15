import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiCardGroup,
  KuiCard,
  KuiCardDescription,
  KuiCardDescriptionTitle,
  KuiCardDescriptionText,
  KuiCardFooter,
} from '@kbn/ui-framework/components';

import {
  EuiButton,
  EuiLink,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';

export function AddData({ addBasePath, apmUiEnabled }) {

  const renderCards = () => {
    const cardStyle = {
      width: '250px',
      'minWidth': '200px',
      'border': 'none'
    };

    const getApmCard = () =>  (
      <KuiCard style={cardStyle}>
        <KuiCardDescription>
          <KuiCardDescriptionTitle>
            <img
              src={addBasePath('/plugins/kibana/assets/app_apm.svg')}
              alt="APM application icon"
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
            href="#/home/tutorial/apm"
          >
            Add APM
          </EuiButton>
        </KuiCardFooter>
      </KuiCard>
    );

    return (
      <div className="kuiVerticalRhythm">
        <KuiCardGroup>

          {apmUiEnabled !== false && getApmCard()}

          <KuiCard style={cardStyle}>
            <KuiCardDescription>
              <KuiCardDescriptionTitle>
                <img
                  src={addBasePath('/plugins/kibana/assets/app_logging.svg')}
                  alt="Logging icon"
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
                href="#/home/tutorial_directory/logging"
              >
                Add log data
              </EuiButton>
            </KuiCardFooter>
          </KuiCard>

          <KuiCard style={cardStyle}>
            <KuiCardDescription>
              <KuiCardDescriptionTitle>
                <img
                  src={addBasePath('/plugins/kibana/assets/app_monitoring.svg')}
                  alt="Monitoring icon"
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
                href="#/home/tutorial_directory/metrics"
              >
                Add metric data
              </EuiButton>
            </KuiCardFooter>
          </KuiCard>

          <KuiCard style={cardStyle}>
            <KuiCardDescription>
              <KuiCardDescriptionTitle>
                <img
                  src={addBasePath('/plugins/kibana/assets/app_security.svg')}
                  alt="Security icon"
                />
                <p>
                  Security Analytics
                </p>
              </KuiCardDescriptionTitle>

              <KuiCardDescriptionText>
                Centralize security events for interactive investigation in ready-to-go visualizations.
              </KuiCardDescriptionText>
            </KuiCardDescription>

            <KuiCardFooter>
              <EuiButton
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
      <EuiFlexGroup>
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
      </EuiFlexGroup>

      <EuiSpacer />

      {renderCards()}

      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiText>
            <span style={{ height: 38 }}>
              Data already in Elasticsearch?
            </span>
            <EuiLink
              style={{ marginLeft: 8 }}
              href="#/management/kibana/index"
            >
              Set up index patterns
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

    </EuiPanel>
  );
}

AddData.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  apmUiEnabled: PropTypes.bool.isRequired,
};
