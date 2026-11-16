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
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { setData } from '../services';
import { PreviewTimePicker } from './preview_time_picker';

describe('PreviewTimePicker', () => {
  beforeEach(() => {
    setData(dataPluginMock.createStartContract());
  });

  it('shows the date range picker the unified search bar uses', () => {
    render(
      <PreviewTimePicker
        core={coreMock.createStart()}
        timeRange={{ from: 'now-15m', to: 'now' }}
        onTimeRangeChange={jest.fn()}
      />
    );

    const picker = screen.getByTestId('vegaLibraryEditorPreviewTimePicker');
    expect(picker).toHaveTextContent('Last 15 minutes');
    expect(screen.queryByTestId('superDatePickerShowDatesButton')).not.toBeInTheDocument();
  });
});
