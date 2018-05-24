const _ = require('lodash');
const curl = require('../../src/curl');
const curlTests = require('raw-loader!./curl_parsing_tests.txt');

const { test, module, ok, equal } = window.QUnit;

module('CURL');

const notCURLS = [
  'sldhfsljfhs',
  's;kdjfsldkfj curl -XDELETE ""',
  '{ "hello": 1 }'
];


_.each(notCURLS, function (notCURL, i) {
  test('cURL Detection - broken strings ' + i, function () {
    ok(!curl.detectCURL(notCURL), 'marked as curl while it wasn\'t:' + notCURL);
  });
});

_.each(curlTests.split(/^=+$/m), function (fixture) {
  if (fixture.trim() === '') {
    return;
  }
  fixture = fixture.split(/^-+$/m);
  const name = fixture[0].trim();
  const  curlText = fixture[1];
  const  response = fixture[2].trim();

  test('cURL Detection - ' + name, function () {
    ok(curl.detectCURL(curlText), 'marked as not curl while it was:' + curlText);
    const r = curl.parseCURL(curlText);
    equal(r, response);
  });
});
