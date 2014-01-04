define([
  'ace',
  'analytics',
  'jquery',

  'bootstrap'
], function (ace, _gaq, $) {
  'use strict';

  var $helpPopup = $("#help_popup");

  var html = [
    '<div id="help_example_editor">PUT index/type/1',
    '{',
    '   "body": "here"',
    '}',
    '',
    'GET index/type/1',
    '</div>'
  ].join('\n');

  $helpPopup.on('shown', function () {
    _gaq.push(['_trackEvent', "help", 'shown']);
    $(html).appendTo("#help_example_container");
    var example_editor = ace.edit("help_example_editor");
    example_editor.getSession().setMode("ace/mode/sense");
    example_editor.getSession().setFoldStyle('markbeginend');
    example_editor.setReadOnly(true);
    example_editor.renderer.setShowPrintMargin(false);
  });

  $helpPopup.on('hidden', function () {
    $('#example_editor').remove();
  });

  return $helpPopup;
})