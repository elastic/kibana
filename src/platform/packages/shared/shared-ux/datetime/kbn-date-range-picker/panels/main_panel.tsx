/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';

import { EuiButton, EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';

import type { TimeRangeBoundsOption } from '../types';
import {
  PanelContainer,
  PanelBody,
  PanelBodySection,
  PanelFooter,
  PanelListItem,
} from '../date_range_picker_panel_ui';
import { useDateRangePickerContext } from '../date_range_picker_context';
import { useDateRangePickerPanelNavigation } from '../date_range_picker_panel_navigation';
import { mainPanelStyles } from './main_panel.styles';
import { getOptionDisplayLabel, getOptionShorthand, getOptionInputText } from '../utils';
import { mainPanelTexts } from '../translations';

interface OptionsListProps {
  /** Options to render as selectable list items. */
  options: TimeRangeBoundsOption[];
  /** When true, show an offset shorthand suffix on each item. */
  showShorthand?: boolean;
}

/** Renders a list of time range options as selectable `PanelListItem` entries. */
const OptionsList = ({ options, showShorthand }: OptionsListProps) => {
  const { applyRange } = useDateRangePickerContext();
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
          {mainPanelTexts.presetsTab}
        </EuiTab>
        <EuiTab
          isSelected={selectedTabId === 'recent'}
          disabled={!hasRecent}
          onClick={() => setSelectedTabId('recent')}
        >
          {mainPanelTexts.recentTab}
        </EuiTab>
      </EuiTabs>

      {selectedTabId === 'presets' && <OptionsList options={presets} showShorthand />}
      {selectedTabId === 'recent' && <OptionsList options={recent} />}
    </>
  );
};

export function MainPanel() {
  const { navigateTo } = useDateRangePickerPanelNavigation();

  return (
    <PanelContainer>
      <PanelBody>
        <PanelBodySection spacingSide="block">
          <PresetsRecentTabs />
        </PanelBodySection>
      </PanelBody>
      <PanelFooter>
        <EuiButton size="s" fullWidth onClick={() => navigateTo('example-panel')}>
          Example panel
        </EuiButton>
      </PanelFooter>
    </PanelContainer>
  );
}
