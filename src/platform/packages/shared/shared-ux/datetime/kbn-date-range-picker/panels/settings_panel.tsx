/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';

import { EuiFlexGroup, EuiSwitch, EuiFormRow } from '@elastic/eui';

import {
  PanelContainer,
  PanelHeader,
  PanelBody,
  PanelBodySection,
  PanelBodySectionInfo,
  SubPanelHeading,
} from '../date_range_picker_panel_ui';
import { AutoRefresh } from '../settings/auto_refresh';
import { useDateRangePickerContext } from '../date_range_picker_context';
import { settingsPanelTexts } from '../translations';

// TODO replace with real Kibana advanced settings URL
const ADVANCED_SETTINGS_URL = '/app/management/kibana/settings';

/**
 * Settings panel for the date range picker, accessible from the main panel gear button.
 */
export function SettingsPanel() {
  const { settings, onSettingsChange, hasAutoRefresh } = useDateRangePickerContext();

  const handleRoundRelativeTimeChange = useCallback(() => {
    onSettingsChange({ ...settings, roundRelativeTime: !settings.roundRelativeTime });
  }, [settings, onSettingsChange]);

  return (
    <PanelContainer>
      <PanelHeader>
        <SubPanelHeading>{settingsPanelTexts.heading}</SubPanelHeading>
      </PanelHeader>
      <PanelBody spacingSide="both">
        <PanelBodySection>
          <EuiFlexGroup gutterSize="xl" direction="column">
            <EuiFlexGroup gutterSize="m" direction="column">
              {hasAutoRefresh && settings.autoRefresh ? (
                <AutoRefresh autoRefresh={settings.autoRefresh} />
              ) : null}
              <EuiFormRow helpText={settingsPanelTexts.roundRelativeTimeDescription}>
                <EuiSwitch
                  label={settingsPanelTexts.roundRelativeTimeLabel}
                  checked={settings.roundRelativeTime}
                  onChange={handleRoundRelativeTimeChange}
                  compressed
                />
              </EuiFormRow>
            </EuiFlexGroup>
            <EuiFlexGroup gutterSize="m" direction="column">
              <PanelBodySectionInfo
                heading={settingsPanelTexts.timeFormatHeading}
                markdown={settingsPanelTexts.timeFormatDescription}
                linkLabel={settingsPanelTexts.advancedSettingsLink}
                linkHref={ADVANCED_SETTINGS_URL}
              />
              <PanelBodySectionInfo
                heading={settingsPanelTexts.newTimePickerHeading}
                markdown={settingsPanelTexts.newTimePickerDescription}
                linkLabel={settingsPanelTexts.advancedSettingsLink}
                linkHref={ADVANCED_SETTINGS_URL}
              />
            </EuiFlexGroup>
          </EuiFlexGroup>
        </PanelBodySection>
      </PanelBody>
    </PanelContainer>
  );
}
SettingsPanel.PANEL_ID = 'settings-panel';
