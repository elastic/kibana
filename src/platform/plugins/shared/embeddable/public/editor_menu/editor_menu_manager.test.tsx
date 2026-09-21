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
  core: { notifications: { toasts: { addError: jest.fn() } } },
  uiActions: {
    getTrigger: jest.fn(() => ({ id: 'EMBEDDABLE_EDITOR_MENU_TRIGGER' })),
    getTriggerCompatibleActions: jest.fn(),
  },
}));
const mockAddError = jest.mocked(core.notifications.toasts.addError);
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
  actions = [createAction('filters', 10), createAction('help', 20), createAction('options', 30)]
) => {
  mockGetTriggerCompatibleActions.mockResolvedValue(actions);
  const manager = await initializeEditorMenuManager({
    editorType: 'test',
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
  beforeEach(() => jest.clearAllMocks());

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
