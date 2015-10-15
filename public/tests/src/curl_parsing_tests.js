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

let _ = require('_');
let curl = require('../../src/curl');
let curlTests = require('raw!./curl_parsing_tests.txt');

var {test, module, ok, fail, asyncTest, deepEqual, equal, start} = QUnit;

module("CURL");

var notCURLS = [
  'sldhfsljfhs',
  's;kdjfsldkfj curl -XDELETE ""',
  '{ "hello": 1 }'
];


_.each(notCURLS, function (notCURL, i) {
  test("cURL Detection - broken strings " + i, function () {
    ok(!curl.detectCURL(notCURL), "marked as curl while it wasn't:" + notCURL);
  });
});

_.each(curlTests.split(/^=+$/m), function (fixture) {
  if (fixture.trim() == "") {
    return;
  }
  fixture = fixture.split(/^-+$/m);
  var name = fixture[0].trim(),
    curlText = fixture[1],
    response = fixture[2].trim();

  test("cURL Detection - " + name, function () {
    ok(curl.detectCURL(curlText), "marked as not curl while it was:" + curlText);
    var r = curl.parseCURL(curlText);
    equal(r, response);
  });
});
