/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer, EuiImage, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export * from './components/code_box';
export * from './components/github_link';
export * from './components/ingest_data';
export * from './components/integrations_panel';
export * from './components/language_client_panel';
export * from './components/overview_panel';
export * from './components/select_client';
export * from './components/try_in_console_button';
export * from './components/install_client';

export * from './types';

export interface WelcomeBannerProps {
  userProfile: {
    user: {
      full_name?: string;
      username?: string;
    };
  };
  assetBasePath?: string;
  image?: string;
  showDescription?: boolean;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  userProfile,
  assetBasePath,
  image,
  showDescription = true,
}) => (
  <EuiFlexGroup justifyContent="spaceBetween">
    <EuiFlexItem grow={false}>
      {/* Reversing column direction here so screenreaders keep h1 as the first element */}
      <EuiFlexGroup justifyContent="flexStart" direction="columnReverse" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle className="serverlessSearchHeaderTitle" size="s">
            <h1>
              {i18n.translate('searchApiPanels.welcomeBanner.header.title', {
                defaultMessage: 'Get started with Elasticsearch',
              })}
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <h2>
              {i18n.translate('searchApiPanels.welcomeBanner.header.greeting.title', {
                defaultMessage: 'Hi {name}!',
                values: { name: userProfile?.user?.full_name || userProfile?.user?.username },
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {showDescription && (
        <EuiText>
          {i18n.translate('searchApiPanels.welcomeBanner.header.description', {
            defaultMessage:
              "Set up your programming language client, ingest some data, and you'll be ready to start searching within minutes.",
          })}
        </EuiText>
      )}
      <EuiSpacer size="xxl" />
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiImage alt="" src={image ? image : `${assetBasePath}serverless_header.png`} size="554px" />
    </EuiFlexItem>
  </EuiFlexGroup>
);
