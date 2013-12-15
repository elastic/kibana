sense.kb.addEndpointDescription('_mapping', {
   def_method: "GET",
   methods: ["GET", "PUT"],
   indices_mode: "multi",
   types_mode: "multi",
   data_autocomplete_rules: {
      "$TYPE$": {
         __template: {
            properties: {
               "FIELD": {}
            }
         },
         "_parent": {
            __template: {
               "type": ""
            },
            "type": "$TYPE$"
         },
         "index_analyzer": "standard",
         "search_analyzer": "standard",
         "analyzer": "standard",
         "dynamic_date_formats": ["yyyy-MM-dd"],
         "date_detection": { __one_of: [ true, false ]},
         "numeric_detection": { __one_of: [ true, false ]},
         "properties": {
            "*": {
               type: { __one_of: ["string", "float", "double", "byte", "short", "integer", "long", "date", "boolean",
                  "binary", "object", "nested", "multi_field"]},

               // strings
               index_name: "",
               store: { __one_of: ["no", "yes"]},
               index: { __one_of: ["analyzed", "not_analyzed", "no"]},
               term_vector: { __one_of: ["no", "yes", "with_offsets", "with_positions", "with_positions_offsets"]},
               boost: 1.0,
               null_value: "",
               omit_norms: { __one_of: [ true, false]},
               index_options: { __one_of: [ "docs", "freqs", "positions"]},
               analyzer: "standard",
               index_analyzer: "standard",
               search_analyzer: "standard",
               include_in_all: { __one_of: [ false, true]},
               ignore_above: 10,
               position_offset_gap: 0,

               // numeric
               precision_step: 4,
               ignore_malformed: { __one_of: [ true, false]},

               // dates
               format: { __one_of: [ "basic_date", "basic_date_time", "basic_date_time_no_millis",
                  "basic_ordinal_date", "basic_ordinal_date_time", "basic_ordinal_date_time_no_millis",
                  "basic_time", "basic_time_no_millis", "basic_t_time", "basic_t_time_no_millis",
                  "basic_week_date", "basic_week_date_time", "basic_week_date_time_no_millis",
                  "date", "date_hour", "date_hour_minute", "date_hour_minute_second", "date_hour_minute_second_fraction",
                  "date_hour_minute_second_millis", "date_optional_time", "date_time", "date_time_no_millis",
                  "hour", "hour_minute", "hour_minute_second", "hour_minute_second_fraction", "hour_minute_second_millis",
                  "ordinal_date", "ordinal_date_time", "ordinal_date_time_no_millis", "time", "time_no_millis",
                  "t_time", "t_time_no_millis", "week_date", "week_date_time", "weekDateTimeNoMillis", "week_year",
                  "weekyearWeek", "weekyearWeekDay", "year", "year_month", "year_month_day"]},

               fielddata: {
                  filter: {
                     regex: "",
                     frequency: {
                        min: 0.001,
                        max: 0.1,
                        min_segment_size: 500
                     }
                  }
               },
               postings_format: { __one_of: ["direct", "memory", "pulsing", "bloom_default", "bloom_pulsing", "default"]},
               similarity: { __one_of: [ "default", "BM25" ]},

               // objects
               properties: {
                  __scope_link: "_mapping.$TYPE$.properties"
               },

               // multi_field
               path: { __one_of: [ "just_name", "full"]},
               fields: {
                  "*": {
                     __scope_link: "_mapping.$TYPE$.properties.$FIELD$"
                  }
               }
            }


         }
      }
   }
});
