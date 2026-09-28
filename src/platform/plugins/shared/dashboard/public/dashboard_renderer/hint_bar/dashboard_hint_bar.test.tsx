/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import { DashboardHintBar } from './dashboard_hint_bar';

const renderHintBar = () =>
  render(
    <EuiThemeProvider>
      <DashboardHintBar />
    </EuiThemeProvider>
  );

describe('DashboardHintBar', () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(Navigator.prototype, 'platform');
  const setPlatform = (platform: string) =>
    Object.defineProperty(window.navigator, 'platform', { configurable: true, value: platform });

  afterEach(() => {
    Reflect.deleteProperty(window.navigator, 'platform');
    if (originalPlatform) Object.defineProperty(Navigator.prototype, 'platform', originalPlatform);
  });

  test('shows how to select panels when collapsed', () => {
    renderHintBar();
    const bar = screen.getByTestId('dashboardHintBar');
    expect(bar).toHaveTextContent('Shift + ClickSelect');
    expect(bar).toHaveTextContent('Shift + DragArea select');
    expect(screen.queryByTestId('dashboardHintBarMore')).not.toBeInTheDocument();
  });

  test('shows the keyboard shortcuts when expanded, with Cmd on macOS', () => {
    setPlatform('MacIntel');
    renderHintBar();
    fireEvent.click(screen.getByTestId('dashboardHintBarToggleMore'));
    const more = screen.getByTestId('dashboardHintBarMore');
    expect(more).toHaveTextContent('Cmd + CCopy selected panels');
    expect(more).toHaveTextContent('Cmd + VPaste selected panels');
    expect(more).toHaveTextContent('Cmd + ZUndo');
    expect(more).toHaveTextContent('Cmd + YRedo');
  });

  test('uses Ctrl on other platforms', () => {
    setPlatform('Win32');
    renderHintBar();
    fireEvent.click(screen.getByTestId('dashboardHintBarToggleMore'));
    expect(screen.getByTestId('dashboardHintBarMore')).toHaveTextContent('Ctrl + CCopy');
  });
});
