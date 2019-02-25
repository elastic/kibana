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

const storage = require('./storage');

import getInput from './input';
import getOutput from './output';

function getFontSize() {
  return storage.get('font_size', 14);
}

function setFontSize(size) {
  storage.set('font_size', size);
  applyCurrentSettings();
  return true;
}

function getWrapMode() {
  return storage.get('wrap_mode', true);
}

function setWrapMode(mode) {
  storage.set('wrap_mode', mode);
  applyCurrentSettings();
  return true;
}

export function getAutocomplete() {
  return storage.get('autocomplete_settings', { fields: true, indices: true, templates: true });
}

function setAutocomplete(settings) {
  storage.set('autocomplete_settings', settings);
  return true;
}

export function applyCurrentSettings(editor) {
  if (typeof editor === 'undefined') {
    applyCurrentSettings(getInput());
    applyCurrentSettings(getOutput());
  }
  if (editor) {
    editor.getSession().setUseWrapMode(getWrapMode());
    editor.$el.css('font-size', getFontSize() + 'px');
  }
}

export function getCurrentSettings() {
  return {
    autocomplete: getAutocomplete(),
    wrapMode: getWrapMode(),
    fontSize: parseFloat(getFontSize()),
  };
}

export function updateSettings({ fontSize, wrapMode, autocomplete }) {
  setFontSize(fontSize);
  setWrapMode(wrapMode);
  setAutocomplete(autocomplete);
  getInput().focus();
  return getCurrentSettings();
}
