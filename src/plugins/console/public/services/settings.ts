/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Storage } from './index';

export const DEFAULT_SETTINGS = Object.freeze({
  fontSize: 14,
  polling: true,
  pollInterval: 60000,
  tripleQuotes: true,
  wrapMode: true,
  autocomplete: Object.freeze({ fields: true, indices: true, templates: true, dataStreams: true }),
  historyDisabled: false,
  keyboardShortcutsDisabled: false,
});

export interface DevToolsSettings {
  fontSize: number;
  wrapMode: boolean;
  autocomplete: {
    fields: boolean;
    indices: boolean;
    templates: boolean;
    dataStreams: boolean;
  };
  polling: boolean;
  pollInterval: number;
  tripleQuotes: boolean;
  historyDisabled: boolean;
  keyboardShortcutsDisabled: boolean;
}

enum SettingKeys {
  FONT_SIZE = 'font_size',
  WRAP_MODE = 'wrap_mode',
  TRIPLE_QUOTES = 'triple_quotes',
  AUTOCOMPLETE_SETTINGS = 'autocomplete_settings',
  CONSOLE_POLLING = 'console_polling',
  POLL_INTERVAL = 'poll_interval',
  DISABLE_HISTORY = 'disable_history',
  KEYBOARD_SHORTCUTS_DISABLED = 'keyboard_shortcuts_disabled',
}

export class Settings {
  constructor(private readonly storage: Storage) {}

  getFontSize() {
    return this.storage.get(SettingKeys.FONT_SIZE, DEFAULT_SETTINGS.fontSize);
  }

  setFontSize(size: number) {
    this.storage.set(SettingKeys.FONT_SIZE, size);
    return true;
  }

  getWrapMode() {
    return this.storage.get(SettingKeys.WRAP_MODE, DEFAULT_SETTINGS.wrapMode);
  }

  setWrapMode(mode: boolean) {
    this.storage.set(SettingKeys.WRAP_MODE, mode);
    return true;
  }

  setTripleQuotes(tripleQuotes: boolean) {
    this.storage.set(SettingKeys.TRIPLE_QUOTES, tripleQuotes);
    return true;
  }

  getTripleQuotes() {
    return this.storage.get(SettingKeys.TRIPLE_QUOTES, DEFAULT_SETTINGS.tripleQuotes);
  }

  getAutocomplete() {
    return this.storage.get(SettingKeys.AUTOCOMPLETE_SETTINGS, DEFAULT_SETTINGS.autocomplete);
  }

  setAutocomplete(settings: object) {
    this.storage.set(SettingKeys.AUTOCOMPLETE_SETTINGS, settings);
    return true;
  }

  getPolling() {
    return this.storage.get(SettingKeys.CONSOLE_POLLING, DEFAULT_SETTINGS.polling);
  }

  setPolling(polling: boolean) {
    this.storage.set(SettingKeys.CONSOLE_POLLING, polling);
    return true;
  }

  setHistoryDisabled(disable: boolean) {
    this.storage.set(SettingKeys.DISABLE_HISTORY, disable);
    return true;
  }

  getHistoryDisabled() {
    return this.storage.get(SettingKeys.DISABLE_HISTORY, DEFAULT_SETTINGS.historyDisabled);
  }

  setPollInterval(interval: number) {
    this.storage.set(SettingKeys.POLL_INTERVAL, interval);
  }

  getPollInterval() {
    return this.storage.get(SettingKeys.POLL_INTERVAL, DEFAULT_SETTINGS.pollInterval);
  }

  setKeyboardShortcutsDisabled(disable: boolean) {
    this.storage.set(SettingKeys.KEYBOARD_SHORTCUTS_DISABLED, disable);
    return true;
  }

  getKeyboardShortcutsDisabled() {
    return this.storage.get(
      SettingKeys.KEYBOARD_SHORTCUTS_DISABLED,
      DEFAULT_SETTINGS.keyboardShortcutsDisabled
    );
  }

  toJSON(): DevToolsSettings {
    return {
      autocomplete: this.getAutocomplete(),
      wrapMode: this.getWrapMode(),
      tripleQuotes: this.getTripleQuotes(),
      fontSize: parseFloat(this.getFontSize()),
      polling: Boolean(this.getPolling()),
      pollInterval: this.getPollInterval(),
      historyDisabled: Boolean(this.getHistoryDisabled()),
      keyboardShortcutsDisabled: Boolean(this.getKeyboardShortcutsDisabled()),
    };
  }

  updateSettings({
    fontSize,
    wrapMode,
    tripleQuotes,
    autocomplete,
    polling,
    pollInterval,
    historyDisabled,
    keyboardShortcutsDisabled,
  }: DevToolsSettings) {
    this.setFontSize(fontSize);
    this.setWrapMode(wrapMode);
    this.setTripleQuotes(tripleQuotes);
    this.setAutocomplete(autocomplete);
    this.setPolling(polling);
    this.setPollInterval(pollInterval);
    this.setHistoryDisabled(historyDisabled);
    this.setKeyboardShortcutsDisabled(keyboardShortcutsDisabled);
  }
}

interface Deps {
  storage: Storage;
}

export function createSettings({ storage }: Deps) {
  return new Settings(storage);
}
