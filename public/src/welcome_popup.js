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

let SenseEditor = require('./sense_editor/editor');
let $ = require('jquery');
let bootstrap = require('bootstrap');

let $welcomePopup = $("#welcome_popup");

let $example;
let html = `<div id="welcome_example_editor">
# index a doc
PUT index/type/1
{
   "body": "here"
}

# and get it ...
GET index/type/1</div>`;

$welcomePopup.modal({show: false});
$welcomePopup.on('shown', function () {
  $example = $(html)
    .appendTo("#welcome_example_container");

  let editor = new SenseEditor($("#welcome_example_editor"));
  editor.setReadOnly(true);
});

$welcomePopup.on('hidden', function () {
  $example.remove();
  $example = null;
});

module.exports = $welcomePopup;
