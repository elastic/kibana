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
import icon from '../../../assets/language_clients/python.svg';

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

export const ElasticsearchPyClientReadme = () => {
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
                  id="customIntegrations.languageClients.PythonElasticsearch.readme.title"
                  defaultMessage="Elasticsearch Python Client"
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
                        id="customIntegrations.languageClients.PythonElasticsearch.readme.intro"
                        defaultMessage="Getting started with the Elasticsearch Python Client requires a few steps."
                      />
                    </EuiText>
                  }
                />
              </EuiPageSection>

              <EuiPageSection>
                <EuiTitle>
                  <h2>
                    <FormattedMessage
                      id="customIntegrations.languageClients.PythonElasticsearch.readme.install"
                      defaultMessage="Install the Elasticsearch Python Client"
                    />
                  </h2>
                </EuiTitle>

                <EuiSpacer size="s" />

                <EuiCodeBlock language="shell" isCopyable>
                  {`# The Python client for Elasticsearch can be installed with pip: \n`}
                  {`$ python -m pip install elasticsearch`}
                </EuiCodeBlock>
              </EuiPageSection>

              <EuiPageSection>
                <EuiTitle>
                  <h2>
                    <FormattedMessage
                      id="customIntegrations.languageClients.PythonElasticsearch.readme.connecting"
                      defaultMessage="Connecting to Elastic cloud"
                    />
                  </h2>
                </EuiTitle>

                <EuiText>
                  <FormattedMessage
                    id="customIntegrations.languageClients.PythonElasticsearch.readme.connectingText"
                    defaultMessage="You can connect to Elastic Cloud using an {api_key} and a {cloud_id}:"
                    values={{
                      api_key: <EuiCode>API key</EuiCode>,
                      cloud_id: <EuiCode>Cloud ID</EuiCode>,
                    }}
                  />
                </EuiText>

                <EuiSpacer size="s" />

                <EuiCodeBlock isCopyable language="python">
                  {`
from elasticsearch import Elasticsearch

# Found in the 'Manage this deployment' page
CLOUD_ID = "YOUR_CLOUD_ID"

# Found in the 'Management' page under the section 'Security'
API_KEY = "YOUR_API_KEY"

# Create the client instance
client = Elasticsearch(
    cloud_id=CLOUD_ID,
    api_key=API_KEY,
)
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
