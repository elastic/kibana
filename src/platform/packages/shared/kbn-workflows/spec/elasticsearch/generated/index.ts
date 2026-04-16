/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * This file contains Elasticsearch connector definitions generated from elasticsearch-specification repository (https://github.com/elastic/elasticsearch-specification/commit/977d15b).
 * Generated at: 2026-04-16T07:49:57.596Z
 * Source: elasticsearch-specification repository (97 APIs)
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

// import contracts from individual files
import { BULK_CONTRACT } from './elasticsearch.bulk.gen';
import { CAT_ALIASES_CONTRACT } from './elasticsearch.cat_aliases.gen';
import { CAT_ALLOCATION_CONTRACT } from './elasticsearch.cat_allocation.gen';
import { CAT_COUNT_CONTRACT } from './elasticsearch.cat_count.gen';
import { CAT_HEALTH_CONTRACT } from './elasticsearch.cat_health.gen';
import { CAT_INDICES_CONTRACT } from './elasticsearch.cat_indices.gen';
import { CAT_NODES_CONTRACT } from './elasticsearch.cat_nodes.gen';
import { CAT_PLUGINS_CONTRACT } from './elasticsearch.cat_plugins.gen';
import { CAT_RECOVERY_CONTRACT } from './elasticsearch.cat_recovery.gen';
import { CAT_SEGMENTS_CONTRACT } from './elasticsearch.cat_segments.gen';
import { CAT_SHARDS_CONTRACT } from './elasticsearch.cat_shards.gen';
import { CAT_TASKS_CONTRACT } from './elasticsearch.cat_tasks.gen';
import { CAT_TEMPLATES_CONTRACT } from './elasticsearch.cat_templates.gen';
import { CAT_THREAD_POOL_CONTRACT } from './elasticsearch.cat_thread_pool.gen';
import { CLEAR_SCROLL_CONTRACT } from './elasticsearch.clear_scroll.gen';
import { CLOSE_POINT_IN_TIME_CONTRACT } from './elasticsearch.close_point_in_time.gen';
import { CLUSTER_ALLOCATION_EXPLAIN_CONTRACT } from './elasticsearch.cluster_allocation_explain.gen';
import { CLUSTER_GET_COMPONENT_TEMPLATE_CONTRACT } from './elasticsearch.cluster_get_component_template.gen';
import { CLUSTER_GET_SETTINGS_CONTRACT } from './elasticsearch.cluster_get_settings.gen';
import { CLUSTER_HEALTH_CONTRACT } from './elasticsearch.cluster_health.gen';
import { CLUSTER_PUT_COMPONENT_TEMPLATE_CONTRACT } from './elasticsearch.cluster_put_component_template.gen';
import { CLUSTER_PUT_SETTINGS_CONTRACT } from './elasticsearch.cluster_put_settings.gen';
import { CLUSTER_REROUTE_CONTRACT } from './elasticsearch.cluster_reroute.gen';
import { CLUSTER_STATE_CONTRACT } from './elasticsearch.cluster_state.gen';
import { CLUSTER_STATS_CONTRACT } from './elasticsearch.cluster_stats.gen';
import { COUNT_CONTRACT } from './elasticsearch.count.gen';
import { CREATE_CONTRACT } from './elasticsearch.create.gen';
import { DELETE_CONTRACT } from './elasticsearch.delete.gen';
import { DELETE_BY_QUERY_CONTRACT } from './elasticsearch.delete_by_query.gen';
import { ESQL_QUERY_CONTRACT } from './elasticsearch.esql_query.gen';
import { EXISTS_CONTRACT } from './elasticsearch.exists.gen';
import { FIELD_CAPS_CONTRACT } from './elasticsearch.field_caps.gen';
import { GET_CONTRACT } from './elasticsearch.get.gen';
import { INDEX_CONTRACT } from './elasticsearch.index.gen';
import { INDICES_ANALYZE_CONTRACT } from './elasticsearch.indices_analyze.gen';
import { INDICES_CLEAR_CACHE_CONTRACT } from './elasticsearch.indices_clear_cache.gen';
import { INDICES_CLONE_CONTRACT } from './elasticsearch.indices_clone.gen';
import { INDICES_CLOSE_CONTRACT } from './elasticsearch.indices_close.gen';
import { INDICES_CREATE_CONTRACT } from './elasticsearch.indices_create.gen';
import { INDICES_CREATE_DATA_STREAM_CONTRACT } from './elasticsearch.indices_create_data_stream.gen';
import { INDICES_DELETE_CONTRACT } from './elasticsearch.indices_delete.gen';
import { INDICES_DELETE_ALIAS_CONTRACT } from './elasticsearch.indices_delete_alias.gen';
import { INDICES_DELETE_DATA_STREAM_CONTRACT } from './elasticsearch.indices_delete_data_stream.gen';
import { INDICES_DELETE_INDEX_TEMPLATE_CONTRACT } from './elasticsearch.indices_delete_index_template.gen';
import { INDICES_DELETE_TEMPLATE_CONTRACT } from './elasticsearch.indices_delete_template.gen';
import { INDICES_EXISTS_CONTRACT } from './elasticsearch.indices_exists.gen';
import { INDICES_EXISTS_ALIAS_CONTRACT } from './elasticsearch.indices_exists_alias.gen';
import { INDICES_FLUSH_CONTRACT } from './elasticsearch.indices_flush.gen';
import { INDICES_FORCEMERGE_CONTRACT } from './elasticsearch.indices_forcemerge.gen';
import { INDICES_GET_CONTRACT } from './elasticsearch.indices_get.gen';
import { INDICES_GET_ALIAS_CONTRACT } from './elasticsearch.indices_get_alias.gen';
import { INDICES_GET_DATA_STREAM_CONTRACT } from './elasticsearch.indices_get_data_stream.gen';
import { INDICES_GET_FIELD_MAPPING_CONTRACT } from './elasticsearch.indices_get_field_mapping.gen';
import { INDICES_GET_INDEX_TEMPLATE_CONTRACT } from './elasticsearch.indices_get_index_template.gen';
import { INDICES_GET_MAPPING_CONTRACT } from './elasticsearch.indices_get_mapping.gen';
import { INDICES_GET_SETTINGS_CONTRACT } from './elasticsearch.indices_get_settings.gen';
import { INDICES_GET_TEMPLATE_CONTRACT } from './elasticsearch.indices_get_template.gen';
import { INDICES_OPEN_CONTRACT } from './elasticsearch.indices_open.gen';
import { INDICES_PUT_ALIAS_CONTRACT } from './elasticsearch.indices_put_alias.gen';
import { INDICES_PUT_INDEX_TEMPLATE_CONTRACT } from './elasticsearch.indices_put_index_template.gen';
import { INDICES_PUT_MAPPING_CONTRACT } from './elasticsearch.indices_put_mapping.gen';
import { INDICES_PUT_SETTINGS_CONTRACT } from './elasticsearch.indices_put_settings.gen';
import { INDICES_PUT_TEMPLATE_CONTRACT } from './elasticsearch.indices_put_template.gen';
import { INDICES_RECOVERY_CONTRACT } from './elasticsearch.indices_recovery.gen';
import { INDICES_REFRESH_CONTRACT } from './elasticsearch.indices_refresh.gen';
import { INDICES_RESOLVE_INDEX_CONTRACT } from './elasticsearch.indices_resolve_index.gen';
import { INDICES_ROLLOVER_CONTRACT } from './elasticsearch.indices_rollover.gen';
import { INDICES_SEGMENTS_CONTRACT } from './elasticsearch.indices_segments.gen';
import { INDICES_SHARD_STORES_CONTRACT } from './elasticsearch.indices_shard_stores.gen';
import { INDICES_SHRINK_CONTRACT } from './elasticsearch.indices_shrink.gen';
import { INDICES_SPLIT_CONTRACT } from './elasticsearch.indices_split.gen';
import { INDICES_STATS_CONTRACT } from './elasticsearch.indices_stats.gen';
import { INDICES_UPDATE_ALIASES_CONTRACT } from './elasticsearch.indices_update_aliases.gen';
import { INDICES_VALIDATE_QUERY_CONTRACT } from './elasticsearch.indices_validate_query.gen';
import { INFO_CONTRACT } from './elasticsearch.info.gen';
import { INGEST_DELETE_PIPELINE_CONTRACT } from './elasticsearch.ingest_delete_pipeline.gen';
import { INGEST_GET_PIPELINE_CONTRACT } from './elasticsearch.ingest_get_pipeline.gen';
import { INGEST_PUT_PIPELINE_CONTRACT } from './elasticsearch.ingest_put_pipeline.gen';
import { INGEST_SIMULATE_CONTRACT } from './elasticsearch.ingest_simulate.gen';
import { MGET_CONTRACT } from './elasticsearch.mget.gen';
import { ML_GET_DATAFEEDS_CONTRACT } from './elasticsearch.ml_get_datafeeds.gen';
import { ML_GET_JOBS_CONTRACT } from './elasticsearch.ml_get_jobs.gen';
import { ML_GET_TRAINED_MODELS_CONTRACT } from './elasticsearch.ml_get_trained_models.gen';
import { MSEARCH_CONTRACT } from './elasticsearch.msearch.gen';
import { NODES_INFO_CONTRACT } from './elasticsearch.nodes_info.gen';
import { NODES_STATS_CONTRACT } from './elasticsearch.nodes_stats.gen';
import { OPEN_POINT_IN_TIME_CONTRACT } from './elasticsearch.open_point_in_time.gen';
import { PING_CONTRACT } from './elasticsearch.ping.gen';
import { REINDEX_CONTRACT } from './elasticsearch.reindex.gen';
import { SCROLL_CONTRACT } from './elasticsearch.scroll.gen';
import { SEARCH_CONTRACT } from './elasticsearch.search.gen';
import { TASKS_CANCEL_CONTRACT } from './elasticsearch.tasks_cancel.gen';
import { TASKS_GET_CONTRACT } from './elasticsearch.tasks_get.gen';
import { TASKS_LIST_CONTRACT } from './elasticsearch.tasks_list.gen';
import { TERMS_ENUM_CONTRACT } from './elasticsearch.terms_enum.gen';
import { UPDATE_CONTRACT } from './elasticsearch.update.gen';
import { UPDATE_BY_QUERY_CONTRACT } from './elasticsearch.update_by_query.gen';
import type { InternalConnectorContract } from '../../../types/latest';

// export contracts
export const GENERATED_ELASTICSEARCH_CONNECTORS: InternalConnectorContract[] = [
  BULK_CONTRACT,
  CAT_ALIASES_CONTRACT,
  CAT_ALLOCATION_CONTRACT,
  CAT_COUNT_CONTRACT,
  CAT_HEALTH_CONTRACT,
  CAT_INDICES_CONTRACT,
  CAT_NODES_CONTRACT,
  CAT_PLUGINS_CONTRACT,
  CAT_RECOVERY_CONTRACT,
  CAT_SEGMENTS_CONTRACT,
  CAT_SHARDS_CONTRACT,
  CAT_TASKS_CONTRACT,
  CAT_TEMPLATES_CONTRACT,
  CAT_THREAD_POOL_CONTRACT,
  CLEAR_SCROLL_CONTRACT,
  CLOSE_POINT_IN_TIME_CONTRACT,
  CLUSTER_ALLOCATION_EXPLAIN_CONTRACT,
  CLUSTER_GET_COMPONENT_TEMPLATE_CONTRACT,
  CLUSTER_GET_SETTINGS_CONTRACT,
  CLUSTER_HEALTH_CONTRACT,
  CLUSTER_PUT_COMPONENT_TEMPLATE_CONTRACT,
  CLUSTER_PUT_SETTINGS_CONTRACT,
  CLUSTER_REROUTE_CONTRACT,
  CLUSTER_STATE_CONTRACT,
  CLUSTER_STATS_CONTRACT,
  COUNT_CONTRACT,
  CREATE_CONTRACT,
  DELETE_CONTRACT,
  DELETE_BY_QUERY_CONTRACT,
  ESQL_QUERY_CONTRACT,
  EXISTS_CONTRACT,
  FIELD_CAPS_CONTRACT,
  GET_CONTRACT,
  INDEX_CONTRACT,
  INDICES_ANALYZE_CONTRACT,
  INDICES_CLEAR_CACHE_CONTRACT,
  INDICES_CLONE_CONTRACT,
  INDICES_CLOSE_CONTRACT,
  INDICES_CREATE_CONTRACT,
  INDICES_CREATE_DATA_STREAM_CONTRACT,
  INDICES_DELETE_CONTRACT,
  INDICES_DELETE_ALIAS_CONTRACT,
  INDICES_DELETE_DATA_STREAM_CONTRACT,
  INDICES_DELETE_INDEX_TEMPLATE_CONTRACT,
  INDICES_DELETE_TEMPLATE_CONTRACT,
  INDICES_EXISTS_CONTRACT,
  INDICES_EXISTS_ALIAS_CONTRACT,
  INDICES_FLUSH_CONTRACT,
  INDICES_FORCEMERGE_CONTRACT,
  INDICES_GET_CONTRACT,
  INDICES_GET_ALIAS_CONTRACT,
  INDICES_GET_DATA_STREAM_CONTRACT,
  INDICES_GET_FIELD_MAPPING_CONTRACT,
  INDICES_GET_INDEX_TEMPLATE_CONTRACT,
  INDICES_GET_MAPPING_CONTRACT,
  INDICES_GET_SETTINGS_CONTRACT,
  INDICES_GET_TEMPLATE_CONTRACT,
  INDICES_OPEN_CONTRACT,
  INDICES_PUT_ALIAS_CONTRACT,
  INDICES_PUT_INDEX_TEMPLATE_CONTRACT,
  INDICES_PUT_MAPPING_CONTRACT,
  INDICES_PUT_SETTINGS_CONTRACT,
  INDICES_PUT_TEMPLATE_CONTRACT,
  INDICES_RECOVERY_CONTRACT,
  INDICES_REFRESH_CONTRACT,
  INDICES_RESOLVE_INDEX_CONTRACT,
  INDICES_ROLLOVER_CONTRACT,
  INDICES_SEGMENTS_CONTRACT,
  INDICES_SHARD_STORES_CONTRACT,
  INDICES_SHRINK_CONTRACT,
  INDICES_SPLIT_CONTRACT,
  INDICES_STATS_CONTRACT,
  INDICES_UPDATE_ALIASES_CONTRACT,
  INDICES_VALIDATE_QUERY_CONTRACT,
  INFO_CONTRACT,
  INGEST_DELETE_PIPELINE_CONTRACT,
  INGEST_GET_PIPELINE_CONTRACT,
  INGEST_PUT_PIPELINE_CONTRACT,
  INGEST_SIMULATE_CONTRACT,
  MGET_CONTRACT,
  ML_GET_DATAFEEDS_CONTRACT,
  ML_GET_JOBS_CONTRACT,
  ML_GET_TRAINED_MODELS_CONTRACT,
  MSEARCH_CONTRACT,
  NODES_INFO_CONTRACT,
  NODES_STATS_CONTRACT,
  OPEN_POINT_IN_TIME_CONTRACT,
  PING_CONTRACT,
  REINDEX_CONTRACT,
  SCROLL_CONTRACT,
  SEARCH_CONTRACT,
  TASKS_CANCEL_CONTRACT,
  TASKS_GET_CONTRACT,
  TASKS_LIST_CONTRACT,
  TERMS_ENUM_CONTRACT,
  UPDATE_CONTRACT,
  UPDATE_BY_QUERY_CONTRACT,
];
