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
 * This file contains Elasticsearch connector definitions generated from elasticsearch-specification repository.
 * Generated at: 2025-11-27T07:43:24.852Z
 * Source: elasticsearch-specification repository (577 APIs)
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

// import contracts from individual files
import { ASYNC_SEARCH_DELETE_CONTRACT } from './elasticsearch.async_search.delete.gen';
import { ASYNC_SEARCH_GET_CONTRACT } from './elasticsearch.async_search.get.gen';
import { ASYNC_SEARCH_STATUS_CONTRACT } from './elasticsearch.async_search.status.gen';
import { ASYNC_SEARCH_SUBMIT_CONTRACT } from './elasticsearch.async_search.submit.gen';
import { AUTOSCALING_DELETE_AUTOSCALING_POLICY_CONTRACT } from './elasticsearch.autoscaling.delete_autoscaling_policy.gen';
import { AUTOSCALING_GET_AUTOSCALING_CAPACITY_CONTRACT } from './elasticsearch.autoscaling.get_autoscaling_capacity.gen';
import { AUTOSCALING_GET_AUTOSCALING_POLICY_CONTRACT } from './elasticsearch.autoscaling.get_autoscaling_policy.gen';
import { AUTOSCALING_PUT_AUTOSCALING_POLICY_CONTRACT } from './elasticsearch.autoscaling.put_autoscaling_policy.gen';
import { BULK_CONTRACT } from './elasticsearch.bulk.gen';
import { CAPABILITIES_CONTRACT } from './elasticsearch.capabilities.gen';
import { CAT_ALIASES_CONTRACT } from './elasticsearch.cat.aliases.gen';
import { CAT_ALLOCATION_CONTRACT } from './elasticsearch.cat.allocation.gen';
import { CAT_CIRCUIT_BREAKER_CONTRACT } from './elasticsearch.cat.circuit_breaker.gen';
import { CAT_COMPONENT_TEMPLATES_CONTRACT } from './elasticsearch.cat.component_templates.gen';
import { CAT_COUNT_CONTRACT } from './elasticsearch.cat.count.gen';
import { CAT_FIELDDATA_CONTRACT } from './elasticsearch.cat.fielddata.gen';
import { CAT_HEALTH_CONTRACT } from './elasticsearch.cat.health.gen';
import { CAT_HELP_CONTRACT } from './elasticsearch.cat.help.gen';
import { CAT_INDICES_CONTRACT } from './elasticsearch.cat.indices.gen';
import { CAT_MASTER_CONTRACT } from './elasticsearch.cat.master.gen';
import { CAT_ML_DATA_FRAME_ANALYTICS_CONTRACT } from './elasticsearch.cat.ml_data_frame_analytics.gen';
import { CAT_ML_DATAFEEDS_CONTRACT } from './elasticsearch.cat.ml_datafeeds.gen';
import { CAT_ML_JOBS_CONTRACT } from './elasticsearch.cat.ml_jobs.gen';
import { CAT_ML_TRAINED_MODELS_CONTRACT } from './elasticsearch.cat.ml_trained_models.gen';
import { CAT_NODEATTRS_CONTRACT } from './elasticsearch.cat.nodeattrs.gen';
import { CAT_NODES_CONTRACT } from './elasticsearch.cat.nodes.gen';
import { CAT_PENDING_TASKS_CONTRACT } from './elasticsearch.cat.pending_tasks.gen';
import { CAT_PLUGINS_CONTRACT } from './elasticsearch.cat.plugins.gen';
import { CAT_RECOVERY_CONTRACT } from './elasticsearch.cat.recovery.gen';
import { CAT_REPOSITORIES_CONTRACT } from './elasticsearch.cat.repositories.gen';
import { CAT_SEGMENTS_CONTRACT } from './elasticsearch.cat.segments.gen';
import { CAT_SHARDS_CONTRACT } from './elasticsearch.cat.shards.gen';
import { CAT_SNAPSHOTS_CONTRACT } from './elasticsearch.cat.snapshots.gen';
import { CAT_TASKS_CONTRACT } from './elasticsearch.cat.tasks.gen';
import { CAT_TEMPLATES_CONTRACT } from './elasticsearch.cat.templates.gen';
import { CAT_THREAD_POOL_CONTRACT } from './elasticsearch.cat.thread_pool.gen';
import { CAT_TRANSFORMS_CONTRACT } from './elasticsearch.cat.transforms.gen';
import { CCR_DELETE_AUTO_FOLLOW_PATTERN_CONTRACT } from './elasticsearch.ccr.delete_auto_follow_pattern.gen';
import { CCR_FOLLOW_CONTRACT } from './elasticsearch.ccr.follow.gen';
import { CCR_FOLLOW_INFO_CONTRACT } from './elasticsearch.ccr.follow_info.gen';
import { CCR_FOLLOW_STATS_CONTRACT } from './elasticsearch.ccr.follow_stats.gen';
import { CCR_FORGET_FOLLOWER_CONTRACT } from './elasticsearch.ccr.forget_follower.gen';
import { CCR_GET_AUTO_FOLLOW_PATTERN_CONTRACT } from './elasticsearch.ccr.get_auto_follow_pattern.gen';
import { CCR_PAUSE_AUTO_FOLLOW_PATTERN_CONTRACT } from './elasticsearch.ccr.pause_auto_follow_pattern.gen';
import { CCR_PAUSE_FOLLOW_CONTRACT } from './elasticsearch.ccr.pause_follow.gen';
import { CCR_PUT_AUTO_FOLLOW_PATTERN_CONTRACT } from './elasticsearch.ccr.put_auto_follow_pattern.gen';
import { CCR_RESUME_AUTO_FOLLOW_PATTERN_CONTRACT } from './elasticsearch.ccr.resume_auto_follow_pattern.gen';
import { CCR_RESUME_FOLLOW_CONTRACT } from './elasticsearch.ccr.resume_follow.gen';
import { CCR_STATS_CONTRACT } from './elasticsearch.ccr.stats.gen';
import { CCR_UNFOLLOW_CONTRACT } from './elasticsearch.ccr.unfollow.gen';
import { CLEAR_SCROLL_CONTRACT } from './elasticsearch.clear_scroll.gen';
import { CLOSE_POINT_IN_TIME_CONTRACT } from './elasticsearch.close_point_in_time.gen';
import { CLUSTER_ALLOCATION_EXPLAIN_CONTRACT } from './elasticsearch.cluster.allocation_explain.gen';
import { CLUSTER_DELETE_COMPONENT_TEMPLATE_CONTRACT } from './elasticsearch.cluster.delete_component_template.gen';
import { CLUSTER_DELETE_VOTING_CONFIG_EXCLUSIONS_CONTRACT } from './elasticsearch.cluster.delete_voting_config_exclusions.gen';
import { CLUSTER_EXISTS_COMPONENT_TEMPLATE_CONTRACT } from './elasticsearch.cluster.exists_component_template.gen';
import { CLUSTER_GET_COMPONENT_TEMPLATE_CONTRACT } from './elasticsearch.cluster.get_component_template.gen';
import { CLUSTER_GET_SETTINGS_CONTRACT } from './elasticsearch.cluster.get_settings.gen';
import { CLUSTER_HEALTH_CONTRACT } from './elasticsearch.cluster.health.gen';
import { CLUSTER_INFO_CONTRACT } from './elasticsearch.cluster.info.gen';
import { CLUSTER_PENDING_TASKS_CONTRACT } from './elasticsearch.cluster.pending_tasks.gen';
import { CLUSTER_POST_VOTING_CONFIG_EXCLUSIONS_CONTRACT } from './elasticsearch.cluster.post_voting_config_exclusions.gen';
import { CLUSTER_PUT_COMPONENT_TEMPLATE_CONTRACT } from './elasticsearch.cluster.put_component_template.gen';
import { CLUSTER_PUT_SETTINGS_CONTRACT } from './elasticsearch.cluster.put_settings.gen';
import { CLUSTER_REMOTE_INFO_CONTRACT } from './elasticsearch.cluster.remote_info.gen';
import { CLUSTER_REROUTE_CONTRACT } from './elasticsearch.cluster.reroute.gen';
import { CLUSTER_STATE_CONTRACT } from './elasticsearch.cluster.state.gen';
import { CLUSTER_STATS_CONTRACT } from './elasticsearch.cluster.stats.gen';
import { CONNECTOR_CHECK_IN_CONTRACT } from './elasticsearch.connector.check_in.gen';
import { CONNECTOR_DELETE_CONTRACT } from './elasticsearch.connector.delete.gen';
import { CONNECTOR_GET_CONTRACT } from './elasticsearch.connector.get.gen';
import { CONNECTOR_LAST_SYNC_CONTRACT } from './elasticsearch.connector.last_sync.gen';
import { CONNECTOR_LIST_CONTRACT } from './elasticsearch.connector.list.gen';
import { CONNECTOR_POST_CONTRACT } from './elasticsearch.connector.post.gen';
import { CONNECTOR_PUT_CONTRACT } from './elasticsearch.connector.put.gen';
import { CONNECTOR_SECRET_DELETE_CONTRACT } from './elasticsearch.connector.secret_delete.gen';
import { CONNECTOR_SECRET_GET_CONTRACT } from './elasticsearch.connector.secret_get.gen';
import { CONNECTOR_SECRET_POST_CONTRACT } from './elasticsearch.connector.secret_post.gen';
import { CONNECTOR_SECRET_PUT_CONTRACT } from './elasticsearch.connector.secret_put.gen';
import { CONNECTOR_SYNC_JOB_CANCEL_CONTRACT } from './elasticsearch.connector.sync_job_cancel.gen';
import { CONNECTOR_SYNC_JOB_CHECK_IN_CONTRACT } from './elasticsearch.connector.sync_job_check_in.gen';
import { CONNECTOR_SYNC_JOB_CLAIM_CONTRACT } from './elasticsearch.connector.sync_job_claim.gen';
import { CONNECTOR_SYNC_JOB_DELETE_CONTRACT } from './elasticsearch.connector.sync_job_delete.gen';
import { CONNECTOR_SYNC_JOB_ERROR_CONTRACT } from './elasticsearch.connector.sync_job_error.gen';
import { CONNECTOR_SYNC_JOB_GET_CONTRACT } from './elasticsearch.connector.sync_job_get.gen';
import { CONNECTOR_SYNC_JOB_LIST_CONTRACT } from './elasticsearch.connector.sync_job_list.gen';
import { CONNECTOR_SYNC_JOB_POST_CONTRACT } from './elasticsearch.connector.sync_job_post.gen';
import { CONNECTOR_SYNC_JOB_UPDATE_STATS_CONTRACT } from './elasticsearch.connector.sync_job_update_stats.gen';
import { CONNECTOR_UPDATE_ACTIVE_FILTERING_CONTRACT } from './elasticsearch.connector.update_active_filtering.gen';
import { CONNECTOR_UPDATE_API_KEY_ID_CONTRACT } from './elasticsearch.connector.update_api_key_id.gen';
import { CONNECTOR_UPDATE_CONFIGURATION_CONTRACT } from './elasticsearch.connector.update_configuration.gen';
import { CONNECTOR_UPDATE_ERROR_CONTRACT } from './elasticsearch.connector.update_error.gen';
import { CONNECTOR_UPDATE_FEATURES_CONTRACT } from './elasticsearch.connector.update_features.gen';
import { CONNECTOR_UPDATE_FILTERING_CONTRACT } from './elasticsearch.connector.update_filtering.gen';
import { CONNECTOR_UPDATE_FILTERING_VALIDATION_CONTRACT } from './elasticsearch.connector.update_filtering_validation.gen';
import { CONNECTOR_UPDATE_INDEX_NAME_CONTRACT } from './elasticsearch.connector.update_index_name.gen';
import { CONNECTOR_UPDATE_NAME_CONTRACT } from './elasticsearch.connector.update_name.gen';
import { CONNECTOR_UPDATE_NATIVE_CONTRACT } from './elasticsearch.connector.update_native.gen';
import { CONNECTOR_UPDATE_PIPELINE_CONTRACT } from './elasticsearch.connector.update_pipeline.gen';
import { CONNECTOR_UPDATE_SCHEDULING_CONTRACT } from './elasticsearch.connector.update_scheduling.gen';
import { CONNECTOR_UPDATE_SERVICE_TYPE_CONTRACT } from './elasticsearch.connector.update_service_type.gen';
import { CONNECTOR_UPDATE_STATUS_CONTRACT } from './elasticsearch.connector.update_status.gen';
import { COUNT_CONTRACT } from './elasticsearch.count.gen';
import { CREATE_CONTRACT } from './elasticsearch.create.gen';
import { DANGLING_INDICES_DELETE_DANGLING_INDEX_CONTRACT } from './elasticsearch.dangling_indices.delete_dangling_index.gen';
import { DANGLING_INDICES_IMPORT_DANGLING_INDEX_CONTRACT } from './elasticsearch.dangling_indices.import_dangling_index.gen';
import { DANGLING_INDICES_LIST_DANGLING_INDICES_CONTRACT } from './elasticsearch.dangling_indices.list_dangling_indices.gen';
import { DELETE_CONTRACT } from './elasticsearch.delete.gen';
import { DELETE_BY_QUERY_CONTRACT } from './elasticsearch.delete_by_query.gen';
import { DELETE_BY_QUERY_RETHROTTLE_CONTRACT } from './elasticsearch.delete_by_query_rethrottle.gen';
import { DELETE_SCRIPT_CONTRACT } from './elasticsearch.delete_script.gen';
import { ENRICH_DELETE_POLICY_CONTRACT } from './elasticsearch.enrich.delete_policy.gen';
import { ENRICH_EXECUTE_POLICY_CONTRACT } from './elasticsearch.enrich.execute_policy.gen';
import { ENRICH_GET_POLICY_CONTRACT } from './elasticsearch.enrich.get_policy.gen';
import { ENRICH_PUT_POLICY_CONTRACT } from './elasticsearch.enrich.put_policy.gen';
import { ENRICH_STATS_CONTRACT } from './elasticsearch.enrich.stats.gen';
import { EQL_DELETE_CONTRACT } from './elasticsearch.eql.delete.gen';
import { EQL_GET_CONTRACT } from './elasticsearch.eql.get.gen';
import { EQL_GET_STATUS_CONTRACT } from './elasticsearch.eql.get_status.gen';
import { EQL_SEARCH_CONTRACT } from './elasticsearch.eql.search.gen';
import { ESQL_ASYNC_QUERY_CONTRACT } from './elasticsearch.esql.async_query.gen';
import { ESQL_ASYNC_QUERY_DELETE_CONTRACT } from './elasticsearch.esql.async_query_delete.gen';
import { ESQL_ASYNC_QUERY_GET_CONTRACT } from './elasticsearch.esql.async_query_get.gen';
import { ESQL_ASYNC_QUERY_STOP_CONTRACT } from './elasticsearch.esql.async_query_stop.gen';
import { ESQL_GET_QUERY_CONTRACT } from './elasticsearch.esql.get_query.gen';
import { ESQL_LIST_QUERIES_CONTRACT } from './elasticsearch.esql.list_queries.gen';
import { ESQL_QUERY_CONTRACT } from './elasticsearch.esql.query.gen';
import { EXISTS_CONTRACT } from './elasticsearch.exists.gen';
import { EXISTS_SOURCE_CONTRACT } from './elasticsearch.exists_source.gen';
import { EXPLAIN_CONTRACT } from './elasticsearch.explain.gen';
import { FEATURES_GET_FEATURES_CONTRACT } from './elasticsearch.features.get_features.gen';
import { FEATURES_RESET_FEATURES_CONTRACT } from './elasticsearch.features.reset_features.gen';
import { FIELD_CAPS_CONTRACT } from './elasticsearch.field_caps.gen';
import { FLEET_DELETE_SECRET_CONTRACT } from './elasticsearch.fleet.delete_secret.gen';
import { FLEET_GET_SECRET_CONTRACT } from './elasticsearch.fleet.get_secret.gen';
import { FLEET_GLOBAL_CHECKPOINTS_CONTRACT } from './elasticsearch.fleet.global_checkpoints.gen';
import { FLEET_MSEARCH_CONTRACT } from './elasticsearch.fleet.msearch.gen';
import { FLEET_POST_SECRET_CONTRACT } from './elasticsearch.fleet.post_secret.gen';
import { FLEET_SEARCH_CONTRACT } from './elasticsearch.fleet.search.gen';
import { GET_CONTRACT } from './elasticsearch.get.gen';
import { GET_SCRIPT_CONTRACT } from './elasticsearch.get_script.gen';
import { GET_SCRIPT_CONTEXT_CONTRACT } from './elasticsearch.get_script_context.gen';
import { GET_SCRIPT_LANGUAGES_CONTRACT } from './elasticsearch.get_script_languages.gen';
import { GET_SOURCE_CONTRACT } from './elasticsearch.get_source.gen';
import { GRAPH_EXPLORE_CONTRACT } from './elasticsearch.graph.explore.gen';
import { HEALTH_REPORT_CONTRACT } from './elasticsearch.health_report.gen';
import { ILM_DELETE_LIFECYCLE_CONTRACT } from './elasticsearch.ilm.delete_lifecycle.gen';
import { ILM_EXPLAIN_LIFECYCLE_CONTRACT } from './elasticsearch.ilm.explain_lifecycle.gen';
import { ILM_GET_LIFECYCLE_CONTRACT } from './elasticsearch.ilm.get_lifecycle.gen';
import { ILM_GET_STATUS_CONTRACT } from './elasticsearch.ilm.get_status.gen';
import { ILM_MIGRATE_TO_DATA_TIERS_CONTRACT } from './elasticsearch.ilm.migrate_to_data_tiers.gen';
import { ILM_MOVE_TO_STEP_CONTRACT } from './elasticsearch.ilm.move_to_step.gen';
import { ILM_PUT_LIFECYCLE_CONTRACT } from './elasticsearch.ilm.put_lifecycle.gen';
import { ILM_REMOVE_POLICY_CONTRACT } from './elasticsearch.ilm.remove_policy.gen';
import { ILM_RETRY_CONTRACT } from './elasticsearch.ilm.retry.gen';
import { ILM_START_CONTRACT } from './elasticsearch.ilm.start.gen';
import { ILM_STOP_CONTRACT } from './elasticsearch.ilm.stop.gen';
import { INDEX_CONTRACT } from './elasticsearch.index.gen';
import { INDICES_ADD_BLOCK_CONTRACT } from './elasticsearch.indices.add_block.gen';
import { INDICES_ANALYZE_CONTRACT } from './elasticsearch.indices.analyze.gen';
import { INDICES_CANCEL_MIGRATE_REINDEX_CONTRACT } from './elasticsearch.indices.cancel_migrate_reindex.gen';
import { INDICES_CLEAR_CACHE_CONTRACT } from './elasticsearch.indices.clear_cache.gen';
import { INDICES_CLONE_CONTRACT } from './elasticsearch.indices.clone.gen';
import { INDICES_CLOSE_CONTRACT } from './elasticsearch.indices.close.gen';
import { INDICES_CREATE_CONTRACT } from './elasticsearch.indices.create.gen';
import { INDICES_CREATE_DATA_STREAM_CONTRACT } from './elasticsearch.indices.create_data_stream.gen';
import { INDICES_CREATE_FROM_CONTRACT } from './elasticsearch.indices.create_from.gen';
import { INDICES_DATA_STREAMS_STATS_CONTRACT } from './elasticsearch.indices.data_streams_stats.gen';
import { INDICES_DELETE_CONTRACT } from './elasticsearch.indices.delete.gen';
import { INDICES_DELETE_ALIAS_CONTRACT } from './elasticsearch.indices.delete_alias.gen';
import { INDICES_DELETE_DATA_LIFECYCLE_CONTRACT } from './elasticsearch.indices.delete_data_lifecycle.gen';
import { INDICES_DELETE_DATA_STREAM_CONTRACT } from './elasticsearch.indices.delete_data_stream.gen';
import { INDICES_DELETE_DATA_STREAM_OPTIONS_CONTRACT } from './elasticsearch.indices.delete_data_stream_options.gen';
import { INDICES_DELETE_INDEX_TEMPLATE_CONTRACT } from './elasticsearch.indices.delete_index_template.gen';
import { INDICES_DELETE_SAMPLE_CONFIGURATION_CONTRACT } from './elasticsearch.indices.delete_sample_configuration.gen';
import { INDICES_DELETE_TEMPLATE_CONTRACT } from './elasticsearch.indices.delete_template.gen';
import { INDICES_DISK_USAGE_CONTRACT } from './elasticsearch.indices.disk_usage.gen';
import { INDICES_DOWNSAMPLE_CONTRACT } from './elasticsearch.indices.downsample.gen';
import { INDICES_EXISTS_CONTRACT } from './elasticsearch.indices.exists.gen';
import { INDICES_EXISTS_ALIAS_CONTRACT } from './elasticsearch.indices.exists_alias.gen';
import { INDICES_EXISTS_INDEX_TEMPLATE_CONTRACT } from './elasticsearch.indices.exists_index_template.gen';
import { INDICES_EXISTS_TEMPLATE_CONTRACT } from './elasticsearch.indices.exists_template.gen';
import { INDICES_EXPLAIN_DATA_LIFECYCLE_CONTRACT } from './elasticsearch.indices.explain_data_lifecycle.gen';
import { INDICES_FIELD_USAGE_STATS_CONTRACT } from './elasticsearch.indices.field_usage_stats.gen';
import { INDICES_FLUSH_CONTRACT } from './elasticsearch.indices.flush.gen';
import { INDICES_FORCEMERGE_CONTRACT } from './elasticsearch.indices.forcemerge.gen';
import { INDICES_GET_CONTRACT } from './elasticsearch.indices.get.gen';
import { INDICES_GET_ALIAS_CONTRACT } from './elasticsearch.indices.get_alias.gen';
import { INDICES_GET_ALL_SAMPLE_CONFIGURATION_CONTRACT } from './elasticsearch.indices.get_all_sample_configuration.gen';
import { INDICES_GET_DATA_LIFECYCLE_CONTRACT } from './elasticsearch.indices.get_data_lifecycle.gen';
import { INDICES_GET_DATA_LIFECYCLE_STATS_CONTRACT } from './elasticsearch.indices.get_data_lifecycle_stats.gen';
import { INDICES_GET_DATA_STREAM_CONTRACT } from './elasticsearch.indices.get_data_stream.gen';
import { INDICES_GET_DATA_STREAM_MAPPINGS_CONTRACT } from './elasticsearch.indices.get_data_stream_mappings.gen';
import { INDICES_GET_DATA_STREAM_OPTIONS_CONTRACT } from './elasticsearch.indices.get_data_stream_options.gen';
import { INDICES_GET_DATA_STREAM_SETTINGS_CONTRACT } from './elasticsearch.indices.get_data_stream_settings.gen';
import { INDICES_GET_FIELD_MAPPING_CONTRACT } from './elasticsearch.indices.get_field_mapping.gen';
import { INDICES_GET_INDEX_TEMPLATE_CONTRACT } from './elasticsearch.indices.get_index_template.gen';
import { INDICES_GET_MAPPING_CONTRACT } from './elasticsearch.indices.get_mapping.gen';
import { INDICES_GET_MIGRATE_REINDEX_STATUS_CONTRACT } from './elasticsearch.indices.get_migrate_reindex_status.gen';
import { INDICES_GET_SAMPLE_CONTRACT } from './elasticsearch.indices.get_sample.gen';
import { INDICES_GET_SAMPLE_CONFIGURATION_CONTRACT } from './elasticsearch.indices.get_sample_configuration.gen';
import { INDICES_GET_SAMPLE_STATS_CONTRACT } from './elasticsearch.indices.get_sample_stats.gen';
import { INDICES_GET_SETTINGS_CONTRACT } from './elasticsearch.indices.get_settings.gen';
import { INDICES_GET_TEMPLATE_CONTRACT } from './elasticsearch.indices.get_template.gen';
import { INDICES_MIGRATE_REINDEX_CONTRACT } from './elasticsearch.indices.migrate_reindex.gen';
import { INDICES_MIGRATE_TO_DATA_STREAM_CONTRACT } from './elasticsearch.indices.migrate_to_data_stream.gen';
import { INDICES_MODIFY_DATA_STREAM_CONTRACT } from './elasticsearch.indices.modify_data_stream.gen';
import { INDICES_OPEN_CONTRACT } from './elasticsearch.indices.open.gen';
import { INDICES_PROMOTE_DATA_STREAM_CONTRACT } from './elasticsearch.indices.promote_data_stream.gen';
import { INDICES_PUT_ALIAS_CONTRACT } from './elasticsearch.indices.put_alias.gen';
import { INDICES_PUT_DATA_LIFECYCLE_CONTRACT } from './elasticsearch.indices.put_data_lifecycle.gen';
import { INDICES_PUT_DATA_STREAM_MAPPINGS_CONTRACT } from './elasticsearch.indices.put_data_stream_mappings.gen';
import { INDICES_PUT_DATA_STREAM_OPTIONS_CONTRACT } from './elasticsearch.indices.put_data_stream_options.gen';
import { INDICES_PUT_DATA_STREAM_SETTINGS_CONTRACT } from './elasticsearch.indices.put_data_stream_settings.gen';
import { INDICES_PUT_INDEX_TEMPLATE_CONTRACT } from './elasticsearch.indices.put_index_template.gen';
import { INDICES_PUT_MAPPING_CONTRACT } from './elasticsearch.indices.put_mapping.gen';
import { INDICES_PUT_SAMPLE_CONFIGURATION_CONTRACT } from './elasticsearch.indices.put_sample_configuration.gen';
import { INDICES_PUT_SETTINGS_CONTRACT } from './elasticsearch.indices.put_settings.gen';
import { INDICES_PUT_TEMPLATE_CONTRACT } from './elasticsearch.indices.put_template.gen';
import { INDICES_RECOVERY_CONTRACT } from './elasticsearch.indices.recovery.gen';
import { INDICES_REFRESH_CONTRACT } from './elasticsearch.indices.refresh.gen';
import { INDICES_RELOAD_SEARCH_ANALYZERS_CONTRACT } from './elasticsearch.indices.reload_search_analyzers.gen';
import { INDICES_REMOVE_BLOCK_CONTRACT } from './elasticsearch.indices.remove_block.gen';
import { INDICES_RESOLVE_CLUSTER_CONTRACT } from './elasticsearch.indices.resolve_cluster.gen';
import { INDICES_RESOLVE_INDEX_CONTRACT } from './elasticsearch.indices.resolve_index.gen';
import { INDICES_ROLLOVER_CONTRACT } from './elasticsearch.indices.rollover.gen';
import { INDICES_SEGMENTS_CONTRACT } from './elasticsearch.indices.segments.gen';
import { INDICES_SHARD_STORES_CONTRACT } from './elasticsearch.indices.shard_stores.gen';
import { INDICES_SHRINK_CONTRACT } from './elasticsearch.indices.shrink.gen';
import { INDICES_SIMULATE_INDEX_TEMPLATE_CONTRACT } from './elasticsearch.indices.simulate_index_template.gen';
import { INDICES_SIMULATE_TEMPLATE_CONTRACT } from './elasticsearch.indices.simulate_template.gen';
import { INDICES_SPLIT_CONTRACT } from './elasticsearch.indices.split.gen';
import { INDICES_STATS_CONTRACT } from './elasticsearch.indices.stats.gen';
import { INDICES_UPDATE_ALIASES_CONTRACT } from './elasticsearch.indices.update_aliases.gen';
import { INDICES_VALIDATE_QUERY_CONTRACT } from './elasticsearch.indices.validate_query.gen';
import { INFERENCE_CHAT_COMPLETION_UNIFIED_CONTRACT } from './elasticsearch.inference.chat_completion_unified.gen';
import { INFERENCE_COMPLETION_CONTRACT } from './elasticsearch.inference.completion.gen';
import { INFERENCE_DELETE_CONTRACT } from './elasticsearch.inference.delete.gen';
import { INFERENCE_GET_CONTRACT } from './elasticsearch.inference.get.gen';
import { INFERENCE_INFERENCE_CONTRACT } from './elasticsearch.inference.inference.gen';
import { INFERENCE_PUT_CONTRACT } from './elasticsearch.inference.put.gen';
import { INFERENCE_PUT_AI21_CONTRACT } from './elasticsearch.inference.put_ai21.gen';
import { INFERENCE_PUT_ALIBABACLOUD_CONTRACT } from './elasticsearch.inference.put_alibabacloud.gen';
import { INFERENCE_PUT_AMAZONBEDROCK_CONTRACT } from './elasticsearch.inference.put_amazonbedrock.gen';
import { INFERENCE_PUT_AMAZONSAGEMAKER_CONTRACT } from './elasticsearch.inference.put_amazonsagemaker.gen';
import { INFERENCE_PUT_ANTHROPIC_CONTRACT } from './elasticsearch.inference.put_anthropic.gen';
import { INFERENCE_PUT_AZUREAISTUDIO_CONTRACT } from './elasticsearch.inference.put_azureaistudio.gen';
import { INFERENCE_PUT_AZUREOPENAI_CONTRACT } from './elasticsearch.inference.put_azureopenai.gen';
import { INFERENCE_PUT_COHERE_CONTRACT } from './elasticsearch.inference.put_cohere.gen';
import { INFERENCE_PUT_CONTEXTUALAI_CONTRACT } from './elasticsearch.inference.put_contextualai.gen';
import { INFERENCE_PUT_CUSTOM_CONTRACT } from './elasticsearch.inference.put_custom.gen';
import { INFERENCE_PUT_DEEPSEEK_CONTRACT } from './elasticsearch.inference.put_deepseek.gen';
import { INFERENCE_PUT_ELASTICSEARCH_CONTRACT } from './elasticsearch.inference.put_elasticsearch.gen';
import { INFERENCE_PUT_ELSER_CONTRACT } from './elasticsearch.inference.put_elser.gen';
import { INFERENCE_PUT_GOOGLEAISTUDIO_CONTRACT } from './elasticsearch.inference.put_googleaistudio.gen';
import { INFERENCE_PUT_GOOGLEVERTEXAI_CONTRACT } from './elasticsearch.inference.put_googlevertexai.gen';
import { INFERENCE_PUT_HUGGING_FACE_CONTRACT } from './elasticsearch.inference.put_hugging_face.gen';
import { INFERENCE_PUT_JINAAI_CONTRACT } from './elasticsearch.inference.put_jinaai.gen';
import { INFERENCE_PUT_LLAMA_CONTRACT } from './elasticsearch.inference.put_llama.gen';
import { INFERENCE_PUT_MISTRAL_CONTRACT } from './elasticsearch.inference.put_mistral.gen';
import { INFERENCE_PUT_OPENAI_CONTRACT } from './elasticsearch.inference.put_openai.gen';
import { INFERENCE_PUT_OPENSHIFT_AI_CONTRACT } from './elasticsearch.inference.put_openshift_ai.gen';
import { INFERENCE_PUT_VOYAGEAI_CONTRACT } from './elasticsearch.inference.put_voyageai.gen';
import { INFERENCE_PUT_WATSONX_CONTRACT } from './elasticsearch.inference.put_watsonx.gen';
import { INFERENCE_RERANK_CONTRACT } from './elasticsearch.inference.rerank.gen';
import { INFERENCE_SPARSE_EMBEDDING_CONTRACT } from './elasticsearch.inference.sparse_embedding.gen';
import { INFERENCE_STREAM_COMPLETION_CONTRACT } from './elasticsearch.inference.stream_completion.gen';
import { INFERENCE_TEXT_EMBEDDING_CONTRACT } from './elasticsearch.inference.text_embedding.gen';
import { INFERENCE_UPDATE_CONTRACT } from './elasticsearch.inference.update.gen';
import { INFO_CONTRACT } from './elasticsearch.info.gen';
import { INGEST_DELETE_GEOIP_DATABASE_CONTRACT } from './elasticsearch.ingest.delete_geoip_database.gen';
import { INGEST_DELETE_IP_LOCATION_DATABASE_CONTRACT } from './elasticsearch.ingest.delete_ip_location_database.gen';
import { INGEST_DELETE_PIPELINE_CONTRACT } from './elasticsearch.ingest.delete_pipeline.gen';
import { INGEST_GEO_IP_STATS_CONTRACT } from './elasticsearch.ingest.geo_ip_stats.gen';
import { INGEST_GET_GEOIP_DATABASE_CONTRACT } from './elasticsearch.ingest.get_geoip_database.gen';
import { INGEST_GET_IP_LOCATION_DATABASE_CONTRACT } from './elasticsearch.ingest.get_ip_location_database.gen';
import { INGEST_GET_PIPELINE_CONTRACT } from './elasticsearch.ingest.get_pipeline.gen';
import { INGEST_PROCESSOR_GROK_CONTRACT } from './elasticsearch.ingest.processor_grok.gen';
import { INGEST_PUT_GEOIP_DATABASE_CONTRACT } from './elasticsearch.ingest.put_geoip_database.gen';
import { INGEST_PUT_IP_LOCATION_DATABASE_CONTRACT } from './elasticsearch.ingest.put_ip_location_database.gen';
import { INGEST_PUT_PIPELINE_CONTRACT } from './elasticsearch.ingest.put_pipeline.gen';
import { INGEST_SIMULATE_CONTRACT } from './elasticsearch.ingest.simulate.gen';
import { KNN_SEARCH_CONTRACT } from './elasticsearch.knn_search.gen';
import { LICENSE_DELETE_CONTRACT } from './elasticsearch.license.delete.gen';
import { LICENSE_GET_CONTRACT } from './elasticsearch.license.get.gen';
import { LICENSE_GET_BASIC_STATUS_CONTRACT } from './elasticsearch.license.get_basic_status.gen';
import { LICENSE_GET_TRIAL_STATUS_CONTRACT } from './elasticsearch.license.get_trial_status.gen';
import { LICENSE_POST_CONTRACT } from './elasticsearch.license.post.gen';
import { LICENSE_POST_START_BASIC_CONTRACT } from './elasticsearch.license.post_start_basic.gen';
import { LICENSE_POST_START_TRIAL_CONTRACT } from './elasticsearch.license.post_start_trial.gen';
import { LOGSTASH_DELETE_PIPELINE_CONTRACT } from './elasticsearch.logstash.delete_pipeline.gen';
import { LOGSTASH_GET_PIPELINE_CONTRACT } from './elasticsearch.logstash.get_pipeline.gen';
import { LOGSTASH_PUT_PIPELINE_CONTRACT } from './elasticsearch.logstash.put_pipeline.gen';
import { MGET_CONTRACT } from './elasticsearch.mget.gen';
import { MIGRATION_DEPRECATIONS_CONTRACT } from './elasticsearch.migration.deprecations.gen';
import { MIGRATION_GET_FEATURE_UPGRADE_STATUS_CONTRACT } from './elasticsearch.migration.get_feature_upgrade_status.gen';
import { MIGRATION_POST_FEATURE_UPGRADE_CONTRACT } from './elasticsearch.migration.post_feature_upgrade.gen';
import { ML_CLEAR_TRAINED_MODEL_DEPLOYMENT_CACHE_CONTRACT } from './elasticsearch.ml.clear_trained_model_deployment_cache.gen';
import { ML_CLOSE_JOB_CONTRACT } from './elasticsearch.ml.close_job.gen';
import { ML_DELETE_CALENDAR_CONTRACT } from './elasticsearch.ml.delete_calendar.gen';
import { ML_DELETE_CALENDAR_EVENT_CONTRACT } from './elasticsearch.ml.delete_calendar_event.gen';
import { ML_DELETE_CALENDAR_JOB_CONTRACT } from './elasticsearch.ml.delete_calendar_job.gen';
import { ML_DELETE_DATA_FRAME_ANALYTICS_CONTRACT } from './elasticsearch.ml.delete_data_frame_analytics.gen';
import { ML_DELETE_DATAFEED_CONTRACT } from './elasticsearch.ml.delete_datafeed.gen';
import { ML_DELETE_EXPIRED_DATA_CONTRACT } from './elasticsearch.ml.delete_expired_data.gen';
import { ML_DELETE_FILTER_CONTRACT } from './elasticsearch.ml.delete_filter.gen';
import { ML_DELETE_FORECAST_CONTRACT } from './elasticsearch.ml.delete_forecast.gen';
import { ML_DELETE_JOB_CONTRACT } from './elasticsearch.ml.delete_job.gen';
import { ML_DELETE_MODEL_SNAPSHOT_CONTRACT } from './elasticsearch.ml.delete_model_snapshot.gen';
import { ML_DELETE_TRAINED_MODEL_CONTRACT } from './elasticsearch.ml.delete_trained_model.gen';
import { ML_DELETE_TRAINED_MODEL_ALIAS_CONTRACT } from './elasticsearch.ml.delete_trained_model_alias.gen';
import { ML_ESTIMATE_MODEL_MEMORY_CONTRACT } from './elasticsearch.ml.estimate_model_memory.gen';
import { ML_EVALUATE_DATA_FRAME_CONTRACT } from './elasticsearch.ml.evaluate_data_frame.gen';
import { ML_EXPLAIN_DATA_FRAME_ANALYTICS_CONTRACT } from './elasticsearch.ml.explain_data_frame_analytics.gen';
import { ML_FLUSH_JOB_CONTRACT } from './elasticsearch.ml.flush_job.gen';
import { ML_FORECAST_CONTRACT } from './elasticsearch.ml.forecast.gen';
import { ML_GET_BUCKETS_CONTRACT } from './elasticsearch.ml.get_buckets.gen';
import { ML_GET_CALENDAR_EVENTS_CONTRACT } from './elasticsearch.ml.get_calendar_events.gen';
import { ML_GET_CALENDARS_CONTRACT } from './elasticsearch.ml.get_calendars.gen';
import { ML_GET_CATEGORIES_CONTRACT } from './elasticsearch.ml.get_categories.gen';
import { ML_GET_DATA_FRAME_ANALYTICS_CONTRACT } from './elasticsearch.ml.get_data_frame_analytics.gen';
import { ML_GET_DATA_FRAME_ANALYTICS_STATS_CONTRACT } from './elasticsearch.ml.get_data_frame_analytics_stats.gen';
import { ML_GET_DATAFEED_STATS_CONTRACT } from './elasticsearch.ml.get_datafeed_stats.gen';
import { ML_GET_DATAFEEDS_CONTRACT } from './elasticsearch.ml.get_datafeeds.gen';
import { ML_GET_FILTERS_CONTRACT } from './elasticsearch.ml.get_filters.gen';
import { ML_GET_INFLUENCERS_CONTRACT } from './elasticsearch.ml.get_influencers.gen';
import { ML_GET_JOB_STATS_CONTRACT } from './elasticsearch.ml.get_job_stats.gen';
import { ML_GET_JOBS_CONTRACT } from './elasticsearch.ml.get_jobs.gen';
import { ML_GET_MEMORY_STATS_CONTRACT } from './elasticsearch.ml.get_memory_stats.gen';
import { ML_GET_MODEL_SNAPSHOT_UPGRADE_STATS_CONTRACT } from './elasticsearch.ml.get_model_snapshot_upgrade_stats.gen';
import { ML_GET_MODEL_SNAPSHOTS_CONTRACT } from './elasticsearch.ml.get_model_snapshots.gen';
import { ML_GET_OVERALL_BUCKETS_CONTRACT } from './elasticsearch.ml.get_overall_buckets.gen';
import { ML_GET_RECORDS_CONTRACT } from './elasticsearch.ml.get_records.gen';
import { ML_GET_TRAINED_MODELS_CONTRACT } from './elasticsearch.ml.get_trained_models.gen';
import { ML_GET_TRAINED_MODELS_STATS_CONTRACT } from './elasticsearch.ml.get_trained_models_stats.gen';
import { ML_INFER_TRAINED_MODEL_CONTRACT } from './elasticsearch.ml.infer_trained_model.gen';
import { ML_INFO_CONTRACT } from './elasticsearch.ml.info.gen';
import { ML_OPEN_JOB_CONTRACT } from './elasticsearch.ml.open_job.gen';
import { ML_POST_CALENDAR_EVENTS_CONTRACT } from './elasticsearch.ml.post_calendar_events.gen';
import { ML_POST_DATA_CONTRACT } from './elasticsearch.ml.post_data.gen';
import { ML_PREVIEW_DATA_FRAME_ANALYTICS_CONTRACT } from './elasticsearch.ml.preview_data_frame_analytics.gen';
import { ML_PREVIEW_DATAFEED_CONTRACT } from './elasticsearch.ml.preview_datafeed.gen';
import { ML_PUT_CALENDAR_CONTRACT } from './elasticsearch.ml.put_calendar.gen';
import { ML_PUT_CALENDAR_JOB_CONTRACT } from './elasticsearch.ml.put_calendar_job.gen';
import { ML_PUT_DATA_FRAME_ANALYTICS_CONTRACT } from './elasticsearch.ml.put_data_frame_analytics.gen';
import { ML_PUT_DATAFEED_CONTRACT } from './elasticsearch.ml.put_datafeed.gen';
import { ML_PUT_FILTER_CONTRACT } from './elasticsearch.ml.put_filter.gen';
import { ML_PUT_JOB_CONTRACT } from './elasticsearch.ml.put_job.gen';
import { ML_PUT_TRAINED_MODEL_CONTRACT } from './elasticsearch.ml.put_trained_model.gen';
import { ML_PUT_TRAINED_MODEL_ALIAS_CONTRACT } from './elasticsearch.ml.put_trained_model_alias.gen';
import { ML_PUT_TRAINED_MODEL_DEFINITION_PART_CONTRACT } from './elasticsearch.ml.put_trained_model_definition_part.gen';
import { ML_PUT_TRAINED_MODEL_VOCABULARY_CONTRACT } from './elasticsearch.ml.put_trained_model_vocabulary.gen';
import { ML_RESET_JOB_CONTRACT } from './elasticsearch.ml.reset_job.gen';
import { ML_REVERT_MODEL_SNAPSHOT_CONTRACT } from './elasticsearch.ml.revert_model_snapshot.gen';
import { ML_SET_UPGRADE_MODE_CONTRACT } from './elasticsearch.ml.set_upgrade_mode.gen';
import { ML_START_DATA_FRAME_ANALYTICS_CONTRACT } from './elasticsearch.ml.start_data_frame_analytics.gen';
import { ML_START_DATAFEED_CONTRACT } from './elasticsearch.ml.start_datafeed.gen';
import { ML_START_TRAINED_MODEL_DEPLOYMENT_CONTRACT } from './elasticsearch.ml.start_trained_model_deployment.gen';
import { ML_STOP_DATA_FRAME_ANALYTICS_CONTRACT } from './elasticsearch.ml.stop_data_frame_analytics.gen';
import { ML_STOP_DATAFEED_CONTRACT } from './elasticsearch.ml.stop_datafeed.gen';
import { ML_STOP_TRAINED_MODEL_DEPLOYMENT_CONTRACT } from './elasticsearch.ml.stop_trained_model_deployment.gen';
import { ML_UPDATE_DATA_FRAME_ANALYTICS_CONTRACT } from './elasticsearch.ml.update_data_frame_analytics.gen';
import { ML_UPDATE_DATAFEED_CONTRACT } from './elasticsearch.ml.update_datafeed.gen';
import { ML_UPDATE_FILTER_CONTRACT } from './elasticsearch.ml.update_filter.gen';
import { ML_UPDATE_JOB_CONTRACT } from './elasticsearch.ml.update_job.gen';
import { ML_UPDATE_MODEL_SNAPSHOT_CONTRACT } from './elasticsearch.ml.update_model_snapshot.gen';
import { ML_UPDATE_TRAINED_MODEL_DEPLOYMENT_CONTRACT } from './elasticsearch.ml.update_trained_model_deployment.gen';
import { ML_UPGRADE_JOB_SNAPSHOT_CONTRACT } from './elasticsearch.ml.upgrade_job_snapshot.gen';
import { ML_VALIDATE_CONTRACT } from './elasticsearch.ml.validate.gen';
import { ML_VALIDATE_DETECTOR_CONTRACT } from './elasticsearch.ml.validate_detector.gen';
import { MONITORING_BULK_CONTRACT } from './elasticsearch.monitoring.bulk.gen';
import { MSEARCH_CONTRACT } from './elasticsearch.msearch.gen';
import { MSEARCH_TEMPLATE_CONTRACT } from './elasticsearch.msearch_template.gen';
import { MTERMVECTORS_CONTRACT } from './elasticsearch.mtermvectors.gen';
import { NODES_CLEAR_REPOSITORIES_METERING_ARCHIVE_CONTRACT } from './elasticsearch.nodes.clear_repositories_metering_archive.gen';
import { NODES_GET_REPOSITORIES_METERING_INFO_CONTRACT } from './elasticsearch.nodes.get_repositories_metering_info.gen';
import { NODES_HOT_THREADS_CONTRACT } from './elasticsearch.nodes.hot_threads.gen';
import { NODES_INFO_CONTRACT } from './elasticsearch.nodes.info.gen';
import { NODES_RELOAD_SECURE_SETTINGS_CONTRACT } from './elasticsearch.nodes.reload_secure_settings.gen';
import { NODES_STATS_CONTRACT } from './elasticsearch.nodes.stats.gen';
import { NODES_USAGE_CONTRACT } from './elasticsearch.nodes.usage.gen';
import { OPEN_POINT_IN_TIME_CONTRACT } from './elasticsearch.open_point_in_time.gen';
import { PING_CONTRACT } from './elasticsearch.ping.gen';
import { PROFILING_FLAMEGRAPH_CONTRACT } from './elasticsearch.profiling.flamegraph.gen';
import { PROFILING_STACKTRACES_CONTRACT } from './elasticsearch.profiling.stacktraces.gen';
import { PROFILING_STATUS_CONTRACT } from './elasticsearch.profiling.status.gen';
import { PROFILING_TOPN_FUNCTIONS_CONTRACT } from './elasticsearch.profiling.topn_functions.gen';
import { PROJECT_TAGS_CONTRACT } from './elasticsearch.project.tags.gen';
import { PUT_SCRIPT_CONTRACT } from './elasticsearch.put_script.gen';
import { QUERY_RULES_DELETE_RULE_CONTRACT } from './elasticsearch.query_rules.delete_rule.gen';
import { QUERY_RULES_DELETE_RULESET_CONTRACT } from './elasticsearch.query_rules.delete_ruleset.gen';
import { QUERY_RULES_GET_RULE_CONTRACT } from './elasticsearch.query_rules.get_rule.gen';
import { QUERY_RULES_GET_RULESET_CONTRACT } from './elasticsearch.query_rules.get_ruleset.gen';
import { QUERY_RULES_LIST_RULESETS_CONTRACT } from './elasticsearch.query_rules.list_rulesets.gen';
import { QUERY_RULES_PUT_RULE_CONTRACT } from './elasticsearch.query_rules.put_rule.gen';
import { QUERY_RULES_PUT_RULESET_CONTRACT } from './elasticsearch.query_rules.put_ruleset.gen';
import { QUERY_RULES_TEST_CONTRACT } from './elasticsearch.query_rules.test.gen';
import { RANK_EVAL_CONTRACT } from './elasticsearch.rank_eval.gen';
import { REINDEX_CONTRACT } from './elasticsearch.reindex.gen';
import { REINDEX_RETHROTTLE_CONTRACT } from './elasticsearch.reindex_rethrottle.gen';
import { RENDER_SEARCH_TEMPLATE_CONTRACT } from './elasticsearch.render_search_template.gen';
import { ROLLUP_DELETE_JOB_CONTRACT } from './elasticsearch.rollup.delete_job.gen';
import { ROLLUP_GET_JOBS_CONTRACT } from './elasticsearch.rollup.get_jobs.gen';
import { ROLLUP_GET_ROLLUP_CAPS_CONTRACT } from './elasticsearch.rollup.get_rollup_caps.gen';
import { ROLLUP_GET_ROLLUP_INDEX_CAPS_CONTRACT } from './elasticsearch.rollup.get_rollup_index_caps.gen';
import { ROLLUP_PUT_JOB_CONTRACT } from './elasticsearch.rollup.put_job.gen';
import { ROLLUP_ROLLUP_SEARCH_CONTRACT } from './elasticsearch.rollup.rollup_search.gen';
import { ROLLUP_START_JOB_CONTRACT } from './elasticsearch.rollup.start_job.gen';
import { ROLLUP_STOP_JOB_CONTRACT } from './elasticsearch.rollup.stop_job.gen';
import { SCRIPTS_PAINLESS_EXECUTE_CONTRACT } from './elasticsearch.scripts_painless_execute.gen';
import { SCROLL_CONTRACT } from './elasticsearch.scroll.gen';
import { SEARCH_CONTRACT } from './elasticsearch.search.gen';
import { SEARCH_APPLICATION_DELETE_CONTRACT } from './elasticsearch.search_application.delete.gen';
import { SEARCH_APPLICATION_DELETE_BEHAVIORAL_ANALYTICS_CONTRACT } from './elasticsearch.search_application.delete_behavioral_analytics.gen';
import { SEARCH_APPLICATION_GET_CONTRACT } from './elasticsearch.search_application.get.gen';
import { SEARCH_APPLICATION_GET_BEHAVIORAL_ANALYTICS_CONTRACT } from './elasticsearch.search_application.get_behavioral_analytics.gen';
import { SEARCH_APPLICATION_LIST_CONTRACT } from './elasticsearch.search_application.list.gen';
import { SEARCH_APPLICATION_POST_BEHAVIORAL_ANALYTICS_EVENT_CONTRACT } from './elasticsearch.search_application.post_behavioral_analytics_event.gen';
import { SEARCH_APPLICATION_PUT_CONTRACT } from './elasticsearch.search_application.put.gen';
import { SEARCH_APPLICATION_PUT_BEHAVIORAL_ANALYTICS_CONTRACT } from './elasticsearch.search_application.put_behavioral_analytics.gen';
import { SEARCH_APPLICATION_RENDER_QUERY_CONTRACT } from './elasticsearch.search_application.render_query.gen';
import { SEARCH_APPLICATION_SEARCH_CONTRACT } from './elasticsearch.search_application.search.gen';
import { SEARCH_MVT_CONTRACT } from './elasticsearch.search_mvt.gen';
import { SEARCH_SHARDS_CONTRACT } from './elasticsearch.search_shards.gen';
import { SEARCH_TEMPLATE_CONTRACT } from './elasticsearch.search_template.gen';
import { SEARCHABLE_SNAPSHOTS_CACHE_STATS_CONTRACT } from './elasticsearch.searchable_snapshots.cache_stats.gen';
import { SEARCHABLE_SNAPSHOTS_CLEAR_CACHE_CONTRACT } from './elasticsearch.searchable_snapshots.clear_cache.gen';
import { SEARCHABLE_SNAPSHOTS_MOUNT_CONTRACT } from './elasticsearch.searchable_snapshots.mount.gen';
import { SEARCHABLE_SNAPSHOTS_STATS_CONTRACT } from './elasticsearch.searchable_snapshots.stats.gen';
import { SECURITY_ACTIVATE_USER_PROFILE_CONTRACT } from './elasticsearch.security.activate_user_profile.gen';
import { SECURITY_AUTHENTICATE_CONTRACT } from './elasticsearch.security.authenticate.gen';
import { SECURITY_BULK_DELETE_ROLE_CONTRACT } from './elasticsearch.security.bulk_delete_role.gen';
import { SECURITY_BULK_PUT_ROLE_CONTRACT } from './elasticsearch.security.bulk_put_role.gen';
import { SECURITY_BULK_UPDATE_API_KEYS_CONTRACT } from './elasticsearch.security.bulk_update_api_keys.gen';
import { SECURITY_CHANGE_PASSWORD_CONTRACT } from './elasticsearch.security.change_password.gen';
import { SECURITY_CLEAR_API_KEY_CACHE_CONTRACT } from './elasticsearch.security.clear_api_key_cache.gen';
import { SECURITY_CLEAR_CACHED_PRIVILEGES_CONTRACT } from './elasticsearch.security.clear_cached_privileges.gen';
import { SECURITY_CLEAR_CACHED_REALMS_CONTRACT } from './elasticsearch.security.clear_cached_realms.gen';
import { SECURITY_CLEAR_CACHED_ROLES_CONTRACT } from './elasticsearch.security.clear_cached_roles.gen';
import { SECURITY_CLEAR_CACHED_SERVICE_TOKENS_CONTRACT } from './elasticsearch.security.clear_cached_service_tokens.gen';
import { SECURITY_CREATE_API_KEY_CONTRACT } from './elasticsearch.security.create_api_key.gen';
import { SECURITY_CREATE_CROSS_CLUSTER_API_KEY_CONTRACT } from './elasticsearch.security.create_cross_cluster_api_key.gen';
import { SECURITY_CREATE_SERVICE_TOKEN_CONTRACT } from './elasticsearch.security.create_service_token.gen';
import { SECURITY_DELEGATE_PKI_CONTRACT } from './elasticsearch.security.delegate_pki.gen';
import { SECURITY_DELETE_PRIVILEGES_CONTRACT } from './elasticsearch.security.delete_privileges.gen';
import { SECURITY_DELETE_ROLE_CONTRACT } from './elasticsearch.security.delete_role.gen';
import { SECURITY_DELETE_ROLE_MAPPING_CONTRACT } from './elasticsearch.security.delete_role_mapping.gen';
import { SECURITY_DELETE_SERVICE_TOKEN_CONTRACT } from './elasticsearch.security.delete_service_token.gen';
import { SECURITY_DELETE_USER_CONTRACT } from './elasticsearch.security.delete_user.gen';
import { SECURITY_DISABLE_USER_CONTRACT } from './elasticsearch.security.disable_user.gen';
import { SECURITY_DISABLE_USER_PROFILE_CONTRACT } from './elasticsearch.security.disable_user_profile.gen';
import { SECURITY_ENABLE_USER_CONTRACT } from './elasticsearch.security.enable_user.gen';
import { SECURITY_ENABLE_USER_PROFILE_CONTRACT } from './elasticsearch.security.enable_user_profile.gen';
import { SECURITY_ENROLL_KIBANA_CONTRACT } from './elasticsearch.security.enroll_kibana.gen';
import { SECURITY_ENROLL_NODE_CONTRACT } from './elasticsearch.security.enroll_node.gen';
import { SECURITY_GET_API_KEY_CONTRACT } from './elasticsearch.security.get_api_key.gen';
import { SECURITY_GET_BUILTIN_PRIVILEGES_CONTRACT } from './elasticsearch.security.get_builtin_privileges.gen';
import { SECURITY_GET_PRIVILEGES_CONTRACT } from './elasticsearch.security.get_privileges.gen';
import { SECURITY_GET_ROLE_CONTRACT } from './elasticsearch.security.get_role.gen';
import { SECURITY_GET_ROLE_MAPPING_CONTRACT } from './elasticsearch.security.get_role_mapping.gen';
import { SECURITY_GET_SERVICE_ACCOUNTS_CONTRACT } from './elasticsearch.security.get_service_accounts.gen';
import { SECURITY_GET_SERVICE_CREDENTIALS_CONTRACT } from './elasticsearch.security.get_service_credentials.gen';
import { SECURITY_GET_SETTINGS_CONTRACT } from './elasticsearch.security.get_settings.gen';
import { SECURITY_GET_STATS_CONTRACT } from './elasticsearch.security.get_stats.gen';
import { SECURITY_GET_TOKEN_CONTRACT } from './elasticsearch.security.get_token.gen';
import { SECURITY_GET_USER_CONTRACT } from './elasticsearch.security.get_user.gen';
import { SECURITY_GET_USER_PRIVILEGES_CONTRACT } from './elasticsearch.security.get_user_privileges.gen';
import { SECURITY_GET_USER_PROFILE_CONTRACT } from './elasticsearch.security.get_user_profile.gen';
import { SECURITY_GRANT_API_KEY_CONTRACT } from './elasticsearch.security.grant_api_key.gen';
import { SECURITY_HAS_PRIVILEGES_CONTRACT } from './elasticsearch.security.has_privileges.gen';
import { SECURITY_HAS_PRIVILEGES_USER_PROFILE_CONTRACT } from './elasticsearch.security.has_privileges_user_profile.gen';
import { SECURITY_INVALIDATE_API_KEY_CONTRACT } from './elasticsearch.security.invalidate_api_key.gen';
import { SECURITY_INVALIDATE_TOKEN_CONTRACT } from './elasticsearch.security.invalidate_token.gen';
import { SECURITY_OIDC_AUTHENTICATE_CONTRACT } from './elasticsearch.security.oidc_authenticate.gen';
import { SECURITY_OIDC_LOGOUT_CONTRACT } from './elasticsearch.security.oidc_logout.gen';
import { SECURITY_OIDC_PREPARE_AUTHENTICATION_CONTRACT } from './elasticsearch.security.oidc_prepare_authentication.gen';
import { SECURITY_PUT_PRIVILEGES_CONTRACT } from './elasticsearch.security.put_privileges.gen';
import { SECURITY_PUT_ROLE_CONTRACT } from './elasticsearch.security.put_role.gen';
import { SECURITY_PUT_ROLE_MAPPING_CONTRACT } from './elasticsearch.security.put_role_mapping.gen';
import { SECURITY_PUT_USER_CONTRACT } from './elasticsearch.security.put_user.gen';
import { SECURITY_QUERY_API_KEYS_CONTRACT } from './elasticsearch.security.query_api_keys.gen';
import { SECURITY_QUERY_ROLE_CONTRACT } from './elasticsearch.security.query_role.gen';
import { SECURITY_QUERY_USER_CONTRACT } from './elasticsearch.security.query_user.gen';
import { SECURITY_SAML_AUTHENTICATE_CONTRACT } from './elasticsearch.security.saml_authenticate.gen';
import { SECURITY_SAML_COMPLETE_LOGOUT_CONTRACT } from './elasticsearch.security.saml_complete_logout.gen';
import { SECURITY_SAML_INVALIDATE_CONTRACT } from './elasticsearch.security.saml_invalidate.gen';
import { SECURITY_SAML_LOGOUT_CONTRACT } from './elasticsearch.security.saml_logout.gen';
import { SECURITY_SAML_PREPARE_AUTHENTICATION_CONTRACT } from './elasticsearch.security.saml_prepare_authentication.gen';
import { SECURITY_SAML_SERVICE_PROVIDER_METADATA_CONTRACT } from './elasticsearch.security.saml_service_provider_metadata.gen';
import { SECURITY_SUGGEST_USER_PROFILES_CONTRACT } from './elasticsearch.security.suggest_user_profiles.gen';
import { SECURITY_UPDATE_API_KEY_CONTRACT } from './elasticsearch.security.update_api_key.gen';
import { SECURITY_UPDATE_CROSS_CLUSTER_API_KEY_CONTRACT } from './elasticsearch.security.update_cross_cluster_api_key.gen';
import { SECURITY_UPDATE_SETTINGS_CONTRACT } from './elasticsearch.security.update_settings.gen';
import { SECURITY_UPDATE_USER_PROFILE_DATA_CONTRACT } from './elasticsearch.security.update_user_profile_data.gen';
import { SHUTDOWN_DELETE_NODE_CONTRACT } from './elasticsearch.shutdown.delete_node.gen';
import { SHUTDOWN_GET_NODE_CONTRACT } from './elasticsearch.shutdown.get_node.gen';
import { SHUTDOWN_PUT_NODE_CONTRACT } from './elasticsearch.shutdown.put_node.gen';
import { SIMULATE_INGEST_CONTRACT } from './elasticsearch.simulate.ingest.gen';
import { SLM_DELETE_LIFECYCLE_CONTRACT } from './elasticsearch.slm.delete_lifecycle.gen';
import { SLM_EXECUTE_LIFECYCLE_CONTRACT } from './elasticsearch.slm.execute_lifecycle.gen';
import { SLM_EXECUTE_RETENTION_CONTRACT } from './elasticsearch.slm.execute_retention.gen';
import { SLM_GET_LIFECYCLE_CONTRACT } from './elasticsearch.slm.get_lifecycle.gen';
import { SLM_GET_STATS_CONTRACT } from './elasticsearch.slm.get_stats.gen';
import { SLM_GET_STATUS_CONTRACT } from './elasticsearch.slm.get_status.gen';
import { SLM_PUT_LIFECYCLE_CONTRACT } from './elasticsearch.slm.put_lifecycle.gen';
import { SLM_START_CONTRACT } from './elasticsearch.slm.start.gen';
import { SLM_STOP_CONTRACT } from './elasticsearch.slm.stop.gen';
import { SNAPSHOT_CLEANUP_REPOSITORY_CONTRACT } from './elasticsearch.snapshot.cleanup_repository.gen';
import { SNAPSHOT_CLONE_CONTRACT } from './elasticsearch.snapshot.clone.gen';
import { SNAPSHOT_CREATE_CONTRACT } from './elasticsearch.snapshot.create.gen';
import { SNAPSHOT_CREATE_REPOSITORY_CONTRACT } from './elasticsearch.snapshot.create_repository.gen';
import { SNAPSHOT_DELETE_CONTRACT } from './elasticsearch.snapshot.delete.gen';
import { SNAPSHOT_DELETE_REPOSITORY_CONTRACT } from './elasticsearch.snapshot.delete_repository.gen';
import { SNAPSHOT_GET_CONTRACT } from './elasticsearch.snapshot.get.gen';
import { SNAPSHOT_GET_REPOSITORY_CONTRACT } from './elasticsearch.snapshot.get_repository.gen';
import { SNAPSHOT_REPOSITORY_ANALYZE_CONTRACT } from './elasticsearch.snapshot.repository_analyze.gen';
import { SNAPSHOT_REPOSITORY_VERIFY_INTEGRITY_CONTRACT } from './elasticsearch.snapshot.repository_verify_integrity.gen';
import { SNAPSHOT_RESTORE_CONTRACT } from './elasticsearch.snapshot.restore.gen';
import { SNAPSHOT_STATUS_CONTRACT } from './elasticsearch.snapshot.status.gen';
import { SNAPSHOT_VERIFY_REPOSITORY_CONTRACT } from './elasticsearch.snapshot.verify_repository.gen';
import { SQL_CLEAR_CURSOR_CONTRACT } from './elasticsearch.sql.clear_cursor.gen';
import { SQL_DELETE_ASYNC_CONTRACT } from './elasticsearch.sql.delete_async.gen';
import { SQL_GET_ASYNC_CONTRACT } from './elasticsearch.sql.get_async.gen';
import { SQL_GET_ASYNC_STATUS_CONTRACT } from './elasticsearch.sql.get_async_status.gen';
import { SQL_QUERY_CONTRACT } from './elasticsearch.sql.query.gen';
import { SQL_TRANSLATE_CONTRACT } from './elasticsearch.sql.translate.gen';
import { SSL_CERTIFICATES_CONTRACT } from './elasticsearch.ssl.certificates.gen';
import { STREAMS_LOGS_DISABLE_CONTRACT } from './elasticsearch.streams.logs_disable.gen';
import { STREAMS_LOGS_ENABLE_CONTRACT } from './elasticsearch.streams.logs_enable.gen';
import { STREAMS_STATUS_CONTRACT } from './elasticsearch.streams.status.gen';
import { SYNONYMS_DELETE_SYNONYM_CONTRACT } from './elasticsearch.synonyms.delete_synonym.gen';
import { SYNONYMS_DELETE_SYNONYM_RULE_CONTRACT } from './elasticsearch.synonyms.delete_synonym_rule.gen';
import { SYNONYMS_GET_SYNONYM_CONTRACT } from './elasticsearch.synonyms.get_synonym.gen';
import { SYNONYMS_GET_SYNONYM_RULE_CONTRACT } from './elasticsearch.synonyms.get_synonym_rule.gen';
import { SYNONYMS_GET_SYNONYMS_SETS_CONTRACT } from './elasticsearch.synonyms.get_synonyms_sets.gen';
import { SYNONYMS_PUT_SYNONYM_CONTRACT } from './elasticsearch.synonyms.put_synonym.gen';
import { SYNONYMS_PUT_SYNONYM_RULE_CONTRACT } from './elasticsearch.synonyms.put_synonym_rule.gen';
import { TASKS_CANCEL_CONTRACT } from './elasticsearch.tasks.cancel.gen';
import { TASKS_GET_CONTRACT } from './elasticsearch.tasks.get.gen';
import { TASKS_LIST_CONTRACT } from './elasticsearch.tasks.list.gen';
import { TERMS_ENUM_CONTRACT } from './elasticsearch.terms_enum.gen';
import { TERMVECTORS_CONTRACT } from './elasticsearch.termvectors.gen';
import { TEXT_STRUCTURE_FIND_FIELD_STRUCTURE_CONTRACT } from './elasticsearch.text_structure.find_field_structure.gen';
import { TEXT_STRUCTURE_FIND_MESSAGE_STRUCTURE_CONTRACT } from './elasticsearch.text_structure.find_message_structure.gen';
import { TEXT_STRUCTURE_FIND_STRUCTURE_CONTRACT } from './elasticsearch.text_structure.find_structure.gen';
import { TEXT_STRUCTURE_TEST_GROK_PATTERN_CONTRACT } from './elasticsearch.text_structure.test_grok_pattern.gen';
import { TRANSFORM_DELETE_TRANSFORM_CONTRACT } from './elasticsearch.transform.delete_transform.gen';
import { TRANSFORM_GET_NODE_STATS_CONTRACT } from './elasticsearch.transform.get_node_stats.gen';
import { TRANSFORM_GET_TRANSFORM_CONTRACT } from './elasticsearch.transform.get_transform.gen';
import { TRANSFORM_GET_TRANSFORM_STATS_CONTRACT } from './elasticsearch.transform.get_transform_stats.gen';
import { TRANSFORM_PREVIEW_TRANSFORM_CONTRACT } from './elasticsearch.transform.preview_transform.gen';
import { TRANSFORM_PUT_TRANSFORM_CONTRACT } from './elasticsearch.transform.put_transform.gen';
import { TRANSFORM_RESET_TRANSFORM_CONTRACT } from './elasticsearch.transform.reset_transform.gen';
import { TRANSFORM_SCHEDULE_NOW_TRANSFORM_CONTRACT } from './elasticsearch.transform.schedule_now_transform.gen';
import { TRANSFORM_SET_UPGRADE_MODE_CONTRACT } from './elasticsearch.transform.set_upgrade_mode.gen';
import { TRANSFORM_START_TRANSFORM_CONTRACT } from './elasticsearch.transform.start_transform.gen';
import { TRANSFORM_STOP_TRANSFORM_CONTRACT } from './elasticsearch.transform.stop_transform.gen';
import { TRANSFORM_UPDATE_TRANSFORM_CONTRACT } from './elasticsearch.transform.update_transform.gen';
import { TRANSFORM_UPGRADE_TRANSFORMS_CONTRACT } from './elasticsearch.transform.upgrade_transforms.gen';
import { UPDATE_CONTRACT } from './elasticsearch.update.gen';
import { UPDATE_BY_QUERY_CONTRACT } from './elasticsearch.update_by_query.gen';
import { UPDATE_BY_QUERY_RETHROTTLE_CONTRACT } from './elasticsearch.update_by_query_rethrottle.gen';
import { WATCHER_ACK_WATCH_CONTRACT } from './elasticsearch.watcher.ack_watch.gen';
import { WATCHER_ACTIVATE_WATCH_CONTRACT } from './elasticsearch.watcher.activate_watch.gen';
import { WATCHER_DEACTIVATE_WATCH_CONTRACT } from './elasticsearch.watcher.deactivate_watch.gen';
import { WATCHER_DELETE_WATCH_CONTRACT } from './elasticsearch.watcher.delete_watch.gen';
import { WATCHER_EXECUTE_WATCH_CONTRACT } from './elasticsearch.watcher.execute_watch.gen';
import { WATCHER_GET_SETTINGS_CONTRACT } from './elasticsearch.watcher.get_settings.gen';
import { WATCHER_GET_WATCH_CONTRACT } from './elasticsearch.watcher.get_watch.gen';
import { WATCHER_PUT_WATCH_CONTRACT } from './elasticsearch.watcher.put_watch.gen';
import { WATCHER_QUERY_WATCHES_CONTRACT } from './elasticsearch.watcher.query_watches.gen';
import { WATCHER_START_CONTRACT } from './elasticsearch.watcher.start.gen';
import { WATCHER_STATS_CONTRACT } from './elasticsearch.watcher.stats.gen';
import { WATCHER_STOP_CONTRACT } from './elasticsearch.watcher.stop.gen';
import { WATCHER_UPDATE_SETTINGS_CONTRACT } from './elasticsearch.watcher.update_settings.gen';
import { XPACK_INFO_CONTRACT } from './elasticsearch.xpack.info.gen';
import { XPACK_USAGE_CONTRACT } from './elasticsearch.xpack.usage.gen';
import type { InternalConnectorContract } from '../../../types/latest';

