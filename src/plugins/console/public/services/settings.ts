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
  tripleQuotes: true,
  wrapMode: true,
  autocomplete: Object.freeze({ fields: true, indices: true, templates: true }),
});

export interface DevToolsSettings {
  fontSize: number;
  wrapMode: boolean;
  autocomplete: {
    fields: boolean;
    indices: boolean;
    templates: boolean;
  };
  polling: boolean;
  tripleQuotes: boolean;
}

export class Settings {
  constructor(private readonly storage: Storage) {}

  getFontSize() {
    return this.storage.get('font_size', DEFAULT_SETTINGS.fontSize);
  }

  setFontSize(size: number) {
    this.storage.set('font_size', size);
    return true;
  }

  getWrapMode() {
    return this.storage.get('wrap_mode', DEFAULT_SETTINGS.wrapMode);
  }

  setWrapMode(mode: boolean) {
    this.storage.set('wrap_mode', mode);
    return true;
  }

  setTripleQuotes(tripleQuotes: boolean) {
    this.storage.set('triple_quotes', tripleQuotes);
    return true;
  }

  getTripleQuotes() {
    return this.storage.get('triple_quotes', DEFAULT_SETTINGS.tripleQuotes);
  }

  getAutocomplete() {
    return this.storage.get('autocomplete_settings', DEFAULT_SETTINGS.autocomplete);
  }

  setAutocomplete(settings: object) {
    this.storage.set('autocomplete_settings', settings);
    return true;
  }

  getPolling() {
    return this.storage.get('console_polling', DEFAULT_SETTINGS.polling);
  }

  setPolling(polling: boolean) {
    this.storage.set('console_polling', polling);
    return true;
  }

  toJSON(): DevToolsSettings {
    return {
      autocomplete: this.getAutocomplete(),
      wrapMode: this.getWrapMode(),
      tripleQuotes: this.getTripleQuotes(),
      fontSize: parseFloat(this.getFontSize()),
      polling: Boolean(this.getPolling()),
    };
  }

  updateSettings({ fontSize, wrapMode, tripleQuotes, autocomplete, polling }: DevToolsSettings) {
    this.setFontSize(fontSize);
    this.setWrapMode(wrapMode);
    this.setTripleQuotes(tripleQuotes);
    this.setAutocomplete(autocomplete);
    this.setPolling(polling);
  }
}

interface Deps {
  storage: Storage;
}

export function createSettings({ storage }: Deps) {
  return new Settings(storage);
}
