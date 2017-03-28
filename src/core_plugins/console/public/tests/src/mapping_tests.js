let mappings = require('../../src/mappings');

var { test, module, deepEqual } = window.QUnit;

module("Mappings", {
  setup: function () {
    mappings.clear();
  },
  teardown: function () {
    mappings.clear();
  }
});

function fc(f1, f2) {
  if (f1.name < f2.name) {
    return -1;
  }
  if (f1.name > f2.name) {
    return 1;
  }
  return 0;
}

function f(name, type) {
  return { name: name, type: type || "string" };
}

test("Multi fields", function () {
  mappings.loadMappings({
    "index": {
      "tweet": {
        "properties": {
          "first_name": {
            "type": "multi_field",
            "path": "just_name",
            "fields": {
              "first_name": { "type": "string", "index": "analyzed" },
              "any_name": { "type": "string", "index": "analyzed" }
            }
          },
          "last_name": {
            "type": "multi_field",
            "path": "just_name",
            "fields": {
              "last_name": { "type": "string", "index": "analyzed" },
              "any_name": { "type": "string", "index": "analyzed" }
            }
          }
        }
      }
    }
  });

  deepEqual(mappings.getFields("index").sort(fc), [
    f("any_name", "string"), f("first_name", "string"), f("last_name", "string")]);
});

test("Multi fields 1.0 style", function () {
  mappings.loadMappings({
    "index": {
      "tweet": {
        "properties": {
          "first_name": {
            "type": "string", "index": "analyzed",
            "path": "just_name",
            "fields": {
              "any_name": { "type": "string", "index": "analyzed" }
            }
          },
          "last_name": {
            "type": "string", "index": "no",
            "fields": {
              "raw": { "type": "string", "index": "analyzed" }
            }
          }
        }
      }
    }
  });

  deepEqual(mappings.getFields("index").sort(fc), [
    f("any_name", "string"), f("first_name", "string"), f("last_name", "string"), f("last_name.raw", "string")]);
});

test("Simple fields", function () {
  mappings.loadMappings({
    "index": {
      "tweet": {
        "properties": {
          "str": {
            "type": "string"
          },
          "number": {
            "type": "int"
          }
        }
      }
    }
  });

  deepEqual(mappings.getFields("index").sort(fc), [f("number", "int"), f("str", "string")]);
});

test("Simple fields - 1.0 style", function () {
  mappings.loadMappings({
    "index": {
      "mappings": {
        "tweet": {
          "properties": {
            "str": {
              "type": "string"
            },
            "number": {
              "type": "int"
            }
          }
        }
      }
    }
  });

  deepEqual(mappings.getFields("index").sort(fc), [f("number", "int"), f("str", "string")]);
});

test("Nested fields", function () {
  mappings.loadMappings({
    "index": {
      "tweet": {
        "properties": {
          "person": {
            "type": "object",
            "properties": {
              "name": {
                "properties": {
                  "first_name": { "type": "string" },
                  "last_name": { "type": "string" }
                }
              },
              "sid": { "type": "string", "index": "not_analyzed" }
            }
          },
          "message": { "type": "string" }
        }
      }
    }
  });

  deepEqual(mappings.getFields("index", ["tweet"]).sort(fc),
    [f("message"), f("person.name.first_name"), f("person.name.last_name"), f("person.sid")]);
});

test("Enabled fields", function () {
  mappings.loadMappings({
    "index": {
      "tweet": {
        "properties": {
          "person": {
            "type": "object",
            "properties": {
              "name": {
                "type": "object",
                "enabled": false
              },
              "sid": { "type": "string", "index": "not_analyzed" }
            }
          },
          "message": { "type": "string" }
        }
      }
    }
  });

  deepEqual(mappings.getFields("index", ["tweet"]).sort(fc),
    [f("message"), f("person.sid")]);
});


test("Path tests", function () {
  mappings.loadMappings({
    "index": {
      "person": {
        "properties": {
          "name1": {
            "type": "object",
            "path": "just_name",
            "properties": {
              "first1": { "type": "string" },
              "last1": { "type": "string", "index_name": "i_last_1" }
            }
          },
          "name2": {
            "type": "object",
            "path": "full",
            "properties": {
              "first2": { "type": "string" },
              "last2": { "type": "string", "index_name": "i_last_2" }
            }
          }
        }
      }
    }
  });

  deepEqual(mappings.getFields().sort(fc),
    [f("first1"), f("i_last_1"), f("name2.first2"), f("name2.i_last_2")]);
});

test("Use index_name tests", function () {
  mappings.loadMappings({
    "index": {
      "person": {
        "properties": {
          "last1": { "type": "string", "index_name": "i_last_1" }
        }
      }
    }
  });

  deepEqual(mappings.getFields().sort(fc),
    [f("i_last_1")]);
});

test("Aliases", function () {
  mappings.loadAliases({
    "test_index1": {
      "aliases": {
        "alias1": {}
      }
    },
    "test_index2": {
      "aliases": {
        "alias2": {
          "filter": {
            "term": {
              "FIELD": "VALUE"
            }
          }
        },
        "alias1": {}
      }
    }
  });
  mappings.loadMappings({
    "test_index1": {
      "type1": {
        "properties": {
          "last1": { "type": "string", "index_name": "i_last_1" }
        }
      }
    },
    "test_index2": {
      "type2": {
        "properties": {
          "last1": { "type": "string", "index_name": "i_last_1" }
        }
      }
    }
  });

  deepEqual(mappings.getIndices().sort(),
    ["_all", "alias1", "alias2", "test_index1", "test_index2"]
  );
  deepEqual(mappings.getIndices(false).sort(),
    ["test_index1", "test_index2"]
  );
  deepEqual(mappings.expandAliases(["alias1", "test_index2"]).sort(),
    ["test_index1", "test_index2"]
  );
  deepEqual(mappings.expandAliases("alias2"), "test_index2");
});
