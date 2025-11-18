/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiSuperDatePicker } from '@elastic/eui';
import type { CustomQuickSelectRenderOptions } from '@elastic/eui/src/components/date_picker/super_date_picker/quick_select_popover/quick_select_popover';
import type { KbnSuperDatePickerProps } from '../types';
import { EntireTimeRangePanel } from './entire_time_range_panel';
import { useCommonlyUsedRanges } from '../hooks';

export const KbnSuperDatePicker = ({
  uiSettings,
  getEntireTimeRange,
  ...euiProps
}: KbnSuperDatePickerProps) => {
  const commonlyUsedRangesFromUiSettings = useCommonlyUsedRanges({ uiSettings });
  const commonlyUsedRanges = euiProps?.commonlyUsedRanges || commonlyUsedRangesFromUiSettings;
  const dateFormat = euiProps?.dateFormat || uiSettings?.get('dateFormat');

  const quickSelectPanels = ({
    quickSelect,
    commonlyUsedRanges: commonlyUsedRangesPanel,
    recentlyUsedRanges,
    refreshInterval,
    customQuickSelectPanels,
  }: CustomQuickSelectRenderOptions) => (
    <>
      {quickSelect}
      {commonlyUsedRangesPanel}
      {typeof getEntireTimeRange === 'function' && (
        <EntireTimeRangePanel
          onTimeChange={euiProps.onTimeChange}
          getEntireTimeRange={getEntireTimeRange}
        />
      )}
      {recentlyUsedRanges}
      {refreshInterval}
      {customQuickSelectPanels}
    </>
  );

  return (
    <EuiSuperDatePicker
      {...euiProps}
      data-test-subj={euiProps['data-test-subj'] || 'kbnSuperDatePicker'}
      dateFormat={dateFormat}
      commonlyUsedRanges={commonlyUsedRanges}
      customQuickSelectRender={quickSelectPanels}
    />
  );
};
