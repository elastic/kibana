/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  DATA_TEST_SUBJ_SETTING_DEFINITIONS_RETRY,
  SettingDefinitionsLoadError,
} from './setting_definitions_load_error';

describe('SettingDefinitionsLoadError', () => {
  it('shows the default title and the error message', () => {
    render(
      <SettingDefinitionsLoadError
        error={new Error('Internal Server Error')}
        onRetry={jest.fn()}
        data-test-subj="loadError"
      />
    );

    const callout = screen.getByTestId('loadError');
    expect(callout).toHaveTextContent('Unable to load settings');
    expect(callout).toHaveTextContent('Internal Server Error');
  });

  it('shows a custom title', () => {
    render(
      <SettingDefinitionsLoadError
        error={new Error('Internal Server Error')}
        onRetry={jest.fn()}
        title="Unable to load advanced settings"
        data-test-subj="loadError"
      />
    );

    expect(screen.getByTestId('loadError')).toHaveTextContent('Unable to load advanced settings');
  });

  it('calls onRetry when the retry button is clicked', () => {
    const onRetry = jest.fn();
    render(<SettingDefinitionsLoadError error={new Error('Failed')} onRetry={onRetry} />);

    const retryButton = screen.getByTestId(DATA_TEST_SUBJ_SETTING_DEFINITIONS_RETRY);
    expect(retryButton).toHaveTextContent('Try again');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
