/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiColorPicker,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  isValidHex,
} from '@elastic/eui';
import { DeveloperToolbarContext } from '../context/developer_toolbar_context';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const context = useContext(DeveloperToolbarContext);

  if (!context) {
    return null;
  }

  const {
    items,
    settings,
    toggleSetting,
    toggleItemEnabled,
    updateCustomEnvironmentLabel,
    updateCustomBackgroundColor,
  } = context;
  if (!isOpen) {
    return null;
  }

  return (
    <EuiModal onClose={onClose} style={{ width: 400 }} aria-label={'Developer Toolbar Settings'}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Developer Toolbar Settings</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFormRow
          label="Custom Environment Label"
          helpText="Override the environment badge text with a custom label. Leave empty for default behavior."
        >
          <EuiFieldText
            value={settings.customEnvironmentLabel}
            onChange={(e) => updateCustomEnvironmentLabel(e.target.value)}
            placeholder="e.g., 'QA Environment', 'Local Dev', 'Staging'"
            aria-label="Custom environment label"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />

        <EuiFormRow
          label="Toolbar Background Color"
          helpText="Customize the toolbar background color. Leave empty for theme default."
        >
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <EuiColorPicker
                onChange={(color) => {
                  if (isValidHex(color)) {
                    updateCustomBackgroundColor(color);
                  } else if (!color) {
                    // If the color is cleared, set to undefined
                    // This allows resetting to theme default
                    updateCustomBackgroundColor(undefined);
                  } else {
                    // If the color is invalid, do not update
                    return;
                  }
                }}
                color={settings.customBackgroundColor}
                placeholder="Theme default"
                showAlpha={false}
                aria-label="Custom background color"
              />
            </EuiFlexItem>
            {settings.customBackgroundColor && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => updateCustomBackgroundColor(undefined)}
                  aria-label="Reset to default background color"
                >
                  Reset
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiText size="s" color="subdued">
          <p>Toggle indicators on or off. Changes are saved automatically.</p>
        </EuiText>
        <EuiSpacer size="m" />

        <EuiSwitch
          label="Environment Info"
          checked={settings.environmentEnabled}
          onChange={() => toggleSetting('environmentEnabled')}
        />
        <EuiSpacer size="s" />

        <EuiSwitch
          label="Frame Jank Monitor"
          checked={settings.frameJankEnabled}
          onChange={() => toggleSetting('frameJankEnabled')}
        />
        <EuiSpacer size="s" />

        <EuiSwitch
          label="Memory Usage"
          checked={settings.memoryUsageEnabled}
          onChange={() => toggleSetting('memoryUsageEnabled')}
        />
        <EuiSpacer size="s" />

        <EuiSwitch
          label="Console Errors"
          checked={settings.consoleErrorsEnabled}
          onChange={() => toggleSetting('consoleErrorsEnabled')}
        />
        <EuiSpacer size="s" />

        {items.length > 0 && (
          <>
            {items.map((item) => {
              const isEnabled = !settings.disabledItemIds.includes(item.id);
              const label = item.id;

              return (
                <React.Fragment key={item.id}>
                  <EuiSwitch
                    label={label}
                    checked={isEnabled}
                    onChange={() => toggleItemEnabled(item.id)}
                  />
                  <EuiSpacer size="s" />
                </React.Fragment>
              );
            })}
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={onClose} fill>
          Close
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
