/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EditorMenuItem, EditorMenuServices } from './types';
import { initializeEditorMenuManager } from './editor_menu_manager';

const OPTIONS_ACTION = 'options-action';
const HELP_ACTION = 'help-action';

const services: EditorMenuServices = {
  notifications: { toasts: { addError: jest.fn() } },
  trigger: { id: 'EMBEDDABLE_EDITOR_MENU_TRIGGER' },
  getAction: jest.fn(async (id: string) => ({
    execute: async ({
      anchor,
      editor,
    }: {
      anchor?: HTMLElement;
      editor: {
        toggleOptions?: (button: HTMLElement) => void;
        toggleHelp?: (button: HTMLElement) => void;
      };
    }) => {
      if (!anchor) return;
      if (id === OPTIONS_ACTION) editor.toggleOptions?.(anchor);
      else if (id === HELP_ACTION) editor.toggleHelp?.(anchor);
    },
  })),
};

const initialize = (supportedMenus: EditorMenuItem[]) => {
  const manager = initializeEditorMenuManager({
    services,
    editorType: 'test',
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('orders menus and publishes menu changes', async () => {
    const manager = initialize(['help', 'options']);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Options',
      'Help',
    ]);
    expect(screen.queryByRole('button', { name: 'Edit filters' })).not.toBeInTheDocument();

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
