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
import { getServices } from '../../kibana_services';

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

const AddDataUi = ({ apmUiEnabled, isNewKibanaInstance, intl, mlEnabled }) => {
  const basePath = getServices().getBasePath();
  const renderCards = () => {
    const apmData = {
      title: intl.formatMessage({
        id: 'kbn.home.addData.apm.nameTitle',
        defaultMessage: 'APM',
      }),
      description: intl.formatMessage({
        id: 'kbn.home.addData.apm.nameDescription',
        defaultMessage:
          'APM automatically collects in-depth performance metrics and errors from inside your applications.',
      }),
      ariaDescribedby: 'aria-describedby.addAmpButtonLabel',
    };
    const loggingData = {
      title: intl.formatMessage({
        id: 'kbn.home.addData.logging.nameTitle',
        defaultMessage: 'Logs',
      }),
      description: intl.formatMessage({
        id: 'kbn.home.addData.logging.nameDescription',
        defaultMessage:
          'Ingest logs from popular data sources and easily visualize in preconfigured dashboards.',
      }),
      ariaDescribedby: 'aria-describedby.addLogDataButtonLabel',
    };
    const metricsData = {
      title: intl.formatMessage({
        id: 'kbn.home.addData.metrics.nameTitle',
        defaultMessage: 'Metrics',
      }),
      description: intl.formatMessage({
        id: 'kbn.home.addData.metrics.nameDescription',
        defaultMessage:
          'Collect metrics from the operating system and services running on your servers.',
      }),
      ariaDescribedby: 'aria-describedby.addMetricsButtonLabel',
    };
    const siemData = {
      title: intl.formatMessage({
        id: 'kbn.home.addData.siem.nameTitle',
        defaultMessage: 'SIEM',
      }),
      description: intl.formatMessage({
        id: 'kbn.home.addData.siem.nameDescription',
        defaultMessage:
          'Centralize security events for interactive investigation in ready-to-go visualizations.',
      }),
      ariaDescribedby: 'aria-describedby.addSiemButtonLabel',
    };

    const getApmCard = () => (
      <EuiFlexItem grow={false}>
        <EuiCard
          className="homAddData__card"
          titleSize="xs"
          title={apmData.title}
          description={<span id={apmData.ariaDescribedby}>{apmData.description}</span>}
          footer={
            <EuiButton
              className="homAddData__button"
              href="#/home/tutorial/apm"
              aria-describedby={apmData.ariaDescribedby}
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
      <EuiFlexGroup
        className="homeAddData__flexGroup homAddData__flexTablet"
        wrap={apmUiEnabled}
        gutterSize="l"
        justifyContent="spaceAround"
        responsive={false}
      >
        <EuiFlexItem className="homAddData__cardDivider">
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="spaceAround" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon size="xxl" type="logoObservability" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <h2>
                      <FormattedMessage
                        id="kbn.home.addData.title.observability"
                        defaultMessage="Observability"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiFlexGroup
            className="homeAddData__flexGroup"
            wrap={apmUiEnabled}
            gutterSize="l"
            justifyContent="spaceAround"
            responsive={false}
          >
            {apmUiEnabled !== false && getApmCard()}

            <EuiFlexItem grow={false}>
              <EuiCard
                className="homAddData__card"
                title={loggingData.title}
                titleSize="xs"
                description={
                  <span id={loggingData.ariaDescribedby}>{loggingData.description}</span>
                }
                footer={
                  <EuiButton
                    className="homAddData__button"
                    href="#/home/tutorial_directory/logging"
                    aria-describedby={loggingData.ariaDescribedby}
                  >
                    <FormattedMessage
                      id="kbn.home.addData.logging.addLogDataButtonLabel"
                      defaultMessage="Add log data"
                    />
                  </EuiButton>
                }
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiCard
                className="homAddData__card"
                title={metricsData.title}
                titleSize="xs"
                description={
                  <span id={metricsData.ariaDescribedby}>{metricsData.description}</span>
                }
                footer={
                  <EuiButton
                    className="homAddData__button"
                    href="#/home/tutorial_directory/metrics"
                    aria-describedby={metricsData.ariaDescribedby}
                  >
                    <FormattedMessage
                      id="kbn.home.addData.metrics.addMetricsDataButtonLabel"
                      defaultMessage="Add metric data"
                    />
                  </EuiButton>
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="spaceAround" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon size="xxl" type="logoSecurity" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <h2>
                      <FormattedMessage
                        id="kbn.home.addData.title.security"
                        defaultMessage="Security"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiCard
            titleSize="xs"
            className="homAddData__card"
            title={siemData.title}
            description={<span id={siemData.ariaDescribedby}>{siemData.description}</span>}
            footer={
              <EuiButton
                className="homAddData__button"
                href="#/home/tutorial_directory/siem"
                aria-describedby={siemData.ariaDescribedby}
              >
                <FormattedMessage
                  id="kbn.home.addData.siem.addSiemEventsButtonLabel"
                  defaultMessage="Add events"
                />
              </EuiButton>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const footerItemClasses = classNames('homAddData__footerItem', {
    'homAddData__footerItem--highlight': isNewKibanaInstance,
  });

  return (
    <EuiPanel paddingSize="l">
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
        {mlEnabled !== false ? (
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
        ) : null}
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
              href="#/management/kibana/index_pattern"
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
