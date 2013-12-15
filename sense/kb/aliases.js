sense.kb.addEndpointDescription('_aliases', {
  match: /_aliases/,
  def_method: "GET",
  methods: ["GET", "POST"],
  endpoint_autocomplete: [
    "_aliases"
  ],
  indices_mode: "multi",
  types_mode: "none",
  doc_id_mode: "none",
  data_autocomplete_rules: {
    "actions": {
      __template: [
        { "add": { "index": "test1", "alias": "alias1" } }
      ],
      __any_of: [
        {
          add: {
            index: "$INDEX$",
            alias: "",
            filter: {},
            routing: "1",
            search_routing: "1,2",
            index_routing: "1"
          },
          remove: {
            index: "",
            alias: ""
          }
        }
      ]
    }
  }
});