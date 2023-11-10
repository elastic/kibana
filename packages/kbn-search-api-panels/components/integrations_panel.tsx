/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  EuiThemeProvider,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LEARN_MORE_LABEL } from '../constants';
import { GithubLink } from './github_link';

export interface IntegrationsPanelProps {
  docLinks: { beats: string; connectors: string; logstash: string };
  assetBasePath: string;
}

export const IntegrationsPanel: React.FC<IntegrationsPanelProps> = ({
  docLinks,
  assetBasePath,
}) => {
  return (
    <EuiThemeProvider colorMode="dark">
      <EuiPanel paddingSize="xl">
        <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoLogstash" size="xxl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('searchApiPanels.welcomeBanner.ingestData.logstashTitle', {
                  defaultMessage: 'Logstash',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                {i18n.translate('searchApiPanels.welcomeBanner.ingestData.logstashDescription', {
                  defaultMessage:
                    'Add data to your data stream or index to make it searchable. Choose an ingestion method that fits your application and workflow.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup justifyContent="flexStart" gutterSize="l">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <EuiLink href={docLinks.logstash} target="_blank">
                    {LEARN_MORE_LABEL}
                  </EuiLink>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <GithubLink
                  href="https://github.com/elastic/logstash"
                  label={i18n.translate('searchApiPanels.welcomeBanner.ingestData.logstashLink', {
                    defaultMessage: 'Logstash',
                  })}
                  assetBasePath={assetBasePath}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoBeats" size="xxl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('searchApiPanels.welcomeBanner.ingestData.beatsTitle', {
                  defaultMessage: 'Beats',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              {i18n.translate('searchApiPanels.welcomeBanner.ingestData.beatsDescription', {
                defaultMessage:
                  'Lightweight, single-purpose data shippers for Elasticsearch. Use Beats to send operational data from your servers.',
              })}
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup justifyContent="flexStart" gutterSize="l">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <EuiLink href={docLinks.beats} target="_blank">
                    {LEARN_MORE_LABEL}
                  </EuiLink>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <GithubLink
                  href="https://github.com/elastic/beats"
                  label={i18n.translate('searchApiPanels.welcomeBanner.ingestData.beatsLink', {
                    defaultMessage: 'Beats',
                  })}
                  assetBasePath={assetBasePath}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoEnterpriseSearch" size="xxl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('searchApiPanels.welcomeBanner.ingestData.connectorsTitle', {
                  defaultMessage: 'Connector clients',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              {i18n.translate('searchApiPanels.welcomeBanner.ingestData.connectorsDescription', {
                defaultMessage:
                  'Specialized integrations for syncing data from third-party sources to Elasticsearch. Use Elastic connectors to sync content from a range of databases and object stores.',
              })}
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup justifyContent="flexStart" gutterSize="l">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <EuiLink href={docLinks.connectors} target="_blank">
                    {LEARN_MORE_LABEL}
                  </EuiLink>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <GithubLink
                  href="https://github.com/elastic/connectors-python"
                  label={i18n.translate(
                    'searchApiPanels.welcomeBanner.ingestData.connectorsPythonLink',
                    {
                      defaultMessage: 'elastic/connectors',
                    }
                  )}
                  assetBasePath={assetBasePath}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiThemeProvider>
  );
};
