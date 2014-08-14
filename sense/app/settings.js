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



define([
  'jquery',
  'exports',
  'sense_editor/theme-sense-dark'
], function ($, exports) {
  'use strict';

  function getFontSize() {
    return localStorage.getItem("font_size") || "12";
  }

  function setFontSize(size) {
    if (!/^([1-9]\d*)$/.test(size)) return false;
    localStorage.setItem("font_size", size);
    applyCurrentSettings();
    return true;
  }

  function getWrapMode() {
    var mode = localStorage.getItem("wrap_mode") || "true";
    return mode == "true";
  }

  function setWrapMode(mode) {
    if (typeof mode !== "boolean") return false;
    localStorage.setItem("wrap_mode", mode);
    applyCurrentSettings();
    return true;
  }

  function getTheme() {
    return localStorage.getItem("theme") || "light";
  }

  function getAceTheme(mode) {
    mode = mode || localStorage.getItem("theme") || "light";
    return mode === "light" ? "" : "ace/theme/sense-dark";
  }


  function setTheme(mode) {
    localStorage.setItem("theme", mode);

    applyCurrentSettings();
    return true;
  }

  function applyThemeToBody() {
    var theme= getTheme();
    $("#bootstrapThemeCss").attr("href", "vendor/bootstrap/css/bootstrap." + theme + ".min.css");
    $("#senseThemeCss").attr("href", "css/sense." + theme + ".css");
  }

  function applyCurrentSettings(editor) {
    if (typeof editor === "undefined") {
      applyCurrentSettings(require('input'));
      applyCurrentSettings(require('output'));
      applyThemeToBody();
    }
    if (editor) {
      editor.setTheme(getAceTheme());
      editor.getSession().setUseWrapMode(getWrapMode());
      editor.$el.css("font-size", getFontSize() + "px");
    }
  }


  var settings_popup = $("#settings_popup");

  var font_size_ctl = settings_popup.find("#font_size");
  var fs = getFontSize();
  font_size_ctl.val(fs);
  //setFontSize(fs);

  var wrap_mode_ctl = settings_popup.find("#wrap_mode");
  var wm = getWrapMode();
  wrap_mode_ctl.prop('checked', wm);
  //setWrapMode(wm);

  var theme_ctl = settings_popup.find("#theme");
  var theme = getTheme();
  theme_ctl.val(theme);
  applyThemeToBody();

  function save() {
    if (!setFontSize(font_size_ctl.val())) font_size_ctl.val(getFontSize());
    if (!setWrapMode(wrap_mode_ctl.prop("checked"))) wrap_mode_ctl.prop('checked', getWrapMode());
    if (!setTheme(theme_ctl.val())) theme_ctl.val(getTheme());
    require('input').focus();
    return true;
  }

  var save_button = settings_popup.find(".btn-primary");
  save_button.click(save);
  settings_popup.find(".btn-primary").click(save);
  settings_popup.find("form").submit(function () {
    save_button.click();
    return false
  });

  exports.getTheme = getTheme;
  exports.getAceTheme = getAceTheme;
  exports.applyCurrentSettings = applyCurrentSettings;

});
