define(function () {
  'use strict';

  return function init(kb) {
    kb.addEndpointDescription('_settings', {
      match: /_settings/,
      methods: ['GET', 'PUT'],
      endpoint_autocomplete: ['_settings'],
      indices_mode: 'multi',
      types_mode: 'none',
      doc_id_mode: 'none',
      data_autocomplete_rules: {
        index: {
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
          }

        }
      }
    });
  };

});