// export contracts
export const GENERATED_ELASTICSEARCH_CONNECTORS: InternalConnectorContract[] = [
  ASYNC_SEARCH_DELETE_CONTRACT,
  ASYNC_SEARCH_GET_CONTRACT,
  ASYNC_SEARCH_STATUS_CONTRACT,
  ASYNC_SEARCH_SUBMIT_CONTRACT,
  AUTOSCALING_DELETE_AUTOSCALING_POLICY_CONTRACT,
  AUTOSCALING_GET_AUTOSCALING_CAPACITY_CONTRACT,
  AUTOSCALING_GET_AUTOSCALING_POLICY_CONTRACT,
  AUTOSCALING_PUT_AUTOSCALING_POLICY_CONTRACT,
  BULK_CONTRACT,
  CAPABILITIES_CONTRACT,
  CAT_ALIASES_CONTRACT,
  CAT_ALLOCATION_CONTRACT,
  CAT_CIRCUIT_BREAKER_CONTRACT,
  CAT_COMPONENT_TEMPLATES_CONTRACT,
  CAT_COUNT_CONTRACT,
  CAT_FIELDDATA_CONTRACT,
  CAT_HEALTH_CONTRACT,
  CAT_HELP_CONTRACT,
  CAT_INDICES_CONTRACT,
  CAT_MASTER_CONTRACT,
  CAT_ML_DATA_FRAME_ANALYTICS_CONTRACT,
  CAT_ML_DATAFEEDS_CONTRACT,
  CAT_ML_JOBS_CONTRACT,
  CAT_ML_TRAINED_MODELS_CONTRACT,
  CAT_NODEATTRS_CONTRACT,
  CAT_NODES_CONTRACT,
  CAT_PENDING_TASKS_CONTRACT,
  CAT_PLUGINS_CONTRACT,
  CAT_RECOVERY_CONTRACT,
  CAT_REPOSITORIES_CONTRACT,
  CAT_SEGMENTS_CONTRACT,
  CAT_SHARDS_CONTRACT,
  CAT_SNAPSHOTS_CONTRACT,
  CAT_TASKS_CONTRACT,
  CAT_TEMPLATES_CONTRACT,
  CAT_THREAD_POOL_CONTRACT,
  CAT_TRANSFORMS_CONTRACT,
  CCR_DELETE_AUTO_FOLLOW_PATTERN_CONTRACT,
  CCR_FOLLOW_CONTRACT,
  CCR_FOLLOW_INFO_CONTRACT,
  CCR_FOLLOW_STATS_CONTRACT,
  CCR_FORGET_FOLLOWER_CONTRACT,
  CCR_GET_AUTO_FOLLOW_PATTERN_CONTRACT,
  CCR_PAUSE_AUTO_FOLLOW_PATTERN_CONTRACT,
  CCR_PAUSE_FOLLOW_CONTRACT,
  CCR_PUT_AUTO_FOLLOW_PATTERN_CONTRACT,
  CCR_RESUME_AUTO_FOLLOW_PATTERN_CONTRACT,
  CCR_RESUME_FOLLOW_CONTRACT,
  CCR_STATS_CONTRACT,
  CCR_UNFOLLOW_CONTRACT,
  CLEAR_SCROLL_CONTRACT,
  CLOSE_POINT_IN_TIME_CONTRACT,
  CLUSTER_ALLOCATION_EXPLAIN_CONTRACT,
  CLUSTER_DELETE_COMPONENT_TEMPLATE_CONTRACT,
  CLUSTER_DELETE_VOTING_CONFIG_EXCLUSIONS_CONTRACT,
  CLUSTER_EXISTS_COMPONENT_TEMPLATE_CONTRACT,
  CLUSTER_GET_COMPONENT_TEMPLATE_CONTRACT,
  CLUSTER_GET_SETTINGS_CONTRACT,
  CLUSTER_HEALTH_CONTRACT,
  CLUSTER_INFO_CONTRACT,
  CLUSTER_PENDING_TASKS_CONTRACT,
  CLUSTER_POST_VOTING_CONFIG_EXCLUSIONS_CONTRACT,
  CLUSTER_PUT_COMPONENT_TEMPLATE_CONTRACT,
  CLUSTER_PUT_SETTINGS_CONTRACT,
  CLUSTER_REMOTE_INFO_CONTRACT,
  CLUSTER_REROUTE_CONTRACT,
  CLUSTER_STATE_CONTRACT,
  CLUSTER_STATS_CONTRACT,
  CONNECTOR_CHECK_IN_CONTRACT,
  CONNECTOR_DELETE_CONTRACT,
  CONNECTOR_GET_CONTRACT,
  CONNECTOR_LAST_SYNC_CONTRACT,
  CONNECTOR_LIST_CONTRACT,
  CONNECTOR_POST_CONTRACT,
  CONNECTOR_PUT_CONTRACT,
  CONNECTOR_SECRET_DELETE_CONTRACT,
  CONNECTOR_SECRET_GET_CONTRACT,
  CONNECTOR_SECRET_POST_CONTRACT,
  CONNECTOR_SECRET_PUT_CONTRACT,
  CONNECTOR_SYNC_JOB_CANCEL_CONTRACT,
  CONNECTOR_SYNC_JOB_CHECK_IN_CONTRACT,
  CONNECTOR_SYNC_JOB_CLAIM_CONTRACT,
  CONNECTOR_SYNC_JOB_DELETE_CONTRACT,
  CONNECTOR_SYNC_JOB_ERROR_CONTRACT,
  CONNECTOR_SYNC_JOB_GET_CONTRACT,
  CONNECTOR_SYNC_JOB_LIST_CONTRACT,
  CONNECTOR_SYNC_JOB_POST_CONTRACT,
  CONNECTOR_SYNC_JOB_UPDATE_STATS_CONTRACT,
  CONNECTOR_UPDATE_ACTIVE_FILTERING_CONTRACT,
  CONNECTOR_UPDATE_API_KEY_ID_CONTRACT,
  CONNECTOR_UPDATE_CONFIGURATION_CONTRACT,
  CONNECTOR_UPDATE_ERROR_CONTRACT,
  CONNECTOR_UPDATE_FEATURES_CONTRACT,
  CONNECTOR_UPDATE_FILTERING_CONTRACT,
  CONNECTOR_UPDATE_FILTERING_VALIDATION_CONTRACT,
  CONNECTOR_UPDATE_INDEX_NAME_CONTRACT,
  CONNECTOR_UPDATE_NAME_CONTRACT,
  CONNECTOR_UPDATE_NATIVE_CONTRACT,
  CONNECTOR_UPDATE_PIPELINE_CONTRACT,
  CONNECTOR_UPDATE_SCHEDULING_CONTRACT,
  CONNECTOR_UPDATE_SERVICE_TYPE_CONTRACT,
  CONNECTOR_UPDATE_STATUS_CONTRACT,
  COUNT_CONTRACT,
  CREATE_CONTRACT,
  DANGLING_INDICES_DELETE_DANGLING_INDEX_CONTRACT,
  DANGLING_INDICES_IMPORT_DANGLING_INDEX_CONTRACT,
  DANGLING_INDICES_LIST_DANGLING_INDICES_CONTRACT,
  DELETE_CONTRACT,
  DELETE_BY_QUERY_CONTRACT,
  DELETE_BY_QUERY_RETHROTTLE_CONTRACT,
  DELETE_SCRIPT_CONTRACT,
  ENRICH_DELETE_POLICY_CONTRACT,
  ENRICH_EXECUTE_POLICY_CONTRACT,
  ENRICH_GET_POLICY_CONTRACT,
  ENRICH_PUT_POLICY_CONTRACT,
  ENRICH_STATS_CONTRACT,
  EQL_DELETE_CONTRACT,
  EQL_GET_CONTRACT,
  EQL_GET_STATUS_CONTRACT,
  EQL_SEARCH_CONTRACT,
  ESQL_ASYNC_QUERY_CONTRACT,
  ESQL_ASYNC_QUERY_DELETE_CONTRACT,
  ESQL_ASYNC_QUERY_GET_CONTRACT,
  ESQL_ASYNC_QUERY_STOP_CONTRACT,
  ESQL_GET_QUERY_CONTRACT,
  ESQL_LIST_QUERIES_CONTRACT,
  ESQL_QUERY_CONTRACT,
  EXISTS_CONTRACT,
  EXISTS_SOURCE_CONTRACT,
  EXPLAIN_CONTRACT,
  FEATURES_GET_FEATURES_CONTRACT,
  FEATURES_RESET_FEATURES_CONTRACT,
  FIELD_CAPS_CONTRACT,
  FLEET_DELETE_SECRET_CONTRACT,
  FLEET_GET_SECRET_CONTRACT,
  FLEET_GLOBAL_CHECKPOINTS_CONTRACT,
  FLEET_MSEARCH_CONTRACT,
  FLEET_POST_SECRET_CONTRACT,
  FLEET_SEARCH_CONTRACT,
  GET_CONTRACT,
  GET_SCRIPT_CONTRACT,
  GET_SCRIPT_CONTEXT_CONTRACT,
  GET_SCRIPT_LANGUAGES_CONTRACT,
  GET_SOURCE_CONTRACT,
  GRAPH_EXPLORE_CONTRACT,
  HEALTH_REPORT_CONTRACT,
  ILM_DELETE_LIFECYCLE_CONTRACT,
  ILM_EXPLAIN_LIFECYCLE_CONTRACT,
  ILM_GET_LIFECYCLE_CONTRACT,
  ILM_GET_STATUS_CONTRACT,
  ILM_MIGRATE_TO_DATA_TIERS_CONTRACT,
  ILM_MOVE_TO_STEP_CONTRACT,
  ILM_PUT_LIFECYCLE_CONTRACT,
  ILM_REMOVE_POLICY_CONTRACT,
  ILM_RETRY_CONTRACT,
  ILM_START_CONTRACT,
  ILM_STOP_CONTRACT,
  INDEX_CONTRACT,
  INDICES_ADD_BLOCK_CONTRACT,
  INDICES_ANALYZE_CONTRACT,
  INDICES_CANCEL_MIGRATE_REINDEX_CONTRACT,
  INDICES_CLEAR_CACHE_CONTRACT,
  INDICES_CLONE_CONTRACT,
  INDICES_CLOSE_CONTRACT,
  INDICES_CREATE_CONTRACT,
  INDICES_CREATE_DATA_STREAM_CONTRACT,
  INDICES_CREATE_FROM_CONTRACT,
  INDICES_DATA_STREAMS_STATS_CONTRACT,
  INDICES_DELETE_CONTRACT,
  INDICES_DELETE_ALIAS_CONTRACT,
  INDICES_DELETE_DATA_LIFECYCLE_CONTRACT,
  INDICES_DELETE_DATA_STREAM_CONTRACT,
  INDICES_DELETE_DATA_STREAM_OPTIONS_CONTRACT,
  INDICES_DELETE_INDEX_TEMPLATE_CONTRACT,
  INDICES_DELETE_SAMPLE_CONFIGURATION_CONTRACT,
  INDICES_DELETE_TEMPLATE_CONTRACT,
  INDICES_DISK_USAGE_CONTRACT,
  INDICES_DOWNSAMPLE_CONTRACT,
  INDICES_EXISTS_CONTRACT,
  INDICES_EXISTS_ALIAS_CONTRACT,
  INDICES_EXISTS_INDEX_TEMPLATE_CONTRACT,
  INDICES_EXISTS_TEMPLATE_CONTRACT,
  INDICES_EXPLAIN_DATA_LIFECYCLE_CONTRACT,
  INDICES_FIELD_USAGE_STATS_CONTRACT,
  INDICES_FLUSH_CONTRACT,
  INDICES_FORCEMERGE_CONTRACT,
  INDICES_GET_CONTRACT,
  INDICES_GET_ALIAS_CONTRACT,
  INDICES_GET_ALL_SAMPLE_CONFIGURATION_CONTRACT,
  INDICES_GET_DATA_LIFECYCLE_CONTRACT,
  INDICES_GET_DATA_LIFECYCLE_STATS_CONTRACT,
  INDICES_GET_DATA_STREAM_CONTRACT,
  INDICES_GET_DATA_STREAM_MAPPINGS_CONTRACT,
  INDICES_GET_DATA_STREAM_OPTIONS_CONTRACT,
  INDICES_GET_DATA_STREAM_SETTINGS_CONTRACT,
  INDICES_GET_FIELD_MAPPING_CONTRACT,
  INDICES_GET_INDEX_TEMPLATE_CONTRACT,
  INDICES_GET_MAPPING_CONTRACT,
  INDICES_GET_MIGRATE_REINDEX_STATUS_CONTRACT,
  INDICES_GET_SAMPLE_CONTRACT,
  INDICES_GET_SAMPLE_CONFIGURATION_CONTRACT,
  INDICES_GET_SAMPLE_STATS_CONTRACT,
  INDICES_GET_SETTINGS_CONTRACT,
  INDICES_GET_TEMPLATE_CONTRACT,
  INDICES_MIGRATE_REINDEX_CONTRACT,
  INDICES_MIGRATE_TO_DATA_STREAM_CONTRACT,
  INDICES_MODIFY_DATA_STREAM_CONTRACT,
  INDICES_OPEN_CONTRACT,
  INDICES_PROMOTE_DATA_STREAM_CONTRACT,
  INDICES_PUT_ALIAS_CONTRACT,
  INDICES_PUT_DATA_LIFECYCLE_CONTRACT,
  INDICES_PUT_DATA_STREAM_MAPPINGS_CONTRACT,
  INDICES_PUT_DATA_STREAM_OPTIONS_CONTRACT,
  INDICES_PUT_DATA_STREAM_SETTINGS_CONTRACT,
  INDICES_PUT_INDEX_TEMPLATE_CONTRACT,
  INDICES_PUT_MAPPING_CONTRACT,
  INDICES_PUT_SAMPLE_CONFIGURATION_CONTRACT,
  INDICES_PUT_SETTINGS_CONTRACT,
  INDICES_PUT_TEMPLATE_CONTRACT,
  INDICES_RECOVERY_CONTRACT,
  INDICES_REFRESH_CONTRACT,
  INDICES_RELOAD_SEARCH_ANALYZERS_CONTRACT,
  INDICES_REMOVE_BLOCK_CONTRACT,
  INDICES_RESOLVE_CLUSTER_CONTRACT,
  INDICES_RESOLVE_INDEX_CONTRACT,
  INDICES_ROLLOVER_CONTRACT,
  INDICES_SEGMENTS_CONTRACT,
  INDICES_SHARD_STORES_CONTRACT,
  INDICES_SHRINK_CONTRACT,
  INDICES_SIMULATE_INDEX_TEMPLATE_CONTRACT,
  INDICES_SIMULATE_TEMPLATE_CONTRACT,
  INDICES_SPLIT_CONTRACT,
  INDICES_STATS_CONTRACT,
  INDICES_UPDATE_ALIASES_CONTRACT,
  INDICES_VALIDATE_QUERY_CONTRACT,
  INFERENCE_CHAT_COMPLETION_UNIFIED_CONTRACT,
  INFERENCE_COMPLETION_CONTRACT,
  INFERENCE_DELETE_CONTRACT,
  INFERENCE_GET_CONTRACT,
  INFERENCE_INFERENCE_CONTRACT,
  INFERENCE_PUT_CONTRACT,
  INFERENCE_PUT_AI21_CONTRACT,
  INFERENCE_PUT_ALIBABACLOUD_CONTRACT,
  INFERENCE_PUT_AMAZONBEDROCK_CONTRACT,
  INFERENCE_PUT_AMAZONSAGEMAKER_CONTRACT,
  INFERENCE_PUT_ANTHROPIC_CONTRACT,
  INFERENCE_PUT_AZUREAISTUDIO_CONTRACT,
  INFERENCE_PUT_AZUREOPENAI_CONTRACT,
  INFERENCE_PUT_COHERE_CONTRACT,
  INFERENCE_PUT_CONTEXTUALAI_CONTRACT,
  INFERENCE_PUT_CUSTOM_CONTRACT,
  INFERENCE_PUT_DEEPSEEK_CONTRACT,
  INFERENCE_PUT_ELASTICSEARCH_CONTRACT,
  INFERENCE_PUT_ELSER_CONTRACT,
  INFERENCE_PUT_GOOGLEAISTUDIO_CONTRACT,
  INFERENCE_PUT_GOOGLEVERTEXAI_CONTRACT,
  INFERENCE_PUT_HUGGING_FACE_CONTRACT,
  INFERENCE_PUT_JINAAI_CONTRACT,
  INFERENCE_PUT_LLAMA_CONTRACT,
  INFERENCE_PUT_MISTRAL_CONTRACT,
  INFERENCE_PUT_OPENAI_CONTRACT,
  INFERENCE_PUT_OPENSHIFT_AI_CONTRACT,
  INFERENCE_PUT_VOYAGEAI_CONTRACT,
  INFERENCE_PUT_WATSONX_CONTRACT,
  INFERENCE_RERANK_CONTRACT,
  INFERENCE_SPARSE_EMBEDDING_CONTRACT,
  INFERENCE_STREAM_COMPLETION_CONTRACT,
  INFERENCE_TEXT_EMBEDDING_CONTRACT,
  INFERENCE_UPDATE_CONTRACT,
  INFO_CONTRACT,
  INGEST_DELETE_GEOIP_DATABASE_CONTRACT,
  INGEST_DELETE_IP_LOCATION_DATABASE_CONTRACT,
  INGEST_DELETE_PIPELINE_CONTRACT,
  INGEST_GEO_IP_STATS_CONTRACT,
  INGEST_GET_GEOIP_DATABASE_CONTRACT,
  INGEST_GET_IP_LOCATION_DATABASE_CONTRACT,
  INGEST_GET_PIPELINE_CONTRACT,
  INGEST_PROCESSOR_GROK_CONTRACT,
  INGEST_PUT_GEOIP_DATABASE_CONTRACT,
  INGEST_PUT_IP_LOCATION_DATABASE_CONTRACT,
  INGEST_PUT_PIPELINE_CONTRACT,
  INGEST_SIMULATE_CONTRACT,
  KNN_SEARCH_CONTRACT,
  LICENSE_DELETE_CONTRACT,
  LICENSE_GET_CONTRACT,
  LICENSE_GET_BASIC_STATUS_CONTRACT,
  LICENSE_GET_TRIAL_STATUS_CONTRACT,
  LICENSE_POST_CONTRACT,
  LICENSE_POST_START_BASIC_CONTRACT,
  LICENSE_POST_START_TRIAL_CONTRACT,
  LOGSTASH_DELETE_PIPELINE_CONTRACT,
  LOGSTASH_GET_PIPELINE_CONTRACT,
  LOGSTASH_PUT_PIPELINE_CONTRACT,
  MGET_CONTRACT,
  MIGRATION_DEPRECATIONS_CONTRACT,
  MIGRATION_GET_FEATURE_UPGRADE_STATUS_CONTRACT,
  MIGRATION_POST_FEATURE_UPGRADE_CONTRACT,
  ML_CLEAR_TRAINED_MODEL_DEPLOYMENT_CACHE_CONTRACT,
  ML_CLOSE_JOB_CONTRACT,
  ML_DELETE_CALENDAR_CONTRACT,
  ML_DELETE_CALENDAR_EVENT_CONTRACT,
  ML_DELETE_CALENDAR_JOB_CONTRACT,
  ML_DELETE_DATA_FRAME_ANALYTICS_CONTRACT,
  ML_DELETE_DATAFEED_CONTRACT,
  ML_DELETE_EXPIRED_DATA_CONTRACT,
  ML_DELETE_FILTER_CONTRACT,
  ML_DELETE_FORECAST_CONTRACT,
  ML_DELETE_JOB_CONTRACT,
  ML_DELETE_MODEL_SNAPSHOT_CONTRACT,
  ML_DELETE_TRAINED_MODEL_CONTRACT,
  ML_DELETE_TRAINED_MODEL_ALIAS_CONTRACT,
  ML_ESTIMATE_MODEL_MEMORY_CONTRACT,
  ML_EVALUATE_DATA_FRAME_CONTRACT,
  ML_EXPLAIN_DATA_FRAME_ANALYTICS_CONTRACT,
  ML_FLUSH_JOB_CONTRACT,
  ML_FORECAST_CONTRACT,
  ML_GET_BUCKETS_CONTRACT,
  ML_GET_CALENDAR_EVENTS_CONTRACT,
  ML_GET_CALENDARS_CONTRACT,
  ML_GET_CATEGORIES_CONTRACT,
  ML_GET_DATA_FRAME_ANALYTICS_CONTRACT,
  ML_GET_DATA_FRAME_ANALYTICS_STATS_CONTRACT,
  ML_GET_DATAFEED_STATS_CONTRACT,
  ML_GET_DATAFEEDS_CONTRACT,
  ML_GET_FILTERS_CONTRACT,
  ML_GET_INFLUENCERS_CONTRACT,
  ML_GET_JOB_STATS_CONTRACT,
  ML_GET_JOBS_CONTRACT,
  ML_GET_MEMORY_STATS_CONTRACT,
  ML_GET_MODEL_SNAPSHOT_UPGRADE_STATS_CONTRACT,
  ML_GET_MODEL_SNAPSHOTS_CONTRACT,
  ML_GET_OVERALL_BUCKETS_CONTRACT,
  ML_GET_RECORDS_CONTRACT,
  ML_GET_TRAINED_MODELS_CONTRACT,
  ML_GET_TRAINED_MODELS_STATS_CONTRACT,
  ML_INFER_TRAINED_MODEL_CONTRACT,
  ML_INFO_CONTRACT,
  ML_OPEN_JOB_CONTRACT,
  ML_POST_CALENDAR_EVENTS_CONTRACT,
  ML_POST_DATA_CONTRACT,
  ML_PREVIEW_DATA_FRAME_ANALYTICS_CONTRACT,
  ML_PREVIEW_DATAFEED_CONTRACT,
  ML_PUT_CALENDAR_CONTRACT,
  ML_PUT_CALENDAR_JOB_CONTRACT,
  ML_PUT_DATA_FRAME_ANALYTICS_CONTRACT,
  ML_PUT_DATAFEED_CONTRACT,
  ML_PUT_FILTER_CONTRACT,
  ML_PUT_JOB_CONTRACT,
  ML_PUT_TRAINED_MODEL_CONTRACT,
  ML_PUT_TRAINED_MODEL_ALIAS_CONTRACT,
  ML_PUT_TRAINED_MODEL_DEFINITION_PART_CONTRACT,
  ML_PUT_TRAINED_MODEL_VOCABULARY_CONTRACT,
  ML_RESET_JOB_CONTRACT,
  ML_REVERT_MODEL_SNAPSHOT_CONTRACT,
  ML_SET_UPGRADE_MODE_CONTRACT,
  ML_START_DATA_FRAME_ANALYTICS_CONTRACT,
  ML_START_DATAFEED_CONTRACT,
  ML_START_TRAINED_MODEL_DEPLOYMENT_CONTRACT,
  ML_STOP_DATA_FRAME_ANALYTICS_CONTRACT,
  ML_STOP_DATAFEED_CONTRACT,
  ML_STOP_TRAINED_MODEL_DEPLOYMENT_CONTRACT,
  ML_UPDATE_DATA_FRAME_ANALYTICS_CONTRACT,
  ML_UPDATE_DATAFEED_CONTRACT,
  ML_UPDATE_FILTER_CONTRACT,
  ML_UPDATE_JOB_CONTRACT,
  ML_UPDATE_MODEL_SNAPSHOT_CONTRACT,
  ML_UPDATE_TRAINED_MODEL_DEPLOYMENT_CONTRACT,
  ML_UPGRADE_JOB_SNAPSHOT_CONTRACT,
  ML_VALIDATE_CONTRACT,
  ML_VALIDATE_DETECTOR_CONTRACT,
  MONITORING_BULK_CONTRACT,
  MSEARCH_CONTRACT,
  MSEARCH_TEMPLATE_CONTRACT,
  MTERMVECTORS_CONTRACT,
  NODES_CLEAR_REPOSITORIES_METERING_ARCHIVE_CONTRACT,
  NODES_GET_REPOSITORIES_METERING_INFO_CONTRACT,
  NODES_HOT_THREADS_CONTRACT,
  NODES_INFO_CONTRACT,
  NODES_RELOAD_SECURE_SETTINGS_CONTRACT,
  NODES_STATS_CONTRACT,
  NODES_USAGE_CONTRACT,
  OPEN_POINT_IN_TIME_CONTRACT,
  PING_CONTRACT,
  PROFILING_FLAMEGRAPH_CONTRACT,
  PROFILING_STACKTRACES_CONTRACT,
  PROFILING_STATUS_CONTRACT,
  PROFILING_TOPN_FUNCTIONS_CONTRACT,
  PROJECT_TAGS_CONTRACT,
  PUT_SCRIPT_CONTRACT,
  QUERY_RULES_DELETE_RULE_CONTRACT,
  QUERY_RULES_DELETE_RULESET_CONTRACT,
  QUERY_RULES_GET_RULE_CONTRACT,
  QUERY_RULES_GET_RULESET_CONTRACT,
  QUERY_RULES_LIST_RULESETS_CONTRACT,
  QUERY_RULES_PUT_RULE_CONTRACT,
  QUERY_RULES_PUT_RULESET_CONTRACT,
  QUERY_RULES_TEST_CONTRACT,
  RANK_EVAL_CONTRACT,
  REINDEX_CONTRACT,
  REINDEX_RETHROTTLE_CONTRACT,
  RENDER_SEARCH_TEMPLATE_CONTRACT,
  ROLLUP_DELETE_JOB_CONTRACT,
  ROLLUP_GET_JOBS_CONTRACT,
  ROLLUP_GET_ROLLUP_CAPS_CONTRACT,
  ROLLUP_GET_ROLLUP_INDEX_CAPS_CONTRACT,
  ROLLUP_PUT_JOB_CONTRACT,
  ROLLUP_ROLLUP_SEARCH_CONTRACT,
  ROLLUP_START_JOB_CONTRACT,
  ROLLUP_STOP_JOB_CONTRACT,
  SCRIPTS_PAINLESS_EXECUTE_CONTRACT,
  SCROLL_CONTRACT,
  SEARCH_CONTRACT,
  SEARCH_APPLICATION_DELETE_CONTRACT,
  SEARCH_APPLICATION_DELETE_BEHAVIORAL_ANALYTICS_CONTRACT,
  SEARCH_APPLICATION_GET_CONTRACT,
  SEARCH_APPLICATION_GET_BEHAVIORAL_ANALYTICS_CONTRACT,
  SEARCH_APPLICATION_LIST_CONTRACT,
  SEARCH_APPLICATION_POST_BEHAVIORAL_ANALYTICS_EVENT_CONTRACT,
  SEARCH_APPLICATION_PUT_CONTRACT,
  SEARCH_APPLICATION_PUT_BEHAVIORAL_ANALYTICS_CONTRACT,
  SEARCH_APPLICATION_RENDER_QUERY_CONTRACT,
  SEARCH_APPLICATION_SEARCH_CONTRACT,
  SEARCH_MVT_CONTRACT,
  SEARCH_SHARDS_CONTRACT,
  SEARCH_TEMPLATE_CONTRACT,
  SEARCHABLE_SNAPSHOTS_CACHE_STATS_CONTRACT,
  SEARCHABLE_SNAPSHOTS_CLEAR_CACHE_CONTRACT,
  SEARCHABLE_SNAPSHOTS_MOUNT_CONTRACT,
  SEARCHABLE_SNAPSHOTS_STATS_CONTRACT,
  SECURITY_ACTIVATE_USER_PROFILE_CONTRACT,
  SECURITY_AUTHENTICATE_CONTRACT,
  SECURITY_BULK_DELETE_ROLE_CONTRACT,
  SECURITY_BULK_PUT_ROLE_CONTRACT,
  SECURITY_BULK_UPDATE_API_KEYS_CONTRACT,
  SECURITY_CHANGE_PASSWORD_CONTRACT,
  SECURITY_CLEAR_API_KEY_CACHE_CONTRACT,
  SECURITY_CLEAR_CACHED_PRIVILEGES_CONTRACT,
  SECURITY_CLEAR_CACHED_REALMS_CONTRACT,
  SECURITY_CLEAR_CACHED_ROLES_CONTRACT,
  SECURITY_CLEAR_CACHED_SERVICE_TOKENS_CONTRACT,
  SECURITY_CREATE_API_KEY_CONTRACT,
  SECURITY_CREATE_CROSS_CLUSTER_API_KEY_CONTRACT,
  SECURITY_CREATE_SERVICE_TOKEN_CONTRACT,
  SECURITY_DELEGATE_PKI_CONTRACT,
  SECURITY_DELETE_PRIVILEGES_CONTRACT,
  SECURITY_DELETE_ROLE_CONTRACT,
  SECURITY_DELETE_ROLE_MAPPING_CONTRACT,
  SECURITY_DELETE_SERVICE_TOKEN_CONTRACT,
  SECURITY_DELETE_USER_CONTRACT,
  SECURITY_DISABLE_USER_CONTRACT,
  SECURITY_DISABLE_USER_PROFILE_CONTRACT,
  SECURITY_ENABLE_USER_CONTRACT,
  SECURITY_ENABLE_USER_PROFILE_CONTRACT,
  SECURITY_ENROLL_KIBANA_CONTRACT,
  SECURITY_ENROLL_NODE_CONTRACT,
  SECURITY_GET_API_KEY_CONTRACT,
  SECURITY_GET_BUILTIN_PRIVILEGES_CONTRACT,
  SECURITY_GET_PRIVILEGES_CONTRACT,
  SECURITY_GET_ROLE_CONTRACT,
  SECURITY_GET_ROLE_MAPPING_CONTRACT,
  SECURITY_GET_SERVICE_ACCOUNTS_CONTRACT,
  SECURITY_GET_SERVICE_CREDENTIALS_CONTRACT,
  SECURITY_GET_SETTINGS_CONTRACT,
  SECURITY_GET_STATS_CONTRACT,
  SECURITY_GET_TOKEN_CONTRACT,
  SECURITY_GET_USER_CONTRACT,
  SECURITY_GET_USER_PRIVILEGES_CONTRACT,
  SECURITY_GET_USER_PROFILE_CONTRACT,
  SECURITY_GRANT_API_KEY_CONTRACT,
  SECURITY_HAS_PRIVILEGES_CONTRACT,
  SECURITY_HAS_PRIVILEGES_USER_PROFILE_CONTRACT,
  SECURITY_INVALIDATE_API_KEY_CONTRACT,
  SECURITY_INVALIDATE_TOKEN_CONTRACT,
  SECURITY_OIDC_AUTHENTICATE_CONTRACT,
  SECURITY_OIDC_LOGOUT_CONTRACT,
  SECURITY_OIDC_PREPARE_AUTHENTICATION_CONTRACT,
  SECURITY_PUT_PRIVILEGES_CONTRACT,
  SECURITY_PUT_ROLE_CONTRACT,
  SECURITY_PUT_ROLE_MAPPING_CONTRACT,
  SECURITY_PUT_USER_CONTRACT,
  SECURITY_QUERY_API_KEYS_CONTRACT,
  SECURITY_QUERY_ROLE_CONTRACT,
  SECURITY_QUERY_USER_CONTRACT,
  SECURITY_SAML_AUTHENTICATE_CONTRACT,
  SECURITY_SAML_COMPLETE_LOGOUT_CONTRACT,
  SECURITY_SAML_INVALIDATE_CONTRACT,
  SECURITY_SAML_LOGOUT_CONTRACT,
  SECURITY_SAML_PREPARE_AUTHENTICATION_CONTRACT,
  SECURITY_SAML_SERVICE_PROVIDER_METADATA_CONTRACT,
  SECURITY_SUGGEST_USER_PROFILES_CONTRACT,
  SECURITY_UPDATE_API_KEY_CONTRACT,
  SECURITY_UPDATE_CROSS_CLUSTER_API_KEY_CONTRACT,
  SECURITY_UPDATE_SETTINGS_CONTRACT,
  SECURITY_UPDATE_USER_PROFILE_DATA_CONTRACT,
  SHUTDOWN_DELETE_NODE_CONTRACT,
  SHUTDOWN_GET_NODE_CONTRACT,
  SHUTDOWN_PUT_NODE_CONTRACT,
  SIMULATE_INGEST_CONTRACT,
  SLM_DELETE_LIFECYCLE_CONTRACT,
  SLM_EXECUTE_LIFECYCLE_CONTRACT,
  SLM_EXECUTE_RETENTION_CONTRACT,
  SLM_GET_LIFECYCLE_CONTRACT,
  SLM_GET_STATS_CONTRACT,
  SLM_GET_STATUS_CONTRACT,
  SLM_PUT_LIFECYCLE_CONTRACT,
  SLM_START_CONTRACT,
  SLM_STOP_CONTRACT,
  SNAPSHOT_CLEANUP_REPOSITORY_CONTRACT,
  SNAPSHOT_CLONE_CONTRACT,
  SNAPSHOT_CREATE_CONTRACT,
  SNAPSHOT_CREATE_REPOSITORY_CONTRACT,
  SNAPSHOT_DELETE_CONTRACT,
  SNAPSHOT_DELETE_REPOSITORY_CONTRACT,
  SNAPSHOT_GET_CONTRACT,
  SNAPSHOT_GET_REPOSITORY_CONTRACT,
  SNAPSHOT_REPOSITORY_ANALYZE_CONTRACT,
  SNAPSHOT_REPOSITORY_VERIFY_INTEGRITY_CONTRACT,
  SNAPSHOT_RESTORE_CONTRACT,
  SNAPSHOT_STATUS_CONTRACT,
  SNAPSHOT_VERIFY_REPOSITORY_CONTRACT,
  SQL_CLEAR_CURSOR_CONTRACT,
  SQL_DELETE_ASYNC_CONTRACT,
  SQL_GET_ASYNC_CONTRACT,
  SQL_GET_ASYNC_STATUS_CONTRACT,
  SQL_QUERY_CONTRACT,
  SQL_TRANSLATE_CONTRACT,
  SSL_CERTIFICATES_CONTRACT,
  STREAMS_LOGS_DISABLE_CONTRACT,
  STREAMS_LOGS_ENABLE_CONTRACT,
  STREAMS_STATUS_CONTRACT,
  SYNONYMS_DELETE_SYNONYM_CONTRACT,
  SYNONYMS_DELETE_SYNONYM_RULE_CONTRACT,
  SYNONYMS_GET_SYNONYM_CONTRACT,
  SYNONYMS_GET_SYNONYM_RULE_CONTRACT,
  SYNONYMS_GET_SYNONYMS_SETS_CONTRACT,
  SYNONYMS_PUT_SYNONYM_CONTRACT,
  SYNONYMS_PUT_SYNONYM_RULE_CONTRACT,
  TASKS_CANCEL_CONTRACT,
  TASKS_GET_CONTRACT,
  TASKS_LIST_CONTRACT,
  TERMS_ENUM_CONTRACT,
  TERMVECTORS_CONTRACT,
  TEXT_STRUCTURE_FIND_FIELD_STRUCTURE_CONTRACT,
  TEXT_STRUCTURE_FIND_MESSAGE_STRUCTURE_CONTRACT,
  TEXT_STRUCTURE_FIND_STRUCTURE_CONTRACT,
  TEXT_STRUCTURE_TEST_GROK_PATTERN_CONTRACT,
  TRANSFORM_DELETE_TRANSFORM_CONTRACT,
  TRANSFORM_GET_NODE_STATS_CONTRACT,
  TRANSFORM_GET_TRANSFORM_CONTRACT,
  TRANSFORM_GET_TRANSFORM_STATS_CONTRACT,
  TRANSFORM_PREVIEW_TRANSFORM_CONTRACT,
  TRANSFORM_PUT_TRANSFORM_CONTRACT,
  TRANSFORM_RESET_TRANSFORM_CONTRACT,
  TRANSFORM_SCHEDULE_NOW_TRANSFORM_CONTRACT,
  TRANSFORM_SET_UPGRADE_MODE_CONTRACT,
  TRANSFORM_START_TRANSFORM_CONTRACT,
  TRANSFORM_STOP_TRANSFORM_CONTRACT,
  TRANSFORM_UPDATE_TRANSFORM_CONTRACT,
  TRANSFORM_UPGRADE_TRANSFORMS_CONTRACT,
  UPDATE_CONTRACT,
  UPDATE_BY_QUERY_CONTRACT,
  UPDATE_BY_QUERY_RETHROTTLE_CONTRACT,
  WATCHER_ACK_WATCH_CONTRACT,
  WATCHER_ACTIVATE_WATCH_CONTRACT,
  WATCHER_DEACTIVATE_WATCH_CONTRACT,
  WATCHER_DELETE_WATCH_CONTRACT,
  WATCHER_EXECUTE_WATCH_CONTRACT,
  WATCHER_GET_SETTINGS_CONTRACT,
  WATCHER_GET_WATCH_CONTRACT,
  WATCHER_PUT_WATCH_CONTRACT,
  WATCHER_QUERY_WATCHES_CONTRACT,
  WATCHER_START_CONTRACT,
  WATCHER_STATS_CONTRACT,
  WATCHER_STOP_CONTRACT,
  WATCHER_UPDATE_SETTINGS_CONTRACT,
  XPACK_INFO_CONTRACT,
  XPACK_USAGE_CONTRACT,
];
