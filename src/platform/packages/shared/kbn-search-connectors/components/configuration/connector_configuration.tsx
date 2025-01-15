/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useEffect, useRef, useState, FC, PropsWithChildren } from 'react';

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

import { isDeepEqual } from 'react-use/lib/util';
import { sortAndFilterConnectorConfiguration } from '../../utils/connector_configuration_utils';
import {
  Connector,
  ConnectorConfigProperties,
  ConnectorConfiguration,
  ConnectorStatus,
  FeatureName,
} from '../..';

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
  isDisabled?: boolean;
  isLoading: boolean;
  saveConfig: (configuration: Record<string, string | number | boolean | null>) => void;
  saveAndSync?: (configuration: Record<string, string | number | boolean | null>) => void;
  onEditStateChange?: (isEdit: boolean) => void;
  stackManagementLink?: string;
  subscriptionLink?: string;
  children?: React.ReactNode;
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

export const ConnectorConfigurationComponent: FC<
  PropsWithChildren<ConnectorConfigurationProps>
> = ({
  children,
  connector,
  hasPlatinumLicense,
  isDisabled,
  isLoading,
  saveConfig,
  saveAndSync,
  onEditStateChange,
  subscriptionLink,
  stackManagementLink,
}) => {
  const configurationRef = useRef<ConnectorConfiguration>({});
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

  useEffect(
    function propogateEditState() {
      if (onEditStateChange) {
        onEditStateChange(isEditing);
      }
    },
    [isEditing, onEditStateChange]
  );

  useEffect(() => {
    if (!isDeepEqual(configuration, configurationRef.current)) {
      configurationRef.current = configuration;
      setIsEditing(false);
    }
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
        {!uncategorizedDisplayList.length && (
          <EuiFlexItem>
            <EuiCallOut
              color="warning"
              title={i18n.translate(
                'searchConnectors.configurationConnector.config.noConfigCallout.title',
                {
                  defaultMessage: 'No configuration fields',
                }
              )}
            >
              {i18n.translate(
                'searchConnectors.configurationConnector.config.noConfigCallout.description',
                {
                  defaultMessage:
                    'This connector has no configuration fields. Has your connector connected successfully to Elasticsearch and set its configuration?',
                }
              )}
            </EuiCallOut>
          </EuiFlexItem>
        )}
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
              {...(saveAndSync && {
                saveAndSync: (config) => {
                  saveAndSync(config);
                  setIsEditing(false);
                },
              })}
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
                        isDisabled={isDisabled}
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
