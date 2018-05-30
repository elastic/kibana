/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
