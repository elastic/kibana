define([
  'ace',
  'settings',
  'jquery'
], function (ace, settings, $) {
  'use strict';

  var $el = $("#output");
  var output = ace.require('ace/ace').edit($el[0]);
  
  output.update = function (val, cb) {
    output.getSession().setValue(val);
    if (typeof cb === 'function') {
      setTimeout(cb);
    }
  };

  output.$el = $el;
  output.getSession().setMode("ace/mode/text");
  output.getSession().setFoldStyle('markbeginend');
  output.getSession().setUseWrapMode(true);
  output.setShowPrintMargin(false);
  output.setReadOnly(true);
  if (settings) {
    settings.applyCurrentSettings(output);
  }
  return output;
});