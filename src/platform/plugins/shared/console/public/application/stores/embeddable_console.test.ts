/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { reducer, initialValue } from './embeddable_console';
import type { EmbeddedConsoleAction, EmbeddedConsoleStore } from '../../types/embeddable_console';
import { EmbeddableConsoleView } from '../../types/embeddable_console';

describe('embeddable_console store', () => {
  it('should return initial state when no action matches', () => {
    const action = { type: 'unknown' } as any;
    const newState = reducer(initialValue, action);
    expect(newState).toBe(initialValue);
  });

  it('should handle open action to Console view', () => {
    const action: EmbeddedConsoleAction = { type: 'open' };
    const newState = reducer(initialValue, action);

    expect(newState).not.toBe(initialValue);
    expect(newState.consoleHasBeenOpened).toBe(true);
    expect(newState.view).toBe(EmbeddableConsoleView.Console);
    expect(newState.loadFromContent).toBeUndefined();

    // Verify immutability
    expect(initialValue.consoleHasBeenOpened).toBe(false);
    expect(initialValue.view).toBe(EmbeddableConsoleView.Closed);
  });

  it('should handle open action to Alternate view with content', () => {
    const content = 'GET /_search\n{\n  "query": { "match_all": {} }\n}';
    const action: EmbeddedConsoleAction = {
      type: 'open',
      payload: { alternateView: true, content },
    };

    const newState = reducer(initialValue, action);

    expect(newState).not.toBe(initialValue);
    expect(newState.consoleHasBeenOpened).toBe(true);
    expect(newState.view).toBe(EmbeddableConsoleView.Alternate);
    expect(newState.loadFromContent).toBe(content);
  });

  it('should not create new state when opening same view', () => {
    const stateWithOpenConsole: EmbeddedConsoleStore = {
      consoleHasBeenOpened: true,
      view: EmbeddableConsoleView.Console,
    };

    const action: EmbeddedConsoleAction = { type: 'open' };
    const newState = reducer(stateWithOpenConsole, action);

    expect(newState).toBe(stateWithOpenConsole); // Same reference, no clone
  });

  it('should handle close action', () => {
    const stateWithOpenConsole: EmbeddedConsoleStore = {
      consoleHasBeenOpened: true,
      view: EmbeddableConsoleView.Console,
      loadFromContent: 'some content',
    };

    const action: EmbeddedConsoleAction = { type: 'close' };
    const newState = reducer(stateWithOpenConsole, action);

    expect(newState).not.toBe(stateWithOpenConsole);
    expect(newState.view).toBe(EmbeddableConsoleView.Closed);
    expect(newState.loadFromContent).toBeUndefined();
    expect(newState.consoleHasBeenOpened).toBe(true); // This stays true

    // Verify immutability
    expect(stateWithOpenConsole.view).toBe(EmbeddableConsoleView.Console);
    expect(stateWithOpenConsole.loadFromContent).toBe('some content');
  });

  it('should not create new state when closing already closed console', () => {
    const action: EmbeddedConsoleAction = { type: 'close' };
    const newState = reducer(initialValue, action);

    expect(newState).toBe(initialValue); // Same reference, no clone
  });

  it('should handle switching between views', () => {
    const stateWithConsoleView: EmbeddedConsoleStore = {
      consoleHasBeenOpened: true,
      view: EmbeddableConsoleView.Console,
    };

    const action: EmbeddedConsoleAction = {
      type: 'open',
      payload: { alternateView: true },
    };

    const newState = reducer(stateWithConsoleView, action);

    expect(newState).not.toBe(stateWithConsoleView);
    expect(newState.view).toBe(EmbeddableConsoleView.Alternate);
    expect(stateWithConsoleView.view).toBe(EmbeddableConsoleView.Console);
  });

  it('should preserve consoleHasBeenOpened flag after closing', () => {
    let state = initialValue;

    // Open console
    state = reducer(state, { type: 'open' });
    expect(state.consoleHasBeenOpened).toBe(true);

    // Close console
    state = reducer(state, { type: 'close' });
    expect(state.consoleHasBeenOpened).toBe(true); // Still true
    expect(state.view).toBe(EmbeddableConsoleView.Closed);
  });
});
