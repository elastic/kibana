/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';

export const App = ({ http, token }: { http: HttpSetup; token?: string }) => {
  const onCompleteSetup = async ({ shouldReloadConfig }: { shouldReloadConfig: boolean }) => {
    await http
      .post('/api/preboot/complete_setup', {
        body: JSON.stringify({ shouldReloadConfig }),
      })
      .then(() => {
        setTimeout(() => {
          window.location.href = '/';
        }, 5000);
      });
  };

  const onWriteToken = async () => {
    await http.post('/api/preboot/write_config', { body: JSON.stringify(configKeyValue) });
  };

  const onConnect = async () => {
    await http
      .post('/api/preboot/connect_to_es', { body: JSON.stringify(elasticsearchConfig) })
      .then(
        (response) => setConnectResponse(JSON.stringify(response)),
        (err: IHttpFetchError<ResponseErrorBody>) =>
          setConnectResponse(err?.body?.message || 'ERROR')
      );
  };

  const [configKeyValue, setConfigKeyValue] = useState<{ key: string; value: string }>({
    key: '',
    value: '',
  });

  const [elasticsearchConfig, setElasticsearchConfig] = useState<{
    host: string;
    username: string;
    password: string;
  }>({
    host: 'http://localhost:9200',
    username: 'kibana_system',
    password: '',
  });

  const [connectResponse, setConnectResponse] = useState<string | null>(null);

  const [isSetupModeActive, setIsSetupModeActive] = useState<boolean>(false);
  useEffect(() => {
    http.get<{ isSetupModeActive: boolean }>('/api/preboot/state').then(
      (response) => setIsSetupModeActive(response.isSetupModeActive),
      (err: IHttpFetchError) => setIsSetupModeActive(false)
    );
  }, [http]);

  if (!isSetupModeActive) {
    return (
      <EuiPageTemplate
        restrictWidth={false}
        template="empty"
        pageHeader={{
          iconType: 'logoElastic',
          pageTitle: 'Welcome to Elastic',
        }}
      >
        <EuiPanel>
          <EuiText>Kibana server is not ready yet.</EuiText>
        </EuiPanel>
      </EuiPageTemplate>
    );
  }

  return (
    <EuiPageTemplate
      restrictWidth={false}
      template="empty"
      pageHeader={{
        iconType: 'logoElastic',
        pageTitle: 'Welcome to Elastic',
      }}
    >
      <EuiPanel>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction={'column'}>
              <EuiFlexItem>
                <EuiFieldText
                  placeholder="Config key"
                  value={configKeyValue.key}
                  onChange={(e) => {
                    setConfigKeyValue({ ...configKeyValue, key: e.target.value });
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFieldText
                  placeholder="Config value"
                  value={configKeyValue.value}
                  onChange={(e) => {
                    setConfigKeyValue({ ...configKeyValue, value: e.target.value });
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  size="m"
                  color={'danger'}
                  onClick={onWriteToken}
                  disabled={!configKeyValue.key || !configKeyValue.value}
                >
                  Write config
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction={'column'}>
              <EuiFlexItem>
                <EuiText>Token from config: {token}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  size="m"
                  color={'danger'}
                  onClick={() => onCompleteSetup({ shouldReloadConfig: true })}
                >
                  Reload config and proceed to `setup`
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  size="m"
                  color={'primary'}
                  onClick={() => onCompleteSetup({ shouldReloadConfig: false })}
                >
                  DO NOT reload config and proceed to `setup`
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction={'column'}>
              <EuiFlexItem>
                <EuiFieldText
                  placeholder="elasticsearch.hosts"
                  value={elasticsearchConfig.host}
                  onChange={(e) => {
                    setElasticsearchConfig({ ...elasticsearchConfig, host: e.target.value });
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFieldText
                  placeholder="elasticsearch.username"
                  value={elasticsearchConfig.username}
                  onChange={(e) => {
                    setElasticsearchConfig({
                      ...elasticsearchConfig,
                      username: e.target.value,
                    });
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFieldText
                  placeholder="elasticsearch.password"
                  value={elasticsearchConfig.password}
                  onChange={(e) => {
                    setElasticsearchConfig({
                      ...elasticsearchConfig,
                      password: e.target.value,
                    });
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  size="m"
                  color={'danger'}
                  onClick={onConnect}
                  disabled={
                    !elasticsearchConfig.host ||
                    !elasticsearchConfig.username ||
                    !elasticsearchConfig.password
                  }
                >
                  Connect
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCodeBlock language="json" paddingSize="s" isCopyable>
              {connectResponse ?? ''}
            </EuiCodeBlock>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPageTemplate>
  );
};
