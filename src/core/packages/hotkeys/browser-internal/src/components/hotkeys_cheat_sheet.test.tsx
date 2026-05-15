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
import { BehaviorSubject, of } from 'rxjs';
import type {
  HotkeyDefinition,
  HotkeysSidebarActions,
  HotkeysSidebarState,
} from '@kbn/core-hotkeys-browser';
import { HotkeysCheatSheet } from './hotkeys_cheat_sheet';

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

const defaultSidebarState: HotkeysSidebarState = {};
const defaultSidebarActions: HotkeysSidebarActions = {
  openToFeature: jest.fn(),
  clearPendingFeatureFocus: jest.fn(),
};

const renderModal = ({
  registrations,
  currentAppId,
  state = defaultSidebarState,
  actions = defaultSidebarActions,
}: {
  registrations: HotkeyDefinition[];
  currentAppId?: string;
  state?: HotkeysSidebarState;
  actions?: HotkeysSidebarActions;
}) => {
  const registrations$ = new BehaviorSubject<ReadonlyArray<HotkeyDefinition>>(registrations);
  const getRegistrations$ = () => registrations$;
  const currentAppId$ = of(currentAppId);
  const getCurrentAppId$ = () => currentAppId$;

  const onClose = jest.fn();
  render(
    <HotkeysCheatSheet
      onClose={onClose}
      state={state}
      actions={actions}
      getRegistrations$={getRegistrations$}
      getCurrentAppId$={() => of(currentAppId)}
    />
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

  it('filters entries by featureId via the search field', async () => {
    const user = userEvent.setup();
    const withFeature: HotkeyDefinition = {
      ...globalRegistration,
      id: 'discover:featureShortcut',
      label: 'Do thing',
      featureId: 'discover:documentTable',
    };
    renderModal({
      registrations: [globalRegistration, withFeature],
    });

    await user.type(screen.getByTestId('hotkeysCheatSheetSearch'), 'discover:documentTable');

    expect(screen.queryByText('Open keyboard shortcuts')).not.toBeInTheDocument();
    expect(screen.getByText('Do thing')).toBeInTheDocument();
  });

  it('prefills search from pendingFeatureFocus and clears intent', () => {
    const clearPendingFeatureFocus = jest.fn();
    const actions: HotkeysSidebarActions = {
      openToFeature: jest.fn(),
      clearPendingFeatureFocus,
    };
    const state: HotkeysSidebarState = { pendingFeatureFocus: 'discover:documentTable' };
    const filteredRegistration: HotkeyDefinition = {
      id: 'discover:only',
      keys: 'Mod+x',
      label: 'Only row',
      scope: 'global',
      featureId: 'discover:documentTable',
    };
    renderModal({
      registrations: [globalRegistration, filteredRegistration],
      state,
      actions,
    });

    expect(screen.getByTestId('hotkeysCheatSheetSearch')).toHaveValue('discover:documentTable');
    expect(screen.getByText('Only row')).toBeInTheDocument();
    expect(screen.queryByText('Open keyboard shortcuts')).not.toBeInTheDocument();
    expect(clearPendingFeatureFocus).toHaveBeenCalledTimes(1);
  });

  it('renders the empty state when no registrations match', async () => {
    const user = userEvent.setup();
    renderModal({
      registrations: [globalRegistration],
    });

    await user.type(screen.getByTestId('hotkeysCheatSheetSearch'), 'nothing-matches');

    expect(screen.getByText('No shortcuts match')).toBeInTheDocument();
  });

  it('clusters shortcuts by featureId and uses shared group as subsection title', () => {
    const first: HotkeyDefinition = {
      id: 'cluster:a',
      keys: 'Mod+1',
      label: 'First',
      scope: 'global',
      featureId: 'discover:table',
      group: 'Document table',
    };
    const second: HotkeyDefinition = {
      id: 'cluster:b',
      keys: 'Mod+2',
      label: 'Second',
      scope: 'global',
      featureId: 'discover:table',
      group: 'Document table',
    };
    renderModal({ registrations: [first, second] });

    expect(screen.getByText('Document table')).toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('uses formatted featureId as subsection title when group values differ within a bucket', () => {
    const one: HotkeyDefinition = {
      id: 'mixed:a',
      keys: 'Mod+1',
      label: 'One',
      scope: 'global',
      featureId: 'foo:bar',
      group: 'Alpha',
    };
    const two: HotkeyDefinition = {
      id: 'mixed:b',
      keys: 'Mod+2',
      label: 'Two',
      scope: 'global',
      featureId: 'foo:bar',
      group: 'Beta',
    };
    renderModal({ registrations: [one, two] });

    expect(screen.getByText('foo › bar')).toBeInTheDocument();
  });

  it('renders shortcuts without featureId after a horizontal rule when mixed with feature buckets', () => {
    const withFeature: HotkeyDefinition = {
      id: 'feat:row',
      keys: 'Mod+f',
      label: 'Featured',
      scope: 'global',
      featureId: 'ns:feat',
      group: 'Grouped',
    };
    const noFeatureRow: HotkeyDefinition = {
      id: 'plain:row',
      keys: 'Mod+p',
      label: 'Plain shortcut',
      scope: 'global',
    };
    renderModal({ registrations: [withFeature, noFeatureRow] });

    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByText('Plain shortcut')).toBeInTheDocument();
    expect(screen.getAllByRole('separator').length).toBeGreaterThanOrEqual(2);
  });

  it('wraps app and context sections in volatile scopes container when applicable', () => {
    renderModal({
      registrations: [globalRegistration, appRegistration],
      currentAppId: 'discover',
    });
    expect(screen.getByTestId('hotkeysCheatSheetVolatileScopes')).toBeInTheDocument();
  });

  it('does not render volatile scopes container when only global shortcuts exist', () => {
    renderModal({ registrations: [globalRegistration] });
    expect(screen.queryByTestId('hotkeysCheatSheetVolatileScopes')).not.toBeInTheDocument();
  });
});
