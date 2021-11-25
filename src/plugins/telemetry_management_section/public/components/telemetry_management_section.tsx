/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component, Fragment } from 'react';
import { EuiCallOut, EuiForm, EuiLink, EuiSpacer, EuiSplitPanel, EuiTitle } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import type { TelemetryPluginSetup } from 'src/plugins/telemetry/public';
import type { DocLinksStart, ToastsStart } from 'src/core/public';
import { PRIVACY_STATEMENT_URL } from '../../../telemetry/common/constants';
import { OptInExampleFlyout } from './opt_in_example_flyout';
import { LazyField } from '../../../advanced_settings/public';
import { TrackApplicationView } from '../../../usage_collection/public';

type TelemetryService = TelemetryPluginSetup['telemetryService'];

const SEARCH_TERMS = ['telemetry', 'usage', 'data', 'usage data'];

interface Props {
  telemetryService: TelemetryService;
  onQueryMatchChange: (searchTermMatches: boolean) => void;
  showAppliesSettingMessage: boolean;
  enableSaving: boolean;
  query?: { text: string };
  toasts: ToastsStart;
  docLinks: DocLinksStart['links'];
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
    const { telemetryService } = this.props;
    const { showExample, queryMatches, enabled, processing } = this.state;

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
        <EuiSplitPanel.Outer hasBorder>
          <EuiForm>
            <EuiSplitPanel.Inner color="subdued">
              <EuiTitle>
                <h2>
                  <FormattedMessage id="telemetry.usageDataTitle" defaultMessage="Usage Data" />
                </h2>
              </EuiTitle>
            </EuiSplitPanel.Inner>

            <EuiSplitPanel.Inner>
              {this.maybeGetAppliesSettingMessage()}
              <EuiSpacer size="s" />
              <LazyField
                setting={{
                  type: 'boolean',
                  name: 'telemetry:enabled',
                  displayName: i18n.translate('telemetry.provideUsageDataTitle', {
                    defaultMessage: 'Provide usage data',
                  }),
                  value: enabled,
                  description: this.renderDescription(),
                  defVal: true,
                  ariaName: i18n.translate('telemetry.provideUsageDataAriaName', {
                    defaultMessage: 'Provide usage data',
                  }),
                  requiresPageReload: false,
                  category: [],
                  isOverridden: false,
                  isCustom: true,
                }}
                loading={processing}
                dockLinks={this.props.docLinks}
                toasts={this.props.toasts}
                handleChange={this.toggleOptIn}
                enableSaving={this.props.enableSaving}
              />
            </EuiSplitPanel.Inner>
          </EuiForm>
        </EuiSplitPanel.Outer>
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
    const clusterDataLink = (
      <EuiLink onClick={this.toggleExample} data-test-id="cluster_data_example">
        <FormattedMessage id="telemetry.clusterData" defaultMessage="cluster data" />
      </EuiLink>
    );

    const securityDataLink = (
      <EuiLink
        href="https://www.elastic.co/guide/en/security/current/advanced-settings.html#telemetry-settings"
        data-test-id="endpoint_security_example"
        target="_blank"
      >
        <FormattedMessage id="telemetry.securityData" defaultMessage="security data" />
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
          <FormattedMessage
            id="telemetry.seeExampleOfClusterDataAndEndpointSecuity"
            defaultMessage="See examples of the {clusterData} and {securityData} that we collect."
            values={{
              clusterData: clusterDataLink,
              securityData: securityDataLink,
            }}
          />
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
}

// required for lazy loading
// eslint-disable-next-line import/no-default-export
export default TelemetryManagementSection;
