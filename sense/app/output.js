define([
  'ace',
  'jquery'
], function (ace, $) {
  'use strict';
  
  var output = ace.edit("output");
  
  output.update = function (val, cb) {
    output.getSession().setValue(val);
    if (typeof cb === 'function') {
      setTimeout(cb);
    }
  };

  output.$el = $('#output');
  output.getSession().setMode("ace/mode/json");
  output.getSession().setFoldStyle('markbeginend');
  output.getSession().setUseWrapMode(true);
  output.setShowPrintMargin(false);
  output.setReadOnly(true);

  return output;
})