let _ = require('lodash');
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
