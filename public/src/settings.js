/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */

let $ = require('jquery');
let es = require('./es');

function getFontSize() {
  return localStorage.getItem("font_size") || "12";
}

function setFontSize(size) {
  if (!/^([1-9]\d*)$/.test(size)) {
    return false;
  }
  localStorage.setItem("font_size", size);
  applyCurrentSettings();
  return true;
}

function getWrapMode() {
  var mode = localStorage.getItem("wrap_mode") || "true";
  return mode == "true";
}

function setWrapMode(mode) {
  if (typeof mode !== "boolean") {
    return false;
  }
  localStorage.setItem("wrap_mode", mode);
  applyCurrentSettings();
  return true;
}

function setBasicAuth(mode) {
  if (typeof mode !== "boolean") {
    return false;
  }
  localStorage.setItem("basic_auth", mode);
  applyCurrentSettings();
  return true;
}

function getAutocomplete() {
  var settings = localStorage.getItem("autocomplete_settings");
  var defaults = {fields: true, indices: true};
  if (settings) {
    try {
      settings = JSON.parse(settings);
      if (typeof settings != "object") {
        settings = defaults;
      }
    } catch (e) {
      settings = defaults;
    }
  }
  else {
    settings = defaults;
  }
  return settings;
}

function setAutocomplete(settings) {
  localStorage.setItem("autocomplete_settings", JSON.stringify(settings));
  return true;
}

function applyCurrentSettings(editor) {
  if (typeof editor === "undefined") {
    applyCurrentSettings(require('./input'));
    applyCurrentSettings(require('./output'));
  }
  if (editor) {
    editor.getSession().setUseWrapMode(getWrapMode());
    editor.$el.css("font-size", getFontSize() + "px");
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
  es.forceRefresh();
  return getCurrentSettings();
}

module.exports = {
  getAutocomplete,
  applyCurrentSettings,

  getCurrentSettings,
  updateSettings,
};
