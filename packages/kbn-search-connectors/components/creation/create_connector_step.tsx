/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiProgress,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Connector, ConnectorConfigurationComponent, ConnectorStatus } from '../..';

interface CreateConnectorStepProps {
  connector: Connector;
  isLoading: boolean;
  isSyncing: boolean;
  setCurrentStep: Function;
  title: string;
  updateConnectorConfiguration: (
    configuration: Record<string, string | number | boolean | null>,
    connectorId: string
  ) => void;
}

export const CreateConnectorStep: React.FC<CreateConnectorStepProps> = ({
  connector,
  isLoading,
  isSyncing,
  setCurrentStep,
  title,
  updateConnectorConfiguration,
}) => {
  const isNextStepEnabled =
    connector?.status === ConnectorStatus.CONNECTED ||
    connector?.status === ConnectorStatus.CONFIGURED;

  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({
        behavior: 'smooth',
        top: 0,
      });
    }, 100);
  }, []);

  if (!connector) return null;

  return (
    <>
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l" style={{ position: 'relative' }}>
            <EuiTitle size="m">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <ConnectorConfigurationComponent
              connector={connector}
              hasPlatinumLicense
              isLoading={isLoading}
              saveConfig={(config) => {
                updateConnectorConfiguration(config, connector.id);
              }}
            />
            <EuiSpacer size="m" />
            {isSyncing && (
              <EuiProgress size="xs" position="absolute" style={{ top: 'calc(100% - 2px)' }} />
            )}
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l" color="plain">
            <EuiText>
              <h3>
                {i18n.translate(
                  'searchConnectors.createConnector.configurationStep.h4.finishUpLabel',
                  {
                    defaultMessage: 'Finish up',
                  }
                )}
              </h3>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiText color={isNextStepEnabled ? 'default' : 'subdued'} size="s">
              <p>
                {i18n.translate(
                  'searchConnectors.createConnector.configurationStep.p.description',
                  {
                    defaultMessage:
                      'You can manually sync your data, schedule a recurring sync or manage your domains.',
                  }
                )}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiButton
              data-test-subj="createSearchConnectorStartStepGenerateConfigurationButton"
              onClick={() => setCurrentStep('finish')}
              fill
            >
              {i18n.translate(
                'searchConnectors.createConnector.configurationStep.nextButton.label',
                {
                  defaultMessage: 'Next',
                }
              )}
            </EuiButton>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
