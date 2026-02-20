/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';

import { css } from '@emotion/react';
import { EuiButtonIcon, EuiTab, EuiTabs, EuiToolTip, useEuiTheme } from '@elastic/eui';

import type { TimeRangeBoundsOption } from '../types';
import {
  PanelContainer,
  PanelBody,
  PanelBodySection,
  PanelFooter,
  PanelListItem,
  PanelNavItem,
} from '../date_range_picker_panel_ui';
import { useDateRangePickerContext } from '../date_range_picker_context';
import { useDateRangePickerPanelNavigation } from '../date_range_picker_panel_navigation';
import { mainPanelStyles } from './main_panel.styles';
import { getOptionDisplayLabel, getOptionShorthand, getOptionInputText } from '../utils';
import { mainPanelTexts } from '../translations';

interface OptionsListProps {
  /** Options to render as list items. */
  options: TimeRangeBoundsOption[];
  /** When true, show the shorthand of the time range. */
  showShorthand?: boolean;
}

/** Renders a list of time range options as selectable `PanelListItem` entries. */
const OptionsList = ({ options, showShorthand }: OptionsListProps) => {
  const { applyRange, onPresetDelete } = useDateRangePickerContext();
  const euiThemeContext = useEuiTheme();
  const styles = mainPanelStyles(euiThemeContext);

  const handleSelect = useCallback(
    (option: TimeRangeBoundsOption) => {
      applyRange({ start: option.start, end: option.end }, getOptionInputText(option));
    },
    [applyRange]
  );

  return (
    <ul css={styles.list}>
      {options.map((option, index) => (
        <PanelListItem
          key={`${option.start}-${option.end}-${index}`}
          onClick={() => handleSelect(option)}
          suffix={showShorthand ? getOptionShorthand(option) ?? undefined : undefined}
          extraActions={
            onPresetDelete ? (
              <EuiButtonIcon
                aria-label={mainPanelTexts.deletePresetAriaLabel}
                iconType="trash"
                color="danger"
                size="xs"
                onClick={() => onPresetDelete(option)}
              />
            ) : undefined
          }
        >
          {getOptionDisplayLabel(option)}
        </PanelListItem>
      ))}
    </ul>
  );
};

/** Tabbed view switching between presets and recently used ranges. */
const PresetsRecentTabs = () => {
  const { presets, recent } = useDateRangePickerContext();
  const [selectedTabId, setSelectedTabId] = useState<'presets' | 'recent'>('presets');
  const euiThemeContext = useEuiTheme();
  const styles = mainPanelStyles(euiThemeContext);
  const hasRecent = recent.length > 0;

  return (
    <>
      <EuiTabs size="s" css={styles.tabs}>
        <EuiTab
          isSelected={selectedTabId === 'presets'}
          onClick={() => setSelectedTabId('presets')}
        >
          {mainPanelTexts.presetsLabel}
        </EuiTab>
        <EuiTab
          isSelected={selectedTabId === 'recent'}
          disabled={!hasRecent}
          onClick={() => setSelectedTabId('recent')}
        >
          {mainPanelTexts.recentLabel}
        </EuiTab>
      </EuiTabs>

      {selectedTabId === 'presets' && <OptionsList options={presets} showShorthand />}
      {selectedTabId === 'recent' && <OptionsList options={recent} />}
    </>
  );
};

const SubPanelMenu = () => {
  const { navigateTo, panelDescriptors } = useDateRangePickerPanelNavigation();
  const euiThemeContext = useEuiTheme();
  const styles = mainPanelStyles(euiThemeContext);

  return (
    <ul css={styles.list}>
      <PanelNavItem onClick={() => navigateTo('calendar-panel')} icon="calendar">
        {mainPanelTexts.calendarPanelTitle}
      </PanelNavItem>
      <PanelNavItem onClick={() => navigateTo('custom-time-range-panel')} icon="controls">
        {mainPanelTexts.customTimeRangePanelTitle}
      </PanelNavItem>
      {panelDescriptors.map(({ id, title, icon }) => (
        <PanelNavItem key={id} onClick={() => navigateTo(id)} icon={icon}>
          {title}
        </PanelNavItem>
      ))}
    </ul>
  );
};

export function MainPanel() {
  const { onPresetSave, timeRange } = useDateRangePickerContext();
  const { euiTheme } = useEuiTheme();

  const handlePresetSave = useCallback(() => {
    if (timeRange.isInvalid || !onPresetSave) return;
    onPresetSave({ start: timeRange.start, end: timeRange.end, label: timeRange.value });
  }, [onPresetSave, timeRange]);

  const stickyMenuStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
    position: sticky;
    bottom: 0;
  `;

  // temporary dev-only flag to show the footer conditionally
  // TODO remove as we make progress and add content to it
  const _showFooter = typeof onPresetSave === 'function';

  return (
    <PanelContainer>
      <PanelBody>
        <PanelBodySection spacingSide="none">
          <PresetsRecentTabs />
        </PanelBodySection>
        <PanelBodySection spacingSide="none" css={stickyMenuStyles}>
          <SubPanelMenu />
        </PanelBodySection>
      </PanelBody>
      {_showFooter && (
        <PanelFooter
          primaryAction={
            // @ts-ignore onPresetSave is optional at the consumer level (_showFooter is temporary)
            onPresetSave ? (
              <EuiToolTip content={mainPanelTexts.savePresetTooltip} disableScreenReaderOutput>
                <EuiButtonIcon
                  aria-label={mainPanelTexts.savePresetTooltip}
                  iconType="save"
                  display="base"
                  color="text"
                  size="s"
                  disabled={timeRange.isInvalid}
                  onClick={handlePresetSave}
                />
              </EuiToolTip>
            ) : undefined
          }
        />
      )}
    </PanelContainer>
  );
}
