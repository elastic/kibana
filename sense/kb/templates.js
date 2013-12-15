sense.kb.addEndpointDescription('_template', {
  match: /\/?_template/,
  def_method: "PUT",
  methods: ["GET", "PUT", "DELETE"],
  endpoint_autocomplete: [
    "_template/TEMPLATE_ID"
  ],
  indices_mode: "none",
  types_mode: "none",
  doc_id_mode: "none",

  data_autocomplete_rules: {
    template: "index*",
    warmers: { __scope_link: "_warmer" },
    mappings: {},
    settings: {}
  }
});