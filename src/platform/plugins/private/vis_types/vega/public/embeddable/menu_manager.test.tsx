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
import { initializeMenuManager } from './menu_manager';

const renderMenuActions = () => {
  const menuManager = initializeMenuManager();
  render(
    <>
      {menuManager.flyoutMenuProps?.trailingActions?.map((action) => (
        <button key={action['aria-label']} onClick={action.onClick}>
          {action['aria-label']}
        </button>
      ))}
    </>
  );
  return menuManager;
};

describe('initializeMenuManager', () => {
  it('publishes the initial state and toggles the selected menu', () => {
    const { activeMenu$ } = renderMenuActions();
    const observer = jest.fn();
    const subscription = activeMenu$.subscribe(observer);
    expect(observer).toHaveBeenLastCalledWith(null);
    const button = screen.getByRole('button', { name: 'Vega editor options' });
    fireEvent.click(button);
    expect(observer).toHaveBeenLastCalledWith({ menu: 'format', button, isOpen: true });
    fireEvent.click(button);
    expect(observer).toHaveBeenLastCalledWith({ menu: 'format', button, isOpen: false });
    subscription.unsubscribe();
  });

  it('ignores a stale close after switching menus and closes the current menu', () => {
    const menuManager = renderMenuActions();
    fireEvent.click(screen.getByRole('button', { name: 'Vega editor options' }));
    const previous = menuManager.activeMenu$.getValue();
    if (!previous) throw new Error('Expected options to open');
    const help = screen.getByRole('button', { name: 'Vega help' });
    fireEvent.click(help);
    menuManager.close(previous);
    expect(menuManager.activeMenu$.getValue()).toEqual({
      menu: 'help',
      button: help,
      isOpen: true,
    });
    const current = menuManager.activeMenu$.getValue();
    if (!current) throw new Error('Expected help to remain open');
    menuManager.close(current);
    expect(menuManager.activeMenu$.getValue()).toEqual({ ...current, isOpen: false });
  });

  it('clears filters state and returns focus to the filters action', () => {
    const menuManager = renderMenuActions();
    const button = screen.getByRole('button', { name: 'Edit filters' });
    fireEvent.click(button);
    expect(menuManager.activeMenu$.getValue()).toEqual({ menu: 'filters', button, isOpen: true });
    menuManager.returnToEditor();
    expect(menuManager.activeMenu$.getValue()).toBeNull();
    expect(button).toHaveFocus();
  });
});
