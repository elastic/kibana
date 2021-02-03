/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiCallOut,
  EuiPanel,
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { TelemetryPluginSetup } from 'src/plugins/telemetry/public';
import { PRIVACY_STATEMENT_URL } from '../../../telemetry/common/constants';
import { OptInExampleFlyout } from './opt_in_example_flyout';
import { OptInSecurityExampleFlyout } from './opt_in_security_example_flyout';
import { LazyField } from '../../../advanced_settings/public';
import { ToastsStart } from '../../../../core/public';
import { TrackApplicationView } from '../../../usage_collection/public';

type TelemetryService = TelemetryPluginSetup['telemetryService'];

const SEARCH_TERMS = ['telemetry', 'usage', 'data', 'usage data'];

interface Props {
  telemetryService: TelemetryService;
  onQueryMatchChange: (searchTermMatches: boolean) => void;
  isSecurityExampleEnabled: () => boolean;
  showAppliesSettingMessage: boolean;
  enableSaving: boolean;
  query?: { text: string };
  toasts: ToastsStart;
}

interface State {
  processing: boolean;
  showExample: boolean;
  showSecurityExample: boolean;
  queryMatches: boolean | null;
  enabled: boolean;
}

export class TelemetryManagementSection extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      processing: false,
      showExample: false,
      showSecurityExample: false,
      queryMatches: props.query ? this.checkQueryMatch(props.query) : null,
      enabled: this.props.telemetryService.getIsOptedIn() || false,
    };
  }

  UNSAFE_componentWillReceiveProps(nextProps: Props) {
    const { query } = nextProps;
    const queryMatches = this.checkQueryMatch(query);

    if (queryMatches !== this.state.queryMatches) {
      this.setState(
        {
          queryMatches,
        },
        () => {
          this.props.onQueryMatchChange(queryMatches);
        }
      );
    }
  }

  checkQueryMatch(query?: { text: string }): boolean {
    const searchTerm = (query?.text ?? '').toLowerCase();
    return (
      this.props.telemetryService.getCanChangeOptInStatus() &&
      SEARCH_TERMS.some((term) => term.indexOf(searchTerm) >= 0)
    );
  }

  render() {
    const { telemetryService, isSecurityExampleEnabled } = this.props;
    const { showExample, showSecurityExample, queryMatches, enabled, processing } = this.state;
    const securityExampleEnabled = isSecurityExampleEnabled();

    if (!telemetryService.getCanChangeOptInStatus()) {
      return null;
    }

    if (queryMatches !== null && !queryMatches) {
      return null;
    }

    return (
      <Fragment>
        {showExample && (
          <TrackApplicationView viewId="optInExampleFlyout">
            <OptInExampleFlyout
              fetchExample={telemetryService.fetchExample}
              onClose={this.toggleExample}
            />
          </TrackApplicationView>
        )}
        {showSecurityExample && securityExampleEnabled && (
          <TrackApplicationView viewId="optInSecurityExampleFlyout">
            <OptInSecurityExampleFlyout onClose={this.toggleSecurityExample} />
          </TrackApplicationView>
        )}
        <EuiPanel paddingSize="l">
          <EuiForm>
            <EuiText>
              <EuiFlexGroup alignItems="baseline">
                <EuiFlexItem grow={false}>
                  <h2>
                    <FormattedMessage id="telemetry.usageDataTitle" defaultMessage="Usage Data" />
                  </h2>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiText>

            {this.maybeGetAppliesSettingMessage()}
            <EuiSpacer size="s" />
            <LazyField
              setting={
                {
                  type: 'boolean',
                  name: 'telemetry:enabled',
                  displayName: i18n.translate('telemetry.provideUsageStatisticsTitle', {
                    defaultMessage: 'Provide usage statistics',
                  }),
                  value: enabled,
                  description: this.renderDescription(),
                  defVal: true,
                  ariaName: i18n.translate('telemetry.provideUsageStatisticsAriaName', {
                    defaultMessage: 'Provide usage statistics',
                  }),
                } as any
              }
              loading={processing}
              dockLinks={null as any}
              toasts={null as any}
              handleChange={this.toggleOptIn}
              enableSaving={this.props.enableSaving}
            />
          </EuiForm>
        </EuiPanel>
      </Fragment>
    );
  }

  maybeGetAppliesSettingMessage = () => {
    if (!this.props.showAppliesSettingMessage) {
      return null;
    }
    return (
      <EuiCallOut
        color="primary"
        iconType="spacesApp"
        title={
          <p>
            <FormattedMessage
              id="telemetry.callout.appliesSettingTitle"
              defaultMessage="Changes to this setting apply to {allOfKibanaText} and are saved automatically."
              values={{
                allOfKibanaText: (
                  <strong>
                    <FormattedMessage
                      id="telemetry.callout.appliesSettingTitle.allOfKibanaText"
                      defaultMessage="all of Kibana"
                    />
                  </strong>
                ),
              }}
            />
          </p>
        }
      />
    );
  };

  renderDescription = () => {
    const { isSecurityExampleEnabled } = this.props;
    const securityExampleEnabled = isSecurityExampleEnabled();
    const clusterDataLink = (
      <EuiLink onClick={this.toggleExample} data-test-id="cluster_data_example">
        <FormattedMessage id="telemetry.clusterData" defaultMessage="cluster data" />
      </EuiLink>
    );

    const endpointSecurityDataLink = (
      <EuiLink onClick={this.toggleSecurityExample} data-test-id="endpoint_security_example">
        <FormattedMessage id="telemetry.securityData" defaultMessage="endpoint security data" />
      </EuiLink>
    );

    return (
      <Fragment>
        <p>
          <FormattedMessage
            id="telemetry.telemetryConfigAndLinkDescription"
            defaultMessage="Enabling data usage collection helps us manage and improve our products and services.
            See our {privacyStatementLink} for more details."
            values={{
              privacyStatementLink: (
                <EuiLink href={PRIVACY_STATEMENT_URL} target="_blank">
                  <FormattedMessage
                    id="telemetry.readOurUsageDataPrivacyStatementLinkText"
                    defaultMessage="Privacy Statement"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
        <p>
          {securityExampleEnabled ? (
            <FormattedMessage
              id="telemetry.seeExampleOfClusterDataAndEndpointSecuity"
              defaultMessage="See examples of the {clusterData} and {endpointSecurityData} that we collect."
              values={{
                clusterData: clusterDataLink,
                endpointSecurityData: endpointSecurityDataLink,
              }}
            />
          ) : (
            <FormattedMessage
              id="telemetry.seeExampleOfClusterData"
              defaultMessage="See an example of the {clusterData} that we collect."
              values={{
                clusterData: clusterDataLink,
              }}
            />
          )}
        </p>
      </Fragment>
    );
  };

  toggleOptIn = async (): Promise<boolean> => {
    const { telemetryService, toasts } = this.props;
    const newOptInValue = !this.state.enabled;

    return new Promise((resolve, reject) => {
      this.setState(
        {
          processing: true,
          enabled: newOptInValue,
        },
        async () => {
          try {
            await telemetryService.setOptIn(newOptInValue);
            this.setState({ processing: false });
            toasts.addSuccess(
              newOptInValue
                ? i18n.translate('telemetry.optInSuccessOn', {
                    defaultMessage: 'Usage data collection turned on.',
                  })
                : i18n.translate('telemetry.optInSuccessOff', {
                    defaultMessage: 'Usage data collection turned off.',
                  })
            );
            resolve(true);
          } catch (err) {
            this.setState({ processing: false });
            reject(err);
          }
        }
      );
    });
  };

  toggleExample = () => {
    this.setState({
      showExample: !this.state.showExample,
    });
  };

  toggleSecurityExample = () => {
    const { isSecurityExampleEnabled } = this.props;
    const securityExampleEnabled = isSecurityExampleEnabled();
    if (!securityExampleEnabled) return;
    this.setState({
      showSecurityExample: !this.state.showSecurityExample,
    });
  };
}

// required for lazy loading
// eslint-disable-next-line import/no-default-export
export default TelemetryManagementSection;
