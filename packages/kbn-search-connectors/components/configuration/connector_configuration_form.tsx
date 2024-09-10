/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { isCategoryEntry } from '../../utils';
import { sortAndFilterConnectorConfiguration } from '../../utils/connector_configuration_utils';
import { ConnectorConfiguration } from '../../types';
import { ConfigView } from './connector_configuration';
import { ConnectorConfigurationFormItems } from './connector_configuration_form_items';

interface ConnectorConfigurationForm {
  cancelEditing: () => void;
  configuration: ConnectorConfiguration;
  hasDocumentLevelSecurity: boolean;
  isLoading: boolean;
  isNative: boolean;
  saveConfig: (config: Record<string, string | number | boolean | null>) => void;
  stackManagementHref?: string;
  subscriptionLink?: string;
}

function configViewToConfigValues(
  configView: ConfigView
): Record<string, string | number | boolean | null> {
  const result: Record<string, string | number | boolean | null> = {};
  for (const { key, value } of configView.advancedConfigurations) {
    result[key] = value;
  }
  for (const { key, value } of configView.unCategorizedItems) {
    result[key] = value;
  }
  return result;
}

export const ConnectorConfigurationForm: React.FC<ConnectorConfigurationForm> = ({
  cancelEditing,
  configuration,
  hasDocumentLevelSecurity,
  isLoading,
  isNative,
  saveConfig,
}) => {
  const [localConfig, setLocalConfig] = useState<ConnectorConfiguration>(configuration);
  const [configView, setConfigView] = useState<ConfigView>(
    sortAndFilterConnectorConfiguration(configuration, isNative)
  );

  useEffect(() => {
    setLocalConfig((localConf) => ({ ...configuration, ...localConf }));
  }, [configuration]);

  useEffect(() => {
    setConfigView(sortAndFilterConnectorConfiguration(localConfig, isNative));
  }, [localConfig, isNative]);

  return (
    <EuiForm
      onSubmit={(event) => {
        event.preventDefault();
        saveConfig(configViewToConfigValues(configView));
      }}
      component="form"
    >
      <ConnectorConfigurationFormItems
        isLoading={isLoading}
        items={configView.unCategorizedItems}
        hasDocumentLevelSecurityEnabled={hasDocumentLevelSecurity}
        setConfigEntry={(key, value) => {
          const entry = localConfig[key];
          if (entry && !isCategoryEntry(entry)) {
            const newConfiguration: ConnectorConfiguration = {
              ...localConfig,
              [key]: { ...entry, value },
            };
            setLocalConfig(newConfiguration);
          }
        }}
      />
      {configView.categories.map((category, index) => (
        <React.Fragment key={index}>
          <EuiSpacer />
          <EuiTitle size="s">
            <h3>{category.label}</h3>
          </EuiTitle>
          <EuiSpacer />
          <ConnectorConfigurationFormItems
            isLoading={isLoading}
            items={category.configEntries}
            hasDocumentLevelSecurityEnabled={hasDocumentLevelSecurity}
            setConfigEntry={(key, value) => {
              const categories = configView.categories;
              categories[index] = { ...categories[index], [key]: value };
              setConfigView({
                ...configView,
                categories,
              });
            }}
          />
        </React.Fragment>
      ))}
      {configView.advancedConfigurations.length > 0 && (
        <React.Fragment>
          <EuiSpacer />
          <EuiTitle size="xs">
            <h4>
              {i18n.translate(
                'searchConnectors.configurationConnector.config.advancedConfigurations.title',
                { defaultMessage: 'Advanced Configurations' }
              )}
            </h4>
          </EuiTitle>
          <EuiPanel color="subdued">
            <ConnectorConfigurationFormItems
              isLoading={isLoading}
              items={configView.advancedConfigurations}
              hasDocumentLevelSecurityEnabled={hasDocumentLevelSecurity}
              setConfigEntry={(key, value) => {
                setConfigView({
                  ...configView,
                  advancedConfigurations: configView.advancedConfigurations.map((config) =>
                    config.key === key ? { ...config, value } : config
                  ),
                });
              }}
            />
          </EuiPanel>
        </React.Fragment>
      )}
      <EuiSpacer />
      <EuiFormRow>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="entSearchContent-connector-configuration-saveConfiguration"
              data-telemetry-id="entSearchContent-connector-configuration-saveConfiguration"
              type="submit"
              isLoading={isLoading}
            >
              {i18n.translate('searchConnectors.configurationConnector.config.submitButton.title', {
                defaultMessage: 'Save configuration',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-telemetry-id="entSearchContent-connector-configuration-cancelEdit"
              isDisabled={isLoading}
              onClick={() => {
                cancelEditing();
              }}
            >
              {i18n.translate(
                'searchConnectors.configurationConnector.config.cancelEditingButton.title',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiForm>
  );
};
