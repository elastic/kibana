/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import icon from '../../../assets/language_clients/nodejs.svg';

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

export const ElasticsearchJsClientReadme = () => {
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
                  id="customIntegrations.languageClients.JavascriptElasticsearch.readme.title"
                  defaultMessage="Elasticsearch JavaScript Client"
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
                        id="customIntegrations.languageClients.JavascriptElasticsearch.readme.intro"
                        defaultMessage="Getting started with the Elasticsearch JavaScript Client requires a few steps."
                      />
                    </EuiText>
                  }
                />
              </EuiPageSection>

              <EuiPageSection>
                <EuiTitle>
                  <h2>
                    <FormattedMessage
                      id="customIntegrations.languageClients.JavascriptElasticsearch.readme.install"
                      defaultMessage="Install the Elasticsearch JavaScript Client"
                    />
                  </h2>
                </EuiTitle>

                <EuiSpacer size="s" />

                <EuiCodeBlock language="shell" isCopyable>
                  {`# Grab the Elasticsearch JavaScript client from NPM and install it in your project \n`}
                  {`$ npm install @elastic/elasticsearch@<major>`}
                </EuiCodeBlock>
              </EuiPageSection>

              <EuiPageSection>
                <EuiTitle>
                  <h2>
                    <FormattedMessage
                      id="customIntegrations.languageClients.JavascriptElasticsearch.readme.configure"
                      defaultMessage="Configure the Elasticsearch JavaScript Client"
                    />
                  </h2>
                </EuiTitle>

                <EuiText>
                  <FormattedMessage
                    id="customIntegrations.languageClients.JavascriptElasticsearch.readme.configureText"
                    defaultMessage="Create an {filename} file in the root of your project, and add the following options."
                    values={{
                      filename: <EuiCode>index.js</EuiCode>,
                    }}
                  />
                </EuiText>

                <EuiSpacer size="s" />

                <EuiCodeBlock isCopyable language="javascript">
                  {`
// Import the client
const { Client } = require('@elastic/elasticsearch');

// Instantiate the client with an API key
const client = new Client({
  auth: { apiKey: 'YOUR_API_KEY' }
})

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
