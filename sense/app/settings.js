define([
  'input',  
  'output',
  'jquery'
], function (input, output, $) {
  'use strict';

  function getFontSize() {
    return localStorage.getItem("font_size") || "12";
  }

  function setFontSize(size) {
    if (!/^([1-9]\d*)$/.test(size)) return false;
    localStorage.setItem("font_size", size);
    $("#editor").css("font-size", size + "px");
    $("#output").css("font-size", size + "px");
    return true;
  }

  function getWrapMode() {
    var mode = localStorage.getItem("wrap_mode") || "true";
    return mode == "true";
  }

  function setWrapMode(mode) {
    if (typeof mode !== "boolean") return false;
    localStorage.setItem("wrap_mode", mode);

    input.getSession().setUseWrapMode(mode);
    output.getSession().setUseWrapMode(mode);
    return true;

  }

  function getTheme() {
    var mode = localStorage.getItem("theme") || "light";
    return mode;
  }

  function setTheme(mode) {
    localStorage.setItem("theme", mode);

    $("#bootstrapThemeCss").attr("href", "vendor/bootstrap/css/bootstrap." + mode + ".min.css");
    $("#senseThemeCss").attr("href", "css/sense." + mode + ".css");

    var aceTheme = mode === "light" ? "" : "ace/theme/sense-dark";
    input.setTheme(aceTheme);
    output.setTheme(aceTheme);

    return true;

  }

  var settings_popup = $("#settings_popup");

  var font_size_ctl = settings_popup.find("#font_size");
  var fs = getFontSize();
  font_size_ctl.val(fs);
  setFontSize(fs);

  var wrap_mode_ctl = settings_popup.find("#wrap_mode");
  var wm = getWrapMode();
  wrap_mode_ctl.prop('checked', wm);
  setWrapMode(wm);

  var theme_ctl = settings_popup.find("#theme");
  var theme = getTheme();
  theme_ctl.val(theme);
  setTheme(theme);

  function save() {
    if (!setFontSize(font_size_ctl.val())) font_size_ctl.val(getFontSize());
    if (!setWrapMode(wrap_mode_ctl.prop("checked"))) wrap_mode_ctl.prop('checked', getWrapMode());
    if (!setTheme(theme_ctl.val())) theme_ctl.val(getTheme());
    input.focus();
    return true;
  }

  var save_button = settings_popup.find(".btn-primary");
  save_button.click(save);
  settings_popup.find(".btn-primary").click(save);
  settings_popup.find("form").submit(function () {
    save_button.click();
    return false
  });

  return {};
});
