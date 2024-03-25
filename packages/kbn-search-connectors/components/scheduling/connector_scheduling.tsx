/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  Connector,
  ConnectorStatus,
  SchedulingConfiguraton,
  SyncJobType,
} from '../../types/connectors';
import { ConnectorError } from './connector_error';
import { ConnectorUnconfigured } from './connector_unconfigured';
import { ConnectorContentScheduling } from './full_content';
interface SchedulePanelProps {
  description: string;
  title: string;
}
export const SchedulePanel: React.FC<SchedulePanelProps> = ({ title, description, children }) => {
  return (
    <>
      <EuiSplitPanel.Outer>
        <EuiSplitPanel.Inner color="subdued">
          <EuiTitle>
            <h2>{title}</h2>
          </EuiTitle>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <EuiFlexItem>
            <EuiText size="s">{description}</EuiText>
          </EuiFlexItem>
          <EuiSpacer size="m" />
          {children}
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </>
  );
};

interface ConnectorContentSchedulingProps {
  children?: React.ReactNode;
  connector: Connector;
  configurationPathOnClick?: () => void;
  dataTelemetryIdPrefix: string;
  hasPlatinumLicense: boolean;
  hasChanges: boolean;
  hasIngestionError: boolean;
  setHasChanges: (changes: boolean) => void;
  shouldShowAccessControlSync: boolean;
  shouldShowIncrementalSync: boolean;
  updateConnectorStatus: boolean;
  updateScheduling: (configuration: SchedulingConfiguraton) => void;
}

export const ConnectorSchedulingComponent: React.FC<ConnectorContentSchedulingProps> = ({
  children,
  connector,
  configurationPathOnClick,
  dataTelemetryIdPrefix,
  hasChanges,
  hasIngestionError,
  hasPlatinumLicense,
  setHasChanges,
  shouldShowAccessControlSync,
  shouldShowIncrementalSync,
  updateConnectorStatus,
  updateScheduling,
}) => {
  const [hasFullSyncChanges, setHasFullSyncChanges] = useState<boolean>(false);
  const [hasAccessSyncChanges, setAccessSyncChanges] = useState<boolean>(false);
  const [hasIncrementalSyncChanges, setIncrementalSyncChanges] = useState<boolean>(false);
  const isDocumentLevelSecurityDisabled =
    !connector.configuration.use_document_level_security?.value;

  const hasSyncStatusChanged = useMemo(() => {
    return hasFullSyncChanges || hasAccessSyncChanges || hasIncrementalSyncChanges;
  }, [hasFullSyncChanges, hasAccessSyncChanges, hasIncrementalSyncChanges]);
  useEffect(() => {
    if (hasChanges !== hasSyncStatusChanged) {
      setHasChanges(hasSyncStatusChanged);
    }
  }, [hasSyncStatusChanged, hasChanges, setHasChanges]);

  if (
    connector.status === ConnectorStatus.CREATED ||
    connector.status === ConnectorStatus.NEEDS_CONFIGURATION
  ) {
    return (
      <ConnectorUnconfigured
        dataTelemetryIdPrefix="entSearchContent"
        configurationPathOnClick={configurationPathOnClick}
      />
    );
  }
  return (
    <>
      <EuiSpacer size="l" />
      {hasIngestionError ? <ConnectorError /> : <></>}
      {children}
      <EuiFlexGroup>
        <EuiFlexItem>
          <SchedulePanel
            title={i18n.translate(
              'searchConnectors.content.indices.connectorScheduling.schedulePanel.contentSync.title',
              { defaultMessage: 'Content sync' }
            )}
            description={i18n.translate(
              'searchConnectors.content.indices.connectorScheduling.schedulePanel.contentSync.description',
              { defaultMessage: 'Fetch content to create or update your Elasticsearch documents.' }
            )}
          >
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem>
                <ConnectorContentScheduling
                  type={SyncJobType.FULL}
                  connector={connector}
                  setHasChanges={setHasChanges}
                  setHasSyncTypeChanges={setHasFullSyncChanges}
                  hasSyncTypeChanges={hasFullSyncChanges}
                  updateConnectorStatus={updateConnectorStatus}
                  updateScheduling={updateScheduling}
                  dataTelemetryIdPrefix={dataTelemetryIdPrefix}
                />
              </EuiFlexItem>
              {shouldShowIncrementalSync && (
                <EuiFlexItem>
                  <ConnectorContentScheduling
                    type={SyncJobType.INCREMENTAL}
                    connector={connector}
                    setHasChanges={setHasChanges}
                    setHasSyncTypeChanges={setIncrementalSyncChanges}
                    hasSyncTypeChanges={hasIncrementalSyncChanges}
                    updateConnectorStatus={updateConnectorStatus}
                    updateScheduling={updateScheduling}
                    dataTelemetryIdPrefix={dataTelemetryIdPrefix}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </SchedulePanel>
        </EuiFlexItem>
        {shouldShowAccessControlSync && (
          <EuiFlexItem>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <SchedulePanel
                  title={i18n.translate(
                    'searchConnectors.connectorScheduling.schedulePanel.documentLevelSecurity.title',
                    { defaultMessage: 'Document Level Security' }
                  )}
                  description={i18n.translate(
                    'searchConnectors.connectorScheduling.schedulePanel.documentLevelSecurity.description',
                    {
                      defaultMessage:
                        'Control the documents users can access, based on their permissions and roles. Schedule syncs to keep these access controls up to date.',
                    }
                  )}
                >
                  <ConnectorContentScheduling
                    type={SyncJobType.ACCESS_CONTROL}
                    connector={connector}
                    hasPlatinumLicense={hasPlatinumLicense}
                    setHasChanges={setHasChanges}
                    setHasSyncTypeChanges={setAccessSyncChanges}
                    hasSyncTypeChanges={hasAccessSyncChanges}
                    updateConnectorStatus={updateConnectorStatus}
                    updateScheduling={updateScheduling}
                    dataTelemetryIdPrefix={dataTelemetryIdPrefix}
                  />
                </SchedulePanel>
              </EuiFlexItem>
              {isDocumentLevelSecurityDisabled && (
                <EuiFlexItem>
                  <EuiCallOut
                    title={i18n.translate(
                      'searchConnectors.connectorScheduling.schedulePanel.documentLevelSecurity.dlsDisabledCallout.title',
                      { defaultMessage: 'Access control syncs not allowed' }
                    )}
                    color="warning"
                    iconType="iInCircle"
                  >
                    <p>
                      <FormattedMessage
                        id="searchConnectors.connectorScheduling.schedulePanel.documentLevelSecurity.dlsDisabledCallout.text"
                        defaultMessage="{link} for this connector to activate these options."
                        values={{
                          link: (
                            <EuiLink onClick={configurationPathOnClick}>
                              {i18n.translate(
                                'searchConnectors.connectorScheduling.schedulePanel.documentLevelSecurity.dlsDisabledCallout.link',
                                {
                                  defaultMessage: 'Enable document level security',
                                }
                              )}
                            </EuiLink>
                          ),
                        }}
                      />
                    </p>
                  </EuiCallOut>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
