let _ = require('lodash');
let url_pattern_matcher = require('../../src/autocomplete/url_pattern_matcher');
let autocomplete_engine = require('../../src/autocomplete/engine');

var { test, module, deepEqual } = window.QUnit;

module("Url autocomplete");

function patterns_test(name, endpoints, tokenPath, expectedContext, globalUrlComponentFactories) {

  test(name, function () {
    var patternMatcher = new url_pattern_matcher.UrlPatternMatcher(globalUrlComponentFactories);
    _.each(endpoints, function (e, id) {
      e.id = id;
      _.each(e.patterns, function (p) {
        patternMatcher.addEndpoint(p, e);
      });
    });
    if (typeof tokenPath === "string") {
      if (tokenPath[tokenPath.length - 1] == "$") {
        tokenPath = tokenPath.substr(0, tokenPath.length - 1) + "/" + url_pattern_matcher.URL_PATH_END_MARKER;
      }
      tokenPath = _.map(tokenPath.split("/"), function (p) {
        p = p.split(",");
        if (p.length === 1) {
          return p[0];
        }
        return p;
      });
    }

    if (expectedContext.autoCompleteSet) {
      expectedContext.autoCompleteSet = _.map(expectedContext.autoCompleteSet, function (t) {
        if (_.isString(t)) {
          t = { name: t }
        }
        return t;
      });
      expectedContext.autoCompleteSet = _.sortBy(expectedContext.autoCompleteSet, 'name');
    }

    var context = {};
    if (expectedContext.method) {
      context.method = expectedContext.method;
    }
    autocomplete_engine.populateContext(tokenPath, context, null,
      expectedContext.autoCompleteSet, patternMatcher.getTopLevelComponents()
    );

    // override context to just check on id
    if (context.endpoint) {
      context.endpoint = context.endpoint.id;
    }

    if (context.autoCompleteSet) {
      context.autoCompleteSet = _.sortBy(context.autoCompleteSet, 'name');
    }

    deepEqual(context, expectedContext);
  });

}

function t(name, meta) {
  if (meta) {
    return { name: name, meta: meta };
  }
  return name;
}

(function () {
  var endpoints = {
    "1": {
      patterns: [
        "a/b"
      ]
    }
  };
  patterns_test("simple single path - completion",
    endpoints,
    "a/b$",
    { endpoint: "1" }
  );


  patterns_test("simple single path - completion, with auto complete",
    endpoints,
    "a/b",
    { autoCompleteSet: [] }
  );

  patterns_test("simple single path - partial, without auto complete",
    endpoints,
    "a",
    {}
  );

  patterns_test("simple single path - partial, with auto complete",
    endpoints,
    "a",
    { autoCompleteSet: ["b"] }
  );

  patterns_test("simple single path - partial, with auto complete",
    endpoints,
    [],
    { autoCompleteSet: ["a/b"] }
  );

  patterns_test("simple single path - different path",
    endpoints,
    "a/c",
    {}
  );

})();

(function () {
  var endpoints = {
    "1": {
      patterns: [
        "a/b",
        "a/b/{p}"
      ]
    },
    "2": {
      patterns: [
        "a/c"
      ]
    }
  };
  patterns_test("shared path  - completion 1",
    endpoints,
    "a/b$",
    { endpoint: "1" }
  );

  patterns_test("shared path  - completion 2",
    endpoints,
    "a/c$",
    { endpoint: "2" }
  );

  patterns_test("shared path  - completion 1 with param",
    endpoints,
    "a/b/v$",
    { endpoint: "1", p: "v" }
  );

  patterns_test("shared path - partial, with auto complete",
    endpoints,
    "a",
    { autoCompleteSet: ["b", "c"] }
  );

  patterns_test("shared path - partial, with auto complete of param, no options",
    endpoints,
    "a/b",
    { autoCompleteSet: [] }
  );

  patterns_test("shared path - partial, without auto complete",
    endpoints,
    "a",
    {}
  );

  patterns_test("shared path - different path - with auto complete",
    endpoints,
    "a/e",
    { autoCompleteSet: [] }
  );

  patterns_test("shared path - different path - without auto complete",
    endpoints,
    "a/e",
    {}
  );

})();

(function () {
  var endpoints = {
    "1": {
      patterns: [
        "a/{p}",
      ],
      url_components: {
        p: ["a", "b"]
      }
    },
    "2": {
      patterns: [
        "a/c"
      ]
    }
  };
  patterns_test("option testing - completion 1",
    endpoints,
    "a/a$",
    { endpoint: "1", p: ["a"] }
  );

  patterns_test("option testing - completion 2",
    endpoints,
    "a/b$",
    { endpoint: "1", p: ["b"] }
  );

  patterns_test("option testing - completion 3",
    endpoints,
    "a/b,a$",
    { endpoint: "1", p: ["b", "a"] }
  );

  patterns_test("option testing - completion 4",
    endpoints,
    "a/c$",
    { endpoint: "2" }
  );

  patterns_test("option testing  - completion 5",
    endpoints,
    "a/d$",
    {}
  );

  patterns_test("option testing - partial, with auto complete",
    endpoints,
    "a",
    { autoCompleteSet: [t("a", "p"), t("b", "p"), "c"] }
  );

  patterns_test("option testing - partial, without auto complete",
    endpoints,
    "a",
    {}
  );


  patterns_test("option testing - different path - with auto complete",
    endpoints,
    "a/e",
    { autoCompleteSet: [] }
  );


})();

