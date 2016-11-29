let input = require('../../src/input');
let kb = require('../../src/kb');
let mappings = require('../../src/mappings');
let $ = require('jquery');

var {test, module, ok, fail, asyncTest, deepEqual, equal, start} = QUnit;

module("Integration", {
  setup: function () {
    $("#editor_container").show();
    input.autocomplete._test.removeChangeListener();
  },
  teardown: function () {
    $("#editor_container").hide();
    input.autocomplete._test.addChangeListener();
  }
});

function process_context_test(data, mapping, kb_schemes, request_line, test) {
  asyncTest(test.name, function () {

    console.debug("starting test " + test.name);

    var rowOffset = 0; // add one for the extra method line
    var editorValue = data;
    if (request_line != null) {
      if (data != null) {
        editorValue = request_line + "\n" + data;
        rowOffset = 1;
      }
      else {
        editorValue = request_line;
      }
    }

    test.cursor.row += rowOffset;

    mappings.clear();
    mappings.loadMappings(mapping);
    let json = {};
    json[test.name] = kb_schemes || {};
    var test_api = kb._test.loadApisFromJson(json);
    //if (kb_schemes) {
    //  if (kb_schemes.globals) {
    //    $.each(kb_schemes.globals, function (parent, rules) {
    //      test_api.addGlobalAutocompleteRules(parent, rules);
    //    });
    //  }
    //  if (kb_schemes.endpoints) {
    //    $.each(kb_schemes.endpoints, function (endpoint, scheme) {
    //      _.defaults(scheme, {methods: null}); // disable method testing unless specified in test
    //      test_api.addEndpointDescription(endpoint, scheme);
    //    });
    //  }
    //}
    kb.setActiveApi(test_api);

    input.update(editorValue, function () {
      input.moveCursorTo(test.cursor.row, test.cursor.column);

      // allow ace rendering to move cursor so it will be seen during test - handy for debugging.
      setTimeout(function () {
        input.completer = {
          base: {},
          changeListener: function () {
          }
        }; // mimic auto complete

        input.autocomplete._test.getCompletions(input, input.getSession(), test.cursor, "",
          function (err, terms) {

            if (test.assertThrows) {
              ok(test.assertThrows.test("" + err), "failed to throw expected exception");
              start();
              return;
            }

            if (err) {
              throw err;
            }


            if (test.no_context) {
              ok(!terms || terms.length === 0, "Expected no context bug got terms.");
            }
            else {
              ok(terms && terms.length > 0, "failed to extract terms ...");
            }

            if (!terms || terms.length === 0) {
              start();
              return;
            }


            if (test["autoCompleteSet"]) {
              var expected_terms = _.map(test["autoCompleteSet"], function (t) {
                if (typeof t !== "object") {
                  t = {"name": t};
                }
                return t;
              });
              if (terms.length != expected_terms.length) {
                equal(_.pluck(terms, 'name'), _.pluck(expected_terms, 'name'), "list of completion terms is not of equal size");
              }
              else {
                var filtered_actual_terms = _.map(terms, function (actual_term, i) {
                  var expected_term = expected_terms[i];
                  var filtered_term = {};
                  _.each(expected_term, function (v, p) {
                    filtered_term[p] = actual_term[p];
                  });
                  return filtered_term;
                });
                deepEqual(filtered_actual_terms, expected_terms);
              }
            }

            var context = terms[0].context;
            input.autocomplete._test.addReplacementInfoToContext(context, test.cursor, terms[0].value);

            function ac(prop, prop_test) {
              if (typeof test[prop] != "undefined") {
                if (prop_test) {
                  prop_test(context[prop], test[prop], prop);
                }
                else {
                  deepEqual(context[prop], test[prop], 'context.' + prop + ' should equal ' + JSON.stringify(test[prop]));
                }
              }
            }

            function pos_compare(actual, expected, name) {
              equal(actual.row, expected.row + rowOffset, "row of " + name + " position is not as expected");
              equal(actual.column, expected.column, "column of " + name + " position is not as expected");
            }

            function range_compare(actual, expected, name) {
              pos_compare(actual.start, expected.start, name + ".start");
              pos_compare(actual.end, expected.end, name + ".end");
            }

            ac("prefixToAdd");
            ac("suffixToAdd");
            ac("addTemplate");
            ac("textBoxPosition", pos_compare);
            ac("rangeToReplace", range_compare);

            start();
          });
      });
    });

  })
}

