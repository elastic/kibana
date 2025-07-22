/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SpecDefinitionsService } from '../../../services';
import { BOOLEAN } from './shared';

export const settings = (specService: SpecDefinitionsService) => {
  specService.addEndpointDescription('put_settings', {
    data_autocomplete_rules: {
      number_of_replicas: 1,
      term_index_interval: 32,
      term_index_divisor: 1,
      'translog.flush_threshold_ops': 5000,
      'translog.flush_threshold_period': '30m',
      'translog.disable_flush': BOOLEAN,
      'cache.filter.max_size': '2gb',
      'cache.filter.expire': '2h',
      'gateway.snapshot_interval': '10s',
      'index.routing': {
        allocation: {
          enable: {
            __one_of: ['all', 'primaries', 'new_primaries', 'none'],
          },
          include: {
            _name: '',
            _tier: '',
            ml: '',
            ml_box_id: '',
            ml_box_type: '',
          },
          exclude: {
            _name: '',
            _tier: '',
            ml: '',
            ml_box_id: '',
            ml_box_type: '',
          },
          require: {
            _name: '',
            _tier: '',
            ml: '',
            ml_box_id: '',
            ml_box_type: '',
          },
          total_shards_per_node: -1,
        },
      },
      analysis: {
        analyzer: {},
        tokenizer: {},
        filter: {},
        char_filter: {},
        normalizer: {},
      },
      data_path: 'path',
      'index.codec': {
        __one_of: ['default', 'best_compression', 'lucene_default'],
      },
      'index.number_of_shards': 1,
      'index.number_of_routing_shards': 30,
      'index.mode': {
        __one_of: ['standard', 'logsdb', 'time_series', 'lookup'],
      },
      'index.routing_partition_size': 1,
      'index.soft_deletes.enabled': BOOLEAN,
      'index.soft_deletes.retention_lease.period': '12h',
      'index.load_fixed_bitset_filters_eagerly': BOOLEAN,
      'index.hidden': BOOLEAN,
      'index.auto_expand_replicas': 'false',
      'index.search.idle.after': '30s',
      'index.refresh_interval': '1s',
      'index.max_result_window': 10000,
      'index.max_inner_result_window': 100,
      'index.max_rescore_window': 10000,
      'index.max_docvalue_fields_search': 100,
      'index.max_script_fields': 32,
      'index.max_ngram_diff': 1,
      'index.max_shingle_diff': 3,
      'index.blocks.read_only': BOOLEAN,
      'index.blocks.read_only_allow_delete': BOOLEAN,
      'index.blocks.read': BOOLEAN,
      'index.blocks.write': BOOLEAN,
      'index.blocks.metadata': BOOLEAN,
      'index.max_refresh_listeners': 1000,
      'index.analyze.max_token_count': 10000,
      'index.highlight.max_analyzed_offset': 1000000,
      'index.max_terms_count': 65536,
      'index.mapping.coerce': BOOLEAN,
      'index.mapping.dynamic': BOOLEAN,
      'index.mapping.nested_fields.limit': 50,
      'index.mapping.nested_objects.limit': 10000,
      'index.mapping.depth.limit': 20,
      'index.mapping.total_fields.limit': 1000,
      'index.mapping.ignore_malformed': BOOLEAN,
      'index.mapping.meta': {},
      'index.store.type': {
        __one_of: ['fs', 'hybridfs'],
      },
      'index.store.preload': [],
      'index.store.fs.fs_lock': {
        __one_of: ['native', 'simple'],
      },
      'index.store.fs.buffer_size': '16kb',
      'index.translog.durability': {
        __one_of: ['request', 'async'],
      },
      'index.translog.flush_threshold_size': '512mb',
      'index.translog.sync_interval': '5s',
      'index.translog.retention.size': '512mb',
      'index.translog.retention.age': '12h',
      'index.merge.scheduler.max_thread_count': 1,
      'index.merge.scheduler.auto_throttle': BOOLEAN,
      'index.merge.policy.floor_segment': '2mb',
      'index.merge.policy.max_merge_at_once': 10,
      'index.merge.policy.max_merge_at_once_explicit': 30,
      'index.merge.policy.max_merged_segment': '5gb',
      'index.merge.policy.segments_per_tier': 10,
      'index.merge.policy.deletes_pct_allowed': 20.0,
      'index.merge.policy.expunge_deletes_allowed': 10.0,
      'index.merge.policy.reclaim_deletes_weight': 2.0,
      'index.similarity.default.type': {
        __one_of: ['BM25', 'DFR', 'IB', 'LMDirichlet', 'LMJelinekMercer', 'scripted'],
      },
      'index.search.slowlog.threshold.query.warn': '-1',
      'index.search.slowlog.threshold.query.info': '-1',
      'index.search.slowlog.threshold.query.debug': '-1',
      'index.search.slowlog.threshold.query.trace': '-1',
      'index.search.slowlog.threshold.fetch.warn': '-1',
      'index.search.slowlog.threshold.fetch.info': '-1',
      'index.search.slowlog.threshold.fetch.debug': '-1',
      'index.search.slowlog.threshold.fetch.trace': '-1',
      'index.search.slowlog.level': {
        __one_of: ['TRACE', 'DEBUG', 'INFO', 'WARN'],
      },
      'index.indexing.slowlog.threshold.index.warn': '-1',
      'index.indexing.slowlog.threshold.index.info': '-1',
      'index.indexing.slowlog.threshold.index.debug': '-1',
      'index.indexing.slowlog.threshold.index.trace': '-1',
      'index.indexing.slowlog.level': {
        __one_of: ['TRACE', 'DEBUG', 'INFO', 'WARN'],
      },
      'index.indexing.slowlog.source': 1000,
      'index.indexing.slowlog.reformat': BOOLEAN,
      'index.gc_deletes': '60s',
      'index.default_pipeline': '_none',
      'index.final_pipeline': '_none',
      'index.lifecycle.name': '',
      'index.lifecycle.rollover_alias': '',
      'index.lifecycle.parse_origination_date': BOOLEAN,
      'index.lifecycle.origination_date': '',
      'index.lifecycle.indexing_complete': BOOLEAN,
      'index.priority': 1,
      'index.recovery.initial_shards': {
        __one_of: ['quorum', 'quorum-1', 'half', 'full', 'full-1'],
      },
    },
  });
};
