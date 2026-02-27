/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type ComponentType } from 'react';

import type { IconType } from '@elastic/eui';

import type { TimeRangeBounds, TimeRangeBoundsOption } from './types';
import type { TimeWindowButtonsConfig } from './date_range_picker_time_window_buttons';
import { DateRangePickerProvider } from './date_range_picker_context';
import { DateRangePickerDialog } from './date_range_picker_dialog';
import {
  DateRangePickerPanelNavigationProvider,
  DateRangePickerPanel,
  type DateRangePickerPanelDescriptor,
} from './date_range_picker_panel_navigation';
import { MainPanel } from './panels/main_panel';
import { CalendarPanel } from './panels/calendar_panel';
import { CustomTimeRangePanel } from './panels/custom_time_range_panel';
import { ExamplePanel, ExampleNestedPanel } from './panels/example_panel';

const DEFAULT_PANEL_ID = 'main' as const;

export type { TimeWindowButtonsConfig } from './date_range_picker_time_window_buttons';

/** Configuration for a consumer-provided panel inside the date range picker dialog. */
export interface DateRangePickerPanelConfig {
  /** Unique panel identifier, used for navigation */
  id: string;
  /** Title shown in panel header and navigation button */
  title: string;
  /** Icon type passed to `EuiIcon` for the panel navigation item */
  icon?: IconType;
  /**
   * Panel component to render. Must be a component reference (not an element).
   * Rendered inside the provider tree so it can use
   * `useDateRangePickerContext()` and `useDateRangePickerPanelNavigation()`.
   */
  component: ComponentType;
}

export interface DateRangePickerProps {
  /** Initial text representation of the time range */
  defaultValue?: string;
  /** Callback for when the time changes */
  onChange: (props: DateRangePickerOnChangeProps) => void;
  /** Custom format for displaying (and parsing?) dates */
  dateFormat?: string;
  /** Show invalid state */
  isInvalid?: boolean;
  /**
   * Called when the editing input text changes.
   * @beta
   */
  onInputChange?: (value: string) => void;
  /**
   * Reduce input height and padding
   * @default true
   */
  compressed?: boolean;
  /**
   * Show time window buttons (previous, zoom out, zoom in, next) beside the control.
   * Pass `true` for defaults, or a config object for fine-grained control.
   * @default false
   */
  showTimeWindowButtons?: boolean | TimeWindowButtonsConfig;
  /**
   * Additional panels rendered inside the dialog popover.
   * Each panel is navigatable via `useDateRangePickerPanelNavigation().navigateTo(id)`.
   */
  panels?: DateRangePickerPanelConfig[];
  /**
   * Predefined time range options shown in the Presets section.
   */
  presets?: TimeRangeBoundsOption[];
  /**
   * Recently used time ranges shown in the Recent section.
   * @default []
   */
  recent?: TimeRangeBoundsOption[];
  /** Called when the user wants to save the current input time range as a preset. */
  onPresetSave?: (option: TimeRangeBoundsOption) => void;
  /** Called when the user wants to delete a saved preset. */
  onPresetDelete?: (option: TimeRangeBoundsOption) => void;
}

export interface DateRangePickerOnChangeProps extends TimeRangeBounds {
  /** Start as Date object */
  startDate: Date | null;
  /** End as Date object */
  endDate: Date | null;
  /** Text representation of the time range */
  value: string;
  /** Whether the time range is invalid */
  isInvalid: boolean;
}

/**
 * A date range picker component that accepts natural language and date math input.
 */
export function DateRangePicker({ panels = [], ...props }: DateRangePickerProps) {
  const defaultPanelId = DEFAULT_PANEL_ID;
  const panelDescriptors: DateRangePickerPanelDescriptor[] = useMemo(
    () => panels.map(({ id, title, icon }) => ({ id, title, icon })),
    [panels]
  );

  return (
    <DateRangePickerProvider {...props}>
      <DateRangePickerDialog>
        <DateRangePickerPanelNavigationProvider
          defaultPanelId={defaultPanelId}
          panelDescriptors={panelDescriptors}
        >
          <DateRangePickerPanel id="main">
            <MainPanel />
          </DateRangePickerPanel>
          <DateRangePickerPanel id={CalendarPanel.PANEL_ID}>
            <CalendarPanel />
          </DateRangePickerPanel>
          <DateRangePickerPanel id={CustomTimeRangePanel.PANEL_ID}>
            <CustomTimeRangePanel />
          </DateRangePickerPanel>
          {panels.map(({ id, component: Component }) => (
            <DateRangePickerPanel key={id} id={id}>
              <Component />
            </DateRangePickerPanel>
          ))}
          {/* TODO Example panels, can be removed after initial development finishes */}
          <DateRangePickerPanel id={ExamplePanel.PANEL_ID}>
            <ExamplePanel />
          </DateRangePickerPanel>
          <DateRangePickerPanel id={ExampleNestedPanel.PANEL_ID}>
            <ExampleNestedPanel />
          </DateRangePickerPanel>
        </DateRangePickerPanelNavigationProvider>
      </DateRangePickerDialog>
    </DateRangePickerProvider>
  );
}
