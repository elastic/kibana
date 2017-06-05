let _ = require('lodash');
let utils = require('../../src/utils');
let collapsingTests = require('raw!./utils_string_collapsing.txt');
let expandingTests = require('raw!./utils_string_expanding.txt');

var { test, module, deepEqual } = window.QUnit;

module("Utils class");

_.each(collapsingTests.split(/^=+$/m), function (fixture) {
  if (fixture.trim() == "") {
    return;
  }
  fixture = fixture.split(/^-+$/m);
  var name = fixture[0].trim(),
    expanded = fixture[1].trim(),
    collapsed = fixture[2].trim();

  test("Literal collapse - " + name, function () {
    deepEqual(utils.collapseLiteralStrings(expanded), collapsed);
  });
});

_.each(expandingTests.split(/^=+$/m), function (fixture) {
  if (fixture.trim() == "") {
    return;
  }
  fixture = fixture.split(/^-+$/m);
  var name = fixture[0].trim(),
    collapsed = fixture[1].trim(),
    expanded = fixture[2].trim();

  test("Literal expand - " + name, function () {
    deepEqual(utils.expandLiteralStrings(collapsed), expanded);
  });

  test("extract deprecation messages", function () {
    deepEqual(utils.extractDeprecationMessages(
      '299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a warning" "Mon, 27 Feb 2017 14:52:14 GMT"'),
      ['#! Deprecation: this is a warning']);
    deepEqual(utils.extractDeprecationMessages(
      '299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a warning" "Mon, 27 Feb 2017 14:52:14 GMT", 299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a second warning" "Mon, 27 Feb 2017 14:52:14 GMT"'),
      ['#! Deprecation: this is a warning', '#! Deprecation: this is a second warning']);
    deepEqual(utils.extractDeprecationMessages(
      '299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a warning, and it includes a comma" "Mon, 27 Feb 2017 14:52:14 GMT"'),
      ['#! Deprecation: this is a warning, and it includes a comma']);
    deepEqual(utils.extractDeprecationMessages(
      '299 Elasticsearch-6.0.0-alpha1-SNAPSHOT-abcdef1 "this is a warning, and it includes an escaped backslash \\\\ and a pair of \\\"escaped quotes\\\"" "Mon, 27 Feb 2017 14:52:14 GMT"'),
      ['#! Deprecation: this is a warning, and it includes an escaped backslash \\ and a pair of "escaped quotes"']);
  });

  test("unescape", function () {
    deepEqual(utils.unescape('escaped backslash \\\\'), 'escaped backslash \\');
    deepEqual(utils.unescape('a pair of \\\"escaped quotes\\\"'), 'a pair of "escaped quotes"');
    deepEqual(utils.unescape('escaped quotes do not have to come in pairs: \\\"'), 'escaped quotes do not have to come in pairs: "');
  });

  test("split on unquoted comma followed by space", function () {
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
