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
const utils = require('../../src/utils');
const collapsingTests = require('raw-loader!./utils_string_collapsing.txt');
const expandingTests = require('raw-loader!./utils_string_expanding.txt');

const { test, module, deepEqual } = window.QUnit;

module('Utils class');

_.each(collapsingTests.split(/^=+$/m), function (fixture) {
  if (fixture.trim() === '') {
    return;
  }
  fixture = fixture.split(/^-+$/m);
  const name = fixture[0].trim();
  const expanded = fixture[1].trim();
  const collapsed = fixture[2].trim();

  test('Literal collapse - ' + name, function () {
    deepEqual(utils.collapseLiteralStrings(expanded), collapsed);
  });
});

_.each(expandingTests.split(/^=+$/m), function (fixture) {
  if (fixture.trim() === '') {
    return;
  }
  fixture = fixture.split(/^-+$/m);
  const name = fixture[0].trim();
  const collapsed = fixture[1].trim();
  const expanded = fixture[2].trim();

  test('Literal expand - ' + name, function () {
    deepEqual(utils.expandLiteralStrings(collapsed), expanded);
  });

  test('extract deprecation messages', function () {
    deepEqual(utils.extractDeprecationMessages(
      '299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a warning" "Mon, 27 Feb 2017 14:52:14 GMT"'),
    ['#! Deprecation: this is a warning']);
    deepEqual(utils.extractDeprecationMessages( //eslint-disable-next-line max-len
      '299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a warning" "Mon, 27 Feb 2017 14:52:14 GMT", 299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a second warning" "Mon, 27 Feb 2017 14:52:14 GMT"'),
    ['#! Deprecation: this is a warning', '#! Deprecation: this is a second warning']);
    deepEqual(utils.extractDeprecationMessages(
      '299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a warning, and it includes a comma" "Mon, 27 Feb 2017 14:52:14 GMT"'),
    ['#! Deprecation: this is a warning, and it includes a comma']);
    deepEqual(utils.extractDeprecationMessages( //eslint-disable-next-line max-len
      '299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a warning, and it includes an escaped backslash \\\\ and a pair of \\\"escaped quotes\\\"" "Mon, 27 Feb 2017 14:52:14 GMT"'),
    ['#! Deprecation: this is a warning, and it includes an escaped backslash \\ and a pair of "escaped quotes"']);
  });

  test('unescape', function () {
    deepEqual(utils.unescape('escaped backslash \\\\'), 'escaped backslash \\');
    deepEqual(utils.unescape('a pair of \\\"escaped quotes\\\"'), 'a pair of "escaped quotes"');
    deepEqual(utils.unescape('escaped quotes do not have to come in pairs: \\\"'), 'escaped quotes do not have to come in pairs: "');
  });

  test('split on unquoted comma followed by space', function () {
    deepEqual(utils.splitOnUnquotedCommaSpace('a, b'), ['a', 'b']);
    deepEqual(utils.splitOnUnquotedCommaSpace('a,b, c'), ['a,b', 'c']);
    deepEqual(utils.splitOnUnquotedCommaSpace('"a, b"'), ['"a, b"']);
    deepEqual(utils.splitOnUnquotedCommaSpace('"a, b", c'), ['"a, b"', 'c']);
    deepEqual(utils.splitOnUnquotedCommaSpace('"a, b\\", c"'), ['"a, b\\", c"']);
    deepEqual(utils.splitOnUnquotedCommaSpace(', a, b'), ['', 'a', 'b']);
    deepEqual(utils.splitOnUnquotedCommaSpace('a, b, '), ['a', 'b', '']);
    deepEqual(utils.splitOnUnquotedCommaSpace('\\"a, b", "c, d\\", e", f"'), ['\\"a', 'b", "c', 'd\\"', 'e", f"']);
  });
});
