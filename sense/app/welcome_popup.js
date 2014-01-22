define([
  'sense_editor/editor',
  'jquery',

  'bootstrap'
], function (SenseEditor, $) {
  'use strict';

  var $welcomePopup = $("#welcome_popup");

  var $example;
  var html = [
    '<div id="welcome_example_editor"># index a doc',
    'PUT index/type/1',
    '{',
    '   "body": "here"',
    '}',
    '',
    '# and get it ... ',
    'GET index/type/1</div>'
  ].join('\n');

  $welcomePopup.modal();
  $welcomePopup.on('shown', function () {
    $example = $(html)
      .appendTo("#welcome_example_container");

    var editor = new SenseEditor($("#welcome_example_editor"));
    editor.setReadOnly(true);
  });

  $welcomePopup.on('hidden', function () {
    $example.remove();
    $example = null;
  });

  return $welcomePopup;
})