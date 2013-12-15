var global = window;

module("Mappings", {
  setup: function () {
    if (!global.sense)
      global.sense = {};
    var sense = global.sense;
    sense.tests = {};
  },

  teardown: function () {
    sense.tests = {};
  }
});


test("Multi fields", function () {
  global.sense.mappings.loadMappings({
    "index": {
      "tweet": {
        "properties": {
          "first_name": {
            "type": "multi_field",
            "path": "just_name",
            "fields": {
              "first_name": {"type": "string", "index": "analyzed"},
              "any_name": {"type": "string", "index": "analyzed"}
            }
          },
          "last_name": {
            "type": "multi_field",
            "path": "just_name",
            "fields": {
              "last_name": {"type": "string", "index": "analyzed"},
              "any_name": {"type": "string", "index": "analyzed"}
            }
          }
        }
      }}
  });

  deepEqual(global.sense.mappings.getFields("index").sort(), ["any_name", "first_name", "last_name" ]);
});

test("Simple fields", function () {
  global.sense.mappings.loadMappings({
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
      }}
  });

  deepEqual(global.sense.mappings.getFields("index").sort(), ["number", "str" ]);
});


test("Nested fields", function () {
  global.sense.mappings.loadMappings({
    "index": {
      "tweet": {
        "properties": {
          "person": {
            "type": "object",
            "properties": {
              "name": {
                "properties": {
                  "first_name": {"type": "string"},
                  "last_name": {"type": "string"}
                }
              },
              "sid": {"type": "string", "index": "not_analyzed"}
            }
          },
          "message": {"type": "string"}
        }
      }
    }});

  deepEqual(global.sense.mappings.getFields("index", ["tweet"]).sort(),
      ["message", "person.name.first_name", "person.name.last_name", "person.sid" ]);
});

test("Enabled fields", function () {
  global.sense.mappings.loadMappings({
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
              "sid": {"type": "string", "index": "not_analyzed"}
            }
          },
          "message": {"type": "string"}
        }
      }
    }
  });

  deepEqual(global.sense.mappings.getFields("index", ["tweet"]).sort(),
      ["message", "person.sid" ]);
});


test("Path tests", function () {
  global.sense.mappings.loadMappings({
    "index": {
      "person": {
        "properties": {
          "name1": {
            "type": "object",
            "path": "just_name",
            "properties": {
              "first1": {"type": "string"},
              "last1": {"type": "string", "index_name": "i_last_1"}
            }
          },
          "name2": {
            "type": "object",
            "path": "full",
            "properties": {
              "first2": {"type": "string"},
              "last2": {"type": "string", "index_name": "i_last_2"}
            }
          }
        }
      }
    }
  });

  deepEqual(global.sense.mappings.getFields().sort(),
      ["first1", "i_last_1", "name2.first2", "name2.i_last_2" ]);
});

test("Use index_name tests", function () {
  global.sense.mappings.loadMappings({
    "index": {
      "person": {
        "properties": {
          "last1": {"type": "string", "index_name": "i_last_1"}
        }
      }
    }
  });

  deepEqual(global.sense.mappings.getFields().sort(),
      [ "i_last_1" ]);
});

test("Aliases", function () {
  global.sense.mappings.loadAliases({
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
  global.sense.mappings.loadMappings({
    "test_index1": {
      "type1": {
        "properties": {
          "last1": {"type": "string", "index_name": "i_last_1"}
        }
      }
    },
    "test_index2": {
      "type2": {
        "properties": {
          "last1": {"type": "string", "index_name": "i_last_1"}
        }
      }
    }
  });

  deepEqual(global.sense.mappings.getIndices().sort(),
     [ "_all", "alias1", "alias2", "test_index1", "test_index2" ]
  );
  deepEqual(global.sense.mappings.getIndices(false).sort(),
      ["test_index1", "test_index2" ]
  );
  deepEqual(global.sense.mappings.expandAliases(["alias1", "test_index2"]).sort(),
      ["test_index1", "test_index2" ]
  );
  deepEqual(global.sense.mappings.expandAliases("alias2"), "test_index2");
});

