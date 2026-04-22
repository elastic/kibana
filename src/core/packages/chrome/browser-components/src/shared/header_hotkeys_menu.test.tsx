/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EMPTY } from 'rxjs';
import { hotkeysServiceMock } from '@kbn/core-hotkeys-browser-mocks';
import { createMockChromeComponentsDeps, TestChromeProviders } from '../test_helpers';
import { HeaderHotkeysMenu } from './header_hotkeys_menu';

const setup = () => {
  const deps = createMockChromeComponentsDeps();
  const hotkeys = hotkeysServiceMock.createStartContract();
  hotkeys.getRegistrations$.mockReturnValue(EMPTY);
  const unregister = jest.fn();
  hotkeys.register.mockReturnValue({
    id: 'platform:chrome.openHotkeysCheatSheet',
    update: jest.fn(),
    unregister,
  });
  deps.hotkeys = hotkeys;

  const utils = render(
    <TestChromeProviders deps={deps}>
      <HeaderHotkeysMenu />
    </TestChromeProviders>
  );

  return { hotkeys, unregister, ...utils };
};

describe('HeaderHotkeysMenu', () => {
  it('renders the header button', () => {
    setup();
    expect(screen.getByTestId('hotkeysCheatSheetButton')).toBeInTheDocument();
  });

  it('registers Shift+? as a global hotkey on mount and unregisters on unmount', () => {
    const { hotkeys, unregister, unmount } = setup();

    expect(hotkeys.register).toHaveBeenCalledTimes(1);
    const [definition] = hotkeys.register.mock.calls[0];
    expect(definition).toMatchObject({
      id: 'platform:chrome.openHotkeysCheatSheet',
      keys: 'Shift+?',
      scope: 'global',
    });

    unmount();
    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it('opens the cheat sheet when the button is clicked', async () => {
    const user = userEvent.setup();
    setup();

    expect(screen.queryByTestId('hotkeysCheatSheetModal')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('hotkeysCheatSheetButton'));

    expect(screen.getByTestId('hotkeysCheatSheetModal')).toBeInTheDocument();
  });

  it('opens the cheat sheet when the registered handler fires', () => {
    const { hotkeys } = setup();
    const [, handler] = hotkeys.register.mock.calls[0];

    act(() => {
      handler(new KeyboardEvent('keydown'));
    });

    expect(screen.getByTestId('hotkeysCheatSheetModal')).toBeInTheDocument();
  });
});
