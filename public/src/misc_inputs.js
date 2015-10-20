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

let $ = require('jquery');
let bootstrap = require('bootstrap');
let history = require('./history');
let mappings = require('./mappings');
let input = require('./input');
let output = require('./output');
let es = require('./es');

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

// containers for the two editors
var $left = input.$el.parent();
var $right = output.$el.parent();

function readStoredEditorWidth() {
  var json = window.localStorage.getItem('sense:editorWidth');
  if (json !== null) {
    return JSON.parse(json);
  }
}

function storeEditorWidth(editorWidth) {
  window.localStorage.setItem('sense:editorWidth', JSON.stringify(editorWidth))
}

function setEditorWidth(editorWidth) {
  storeEditorWidth(editorWidth);
  $left.width(editorWidth);
}

var $resizer = $('#editor_resizer');
$resizer
  .on('mousedown', function (event) {
    $resizer.addClass('active');
    var startWidth = $left.width();
    var startX = event.pageX;

    function onMove(event) {
      setEditorWidth(startWidth + event.pageX - startX)
    }

    $(document.body)
      .on('mousemove', onMove)
      .one('mouseup', function () {
        $resizer.removeClass('active');
        $(this).off('mousemove', onMove);
        input.resize(true);
        output.resize(true);
      });
  });

const initialEditorWidth = readStoredEditorWidth();
if (initialEditorWidth != null) {
  setEditorWidth(initialEditorWidth);
}

es.addServerChangeListener(function (server) {
  $esServer.val(server);
});

$send.click(function () {
  input.focus();
  input.sendCurrentRequestToES();
  return false;
});

module.exports = {
  $esServer: $esServer,
  $autoIndent: $autoIndent,
  $resizer: $resizer
};
