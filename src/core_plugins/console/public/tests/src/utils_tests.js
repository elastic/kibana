let _ = require('lodash');
let utils = require('../../src/utils');
let collapsingTests = require('raw!./utils_string_collapsing.txt');
let expandingTests = require('raw!./utils_string_expanding.txt');

var {test, module, ok, fail, asyncTest, deepEqual, equal, start} = QUnit;

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
});
