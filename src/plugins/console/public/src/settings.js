let $ = require('jquery');
let es = require('./es');
const storage = require('./storage');

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

function setBasicAuth(mode) {
  storage.set('basic_auth', mode);
  applyCurrentSettings();
  return true;
}

function getAutocomplete() {
  return storage.get('autocomplete_settings', { fields: true, indices: true });
}

function setAutocomplete(settings) {
  storage.set('autocomplete_settings', settings);
  return true;
}

function applyCurrentSettings(editor) {
  if (typeof editor === 'undefined') {
    applyCurrentSettings(require('./input'));
    applyCurrentSettings(require('./output'));
  }
  if (editor) {
    editor.getSession().setUseWrapMode(getWrapMode());
    editor.$el.css('font-size', getFontSize() + 'px');
  }
}

function getCurrentSettings() {
  return {
    autocomplete: getAutocomplete(),
    wrapMode: getWrapMode(),
    fontSize: parseFloat(getFontSize()),
  };
}

function updateSettings({ fontSize, wrapMode, autocomplete}) {
  setFontSize(fontSize);
  setWrapMode(wrapMode);
  setAutocomplete(autocomplete);
  require('./input').focus();
  return getCurrentSettings();
}

module.exports = {
  getAutocomplete,
  applyCurrentSettings,

  getCurrentSettings,
  updateSettings,
};
