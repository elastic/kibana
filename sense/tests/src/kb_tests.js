var global = window;

module("Knowledge base", {
   setup: function () {
      var sense = global.sense;
      sense.mappings.clear();
      sense.tests = {};
   },

   teardown: function () {
      sense.tests = {};
   }
});


test("Index mode filters", function () {
   global.sense.mappings.clear();
   global.sense.kb.clear();
   global.sense.kb.addEndpointDescription("_multi_indices", {
      indices_mode: "multi"
   });
   global.sense.kb.addEndpointDescription("_one_or_more_indices", {
      indices_mode: "required_multi"
   });
   global.sense.kb.addEndpointDescription("_single_index", {
      match: "_single_index",
      endpoint_autocomplete: [
         "_single_index"
      ],
      indices_mode: "single"
   });
   global.sense.kb.addEndpointDescription("_no_index", {
      indices_mode: "none"
   });

   deepEqual(global.sense.kb.getEndpointAutocomplete([], [], null).sort(), ["_multi_indices", "_no_index" ]);
   deepEqual(global.sense.kb.getEndpointAutocomplete(["index"], [], null).sort(), ["_multi_indices", "_one_or_more_indices", "_single_index"]);
   deepEqual(global.sense.kb.getEndpointAutocomplete(["index1", "index2"], [], null).sort(), ["_multi_indices", "_one_or_more_indices"]);
   deepEqual(global.sense.kb.getEndpointAutocomplete(["index1", "index2"], ["type"], null).sort(), ["_multi_indices", "_one_or_more_indices"]);
});

test("Type mode filters", function () {
   global.sense.mappings.clear();
   global.sense.kb.clear();
   global.sense.kb.addEndpointDescription("_multi_types", {
      indices_mode: "single",
      types_mode: "multi"
   });
   global.sense.kb.addEndpointDescription("_single_type", {
      endpoint_autocomplete: [
         "_single_type"
      ],
      indices_mode: "single",
      types_mode: "single"
   });
   global.sense.kb.addEndpointDescription("_no_types", {
      indices_mode: "single",
      types_mode: "none"

   });

   deepEqual(global.sense.kb.getEndpointAutocomplete(["index"], [], null).sort(), ["_multi_types", "_no_types" ]);
   deepEqual(global.sense.kb.getEndpointAutocomplete(["index"], ["type"], null).sort(), ["_multi_types", "_single_type"]);
   deepEqual(global.sense.kb.getEndpointAutocomplete(["index"], ["type", "type1"], null).sort(), ["_multi_types"]);
});

test("Id mode filters", function () {
   global.sense.kb.clear();
   global.sense.kb.addEndpointDescription("_single_id", {
      indices_mode: "single",
      types_mode: "single",
      doc_id_mode: "required_single"
   });
   global.sense.kb.addEndpointDescription("_no_id", {
      indices_mode: "single",
      types_mode: "single",
      doc_id_mode: "none"

   });

   deepEqual(global.sense.kb.getEndpointAutocomplete(["index"], ["type"], null).sort(), ["_no_id"].sort());
   deepEqual(global.sense.kb.getEndpointAutocomplete(["index"], ["type"], "123").sort(), ["_single_id"].sort());
});

test("Get active scheme by doc id", function () {
   global.sense.kb.clear();
   global.sense.kb.addEndpointDescription("_single_id", {
      match: ".*",
      indices_mode: "single",
      types_mode: "single",
      doc_id_mode: "required_single"
   });
   global.sense.kb.addEndpointDescription("_no_id", {
      match: ".*",
      indices_mode: "single",
      types_mode: "single",
      doc_id_mode: "none"

   });

   deepEqual(global.sense.kb.getEndpointDescriptionByPath("bla", ["index"], ["type"], null).doc_id_mode, "none");
   deepEqual(global.sense.kb.getEndpointDescriptionByPath("bla", ["index"], ["type"], "123").doc_id_mode, "required_single");
});
