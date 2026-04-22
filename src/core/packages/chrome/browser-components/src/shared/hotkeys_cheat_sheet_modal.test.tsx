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
import userEvent from '@testing-library/user-event';
import { BehaviorSubject } from 'rxjs';
import type { HotkeyDefinition } from '@kbn/core-hotkeys-browser';
import { hotkeysServiceMock } from '@kbn/core-hotkeys-browser-mocks';
import { createMockChromeComponentsDeps, TestChromeProviders } from '../test_helpers';
import { HotkeysCheatSheetModal } from './hotkeys_cheat_sheet_modal';

const globalRegistration: HotkeyDefinition = {
  id: 'platform:chrome.openHotkeysCheatSheet',
  keys: 'Shift+?',
  label: 'Open keyboard shortcuts',
  scope: 'global',
  group: 'Help',
};

const appRegistration: HotkeyDefinition = {
  id: 'discover:toggleSidebar',
  keys: 'Mod+b',
  label: 'Toggle sidebar',
  scope: 'app',
  appId: 'discover',
};

const contextRegistration: HotkeyDefinition = {
  id: 'flyout:close',
  keys: 'Escape',
  label: 'Close flyout',
  scope: 'context',
};

const renderModal = ({
  registrations,
  currentAppId,
}: {
  registrations: HotkeyDefinition[];
  currentAppId?: string;
}) => {
  const deps = createMockChromeComponentsDeps();
  const hotkeys = hotkeysServiceMock.createStartContract();
  const registrations$ = new BehaviorSubject<ReadonlyArray<HotkeyDefinition>>(registrations);
  hotkeys.getRegistrations$.mockReturnValue(registrations$);
  deps.hotkeys = hotkeys;
  if (currentAppId !== undefined) {
    deps.application.currentAppId$ = new BehaviorSubject<string | undefined>(currentAppId);
  }

  const onClose = jest.fn();
  render(
    <TestChromeProviders deps={deps}>
      <HotkeysCheatSheetModal onClose={onClose} />
    </TestChromeProviders>
  );

  return { onClose };
};

describe('HotkeysCheatSheetModal', () => {
  it('groups registrations by scope and only shows the active app', () => {
    renderModal({
      registrations: [globalRegistration, appRegistration, contextRegistration],
      currentAppId: 'discover',
    });

    expect(screen.getByText('Global')).toBeInTheDocument();
    expect(screen.getByText('This application')).toBeInTheDocument();
    expect(screen.getByText('On this page')).toBeInTheDocument();

    expect(screen.getByText('Open keyboard shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Toggle sidebar')).toBeInTheDocument();
    expect(screen.getByText('Close flyout')).toBeInTheDocument();
  });

  it('hides app-scoped registrations that belong to a different app', () => {
    renderModal({
      registrations: [globalRegistration, appRegistration],
      currentAppId: 'dashboards',
    });

    expect(screen.getByText('Open keyboard shortcuts')).toBeInTheDocument();
    expect(screen.queryByText('Toggle sidebar')).not.toBeInTheDocument();
    expect(screen.queryByText('This application')).not.toBeInTheDocument();
  });

  it('filters entries via the search field', async () => {
    const user = userEvent.setup();
    renderModal({
      registrations: [globalRegistration, contextRegistration],
    });

    expect(screen.getByText('Open keyboard shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Close flyout')).toBeInTheDocument();

    await user.type(screen.getByTestId('hotkeysCheatSheetSearch'), 'close');

    expect(screen.queryByText('Open keyboard shortcuts')).not.toBeInTheDocument();
    expect(screen.getByText('Close flyout')).toBeInTheDocument();
  });

  it('renders the empty state when no registrations match', async () => {
    const user = userEvent.setup();
    renderModal({
      registrations: [globalRegistration],
    });

    await user.type(screen.getByTestId('hotkeysCheatSheetSearch'), 'nothing-matches');

    expect(screen.getByText('No shortcuts match')).toBeInTheDocument();
  });
});
