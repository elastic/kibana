define([
  'jquery',
  'history',
  'input',
  'mappings',
  
  'bootstrap',
  'jquery-ui'
], function ($, history, input, mappings) {
  'use strict';

  var $esServer = $("#es_server");

  $esServer.blur(function () {
    mappings.notifyServerChange($esServer.val());
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
  });

  return {
    $esServer: $esServer,
    $send: $send,
    $autoIndent: $autoIndent
  };
})