(function () {
  var endpoints = {
    "1": {
      patterns: [
        "a/{p}",
      ],
      url_components: {
        p: ["a", "b"]
      }
    },
    "2": {
      patterns: [
        "b/{p}",
      ]
    },
    "3": {
      patterns: [
        "b/{l}/c",
      ],
      url_components: {
        l: {
          type: "list",
          list: ["la", "lb"],
          allow_non_valid: true
        }
      }
    }
  };
  var globalFactories = {
    "p": function (name, parent) {
      return new autocomplete_engine.ListComponent(name, ["g1", "g2"], parent);
    }
  };

  patterns_test("global parameters testing - completion 1",
    endpoints,
    "a/a$",
    { endpoint: "1", p: ["a"] },
    globalFactories
  );

  patterns_test("global parameters testing - completion 2",
    endpoints,
    "b/g1$",
    { endpoint: "2", p: ["g1"] },
    globalFactories
  );


  patterns_test("global parameters testing - partial, with auto complete",
    endpoints,
    "a",
    { autoCompleteSet: [t("a", "p"), t("b", "p")] },
    globalFactories
  );

  patterns_test("global parameters testing - partial, with auto complete 2",
    endpoints,
    "b",
    { autoCompleteSet: [t("g1", "p"), t("g2", "p"), t("la", "l"), t("lb", "l")] },
    globalFactories
  );

  patterns_test("Non valid token acceptance - partial, with auto complete 1",
    endpoints,
    "b/la",
    { autoCompleteSet: ["c"], "l": ["la"] },
    globalFactories
  );
  patterns_test("Non valid token acceptance - partial, with auto complete 2",
    endpoints,
    "b/non_valid",
    { autoCompleteSet: ["c"], "l": ["non_valid"] },
    globalFactories
  );

})();

(function () {
  var endpoints = {
    "1": {
      patterns: [
        "a/b/{p}/c/e"
      ]
    }
  };
  patterns_test("look ahead - autocomplete before param 1",
    endpoints,
    "a",
    { autoCompleteSet: ["b"] }
  );

  patterns_test("look ahead - autocomplete before param 2",
    endpoints,
    [],
    { autoCompleteSet: ["a/b"] }
  );

  patterns_test("look ahead - autocomplete after param 1",
    endpoints,
    "a/b/v",
    { autoCompleteSet: ["c/e"], "p": "v" }
  );

  patterns_test("look ahead - autocomplete after param 2",
    endpoints,
    "a/b/v/c",
    { autoCompleteSet: ["e"], "p": "v" }
  );
})();


(function () {
  var endpoints = {
    "1_param": {
      patterns: [
        "a/{p}"
      ],
      methods: ["GET"]
    },
    "2_explicit": {
      patterns: [
        "a/b"
      ],
      methods: ["GET"]
    }
  };

  var e = _.cloneDeep(endpoints);
  e["1_param"].priority = 1;
  patterns_test("Competing endpoints - priority 1",
    e,
    "a/b$",
    { method: "GET", endpoint: "1_param", "p": "b" }
  );
  e = _.cloneDeep(endpoints);
  e["1_param"].priority = 1;
  e["2_explicit"].priority = 0;
  patterns_test("Competing endpoints - priority 2",
    e,
    "a/b$",
    { method: "GET", endpoint: "2_explicit" }
  );

  e = _.cloneDeep(endpoints);
  e["2_explicit"].priority = 0;
  patterns_test("Competing endpoints - priority 3",
    e,
    "a/b$",
    { method: "GET", endpoint: "2_explicit" }
  );

})();

(function () {
  var endpoints = {
    "1_GET": {
      patterns: [
        "a"
      ],
      methods: ["GET"]
    },
    "1_PUT": {
      patterns: [
        "a"
      ],
      methods: ["PUT"]
    },
    "2_GET": {
      patterns: [
        "a/b"
      ],
      methods: ["GET"]
    },
    "2_DELETE": {
      patterns: [
        "a/b"
      ],
      methods: ["DELETE"]
    }
  };
  patterns_test("Competing endpoint - sub url of another - auto complete",
    endpoints,
    "a",
    { method: "GET", autoCompleteSet: ["b"] }
  );
  patterns_test("Competing endpoint - sub url of another, complete 1",
    endpoints,
    "a$",
    { method: "GET", endpoint: "1_GET" }
  );
  patterns_test("Competing endpoint - sub url of another, complete 2",
    endpoints,
    "a$",
    { method: "PUT", endpoint: "1_PUT" }
  );
  patterns_test("Competing endpoint - sub url of another, complete 3",
    endpoints,
    "a$",
    { method: "DELETE" }
  );

  patterns_test("Competing endpoint - extension of another, complete 1, auto complete",
    endpoints,
    "a/b$",
    { method: "PUT", autoCompleteSet: [] }
  );

  patterns_test("Competing endpoint - extension of another, complete 1",
    endpoints,
    "a/b$",
    { method: "GET", endpoint: "2_GET" }
  );

  patterns_test("Competing endpoint - extension of another, complete 1",
    endpoints,
    "a/b$",
    { method: "DELETE", endpoint: "2_DELETE" }
  );
  patterns_test("Competing endpoint - extension of another, complete 1",
    endpoints,
    "a/b$",
    { method: "PUT" }
  );
})();
