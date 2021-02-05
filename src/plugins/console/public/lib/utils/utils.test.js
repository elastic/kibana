/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as utils from '.';

describe('Utils class', () => {
  test('extract deprecation messages', function () {
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

  test('unescape', function () {
    expect(utils.unescape('escaped backslash \\\\')).toEqual('escaped backslash \\');
    expect(utils.unescape('a pair of \\"escaped quotes\\"')).toEqual('a pair of "escaped quotes"');
    expect(utils.unescape('escaped quotes do not have to come in pairs: \\"')).toEqual(
      'escaped quotes do not have to come in pairs: "'
    );
  });

  test('split on unquoted comma followed by space', function () {
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
