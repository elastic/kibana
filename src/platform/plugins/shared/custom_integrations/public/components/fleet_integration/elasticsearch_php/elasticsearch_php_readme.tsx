/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import {
  EuiCode,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiPanel,
  EuiImage,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiThemeVars } from '@kbn/ui-theme';
import icon from '../../../assets/language_clients/php.svg';

const CenterColumn = styled(EuiFlexItem)`
  max-width: 740px;
`;

const FixedHeader = styled.div`
  width: 100%;
  height: 196px;
  border-bottom: 1px solid ${euiThemeVars.euiColorLightShade};
`;

const IconPanel = styled(EuiPanel)`
  padding: ${(props) => props.theme.eui.euiSizeXL};
  width: ${(props) =>
    parseFloat(props.theme.eui.euiSize) * 6 + parseFloat(props.theme.eui.euiSizeXL) * 2}px;
  svg,
  img {
    height: ${(props) => parseFloat(props.theme.eui.euiSize) * 6}px;
    width: ${(props) => parseFloat(props.theme.eui.euiSize) * 6}px;
  }
  .euiFlexItem {
    height: ${(props) => parseFloat(props.theme.eui.euiSize) * 6}px;
    justify-content: center;
  }
`;

const TopFlexGroup = styled(EuiFlexGroup)`
  max-width: 1150px;
  margin-left: auto;
  margin-right: auto;
  padding: calc(${euiThemeVars.euiSizeXL} * 2) ${euiThemeVars.euiSizeM} 0 ${euiThemeVars.euiSizeM};
`;

export const ElasticsearchPhpClientReadme = () => {
  return (
    <>
      <FixedHeader>
        <TopFlexGroup alignItems="center" justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <IconPanel>
              <EuiImage size="fullWidth" src={icon} alt="icon" />
            </IconPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id="customIntegrations.languageClients.PhpElasticsearch.readme.title"
                  defaultMessage="Elasticsearch PHP Client"
                />
              </h1>
            </EuiTitle>
          </EuiFlexItem>
        </TopFlexGroup>
      </FixedHeader>

      <EuiFlexGroup alignItems="flexStart" justifyContent="center">
        <CenterColumn>
          <EuiPage paddingSize="m">
            <EuiPageBody panelled>
              <EuiPageSection>
                <EuiPageHeader
                  description={
                    <EuiText>
                      <FormattedMessage
                        id="customIntegrations.languageClients.PhpElasticsearch.readme.intro"
                        defaultMessage="Getting started with the Elasticsearch PHP Client requires a few steps."
                      />
                    </EuiText>
                  }
                />
              </EuiPageSection>

              <EuiPageSection>
                <EuiTitle>
                  <h2>
                    <FormattedMessage
                      id="customIntegrations.languageClients.PhpElasticsearch.readme.install"
                      defaultMessage="Install the Elasticsearch PHP Client"
                    />
                  </h2>
                </EuiTitle>

                <EuiSpacer size="s" />

                <EuiText>
                  <FormattedMessage
                    id="customIntegrations.languageClients.PhpElasticsearch.readme.installMessage"
                    defaultMessage="Elasticsearch-php can be used starting from PHP 7.4."
                  />
                </EuiText>

                <EuiCodeBlock language="shell" isCopyable>
                  {`# Use composer to install the library: \n`}
                  {`$ composer require elasticsearch/elasticsearch \n`}
                  <EuiSpacer size="m" />
                  {`# If you don’t have composer you can install it as follows: \n`}
                  {`$ curl -s http://getcomposer.org/installer | php
$ php composer.phar install `}
                </EuiCodeBlock>
              </EuiPageSection>

              <EuiPageSection>
                <EuiTitle>
                  <h2>
                    <FormattedMessage
                      id="customIntegrations.languageClients.PhpElasticsearch.readme.connecting"
                      defaultMessage="Connecting to Elastic cloud"
                    />
                  </h2>
                </EuiTitle>

                <EuiText>
                  <FormattedMessage
                    id="customIntegrations.languageClients.PhpElasticsearch.readme.connectingText"
                    defaultMessage="You can connect to Elastic Cloud using an {api_key} and a {cloud_id}. Where {api_key} and {cloud_id} can be retrieved using the Elastic Cloud web UI."
                    values={{
                      api_key: <EuiCode>api-key</EuiCode>,
                      cloud_id: <EuiCode>cloud-id</EuiCode>,
                    }}
                  />
                </EuiText>

                <EuiSpacer size="s" />

                <EuiCodeBlock isCopyable language="php">
                  {`
# <cloud-id> found in the 'Manage this deployment' page
# <api-key> found in the 'Management' page under the section 'Security'

$client = ClientBuilder::create()
   ->setElasticCloudId('<cloud-id>')
   ->setApiKey('<api-key>')
   ->build();
          `}
                </EuiCodeBlock>
              </EuiPageSection>
            </EuiPageBody>
          </EuiPage>
        </CenterColumn>
      </EuiFlexGroup>
    </>
  );
};
