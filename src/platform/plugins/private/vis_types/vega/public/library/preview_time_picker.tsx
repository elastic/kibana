/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiSuperDatePicker, useIsWithinBreakpoints } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import {
  DATE_RANGE_PICKER_FEATURE_FLAG,
  DateRangePicker,
  type DateRangePickerSettings,
} from '@kbn/date-range-picker';
import { useDateRangePickerPresets } from '@kbn/date-range-picker-presets';
import type { TimeRange } from '@kbn/es-query';
import { getData } from '../services';

interface QuickRange {
  from: string;
  to: string;
  display: string;
}

export interface PreviewTimePickerProps {
  core: Pick<CoreStart, 'application' | 'featureFlags' | 'http' | 'notifications' | 'uiSettings'>;
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
}

/**
 * The time range picker the unified search bar shows on dashboards, without auto refresh or
 * recently used ranges, which the preview doesn't have. Like the search bar, it falls back to
 * `EuiSuperDatePicker` while the new picker's feature flag is off.
 */
export const PreviewTimePicker = ({
  core,
  timeRange,
  onTimeRangeChange,
}: PreviewTimePickerProps) => {
  const { application, featureFlags, http, notifications, uiSettings } = core;
  const isNewPickerEnabled$ = useMemo(
    () => featureFlags.getBooleanValue$(DATE_RANGE_PICKER_FEATURE_FLAG, true),
    [featureFlags]
  );
  const isNewPickerEnabled = useObservable(isNewPickerEnabled$, true);
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const [settings, setSettings] = useState<DateRangePickerSettings>({
    roundRelativeTime: false,
    timePrecision: 'none',
  });
  const { presets } = useDateRangePickerPresets({
    service: getData().dateRangePickerPresets,
    persistenceEnabled: false,
    notifications,
  });
  const quickRanges = useMemo(
    () =>
      uiSettings
        .get<QuickRange[]>(UI_SETTINGS.TIMEPICKER_QUICK_RANGES)
        .map(({ from, to, display }) => ({ start: from, end: to, label: display })),
    [uiSettings]
  );

  if (!isNewPickerEnabled) {
    return (
      <EuiSuperDatePicker
        start={timeRange.from}
        end={timeRange.to}
        onTimeChange={({ start, end }) => onTimeRangeChange({ from: start, to: end })}
        commonlyUsedRanges={quickRanges}
        showUpdateButton={false}
        compressed
        width="auto"
        data-test-subj="vegaLibraryEditorPreviewTimePicker"
      />
    );
  }

  return (
    <DateRangePicker
      value={`${timeRange.from} to ${timeRange.to}`}
      onChange={({ start, end, isInvalid }) => {
        if (!isInvalid) onTimeRangeChange({ from: start, to: end });
      }}
      width="auto"
      compressed
      collapsed={isMobile}
      showTimeWindowButtons
      presets={presets}
      settings={settings}
      onSettingsChange={setSettings}
      timeZone={uiSettings.get('dateFormat:tz')}
      prependBasePath={http.basePath.prepend}
      canAccessAdvancedSettings={Boolean(application.capabilities.advancedSettings?.save)}
      data-test-subj="vegaLibraryEditorPreviewTimePicker"
    />
  );
};
