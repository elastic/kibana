/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';

import { EuiFlexGroup, EuiSwitch, EuiButtonGroup, EuiText, EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { TimePrecision } from '../types';

import {
  PanelContainer,
  PanelHeader,
  PanelBody,
  PanelBodySection,
  PanelBodySectionInfo,
  SubPanelHeading,
  PanelFooter,
} from '../date_range_picker_panel_ui';
import { AutoRefresh } from '../settings/auto_refresh';
import { useDateRangePickerContext } from '../date_range_picker_context';
import { settingsPanelTexts } from '../translations';
import { useTimeZoneDisplay } from '../hooks/use_time_zone_display';

const ADVANCED_SETTINGS_URL_TIME_ZONE = '/app/management/kibana/settings?query=dateFormat:tz';

/**
 * Settings panel for the date range picker, accessible from the main panel gear button.
 */
export function SettingsPanel() {
  const {
    settings,
    onSettingsChange,
    hasAutoRefresh,
    timeZone,
    prependBasePath,
    canAccessAdvancedSettings,
  } = useDateRangePickerContext();

  const handleRoundRelativeTimeChange = useCallback(() => {
    onSettingsChange({ ...settings, roundRelativeTime: !settings.roundRelativeTime });
  }, [settings, onSettingsChange]);

  const timePrecision = settings.timePrecision;
  const handleTimePrecisionChange = useCallback(
    (id: string) => {
      onSettingsChange({ ...settings, timePrecision: id as TimePrecision });
    },
    [settings, onSettingsChange]
  );

  const timePrecisionOptions = [
    { id: 'none', label: settingsPanelTexts.timePrecisionNone },
    { id: 's', label: settingsPanelTexts.timePrecisionSeconds },
    { id: 'ms', label: settingsPanelTexts.timePrecisionMilliseconds },
  ];

  const timeZoneDisplayAbbr = useTimeZoneDisplay(timeZone, null, true);
  const timeZoneLabel =
    timeZone === 'Browser'
      ? settingsPanelTexts.timeZoneBrowserLocale(timeZoneDisplayAbbr ?? '')
      : `${timeZone} (${timeZoneDisplayAbbr})`;

  return (
    <PanelContainer data-test-subj="dateRangePickerSettingsPanel">
      <PanelHeader>
        <SubPanelHeading>{settingsPanelTexts.heading}</SubPanelHeading>
      </PanelHeader>
      <PanelBody spacingSide="both">
        <PanelBodySection>
          <EuiFlexGroup gutterSize="l" direction="column">
            {hasAutoRefresh && settings.autoRefresh ? (
              <AutoRefresh autoRefresh={settings.autoRefresh} />
            ) : null}
            <PanelBodySectionInfo
              heading={settingsPanelTexts.timeFormatHeading}
              markdown={settingsPanelTexts.timeFormatDescription(timeZoneLabel)}
              linkLabel={
                canAccessAdvancedSettings ? settingsPanelTexts.advancedSettingsLink : undefined
              }
              linkHref={
                canAccessAdvancedSettings
                  ? prependBasePath(ADVANCED_SETTINGS_URL_TIME_ZONE)
                  : undefined
              }
            />
            <PanelBodySectionInfo heading={settingsPanelTexts.relativeTimeRangeHeading}>
              <EuiSwitch
                label={settingsPanelTexts.roundRelativeTimeLabel}
                checked={settings.roundRelativeTime}
                onChange={handleRoundRelativeTimeChange}
                compressed
                data-test-subj="dateRangePickerSettingRoundRelativeTime"
              />
            </PanelBodySectionInfo>
            {timePrecision !== undefined ? (
              <PanelBodySectionInfo heading={settingsPanelTexts.absoluteTimeRangeHeading}>
                <EuiText size="s" component="p">
                  {settingsPanelTexts.timePrecisionPrompt}
                </EuiText>
                <EuiButtonGroup
                  legend={settingsPanelTexts.timePrecisionLabel}
                  options={timePrecisionOptions}
                  idSelected={timePrecision}
                  onChange={handleTimePrecisionChange}
                  buttonSize="compressed"
                  isFullWidth
                  data-test-subj="dateRangePickerSettingTimePrecision"
                />
              </PanelBodySectionInfo>
            ) : null}
          </EuiFlexGroup>
        </PanelBodySection>
      </PanelBody>
      <PanelFooter>
        <EuiBadge aria-label="Tech preview" color="hollow" iconType="flask" />
        <EuiText size="xs" color="subdued" component="p">
          <FormattedMessage
            id="sharedUXPackages.dateRangePicker.settingsPanel.technicalPreviewNotice"
            defaultMessage="This time picker is in a technical preview."
          />
        </EuiText>
      </PanelFooter>
    </PanelContainer>
  );
}
SettingsPanel.PANEL_ID = 'settings-panel';
