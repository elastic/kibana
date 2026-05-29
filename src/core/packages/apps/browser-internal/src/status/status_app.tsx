/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Component } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiPage,
  EuiPageBody,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import type { NotificationsSetup } from '@kbn/core-notifications-browser';
import { loadStatus, type ProcessedServerResponse, type StatusState } from './lib';
import { MetricTiles, ServerStatus, StatusSection, VersionHeader } from './components';

interface StatusAppProps {
  http: InternalHttpSetup;
  notifications: NotificationsSetup;
  getDocLinks: () => DocLinksStart | undefined;
}

interface StatusAppState {
  loading: boolean;
  fetchError: boolean;
  data: ProcessedServerResponse | null;
}

export class StatusApp extends Component<StatusAppProps, StatusAppState> {
  constructor(props: StatusAppProps) {
    super(props);
    this.state = {
      loading: true,
      fetchError: false,
      data: null,
    };
  }

  async componentDidMount() {
    const { http, notifications } = this.props;
    try {
      const data = await loadStatus({ http, notifications });
      this.setState({ loading: false, fetchError: false, data });
    } catch (e) {
      this.setState({ fetchError: true, loading: false, data: null });
    }
  }

  private renderRedactedView(serverState: StatusState) {
    const clusterPrivilegesUrl = this.props.getDocLinks()?.links.security.clusterPrivileges;
    return (
      <>
        <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <ServerStatus serverState={serverState} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiEmptyPrompt
          data-test-subj="statusPageRedactedPrompt"
          color="highlighted"
          iconType="info"
          title={
            <h2>
              <FormattedMessage
                id="core.statusPage.redactedPrompt.title"
                defaultMessage="Detailed status hidden"
              />
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="core.statusPage.redactedPrompt.body"
                defaultMessage="Your user does not have the Elasticsearch monitor cluster privilege, so detailed core, plugin, and metrics data is not shown."
              />
            </p>
          }
          actions={
            clusterPrivilegesUrl
              ? [
                  <EuiLink
                    key="learn-more"
                    href={clusterPrivilegesUrl}
                    target="_blank"
                    external
                    data-test-subj="statusPageRedactedPromptLearnMoreLink"
                  >
                    <FormattedMessage
                      id="core.statusPage.redactedPrompt.learnMoreLabel"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>,
                ]
              : undefined
          }
        />
      </>
    );
  }

  render() {
    const { loading, fetchError, data } = this.state;

    if (loading) {
      return <EuiLoadingSpinner size="l" />;
    }

    if (fetchError || !data) {
      return (
        <EuiText color="danger">
          <FormattedMessage
            id="core.statusPage.statusApp.loadingErrorText"
            defaultMessage="An error occurred loading the status"
          />
        </EuiText>
      );
    }

    if (data.redacted) {
      return (
        <EuiPage className="stsPage" data-test-subj="statusPageRoot">
          <EuiPageBody restrictWidth>{this.renderRedactedView(data.serverState)}</EuiPageBody>
        </EuiPage>
      );
    }

    const { metrics, coreStatus, pluginStatus, serverState, name, version } = data;

    return (
      <EuiPage className="stsPage" data-test-subj="statusPageRoot">
        <EuiPageBody restrictWidth>
          <ServerStatus name={name} serverState={serverState} />
          <EuiSpacer />

          <VersionHeader version={version} />
          <EuiSpacer />

          <MetricTiles metrics={metrics} />
          <EuiSpacer />

          <StatusSection
            id="core"
            title={i18n.translate('core.statusPage.coreStatus.sectionTitle', {
              defaultMessage: 'Core status',
            })}
            statuses={coreStatus}
          />
          <EuiSpacer />

          <StatusSection
            id="plugins"
            title={i18n.translate('core.statusPage.statusApp.statusTitle', {
              defaultMessage: 'Plugin status',
            })}
            statuses={pluginStatus}
          />
        </EuiPageBody>
      </EuiPage>
    );
  }
}
