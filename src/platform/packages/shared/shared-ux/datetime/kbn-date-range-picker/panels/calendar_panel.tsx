/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import { EuiButton, EuiCheckbox, EuiFlexGroup, useGeneratedHtmlId } from '@elastic/eui';

import {
  PanelBody,
  PanelContainer,
  PanelFooter,
  PanelHeader,
  SubPanelHeading,
} from '../date_range_picker_panel_ui';
import { Calendar, HourPicker } from '../calendar';
import { useDateRangePickerContext } from '../date_range_picker_context';
import type { TimeRangeBounds } from '../types';

/** Calendar-based date selection panel. */
export function CalendarPanel() {
  const { applyRange, onPresetSave, timeRange } = useDateRangePickerContext();

  const saveAsPresetCheckboxId = useGeneratedHtmlId({ prefix: 'saveAsPreset' });

  const [range, setRange] = useState<any>(null);
  const [hour, setHour] = useState<any>(null);
  const [saveAsPreset, setSaveAsPreset] = useState<boolean>(false);

  const toggleSaveAsPreset = () => {
    setSaveAsPreset((prev) => !prev);
  };

  const onApply = () => {
    // TODO: TimeRangeBounds - set range and hour to the selected values
    const rangeBounds: TimeRangeBounds = {
      start: range.start,
      end: range.end,
    };
    applyRange(rangeBounds);

    if (onPresetSave && saveAsPreset) {
      onPresetSave({
        ...rangeBounds,
        // TODO: set the range label
        label: range.label,
      });
    }
  };

  return (
    <PanelContainer>
      <PanelHeader>
        <SubPanelHeading>Calendar</SubPanelHeading>
      </PanelHeader>
      <PanelBody>
        <EuiFlexGroup gutterSize="none">
          <Calendar range={range} onRangeChange={setRange} />
          <HourPicker hour={hour} onHourChange={setHour} />
        </EuiFlexGroup>
      </PanelBody>
      <PanelFooter>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiCheckbox
            id={saveAsPresetCheckboxId}
            label="Save as preset"
            checked={saveAsPreset}
            onChange={toggleSaveAsPreset}
          />
          <EuiButton size="s" fill onClick={onApply}>
            Apply
          </EuiButton>
        </EuiFlexGroup>
      </PanelFooter>
    </PanelContainer>
  );
}
CalendarPanel.PANEL_ID = 'calendar-panel';
