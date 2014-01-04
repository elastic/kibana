define([
  'ace',
  'analytics',
  'jquery',

  'bootstrap'
], function (ace, _gaq, $) {
  'use strict';

  var $welcomePopup = $("#welcome_popup");

  var $example;
  var html = [
    '<div id="welcome_example_editor">PUT index/type/1',
    '{',
    '   "body": "here"',
    '}',
    '',
    'GET index/type/1',
    '</div>'
  ].join('\n');
  
  $welcomePopup.modal();
  $welcomePopup.on('shown', function () {
    $example = $(html)
      .appendTo("#welcome_example_container");

    var editor = ace.edit("welcome_example_editor");
    editor.getSession().setMode("ace/mode/sense");
    editor.getSession().setFoldStyle('markbeginend');
    editor.setReadOnly(true);
    editor.renderer.setShowPrintMargin(false);
  });

  $welcomePopup.on('hidden', function () {
    $example.remove();
    $example = null;
  });

  return $welcomePopup;
})