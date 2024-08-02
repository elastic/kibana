/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { TRUNCATE_MAX_HEIGHT, TRUNCATE_MAX_HEIGHT_DEFAULT_VALUE } from '@kbn/discover-utils';
import { TableFieldValue } from './table_cell_value';
import { setUnifiedDocViewerServices } from '../../plugin';
import { mockUnifiedDocViewerServices } from '../../__mocks__';

const mockServices = {
  ...mockUnifiedDocViewerServices,
};

mockServices.uiSettings.get = ((key: string) => {
  if (key === TRUNCATE_MAX_HEIGHT) {
    return TRUNCATE_MAX_HEIGHT_DEFAULT_VALUE;
  }
  return;
}) as IUiSettingsClient['get'];

setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

describe('TableFieldValue', () => {
  it('should render correctly', async () => {
    render(
      <TableFieldValue
        formattedValue="100,000"
        rawValue={10000}
        field="bytes"
        isDetails={false}
        ignoreReason={undefined}
      />
    );

    expect(screen.getByText('100,000')).toBeInTheDocument();
    expect(screen.queryByTestId('toggleLongFieldValue-bytes')).toBeNull();
  });

  it('should truncate a long value correctly', async () => {
    const value = 'long value'.repeat(300);
    render(
      <TableFieldValue
        formattedValue={value}
        rawValue={value}
        field="message"
        isDetails={false}
        ignoreReason={undefined}
      />
    );

    expect(screen.getByText(value)).toBeInTheDocument();

    let toggleButton = screen.getByTestId('toggleLongFieldValue-message');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton.getAttribute('aria-expanded')).toBe('false');

    expect(screen.getByTestId('tableDocViewRow-message-value').getAttribute('css')).toBeDefined();

    toggleButton.click();

    toggleButton = screen.getByTestId('toggleLongFieldValue-message');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton.getAttribute('aria-expanded')).toBe('true');

    expect(screen.getByTestId('tableDocViewRow-message-value').getAttribute('css')).toBeNull();
  });

  it('should not truncate a long value when inside a popover', async () => {
    const value = 'long value'.repeat(300);
    render(
      <TableFieldValue
        formattedValue={value}
        rawValue={value}
        field="message"
        isDetails={true}
        ignoreReason={undefined}
      />
    );

    expect(screen.getByText(value)).toBeInTheDocument();

    expect(screen.queryByTestId('toggleLongFieldValue-bytes')).toBeNull();
    expect(screen.getByTestId('tableDocViewRow-message-value').getAttribute('css')).toBeNull();
  });
});
