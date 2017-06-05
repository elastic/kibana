module.exports = function (api) {

  api.addEndpointDescription('_get_settings', {
    patterns: [
      "{indices}/_settings",
      "_settings"
    ],
    url_params: {
      flat_settings: "__flag__"
    }
  });
  api.addEndpointDescription('_put_settings', {
    methods: ['PUT'],
    patterns: [
      "{indices}/_settings",
      "_settings"
    ],
    data_autocomplete_rules: {
      refresh_interval: '1s',
      number_of_shards: 5,
      number_of_replicas: 1,
      'blocks.read_only': {
        __one_of: [false, true]
      },
      'blocks.read': {
        __one_of: [true, false]
      },
      'blocks.write': {
        __one_of: [true, false]
      },
      'blocks.metadata': {
        __one_of: [true, false]
      },
      term_index_interval: 32,
      term_index_divisor: 1,
      'translog.flush_threshold_ops': 5000,
      'translog.flush_threshold_size': '200mb',
      'translog.flush_threshold_period': '30m',
      'translog.disable_flush': {
        __one_of: [true, false]
      },
      'cache.filter.max_size': '2gb',
      'cache.filter.expire': '2h',
      'gateway.snapshot_interval': '10s',
      routing: {
        allocation: {
          include: {
            tag: ''
          },
          exclude: {
            tag: ''
          },
          require: {
            tag: ''
          },
          total_shards_per_node: -1
        }
      },
      'recovery.initial_shards': {
        __one_of: ['quorum', 'quorum-1', 'half', 'full', 'full-1']
      },
      'ttl.disable_purge': {
        __one_of: [true, false]
      },
      analysis: {
        analyzer: {},
        tokenizer: {},
        filter: {},
        char_filter: {}
      },
      'cache.query.enable': {
        __one_of: [true, false]
      },
      shadow_replicas: {
        __one_of: [true, false]
      },
      shared_filesystem: {
        __one_of: [true, false]
      },
      data_path: 'path',
      codec: {
        __one_of: ['default', 'best_compression', 'lucene_default']
      }
    }
  });
};
