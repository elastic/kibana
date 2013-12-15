sense.kb.addEndpointDescription('_search', {
   def_method: "POST",
   methods: ["GET", "POST"],
   endpoint_autocomplete: [
      "_search"
   ],
   indices_mode: "multi",
   types_mode: "multi",
   doc_id_mode: "none",
   data_autocomplete_rules: {
      query: {
         // populated by a global rule
      },
      facets: {
         __template: {
            "NAME": {
               "TYPE": {
               }
            }
         }
         // populated by a global rule
      },
      filter: {
         // added by global rules.
      },
      size: { __template: 20 },
      from: {},
      sort: {
         __template: [
            { "FIELD": { "order": "desc"} }
         ],
         __any_of: [
            {
               "$FIELD$": {
                  "order": { __one_of: ["desc", "asc"]}
               }
            },
            "$FIELD$",
            "_score"
         ]
      },
      search_type: {},
      fields: [ "$FIELD$" ],
      script_fields: {
         __template: { "FIELD": {
            "script": ""
         }},
         "*": {
            __scope_link: "GLOBAL.SCRIPT_ENV"
         }
      },
      partial_fields: {
         __template: {
            "NAME": { include: [] }
         },
         "*": {
            include: [],
            exclude: []
         }
      },
      highlight: {
         // populated by a global rule
      },
       explain: { __one_of: [ true, false ]},
       stats: [ "" ]

   }
});