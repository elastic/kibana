/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { getFlyoutManagerStore } from '@elastic/eui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EditorMenuItem } from './types';
import { initializeEditorMenuManager } from './editor_menu_manager';
import { core } from '../kibana_services';

const OPTIONS_ACTION = 'options-action';
const HELP_ACTION = 'help-action';

jest.mock('../kibana_services', () => ({
  core: {
    notifications: { toasts: { addError: jest.fn() } },
    overlays: { openSystemFlyout: jest.fn() },
  },
  uiActions: {
    getAction: jest.fn(async (id: string) => ({
      execute: async ({
        anchor,
        editor,
      }: {
        anchor?: HTMLElement;
        editor: {
          toggleOptions?: (button: HTMLElement) => void;
          toggleHelp?: (button: HTMLElement) => void;
          mountFiltersBody?: (body: () => null) => void;
        };
      }) => {
        if (!anchor) return;
        if (id === OPTIONS_ACTION) editor.toggleOptions?.(anchor);
        else if (id === HELP_ACTION) editor.toggleHelp?.(anchor);
        else editor.mountFiltersBody?.(() => null);
      },
    })),
  },
}));
const mockOpenSystemFlyout = jest.mocked(core.overlays.openSystemFlyout);

const writableSearchApi = {
  filters$: {},
  query$: {},
  timeRange$: {},
  setFilters: () => undefined,
  setQuery: () => undefined,
  setTimeRange: () => undefined,
};

const initialize = (
  supportedMenus: EditorMenuItem[],
  flyoutType?: 'push' | 'overlay',
  api: unknown = writableSearchApi
) => {
  const manager = initializeEditorMenuManager({
    api,
    editorType: 'test',
    flyoutType,
    title: 'Test editor',
    supportedMenus,
    menuActionIds: {
      options: OPTIONS_ACTION,
      help: HELP_ACTION,
    },
  });
  render(
    <>
      {manager.flyoutMenuProps?.trailingActions?.map((action) => {
        const onClick = action.onClick as unknown as React.MouseEventHandler<HTMLButtonElement>;
        return (
          <button key={action['aria-label']} onClick={onClick}>
            {action['aria-label']}
          </button>
        );
      })}
    </>
  );
  return manager;
};

