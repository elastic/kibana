module.exports = function (api) {
  api.addEndpointDescription('_field_stats', {
    methods: ['GET', 'POST'],
    patterns: [
      "_field_stats",
      "{indices}/_field_stats"
    ],
    url_params: {
      fields: [],
      level: ["cluster", "indices"],
      ignore_unavailable: ["true", "false"],
      allow_no_indices: [false, true],
      expand_wildcards: ["open", "closed", "none", "all"]
    },
    data_autocomplete_rules: {
      fields: [
        "{field}",
      ],
      index_constraints: {
        "{field}": {
          min_value: {
            gt: "MIN",
            gte: "MAX",
            lt: "MIN",
            lte: "MAX"
          },
          max_value: {
            gt: "MIN",
            gte: "MAX",
            lt: "MIN",
            lte: "MAX"
          }
        },
        __template: {
          "FIELD": {
            min_value: {
              gt: "MIN"
            },
            max_value: {
              lt: "MAX"
            }
          }
        }
      }
    }
  });
};
