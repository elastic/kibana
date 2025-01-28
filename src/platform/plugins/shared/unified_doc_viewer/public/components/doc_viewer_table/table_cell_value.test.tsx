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
import { TableFieldValue } from './table_cell_value';
import { setUnifiedDocViewerServices } from '../../plugin';
import { mockUnifiedDocViewerServices } from '../../__mocks__';

setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

let mockScrollHeight = 0;
jest.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(() => mockScrollHeight);

describe('TableFieldValue', () => {
  afterEach(() => {
    mockScrollHeight = 0;
  });

  it('should render correctly', async () => {
    mockScrollHeight = 10;

    render(
      <TableFieldValue
        formattedValue="100,000"
        rawValue={10000}
        field="bytes"
        ignoreReason={undefined}
        isDetails={false}
      />
    );

    expect(screen.getByText('100,000')).toBeInTheDocument();
    expect(screen.queryByTestId('toggleLongFieldValue-bytes')).toBeNull();
  });

  it('should truncate a long value correctly', async () => {
    mockScrollHeight = 1000;

    const value = 'long value'.repeat(300);
    render(
      <TableFieldValue
        formattedValue={value}
        rawValue={value}
        field="message"
        ignoreReason={undefined}
        isDetails={false}
      />
    );

    expect(screen.getByText(value)).toBeInTheDocument();

    let toggleButton = screen.getByTestId('toggleLongFieldValue-message');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton.getAttribute('aria-expanded')).toBe('false');

    let valueElement = screen.getByTestId('tableDocViewRow-message-value');
    expect(valueElement.getAttribute('css')).toBeDefined();
    expect(valueElement.classList.contains('kbnDocViewer__value--truncated')).toBe(true);

    toggleButton.click();

    toggleButton = screen.getByTestId('toggleLongFieldValue-message');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton.getAttribute('aria-expanded')).toBe('true');

    valueElement = screen.getByTestId('tableDocViewRow-message-value');
    expect(valueElement.getAttribute('css')).toBeNull();
    expect(valueElement.classList.contains('kbnDocViewer__value--truncated')).toBe(false);

    toggleButton.click();

    toggleButton = screen.getByTestId('toggleLongFieldValue-message');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton.getAttribute('aria-expanded')).toBe('false');

    valueElement = screen.getByTestId('tableDocViewRow-message-value');
    expect(valueElement.getAttribute('css')).toBeDefined();
    expect(valueElement.classList.contains('kbnDocViewer__value--truncated')).toBe(true);
  });

  it('should not truncate a long value when inside a popover', async () => {
    mockScrollHeight = 1000;

    const value = 'long value'.repeat(300);
    render(
      <TableFieldValue
        formattedValue={value}
        rawValue={value}
        field="message"
        ignoreReason={undefined}
        isDetails={true}
      />
    );

    expect(screen.getByText(value)).toBeInTheDocument();
    expect(screen.queryByTestId('toggleLongFieldValue-message')).toBeNull();

    const valueElement = screen.getByTestId('tableDocViewRow-message-value');
    expect(valueElement.getAttribute('css')).toBeNull();
    expect(valueElement.classList.contains('kbnDocViewer__value--truncated')).toBe(false);
  });
});
