/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const SampleClientReadme = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);

  return (
    <EuiPage paddingSize="m" restrictWidth>
      <EuiPageBody panelled>
        <EuiPageSection>
          <EuiPageHeader
            pageTitle={
              <h1>
                <FormattedMessage
                  id="plugins.custom_integrations.language_clients.sample.readme.title"
                  defaultMessage="ElasticSearch Sample Client"
                />
              </h1>
            }
          />
          <EuiText>
            <FormattedMessage
              id="plugins.custom_integrations.language_clients.sample.readme.intro"
              defaultMessage="Getting started with the Sample Language Client requires a few steps."
            />
          </EuiText>
        </EuiPageSection>

        <EuiPageSection>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="plugins.custom_integrations.language_clients.sample.readme.install"
                defaultMessage="Install the Sample Language Client"
              />
            </h2>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiCodeBlock language="shell" isCopyable>
            {`# Grab the sample language client from NPM and install it in your project \n`}
            {`$ npm install @elastic/elasticsearch-sample`}
          </EuiCodeBlock>
        </EuiPageSection>

        <EuiPageSection>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="plugins.custom_integrations.language_clients.sample.readme.install"
                defaultMessage="Create an API key"
              />
            </h2>
          </EuiTitle>

          <EuiText>
            <FormattedMessage
              id="plugins.custom_integrations.language_clients.sample.readme.apiKey"
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
                id="plugins.custom_integrations.language_clients.sample.readme.configure"
                defaultMessage="Configure the Sample Language Client"
              />
            </h2>
          </EuiTitle>

          <EuiText>
            <FormattedMessage
              id="plugins.custom_integrations.language_clients.sample.readme.configureText"
              defaultMessage="Create an {filename} file in the root of your project, and add the following options."
              values={{
                filename: <EuiCode>elastic.config.json</EuiCode>,
              }}
            />
          </EuiText>

          <EuiSpacer size="s" />

          <EuiCodeBlock isCopyable language="json">
            {`
{
  "apiKey": "${apiKey || 'YOUR_API_KEY'}
}

          `}
          </EuiCodeBlock>
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};
