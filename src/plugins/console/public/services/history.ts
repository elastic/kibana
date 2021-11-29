/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { Storage } from './index';

const MAX_NUMBER_OF_HISTORY_ITEMS = 100;

export const isQuotaExceededError = (e: Error): boolean => e.name === 'QuotaExceededError';

export class History {
  private changeEmitter: BehaviorSubject<any[]>;

  constructor(private readonly storage: Storage) {
    this.changeEmitter = new BehaviorSubject(this.getHistory() || []);
  }

  getHistoryKeys() {
    return this.storage
      .keys()
      .filter((key: string) => key.indexOf('hist_elem') === 0)
      .sort()
      .reverse();
  }

  getHistory() {
    return this.getHistoryKeys().map((key) => this.storage.get(key));
  }

  // This is used as an optimization mechanism so that different components
  // can listen for changes to history and update because changes to history can
  // be triggered from different places in the app. The alternative would be to store
  // this in state so that we hook into the React model, but it would require loading history
  // every time the application starts even if a user is not going to view history.
  change(listener: (reqs: unknown[]) => void) {
    const subscription = this.changeEmitter.subscribe(listener);
    return () => subscription.unsubscribe();
  }

  addToHistory(endpoint: string, method: string, data?: string) {
    const keys = this.getHistoryKeys();
    keys.splice(0, MAX_NUMBER_OF_HISTORY_ITEMS); // only maintain most recent X;
    keys.forEach((key) => {
      this.storage.delete(key);
    });

    const timestamp = new Date().getTime();
    const k = 'hist_elem_' + timestamp;
    this.storage.set(k, {
      time: timestamp,
      endpoint,
      method,
      data,
    });

    this.changeEmitter.next(this.getHistory());
  }

  updateCurrentState(content: string) {
    const timestamp = new Date().getTime();
    this.storage.set('editor_state', {
      time: timestamp,
      content,
    });
  }

  getLegacySavedEditorState() {
    const saved = this.storage.get('editor_state');
    if (!saved) return;
    const { time, content } = saved;
    return { time, content };
  }

  /**
   * This function should only ever be called once for a user if they had legacy state.
   */
  deleteLegacySavedEditorState() {
    this.storage.delete('editor_state');
  }

  clearHistory() {
    this.getHistoryKeys().forEach((key) => this.storage.delete(key));
  }
}

export function createHistory(deps: { storage: Storage }) {
  return new History(deps.storage);
}
