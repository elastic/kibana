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
import type { Action } from '@kbn/ui-actions-plugin/public';
import type { EditorMenuActionContext, EditorMenuItem } from './types';
import { initializeEditorMenuManager } from './editor_menu_manager';
import { core, uiActions } from '../kibana_services';

jest.mock('../kibana_services', () => ({
  core: {
    notifications: { toasts: { addError: jest.fn() } },
    overlays: { openSystemFlyout: jest.fn() },
  },
  uiActions: {
    getTrigger: jest.fn(() => ({ id: 'EMBEDDABLE_EDITOR_MENU_TRIGGER' })),
    getTriggerCompatibleActions: jest.fn(),
  },
}));
const mockAddError = jest.mocked(core.notifications.toasts.addError);
const mockOpenSystemFlyout = jest.mocked(core.overlays.openSystemFlyout);
const mockGetTriggerCompatibleActions = jest.mocked(uiActions.getTriggerCompatibleActions);

const createAction = (menu: EditorMenuItem, order: number): Action<object> => ({
  id: menu,
  type: menu,
  order,
  getDisplayName: () => menu,
  getIconType: () => 'gear',
  isCompatible: async () => true,
  execute: async (context) => {
    const { anchor, editor } = context as unknown as EditorMenuActionContext;
    if (!anchor) return;
    if (menu === 'options') editor.toggleOptions?.(anchor);
    if (menu === 'help') editor.toggleHelp?.(anchor);
    if (menu === 'filters') editor.openFilters?.(anchor);
  },
});

const initialize = async (
  supportedMenus: EditorMenuItem[],
  actions = [createAction('filters', 10), createAction('help', 20), createAction('options', 30)],
  flyoutType?: 'push' | 'overlay'
) => {
  mockGetTriggerCompatibleActions.mockResolvedValue(actions);
  const manager = await initializeEditorMenuManager({
    editorType: 'test',
    flyoutType,
    title: 'Test editor',
    supportedMenus,
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

  it('orders actions and publishes menu changes', async () => {
    const manager = await initialize(['options', 'help', 'filters']);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'options',
      'help',
      'filters',
    ]);

    const options = screen.getByRole('button', { name: 'options' });
    fireEvent.click(options);
    expect(manager.activeMenu$.getValue()).toEqual({
      menu: 'options',
      button: options,
      isOpen: true,
    });
    fireEvent.click(options);
    expect(manager.activeMenu$.getValue()).toEqual({
      menu: 'options',
      button: options,
      isOpen: false,
    });
  });

  it('supports a filters-only editor and restores focus on return', async () => {
    const manager = await initialize(['filters'], [createAction('filters', 10)]);
    expect(screen.queryByRole('button', { name: 'options' })).not.toBeInTheDocument();
    const filters = screen.getByRole('button', { name: 'filters' });
    fireEvent.click(filters);
    manager.returnToEditor();
    expect(manager.activeMenu$.getValue()).toBeNull();
    expect(filters).toHaveFocus();
  });

  it.each(['push', 'overlay'] as const)(
    'opens filters as one inherited %s system flyout and closes it on disposal',
    async (flyoutType) => {
      const manager = await initialize(['filters'], [createAction('filters', 10)], flyoutType);

      fireEvent.click(screen.getByRole('button', { name: 'filters' }));
      fireEvent.click(screen.getByRole('button', { name: 'filters' }));

      expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
      expect(mockOpenSystemFlyout).toHaveBeenCalledWith(expect.anything(), {
        id: `${manager.flyoutId}-filters`,
        session: 'inherit',
        historyKey: manager.historyKey,
        size: 's',
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
          leadingActions: [
            {
              iconType: 'undo',
              'aria-label': 'Back to Test editor',
              onClick: expect.any(Function),
            },
          ],
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

  it('defaults filters to a push flyout', async () => {
    const manager = await initialize(['filters'], [createAction('filters', 10)]);
    fireEvent.click(screen.getByRole('button', { name: 'filters' }));
    expect(mockOpenSystemFlyout.mock.calls[0][1]?.type).toBe('push');
    manager.dispose();
  });

  it('ignores stale closes and action execution after disposal', async () => {
    const manager = await initialize(['options', 'help']);
    fireEvent.click(screen.getByRole('button', { name: 'options' }));
    const staleMenu = manager.activeMenu$.getValue();
    if (!staleMenu) throw new Error('Expected options menu');
    fireEvent.click(screen.getByRole('button', { name: 'help' }));
    manager.close(staleMenu);
    expect(manager.activeMenu$.getValue()?.menu).toBe('help');

    manager.dispose();
    fireEvent.click(screen.getByRole('button', { name: 'options' }));
    expect(manager.activeMenu$.isStopped).toBe(true);
  });

  it('notifies and rejects when action discovery fails', async () => {
    const failure = new Error('Discovery failed');
    mockGetTriggerCompatibleActions.mockRejectedValueOnce(failure);
    await expect(
      initializeEditorMenuManager({
        editorType: 'test',
        title: 'Test editor',
        supportedMenus: [],
      })
    ).rejects.toBe(failure);
    expect(mockAddError).toHaveBeenCalledWith(failure, {
      title: 'Unable to load editor menu actions',
    });
  });

  it('notifies when the selected action fails', async () => {
    const failure = new Error('Execution failed');
    const action = createAction('options', 10);
    action.execute = jest.fn(async () => {
      throw failure;
    });
    await initialize(['options'], [action]);
    fireEvent.click(screen.getByRole('button', { name: 'options' }));
    await Promise.resolve();
    expect(mockAddError).toHaveBeenCalledWith(failure, {
      title: 'Unable to run editor menu action',
    });
  });
});
