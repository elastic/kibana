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
import { EuiProvider, useEuiTheme } from '@elastic/eui';
import {
  ChromeColorModeProvider,
  ClassicHeaderButtonColorMode,
  ClassicHeaderPopoverColorMode,
} from './header_color_mode';

const ColorMode = ({ id }: { id: string }) => {
  const { colorMode } = useEuiTheme();
  return <span data-test-subj={id}>{colorMode}</span>;
};

const renderInApp = (appColorMode: 'light' | 'dark', ui: React.ReactElement) =>
  render(
    <EuiProvider colorMode={appColorMode} globalStyles={false}>
      {ui}
    </EuiProvider>
  );

describe('ChromeColorModeProvider', () => {
  it('is a no-op without a color mode', () => {
    renderInApp(
      'light',
      <ChromeColorModeProvider>
        <ColorMode id="inside" />
      </ChromeColorModeProvider>
    );
    expect(screen.getByTestId('inside')).toHaveTextContent('LIGHT');
  });

  it('is a no-op when the color mode matches the application', () => {
    renderInApp(
      'dark',
      <ChromeColorModeProvider colorMode="dark">
        <ColorMode id="inside" />
      </ChromeColorModeProvider>
    );
    expect(screen.getByTestId('inside')).toHaveTextContent('DARK');
  });

  it('renders its children in the chrome color mode when it differs from the application', () => {
    renderInApp(
      'light',
      <>
        <ChromeColorModeProvider colorMode="dark">
          <ColorMode id="inside" />
        </ChromeColorModeProvider>
        <ColorMode id="outside" />
      </>
    );
    expect(screen.getByTestId('inside')).toHaveTextContent('DARK');
    expect(screen.getByTestId('outside')).toHaveTextContent('LIGHT');
  });

  it('reverts popovers to the application color mode and keeps buttons in the chrome mode', () => {
    renderInApp(
      'light',
      <ChromeColorModeProvider colorMode="dark">
        <ClassicHeaderButtonColorMode>
          <ColorMode id="button" />
        </ClassicHeaderButtonColorMode>
        <ClassicHeaderPopoverColorMode>
          <ColorMode id="popover" />
        </ClassicHeaderPopoverColorMode>
      </ChromeColorModeProvider>
    );
    expect(screen.getByTestId('button')).toHaveTextContent('DARK');
    expect(screen.getByTestId('popover')).toHaveTextContent('LIGHT');
  });

  it('leaves popovers and buttons untouched outside of a chrome color mode', () => {
    renderInApp(
      'light',
      <>
        <ClassicHeaderButtonColorMode>
          <ColorMode id="button" />
        </ClassicHeaderButtonColorMode>
        <ClassicHeaderPopoverColorMode>
          <ColorMode id="popover" />
        </ClassicHeaderPopoverColorMode>
      </>
    );
    expect(screen.getByTestId('button')).toHaveTextContent('LIGHT');
    expect(screen.getByTestId('popover')).toHaveTextContent('LIGHT');
  });
});
