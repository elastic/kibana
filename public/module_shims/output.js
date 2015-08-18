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
  'ace',
  'settings',
  'jquery',
  'sense_editor/mode/output'
], function (ace, settings, $, OutputMode) {
  'use strict';

  var $el = $("#output");
  var output = ace.require('ace/ace').edit($el[0]);

  var outputMode = new OutputMode.Mode();

  output.update = function (val, mode, cb) {
    if (typeof mode === 'function') {
      cb = mode;
      mode = void 0;
    }

    var session = output.getSession();

    session.setMode(val ? (mode || outputMode) : 'ace/mode/text');
    session.setValue(val);
    if (typeof cb === 'function') {
      setTimeout(cb);
    }
  };

  output.append = function (val, fold_previous, cb) {
    if (typeof fold_previous === 'function') {
      cb = fold_previous;
      fold_previous = true;
    }
    if (_.isUndefined(fold_previous)) {
      fold_previous = true;
    }
    var session = output.getSession();
    var lastLine = session.getLength();
    if (fold_previous) {
      output.moveCursorTo(Math.max(0, lastLine - 1), 0);
      session.toggleFold(false);

    }
    session.insert({row: lastLine, column: 0}, "\n" + val);
    output.moveCursorTo(lastLine + 1, 0);
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