function context_tests(data, mapping, kb_schemes, request_line, tests) {
  if (data != null && typeof data != "string") {
    data = JSON.stringify(data, null, 3);
  }
  for (var t = 0; t < tests.length; t++) {
    process_context_test(data, mapping, kb_schemes, request_line, tests[t]);
  }
}

var SEARCH_KB = {
  endpoints: {
    _search: {
      methods: ["GET", "POST"],
      patterns: [
        "{indices}/{types}/_search",
        "{indices}/_search",
        "_search"
      ],
      data_autocomplete_rules: {
        query: {match_all: {}, term: {"{field}": {__template: {"f": 1}}}},
        size: {},
        facets: {
          __template: {
            "FIELD": {}
          },
          "*": {terms: {field: "{field}"}}
        }
      }
    }
  }
};

var MAPPING = {
  "index1": {
    "type1.1": {
      "properties": {
        "field1.1.1": {"type": "string"},
        "field1.1.2": {"type": "string"}
      }
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

context_tests(
  {},
  MAPPING,
  SEARCH_KB,
  "POST _search",
  [
    {
      name: "Empty doc",
      cursor: {row: 0, column: 1},
      initialValue: "",
      addTemplate: true,
      prefixToAdd: "",
      suffixToAdd: "",
      rangeToReplace: {start: {row: 0, column: 1}, end: {row: 0, column: 1}},
      autoCompleteSet: ["facets", "query", "size"]
    }
  ]
);

context_tests(
  {},
  MAPPING,
  SEARCH_KB,
  "POST _no_context",
  [
    {
      name: "Missing KB",
      cursor: {row: 0, column: 1},
      no_context: true
    }
  ]
);

context_tests(
  {
    "query": {
      "f": 1
    }
  },
  MAPPING,
  {
    globals: {
      query: {
        t1: 2
      }
    },
    endpoints: {}
  },
  "POST _no_context",
  [
    {
      name: "Missing KB - global auto complete",
      cursor: {row: 2, column: 5},
      autoCompleteSet: ["t1"]
    }
  ]
);

context_tests(
  {
    "query": {
      "field": "something"
    },
    "facets": {},
    "size": 20
  },
  MAPPING,
  SEARCH_KB,
  "POST _search",
  [
    {
      name: "existing dictionary key, no template",
      cursor: {row: 1, column: 6},
      initialValue: "query",
      addTemplate: false,
      prefixToAdd: "",
      suffixToAdd: "",
      rangeToReplace: {start: {row: 1, column: 3}, end: {row: 1, column: 10}},
      autoCompleteSet: ["facets", "query", "size"]
    },
    {
      name: "existing inner dictionary key",
      cursor: {row: 2, column: 7},
      initialValue: "field",
      addTemplate: false,
      prefixToAdd: "",
      suffixToAdd: "",
      rangeToReplace: {start: {row: 2, column: 6}, end: {row: 2, column: 13}},
      autoCompleteSet: ["match_all", "term"]
    },
    {
      name: "existing dictionary key, yes template",
      cursor: {row: 4, column: 7},
      initialValue: "facets",
      addTemplate: true,
      prefixToAdd: "",
      suffixToAdd: "",
      rangeToReplace: {start: {row: 4, column: 3}, end: {row: 4, column: 15}},
      autoCompleteSet: ["facets", "query", "size"]
    },
    {
      name: "ignoring meta keys",
      cursor: {row: 4, column: 14},
      no_context: true
    }
  ]
);

context_tests(
  '{\n' +
  '   "query": {\n' +
  '    "field": "something"\n' +
  '   },\n' +
  '   "facets": {},\n' +
  '   "size": 20 \n' +
  '}',
  MAPPING,
  SEARCH_KB,
  "POST _search",
  [
    {
      name: "trailing comma, end of line",
      cursor: {row: 4, column: 16},
      initialValue: "",
      addTemplate: true,
      prefixToAdd: "",
      suffixToAdd: ", ",
      rangeToReplace: {start: {row: 4, column: 16}, end: {row: 4, column: 16}},
      autoCompleteSet: ["facets", "query", "size"]
    },
    {
      name: "trailing comma, beginning of line",
      cursor: {row: 5, column: 1},
      initialValue: "",
      addTemplate: true,
      prefixToAdd: "",
      suffixToAdd: ", ",
      rangeToReplace: {start: {row: 5, column: 1}, end: {row: 5, column: 1}},
      autoCompleteSet: ["facets", "query", "size"]
    },
    {
      name: "prefix comma, beginning of line",
      cursor: {row: 6, column: 0},
      initialValue: "",
      addTemplate: true,
      prefixToAdd: ", ",
      suffixToAdd: "",
      rangeToReplace: {start: {row: 6, column: 0}, end: {row: 6, column: 0}},
      autoCompleteSet: ["facets", "query", "size"]
    },
    {
      name: "prefix comma, end of line",
      cursor: {row: 5, column: 14},
      initialValue: "",
      addTemplate: true,
      prefixToAdd: ", ",
      suffixToAdd: "",
      rangeToReplace: {start: {row: 5, column: 14}, end: {row: 5, column: 14}},
      autoCompleteSet: ["facets", "query", "size"]
    }

  ]
);

context_tests(
  {
    "object": 1,
    "array": 1,
    "value_one_of": 1,
    "value": 2,
    "something_else": 5
  },
  MAPPING,
  {
    endpoints: {
      _test: {
        patterns: [
          "_test"
        ],
        data_autocomplete_rules: {
          object: {bla: 1},
          array: [1],
          value_one_of: {__one_of: [1, 2]},
          value: 3,
          "*": {__one_of: [4, 5]}
        }
      }
    }
  },
  "GET _test",
  [
    {
      name: "not matching object when { is not opened",
      cursor: {row: 1, column: 12},
      initialValue: "",
      autoCompleteSet: ["{"]
    },
    {
      name: "not matching array when [ is not opened",
      cursor: {row: 2, column: 12},
      initialValue: "",
      autoCompleteSet: ["["]
    },
    {
      name: "matching value with one_of",
      cursor: {row: 3, column: 19},
      initialValue: "",
      autoCompleteSet: [1, 2]
    },
    {
      name: "matching value",
      cursor: {row: 4, column: 12},
      initialValue: "",
      autoCompleteSet: [3]
    },
    {
      name: "matching any value with one_of",
      cursor: {row: 5, column: 21},
      initialValue: "",
      autoCompleteSet: [4, 5]
    }
  ]
);

context_tests(
  {
    "query": {
      "field": "something"
    },
    "facets": {
      "name": {}
    },
    "size": 20
  },
  MAPPING,
  SEARCH_KB,
  "GET _search",
  [
    {
      name: "* matching everything",
      cursor: {row: 5, column: 15},
      initialValue: "",
      addTemplate: true,
      prefixToAdd: "",
      suffixToAdd: "",
      rangeToReplace: {start: {row: 5, column: 15}, end: {row: 5, column: 15}},
      autoCompleteSet: [
        {name: "terms", meta: "API"}
      ]
    }
  ]
);

context_tests(
  {
    "index": "123"
  },
  MAPPING,
  {
    endpoints: {
      _test: {
        patterns: [
          "_test"
        ],
        data_autocomplete_rules: {
          index: "{index}"
        }
      }
    }
  },
  "GET _test",
  [
    {
      name: "{index} matching",
      cursor: {row: 1, column: 15},
      autoCompleteSet: [
        {name: "index1", meta: "index"},
        {name: "index2", meta: "index"}
      ]
    }
  ]
);

function tt(term, template, meta) {
  term = {name: term, template: template};
  if (meta) {
    term.meta = meta;
  }
  return term
}

context_tests(
  {
    "array": [
      "a"
    ],
    "oneof": "1"
  },
  MAPPING,
  {
    endpoints: {
      _endpoint: {
        patterns: [
          "_endpoint"
        ],
        data_autocomplete_rules: {
          array: ["a", "b"],
          number: 1,
          object: {},
          fixed: {__template: {"a": 1}},
          oneof: {__one_of: ["o1", "o2"]}
        }
      }
    }
  },
  "GET _endpoint",
  [
    {
      name: "Templates 1",
      cursor: {row: 1, column: 0},
      autoCompleteSet: [
        tt("array", []), tt("fixed", {a: 1}), tt("number", 1), tt("object", {}), tt("oneof", "o1")
      ]
    },
    {
      name: "Templates - one off",
      cursor: {row: 4, column: 12},
      autoCompleteSet: [tt("o1"), tt("o2")]
    }
  ]
);

context_tests(
  {
    "string": "value",
    "context": {}
  },
  MAPPING,
  {
    endpoints: {
      _endpoint: {
        patterns: [
          "_endpoint"
        ],
        data_autocomplete_rules: {
          context: {
            __one_of: [{
              __condition: {
                lines_regex: "value"
              },
              "match": {}
            }, {
              __condition: {
                lines_regex: "other"
              },
              "no_match": {}
            }, {"always": {}}]
          }
        }
      }
    }
  },
  "GET _endpoint",
  [
    {
      name: "Conditionals",
      cursor: {row: 2, column: 15},
      autoCompleteSet: [
        tt("always", {}), tt("match", {})
      ]
    }
  ]
);


context_tests(
  {
    "any_of_numbers": [
      1
    ],
    "any_of_obj": [
      {
        "a": 1
      }
    ],
    "any_of_mixed": [
      {
        "a": 1
      },
      2
    ]
  },
  MAPPING,
  {
    endpoints: {
      _endpoint: {
        patterns: [
          "_endpoint"
        ],
        data_autocomplete_rules: {
          any_of_numbers: {__template: [1, 2], __any_of: [1, 2, 3]},
          any_of_obj: {
            __template: [
              {c: 1}
            ], __any_of: [
              {a: 1, b: 2},
              {c: 1}
            ]
          },
          any_of_mixed: {
            __any_of: [
              {a: 1},
              3
            ]
          }
        }
      }
    }
  },
  "GET _endpoint",
  [
    {
      name: "Any of - templates",
      cursor: {row: 1, column: 0},
      autoCompleteSet: [
        tt("any_of_mixed", []),
        tt("any_of_numbers", [1, 2]),
        tt("any_of_obj", [
          {c: 1}
        ])
      ]
    },
    {
      name: "Any of - numbers",
      cursor: {row: 2, column: 2},
      autoCompleteSet: [1, 2, 3]
    },
    {
      name: "Any of - object",
      cursor: {row: 6, column: 2},
      autoCompleteSet: [
        tt("a", 1), tt("b", 2), tt("c", 1)
      ]
    },
    {
      name: "Any of - mixed - obj",
      cursor: {row: 11, column: 2},
      autoCompleteSet: [
        tt("a", 1)
      ]
    },
    {
      name: "Any of - mixed - both",
      cursor: {row: 13, column: 2},
      autoCompleteSet: [
        tt("{"), tt(3)
      ]
    }
  ]
);

context_tests(
  {},
  MAPPING,
  {
    endpoints: {
      _endpoint: {
        patterns: ["_endpoint"],
        data_autocomplete_rules: {
          "query": ""
        }
      }
    }
  },
  "GET _endpoint",
  [
    {
      name: "Empty string as default",
      cursor: {row: 0, column: 1},
      autoCompleteSet: [tt("query", "")]
    }
  ]
);

context_tests(
  {
    "a": {
      "b": {},
      "c": {},
      "d": {
        t1a: {}
      },
      "e": {},
      "f": [
        {}
      ],
      "g": {},
      "h": {}
    }
  },
  MAPPING,
  {
    globals: {
      gtarget: {
        t1: 2,
        t1a: {
          __scope_link: "."
        }
      }
    },
    endpoints: {
      _current: {
        patterns: ["_current"],
        data_autocomplete_rules: {
          "a": {
            "b": {
              __scope_link: ".a"
            },
            "c": {
              __scope_link: "ext.target"
            },
            "d": {
              __scope_link: "GLOBAL.gtarget"
            },
            "e": {
              __scope_link: "ext"
            },
            "f": [
              {
                __scope_link: "ext.target"
              }
            ],
            "g": {
              __scope_link: function () {
                return {
                  "a": 1,
                  "b": 2
                }
              }
            },
            "h": {
              __scope_link: "GLOBAL.broken"
            }
          }
        }
      },
      ext: {
        patterns: ["ext"],
        data_autocomplete_rules: {
          target: {
            t2: 1
          }
        }
      }
    }
  },
  "GET _current",
  [
    {
      name: "Relative scope link test",
      cursor: {row: 2, column: 12},
      autoCompleteSet: [
        tt("b", {}), tt("c", {}), tt("d", {}), tt("e", {}), tt("f", [
          {}
        ]), tt("g", {}), tt("h", {})
      ]
    },
    {
      name: "External scope link test",
      cursor: {row: 3, column: 12},
      autoCompleteSet: [tt("t2", 1)]
    },
    {
      name: "Global scope link test",
      cursor: {row: 4, column: 12},
      autoCompleteSet: [tt("t1", 2), tt("t1a", {})]
    },
    {
      name: "Global scope link with an internal scope link",
      cursor: {row: 5, column: 17},
      autoCompleteSet: [tt("t1", 2), tt("t1a", {})]
    },
    {
      name: "Entire endpoint scope link test",
      cursor: {row: 7, column: 12},
      autoCompleteSet: [tt("target", {})]
    },
    {
      name: "A scope link within an array",
      cursor: {row: 9, column: 10},
      autoCompleteSet: [tt("t2", 1)]
    },
    {
      name: "A function based scope link",
      cursor: {row: 11, column: 12},
      autoCompleteSet: [tt("a", 1), tt("b", 2)]
    },
    {
      name: "A global scope link with wrong link",
      cursor: {row: 12, column: 12},
      assertThrows: /broken/

    }
  ]
);

context_tests(
  {},
  MAPPING,
  {
    globals: {
      gtarget: {
        t1: 2
      }
    },
    endpoints: {
      _current: {
        patterns: ["_current"],
        id: "GET _current",
        data_autocomplete_rules: {
          __scope_link: "GLOBAL.gtarget"
        }
      }
    }
  },
  "GET _current",
  [
    {
      name: "Top level scope link",
      cursor: {row: 0, column: 1},
      autoCompleteSet: [
        tt("t1", 2)
      ]
    }
  ]
);

context_tests(
  {
    "a": {}
  },
  MAPPING,
  {
    endpoints: {
      _endpoint: {
        patterns: ["_endpoint"],
        data_autocomplete_rules: {
          "a": {},
          "b": {}
        }
      }
    }
  },
  "GET _endpoint",
  [
    {
      name: "Path after empty object",
      cursor: {row: 1, column: 10},
      autoCompleteSet: ["a", "b"]
    }
  ]
);

context_tests(
  {
    "": {}
  },
  MAPPING,
  SEARCH_KB,
  "POST _search",
  [
    {
      name: "Replace an empty string",
      cursor: {row: 1, column: 4},
      rangeToReplace: {start: {row: 1, column: 3}, end: {row: 1, column: 9}}
    }
  ]
);

context_tests(
  {
    "a": [
      {
        "c": {}
      }
    ]
  },
  MAPPING,
  {
    endpoints: {
      _endpoint: {
        patterns: ["_endpoint"],
        data_autocomplete_rules: {
          "a": [
            {b: 1}
          ]
        }
      }
    }
  },
  "GET _endpoint",
  [
    {
      name: "List of objects - internal autocomplete",
      cursor: {row: 3, column: 10},
      autoCompleteSet: ["b"]
    },
    {
      name: "List of objects - external template",
      cursor: {row: 0, column: 1},
      autoCompleteSet: [tt("a", [
        {}
      ])]
    }
  ]
);

context_tests(
  {
    "query": {
      "term": {
        "field": "something"
      }
    },
    "facets": {
      "test": {
        "terms": {
          "field": "test"
        }
      }
    },
    "size": 20
  },
  MAPPING,
  SEARCH_KB,
  "POST index1/_search",
  [
    {
      name: "Field completion as scope",
      cursor: {row: 3, column: 10},
      autoCompleteSet: [tt("field1.1.1", {"f": 1}, "string"), tt("field1.1.2", {"f": 1}, "string")]
    },
    {
      name: "Field completion as value",
      cursor: {row: 9, column: 23},
      autoCompleteSet: [
        {name: "field1.1.1", meta: "string"},
        {name: "field1.1.2", meta: "string"}
      ]
    }
  ]
);


context_tests(
  "POST _search",
  MAPPING,
  SEARCH_KB,
  null,
  [
    {
      name: "initial doc start",
      cursor: {row: 1, column: 0},
      autoCompleteSet: ["{"],
      prefixToAdd: "",
      suffixToAdd: ""
    }
  ]
);


context_tests(
  '{\n' +
  '   "query": {} \n' +
  '}\n' +
  '\n' +
  '\n',
  MAPPING,
  SEARCH_KB,
  "POST _search",
  [
    {
      name: "Cursor rows after request end",
      cursor: {row: 4, column: 0},
      autoCompleteSet: ["GET", "PUT", "POST", "DELETE", "HEAD"],
      prefixToAdd: "",
      suffixToAdd: " "
    },
    {
      name: "Cursor just after request end",
      cursor: {row: 2, column: 1},
      no_context: true
    }

  ]
);


var CLUSTER_KB = {
  endpoints: {
    "_search": {
      patterns: ["_search", "{indices}/{types}/_search", "{indices}/_search"],
      url_params: {
        "search_type": ["count", "query_then_fetch"],
        "scroll": "10m"
      },
      data_autocomplete_rules: {}
    },
    "_cluster/stats": {
      patterns: ["_cluster/stats"],
      indices_mode: "none",
      data_autocomplete_rules: {}
    },
    "_cluster/nodes/stats": {
      patterns: ["_cluster/nodes/stats"],
      data_autocomplete_rules: {}
    }
  }
};

context_tests(
  null,
  MAPPING,
  CLUSTER_KB,
  "GET _cluster",
  [
    {
      name: "Endpoints with slashes - no slash",
      cursor: {row: 0, column: 8},
      autoCompleteSet: ["_cluster/nodes/stats", "_cluster/stats", "_search", "index1", "index2"],
      prefixToAdd: "",
      suffixToAdd: ""
    }
  ]
);

context_tests(
  null,
  MAPPING,
  CLUSTER_KB,
  "GET _cluster/",
  [
    {
      name: "Endpoints with slashes - before slash",
      cursor: {row: 0, column: 7},
      autoCompleteSet: ["_cluster/nodes/stats", "_cluster/stats", "_search", "index1", "index2"],
      prefixToAdd: "",
      suffixToAdd: ""
    },
    {
      name: "Endpoints with slashes - on slash",
      cursor: {row: 0, column: 12},
      autoCompleteSet: ["_cluster/nodes/stats", "_cluster/stats", "_search", "index1", "index2"],
      prefixToAdd: "",
      suffixToAdd: ""
    },
    {
      name: "Endpoints with slashes - after slash",
      cursor: {row: 0, column: 13},
      autoCompleteSet: ["nodes/stats", "stats"],
      prefixToAdd: "",
      suffixToAdd: ""
    }
  ]
);

context_tests(
  null,
  MAPPING,
  CLUSTER_KB,
  "GET _cluster/no",
  [
    {
      name: "Endpoints with slashes - after slash",
      cursor: {row: 0, column: 14},
      autoCompleteSet: [
        {name: "nodes/stats", meta: "endpoint"},
        {name: "stats", meta: "endpoint"}
      ],
      prefixToAdd: "",
      suffixToAdd: "",
      initialValue: "no"
    }
  ]
);

context_tests(
  null,
  MAPPING,
  CLUSTER_KB,
  "GET _cluster/nodes/st",
  [
    {
      name: "Endpoints with two slashes",
      cursor: {row: 0, column: 20},
      autoCompleteSet: ["stats"],
      prefixToAdd: "",
      suffixToAdd: "",
      initialValue: "st"
    }
  ]
);

context_tests(
  null,
  MAPPING,
  CLUSTER_KB,
  "GET ",
  [
    {
      name: "Immediately after space + method",
      cursor: {row: 0, column: 4},
      autoCompleteSet: [
        {name: "_cluster/nodes/stats", meta: "endpoint"},
        {name: "_cluster/stats", meta: "endpoint"},
        {name: "_search", meta: "endpoint"},
        {name: "index1", meta: "index"},
        {name: "index2", meta: "index"}
      ],
      prefixToAdd: "",
      suffixToAdd: "",
      initialValue: ""
    }
  ]
);

context_tests(
  null,
  MAPPING,
  CLUSTER_KB,
  "GET cl",
  [
    {
      name: "Endpoints by subpart",
      cursor: {row: 0, column: 6},
      autoCompleteSet: [
        {name: "_cluster/nodes/stats", meta: "endpoint"},
        {name: "_cluster/stats", meta: "endpoint"},
        {name: "_search", meta: "endpoint"},
        {name: "index1", meta: "index"},
        {name: "index2", meta: "index"}
      ],
      prefixToAdd: "",
      suffixToAdd: "",
      initialValue: "cl"
    }
  ]
);

context_tests(
  null,
  MAPPING,
  CLUSTER_KB,
  "POST cl",
  [
    {
      name: "Endpoints by subpart",
      cursor: {row: 0, column: 7},
      autoCompleteSet: [
        {name: "_cluster/nodes/stats", meta: "endpoint"},
        {name: "_cluster/stats", meta: "endpoint"},
        {name: "_search", meta: "endpoint"},
        {name: "index1", meta: "index"},
        {name: "index2", meta: "index"}
      ],
      prefixToAdd: "",
      suffixToAdd: "",
      initialValue: "cl"
    }
  ]
);


context_tests(
  null,
  MAPPING,
  CLUSTER_KB,
  "GET _search?",
  [
    {
      name: "Params just after ?",
      cursor: {row: 0, column: 12},
      autoCompleteSet: [
        {name: "filter_path", meta: "param", "insert_value": "filter_path="},
        {name: "format", meta: "param", "insert_value": "format="},
        {name: "pretty", meta: "flag"},
        {name: "scroll", meta: "param", "insert_value": "scroll="},
        {name: "search_type", meta: "param", "insert_value": "search_type="},
      ],
      prefixToAdd: "",
      suffixToAdd: ""
    }
  ]
);

context_tests(
  null,
  MAPPING,
  CLUSTER_KB,
  "GET _search?format=",
  [
    {
      name: "Params values",
      cursor: {row: 0, column: 19},
      autoCompleteSet: [
        {name: "json", meta: "format"},
        {name: "yaml", meta: "format"}
      ],
      prefixToAdd: "",
      suffixToAdd: ""
    }
  ]
);

context_tests(
  null,
  MAPPING,
  CLUSTER_KB,
  "GET _search?format=yaml&",
  [
    {
      name: "Params after amp",
      cursor: {row: 0, column: 24},
      autoCompleteSet: [
        {name: "filter_path", meta: "param", "insert_value": "filter_path="},
        {name: "format", meta: "param", "insert_value": "format="},
        {name: "pretty", meta: "flag"},
        {name: "scroll", meta: "param", "insert_value": "scroll="},
        {name: "search_type", meta: "param", "insert_value": "search_type="},
      ],
      prefixToAdd: "",
      suffixToAdd: ""
    }
  ]
);

context_tests(
  null,
  MAPPING,
  CLUSTER_KB,
  "GET _search?format=yaml&search",
  [
    {
      name: "Params on existing param",
      cursor: {row: 0, column: 26},
      rangeToReplace: {
        start: {row: 0, column: 24},
        end: {row: 0, column: 30}
      },
      autoCompleteSet: [
        {name: "filter_path", meta: "param", "insert_value": "filter_path="},
        {name: "format", meta: "param", "insert_value": "format="},
        {name: "pretty", meta: "flag"},
        {name: "scroll", meta: "param", "insert_value": "scroll="},
        {name: "search_type", meta: "param", "insert_value": "search_type="},
      ],
      prefixToAdd: "",
      suffixToAdd: ""
    }
  ]
);

context_tests(
  null,
  MAPPING,
  CLUSTER_KB,
  "GET _search?format=yaml&search_type=cou",
  [
    {
      name: "Params on existing value",
      cursor: {row: 0, column: 37},
      rangeToReplace: {
        start: {row: 0, column: 36},
        end: {row: 0, column: 39}
      },
      autoCompleteSet: [
        {name: "count", meta: "search_type"},
        {name: "query_then_fetch", meta: "search_type"},
      ],
      prefixToAdd: "",
      suffixToAdd: ""
    }
  ]
);
context_tests(
  null,
  MAPPING,
  CLUSTER_KB,
  "GET _search?format=yaml&search_type=cou",
  [
    {
      name: "Params on just after = with existing value",
      cursor: {row: 0, column: 36},
      rangeToReplace: {
        start: {row: 0, column: 36},
        end: {row: 0, column: 36}
      },
      autoCompleteSet: [
        {name: "count", meta: "search_type"},
        {name: "query_then_fetch", meta: "search_type"},
      ],
      prefixToAdd: "",
      suffixToAdd: ""
    }
  ]
);


context_tests(
  {
    "query": {
      "field": "something"
    },
    "facets": {},
    "size": 20
  },
  MAPPING,
  SEARCH_KB,
  "POST http://somehost/_search",
  [
    {
      name: "fullurl - existing dictionary key, no template",
      cursor: {row: 1, column: 6},
      initialValue: "query",
      addTemplate: false,
      prefixToAdd: "",
      suffixToAdd: "",
      rangeToReplace: {start: {row: 1, column: 3}, end: {row: 1, column: 10}},
      autoCompleteSet: ["facets", "query", "size"]
    },
    {
      name: "fullurl - existing inner dictionary key",
      cursor: {row: 2, column: 7},
      initialValue: "field",
      addTemplate: false,
      prefixToAdd: "",
      suffixToAdd: "",
      rangeToReplace: {start: {row: 2, column: 6}, end: {row: 2, column: 13}},
      autoCompleteSet: ["match_all", "term"]
    },
    {
      name: "fullurl - existing dictionary key, yes template",
      cursor: {row: 4, column: 7},
      initialValue: "facets",
      addTemplate: true,
      prefixToAdd: "",
      suffixToAdd: "",
      rangeToReplace: {start: {row: 4, column: 3}, end: {row: 4, column: 15}},
      autoCompleteSet: ["facets", "query", "size"]
    }
  ]
);
