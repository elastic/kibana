/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { useIsWithinBreakpoints } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { DateRangePicker, type DateRangePickerSettings } from '@kbn/date-range-picker';
import { useDateRangePickerPresets } from '@kbn/date-range-picker-presets';
import type { TimeRange } from '@kbn/es-query';
import { getData } from '../services';

interface PreviewTimePickerProps {
  core: Pick<CoreStart, 'application' | 'http' | 'notifications' | 'uiSettings'>;
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
}

/**
 * The time range picker the unified search bar shows on dashboards, without auto refresh or
 * recently used ranges, which the preview doesn't have.
 */
export const PreviewTimePicker = ({
  core,
  timeRange,
  onTimeRangeChange,
}: PreviewTimePickerProps) => {
  const { application, http, notifications, uiSettings } = core;
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const [settings, setSettings] = useState<DateRangePickerSettings>({
    roundRelativeTime: false,
    timePrecision: 'none',
  });
  // Like the search bar, so the user's saved presets show here too.
  const { presets, onPresetSave, onPresetDelete } = useDateRangePickerPresets({
    service: getData().dateRangePickerPresets,
    persistenceEnabled: true,
    notifications,
  });

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
      onPresetSave={onPresetSave}
      onPresetDelete={onPresetDelete}
      settings={settings}
      onSettingsChange={setSettings}
      timeZone={uiSettings.get('dateFormat:tz')}
      prependBasePath={http.basePath.prepend}
      canAccessAdvancedSettings={Boolean(application.capabilities.advancedSettings?.save)}
      data-test-subj="vegaLibraryEditorPreviewTimePicker"
    />
  );
};
