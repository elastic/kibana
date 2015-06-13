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
  'history',
  'input',
  'mappings',
  'output',
  'es',
  'bootstrap',
  'jquery-ui'
], function ($, history, input, mappings, output, es) {
  'use strict';

  var $esServer = $("#es_server");

  $esServer.blur(function () {
    es.setBaseUrl($esServer.val());
  });

  // initialize auto complete
  $esServer.autocomplete({
    minLength: 0,
    source: []
  });

  $esServer.focus(function () {
    $esServer.autocomplete("option", "source", history.getHistoricalServers());
  });

  var $send = $("#send").tooltip();

  var $autoIndent = $("#auto_indent").click(function (e) {
    input.autoIndent();
    e.preventDefault();
    input.focus();
  });

  var $header = $('.navbar.navbar-static-top');

  // containers for the two editors
  var $left = input.$el.parent();
  var $right = output.$el.parent();

  $left.resizable({
    autoHide: false,
    handles: 'e',
    start: function () {
      $resizer.addClass('active');
    },
    resize: function () {
      $right.css('left', $left.outerWidth() + 20);
    },
    stop: function () {
      $resizer.removeClass('active');
      $left.css('height', 'auto'); // $.resizeable sets the height which prevents it from reshaping later
      input.resize(true);
      output.resize(true);
    }
  });

  var $resizer = input.$el.siblings('.ui-resizable-e');

  es.addServerChangeListener(function (server) {
    $esServer.val(server);
  });

  return {
    $esServer: $esServer,
    $send: $send,
    $autoIndent: $autoIndent,
    $header: $header,
    $resizer: $resizer
  };
});