define([
  'sense_editor/editor',
  'jquery',
  'bootstrap'
], function (SenseEditor, $) {
  'use strict';

  var $helpPopup = $("#help_popup");

  var html = [
    '<div id="help_example_editor"># index a doc',
    'PUT index/type/1',
    '{',
    '   "body": "here"',
    '}',
    '',
    '# and get it ... ',
    'GET index/type/1</div>'
  ].join('\n');

  $helpPopup.on('shown', function () {
    $(html).appendTo("#help_example_container");
    var example_editor = new SenseEditor($("#help_example_editor"));
    example_editor.setReadOnly(true);
  });

  $helpPopup.on('hidden', function () {
    $('#example_editor').remove();
  });

  return $helpPopup;
})