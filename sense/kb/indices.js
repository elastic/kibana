sense.kb.addEndpointDescription('_refresh', {
   def_method: "POST",
   methods: ["POST"],
   endpoint_autocomplete: [
      "_refresh"
   ],
   indices_mode: "multi"
});

sense.kb.addEndpointDescription('_stats', {
   def_method: "GET",
   methods: ["GET"],
   endpoint_autocomplete: [
      "_stats"
   ],
   indices_mode: "multi"
});

sense.kb.addEndpointDescription('_segments', {
   def_method: "GET",
   methods: ["GET"],
   endpoint_autocomplete: [
      "_segments"
   ],
   indices_mode: "multi"
});

sense.kb.addEndpointDescription('__create_index__', {
   methods: ["PUT", "DELETE"],
   indices_mode: "single",
   types_mode: "none",
   match: "^/?$",
   endpoint_autocomplete: [
      ""
   ],
   data_autocomplete_rules: {
      mappings: {
         __scope_link: "_mapping"
      },
      settings: {
         __scope_link: "_settings.index"
      }
   }



});