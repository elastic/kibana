/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';

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
  EuiFlexGrid,
} from '@elastic/eui';

/* istanbul ignore next */
const basePath = chrome.getBasePath();

const AddDataUi = ({ apmUiEnabled, isNewKibanaInstance, intl, mlEnabled }) => {

  const renderCards = () => {
    const apmTitle = intl.formatMessage({
      id: 'kbn.home.addData.apm.nameTitle', defaultMessage: 'APM'
    });
    const apmDescription = intl.formatMessage({
      id: 'kbn.home.addData.apm.nameDescription',
      defaultMessage: 'APM automatically collects in-depth performance metrics and errors from inside your applications.'
    });
    const loggingTitle = intl.formatMessage({
      id: 'kbn.home.addData.logging.nameTitle', defaultMessage: 'Logging'
    });
    const loggingDescription = intl.formatMessage({
      id: 'kbn.home.addData.logging.nameDescription',
      defaultMessage: 'Ingest logs from popular data sources and easily visualize in preconfigured dashboards.'
    });
    const metricsTitle = intl.formatMessage({
      id: 'kbn.home.addData.metrics.nameTitle', defaultMessage: 'Metrics'
    });
    const metricsDescription = intl.formatMessage({
      id: 'kbn.home.addData.metrics.nameDescription',
      defaultMessage: 'Collect metrics from the operating system and services running on your servers.'
    });
    const securityTitle = intl.formatMessage({
      id: 'kbn.home.addData.security.nameTitle', defaultMessage: 'Security analytics'
    });
    const securityDescription = intl.formatMessage({
      id: 'kbn.home.addData.security.nameDescription',
      defaultMessage: 'Centralize security events for interactive investigation in ready-to-go visualizations.'
    });

    const getApmCard = () =>  (
      <EuiFlexItem>
        <EuiCard
          className="homAddData__card"
          icon={<EuiIcon className="homAddData__icon" type="apmApp" />}
          title={apmTitle}
          description={apmDescription}
          footer={
            <EuiButton
              className="homAddData__button"
              href="#/home/tutorial/apm"
            >
              <FormattedMessage
                id="kbn.home.addData.apm.addApmButtonLabel"
                defaultMessage="Add APM"
              />
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
            className="homAddData__card"
            icon={<EuiIcon  className="homAddData__icon" type="loggingApp" />}
            title={loggingTitle}
            description={loggingDescription}
            footer={
              <EuiButton
                className="homAddData__button"
                href="#/home/tutorial_directory/logging"
              >
                <FormattedMessage
                  id="kbn.home.addData.logging.addLogDataButtonLabel"
                  defaultMessage="Add log data"
                />
              </EuiButton>
            }
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiCard
            className="homAddData__card"
            icon={<EuiIcon className="homAddData__icon" type="monitoringApp" />}
            title={metricsTitle}
            description={metricsDescription}
            footer={
              <EuiButton
                className="homAddData__button"
                href="#/home/tutorial_directory/metrics"
              >
                <FormattedMessage
                  id="kbn.home.addData.metrics.addMetricsDataButtonLabel"
                  defaultMessage="Add metric data"
                />
              </EuiButton>
            }
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiCard
            className="homAddData__card"
            icon={<EuiIcon className="homAddData__icon" type="securityApp" />}
            title={securityTitle}
            description={securityDescription}
            footer={
              <EuiButton
                className="homAddData__button"
                href="#/home/tutorial_directory/security"
              >
                <FormattedMessage
                  id="kbn.home.addData.security.addSecurityEventsButtonLabel"
                  defaultMessage="Add security events"
                />
              </EuiButton>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const footerItemClasses = classNames('homAddData__footerItem', { 'homAddData__footerItem--highlight': isNewKibanaInstance });

  return (
    <EuiPanel paddingSize="l">
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle>
            <h3>
              <FormattedMessage
                id="kbn.home.addData.addDataToKibanaTitle"
                defaultMessage="Add Data to Kibana"
              />
            </h3>
          </EuiTitle>
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="kbn.home.addData.addDataToKibanaDescription"
                defaultMessage="Use these solutions to quickly turn your data into pre-built dashboards and monitoring systems."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      {renderCards()}

      <EuiHorizontalRule />

      <EuiFlexGrid columns={mlEnabled !== false ? 3 : 2}>
        <EuiFlexItem className={footerItemClasses}>
          <EuiText size="s">
            <strong style={{ height: 38 }}>
              <FormattedMessage
                id="kbn.home.addData.sampleDataTitle"
                defaultMessage="Add sample data"
              />
            </strong>
            <EuiLink
              style={{ display: 'block', textAlign: 'center' }}
              href="#/home/tutorial_directory/sampleData"
            >
              <FormattedMessage
                id="kbn.home.addData.sampleDataLink"
                defaultMessage="Load a data set and a Kibana dashboard"
              />
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
        {mlEnabled !== false ?
          <EuiFlexItem className={footerItemClasses}>
            <EuiText size="s">
              <strong style={{ height: 38 }}>
                <FormattedMessage
                  id="kbn.home.addData.uploadFileTitle"
                  defaultMessage="Upload data from log file"
                />
              </strong>
              <EuiLink
                style={{ display: 'block', textAlign: 'center' }}
                href={`${basePath}/app/ml#/filedatavisualizer`}
              >
                <FormattedMessage
                  id="kbn.home.addData.uploadFileLink"
                  defaultMessage="Import a CSV, NDJSON, or log file"
                />
              </EuiLink>
            </EuiText>
          </EuiFlexItem>
          : null
        }
        <EuiFlexItem className={footerItemClasses}>
          <EuiText size="s">
            <strong style={{ height: 38 }}>
              <FormattedMessage
                id="kbn.home.addData.yourDataTitle"
                defaultMessage="Use Elasticsearch data"
              />
            </strong>
            <EuiLink
              style={{ display: 'block', textAlign: 'center' }}
              href="#/management/kibana/index"
            >
              <FormattedMessage
                id="kbn.home.addData.yourDataLink"
                defaultMessage="Connect to your Elasticsearch index"
              />
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiPanel>
  );
};

AddDataUi.propTypes = {
  apmUiEnabled: PropTypes.bool.isRequired,
  mlEnabled: PropTypes.bool.isRequired,
  isNewKibanaInstance: PropTypes.bool.isRequired,
};

export const AddData = injectI18n(AddDataUi);
