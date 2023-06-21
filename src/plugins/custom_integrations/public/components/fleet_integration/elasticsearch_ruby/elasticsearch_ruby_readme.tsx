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
import icon from '../../../assets/language_clients/ruby.svg';

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

export const ElasticsearchRubyClientReadme = () => {
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
                  id="customIntegrations.languageClients.RubyElasticsearch.readme.title"
                  defaultMessage="Elasticsearch Ruby Client"
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
                        id="customIntegrations.languageClients.RubyElasticsearch.readme.intro"
                        defaultMessage="Getting started with the Elasticsearch Ruby Client requires a few steps."
                      />
                    </EuiText>
                  }
                />
              </EuiPageSection>

              <EuiPageSection>
                <EuiTitle>
                  <h2>
                    <FormattedMessage
                      id="customIntegrations.languageClients.RubyElasticsearch.readme.install"
                      defaultMessage="Install the Elasticsearch Ruby Client"
                    />
                  </h2>
                </EuiTitle>

                <EuiSpacer size="s" />

                <EuiCodeBlock language="shell" isCopyable>
                  {`# Install the Rubygem for the latest Elasticsearch version by using: \n`}
                  {`$ gem install elasticsearch \n `}
                  {`\n# Or add the 'elasticsearch' Ruby gem to your Gemfile: \n`}
                  {`$ gem 'elasticsearch'`}
                </EuiCodeBlock>
              </EuiPageSection>

              <EuiPageSection>
                <EuiTitle>
                  <h2>
                    <FormattedMessage
                      id="customIntegrations.languageClients.RubyElasticsearch.readme.connecting"
                      defaultMessage="Connecting to Elastic cloud"
                    />
                  </h2>
                </EuiTitle>

                <EuiText>
                  <FormattedMessage
                    id="customIntegrations.languageClients.RubyElasticsearch.readme.connectingText"
                    defaultMessage="You can connect to Elastic Cloud using an {api_key} and a {cloud_id}. Where {api_key} and {cloud_id} can be retrieved using the Elastic Cloud web UI. The Cloud ID can be found on the 'Manage this deployment' page, and the API key can be generated from the 'Management' page under the section 'Security'."
                    values={{
                      api_key: <EuiCode>ApiKey</EuiCode>,
                      cloud_id: <EuiCode>CloudID</EuiCode>,
                    }}
                  />
                </EuiText>

                <EuiSpacer size="s" />

                <EuiCodeBlock isCopyable language="ruby">
                  {`
client = Elasticsearch::Client.new(
  cloud_id: '<CloudID>',
  api_key: '<ApiKey>'
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
