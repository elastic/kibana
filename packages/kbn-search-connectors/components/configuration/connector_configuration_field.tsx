/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useState } from 'react';

import {
  EuiAccordion,
  EuiFieldText,
  EuiFieldPassword,
  EuiRadioGroup,
  EuiSelect,
  EuiSwitch,
  EuiTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiIcon,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DisplayType } from '../..';

import { ConfigEntryView, LicenseContext } from './connector_configuration';
import { DocumentLevelSecurityPanel } from './document_level_security_panel';
import {
  ensureBooleanType,
  ensureCorrectTyping,
  ensureStringType,
} from '../../utils/connector_configuration_utils';
import { PlatinumLicensePopover } from './platinum_license_popover';

interface ConnectorConfigurationFieldProps {
  configEntry: ConfigEntryView;
  isLoading: boolean;
  setConfigValue: (value: number | string | boolean | null) => void;
}

interface ConfigInputFieldProps {
  configEntry: ConfigEntryView;
  isLoading: boolean;
  validateAndSetConfigValue: (value: string) => void;
}
export const ConfigInputField: React.FC<ConfigInputFieldProps> = ({
  configEntry,
  isLoading,
  validateAndSetConfigValue,
}) => {
  const { isValid, required, placeholder, value } = configEntry;
  const [innerValue, setInnerValue] = useState(value);
  return (
    <EuiFieldText
      disabled={isLoading}
      required={required}
      value={ensureStringType(innerValue)}
      isInvalid={!isValid}
      onChange={(event) => {
        setInnerValue(event.target.value);
        validateAndSetConfigValue(event.target.value);
      }}
      placeholder={placeholder}
    />
  );
};

export const ConfigInputTextArea: React.FC<ConfigInputFieldProps> = ({
  isLoading,
  configEntry,
  validateAndSetConfigValue,
}) => {
  const { isValid, required, placeholder, value } = configEntry;
  const [innerValue, setInnerValue] = useState(value);
  return (
    <EuiTextArea
      disabled={isLoading}
      required={required}
      // ensures placeholder shows up when value is empty string
      value={ensureStringType(innerValue) || undefined}
      isInvalid={!isValid}
      onChange={(event) => {
        setInnerValue(event.target.value);
        validateAndSetConfigValue(event.target.value);
      }}
      placeholder={placeholder}
    />
  );
};

export const ConfigSensitiveTextArea: React.FC<ConfigInputFieldProps> = ({
  isLoading,
  configEntry,
  validateAndSetConfigValue,
}) => {
  const { key, label, tooltip } = configEntry;
  return (
    <EuiAccordion
      id={key + '-accordion'}
      buttonContent={
        tooltip ? (
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem>
              <p>{label}</p>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type="questionInCircle" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <p>{label}</p>
        )
      }
    >
      <ConfigInputTextArea
        isLoading={isLoading}
        configEntry={configEntry}
        validateAndSetConfigValue={validateAndSetConfigValue}
      />
    </EuiAccordion>
  );
};
export const ConfigInputPassword: React.FC<ConfigInputFieldProps> = ({
  isLoading,
  configEntry,
  validateAndSetConfigValue,
}) => {
  const { required, value } = configEntry;
  const [innerValue, setInnerValue] = useState(value);
  return (
    <EuiFieldPassword
      disabled={isLoading}
      required={required}
      type="dual"
      value={ensureStringType(innerValue)}
      onChange={(event) => {
        setInnerValue(event.target.value);
        validateAndSetConfigValue(event.target.value);
      }}
    />
  );
};

export const ConnectorConfigurationField: React.FC<ConnectorConfigurationFieldProps> = ({
  configEntry,
  isLoading,
  setConfigValue,
}) => {
  const { hasPlatinumLicense, stackManagementLink, subscriptionLink } = useContext(LicenseContext);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const validateAndSetConfigValue = (value: number | string | boolean) => {
    setConfigValue(ensureCorrectTyping(configEntry.type, value));
  };

  const { key, display, label, options, required, sensitive, tooltip, value } = configEntry;

  switch (display) {
    case DisplayType.DROPDOWN:
      return options.length > 3 ? (
        <EuiSelect
          disabled={isLoading}
          options={options.map((option) => ({ text: option.label, value: option.value }))}
          required={required}
          value={ensureStringType(value)}
          onChange={(event) => {
            validateAndSetConfigValue(event.target.value);
          }}
        />
      ) : (
        <EuiRadioGroup
          disabled={isLoading}
          idSelected={ensureStringType(value)}
          name={key}
          options={options.map((option) => ({ id: option.value, label: option.label }))}
          onChange={(id) => {
            validateAndSetConfigValue(id);
          }}
        />
      );

    case DisplayType.NUMERIC:
      return (
        <ConfigInputField
          key={key}
          isLoading={isLoading}
          configEntry={configEntry}
          validateAndSetConfigValue={validateAndSetConfigValue}
        />
      );

    case DisplayType.TEXTAREA:
      const textarea = (
        <ConfigInputTextArea
          key={sensitive ? key + '-sensitive-text-area' : key + 'text-area'}
          isLoading={isLoading}
          configEntry={configEntry}
          validateAndSetConfigValue={validateAndSetConfigValue}
        />
      );

      return sensitive ? (
        <ConfigSensitiveTextArea
          isLoading={isLoading}
          configEntry={configEntry}
          validateAndSetConfigValue={validateAndSetConfigValue}
        />
      ) : (
        textarea
      );

    case DisplayType.TOGGLE:
      if (key === 'use_document_level_security') {
        return (
          <DocumentLevelSecurityPanel
            toggleSwitch={
              <EuiFlexGroup responsive={false} gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    checked={ensureBooleanType(value)}
                    disabled={isLoading || !hasPlatinumLicense}
                    label={<p>{label}</p>}
                    onChange={(event) => {
                      validateAndSetConfigValue(event.target.checked);
                    }}
                  />
                </EuiFlexItem>
                {!hasPlatinumLicense && (
                  <EuiFlexItem grow={false}>
                    <PlatinumLicensePopover
                      button={
                        <EuiButtonIcon
                          aria-label={i18n.translate(
                            'searchConnectors.configuration.openPopoverLabel',
                            {
                              defaultMessage: 'Open licensing popover',
                            }
                          )}
                          iconType="questionInCircle"
                          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                        />
                      }
                      closePopover={() => setIsPopoverOpen(false)}
                      isPopoverOpen={isPopoverOpen}
                      stackManagementHref={stackManagementLink}
                      subscriptionLink={subscriptionLink}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            }
          />
        );
      }
      return (
        <EuiSwitch
          checked={ensureBooleanType(value)}
          disabled={isLoading}
          label={
            tooltip ? (
              <EuiFlexGroup gutterSize="xs">
                <EuiFlexItem>
                  <p>{label}</p>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="questionInCircle" />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <p>{label}</p>
            )
          }
          onChange={(event) => {
            validateAndSetConfigValue(event.target.checked);
          }}
        />
      );

    default:
      return sensitive ? (
        <ConfigInputPassword
          isLoading={isLoading}
          configEntry={configEntry}
          validateAndSetConfigValue={validateAndSetConfigValue}
        />
      ) : (
        <ConfigInputField
          key={key}
          isLoading={isLoading}
          configEntry={configEntry}
          validateAndSetConfigValue={validateAndSetConfigValue}
        />
      );
  }
};
