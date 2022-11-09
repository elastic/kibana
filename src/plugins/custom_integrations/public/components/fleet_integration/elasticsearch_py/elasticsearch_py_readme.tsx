/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';
import cuid from 'cuid';

import {
  EuiButton,
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
  const [apiKey, setApiKey] = useState<string | null>(null);

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
                      id="customIntegrations.languageClients.PythonElasticsearch.readme.createApiKey"
                      defaultMessage="Create an API key"
                    />
                  </h2>
                </EuiTitle>

                <EuiText>
                  <FormattedMessage
                    id="customIntegrations.languageClients.PythonElasticsearch.readme.apiKey"
                    defaultMessage="Use the button bellow to generate an API key. You'll need this set up your client in the next step."
                  />
                </EuiText>

                <EuiSpacer size="m" />

                <EuiFlexGroup alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiButton onClick={() => setApiKey(cuid())} disabled={!!apiKey}>
                      Generate API key
                    </EuiButton>
                  </EuiFlexItem>

                  {apiKey && (
                    <EuiFlexItem grow={false}>
                      <EuiCodeBlock paddingSize="s" isCopyable className="eui-displayInline">
                        {apiKey}
                      </EuiCodeBlock>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
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
                    defaultMessage="When connecting to Elastic Cloud with the Python Elasticsearch client you should always use the {cloud_id} parameter to connect. You can find this value within the 'Manage Deployment' page after you’ve created a cluster."
                    values={{
                      cloud_id: <EuiCode>cloud_id</EuiCode>,
                    }}
                  />
                </EuiText>

                <EuiSpacer size="s" />

                <EuiCodeBlock isCopyable language="python">
                  {`
from elasticsearch import Elasticsearch

# Found in the 'Manage Deployment' page
CLOUD_ID = "deployment-name:dXMtZWFzdDQuZ2Nw..."

# Create the client instance
client = Elasticsearch(
    cloud_id=CLOUD_ID,
    api_key='${apiKey || 'YOUR_API_KEY'}',
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
