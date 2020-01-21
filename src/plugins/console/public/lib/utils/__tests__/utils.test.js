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
const utils = require('../utils');
const collapsingTests = require('./utils_string_collapsing.txt');
const expandingTests = require('./utils_string_expanding.txt');

describe('Utils class', () => {
  describe('collapseLiteralStrings', () => {
    it('will collapse multiline strings', () => {
      const multiline = '{ "foo": """bar\nbaz""" }';
      expect(utils.collapseLiteralStrings(multiline)).toEqual('{ "foo": "bar\\nbaz" }');
    });

    it('will collapse multiline strings with CRLF endings', () => {
      const multiline = '{ "foo": """bar\r\nbaz""" }';
      expect(utils.collapseLiteralStrings(multiline)).toEqual('{ "foo": "bar\\r\\nbaz" }');
    });
  });

  _.each(collapsingTests.split(/^=+$/m), function(fixture) {
    if (fixture.trim() === '') {
      return;
    }
    fixture = fixture.split(/^-+$/m);
    const name = fixture[0].trim();
    const expanded = fixture[1].trim();
    const collapsed = fixture[2].trim();

    test('Literal collapse - ' + name, function() {
      expect(utils.collapseLiteralStrings(expanded)).toEqual(collapsed);
    });
  });

  _.each(expandingTests.split(/^=+$/m), function(fixture) {
    if (fixture.trim() === '') {
      return;
    }
    fixture = fixture.split(/^-+$/m);
    const name = fixture[0].trim();
    const collapsed = fixture[1].trim();
    const expanded = fixture[2].trim();

    test('Literal expand - ' + name, function() {
      expect(utils.expandLiteralStrings(collapsed)).toEqual(expanded);
    });

    test('extract deprecation messages', function() {
      expect(
        utils.extractDeprecationMessages(
          '299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a warning" "Mon, 27 Feb 2017 14:52:14 GMT"'
        )
      ).toEqual(['#! Deprecation: this is a warning']);
      expect(
        utils.extractDeprecationMessages(
          '299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a warning"'
        )
      ).toEqual(['#! Deprecation: this is a warning']);

      expect(
        utils.extractDeprecationMessages(
          '299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a warning" "Mon, 27 Feb 2017 14:52:14 GMT", 299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a second warning" "Mon, 27 Feb 2017 14:52:14 GMT"'
        )
      ).toEqual(['#! Deprecation: this is a warning', '#! Deprecation: this is a second warning']);
      expect(
        utils.extractDeprecationMessages(
          '299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a warning", 299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a second warning"'
        )
      ).toEqual(['#! Deprecation: this is a warning', '#! Deprecation: this is a second warning']);

      expect(
        utils.extractDeprecationMessages(
          '299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a warning, and it includes a comma" "Mon, 27 Feb 2017 14:52:14 GMT"'
        )
      ).toEqual(['#! Deprecation: this is a warning, and it includes a comma']);
      expect(
        utils.extractDeprecationMessages(
          '299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a warning, and it includes a comma"'
        )
      ).toEqual(['#! Deprecation: this is a warning, and it includes a comma']);

      expect(
        utils.extractDeprecationMessages(
          '299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a warning, and it includes an escaped backslash \\\\ and a pair of \\"escaped quotes\\"" "Mon, 27 Feb 2017 14:52:14 GMT"'
        )
      ).toEqual([
        '#! Deprecation: this is a warning, and it includes an escaped backslash \\ and a pair of "escaped quotes"',
      ]);
      expect(
        utils.extractDeprecationMessages(
          '299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a warning, and it includes an escaped backslash \\\\ and a pair of \\"escaped quotes\\""'
        )
      ).toEqual([
        '#! Deprecation: this is a warning, and it includes an escaped backslash \\ and a pair of "escaped quotes"',
      ]);
    });

    test('unescape', function() {
      expect(utils.unescape('escaped backslash \\\\')).toEqual('escaped backslash \\');
      expect(utils.unescape('a pair of \\"escaped quotes\\"')).toEqual(
        'a pair of "escaped quotes"'
      );
      expect(utils.unescape('escaped quotes do not have to come in pairs: \\"')).toEqual(
        'escaped quotes do not have to come in pairs: "'
      );
    });

    test('split on unquoted comma followed by space', function() {
      expect(utils.splitOnUnquotedCommaSpace('a, b')).toEqual(['a', 'b']);
      expect(utils.splitOnUnquotedCommaSpace('a,b, c')).toEqual(['a,b', 'c']);
      expect(utils.splitOnUnquotedCommaSpace('"a, b"')).toEqual(['"a, b"']);
      expect(utils.splitOnUnquotedCommaSpace('"a, b", c')).toEqual(['"a, b"', 'c']);
      expect(utils.splitOnUnquotedCommaSpace('"a, b\\", c"')).toEqual(['"a, b\\", c"']);
      expect(utils.splitOnUnquotedCommaSpace(', a, b')).toEqual(['', 'a', 'b']);
      expect(utils.splitOnUnquotedCommaSpace('a, b, ')).toEqual(['a', 'b', '']);
      expect(utils.splitOnUnquotedCommaSpace('\\"a, b", "c, d\\", e", f"')).toEqual([
        '\\"a',
        'b", "c',
        'd\\"',
        'e", f"',
      ]);
    });
  });
});
