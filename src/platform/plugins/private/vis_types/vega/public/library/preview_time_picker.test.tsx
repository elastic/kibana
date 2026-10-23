/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { DATE_RANGE_PICKER_FEATURE_FLAG } from '@kbn/date-range-picker';
import { setData } from '../services';
import { PreviewTimePicker } from './preview_time_picker';

const renderPicker = (isNewPickerEnabled: boolean) => {
  const core = coreMock.createStart();
  core.featureFlags.getBooleanValue$.mockReturnValue(new BehaviorSubject(isNewPickerEnabled));
  core.uiSettings.get.mockImplementation((key: string) =>
    key === 'timepicker:quickRanges' ? [] : undefined
  );
  const onTimeRangeChange = jest.fn();
  render(
    <PreviewTimePicker
      core={core}
      timeRange={{ from: 'now-15m', to: 'now' }}
      onTimeRangeChange={onTimeRangeChange}
    />
  );
  return { core, onTimeRangeChange };
};

describe('PreviewTimePicker', () => {
  beforeEach(() => {
    setData(dataPluginMock.createStartContract());
  });

  it('shows the date range picker the unified search bar uses', () => {
    const { core } = renderPicker(true);

    expect(core.featureFlags.getBooleanValue$).toHaveBeenCalledWith(
      DATE_RANGE_PICKER_FEATURE_FLAG,
      true
    );
    const picker = screen.getByTestId('vegaLibraryEditorPreviewTimePicker');
    expect(picker).toHaveTextContent('Last 15 minutes');
    expect(screen.queryByTestId('superDatePickerShowDatesButton')).not.toBeInTheDocument();
  });

  it('falls back to the super date picker while the new picker is turned off', () => {
    renderPicker(false);

    expect(screen.getByTestId('vegaLibraryEditorPreviewTimePicker')).toBeInTheDocument();
    expect(screen.getByTestId('superDatePickerShowDatesButton')).toBeInTheDocument();
  });
});
