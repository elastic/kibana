let kb = require('../../src/kb');
let mappings = require('../../src/mappings');
let autocomplete_engine = require('../../src/autocomplete/engine');

var {test, module, ok, fail, asyncTest, deepEqual, equal, start} = QUnit;

module("Knowledge base", {
  setup: function () {
    mappings.clear();
    kb.setActiveApi(kb._test.loadApisFromJson({}));
  },
  teardown: function () {
    mappings.clear();
    kb.setActiveApi(kb._test.loadApisFromJson({}));
  }
});

var MAPPING = {
  "index1": {
    "type1.1": {
      "properties": {
        "field1.1.1": {"type": "string"},
        "field1.1.2": {"type": "long"}
      }
    },
    "type1.2": {
      "properties": {}
    }
  },
  "index2": {
    "type2.1": {
      "properties": {
        "field2.1.1": {"type": "string"},
        "field2.1.2": {"type": "string"}
      }
    }
  }
};

function testUrlContext(tokenPath, otherTokenValues, expectedContext) {

  if (expectedContext.autoCompleteSet) {
    expectedContext.autoCompleteSet = _.map(expectedContext.autoCompleteSet, function (t) {
      if (_.isString(t)) {
        t = {name: t}
      }
      return t;
    })
  }

  var context = {otherTokenValues: otherTokenValues};
  autocomplete_engine.populateContext(tokenPath, context, null,
    expectedContext.autoCompleteSet, kb.getTopLevelUrlCompleteComponents()
  );

  // override context to just check on id
  if (context.endpoint) {
    context.endpoint = context.endpoint.id;
  }

  delete context.otherTokenValues;

  function norm(t) {
    if (_.isString(t)) {
      return {name: t};
    }
    return t;
  }

  if (context.autoCompleteSet) {
    context.autoCompleteSet = _.sortBy(_.map(context.autoCompleteSet, norm), 'name');
  }
  if (expectedContext.autoCompleteSet) {
    expectedContext.autoCompleteSet = _.sortBy(_.map(expectedContext.autoCompleteSet, norm), 'name');
  }

  deepEqual(context, expectedContext);
}

function t(term) {
  return {name: term, meta: "type"};
}

function i(term) {
  return {name: term, meta: "index"};
}

function index_test(name, tokenPath, otherTokenValues, expectedContext) {
  test(name, function () {
    var test_api = new kb._test.loadApisFromJson({
      index_test: {
        endpoints: {
          _multi_indices: {
            patterns: ["{indices}/_multi_indices"]
          },
          _single_index: {patterns: ["{index}/_single_index"]},
          _no_index: {
            // testing default patters
            //  patterns: ["_no_index"]
          }
        }
      }
    }, kb._test.globalUrlComponentFactories);

    kb.setActiveApi(test_api);

    mappings.loadMappings(MAPPING);
    testUrlContext(tokenPath, otherTokenValues, expectedContext);
  });
}

index_test("Index integration 1", [], [],
  {autoCompleteSet: ["_no_index", i("index1"), i("index2")]}
);

index_test("Index integration 2", [], ["index1"],
  // still return _no_index as index1 is not committed to yet.
  {autoCompleteSet: ["_no_index", i("index2")]}
);

index_test("Index integration 2", ["index1"], [],
  {indices: ["index1"], autoCompleteSet: ["_multi_indices", "_single_index"]}
);

index_test("Index integration 2", [
    ["index1", "index2"]
  ], [],
  {indices: ["index1", "index2"], autoCompleteSet: ["_multi_indices"]}
);

function type_test(name, tokenPath, otherTokenValues, expectedContext) {
  test(name, function () {
    var test_api = kb._test.loadApisFromJson({
      "type_test": {
        endpoints: {
          _multi_types: {patterns: ["{indices}/{types}/_multi_types"]},
          _single_type: {patterns: ["{indices}/{type}/_single_type"]},
          _no_types: {patterns: ["{indices}/_no_types"]}
        }
      }
    }, kb._test.globalUrlComponentFactories);
    kb.setActiveApi(test_api);

    mappings.loadMappings(MAPPING);

    testUrlContext(tokenPath, otherTokenValues, expectedContext);

  });
}

type_test("Type integration 1", ["index1"], [],
  {indices: ["index1"], autoCompleteSet: ["_no_types", t("type1.1"), t("type1.2")]}
);
type_test("Type integration 2", ["index1"], ["type1.2"],
  // we are not yet comitted to type1.2, so _no_types is returned
  {indices: ["index1"], autoCompleteSet: ["_no_types", t("type1.1")]}
);

type_test("Type integration 3", ["index2"], [],
  {indices: ["index2"], autoCompleteSet: ["_no_types", t("type2.1")]}
);

type_test("Type integration 4", ["index1", "type1.2"], [],
  {indices: ["index1"], types: ["type1.2"], autoCompleteSet: ["_multi_types", "_single_type"]}
);

type_test("Type integration 5", [
    ["index1", "index2"],
    ["type1.2", "type1.1"]
  ], [],
  {indices: ["index1", "index2"], types: ["type1.2", "type1.1"], autoCompleteSet: ["_multi_types"]}
);
