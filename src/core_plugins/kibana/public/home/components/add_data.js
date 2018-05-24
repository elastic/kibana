import './add_data.less';
import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiButton,
  EuiLink,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiCard,
  EuiIcon,
  EuiHorizontalRule,
} from '@elastic/eui';

export function AddData({ apmUiEnabled }) {

  const renderCards = () => {
    const getApmCard = () =>  (
      <EuiFlexItem>
        <EuiCard
          className="addDataCard"
          icon={<EuiIcon className="addDataIcon" type="apmApp" />}
          title="APM"
          description="APM automatically collects in-depth performance metrics and errors from inside your applications."
          footer={
            <EuiButton
              className="addDataButton"
              href="#/home/tutorial/apm"
            >
              Add APM
            </EuiButton>
          }
        />
      </EuiFlexItem>
    );

    return (
      <EuiFlexGroup wrap gutterSize="none">

        {apmUiEnabled !== false && getApmCard()}

        <EuiFlexItem>
          <EuiCard
            className="addDataCard"
            icon={<EuiIcon  className="addDataIcon" type="loggingApp" />}
            title="Logging"
            description="Ingest logs from popular data sources and easily visualize in preconfigured dashboards."
            footer={
              <EuiButton
                className="addDataButton"
                href="#/home/tutorial_directory/logging"
              >
                Add log data
              </EuiButton>
            }
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiCard
            className="addDataCard"
            icon={<EuiIcon className="addDataIcon" type="monitoringApp" />}
            title="Metrics"
            description="Collect metrics from the operating system and services running on your servers."
            footer={
              <EuiButton
                className="addDataButton"
                href="#/home/tutorial_directory/metrics"
              >
                Add metric data
              </EuiButton>
            }
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiCard
            className="addDataCard"
            icon={<EuiIcon className="addDataIcon" type="securityApp" />}
            title="Security Analytics"
            description="Centralize security events for interactive investigation in ready-to-go visualizations."
            footer={
              <EuiButton
                className="addDataButton"
                href="#/home/tutorial_directory/security"
              >
                Add security events
              </EuiButton>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
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

      <EuiHorizontalRule />

      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiText>
            <strong style={{ height: 38 }}>
              Fresh Elastic stack installation?
            </strong>
            <EuiLink
              style={{ marginLeft: 8 }}
              href="#/home/tutorial_directory/sampleData"
            >
              Try some sample data sets
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            <strong style={{ height: 38 }}>
              Data already in Elasticsearch?
            </strong>
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
  apmUiEnabled: PropTypes.bool.isRequired,
};
