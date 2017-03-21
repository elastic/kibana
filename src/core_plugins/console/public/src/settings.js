import storage from './storage';

import getInput from './input'
import getOutput from './output'

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
  return storage.get('autocomplete_settings', { fields: true, indices: true });
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
