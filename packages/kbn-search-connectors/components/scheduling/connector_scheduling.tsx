/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
  ConnectorStatus,
  ConnectorViewIndex,
  CrawlerViewIndex,
  IngestionStatus,
  SchedulingConfiguraton,
  SyncJobType,
} from '@kbn/search-connectors/types';
import React, { useContext, useEffect, useState } from 'react';
import { LicenseContext } from '../configuration';
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
  configurationPath: string;
  configurationPathOnClick: () => void;
  dataTelemetryIdPrefix: string;
  hasChanges: boolean;
  index: CrawlerViewIndex | ConnectorViewIndex;
  ingestionStatus: IngestionStatus;
  setHasChanges: (changes: boolean) => void;
  shouldShowAccessControlSync: boolean;
  shouldShowIncrementalSync: boolean;
  updateConnectorStatus: boolean;
  updateScheduling: (configuration: SchedulingConfiguraton) => void;
}

export const ConnectorSchedulingComponent: React.FC<ConnectorContentSchedulingProps> = ({
  children,
  configurationPath,
  configurationPathOnClick,
  dataTelemetryIdPrefix,
  hasChanges,
  index,
  ingestionStatus,
  setHasChanges,
  shouldShowAccessControlSync,
  shouldShowIncrementalSync,
  updateConnectorStatus,
  updateScheduling,
}) => {
  const { hasPlatinumLicense } = useContext(LicenseContext);

  const [hasFullSyncChanges, setHasFullSyncChanges] = useState<boolean>(false);
  const [hasAccessSyncChanges, setAccessSyncChanges] = useState<boolean>(false);
  const [hasIncrementalSyncChanges, setIncrementalSyncChanges] = useState<boolean>(false);
  const isDocumentLevelSecurityDisabled =
    !index.connector.configuration.use_document_level_security?.value;

  useEffect(() => {
    const newStatus = hasFullSyncChanges || hasAccessSyncChanges || hasIncrementalSyncChanges;
    if (hasChanges != newStatus) {
      setHasChanges(newStatus);
    }
  }, [hasFullSyncChanges, hasAccessSyncChanges, hasIncrementalSyncChanges]);
  if (
    index.connector.status === ConnectorStatus.CREATED ||
    index.connector.status === ConnectorStatus.NEEDS_CONFIGURATION
  ) {
    return (
      <ConnectorUnconfigured
        dataTelemetryIdPrefix="entSearchContent"
        configurationPathOnClick={configurationPathOnClick}
        configurationPath={configurationPath}
      />
    );
  }
  return (
    <>
      <EuiSpacer size="l" />
      <ConnectorError ingestionStatus={ingestionStatus} />
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
                  index={index}
                  setHasChanges={setHasChanges}
                  hasChanges={hasChanges}
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
                    index={index}
                    setHasChanges={setHasChanges}
                    hasChanges={hasChanges}
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
                    index={index}
                    hasPlatinumLicense={hasPlatinumLicense}
                    setHasChanges={setHasChanges}
                    hasChanges={hasChanges}
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
                            <EuiLink
                              href={configurationPath}
                              onClick={(event) => {
                                event.preventDefault();
                                configurationPathOnClick();
                              }}
                            >
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
