/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Storage } from './index';

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
  private input: any | null = null;
  private output: any | null = null;

  constructor(private readonly storage: Storage) {}

  /**
   * TODO: Slight hackiness going on here - late registration of dependencies should be refactored
   */
  registerInput(input: any) {
    this.input = input;
  }
  /**
   * TODO: Slight hackiness going on here - late registration of dependencies should be refactored
   */
  registerOutput(output: any) {
    this.output = output;
  }

  getFontSize() {
    return this.storage.get('font_size', 14);
  }

  setFontSize(size: any) {
    this.storage.set('font_size', size);
    this.applyCurrentSettings();
    return true;
  }

  getWrapMode() {
    return this.storage.get('wrap_mode', true);
  }

  setWrapMode(mode: any) {
    this.storage.set('wrap_mode', mode);
    this.applyCurrentSettings();
    return true;
  }

  setTripleQuotes(tripleQuotes: any) {
    this.storage.set('triple_quotes', tripleQuotes);
    return true;
  }

  getTripleQuotes() {
    return this.storage.get('triple_quotes', true);
  }

  getAutocomplete() {
    return this.storage.get('autocomplete_settings', {
      fields: true,
      indices: true,
      templates: true,
    });
  }

  setAutocomplete(settings: any) {
    this.storage.set('autocomplete_settings', settings);
    return true;
  }

  getPolling() {
    return this.storage.get('console_polling', true);
  }

  setPolling(polling: any) {
    this.storage.set('console_polling', polling);
    this.applyCurrentSettings();
    return true;
  }

  applyCurrentSettings(editor?: any) {
    if (typeof editor === 'undefined') {
      if (this.input) this.applyCurrentSettings(this.input);
      if (this.output) this.applyCurrentSettings(this.output);
    } else if (editor) {
      editor.getSession().setUseWrapMode(this.getWrapMode());
      editor.$el.css('font-size', this.getFontSize() + 'px');
    }
  }

  getCurrentSettings(): DevToolsSettings {
    return {
      autocomplete: this.getAutocomplete(),
      wrapMode: this.getWrapMode(),
      tripleQuotes: this.getTripleQuotes(),
      fontSize: parseFloat(this.getFontSize()),
      polling: Boolean(this.getPolling()),
    };
  }

  updateSettings({ fontSize, wrapMode, tripleQuotes, autocomplete, polling }: any) {
    this.setFontSize(fontSize);
    this.setWrapMode(wrapMode);
    this.setTripleQuotes(tripleQuotes);
    this.setAutocomplete(autocomplete);
    this.setPolling(polling);
    this.input.focus();
    return this.getCurrentSettings();
  }
}

interface Deps {
  storage: Storage;
}

export function createSettings({ storage }: Deps) {
  return new Settings(storage);
}
