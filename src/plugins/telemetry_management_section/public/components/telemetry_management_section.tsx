/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiCallOut,
  EuiForm,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSplitPanel,
  EuiTitle,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { TelemetryPluginSetup } from '@kbn/telemetry-plugin/public';
import type { DocLinksStart, ToastsStart } from '@kbn/core/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { getFieldDefinition } from '@kbn/management-settings-field-definition';
import { UiSettingMetadata } from '@kbn/management-settings-types';
import { FieldRowProvider } from '@kbn/management-settings-components-field-row';
import { ValueValidation } from '@kbn/core-ui-settings-browser/src/types';
import { OptInExampleFlyout } from './opt_in_example_flyout';

type TelemetryService = TelemetryPluginSetup['telemetryService'];

interface Props {
  telemetryService: TelemetryService;
  showAppliesSettingMessage: boolean;
  enableSaving: boolean;
  toasts: ToastsStart;
  docLinks: DocLinksStart['links'];
}

interface State {
  processing: boolean;
  showExample: boolean;
  showSecurityExample: boolean;
  enabled: boolean;
}

const LazyFieldRow = React.lazy(async () => ({
  default: (await import('@kbn/management-settings-components-field-row')).FieldRow,
}));

const FieldRow = withSuspense(LazyFieldRow);

export class TelemetryManagementSection extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      processing: false,
      showExample: false,
      showSecurityExample: false,
      enabled: this.props.telemetryService.getIsOptedIn() || false,
    };
  }

  render() {
    const { telemetryService } = this.props;
    const { showExample, enabled, processing } = this.state;

    if (!telemetryService.getCanChangeOptInStatus()) {
      return null;
    }

    const usageCollectionSetting: UiSettingMetadata = {
      type: 'boolean',
      value: true,
      userValue: enabled,
      name: i18n.translate('telemetry.provideUsageDataTitle', {
        defaultMessage: 'Share usage with Elastic',
      }),
      // @ts-expect-error
      description: this.renderDescription(),
      requiresPageReload: false,
    };

    // We don't validate the user input on these settings
    const settingsValidationResponse: ValueValidation = {
      successfulValidation: true,
      valid: true,
    };

    return (
      <Fragment>
        {showExample && (
          <TrackApplicationView viewId="optInExampleFlyout">
            <React.Suspense fallback={<EuiLoadingSpinner />}>
              <OptInExampleFlyout
                fetchExample={telemetryService.fetchExample}
                onClose={this.toggleExample}
              />
            </React.Suspense>
          </TrackApplicationView>
        )}
        <EuiSplitPanel.Outer hasBorder>
          <EuiForm>
            <EuiSplitPanel.Inner color="subdued">
              <EuiTitle>
                <h2>
                  <FormattedMessage
                    id="telemetry.usageDataTitle"
                    defaultMessage="Usage collection"
                  />
                </h2>
              </EuiTitle>
            </EuiSplitPanel.Inner>

            <EuiSplitPanel.Inner>
              {this.maybeGetAppliesSettingMessage()}
              <EuiSpacer size="s" />
              <FieldRowProvider
                {...{
                  links: this.props.docLinks.management,
                  showDanger: (message: string) => this.props.toasts.addDanger(message),
                  validateChange: async () => settingsValidationResponse,
                }}
              >
                <FieldRow
                  field={getFieldDefinition({
                    id: 'Usage collection',
                    setting: usageCollectionSetting,
                    params: { isOverridden: false, isCustom: true },
                  })}
                  isSavingEnabled={this.props.enableSaving && !processing}
                  onFieldChange={this.toggleOptIn}
                />
              </FieldRowProvider>
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
        }
      />
    );
  };

  renderDescription = () => {
    const { docLinks } = this.props;

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
            defaultMessage="Enabling usage collection allows us to learn
            what our users are most interested in, so we can improve our products and services.
            Refer to our {privacyStatementLink}."
            values={{
              privacyStatementLink: (
                <EuiLink href={docLinks.legal.privacyStatement} target="_blank">
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
                    defaultMessage: 'Sharing usage with Elastic is enabled.',
                  })
                : i18n.translate('telemetry.optInSuccessOff', {
                    defaultMessage: 'No longer sharing usage with Elastic.',
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
