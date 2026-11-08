/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { h } from './dom';
import { styles } from './styles';

const SHOW_HIDDEN_KEY = 'trailblazer:showHidden';

type Listener = (showHidden: boolean) => void;

/** User preferences shared by every pane and persisted across sessions. */
export class Preferences {
  private showHiddenValue: boolean;
  private readonly listeners = new Set<Listener>();

  constructor(private readonly storage: Storage) {
    this.showHiddenValue = storage.getItem(SHOW_HIDDEN_KEY) === 'true';
  }

  public get showHidden(): boolean {
    return this.showHiddenValue;
  }

  public setShowHidden(showHidden: boolean) {
    if (showHidden === this.showHiddenValue) return;
    this.showHiddenValue = showHidden;
    this.storage.setItem(SHOW_HIDDEN_KEY, String(showHidden));
    for (const listener of this.listeners) listener(showHidden);
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export interface HiddenToggle {
  readonly element: HTMLElement;
  destroy(): void;
}

/** A "Show hidden" checkbox kept in sync with every other one through `preferences`. */
export function createHiddenToggle(preferences: Preferences, onChange: () => void): HiddenToggle {
  const input = h('input', { attrs: { type: 'checkbox' } });
  input.checked = preferences.showHidden;
  input.addEventListener('change', () => preferences.setShowHidden(input.checked));

  const unsubscribe = preferences.subscribe((showHidden) => {
    input.checked = showHidden;
    onChange();
  });

  return {
    element: h('label', { className: styles.checkbox }, [input, 'Show hidden']),
    destroy: unsubscribe,
  };
}

/** Hidden indices are always searched when a pattern explicitly targets dot-prefixed names. */
export function includeHiddenFor(preferences: Preferences, index: string): boolean {
  return preferences.showHidden || index.split(',').some((part) => part.trim().startsWith('.'));
}
