/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Storage } from '.';

export const DEFAULT_SETTINGS = Object.freeze({
  fontSize: 14,
  polling: true,
  pollInterval: 60000,
  tripleQuotes: true,
  wrapMode: true,
  autocomplete: Object.freeze({
    fields: true,
    indices: true,
    templates: true,
    dataStreams: true,
  }),
  isHistoryEnabled: true,
  isKeyboardShortcutsEnabled: true,
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
  isHistoryEnabled: boolean;
  isKeyboardShortcutsEnabled: boolean;
}

enum SettingKeys {
  FONT_SIZE = 'font_size',
  WRAP_MODE = 'wrap_mode',
  TRIPLE_QUOTES = 'triple_quotes',
  AUTOCOMPLETE_SETTINGS = 'autocomplete_settings',
  CONSOLE_POLLING = 'console_polling',
  POLL_INTERVAL = 'poll_interval',
  IS_HISTORY_ENABLED = 'is_history_enabled',
  IS_KEYBOARD_SHORTCUTS_ENABLED = 'is_keyboard_shortcuts_enabled',
}

export class Settings {
  constructor(private readonly storage: Storage) {
    // Migration from old settings to new ones
    this.addMigrationRule('is_history_disabled', SettingKeys.IS_HISTORY_ENABLED, (value: any) => {
      return !value;
    });
    this.addMigrationRule(
      'is_keyboard_shortcuts_disabled',
      SettingKeys.IS_KEYBOARD_SHORTCUTS_ENABLED,
      (value: any) => {
        return !value;
      }
    );
  }

  private addMigrationRule(previousKey: string, newKey: string, migration: (value: any) => any) {
    const value = this.storage.get(previousKey);
    if (value !== undefined) {
      this.storage.set(newKey, migration(value));
      this.storage.delete(previousKey);
    }
  }

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

  setIsHistoryEnabled(isEnabled: boolean) {
    this.storage.set(SettingKeys.IS_HISTORY_ENABLED, isEnabled);
    return true;
  }

  getIsHistoryEnabled() {
    return this.storage.get(SettingKeys.IS_HISTORY_ENABLED, DEFAULT_SETTINGS.isHistoryEnabled);
  }

  setPollInterval(interval: number) {
    this.storage.set(SettingKeys.POLL_INTERVAL, interval);
  }

  getPollInterval() {
    return this.storage.get(SettingKeys.POLL_INTERVAL, DEFAULT_SETTINGS.pollInterval);
  }

  setIsKeyboardShortcutsEnabled(isEnabled: boolean) {
    this.storage.set(SettingKeys.IS_KEYBOARD_SHORTCUTS_ENABLED, isEnabled);
    return true;
  }

  getIsKeyboardShortcutsDisabled() {
    return this.storage.get(
      SettingKeys.IS_KEYBOARD_SHORTCUTS_ENABLED,
      DEFAULT_SETTINGS.isKeyboardShortcutsEnabled
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
      isHistoryEnabled: Boolean(this.getIsHistoryEnabled()),
      isKeyboardShortcutsEnabled: Boolean(this.getIsKeyboardShortcutsDisabled()),
    };
  }

  updateSettings({
    fontSize,
    wrapMode,
    tripleQuotes,
    autocomplete,
    polling,
    pollInterval,
    isHistoryEnabled,
    isKeyboardShortcutsEnabled,
  }: DevToolsSettings) {
    this.setFontSize(fontSize);
    this.setWrapMode(wrapMode);
    this.setTripleQuotes(tripleQuotes);
    this.setAutocomplete(autocomplete);
    this.setPolling(polling);
    this.setPollInterval(pollInterval);
    this.setIsHistoryEnabled(isHistoryEnabled);
    this.setIsKeyboardShortcutsEnabled(isKeyboardShortcutsEnabled);
  }
}

interface Deps {
  storage: Storage;
}

export function createSettings({ storage }: Deps) {
  return new Settings(storage);
}
