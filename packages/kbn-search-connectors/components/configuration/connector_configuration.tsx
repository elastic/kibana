/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useEffect, useState } from 'react';

import {
  EuiButton,
  EuiCallOut,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { sortAndFilterConnectorConfiguration } from '../../utils/connector_configuration_utils';
import { Connector, ConnectorConfigProperties, ConnectorStatus, FeatureName } from '../..';

import { ConnectorConfigurationForm } from './connector_configuration_form';

function entryToDisplaylistItem(entry: ConfigEntryView): { description: string; title: string } {
  return {
    description: entry.sensitive && !!entry.value ? '********' : String(entry.value) || '--',
    title: entry.label,
  };
}

interface ConnectorConfigurationProps {
  connector: Connector;
  hasPlatinumLicense: boolean;
  isLoading: boolean;
  saveConfig: (configuration: Record<string, string | number | boolean | null>) => void;
  stackManagementLink?: string;
  subscriptionLink?: string;
}

interface ConfigEntry extends ConnectorConfigProperties {
  key: string;
}

export interface ConfigEntryView extends ConfigEntry {
  isValid: boolean;
  validationErrors: string[];
}

export interface CategoryEntry {
  configEntries: ConfigEntryView[];
  key: string;
  label: string;
  order: number;
}

export interface ConfigView {
  advancedConfigurations: ConfigEntryView[];
  categories: CategoryEntry[];
  unCategorizedItems: ConfigEntryView[];
}

export const LicenseContext = createContext<{
  hasPlatinumLicense: boolean;
  stackManagementLink?: string;
  subscriptionLink?: string;
}>({
  hasPlatinumLicense: false,
  subscriptionLink: undefined,
  stackManagementLink: undefined,
});

export const ConnectorConfigurationComponent: React.FC<ConnectorConfigurationProps> = ({
  children,
  connector,
  hasPlatinumLicense,
  isLoading,
  saveConfig,
  subscriptionLink,
  stackManagementLink,
}) => {
  const {
    configuration,
    error,
    status: connectorStatus,
    is_native: isNative,
    features,
  } = connector;
  const hasDocumentLevelSecurity = Boolean(
    features?.[FeatureName.DOCUMENT_LEVEL_SECURITY]?.enabled
  );
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setIsEditing(false);
  }, [configuration]);

  useEffect(() => {
    if (
      Object.keys(configuration || {}).length > 0 &&
      (connectorStatus === ConnectorStatus.CREATED ||
        connectorStatus === ConnectorStatus.NEEDS_CONFIGURATION)
    ) {
      // Only start in edit mode if we haven't configured yet
      // Necessary to prevent a race condition between saving config and getting updated connector
      setIsEditing(true);
    }
  }, [configuration, connectorStatus]);

  const configView = sortAndFilterConnectorConfiguration(configuration, isNative);

  const uncategorizedDisplayList = configView.unCategorizedItems.map(entryToDisplaylistItem);

  return (
    <LicenseContext.Provider value={{ hasPlatinumLicense, stackManagementLink, subscriptionLink }}>
      <EuiFlexGroup direction="column">
        {children && <EuiFlexItem>{children}</EuiFlexItem>}
        <EuiFlexItem>
          {isEditing ? (
            <ConnectorConfigurationForm
              cancelEditing={() => setIsEditing(false)}
              configuration={configuration}
              hasDocumentLevelSecurity={hasDocumentLevelSecurity}
              isLoading={isLoading}
              isNative={isNative}
              saveConfig={(config) => {
                saveConfig(config);
                setIsEditing(false);
              }}
            />
          ) : (
            uncategorizedDisplayList.length > 0 && (
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiDescriptionList
                    listItems={uncategorizedDisplayList}
                    className="eui-textBreakWord"
                  />
                </EuiFlexItem>
                {configView.categories.length > 0 &&
                  configView.categories.map((category) => (
                    <EuiFlexGroup direction="column" key={category.key}>
                      <EuiFlexItem>
                        <EuiTitle size="s">
                          <h3>{category.label}</h3>
                        </EuiTitle>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiDescriptionList
                          listItems={category.configEntries.map(entryToDisplaylistItem)}
                          className="eui-textBreakWord"
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ))}
                <EuiFlexItem>
                  <EuiFlexGroup>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        data-test-subj="entSearchContent-connector-configuration-editConfiguration"
                        data-telemetry-id="entSearchContent-connector-overview-configuration-editConfiguration"
                        onClick={() => setIsEditing(!isEditing)}
                      >
                        {i18n.translate(
                          'searchConnectors.configurationConnector.config.editButton.title',
                          {
                            defaultMessage: 'Edit configuration',
                          }
                        )}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            )
          )}
        </EuiFlexItem>
        {!!error && (
          <EuiFlexItem>
            <EuiCallOut
              color="danger"
              title={i18n.translate('searchConnectors.configurationConnector.config.error.title', {
                defaultMessage: 'Connector error',
              })}
            >
              <EuiText size="s">{error}</EuiText>
            </EuiCallOut>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </LicenseContext.Provider>
  );
};