describe('initializeEditorMenuManager', () => {
  let closeFiltersOverlay: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    closeFiltersOverlay = jest.fn(async () => undefined);
    mockOpenSystemFlyout.mockReturnValue({
      close: closeFiltersOverlay,
      onClose: new Promise<void>(() => {}),
    });
  });

  it('orders menus and publishes menu changes', async () => {
    const manager = initialize(['filters', 'help', 'options']);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Options',
      'Help',
      'Edit filters',
    ]);

    const options = screen.getByRole('button', { name: 'Options' });
    fireEvent.click(options);
    await waitFor(() =>
      expect(manager.activeMenu$.getValue()).toEqual({
        menu: 'options',
        button: options,
        isOpen: true,
      })
    );
    fireEvent.click(options);
    await waitFor(() =>
      expect(manager.activeMenu$.getValue()).toEqual({
        menu: 'options',
        button: options,
        isOpen: false,
      })
    );
  });

  it('shows edit filters before a panel API exists and opens them once the API is attached', () => {
    const manager = initializeEditorMenuManager({
      editorType: 'test',
      showFiltersAction: true,
      supportedMenus: ['filters'],
      title: 'Test editor',
    });
    render(
      <>
        {manager.flyoutMenuProps?.trailingActions?.map((action) => {
          const onClick = action.onClick as unknown as React.MouseEventHandler<HTMLButtonElement>;
          return (
            <button key={action['aria-label']} onClick={onClick}>
              {action['aria-label']}
            </button>
          );
        })}
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit filters' }));
    expect(mockOpenSystemFlyout).not.toHaveBeenCalled();

    manager.setPanelApi(writableSearchApi);
    fireEvent.click(screen.getByRole('button', { name: 'Edit filters' }));
    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
  });

  it('omits edit filters when the panel cannot write unified search', () => {
    initialize(['options', 'filters'], undefined, null);
    expect(screen.queryByRole('button', { name: 'Edit filters' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Options' })).toBeInTheDocument();

    initialize(['filters'], undefined, { filters$: {}, query$: {}, timeRange$: {} });
    expect(screen.queryByRole('button', { name: 'Edit filters' })).not.toBeInTheDocument();
  });

  it('supports a filters-only editor and restores focus on return', () => {
    const manager = initialize(['filters']);
    expect(screen.queryByRole('button', { name: 'Options' })).not.toBeInTheDocument();
    const filters = screen.getByRole('button', { name: 'Edit filters' });
    fireEvent.click(filters);
    manager.returnToEditor();
    expect(manager.activeMenu$.getValue()).toBeNull();
    expect(filters).toHaveFocus();
  });

  it.each(['push', 'overlay'] as const)(
    'opens filters as a sibling %s system flyout and closes it on disposal',
    async (flyoutType) => {
      const manager = initialize(['filters'], flyoutType);

      fireEvent.click(screen.getByRole('button', { name: 'Edit filters' }));
      fireEvent.click(screen.getByRole('button', { name: 'Edit filters' }));

      expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
      expect(mockOpenSystemFlyout).toHaveBeenCalledWith(expect.anything(), {
        id: `${manager.flyoutId}-filters`,
        session: 'start',
        historyKey: manager.historyKey,
        size: 'm',
        maxWidth: 800,
        paddingSize: 'm',
        type: flyoutType,
        ownFocus: flyoutType !== 'overlay',
        resizable: true,
        outsideClickCloses: false,
        hideCloseButton: true,
        'data-test-subj': 'editorFiltersFlyout',
        'aria-label': 'Panel level filters',
        onActive: expect.any(Function),
        flyoutMenuProps: {
          title: 'Panel level filters',
          hideTitle: false,
          hideCloseButton: true,
          trailingActions: [
            {
              iconType: 'cross',
              'aria-label': 'Close filters',
              onClick: expect.any(Function),
            },
          ],
        },
      });
      expect(manager.activeMenu$.getValue()).toBeNull();

      manager.dispose();
      expect(closeFiltersOverlay).toHaveBeenCalledTimes(1);
    }
  );

  it('opens filters at the editor flyout width', async () => {
    const manager = initialize(['filters']);
    const store = getFlyoutManagerStore();
    store.addFlyout(manager.flyoutId, 'Test editor', 'main', 'm', manager.historyKey);
    store.setFlyoutWidth(manager.flyoutId, 640);

    fireEvent.click(screen.getByRole('button', { name: 'Edit filters' }));

    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout.mock.calls[0][1]).toEqual(
      expect.objectContaining({ size: 640, maxWidth: 640 })
    );
    store.closeAllFlyouts();
    manager.dispose();
  });

  it('defaults filters to a push flyout', async () => {
    const manager = initialize(['filters']);
    fireEvent.click(screen.getByRole('button', { name: 'Edit filters' }));
    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout.mock.calls[0][1]?.type).toBe('push');
    manager.dispose();
  });

  it('ignores stale closes and clicks after disposal', async () => {
    const manager = initialize(['options', 'help']);
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    await waitFor(() => expect(manager.activeMenu$.getValue()?.menu).toBe('options'));
    const staleMenu = manager.activeMenu$.getValue();
    if (!staleMenu) throw new Error('Expected options menu');
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    await waitFor(() => expect(manager.activeMenu$.getValue()?.menu).toBe('help'));
    manager.close(staleMenu);
    expect(manager.activeMenu$.getValue()?.menu).toBe('help');

    manager.dispose();
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    expect(manager.activeMenu$.isStopped).toBe(true);
  });
});
