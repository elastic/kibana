define(function () {
  'use strict';

  return function init(api) {
    api.addEndpointDescription('restore_snapshot', {
      methods: ['POST'],
      patterns: [
        '_snapshot/{id}/{id}/_restore'
      ],
      url_params: {
        wait_for_completion: "__flag__"
      },
      data_autocomplete_rules: {
        indices: "*",
        ignore_unavailable: { __one_of: [ true, false] },
        include_global_state: false,
        rename_pattern: "index_(.+)",
        rename_replacement: "restored_index_$1"
      }
    });

    api.addEndpointDescription('single_snapshot', {
      methods: ['GET', 'DELETE'],
      patterns: [
        '_snapshot/{id}/{id}'
      ]
    });

    api.addEndpointDescription('all_snapshots', {
      methods: ['GET'],
      patterns: [
        '_snapshot/{id}/_all'
      ]
    });

    api.addEndpointDescription('put_snapshot', {
      methods: ['PUT'],
      patterns: [
        '_snapshot/{id}/{id}'
      ],
      url_params: {
        wait_for_completion: "__flag__"
      },
      data_autocomplete_rules: {
        indices: "*",
        ignore_unavailable: { __one_of: [ true, false] },
        include_global_state: { __one_of: [ true, false] },
        partial: { __one_of: [ true, false] }
      }
    });

    function getRepositoryType(context) {
      var iter = context.editor.iterForCurrentLoc();
      // for now just iterate back to the first "type" key
      var t = iter.getCurrentToken();
      var type;
      while (t && t.type.indexOf("url") < 0) {
        if (t.type === 'variable' && t.value === '"type"') {
          t = context.editor.parser.nextNonEmptyToken(iter);
          if (!t || t.type !== "punctuation.colon") {
            // weird place to be in, but safe choice..
            break;
          }
          t = context.editor.parser.nextNonEmptyToken(iter);
          if (t && t.type === "string") {
            type = t.value.replace(/"/g, '');
          }
          break;
        }
        t = context.editor.parser.prevNonEmptyToken(iter);
      }
      return type;
    }

    api.addEndpointDescription('put_repository', {
      methods: ['PUT'],
      patterns: [
        '_snapshot/{id}'
      ],
      data_autocomplete_rules: {
        __scope_link: function (context) {
          var type = getRepositoryType(context);
          if (!type) {
            return {
              "type": {
                __one_of: ["fs", "url"]
              }
            }
          }
          return {
            "settings": {
              __scope_link: function (context) {
                var rules = {
                  fs: {
                    __template: {
                      location: "path"
                    },
                    location: "path",
                    compress: { __one_of: [ true, false]},
                    concurrent_streams: 5,
                    chunk_size: "1g",
                    max_restore_bytes_per_sec: "20mb",
                    max_snapshot_bytes_per_sec: "20mb"
                  },
                  url: {
                    __template: {
                      url: ""
                    },
                    url: "",
                    concurrent_streams: 5
                  }
                };

                var type = getRepositoryType(context);

                if (!type) {
                  console.log("failed to resolve snapshot, defaulting to 'fs'");
                  type = "fs";
                }

                return rules[type];
              }
            }
          }
        }
      }
    });
  }
    ;
})
;