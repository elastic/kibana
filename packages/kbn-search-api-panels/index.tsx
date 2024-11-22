/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer, EuiImage, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AuthenticatedUser } from '@kbn/security-plugin/common';

export * from './components/cloud_details';
export * from './components/code_box';
export * from './components/ingest_pipelines/ingest_pipeline_panel';
export * from './components/github_link';
export * from './components/ingest_data';
export * from './components/ingestions_panel';
export * from './components/language_client_panel';
export * from './components/overview_panel';
export * from './components/pipeline_panel';
export * from './components/select_client';
export * from './components/install_client';
export * from './components/preprocess_data';

export * from './types';
export * from './utils';

export interface WelcomeBannerProps {
  user?: AuthenticatedUser;
  assetBasePath?: string;
  image?: string;
  showDescription?: boolean;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  user,
  assetBasePath,
  image,
  showDescription = true,
}) => (
  <>
    <EuiSpacer size="xxl" />
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={2}>
        {/* Reversing column direction here so screenreaders keep h1 as the first element */}
        <EuiFlexGroup justifyContent="flexStart" direction="columnReverse" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>
                {i18n.translate('searchApiPanels.welcomeBanner.header.title', {
                  defaultMessage: 'Get started with Elasticsearch',
                })}
              </h1>
            </EuiTitle>
          </EuiFlexItem>
          {Boolean(user) && (
            <EuiFlexItem grow={false}>
              <EuiText>
                <h4>
                  {user
                    ? i18n.translate('searchApiPanels.welcomeBanner.header.greeting.customTitle', {
                        defaultMessage: '👋 Hi {name}!',
                        values: { name: user.full_name || user.username },
                      })
                    : i18n.translate('searchApiPanels.welcomeBanner.header.greeting.defaultTitle', {
                        defaultMessage: '👋 Hi',
                      })}
                </h4>
              </EuiText>
            </EuiFlexItem>
          )}
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
      </EuiFlexItem>

      <EuiFlexItem grow={1}>
        <EuiImage
          alt=""
          src={image ? image : `${assetBasePath}/serverless_header.png`}
          size="original"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="xxl" />
  </>
);
