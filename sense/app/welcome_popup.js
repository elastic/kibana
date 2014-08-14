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