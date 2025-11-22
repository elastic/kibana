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
 * Generated at: 2025-11-21T23:59:35.484Z
 * Source: elasticsearch-specification repository (582 APIs)
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';
import {
  async_search_delete_request,
  async_search_delete_response,
  async_search_get_request,
  async_search_get_response,
  async_search_status_request,
  async_search_status_response,
  async_search_submit1_request,
  async_search_submit1_response,
  async_search_submit_request,
  async_search_submit_response,
  bulk1_request,
  bulk1_response,
  bulk2_request,
  bulk2_response,
  bulk3_request,
  bulk3_response,
  bulk_request,
  bulk_response,
  cat_aliases1_request,
  cat_aliases1_response,
  cat_aliases_request,
  cat_aliases_response,
  cat_allocation1_request,
  cat_allocation1_response,
  cat_allocation_request,
  cat_allocation_response,
  cat_component_templates1_request,
  cat_component_templates1_response,
  cat_component_templates_request,
  cat_component_templates_response,
  cat_count1_request,
  cat_count1_response,
  cat_count_request,
  cat_count_response,
  cat_fielddata1_request,
  cat_fielddata1_response,
  cat_fielddata_request,
  cat_fielddata_response,
  cat_health_request,
  cat_health_response,
  cat_help_request,
  cat_help_response,
  cat_indices1_request,
  cat_indices1_response,
  cat_indices_request,
  cat_indices_response,
  cat_master_request,
  cat_master_response,
  cat_ml_data_frame_analytics1_request,
  cat_ml_data_frame_analytics1_response,
  cat_ml_data_frame_analytics_request,
  cat_ml_data_frame_analytics_response,
  cat_ml_datafeeds1_request,
  cat_ml_datafeeds1_response,
  cat_ml_datafeeds_request,
  cat_ml_datafeeds_response,
  cat_ml_jobs1_request,
  cat_ml_jobs1_response,
  cat_ml_jobs_request,
  cat_ml_jobs_response,
  cat_ml_trained_models1_request,
  cat_ml_trained_models1_response,
  cat_ml_trained_models_request,
  cat_ml_trained_models_response,
  cat_nodeattrs_request,
  cat_nodeattrs_response,
  cat_nodes_request,
  cat_nodes_response,
  cat_pending_tasks_request,
  cat_pending_tasks_response,
  cat_plugins_request,
  cat_plugins_response,
  cat_recovery1_request,
  cat_recovery1_response,
  cat_recovery_request,
  cat_recovery_response,
  cat_repositories_request,
  cat_repositories_response,
  cat_segments1_request,
  cat_segments1_response,
  cat_segments_request,
  cat_segments_response,
  cat_shards1_request,
  cat_shards1_response,
  cat_shards_request,
  cat_shards_response,
  cat_snapshots1_request,
  cat_snapshots1_response,
  cat_snapshots_request,
  cat_snapshots_response,
  cat_tasks_request,
  cat_tasks_response,
  cat_templates1_request,
  cat_templates1_response,
  cat_templates_request,
  cat_templates_response,
  cat_thread_pool1_request,
  cat_thread_pool1_response,
  cat_thread_pool_request,
  cat_thread_pool_response,
  cat_transforms1_request,
  cat_transforms1_response,
  cat_transforms_request,
  cat_transforms_response,
  ccr_delete_auto_follow_pattern_request,
  ccr_delete_auto_follow_pattern_response,
  ccr_follow_info_request,
  ccr_follow_info_response,
  ccr_follow_request,
  ccr_follow_response,
  ccr_follow_stats_request,
  ccr_follow_stats_response,
  ccr_forget_follower_request,
  ccr_forget_follower_response,
  ccr_get_auto_follow_pattern1_request,
  ccr_get_auto_follow_pattern1_response,
  ccr_get_auto_follow_pattern_request,
  ccr_get_auto_follow_pattern_response,
  ccr_pause_auto_follow_pattern_request,
  ccr_pause_auto_follow_pattern_response,
  ccr_pause_follow_request,
  ccr_pause_follow_response,
  ccr_put_auto_follow_pattern_request,
  ccr_put_auto_follow_pattern_response,
  ccr_resume_auto_follow_pattern_request,
  ccr_resume_auto_follow_pattern_response,
  ccr_resume_follow_request,
  ccr_resume_follow_response,
  ccr_stats_request,
  ccr_stats_response,
  ccr_unfollow_request,
  ccr_unfollow_response,
  clear_scroll1_request,
  clear_scroll1_response,
  clear_scroll_request,
  clear_scroll_response,
  close_point_in_time_request,
  close_point_in_time_response,
  cluster_allocation_explain1_request,
  cluster_allocation_explain1_response,
  cluster_allocation_explain_request,
  cluster_allocation_explain_response,
  cluster_delete_component_template_request,
  cluster_delete_component_template_response,
  cluster_delete_voting_config_exclusions_request,
  cluster_delete_voting_config_exclusions_response,
  cluster_exists_component_template_request,
  cluster_exists_component_template_response,
  cluster_get_component_template1_request,
  cluster_get_component_template1_response,
  cluster_get_component_template_request,
  cluster_get_component_template_response,
  cluster_get_settings_request,
  cluster_get_settings_response,
  cluster_health1_request,
  cluster_health1_response,
  cluster_health_request,
  cluster_health_response,
  cluster_info_request,
  cluster_info_response,
  cluster_pending_tasks_request,
  cluster_pending_tasks_response,
  cluster_post_voting_config_exclusions_request,
  cluster_post_voting_config_exclusions_response,
  cluster_put_component_template1_request,
  cluster_put_component_template1_response,
  cluster_put_component_template_request,
  cluster_put_component_template_response,
  cluster_put_settings_request,
  cluster_put_settings_response,
  cluster_remote_info_request,
  cluster_remote_info_response,
  cluster_reroute_request,
  cluster_reroute_response,
  cluster_state1_request,
  cluster_state1_response,
  cluster_state2_request,
  cluster_state2_response,
  cluster_state_request,
  cluster_state_response,
  cluster_stats1_request,
  cluster_stats1_response,
  cluster_stats_request,
  cluster_stats_response,
  connector_check_in_request,
  connector_check_in_response,
  connector_delete_request,
  connector_delete_response,
  connector_get_request,
  connector_get_response,
  connector_list_request,
  connector_list_response,
  connector_post_request,
  connector_post_response,
  connector_put1_request,
  connector_put1_response,
  connector_put_request,
  connector_put_response,
  connector_sync_job_cancel_request,
  connector_sync_job_cancel_response,
  connector_sync_job_check_in_request,
  connector_sync_job_check_in_response,
  connector_sync_job_claim_request,
  connector_sync_job_claim_response,
  connector_sync_job_delete_request,
  connector_sync_job_delete_response,
  connector_sync_job_error_request,
  connector_sync_job_error_response,
  connector_sync_job_get_request,
  connector_sync_job_get_response,
  connector_sync_job_list_request,
  connector_sync_job_list_response,
  connector_sync_job_post_request,
  connector_sync_job_post_response,
  connector_sync_job_update_stats_request,
  connector_sync_job_update_stats_response,
  connector_update_active_filtering_request,
  connector_update_active_filtering_response,
  connector_update_api_key_id_request,
  connector_update_api_key_id_response,
  connector_update_configuration_request,
  connector_update_configuration_response,
  connector_update_error_request,
  connector_update_error_response,
  connector_update_features_request,
  connector_update_features_response,
  connector_update_filtering_request,
  connector_update_filtering_response,
  connector_update_filtering_validation_request,
  connector_update_filtering_validation_response,
  connector_update_index_name_request,
  connector_update_index_name_response,
  connector_update_name_request,
  connector_update_name_response,
  connector_update_native_request,
  connector_update_native_response,
  connector_update_pipeline_request,
  connector_update_pipeline_response,
  connector_update_scheduling_request,
  connector_update_scheduling_response,
  connector_update_service_type_request,
  connector_update_service_type_response,
  connector_update_status_request,
  connector_update_status_response,
  count1_request,
  count1_response,
  count2_request,
  count2_response,
  count3_request,
  count3_response,
  count_request,
  count_response,
  create1_request,
  create1_response,
  create_request,
  create_response,
  dangling_indices_delete_dangling_index_request,
  dangling_indices_delete_dangling_index_response,
  dangling_indices_import_dangling_index_request,
  dangling_indices_import_dangling_index_response,
  dangling_indices_list_dangling_indices_request,
  dangling_indices_list_dangling_indices_response,
  delete_by_query_request,
  delete_by_query_response,
  delete_by_query_rethrottle_request,
  delete_by_query_rethrottle_response,
  delete_request,
  delete_response,
  delete_script_request,
  delete_script_response,
  enrich_delete_policy_request,
  enrich_delete_policy_response,
  enrich_execute_policy_request,
  enrich_execute_policy_response,
  enrich_get_policy1_request,
  enrich_get_policy1_response,
  enrich_get_policy_request,
  enrich_get_policy_response,
  enrich_put_policy_request,
  enrich_put_policy_response,
  enrich_stats_request,
  enrich_stats_response,
  eql_delete_request,
  eql_delete_response,
  eql_get_request,
  eql_get_response,
  eql_get_status_request,
  eql_get_status_response,
  eql_search1_request,
  eql_search1_response,
  eql_search_request,
  eql_search_response,
  esql_async_query_delete_request,
  esql_async_query_delete_response,
  esql_async_query_get_request,
  esql_async_query_get_response,
  esql_async_query_request,
  esql_async_query_response,
  esql_async_query_stop_request,
  esql_async_query_stop_response,
  esql_get_query_request,
  esql_get_query_response,
  esql_list_queries_request,
  esql_list_queries_response,
  esql_query_request,
  esql_query_response,
  exists_request,
  exists_response,
  exists_source_request,
  exists_source_response,
  explain1_request,
  explain1_response,
  explain_request,
  explain_response,
  features_get_features_request,
  features_get_features_response,
  features_reset_features_request,
  features_reset_features_response,
  field_caps1_request,
  field_caps1_response,
  field_caps2_request,
  field_caps2_response,
  field_caps3_request,
  field_caps3_response,
  field_caps_request,
  field_caps_response,
  fleet_global_checkpoints_request,
  fleet_global_checkpoints_response,
  fleet_msearch1_request,
  fleet_msearch1_response,
  fleet_msearch2_request,
  fleet_msearch2_response,
  fleet_msearch3_request,
  fleet_msearch3_response,
  fleet_msearch_request,
  fleet_msearch_response,
  fleet_search1_request,
  fleet_search1_response,
  fleet_search_request,
  fleet_search_response,
  get_request,
  get_response,
  get_script_context_request,
  get_script_context_response,
  get_script_languages_request,
  get_script_languages_response,
  get_script_request,
  get_script_response,
  get_source_request,
  get_source_response,
  graph_explore1_request,
  graph_explore1_response,
  graph_explore_request,
  graph_explore_response,
  health_report1_request,
  health_report1_response,
  health_report_request,
  health_report_response,
  ilm_delete_lifecycle_request,
  ilm_delete_lifecycle_response,
  ilm_explain_lifecycle_request,
  ilm_explain_lifecycle_response,
  ilm_get_lifecycle1_request,
  ilm_get_lifecycle1_response,
  ilm_get_lifecycle_request,
  ilm_get_lifecycle_response,
  ilm_get_status_request,
  ilm_get_status_response,
  ilm_migrate_to_data_tiers_request,
  ilm_migrate_to_data_tiers_response,
  ilm_move_to_step_request,
  ilm_move_to_step_response,
  ilm_put_lifecycle_request,
  ilm_put_lifecycle_response,
  ilm_remove_policy_request,
  ilm_remove_policy_response,
  ilm_retry_request,
  ilm_retry_response,
  ilm_start_request,
  ilm_start_response,
  ilm_stop_request,
  ilm_stop_response,
  index1_request,
  index1_response,
  index2_request,
  index2_response,
  index_request,
  index_response,
  indices_add_block_request,
  indices_add_block_response,
  indices_analyze1_request,
  indices_analyze1_response,
  indices_analyze2_request,
  indices_analyze2_response,
  indices_analyze3_request,
  indices_analyze3_response,
  indices_analyze_request,
  indices_analyze_response,
  indices_cancel_migrate_reindex_request,
  indices_cancel_migrate_reindex_response,
  indices_clear_cache1_request,
  indices_clear_cache1_response,
  indices_clear_cache_request,
  indices_clear_cache_response,
  indices_clone1_request,
  indices_clone1_response,
  indices_clone_request,
  indices_clone_response,
  indices_close_request,
  indices_close_response,
  indices_create_data_stream_request,
  indices_create_data_stream_response,
  indices_create_from1_request,
  indices_create_from1_response,
  indices_create_from_request,
  indices_create_from_response,
  indices_create_request,
  indices_create_response,
  indices_data_streams_stats1_request,
  indices_data_streams_stats1_response,
  indices_data_streams_stats_request,
  indices_data_streams_stats_response,
  indices_delete_alias1_request,
  indices_delete_alias1_response,
  indices_delete_alias_request,
  indices_delete_alias_response,
  indices_delete_data_lifecycle_request,
  indices_delete_data_lifecycle_response,
  indices_delete_data_stream_options_request,
  indices_delete_data_stream_options_response,
  indices_delete_data_stream_request,
  indices_delete_data_stream_response,
  indices_delete_index_template_request,
  indices_delete_index_template_response,
  indices_delete_request,
  indices_delete_response,
  indices_delete_template_request,
  indices_delete_template_response,
  indices_disk_usage_request,
  indices_disk_usage_response,
  indices_downsample_request,
  indices_downsample_response,
  indices_exists_alias1_request,
  indices_exists_alias1_response,
  indices_exists_alias_request,
  indices_exists_alias_response,
  indices_exists_index_template_request,
  indices_exists_index_template_response,
  indices_exists_request,
  indices_exists_response,
  indices_exists_template_request,
  indices_exists_template_response,
  indices_explain_data_lifecycle_request,
  indices_explain_data_lifecycle_response,
  indices_field_usage_stats_request,
  indices_field_usage_stats_response,
  indices_flush1_request,
  indices_flush1_response,
  indices_flush2_request,
  indices_flush2_response,
  indices_flush3_request,
  indices_flush3_response,
  indices_flush_request,
  indices_flush_response,
  indices_forcemerge1_request,
  indices_forcemerge1_response,
  indices_forcemerge_request,
  indices_forcemerge_response,
  indices_get_alias1_request,
  indices_get_alias1_response,
  indices_get_alias2_request,
  indices_get_alias2_response,
  indices_get_alias3_request,
  indices_get_alias3_response,
  indices_get_alias_request,
  indices_get_alias_response,
  indices_get_data_lifecycle_request,
  indices_get_data_lifecycle_response,
  indices_get_data_lifecycle_stats_request,
  indices_get_data_lifecycle_stats_response,
  indices_get_data_stream1_request,
  indices_get_data_stream1_response,
  indices_get_data_stream_mappings_request,
  indices_get_data_stream_mappings_response,
  indices_get_data_stream_options_request,
  indices_get_data_stream_options_response,
  indices_get_data_stream_request,
  indices_get_data_stream_response,
  indices_get_data_stream_settings_request,
  indices_get_data_stream_settings_response,
  indices_get_field_mapping1_request,
  indices_get_field_mapping1_response,
  indices_get_field_mapping_request,
  indices_get_field_mapping_response,
  indices_get_index_template1_request,
  indices_get_index_template1_response,
  indices_get_index_template_request,
  indices_get_index_template_response,
  indices_get_mapping1_request,
  indices_get_mapping1_response,
  indices_get_mapping_request,
  indices_get_mapping_response,
  indices_get_migrate_reindex_status_request,
  indices_get_migrate_reindex_status_response,
  indices_get_request,
  indices_get_response,
  indices_get_settings1_request,
  indices_get_settings1_response,
  indices_get_settings2_request,
  indices_get_settings2_response,
  indices_get_settings3_request,
  indices_get_settings3_response,
  indices_get_settings_request,
  indices_get_settings_response,
  indices_get_template1_request,
  indices_get_template1_response,
  indices_get_template_request,
  indices_get_template_response,
  indices_migrate_reindex_request,
  indices_migrate_reindex_response,
  indices_migrate_to_data_stream_request,
  indices_migrate_to_data_stream_response,
  indices_modify_data_stream_request,
  indices_modify_data_stream_response,
  indices_open_request,
  indices_open_response,
  indices_promote_data_stream_request,
  indices_promote_data_stream_response,
  indices_put_alias1_request,
  indices_put_alias1_response,
  indices_put_alias2_request,
  indices_put_alias2_response,
  indices_put_alias3_request,
  indices_put_alias3_response,
  indices_put_alias_request,
  indices_put_alias_response,
  indices_put_data_lifecycle_request,
  indices_put_data_lifecycle_response,
  indices_put_data_stream_mappings_request,
  indices_put_data_stream_mappings_response,
  indices_put_data_stream_options_request,
  indices_put_data_stream_options_response,
  indices_put_data_stream_settings_request,
  indices_put_data_stream_settings_response,
  indices_put_index_template1_request,
  indices_put_index_template1_response,
  indices_put_index_template_request,
  indices_put_index_template_response,
  indices_put_mapping1_request,
  indices_put_mapping1_response,
  indices_put_mapping_request,
  indices_put_mapping_response,
  indices_put_settings1_request,
  indices_put_settings1_response,
  indices_put_settings_request,
  indices_put_settings_response,
  indices_put_template1_request,
  indices_put_template1_response,
  indices_put_template_request,
  indices_put_template_response,
  indices_recovery1_request,
  indices_recovery1_response,
  indices_recovery_request,
  indices_recovery_response,
  indices_refresh1_request,
  indices_refresh1_response,
  indices_refresh2_request,
  indices_refresh2_response,
  indices_refresh3_request,
  indices_refresh3_response,
  indices_refresh_request,
  indices_refresh_response,
  indices_reload_search_analyzers1_request,
  indices_reload_search_analyzers1_response,
  indices_reload_search_analyzers_request,
  indices_reload_search_analyzers_response,
  indices_remove_block_request,
  indices_remove_block_response,
  indices_resolve_cluster1_request,
  indices_resolve_cluster1_response,
  indices_resolve_cluster_request,
  indices_resolve_cluster_response,
  indices_resolve_index_request,
  indices_resolve_index_response,
  indices_rollover1_request,
  indices_rollover1_response,
  indices_rollover_request,
  indices_rollover_response,
  indices_segments1_request,
  indices_segments1_response,
  indices_segments_request,
  indices_segments_response,
  indices_shard_stores1_request,
  indices_shard_stores1_response,
  indices_shard_stores_request,
  indices_shard_stores_response,
  indices_shrink1_request,
  indices_shrink1_response,
  indices_shrink_request,
  indices_shrink_response,
  indices_simulate_index_template_request,
  indices_simulate_index_template_response,
  indices_simulate_template1_request,
  indices_simulate_template1_response,
  indices_simulate_template_request,
  indices_simulate_template_response,
  indices_split1_request,
  indices_split1_response,
  indices_split_request,
  indices_split_response,
  indices_stats1_request,
  indices_stats1_response,
  indices_stats2_request,
  indices_stats2_response,
  indices_stats3_request,
  indices_stats3_response,
  indices_stats_request,
  indices_stats_response,
  indices_update_aliases_request,
  indices_update_aliases_response,
  indices_validate_query1_request,
  indices_validate_query1_response,
  indices_validate_query2_request,
  indices_validate_query2_response,
  indices_validate_query3_request,
  indices_validate_query3_response,
  indices_validate_query_request,
  indices_validate_query_response,
  inference_chat_completion_unified_request,
  inference_chat_completion_unified_response,
  inference_completion_request,
  inference_completion_response,
  inference_delete1_request,
  inference_delete1_response,
  inference_delete_request,
  inference_delete_response,
  inference_get1_request,
  inference_get1_response,
  inference_get2_request,
  inference_get2_response,
  inference_get_request,
  inference_get_response,
  inference_inference1_request,
  inference_inference1_response,
  inference_inference_request,
  inference_inference_response,
  inference_put1_request,
  inference_put1_response,
  inference_put_ai21_request,
  inference_put_ai21_response,
  inference_put_alibabacloud_request,
  inference_put_alibabacloud_response,
  inference_put_amazonbedrock_request,
  inference_put_amazonbedrock_response,
  inference_put_amazonsagemaker_request,
  inference_put_amazonsagemaker_response,
  inference_put_anthropic_request,
  inference_put_anthropic_response,
  inference_put_azureaistudio_request,
  inference_put_azureaistudio_response,
  inference_put_azureopenai_request,
  inference_put_azureopenai_response,
  inference_put_cohere_request,
  inference_put_cohere_response,
  inference_put_contextualai_request,
  inference_put_contextualai_response,
  inference_put_custom_request,
  inference_put_custom_response,
  inference_put_deepseek_request,
  inference_put_deepseek_response,
  inference_put_elasticsearch_request,
  inference_put_elasticsearch_response,
  inference_put_elser_request,
  inference_put_elser_response,
  inference_put_googleaistudio_request,
  inference_put_googleaistudio_response,
  inference_put_googlevertexai_request,
  inference_put_googlevertexai_response,
  inference_put_hugging_face_request,
  inference_put_hugging_face_response,
  inference_put_jinaai_request,
  inference_put_jinaai_response,
  inference_put_llama_request,
  inference_put_llama_response,
  inference_put_mistral_request,
  inference_put_mistral_response,
  inference_put_openai_request,
  inference_put_openai_response,
  inference_put_request,
  inference_put_response,
  inference_put_voyageai_request,
  inference_put_voyageai_response,
  inference_put_watsonx_request,
  inference_put_watsonx_response,
  inference_rerank_request,
  inference_rerank_response,
  inference_sparse_embedding_request,
  inference_sparse_embedding_response,
  inference_stream_completion_request,
  inference_stream_completion_response,
  inference_text_embedding_request,
  inference_text_embedding_response,
  inference_update1_request,
  inference_update1_response,
  inference_update_request,
  inference_update_response,
  info_request,
  info_response,
  ingest_delete_geoip_database_request,
  ingest_delete_geoip_database_response,
  ingest_delete_ip_location_database_request,
  ingest_delete_ip_location_database_response,
  ingest_delete_pipeline_request,
  ingest_delete_pipeline_response,
  ingest_geo_ip_stats_request,
  ingest_geo_ip_stats_response,
  ingest_get_geoip_database1_request,
  ingest_get_geoip_database1_response,
  ingest_get_geoip_database_request,
  ingest_get_geoip_database_response,
  ingest_get_ip_location_database1_request,
  ingest_get_ip_location_database1_response,
  ingest_get_ip_location_database_request,
  ingest_get_ip_location_database_response,
  ingest_get_pipeline1_request,
  ingest_get_pipeline1_response,
  ingest_get_pipeline_request,
  ingest_get_pipeline_response,
  ingest_processor_grok_request,
  ingest_processor_grok_response,
  ingest_put_geoip_database_request,
  ingest_put_geoip_database_response,
  ingest_put_ip_location_database_request,
  ingest_put_ip_location_database_response,
  ingest_put_pipeline_request,
  ingest_put_pipeline_response,
  ingest_simulate1_request,
  ingest_simulate1_response,
  ingest_simulate2_request,
  ingest_simulate2_response,
  ingest_simulate3_request,
  ingest_simulate3_response,
  ingest_simulate_request,
  ingest_simulate_response,
  license_delete_request,
  license_delete_response,
  license_get_basic_status_request,
  license_get_basic_status_response,
  license_get_request,
  license_get_response,
  license_get_trial_status_request,
  license_get_trial_status_response,
  license_post1_request,
  license_post1_response,
  license_post_request,
  license_post_response,
  license_post_start_basic_request,
  license_post_start_basic_response,
  license_post_start_trial_request,
  license_post_start_trial_response,
  logstash_delete_pipeline_request,
  logstash_delete_pipeline_response,
  logstash_get_pipeline1_request,
  logstash_get_pipeline1_response,
  logstash_get_pipeline_request,
  logstash_get_pipeline_response,
  logstash_put_pipeline_request,
  logstash_put_pipeline_response,
  mget1_request,
  mget1_response,
  mget2_request,
  mget2_response,
  mget3_request,
  mget3_response,
  mget_request,
  mget_response,
  migration_deprecations1_request,
  migration_deprecations1_response,
  migration_deprecations_request,
  migration_deprecations_response,
  migration_get_feature_upgrade_status_request,
  migration_get_feature_upgrade_status_response,
  migration_post_feature_upgrade_request,
  migration_post_feature_upgrade_response,
  ml_clear_trained_model_deployment_cache_request,
  ml_clear_trained_model_deployment_cache_response,
  ml_close_job_request,
  ml_close_job_response,
  ml_delete_calendar_event_request,
  ml_delete_calendar_event_response,
  ml_delete_calendar_job_request,
  ml_delete_calendar_job_response,
  ml_delete_calendar_request,
  ml_delete_calendar_response,
  ml_delete_data_frame_analytics_request,
  ml_delete_data_frame_analytics_response,
  ml_delete_datafeed_request,
  ml_delete_datafeed_response,
  ml_delete_expired_data1_request,
  ml_delete_expired_data1_response,
  ml_delete_expired_data_request,
  ml_delete_expired_data_response,
  ml_delete_filter_request,
  ml_delete_filter_response,
  ml_delete_forecast1_request,
  ml_delete_forecast1_response,
  ml_delete_forecast_request,
  ml_delete_forecast_response,
  ml_delete_job_request,
  ml_delete_job_response,
  ml_delete_model_snapshot_request,
  ml_delete_model_snapshot_response,
  ml_delete_trained_model_alias_request,
  ml_delete_trained_model_alias_response,
  ml_delete_trained_model_request,
  ml_delete_trained_model_response,
  ml_estimate_model_memory_request,
  ml_estimate_model_memory_response,
  ml_evaluate_data_frame_request,
  ml_evaluate_data_frame_response,
  ml_explain_data_frame_analytics1_request,
  ml_explain_data_frame_analytics1_response,
  ml_explain_data_frame_analytics2_request,
  ml_explain_data_frame_analytics2_response,
  ml_explain_data_frame_analytics3_request,
  ml_explain_data_frame_analytics3_response,
  ml_explain_data_frame_analytics_request,
  ml_explain_data_frame_analytics_response,
  ml_flush_job_request,
  ml_flush_job_response,
  ml_forecast_request,
  ml_forecast_response,
  ml_get_buckets1_request,
  ml_get_buckets1_response,
  ml_get_buckets2_request,
  ml_get_buckets2_response,
  ml_get_buckets3_request,
  ml_get_buckets3_response,
  ml_get_buckets_request,
  ml_get_buckets_response,
  ml_get_calendar_events_request,
  ml_get_calendar_events_response,
  ml_get_calendars1_request,
  ml_get_calendars1_response,
  ml_get_calendars2_request,
  ml_get_calendars2_response,
  ml_get_calendars3_request,
  ml_get_calendars3_response,
  ml_get_calendars_request,
  ml_get_calendars_response,
  ml_get_categories1_request,
  ml_get_categories1_response,
  ml_get_categories2_request,
  ml_get_categories2_response,
  ml_get_categories3_request,
  ml_get_categories3_response,
  ml_get_categories_request,
  ml_get_categories_response,
  ml_get_data_frame_analytics1_request,
  ml_get_data_frame_analytics1_response,
  ml_get_data_frame_analytics_request,
  ml_get_data_frame_analytics_response,
  ml_get_data_frame_analytics_stats1_request,
  ml_get_data_frame_analytics_stats1_response,
  ml_get_data_frame_analytics_stats_request,
  ml_get_data_frame_analytics_stats_response,
  ml_get_datafeed_stats1_request,
  ml_get_datafeed_stats1_response,
  ml_get_datafeed_stats_request,
  ml_get_datafeed_stats_response,
  ml_get_datafeeds1_request,
  ml_get_datafeeds1_response,
  ml_get_datafeeds_request,
  ml_get_datafeeds_response,
  ml_get_filters1_request,
  ml_get_filters1_response,
  ml_get_filters_request,
  ml_get_filters_response,
  ml_get_influencers1_request,
  ml_get_influencers1_response,
  ml_get_influencers_request,
  ml_get_influencers_response,
  ml_get_job_stats1_request,
  ml_get_job_stats1_response,
  ml_get_job_stats_request,
  ml_get_job_stats_response,
  ml_get_jobs1_request,
  ml_get_jobs1_response,
  ml_get_jobs_request,
  ml_get_jobs_response,
  ml_get_memory_stats1_request,
  ml_get_memory_stats1_response,
  ml_get_memory_stats_request,
  ml_get_memory_stats_response,
  ml_get_model_snapshot_upgrade_stats_request,
  ml_get_model_snapshot_upgrade_stats_response,
  ml_get_model_snapshots1_request,
  ml_get_model_snapshots1_response,
  ml_get_model_snapshots2_request,
  ml_get_model_snapshots2_response,
  ml_get_model_snapshots3_request,
  ml_get_model_snapshots3_response,
  ml_get_model_snapshots_request,
  ml_get_model_snapshots_response,
  ml_get_overall_buckets1_request,
  ml_get_overall_buckets1_response,
  ml_get_overall_buckets_request,
  ml_get_overall_buckets_response,
  ml_get_records1_request,
  ml_get_records1_response,
  ml_get_records_request,
  ml_get_records_response,
  ml_get_trained_models1_request,
  ml_get_trained_models1_response,
  ml_get_trained_models_request,
  ml_get_trained_models_response,
  ml_get_trained_models_stats1_request,
  ml_get_trained_models_stats1_response,
  ml_get_trained_models_stats_request,
  ml_get_trained_models_stats_response,
  ml_infer_trained_model_request,
  ml_infer_trained_model_response,
  ml_info_request,
  ml_info_response,
  ml_open_job_request,
  ml_open_job_response,
  ml_post_calendar_events_request,
  ml_post_calendar_events_response,
  ml_post_data_request,
  ml_post_data_response,
  ml_preview_data_frame_analytics1_request,
  ml_preview_data_frame_analytics1_response,
  ml_preview_data_frame_analytics2_request,
  ml_preview_data_frame_analytics2_response,
  ml_preview_data_frame_analytics3_request,
  ml_preview_data_frame_analytics3_response,
  ml_preview_data_frame_analytics_request,
  ml_preview_data_frame_analytics_response,
  ml_preview_datafeed1_request,
  ml_preview_datafeed1_response,
  ml_preview_datafeed2_request,
  ml_preview_datafeed2_response,
  ml_preview_datafeed3_request,
  ml_preview_datafeed3_response,
  ml_preview_datafeed_request,
  ml_preview_datafeed_response,
  ml_put_calendar_job_request,
  ml_put_calendar_job_response,
  ml_put_calendar_request,
  ml_put_calendar_response,
  ml_put_data_frame_analytics_request,
  ml_put_data_frame_analytics_response,
  ml_put_datafeed_request,
  ml_put_datafeed_response,
  ml_put_filter_request,
  ml_put_filter_response,
  ml_put_job_request,
  ml_put_job_response,
  ml_put_trained_model_alias_request,
  ml_put_trained_model_alias_response,
  ml_put_trained_model_definition_part_request,
  ml_put_trained_model_definition_part_response,
  ml_put_trained_model_request,
  ml_put_trained_model_response,
  ml_put_trained_model_vocabulary_request,
  ml_put_trained_model_vocabulary_response,
  ml_reset_job_request,
  ml_reset_job_response,
  ml_revert_model_snapshot_request,
  ml_revert_model_snapshot_response,
  ml_set_upgrade_mode_request,
  ml_set_upgrade_mode_response,
  ml_start_data_frame_analytics_request,
  ml_start_data_frame_analytics_response,
  ml_start_datafeed_request,
  ml_start_datafeed_response,
  ml_start_trained_model_deployment_request,
  ml_start_trained_model_deployment_response,
  ml_stop_data_frame_analytics_request,
  ml_stop_data_frame_analytics_response,
  ml_stop_datafeed_request,
  ml_stop_datafeed_response,
  ml_stop_trained_model_deployment_request,
  ml_stop_trained_model_deployment_response,
  ml_update_data_frame_analytics_request,
  ml_update_data_frame_analytics_response,
  ml_update_datafeed_request,
  ml_update_datafeed_response,
  ml_update_filter_request,
  ml_update_filter_response,
  ml_update_job_request,
  ml_update_job_response,
  ml_update_model_snapshot_request,
  ml_update_model_snapshot_response,
  ml_update_trained_model_deployment_request,
  ml_update_trained_model_deployment_response,
  ml_upgrade_job_snapshot_request,
  ml_upgrade_job_snapshot_response,
  msearch1_request,
  msearch1_response,
  msearch2_request,
  msearch2_response,
  msearch3_request,
  msearch3_response,
  msearch_request,
  msearch_response,
  msearch_template1_request,
  msearch_template1_response,
  msearch_template2_request,
  msearch_template2_response,
  msearch_template3_request,
  msearch_template3_response,
  msearch_template_request,
  msearch_template_response,
  mtermvectors1_request,
  mtermvectors1_response,
  mtermvectors2_request,
  mtermvectors2_response,
  mtermvectors3_request,
  mtermvectors3_response,
  mtermvectors_request,
  mtermvectors_response,
  nodes_clear_repositories_metering_archive_request,
  nodes_clear_repositories_metering_archive_response,
  nodes_get_repositories_metering_info_request,
  nodes_get_repositories_metering_info_response,
  nodes_hot_threads1_request,
  nodes_hot_threads1_response,
  nodes_hot_threads_request,
  nodes_hot_threads_response,
  nodes_info1_request,
  nodes_info1_response,
  nodes_info2_request,
  nodes_info2_response,
  nodes_info3_request,
  nodes_info3_response,
  nodes_info_request,
  nodes_info_response,
  nodes_reload_secure_settings1_request,
  nodes_reload_secure_settings1_response,
  nodes_reload_secure_settings_request,
  nodes_reload_secure_settings_response,
  nodes_stats1_request,
  nodes_stats1_response,
  nodes_stats2_request,
  nodes_stats2_response,
  nodes_stats3_request,
  nodes_stats3_response,
  nodes_stats4_request,
  nodes_stats4_response,
  nodes_stats5_request,
  nodes_stats5_response,
  nodes_stats_request,
  nodes_stats_response,
  nodes_usage1_request,
  nodes_usage1_response,
  nodes_usage2_request,
  nodes_usage2_response,
  nodes_usage3_request,
  nodes_usage3_response,
  nodes_usage_request,
  nodes_usage_response,
  open_point_in_time_request,
  open_point_in_time_response,
  ping_request,
  ping_response,
  put_script1_request,
  put_script1_response,
  put_script2_request,
  put_script2_response,
  put_script3_request,
  put_script3_response,
  put_script_request,
  put_script_response,
  query_rules_delete_rule_request,
  query_rules_delete_rule_response,
  query_rules_delete_ruleset_request,
  query_rules_delete_ruleset_response,
  query_rules_get_rule_request,
  query_rules_get_rule_response,
  query_rules_get_ruleset_request,
  query_rules_get_ruleset_response,
  query_rules_list_rulesets_request,
  query_rules_list_rulesets_response,
  query_rules_put_rule_request,
  query_rules_put_rule_response,
  query_rules_put_ruleset_request,
  query_rules_put_ruleset_response,
  query_rules_test_request,
  query_rules_test_response,
  rank_eval1_request,
  rank_eval1_response,
  rank_eval2_request,
  rank_eval2_response,
  rank_eval3_request,
  rank_eval3_response,
  rank_eval_request,
  rank_eval_response,
  reindex_request,
  reindex_response,
  reindex_rethrottle_request,
  reindex_rethrottle_response,
  render_search_template1_request,
  render_search_template1_response,
  render_search_template2_request,
  render_search_template2_response,
  render_search_template3_request,
  render_search_template3_response,
  render_search_template_request,
  render_search_template_response,
  rollup_delete_job_request,
  rollup_delete_job_response,
  rollup_get_jobs1_request,
  rollup_get_jobs1_response,
  rollup_get_jobs_request,
  rollup_get_jobs_response,
  rollup_get_rollup_caps1_request,
  rollup_get_rollup_caps1_response,
  rollup_get_rollup_caps_request,
  rollup_get_rollup_caps_response,
  rollup_get_rollup_index_caps_request,
  rollup_get_rollup_index_caps_response,
  rollup_put_job_request,
  rollup_put_job_response,
  rollup_rollup_search1_request,
  rollup_rollup_search1_response,
  rollup_rollup_search_request,
  rollup_rollup_search_response,
  rollup_start_job_request,
  rollup_start_job_response,
  rollup_stop_job_request,
  rollup_stop_job_response,
  scripts_painless_execute1_request,
  scripts_painless_execute1_response,
  scripts_painless_execute_request,
  scripts_painless_execute_response,
  scroll1_request,
  scroll1_response,
  scroll2_request,
  scroll2_response,
  scroll3_request,
  scroll3_response,
  scroll_request,
  scroll_response,
  search1_request,
  search1_response,
  search2_request,
  search2_response,
  search3_request,
  search3_response,
  search_application_delete_behavioral_analytics_request,
  search_application_delete_behavioral_analytics_response,
  search_application_delete_request,
  search_application_delete_response,
  search_application_get_behavioral_analytics1_request,
  search_application_get_behavioral_analytics1_response,
  search_application_get_behavioral_analytics_request,
  search_application_get_behavioral_analytics_response,
  search_application_get_request,
  search_application_get_response,
  search_application_list_request,
  search_application_list_response,
  search_application_post_behavioral_analytics_event_request,
  search_application_post_behavioral_analytics_event_response,
  search_application_put_behavioral_analytics_request,
  search_application_put_behavioral_analytics_response,
  search_application_put_request,
  search_application_put_response,
  search_application_render_query_request,
  search_application_render_query_response,
  search_application_search1_request,
  search_application_search1_response,
  search_application_search_request,
  search_application_search_response,
  search_mvt1_request,
  search_mvt1_response,
  search_mvt_request,
  search_mvt_response,
  search_request,
  search_response,
  search_shards1_request,
  search_shards1_response,
  search_shards2_request,
  search_shards2_response,
  search_shards3_request,
  search_shards3_response,
  search_shards_request,
  search_shards_response,
  search_template1_request,
  search_template1_response,
  search_template2_request,
  search_template2_response,
  search_template3_request,
  search_template3_response,
  search_template_request,
  search_template_response,
  searchable_snapshots_cache_stats1_request,
  searchable_snapshots_cache_stats1_response,
  searchable_snapshots_cache_stats_request,
  searchable_snapshots_cache_stats_response,
  searchable_snapshots_clear_cache1_request,
  searchable_snapshots_clear_cache1_response,
  searchable_snapshots_clear_cache_request,
  searchable_snapshots_clear_cache_response,
  searchable_snapshots_mount_request,
  searchable_snapshots_mount_response,
  searchable_snapshots_stats1_request,
  searchable_snapshots_stats1_response,
  searchable_snapshots_stats_request,
  searchable_snapshots_stats_response,
  security_activate_user_profile_request,
  security_activate_user_profile_response,
  security_authenticate_request,
  security_authenticate_response,
  security_bulk_delete_role_request,
  security_bulk_delete_role_response,
  security_bulk_put_role_request,
  security_bulk_put_role_response,
  security_bulk_update_api_keys_request,
  security_bulk_update_api_keys_response,
  security_change_password1_request,
  security_change_password1_response,
  security_change_password2_request,
  security_change_password2_response,
  security_change_password3_request,
  security_change_password3_response,
  security_change_password_request,
  security_change_password_response,
  security_clear_api_key_cache_request,
  security_clear_api_key_cache_response,
  security_clear_cached_privileges_request,
  security_clear_cached_privileges_response,
  security_clear_cached_realms_request,
  security_clear_cached_realms_response,
  security_clear_cached_roles_request,
  security_clear_cached_roles_response,
  security_clear_cached_service_tokens_request,
  security_clear_cached_service_tokens_response,
  security_create_api_key1_request,
  security_create_api_key1_response,
  security_create_api_key_request,
  security_create_api_key_response,
  security_create_cross_cluster_api_key_request,
  security_create_cross_cluster_api_key_response,
  security_create_service_token1_request,
  security_create_service_token1_response,
  security_create_service_token2_request,
  security_create_service_token2_response,
  security_create_service_token_request,
  security_create_service_token_response,
  security_delegate_pki_request,
  security_delegate_pki_response,
  security_delete_privileges_request,
  security_delete_privileges_response,
  security_delete_role_mapping_request,
  security_delete_role_mapping_response,
  security_delete_role_request,
  security_delete_role_response,
  security_delete_service_token_request,
  security_delete_service_token_response,
  security_delete_user_request,
  security_delete_user_response,
  security_disable_user1_request,
  security_disable_user1_response,
  security_disable_user_profile1_request,
  security_disable_user_profile1_response,
  security_disable_user_profile_request,
  security_disable_user_profile_response,
  security_disable_user_request,
  security_disable_user_response,
  security_enable_user1_request,
  security_enable_user1_response,
  security_enable_user_profile1_request,
  security_enable_user_profile1_response,
  security_enable_user_profile_request,
  security_enable_user_profile_response,
  security_enable_user_request,
  security_enable_user_response,
  security_enroll_kibana_request,
  security_enroll_kibana_response,
  security_enroll_node_request,
  security_enroll_node_response,
  security_get_api_key_request,
  security_get_api_key_response,
  security_get_builtin_privileges_request,
  security_get_builtin_privileges_response,
  security_get_privileges1_request,
  security_get_privileges1_response,
  security_get_privileges2_request,
  security_get_privileges2_response,
  security_get_privileges_request,
  security_get_privileges_response,
  security_get_role1_request,
  security_get_role1_response,
  security_get_role_mapping1_request,
  security_get_role_mapping1_response,
  security_get_role_mapping_request,
  security_get_role_mapping_response,
  security_get_role_request,
  security_get_role_response,
  security_get_service_accounts1_request,
  security_get_service_accounts1_response,
  security_get_service_accounts2_request,
  security_get_service_accounts2_response,
  security_get_service_accounts_request,
  security_get_service_accounts_response,
  security_get_service_credentials_request,
  security_get_service_credentials_response,
  security_get_settings_request,
  security_get_settings_response,
  security_get_stats_request,
  security_get_stats_response,
  security_get_token_request,
  security_get_token_response,
  security_get_user1_request,
  security_get_user1_response,
  security_get_user_privileges_request,
  security_get_user_privileges_response,
  security_get_user_profile_request,
  security_get_user_profile_response,
  security_get_user_request,
  security_get_user_response,
  security_grant_api_key_request,
  security_grant_api_key_response,
  security_has_privileges1_request,
  security_has_privileges1_response,
  security_has_privileges2_request,
  security_has_privileges2_response,
  security_has_privileges3_request,
  security_has_privileges3_response,
  security_has_privileges_request,
  security_has_privileges_response,
  security_has_privileges_user_profile1_request,
  security_has_privileges_user_profile1_response,
  security_has_privileges_user_profile_request,
  security_has_privileges_user_profile_response,
  security_invalidate_api_key_request,
  security_invalidate_api_key_response,
  security_invalidate_token_request,
  security_invalidate_token_response,
  security_oidc_authenticate_request,
  security_oidc_authenticate_response,
  security_oidc_logout_request,
  security_oidc_logout_response,
  security_oidc_prepare_authentication_request,
  security_oidc_prepare_authentication_response,
  security_put_privileges1_request,
  security_put_privileges1_response,
  security_put_privileges_request,
  security_put_privileges_response,
  security_put_role1_request,
  security_put_role1_response,
  security_put_role_mapping1_request,
  security_put_role_mapping1_response,
  security_put_role_mapping_request,
  security_put_role_mapping_response,
  security_put_role_request,
  security_put_role_response,
  security_put_user1_request,
  security_put_user1_response,
  security_put_user_request,
  security_put_user_response,
  security_query_api_keys1_request,
  security_query_api_keys1_response,
  security_query_api_keys_request,
  security_query_api_keys_response,
  security_query_role1_request,
  security_query_role1_response,
  security_query_role_request,
  security_query_role_response,
  security_query_user1_request,
  security_query_user1_response,
  security_query_user_request,
  security_query_user_response,
  security_saml_authenticate_request,
  security_saml_authenticate_response,
  security_saml_complete_logout_request,
  security_saml_complete_logout_response,
  security_saml_invalidate_request,
  security_saml_invalidate_response,
  security_saml_logout_request,
  security_saml_logout_response,
  security_saml_prepare_authentication_request,
  security_saml_prepare_authentication_response,
  security_saml_service_provider_metadata_request,
  security_saml_service_provider_metadata_response,
  security_suggest_user_profiles1_request,
  security_suggest_user_profiles1_response,
  security_suggest_user_profiles_request,
  security_suggest_user_profiles_response,
  security_update_api_key_request,
  security_update_api_key_response,
  security_update_cross_cluster_api_key_request,
  security_update_cross_cluster_api_key_response,
  security_update_settings_request,
  security_update_settings_response,
  security_update_user_profile_data1_request,
  security_update_user_profile_data1_response,
  security_update_user_profile_data_request,
  security_update_user_profile_data_response,
  simulate_ingest1_request,
  simulate_ingest1_response,
  simulate_ingest2_request,
  simulate_ingest2_response,
  simulate_ingest3_request,
  simulate_ingest3_response,
  simulate_ingest_request,
  simulate_ingest_response,
  slm_delete_lifecycle_request,
  slm_delete_lifecycle_response,
  slm_execute_lifecycle_request,
  slm_execute_lifecycle_response,
  slm_execute_retention_request,
  slm_execute_retention_response,
  slm_get_lifecycle1_request,
  slm_get_lifecycle1_response,
  slm_get_lifecycle_request,
  slm_get_lifecycle_response,
  slm_get_stats_request,
  slm_get_stats_response,
  slm_get_status_request,
  slm_get_status_response,
  slm_put_lifecycle_request,
  slm_put_lifecycle_response,
  slm_start_request,
  slm_start_response,
  slm_stop_request,
  slm_stop_response,
  snapshot_cleanup_repository_request,
  snapshot_cleanup_repository_response,
  snapshot_clone_request,
  snapshot_clone_response,
  snapshot_create1_request,
  snapshot_create1_response,
  snapshot_create_repository1_request,
  snapshot_create_repository1_response,
  snapshot_create_repository_request,
  snapshot_create_repository_response,
  snapshot_create_request,
  snapshot_create_response,
  snapshot_delete_repository_request,
  snapshot_delete_repository_response,
  snapshot_delete_request,
  snapshot_delete_response,
  snapshot_get_repository1_request,
  snapshot_get_repository1_response,
  snapshot_get_repository_request,
  snapshot_get_repository_response,
  snapshot_get_request,
  snapshot_get_response,
  snapshot_repository_analyze_request,
  snapshot_repository_analyze_response,
  snapshot_repository_verify_integrity_request,
  snapshot_repository_verify_integrity_response,
  snapshot_restore_request,
  snapshot_restore_response,
  snapshot_status1_request,
  snapshot_status1_response,
  snapshot_status2_request,
  snapshot_status2_response,
  snapshot_status_request,
  snapshot_status_response,
  snapshot_verify_repository_request,
  snapshot_verify_repository_response,
  sql_clear_cursor_request,
  sql_clear_cursor_response,
  sql_delete_async_request,
  sql_delete_async_response,
  sql_get_async_request,
  sql_get_async_response,
  sql_get_async_status_request,
  sql_get_async_status_response,
  sql_query1_request,
  sql_query1_response,
  sql_query_request,
  sql_query_response,
  sql_translate1_request,
  sql_translate1_response,
  sql_translate_request,
  sql_translate_response,
  ssl_certificates_request,
  ssl_certificates_response,
  synonyms_delete_synonym_request,
  synonyms_delete_synonym_response,
  synonyms_delete_synonym_rule_request,
  synonyms_delete_synonym_rule_response,
  synonyms_get_synonym_request,
  synonyms_get_synonym_response,
  synonyms_get_synonym_rule_request,
  synonyms_get_synonym_rule_response,
  synonyms_get_synonyms_sets_request,
  synonyms_get_synonyms_sets_response,
  synonyms_put_synonym_request,
  synonyms_put_synonym_response,
  synonyms_put_synonym_rule_request,
  synonyms_put_synonym_rule_response,
  tasks_cancel1_request,
  tasks_cancel1_response,
  tasks_cancel_request,
  tasks_cancel_response,
  tasks_get_request,
  tasks_get_response,
  tasks_list_request,
  tasks_list_response,
  terms_enum1_request,
  terms_enum1_response,
  terms_enum_request,
  terms_enum_response,
  termvectors1_request,
  termvectors1_response,
  termvectors2_request,
  termvectors2_response,
  termvectors3_request,
  termvectors3_response,
  termvectors_request,
  termvectors_response,
  text_structure_find_field_structure_request,
  text_structure_find_field_structure_response,
  text_structure_find_message_structure1_request,
  text_structure_find_message_structure1_response,
  text_structure_find_message_structure_request,
  text_structure_find_message_structure_response,
  text_structure_find_structure_request,
  text_structure_find_structure_response,
  text_structure_test_grok_pattern1_request,
  text_structure_test_grok_pattern1_response,
  text_structure_test_grok_pattern_request,
  text_structure_test_grok_pattern_response,
  transform_delete_transform_request,
  transform_delete_transform_response,
  transform_get_transform1_request,
  transform_get_transform1_response,
  transform_get_transform_request,
  transform_get_transform_response,
  transform_get_transform_stats_request,
  transform_get_transform_stats_response,
  transform_preview_transform1_request,
  transform_preview_transform1_response,
  transform_preview_transform2_request,
  transform_preview_transform2_response,
  transform_preview_transform3_request,
  transform_preview_transform3_response,
  transform_preview_transform_request,
  transform_preview_transform_response,
  transform_put_transform_request,
  transform_put_transform_response,
  transform_reset_transform_request,
  transform_reset_transform_response,
  transform_schedule_now_transform_request,
  transform_schedule_now_transform_response,
  transform_set_upgrade_mode_request,
  transform_set_upgrade_mode_response,
  transform_start_transform_request,
  transform_start_transform_response,
  transform_stop_transform_request,
  transform_stop_transform_response,
  transform_update_transform_request,
  transform_update_transform_response,
  transform_upgrade_transforms_request,
  transform_upgrade_transforms_response,
  update_by_query_request,
  update_by_query_response,
  update_by_query_rethrottle_request,
  update_by_query_rethrottle_response,
  update_request,
  update_response,
  watcher_ack_watch1_request,
  watcher_ack_watch1_response,
  watcher_ack_watch2_request,
  watcher_ack_watch2_response,
  watcher_ack_watch3_request,
  watcher_ack_watch3_response,
  watcher_ack_watch_request,
  watcher_ack_watch_response,
  watcher_activate_watch1_request,
  watcher_activate_watch1_response,
  watcher_activate_watch_request,
  watcher_activate_watch_response,
  watcher_deactivate_watch1_request,
  watcher_deactivate_watch1_response,
  watcher_deactivate_watch_request,
  watcher_deactivate_watch_response,
  watcher_delete_watch_request,
  watcher_delete_watch_response,
  watcher_execute_watch1_request,
  watcher_execute_watch1_response,
  watcher_execute_watch2_request,
  watcher_execute_watch2_response,
  watcher_execute_watch3_request,
  watcher_execute_watch3_response,
  watcher_execute_watch_request,
  watcher_execute_watch_response,
  watcher_get_settings_request,
  watcher_get_settings_response,
  watcher_get_watch_request,
  watcher_get_watch_response,
  watcher_put_watch1_request,
  watcher_put_watch1_response,
  watcher_put_watch_request,
  watcher_put_watch_response,
  watcher_query_watches1_request,
  watcher_query_watches1_response,
  watcher_query_watches_request,
  watcher_query_watches_response,
  watcher_start_request,
  watcher_start_response,
  watcher_stats1_request,
  watcher_stats1_response,
  watcher_stats_request,
  watcher_stats_response,
  watcher_stop_request,
  watcher_stop_response,
  watcher_update_settings_request,
  watcher_update_settings_response,
  xpack_info_request,
  xpack_info_response,
  xpack_usage_request,
  xpack_usage_response,
} from './schemas/es_openapi_zod.gen';
import type { InternalConnectorContract } from '../../types/latest';
import { getLooseObjectFromProperty } from '../utils';

// import all needed request and response schemas generated from the OpenAPI spec

// declare contracts
const ASYNC_SEARCH_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.async_search.delete',
  summary: `Delete an async search`,
  description: `Delete an async search.

If the asynchronous search is still running, it is cancelled.
Otherwise, the saved search results are deleted.
If the Elasticsearch security features are enabled, the deletion of a specific async search is restricted to: the authenticated user that submitted the original search request; users that have the \`cancel_task\` cluster privilege.`,
  methods: ['DELETE'],
  patterns: ['/_async_search/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['keep_alive', 'typed_keys', 'wait_for_completion_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(async_search_delete_request, 'body'),
    getLooseObjectFromProperty(async_search_delete_request, 'path'),
    getLooseObjectFromProperty(async_search_delete_request, 'query'),
  ]),
  outputSchema: async_search_delete_response,
};
const ASYNC_SEARCH_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.async_search.get',
  summary: `Get async search results`,
  description: `Get async search results.

Retrieve the results of a previously submitted asynchronous search request.
If the Elasticsearch security features are enabled, access to the results of a specific async search is restricted to the user or API key that submitted it.`,
  methods: ['GET'],
  patterns: ['/_async_search/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['keep_alive', 'typed_keys', 'wait_for_completion_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(async_search_get_request, 'body'),
    getLooseObjectFromProperty(async_search_get_request, 'path'),
    getLooseObjectFromProperty(async_search_get_request, 'query'),
  ]),
  outputSchema: async_search_get_response,
};
const ASYNC_SEARCH_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.async_search.status',
  summary: `Get the async search status`,
  description: `Get the async search status.

Get the status of a previously submitted async search request given its identifier, without retrieving search results.
If the Elasticsearch security features are enabled, the access to the status of a specific async search is restricted to:

* The user or API key that submitted the original async search request.
* Users that have the \`monitor\` cluster privilege or greater privileges.`,
  methods: ['GET'],
  patterns: ['/_async_search/status/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: ['keep_alive'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(async_search_status_request, 'body'),
    getLooseObjectFromProperty(async_search_status_request, 'path'),
    getLooseObjectFromProperty(async_search_status_request, 'query'),
  ]),
  outputSchema: async_search_status_response,
};
const ASYNC_SEARCH_SUBMIT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.async_search.submit',
  summary: `Run an async search`,
  description: `Run an async search.

When the primary sort of the results is an indexed field, shards get sorted based on minimum and maximum value that they hold for that field. Partial results become available following the sort criteria that was requested.

Warning: Asynchronous search does not support scroll or search requests that include only the suggest section.

By default, Elasticsearch does not allow you to store an async search response larger than 10Mb and an attempt to do this results in an error.
The maximum allowed size for a stored async search response can be set by changing the \`search.max_async_search_response_size\` cluster level setting.`,
  methods: ['POST', 'POST'],
  patterns: ['/_async_search', '/{index}/_async_search'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(async_search_submit_request, 'body'),
    getLooseObjectFromProperty(async_search_submit_request, 'path'),
    getLooseObjectFromProperty(async_search_submit_request, 'query'),
    getLooseObjectFromProperty(async_search_submit1_request, 'body'),
    getLooseObjectFromProperty(async_search_submit1_request, 'path'),
    getLooseObjectFromProperty(async_search_submit1_request, 'query'),
  ]),
  outputSchema: z.union([async_search_submit_response, async_search_submit1_response]),
};
const AUTOSCALING_DELETE_AUTOSCALING_POLICY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.autoscaling.delete_autoscaling_policy',
  summary: ``,
  description: `Delete an autoscaling policy.

NOTE: This feature is designed for indirect use by Elasticsearch Service, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes. Direct use is not supported.`,
  methods: ['DELETE'],
  patterns: ['/_autoscaling/policy/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-autoscaling-delete-autoscaling-policy',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const AUTOSCALING_GET_AUTOSCALING_CAPACITY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.autoscaling.get_autoscaling_capacity',
  summary: ``,
  description: `Get the autoscaling capacity.

NOTE: This feature is designed for indirect use by Elasticsearch Service, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes. Direct use is not supported.

This API gets the current autoscaling capacity based on the configured autoscaling policy.
It will return information to size the cluster appropriately to the current workload.

The \`required_capacity\` is calculated as the maximum of the \`required_capacity\` result of all individual deciders that are enabled for the policy.

The operator should verify that the \`current_nodes\` match the operator’s knowledge of the cluster to avoid making autoscaling decisions based on stale or incomplete information.

The response contains decider-specific information you can use to diagnose how and why autoscaling determined a certain capacity was required.
This information is provided for diagnosis only.
Do not use this information to make autoscaling decisions.`,
  methods: ['GET'],
  patterns: ['/_autoscaling/capacity'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-autoscaling-get-autoscaling-capacity',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const AUTOSCALING_GET_AUTOSCALING_POLICY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.autoscaling.get_autoscaling_policy',
  summary: ``,
  description: `Get an autoscaling policy.

NOTE: This feature is designed for indirect use by Elasticsearch Service, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes. Direct use is not supported.`,
  methods: ['GET'],
  patterns: ['/_autoscaling/policy/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-autoscaling-get-autoscaling-capacity',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const AUTOSCALING_PUT_AUTOSCALING_POLICY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.autoscaling.put_autoscaling_policy',
  summary: ``,
  description: `Create or update an autoscaling policy.

NOTE: This feature is designed for indirect use by Elasticsearch Service, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes. Direct use is not supported.`,
  methods: ['PUT'],
  patterns: ['/_autoscaling/policy/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-autoscaling-put-autoscaling-policy',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const BULK_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.bulk',
  summary: `Bulk index or delete documents`,
  description: `Bulk index or delete documents.
Perform multiple \`index\`, \`create\`, \`delete\`, and \`update\` actions in a single request.
This reduces overhead and can greatly increase indexing speed.

If the Elasticsearch security features are enabled, you must have the following index privileges for the target data stream, index, or index alias:

* To use the \`create\` action, you must have the \`create_doc\`, \`create\`, \`index\`, or \`write\` index privilege. Data streams support only the \`create\` action.
* To use the \`index\` action, you must have the \`create\`, \`index\`, or \`write\` index privilege.
* To use the \`delete\` action, you must have the \`delete\` or \`write\` index privilege.
* To use the \`update\` action, you must have the \`index\` or \`write\` index privilege.
* To automatically create a data stream or index with a bulk API request, you must have the \`auto_configure\`, \`create_index\`, or \`manage\` index privilege.
* To make the result of a bulk operation visible to search using the \`refresh\` parameter, you must have the \`maintenance\` or \`manage\` index privilege.

Automatic data stream creation requires a matching index template with data stream enabled.

The actions are specified in the request body using a newline delimited JSON (NDJSON) structure:

\`\`\`
action_and_meta_data\\n
optional_source\\n
action_and_meta_data\\n
optional_source\\n
....
action_and_meta_data\\n
optional_source\\n
\`\`\`

The \`index\` and \`create\` actions expect a source on the next line and have the same semantics as the \`op_type\` parameter in the standard index API.
A \`create\` action fails if a document with the same ID already exists in the target
An \`index\` action adds or replaces a document as necessary.

NOTE: Data streams support only the \`create\` action.
To update or delete a document in a data stream, you must target the backing index containing the document.

An \`update\` action expects that the partial doc, upsert, and script and its options are specified on the next line.

A \`delete\` action does not expect a source on the next line and has the same semantics as the standard delete API.

NOTE: The final line of data must end with a newline character (\`\\n\`).
Each newline character may be preceded by a carriage return (\`\\r\`).
When sending NDJSON data to the \`_bulk\` endpoint, use a \`Content-Type\` header of \`application/json\` or \`application/x-ndjson\`.
Because this format uses literal newline characters (\`\\n\`) as delimiters, make sure that the JSON actions and sources are not pretty printed.

If you provide a target in the request path, it is used for any actions that don't explicitly specify an \`_index\` argument.

A note on the format: the idea here is to make processing as fast as possible.
As some of the actions are redirected to other shards on other nodes, only \`action_meta_data\` is parsed on the receiving node side.

Client libraries using this protocol should try and strive to do something similar on the client side, and reduce buffering as much as possible.

There is no "correct" number of actions to perform in a single bulk request.
Experiment with different settings to find the optimal size for your particular workload.
Note that Elasticsearch limits the maximum size of a HTTP request to 100mb by default so clients must ensure that no request exceeds this size.
It is not possible to index a single document that exceeds the size limit, so you must pre-process any such documents into smaller pieces before sending them to Elasticsearch.
For instance, split documents into pages or chapters before indexing them, or store raw binary data in a system outside Elasticsearch and replace the raw data with a link to the external system in the documents that you send to Elasticsearch.

**Client suppport for bulk requests**

Some of the officially supported clients provide helpers to assist with bulk requests and reindexing:

* Go: Check out \`esutil.BulkIndexer\`
* Perl: Check out \`Search::Elasticsearch::Client::5_0::Bulk\` and \`Search::Elasticsearch::Client::5_0::Scroll\`
* Python: Check out \`elasticsearch.helpers.*\`
* JavaScript: Check out \`client.helpers.*\`
* .NET: Check out \`BulkAllObservable\`
* PHP: Check out bulk indexing.
* Ruby: Check out \`Elasticsearch::Helpers::BulkHelper\`

**Submitting bulk requests with cURL**

If you're providing text file input to \`curl\`, you must use the \`--data-binary\` flag instead of plain \`-d\`.
The latter doesn't preserve newlines. For example:

\`\`\`
\$ cat requests
{ "index" : { "_index" : "test", "_id" : "1" } }
{ "field1" : "value1" }
\$ curl -s -H "Content-Type: application/x-ndjson" -XPOST localhost:9200/_bulk --data-binary "@requests"; echo
{"took":7, "errors": false, "items":[{"index":{"_index":"test","_id":"1","_version":1,"result":"created","forced_refresh":false}}]}
\`\`\`

**Optimistic concurrency control**

Each \`index\` and \`delete\` action within a bulk API call may include the \`if_seq_no\` and \`if_primary_term\` parameters in their respective action and meta data lines.
The \`if_seq_no\` and \`if_primary_term\` parameters control how operations are run, based on the last modification to existing documents. See Optimistic concurrency control for more details.

**Versioning**

Each bulk item can include the version value using the \`version\` field.
It automatically follows the behavior of the index or delete operation based on the \`_version\` mapping.
It also support the \`version_type\`.

**Routing**

Each bulk item can include the routing value using the \`routing\` field.
It automatically follows the behavior of the index or delete operation based on the \`_routing\` mapping.

NOTE: Data streams do not support custom routing unless they were created with the \`allow_custom_routing\` setting enabled in the template.

**Wait for active shards**

When making bulk calls, you can set the \`wait_for_active_shards\` parameter to require a minimum number of shard copies to be active before starting to process the bulk request.

**Refresh**

Control when the changes made by this request are visible to search.

NOTE: Only the shards that receive the bulk request will be affected by refresh.
Imagine a \`_bulk?refresh=wait_for\` request with three documents in it that happen to be routed to different shards in an index with five shards.
The request will only wait for those three shards to refresh.
The other two shards that make up the index do not participate in the \`_bulk\` request at all.

You might want to disable the refresh interval temporarily to improve indexing throughput for large bulk requests.
Refer to the linked documentation for step-by-step instructions using the index settings API.`,
  methods: ['POST', 'PUT', 'POST', 'PUT'],
  patterns: ['/_bulk', '/{index}/_bulk'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(bulk_request, 'body'),
    getLooseObjectFromProperty(bulk_request, 'path'),
    getLooseObjectFromProperty(bulk_request, 'query'),
    getLooseObjectFromProperty(bulk1_request, 'body'),
    getLooseObjectFromProperty(bulk1_request, 'path'),
    getLooseObjectFromProperty(bulk1_request, 'query'),
    getLooseObjectFromProperty(bulk2_request, 'body'),
    getLooseObjectFromProperty(bulk2_request, 'path'),
    getLooseObjectFromProperty(bulk2_request, 'query'),
    getLooseObjectFromProperty(bulk3_request, 'body'),
    getLooseObjectFromProperty(bulk3_request, 'path'),
    getLooseObjectFromProperty(bulk3_request, 'query'),
  ]),
  outputSchema: z.union([bulk_response, bulk1_response, bulk2_response, bulk3_response]),
};
const CAPABILITIES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.capabilities',
  summary: ``,
  description: `Checks if the specified combination of method, API, parameters, and arbitrary capabilities are supported`,
  methods: ['GET'],
  patterns: ['/_capabilities'],
  isInternal: false,
  documentation:
    'https://github.com/elastic/elasticsearch/blob/main/rest-api-spec/src/yamlRestTest/resources/rest-api-spec/test/README.asciidoc#require-or-skip-api-capabilities',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const CAT_ALIASES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.aliases',
  summary: `Get aliases`,
  description: `Get aliases.

Get the cluster's index aliases, including filter and routing information.
This API does not return data stream aliases.

IMPORTANT: CAT APIs are only intended for human consumption using the command line or the Kibana console. They are not intended for use by applications. For application consumption, use the aliases API.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/aliases', '/_cat/aliases/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-aliases',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_aliases_request, 'body'),
    getLooseObjectFromProperty(cat_aliases_request, 'path'),
    getLooseObjectFromProperty(cat_aliases_request, 'query'),
    getLooseObjectFromProperty(cat_aliases1_request, 'body'),
    getLooseObjectFromProperty(cat_aliases1_request, 'path'),
    getLooseObjectFromProperty(cat_aliases1_request, 'query'),
  ]),
  outputSchema: z.union([cat_aliases_response, cat_aliases1_response]),
};
const CAT_ALLOCATION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.allocation',
  summary: `Get shard allocation information`,
  description: `Get shard allocation information.

Get a snapshot of the number of shards allocated to each data node and their disk space.

IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/allocation', '/_cat/allocation/{node_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-allocation',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_allocation_request, 'body'),
    getLooseObjectFromProperty(cat_allocation_request, 'path'),
    getLooseObjectFromProperty(cat_allocation_request, 'query'),
    getLooseObjectFromProperty(cat_allocation1_request, 'body'),
    getLooseObjectFromProperty(cat_allocation1_request, 'path'),
    getLooseObjectFromProperty(cat_allocation1_request, 'query'),
  ]),
  outputSchema: z.union([cat_allocation_response, cat_allocation1_response]),
};
const CAT_CIRCUIT_BREAKER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.circuit_breaker',
  summary: ``,
  description: `Get circuit breakers statistics`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/circuit_breaker', '/_cat/circuit_breaker/{circuit_breaker_patterns}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch#TODO',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const CAT_COMPONENT_TEMPLATES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.component_templates',
  summary: `Get component templates`,
  description: `Get component templates.

Get information about component templates in a cluster.
Component templates are building blocks for constructing index templates that specify index mappings, settings, and aliases.

IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console.
They are not intended for use by applications. For application consumption, use the get component template API.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/component_templates', '/_cat/component_templates/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-component-templates',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_component_templates_request, 'body'),
    getLooseObjectFromProperty(cat_component_templates_request, 'path'),
    getLooseObjectFromProperty(cat_component_templates_request, 'query'),
    getLooseObjectFromProperty(cat_component_templates1_request, 'body'),
    getLooseObjectFromProperty(cat_component_templates1_request, 'path'),
    getLooseObjectFromProperty(cat_component_templates1_request, 'query'),
  ]),
  outputSchema: z.union([cat_component_templates_response, cat_component_templates1_response]),
};
const CAT_COUNT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.count',
  summary: `Get a document count`,
  description: `Get a document count.

Get quick access to a document count for a data stream, an index, or an entire cluster.
The document count only includes live documents, not deleted documents which have not yet been removed by the merge process.

IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console.
They are not intended for use by applications. For application consumption, use the count API.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/count', '/_cat/count/{index}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-count',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_count_request, 'body'),
    getLooseObjectFromProperty(cat_count_request, 'path'),
    getLooseObjectFromProperty(cat_count_request, 'query'),
    getLooseObjectFromProperty(cat_count1_request, 'body'),
    getLooseObjectFromProperty(cat_count1_request, 'path'),
    getLooseObjectFromProperty(cat_count1_request, 'query'),
  ]),
  outputSchema: z.union([cat_count_response, cat_count1_response]),
};
const CAT_FIELDDATA_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.fielddata',
  summary: `Get field data cache information`,
  description: `Get field data cache information.

Get the amount of heap memory currently used by the field data cache on every data node in the cluster.

IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console.
They are not intended for use by applications. For application consumption, use the nodes stats API.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/fielddata', '/_cat/fielddata/{fields}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-fielddata',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_fielddata_request, 'body'),
    getLooseObjectFromProperty(cat_fielddata_request, 'path'),
    getLooseObjectFromProperty(cat_fielddata_request, 'query'),
    getLooseObjectFromProperty(cat_fielddata1_request, 'body'),
    getLooseObjectFromProperty(cat_fielddata1_request, 'path'),
    getLooseObjectFromProperty(cat_fielddata1_request, 'query'),
  ]),
  outputSchema: z.union([cat_fielddata_response, cat_fielddata1_response]),
};
const CAT_HEALTH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.health',
  summary: `Get the cluster health status`,
  description: `Get the cluster health status.

IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console.
They are not intended for use by applications. For application consumption, use the cluster health API.
This API is often used to check malfunctioning clusters.
To help you track cluster health alongside log files and alerting systems, the API returns timestamps in two formats:
\`HH:MM:SS\`, which is human-readable but includes no date information;
\`Unix epoch time\`, which is machine-sortable and includes date information.
The latter format is useful for cluster recoveries that take multiple days.
You can use the cat health API to verify cluster health across multiple nodes.
You also can use the API to track the recovery of a large cluster over a longer period of time.`,
  methods: ['GET'],
  patterns: ['/_cat/health'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-health',
  parameterTypes: {
    pathParams: [],
    urlParams: ['ts', 'h', 's'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_health_request, 'body'),
    getLooseObjectFromProperty(cat_health_request, 'path'),
    getLooseObjectFromProperty(cat_health_request, 'query'),
  ]),
  outputSchema: cat_health_response,
};
const CAT_HELP_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.help',
  summary: `Get CAT help`,
  description: `Get CAT help.

Get help for the CAT APIs.`,
  methods: ['GET'],
  patterns: ['/_cat'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-cat',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_help_request, 'body'),
    getLooseObjectFromProperty(cat_help_request, 'path'),
    getLooseObjectFromProperty(cat_help_request, 'query'),
  ]),
  outputSchema: cat_help_response,
};
const CAT_INDICES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.indices',
  summary: `Get index information`,
  description: `Get index information.

Get high-level information about indices in a cluster, including backing indices for data streams.

Use this request to get the following information for each index in a cluster:
- shard count
- document count
- deleted document count
- primary store size
- total store size of all shards, including shard replicas

These metrics are retrieved directly from Lucene, which Elasticsearch uses internally to power indexing and search. As a result, all document counts include hidden nested documents.
To get an accurate count of Elasticsearch documents, use the cat count or count APIs.

CAT APIs are only intended for human consumption using the command line or Kibana console.
They are not intended for use by applications. For application consumption, use an index endpoint.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/indices', '/_cat/indices/{index}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-indices',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_indices_request, 'body'),
    getLooseObjectFromProperty(cat_indices_request, 'path'),
    getLooseObjectFromProperty(cat_indices_request, 'query'),
    getLooseObjectFromProperty(cat_indices1_request, 'body'),
    getLooseObjectFromProperty(cat_indices1_request, 'path'),
    getLooseObjectFromProperty(cat_indices1_request, 'query'),
  ]),
  outputSchema: z.union([cat_indices_response, cat_indices1_response]),
};
const CAT_MASTER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.master',
  summary: `Get master node information`,
  description: `Get master node information.

Get information about the master node, including the ID, bound IP address, and name.

IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.`,
  methods: ['GET'],
  patterns: ['/_cat/master'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-master',
  parameterTypes: {
    pathParams: [],
    urlParams: ['h', 's', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_master_request, 'body'),
    getLooseObjectFromProperty(cat_master_request, 'path'),
    getLooseObjectFromProperty(cat_master_request, 'query'),
  ]),
  outputSchema: cat_master_response,
};
const CAT_ML_DATA_FRAME_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.ml_data_frame_analytics',
  summary: `Get data frame analytics jobs`,
  description: `Get data frame analytics jobs.

Get configuration and usage information about data frame analytics jobs.

IMPORTANT: CAT APIs are only intended for human consumption using the Kibana
console or command line. They are not intended for use by applications. For
application consumption, use the get data frame analytics jobs statistics API.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/ml/data_frame/analytics', '/_cat/ml/data_frame/analytics/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-ml-data-frame-analytics',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_ml_data_frame_analytics_request, 'body'),
    getLooseObjectFromProperty(cat_ml_data_frame_analytics_request, 'path'),
    getLooseObjectFromProperty(cat_ml_data_frame_analytics_request, 'query'),
    getLooseObjectFromProperty(cat_ml_data_frame_analytics1_request, 'body'),
    getLooseObjectFromProperty(cat_ml_data_frame_analytics1_request, 'path'),
    getLooseObjectFromProperty(cat_ml_data_frame_analytics1_request, 'query'),
  ]),
  outputSchema: z.union([
    cat_ml_data_frame_analytics_response,
    cat_ml_data_frame_analytics1_response,
  ]),
};
const CAT_ML_DATAFEEDS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.ml_datafeeds',
  summary: `Get datafeeds`,
  description: `Get datafeeds.

Get configuration and usage information about datafeeds.
This API returns a maximum of 10,000 datafeeds.
If the Elasticsearch security features are enabled, you must have \`monitor_ml\`, \`monitor\`, \`manage_ml\`, or \`manage\`
cluster privileges to use this API.

IMPORTANT: CAT APIs are only intended for human consumption using the Kibana
console or command line. They are not intended for use by applications. For
application consumption, use the get datafeed statistics API.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/ml/datafeeds', '/_cat/ml/datafeeds/{datafeed_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-ml-datafeeds',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_ml_datafeeds_request, 'body'),
    getLooseObjectFromProperty(cat_ml_datafeeds_request, 'path'),
    getLooseObjectFromProperty(cat_ml_datafeeds_request, 'query'),
    getLooseObjectFromProperty(cat_ml_datafeeds1_request, 'body'),
    getLooseObjectFromProperty(cat_ml_datafeeds1_request, 'path'),
    getLooseObjectFromProperty(cat_ml_datafeeds1_request, 'query'),
  ]),
  outputSchema: z.union([cat_ml_datafeeds_response, cat_ml_datafeeds1_response]),
};
const CAT_ML_JOBS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.ml_jobs',
  summary: `Get anomaly detection jobs`,
  description: `Get anomaly detection jobs.

Get configuration and usage information for anomaly detection jobs.
This API returns a maximum of 10,000 jobs.
If the Elasticsearch security features are enabled, you must have \`monitor_ml\`,
\`monitor\`, \`manage_ml\`, or \`manage\` cluster privileges to use this API.

IMPORTANT: CAT APIs are only intended for human consumption using the Kibana
console or command line. They are not intended for use by applications. For
application consumption, use the get anomaly detection job statistics API.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/ml/anomaly_detectors', '/_cat/ml/anomaly_detectors/{job_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-ml-jobs',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_ml_jobs_request, 'body'),
    getLooseObjectFromProperty(cat_ml_jobs_request, 'path'),
    getLooseObjectFromProperty(cat_ml_jobs_request, 'query'),
    getLooseObjectFromProperty(cat_ml_jobs1_request, 'body'),
    getLooseObjectFromProperty(cat_ml_jobs1_request, 'path'),
    getLooseObjectFromProperty(cat_ml_jobs1_request, 'query'),
  ]),
  outputSchema: z.union([cat_ml_jobs_response, cat_ml_jobs1_response]),
};
const CAT_ML_TRAINED_MODELS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.ml_trained_models',
  summary: `Get trained models`,
  description: `Get trained models.

Get configuration and usage information about inference trained models.

IMPORTANT: CAT APIs are only intended for human consumption using the Kibana
console or command line. They are not intended for use by applications. For
application consumption, use the get trained models statistics API.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/ml/trained_models', '/_cat/ml/trained_models/{model_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-ml-trained-models',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_ml_trained_models_request, 'body'),
    getLooseObjectFromProperty(cat_ml_trained_models_request, 'path'),
    getLooseObjectFromProperty(cat_ml_trained_models_request, 'query'),
    getLooseObjectFromProperty(cat_ml_trained_models1_request, 'body'),
    getLooseObjectFromProperty(cat_ml_trained_models1_request, 'path'),
    getLooseObjectFromProperty(cat_ml_trained_models1_request, 'query'),
  ]),
  outputSchema: z.union([cat_ml_trained_models_response, cat_ml_trained_models1_response]),
};
const CAT_NODEATTRS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.nodeattrs',
  summary: `Get node attribute information`,
  description: `Get node attribute information.

Get information about custom node attributes.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.`,
  methods: ['GET'],
  patterns: ['/_cat/nodeattrs'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-nodeattrs',
  parameterTypes: {
    pathParams: [],
    urlParams: ['h', 's', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_nodeattrs_request, 'body'),
    getLooseObjectFromProperty(cat_nodeattrs_request, 'path'),
    getLooseObjectFromProperty(cat_nodeattrs_request, 'query'),
  ]),
  outputSchema: cat_nodeattrs_response,
};
const CAT_NODES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.nodes',
  summary: `Get node information`,
  description: `Get node information.

Get information about the nodes in a cluster.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.`,
  methods: ['GET'],
  patterns: ['/_cat/nodes'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-nodes',
  parameterTypes: {
    pathParams: [],
    urlParams: ['full_id', 'include_unloaded_segments', 'h', 's', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_nodes_request, 'body'),
    getLooseObjectFromProperty(cat_nodes_request, 'path'),
    getLooseObjectFromProperty(cat_nodes_request, 'query'),
  ]),
  outputSchema: cat_nodes_response,
};
const CAT_PENDING_TASKS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.pending_tasks',
  summary: `Get pending task information`,
  description: `Get pending task information.

Get information about cluster-level changes that have not yet taken effect.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the pending cluster tasks API.`,
  methods: ['GET'],
  patterns: ['/_cat/pending_tasks'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-pending-tasks',
  parameterTypes: {
    pathParams: [],
    urlParams: ['h', 's', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_pending_tasks_request, 'body'),
    getLooseObjectFromProperty(cat_pending_tasks_request, 'path'),
    getLooseObjectFromProperty(cat_pending_tasks_request, 'query'),
  ]),
  outputSchema: cat_pending_tasks_response,
};
const CAT_PLUGINS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.plugins',
  summary: `Get plugin information`,
  description: `Get plugin information.

Get a list of plugins running on each node of a cluster.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.`,
  methods: ['GET'],
  patterns: ['/_cat/plugins'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-plugins',
  parameterTypes: {
    pathParams: [],
    urlParams: ['h', 's', 'include_bootstrap', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_plugins_request, 'body'),
    getLooseObjectFromProperty(cat_plugins_request, 'path'),
    getLooseObjectFromProperty(cat_plugins_request, 'query'),
  ]),
  outputSchema: cat_plugins_response,
};
const CAT_RECOVERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.recovery',
  summary: `Get shard recovery information`,
  description: `Get shard recovery information.

Get information about ongoing and completed shard recoveries.
Shard recovery is the process of initializing a shard copy, such as restoring a primary shard from a snapshot or syncing a replica shard from a primary shard. When a shard recovery completes, the recovered shard is available for search and indexing.
For data streams, the API returns information about the stream’s backing indices.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the index recovery API.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/recovery', '/_cat/recovery/{index}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-recovery',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_recovery_request, 'body'),
    getLooseObjectFromProperty(cat_recovery_request, 'path'),
    getLooseObjectFromProperty(cat_recovery_request, 'query'),
    getLooseObjectFromProperty(cat_recovery1_request, 'body'),
    getLooseObjectFromProperty(cat_recovery1_request, 'path'),
    getLooseObjectFromProperty(cat_recovery1_request, 'query'),
  ]),
  outputSchema: z.union([cat_recovery_response, cat_recovery1_response]),
};
const CAT_REPOSITORIES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.repositories',
  summary: `Get snapshot repository information`,
  description: `Get snapshot repository information.

Get a list of snapshot repositories for a cluster.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the get snapshot repository API.`,
  methods: ['GET'],
  patterns: ['/_cat/repositories'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-repositories',
  parameterTypes: {
    pathParams: [],
    urlParams: ['h', 's', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_repositories_request, 'body'),
    getLooseObjectFromProperty(cat_repositories_request, 'path'),
    getLooseObjectFromProperty(cat_repositories_request, 'query'),
  ]),
  outputSchema: cat_repositories_response,
};
const CAT_SEGMENTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.segments',
  summary: `Get segment information`,
  description: `Get segment information.

Get low-level information about the Lucene segments in index shards.
For data streams, the API returns information about the backing indices.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the index segments API.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/segments', '/_cat/segments/{index}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-segments',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_segments_request, 'body'),
    getLooseObjectFromProperty(cat_segments_request, 'path'),
    getLooseObjectFromProperty(cat_segments_request, 'query'),
    getLooseObjectFromProperty(cat_segments1_request, 'body'),
    getLooseObjectFromProperty(cat_segments1_request, 'path'),
    getLooseObjectFromProperty(cat_segments1_request, 'query'),
  ]),
  outputSchema: z.union([cat_segments_response, cat_segments1_response]),
};
const CAT_SHARDS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.shards',
  summary: `Get shard information`,
  description: `Get shard information.

Get information about the shards in a cluster.
For data streams, the API returns information about the backing indices.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/shards', '/_cat/shards/{index}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-shards',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_shards_request, 'body'),
    getLooseObjectFromProperty(cat_shards_request, 'path'),
    getLooseObjectFromProperty(cat_shards_request, 'query'),
    getLooseObjectFromProperty(cat_shards1_request, 'body'),
    getLooseObjectFromProperty(cat_shards1_request, 'path'),
    getLooseObjectFromProperty(cat_shards1_request, 'query'),
  ]),
  outputSchema: z.union([cat_shards_response, cat_shards1_response]),
};
const CAT_SNAPSHOTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.snapshots',
  summary: `Get snapshot information`,
  description: `Get snapshot information.

Get information about the snapshots stored in one or more repositories.
A snapshot is a backup of an index or running Elasticsearch cluster.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the get snapshot API.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/snapshots', '/_cat/snapshots/{repository}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-snapshots',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_snapshots_request, 'body'),
    getLooseObjectFromProperty(cat_snapshots_request, 'path'),
    getLooseObjectFromProperty(cat_snapshots_request, 'query'),
    getLooseObjectFromProperty(cat_snapshots1_request, 'body'),
    getLooseObjectFromProperty(cat_snapshots1_request, 'path'),
    getLooseObjectFromProperty(cat_snapshots1_request, 'query'),
  ]),
  outputSchema: z.union([cat_snapshots_response, cat_snapshots1_response]),
};
const CAT_TASKS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.tasks',
  summary: `Get task information`,
  description: `Get task information.

Get information about tasks currently running in the cluster.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the task management API.`,
  methods: ['GET'],
  patterns: ['/_cat/tasks'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-tasks',
  parameterTypes: {
    pathParams: [],
    urlParams: [
      'actions',
      'detailed',
      'nodes',
      'parent_task_id',
      'h',
      's',
      'timeout',
      'wait_for_completion',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_tasks_request, 'body'),
    getLooseObjectFromProperty(cat_tasks_request, 'path'),
    getLooseObjectFromProperty(cat_tasks_request, 'query'),
  ]),
  outputSchema: cat_tasks_response,
};
const CAT_TEMPLATES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.templates',
  summary: `Get index template information`,
  description: `Get index template information.

Get information about the index templates in a cluster.
You can use index templates to apply index settings and field mappings to new indices at creation.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the get index template API.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/templates', '/_cat/templates/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-templates',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_templates_request, 'body'),
    getLooseObjectFromProperty(cat_templates_request, 'path'),
    getLooseObjectFromProperty(cat_templates_request, 'query'),
    getLooseObjectFromProperty(cat_templates1_request, 'body'),
    getLooseObjectFromProperty(cat_templates1_request, 'path'),
    getLooseObjectFromProperty(cat_templates1_request, 'query'),
  ]),
  outputSchema: z.union([cat_templates_response, cat_templates1_response]),
};
const CAT_THREAD_POOL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.thread_pool',
  summary: `Get thread pool statistics`,
  description: `Get thread pool statistics.

Get thread pool statistics for each node in a cluster.
Returned information includes all built-in thread pools and custom thread pools.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/thread_pool', '/_cat/thread_pool/{thread_pool_patterns}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-thread-pool',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_thread_pool_request, 'body'),
    getLooseObjectFromProperty(cat_thread_pool_request, 'path'),
    getLooseObjectFromProperty(cat_thread_pool_request, 'query'),
    getLooseObjectFromProperty(cat_thread_pool1_request, 'body'),
    getLooseObjectFromProperty(cat_thread_pool1_request, 'path'),
    getLooseObjectFromProperty(cat_thread_pool1_request, 'query'),
  ]),
  outputSchema: z.union([cat_thread_pool_response, cat_thread_pool1_response]),
};
const CAT_TRANSFORMS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.transforms',
  summary: `Get transform information`,
  description: `Get transform information.

Get configuration and usage information about transforms.

CAT APIs are only intended for human consumption using the Kibana
console or command line. They are not intended for use by applications. For
application consumption, use the get transform statistics API.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cat/transforms', '/_cat/transforms/{transform_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-transforms',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cat_transforms_request, 'body'),
    getLooseObjectFromProperty(cat_transforms_request, 'path'),
    getLooseObjectFromProperty(cat_transforms_request, 'query'),
    getLooseObjectFromProperty(cat_transforms1_request, 'body'),
    getLooseObjectFromProperty(cat_transforms1_request, 'path'),
    getLooseObjectFromProperty(cat_transforms1_request, 'query'),
  ]),
  outputSchema: z.union([cat_transforms_response, cat_transforms1_response]),
};
const CCR_DELETE_AUTO_FOLLOW_PATTERN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.delete_auto_follow_pattern',
  summary: `Delete auto-follow patterns`,
  description: `Delete auto-follow patterns.

Delete a collection of cross-cluster replication auto-follow patterns.`,
  methods: ['DELETE'],
  patterns: ['/_ccr/auto_follow/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-delete-auto-follow-pattern',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ccr_delete_auto_follow_pattern_request, 'body'),
    getLooseObjectFromProperty(ccr_delete_auto_follow_pattern_request, 'path'),
    getLooseObjectFromProperty(ccr_delete_auto_follow_pattern_request, 'query'),
  ]),
  outputSchema: ccr_delete_auto_follow_pattern_response,
};
const CCR_FOLLOW_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.follow',
  summary: `Create a follower`,
  description: `Create a follower.
Create a cross-cluster replication follower index that follows a specific leader index.
When the API returns, the follower index exists and cross-cluster replication starts replicating operations from the leader index to the follower index.`,
  methods: ['PUT'],
  patterns: ['/{index}/_ccr/follow'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-follow',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: ['master_timeout', 'wait_for_active_shards'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ccr_follow_request, 'body'),
    getLooseObjectFromProperty(ccr_follow_request, 'path'),
    getLooseObjectFromProperty(ccr_follow_request, 'query'),
  ]),
  outputSchema: ccr_follow_response,
};
const CCR_FOLLOW_INFO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.follow_info',
  summary: `Get follower information`,
  description: `Get follower information.

Get information about all cross-cluster replication follower indices.
For example, the results include follower index names, leader index names, replication options, and whether the follower indices are active or paused.`,
  methods: ['GET'],
  patterns: ['/{index}/_ccr/info'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-follow-info',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ccr_follow_info_request, 'body'),
    getLooseObjectFromProperty(ccr_follow_info_request, 'path'),
    getLooseObjectFromProperty(ccr_follow_info_request, 'query'),
  ]),
  outputSchema: ccr_follow_info_response,
};
const CCR_FOLLOW_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.follow_stats',
  summary: `Get follower stats`,
  description: `Get follower stats.

Get cross-cluster replication follower stats.
The API returns shard-level stats about the "following tasks" associated with each shard for the specified indices.`,
  methods: ['GET'],
  patterns: ['/{index}/_ccr/stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-follow-stats',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ccr_follow_stats_request, 'body'),
    getLooseObjectFromProperty(ccr_follow_stats_request, 'path'),
    getLooseObjectFromProperty(ccr_follow_stats_request, 'query'),
  ]),
  outputSchema: ccr_follow_stats_response,
};
const CCR_FORGET_FOLLOWER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.forget_follower',
  summary: `Forget a follower`,
  description: `Forget a follower.
Remove the cross-cluster replication follower retention leases from the leader.

A following index takes out retention leases on its leader index.
These leases are used to increase the likelihood that the shards of the leader index retain the history of operations that the shards of the following index need to run replication.
When a follower index is converted to a regular index by the unfollow API (either by directly calling the API or by index lifecycle management tasks), these leases are removed.
However, removal of the leases can fail, for example when the remote cluster containing the leader index is unavailable.
While the leases will eventually expire on their own, their extended existence can cause the leader index to hold more history than necessary and prevent index lifecycle management from performing some operations on the leader index.
This API exists to enable manually removing the leases when the unfollow API is unable to do so.

NOTE: This API does not stop replication by a following index. If you use this API with a follower index that is still actively following, the following index will add back retention leases on the leader.
The only purpose of this API is to handle the case of failure to remove the following retention leases after the unfollow API is invoked.`,
  methods: ['POST'],
  patterns: ['/{index}/_ccr/forget_follower'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-forget-follower',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ccr_forget_follower_request, 'body'),
    getLooseObjectFromProperty(ccr_forget_follower_request, 'path'),
    getLooseObjectFromProperty(ccr_forget_follower_request, 'query'),
  ]),
  outputSchema: ccr_forget_follower_response,
};
const CCR_GET_AUTO_FOLLOW_PATTERN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.get_auto_follow_pattern',
  summary: `Get auto-follow patterns`,
  description: `Get auto-follow patterns.

Get cross-cluster replication auto-follow patterns.`,
  methods: ['GET', 'GET'],
  patterns: ['/_ccr/auto_follow', '/_ccr/auto_follow/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-get-auto-follow-pattern-1',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ccr_get_auto_follow_pattern_request, 'body'),
    getLooseObjectFromProperty(ccr_get_auto_follow_pattern_request, 'path'),
    getLooseObjectFromProperty(ccr_get_auto_follow_pattern_request, 'query'),
    getLooseObjectFromProperty(ccr_get_auto_follow_pattern1_request, 'body'),
    getLooseObjectFromProperty(ccr_get_auto_follow_pattern1_request, 'path'),
    getLooseObjectFromProperty(ccr_get_auto_follow_pattern1_request, 'query'),
  ]),
  outputSchema: z.union([
    ccr_get_auto_follow_pattern_response,
    ccr_get_auto_follow_pattern1_response,
  ]),
};
const CCR_PAUSE_AUTO_FOLLOW_PATTERN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.pause_auto_follow_pattern',
  summary: `Pause an auto-follow pattern`,
  description: `Pause an auto-follow pattern.

Pause a cross-cluster replication auto-follow pattern.
When the API returns, the auto-follow pattern is inactive.
New indices that are created on the remote cluster and match the auto-follow patterns are ignored.

You can resume auto-following with the resume auto-follow pattern API.
When it resumes, the auto-follow pattern is active again and automatically configures follower indices for newly created indices on the remote cluster that match its patterns.
Remote indices that were created while the pattern was paused will also be followed, unless they have been deleted or closed in the interim.`,
  methods: ['POST'],
  patterns: ['/_ccr/auto_follow/{name}/pause'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-pause-auto-follow-pattern',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ccr_pause_auto_follow_pattern_request, 'body'),
    getLooseObjectFromProperty(ccr_pause_auto_follow_pattern_request, 'path'),
    getLooseObjectFromProperty(ccr_pause_auto_follow_pattern_request, 'query'),
  ]),
  outputSchema: ccr_pause_auto_follow_pattern_response,
};
const CCR_PAUSE_FOLLOW_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.pause_follow',
  summary: `Pause a follower`,
  description: `Pause a follower.

Pause a cross-cluster replication follower index.
The follower index will not fetch any additional operations from the leader index.
You can resume following with the resume follower API.
You can pause and resume a follower index to change the configuration of the following task.`,
  methods: ['POST'],
  patterns: ['/{index}/_ccr/pause_follow'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-pause-follow',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ccr_pause_follow_request, 'body'),
    getLooseObjectFromProperty(ccr_pause_follow_request, 'path'),
    getLooseObjectFromProperty(ccr_pause_follow_request, 'query'),
  ]),
  outputSchema: ccr_pause_follow_response,
};
const CCR_PUT_AUTO_FOLLOW_PATTERN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.put_auto_follow_pattern',
  summary: `Create or update auto-follow patterns`,
  description: `Create or update auto-follow patterns.
Create a collection of cross-cluster replication auto-follow patterns for a remote cluster.
Newly created indices on the remote cluster that match any of the patterns are automatically configured as follower indices.
Indices on the remote cluster that were created before the auto-follow pattern was created will not be auto-followed even if they match the pattern.

This API can also be used to update auto-follow patterns.
NOTE: Follower indices that were configured automatically before updating an auto-follow pattern will remain unchanged even if they do not match against the new patterns.`,
  methods: ['PUT'],
  patterns: ['/_ccr/auto_follow/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-put-auto-follow-pattern',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ccr_put_auto_follow_pattern_request, 'body'),
    getLooseObjectFromProperty(ccr_put_auto_follow_pattern_request, 'path'),
    getLooseObjectFromProperty(ccr_put_auto_follow_pattern_request, 'query'),
  ]),
  outputSchema: ccr_put_auto_follow_pattern_response,
};
const CCR_RESUME_AUTO_FOLLOW_PATTERN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.resume_auto_follow_pattern',
  summary: `Resume an auto-follow pattern`,
  description: `Resume an auto-follow pattern.

Resume a cross-cluster replication auto-follow pattern that was paused.
The auto-follow pattern will resume configuring following indices for newly created indices that match its patterns on the remote cluster.
Remote indices created while the pattern was paused will also be followed unless they have been deleted or closed in the interim.`,
  methods: ['POST'],
  patterns: ['/_ccr/auto_follow/{name}/resume'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-resume-auto-follow-pattern',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ccr_resume_auto_follow_pattern_request, 'body'),
    getLooseObjectFromProperty(ccr_resume_auto_follow_pattern_request, 'path'),
    getLooseObjectFromProperty(ccr_resume_auto_follow_pattern_request, 'query'),
  ]),
  outputSchema: ccr_resume_auto_follow_pattern_response,
};
const CCR_RESUME_FOLLOW_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.resume_follow',
  summary: `Resume a follower`,
  description: `Resume a follower.
Resume a cross-cluster replication follower index that was paused.
The follower index could have been paused with the pause follower API.
Alternatively it could be paused due to replication that cannot be retried due to failures during following tasks.
When this API returns, the follower index will resume fetching operations from the leader index.`,
  methods: ['POST'],
  patterns: ['/{index}/_ccr/resume_follow'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-resume-follow',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ccr_resume_follow_request, 'body'),
    getLooseObjectFromProperty(ccr_resume_follow_request, 'path'),
    getLooseObjectFromProperty(ccr_resume_follow_request, 'query'),
  ]),
  outputSchema: ccr_resume_follow_response,
};
const CCR_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.stats',
  summary: `Get cross-cluster replication stats`,
  description: `Get cross-cluster replication stats.

This API returns stats about auto-following and the same shard-level stats as the get follower stats API.`,
  methods: ['GET'],
  patterns: ['/_ccr/stats'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-stats',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ccr_stats_request, 'body'),
    getLooseObjectFromProperty(ccr_stats_request, 'path'),
    getLooseObjectFromProperty(ccr_stats_request, 'query'),
  ]),
  outputSchema: ccr_stats_response,
};
const CCR_UNFOLLOW_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.unfollow',
  summary: `Unfollow an index`,
  description: `Unfollow an index.

Convert a cross-cluster replication follower index to a regular index.
The API stops the following task associated with a follower index and removes index metadata and settings associated with cross-cluster replication.
The follower index must be paused and closed before you call the unfollow API.

> info
> Currently cross-cluster replication does not support converting an existing regular index to a follower index. Converting a follower index to a regular index is an irreversible operation.`,
  methods: ['POST'],
  patterns: ['/{index}/_ccr/unfollow'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-unfollow',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ccr_unfollow_request, 'body'),
    getLooseObjectFromProperty(ccr_unfollow_request, 'path'),
    getLooseObjectFromProperty(ccr_unfollow_request, 'query'),
  ]),
  outputSchema: ccr_unfollow_response,
};
const CLEAR_SCROLL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.clear_scroll',
  summary: `Clear a scrolling search`,
  description: `Clear a scrolling search.
Clear the search context and results for a scrolling search.`,
  methods: ['DELETE', 'DELETE'],
  patterns: ['/_search/scroll', '/_search/scroll/{scroll_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-clear-scroll',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(clear_scroll_request, 'body'),
    getLooseObjectFromProperty(clear_scroll_request, 'path'),
    getLooseObjectFromProperty(clear_scroll_request, 'query'),
    getLooseObjectFromProperty(clear_scroll1_request, 'body'),
    getLooseObjectFromProperty(clear_scroll1_request, 'path'),
    getLooseObjectFromProperty(clear_scroll1_request, 'query'),
  ]),
  outputSchema: z.union([clear_scroll_response, clear_scroll1_response]),
};
const CLOSE_POINT_IN_TIME_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.close_point_in_time',
  summary: `Close a point in time`,
  description: `Close a point in time.
A point in time must be opened explicitly before being used in search requests.
The \`keep_alive\` parameter tells Elasticsearch how long it should persist.
A point in time is automatically closed when the \`keep_alive\` period has elapsed.
However, keeping points in time has a cost; close them as soon as they are no longer required for search requests.`,
  methods: ['DELETE'],
  patterns: ['/_pit'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-open-point-in-time',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(close_point_in_time_request, 'body'),
    getLooseObjectFromProperty(close_point_in_time_request, 'path'),
    getLooseObjectFromProperty(close_point_in_time_request, 'query'),
  ]),
  outputSchema: close_point_in_time_response,
};
const CLUSTER_ALLOCATION_EXPLAIN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.allocation_explain',
  summary: `Explain the shard allocations`,
  description: `Explain the shard allocations.
Get explanations for shard allocations in the cluster.
This API accepts the current_node, index, primary and shard parameters in the request body or in query parameters, but not in both at the same time.
For unassigned shards, it provides an explanation for why the shard is unassigned.
For assigned shards, it provides an explanation for why the shard is remaining on its current node and has not moved or rebalanced to another node.
This API can be very useful when attempting to diagnose why a shard is unassigned or why a shard continues to remain on its current node when you might expect otherwise.
Refer to the linked documentation for examples of how to troubleshoot allocation issues using this API.`,
  methods: ['GET', 'POST'],
  patterns: ['/_cluster/allocation/explain'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-allocation-explain',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cluster_allocation_explain_request, 'body'),
    getLooseObjectFromProperty(cluster_allocation_explain_request, 'path'),
    getLooseObjectFromProperty(cluster_allocation_explain_request, 'query'),
    getLooseObjectFromProperty(cluster_allocation_explain1_request, 'body'),
    getLooseObjectFromProperty(cluster_allocation_explain1_request, 'path'),
    getLooseObjectFromProperty(cluster_allocation_explain1_request, 'query'),
  ]),
  outputSchema: z.union([
    cluster_allocation_explain_response,
    cluster_allocation_explain1_response,
  ]),
};
const CLUSTER_DELETE_COMPONENT_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.delete_component_template',
  summary: `Delete component templates`,
  description: `Delete component templates.
Component templates are building blocks for constructing index templates that specify index mappings, settings, and aliases.`,
  methods: ['DELETE'],
  patterns: ['/_component_template/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'local'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cluster_delete_component_template_request, 'body'),
    getLooseObjectFromProperty(cluster_delete_component_template_request, 'path'),
    getLooseObjectFromProperty(cluster_delete_component_template_request, 'query'),
  ]),
  outputSchema: cluster_delete_component_template_response,
};
const CLUSTER_DELETE_VOTING_CONFIG_EXCLUSIONS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.delete_voting_config_exclusions',
  summary: `Clear cluster voting config exclusions`,
  description: `Clear cluster voting config exclusions.
Remove master-eligible nodes from the voting configuration exclusion list.`,
  methods: ['DELETE'],
  patterns: ['/_cluster/voting_config_exclusions'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-post-voting-config-exclusions',
  parameterTypes: {
    pathParams: [],
    urlParams: [
      'node_names',
      'node_ids',
      'master_timeout',
      'timeout',
      'master_timeout',
      'wait_for_removal',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cluster_delete_voting_config_exclusions_request, 'body'),
    getLooseObjectFromProperty(cluster_delete_voting_config_exclusions_request, 'path'),
    getLooseObjectFromProperty(cluster_delete_voting_config_exclusions_request, 'query'),
  ]),
  outputSchema: cluster_delete_voting_config_exclusions_response,
};
const CLUSTER_EXISTS_COMPONENT_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.exists_component_template',
  summary: `Check component templates`,
  description: `Check component templates.
Returns information about whether a particular component template exists.`,
  methods: ['HEAD'],
  patterns: ['/_component_template/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'local'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cluster_exists_component_template_request, 'body'),
    getLooseObjectFromProperty(cluster_exists_component_template_request, 'path'),
    getLooseObjectFromProperty(cluster_exists_component_template_request, 'query'),
  ]),
  outputSchema: cluster_exists_component_template_response,
};
const CLUSTER_GET_COMPONENT_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.get_component_template',
  summary: `Get component templates`,
  description: `Get component templates.
Get information about component templates.`,
  methods: ['GET', 'GET'],
  patterns: ['/_component_template', '/_component_template/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'local'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cluster_get_component_template_request, 'body'),
    getLooseObjectFromProperty(cluster_get_component_template_request, 'path'),
    getLooseObjectFromProperty(cluster_get_component_template_request, 'query'),
    getLooseObjectFromProperty(cluster_get_component_template1_request, 'body'),
    getLooseObjectFromProperty(cluster_get_component_template1_request, 'path'),
    getLooseObjectFromProperty(cluster_get_component_template1_request, 'query'),
  ]),
  outputSchema: z.union([
    cluster_get_component_template_response,
    cluster_get_component_template1_response,
  ]),
};
const CLUSTER_GET_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.get_settings',
  summary: `Get cluster-wide settings`,
  description: `Get cluster-wide settings.

By default, it returns only settings that have been explicitly defined.`,
  methods: ['GET'],
  patterns: ['/_cluster/settings'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-get-settings',
  parameterTypes: {
    pathParams: [],
    urlParams: [
      'flat_settings',
      'include_defaults',
      'master_timeout',
      'timeout',
      'flat_settings',
      'master_timeout',
      'timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cluster_get_settings_request, 'body'),
    getLooseObjectFromProperty(cluster_get_settings_request, 'path'),
    getLooseObjectFromProperty(cluster_get_settings_request, 'query'),
  ]),
  outputSchema: cluster_get_settings_response,
};
const CLUSTER_HEALTH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.health',
  summary: `Get the cluster health status`,
  description: `Get the cluster health status.

You can also use the API to get the health status of only specified data streams and indices.
For data streams, the API retrieves the health status of the stream’s backing indices.

The cluster health status is: green, yellow or red.
On the shard level, a red status indicates that the specific shard is not allocated in the cluster. Yellow means that the primary shard is allocated but replicas are not. Green means that all shards are allocated.
The index level status is controlled by the worst shard status.

One of the main benefits of the API is the ability to wait until the cluster reaches a certain high watermark health level.
The cluster status is controlled by the worst index status.`,
  methods: ['GET', 'GET'],
  patterns: ['/_cluster/health', '/_cluster/health/{index}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-health',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cluster_health_request, 'body'),
    getLooseObjectFromProperty(cluster_health_request, 'path'),
    getLooseObjectFromProperty(cluster_health_request, 'query'),
    getLooseObjectFromProperty(cluster_health1_request, 'body'),
    getLooseObjectFromProperty(cluster_health1_request, 'path'),
    getLooseObjectFromProperty(cluster_health1_request, 'query'),
  ]),
  outputSchema: z.union([cluster_health_response, cluster_health1_response]),
};
const CLUSTER_INFO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.info',
  summary: `Get cluster info`,
  description: `Get cluster info.
Returns basic information about the cluster.`,
  methods: ['GET'],
  patterns: ['/_info/{target}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-info',
  parameterTypes: {
    pathParams: ['target'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cluster_info_request, 'body'),
    getLooseObjectFromProperty(cluster_info_request, 'path'),
    getLooseObjectFromProperty(cluster_info_request, 'query'),
  ]),
  outputSchema: cluster_info_response,
};
const CLUSTER_PENDING_TASKS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.pending_tasks',
  summary: `Get the pending cluster tasks`,
  description: `Get the pending cluster tasks.
Get information about cluster-level changes (such as create index, update mapping, allocate or fail shard) that have not yet taken effect.

NOTE: This API returns a list of any pending updates to the cluster state.
These are distinct from the tasks reported by the task management API which include periodic tasks and tasks initiated by the user, such as node stats, search queries, or create index requests.
However, if a user-initiated task such as a create index command causes a cluster state update, the activity of this task might be reported by both task api and pending cluster tasks API.`,
  methods: ['GET'],
  patterns: ['/_cluster/pending_tasks'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-pending-tasks',
  parameterTypes: {
    pathParams: [],
    urlParams: ['local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cluster_pending_tasks_request, 'body'),
    getLooseObjectFromProperty(cluster_pending_tasks_request, 'path'),
    getLooseObjectFromProperty(cluster_pending_tasks_request, 'query'),
  ]),
  outputSchema: cluster_pending_tasks_response,
};
const CLUSTER_POST_VOTING_CONFIG_EXCLUSIONS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.post_voting_config_exclusions',
  summary: `Update voting configuration exclusions`,
  description: `Update voting configuration exclusions.
Update the cluster voting config exclusions by node IDs or node names.
By default, if there are more than three master-eligible nodes in the cluster and you remove fewer than half of the master-eligible nodes in the cluster at once, the voting configuration automatically shrinks.
If you want to shrink the voting configuration to contain fewer than three nodes or to remove half or more of the master-eligible nodes in the cluster at once, use this API to remove departing nodes from the voting configuration manually.
The API adds an entry for each specified node to the cluster’s voting configuration exclusions list.
It then waits until the cluster has reconfigured its voting configuration to exclude the specified nodes.

Clusters should have no voting configuration exclusions in normal operation.
Once the excluded nodes have stopped, clear the voting configuration exclusions with \`DELETE /_cluster/voting_config_exclusions\`.
This API waits for the nodes to be fully removed from the cluster before it returns.
If your cluster has voting configuration exclusions for nodes that you no longer intend to remove, use \`DELETE /_cluster/voting_config_exclusions?wait_for_removal=false\` to clear the voting configuration exclusions without waiting for the nodes to leave the cluster.

A response to \`POST /_cluster/voting_config_exclusions\` with an HTTP status code of 200 OK guarantees that the node has been removed from the voting configuration and will not be reinstated until the voting configuration exclusions are cleared by calling \`DELETE /_cluster/voting_config_exclusions\`.
If the call to \`POST /_cluster/voting_config_exclusions\` fails or returns a response with an HTTP status code other than 200 OK then the node may not have been removed from the voting configuration.
In that case, you may safely retry the call.

NOTE: Voting exclusions are required only when you remove at least half of the master-eligible nodes from a cluster in a short time period.
They are not required when removing master-ineligible nodes or when removing fewer than half of the master-eligible nodes.`,
  methods: ['POST'],
  patterns: ['/_cluster/voting_config_exclusions'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-post-voting-config-exclusions',
  parameterTypes: {
    pathParams: [],
    urlParams: [
      'node_names',
      'node_ids',
      'master_timeout',
      'timeout',
      'master_timeout',
      'wait_for_removal',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cluster_post_voting_config_exclusions_request, 'body'),
    getLooseObjectFromProperty(cluster_post_voting_config_exclusions_request, 'path'),
    getLooseObjectFromProperty(cluster_post_voting_config_exclusions_request, 'query'),
  ]),
  outputSchema: cluster_post_voting_config_exclusions_response,
};
const CLUSTER_PUT_COMPONENT_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.put_component_template',
  summary: `Create or update a component template`,
  description: `Create or update a component template.
Component templates are building blocks for constructing index templates that specify index mappings, settings, and aliases.

An index template can be composed of multiple component templates.
To use a component template, specify it in an index template’s \`composed_of\` list.
Component templates are only applied to new data streams and indices as part of a matching index template.

Settings and mappings specified directly in the index template or the create index request override any settings or mappings specified in a component template.

Component templates are only used during index creation.
For data streams, this includes data stream creation and the creation of a stream’s backing indices.
Changes to component templates do not affect existing indices, including a stream’s backing indices.

You can use C-style \`/* *\\/\` block comments in component templates.
You can include comments anywhere in the request body except before the opening curly bracket.

**Applying component templates**

You cannot directly apply a component template to a data stream or index.
To be applied, a component template must be included in an index template's \`composed_of\` list.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_component_template/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'local'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cluster_put_component_template_request, 'body'),
    getLooseObjectFromProperty(cluster_put_component_template_request, 'path'),
    getLooseObjectFromProperty(cluster_put_component_template_request, 'query'),
    getLooseObjectFromProperty(cluster_put_component_template1_request, 'body'),
    getLooseObjectFromProperty(cluster_put_component_template1_request, 'path'),
    getLooseObjectFromProperty(cluster_put_component_template1_request, 'query'),
  ]),
  outputSchema: z.union([
    cluster_put_component_template_response,
    cluster_put_component_template1_response,
  ]),
};
const CLUSTER_PUT_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.put_settings',
  summary: `Update the cluster settings`,
  description: `Update the cluster settings.

Configure and update dynamic settings on a running cluster.
You can also configure dynamic settings locally on an unstarted or shut down node in \`elasticsearch.yml\`.

Updates made with this API can be persistent, which apply across cluster restarts, or transient, which reset after a cluster restart.
You can also reset transient or persistent settings by assigning them a null value.

If you configure the same setting using multiple methods, Elasticsearch applies the settings in following order of precedence: 1) Transient setting; 2) Persistent setting; 3) \`elasticsearch.yml\` setting; 4) Default setting value.
For example, you can apply a transient setting to override a persistent setting or \`elasticsearch.yml\` setting.
However, a change to an \`elasticsearch.yml\` setting will not override a defined transient or persistent setting.

TIP: In Elastic Cloud, use the user settings feature to configure all cluster settings. This method automatically rejects unsafe settings that could break your cluster.
If you run Elasticsearch on your own hardware, use this API to configure dynamic cluster settings.
Only use \`elasticsearch.yml\` for static cluster settings and node settings.
The API doesn’t require a restart and ensures a setting’s value is the same on all nodes.

WARNING: Transient cluster settings are no longer recommended. Use persistent cluster settings instead.
If a cluster becomes unstable, transient settings can clear unexpectedly, resulting in a potentially undesired cluster configuration.`,
  methods: ['PUT'],
  patterns: ['/_cluster/settings'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-settings',
  parameterTypes: {
    pathParams: [],
    urlParams: [
      'flat_settings',
      'include_defaults',
      'master_timeout',
      'timeout',
      'flat_settings',
      'master_timeout',
      'timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cluster_put_settings_request, 'body'),
    getLooseObjectFromProperty(cluster_put_settings_request, 'path'),
    getLooseObjectFromProperty(cluster_put_settings_request, 'query'),
  ]),
  outputSchema: cluster_put_settings_response,
};
const CLUSTER_REMOTE_INFO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.remote_info',
  summary: `Get remote cluster information`,
  description: `Get remote cluster information.

Get information about configured remote clusters.
The API returns connection and endpoint information keyed by the configured remote cluster alias.

> info
> This API returns information that reflects current state on the local cluster.
> The \`connected\` field does not necessarily reflect whether a remote cluster is down or unavailable, only whether there is currently an open connection to it.
> Elasticsearch does not spontaneously try to reconnect to a disconnected remote cluster.
> To trigger a reconnection, attempt a cross-cluster search, ES|QL cross-cluster search, or try the [resolve cluster endpoint](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-resolve-cluster).`,
  methods: ['GET'],
  patterns: ['/_remote/info'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-remote-info',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cluster_remote_info_request, 'body'),
    getLooseObjectFromProperty(cluster_remote_info_request, 'path'),
    getLooseObjectFromProperty(cluster_remote_info_request, 'query'),
  ]),
  outputSchema: cluster_remote_info_response,
};
const CLUSTER_REROUTE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.reroute',
  summary: `Reroute the cluster`,
  description: `Reroute the cluster.
Manually change the allocation of individual shards in the cluster.
For example, a shard can be moved from one node to another explicitly, an allocation can be canceled, and an unassigned shard can be explicitly allocated to a specific node.

It is important to note that after processing any reroute commands Elasticsearch will perform rebalancing as normal (respecting the values of settings such as \`cluster.routing.rebalance.enable\`) in order to remain in a balanced state.
For example, if the requested allocation includes moving a shard from node1 to node2 then this may cause a shard to be moved from node2 back to node1 to even things out.

The cluster can be set to disable allocations using the \`cluster.routing.allocation.enable\` setting.
If allocations are disabled then the only allocations that will be performed are explicit ones given using the reroute command, and consequent allocations due to rebalancing.

The cluster will attempt to allocate a shard a maximum of \`index.allocation.max_retries\` times in a row (defaults to \`5\`), before giving up and leaving the shard unallocated.
This scenario can be caused by structural problems such as having an analyzer which refers to a stopwords file which doesn’t exist on all nodes.

Once the problem has been corrected, allocation can be manually retried by calling the reroute API with the \`?retry_failed\` URI query parameter, which will attempt a single retry round for these shards.`,
  methods: ['POST'],
  patterns: ['/_cluster/reroute'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-reroute',
  parameterTypes: {
    pathParams: [],
    urlParams: ['dry_run', 'explain', 'metric', 'retry_failed', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cluster_reroute_request, 'body'),
    getLooseObjectFromProperty(cluster_reroute_request, 'path'),
    getLooseObjectFromProperty(cluster_reroute_request, 'query'),
  ]),
  outputSchema: cluster_reroute_response,
};
const CLUSTER_STATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.state',
  summary: `Get the cluster state`,
  description: `Get the cluster state.
Get comprehensive information about the state of the cluster.

The cluster state is an internal data structure which keeps track of a variety of information needed by every node, including the identity and attributes of the other nodes in the cluster; cluster-wide settings; index metadata, including the mapping and settings for each index; the location and status of every shard copy in the cluster.

The elected master node ensures that every node in the cluster has a copy of the same cluster state.
This API lets you retrieve a representation of this internal state for debugging or diagnostic purposes.
You may need to consult the Elasticsearch source code to determine the precise meaning of the response.

By default the API will route requests to the elected master node since this node is the authoritative source of cluster states.
You can also retrieve the cluster state held on the node handling the API request by adding the \`?local=true\` query parameter.

Elasticsearch may need to expend significant effort to compute a response to this API in larger clusters, and the response may comprise a very large quantity of data.
If you use this API repeatedly, your cluster may become unstable.

WARNING: The response is a representation of an internal data structure.
Its format is not subject to the same compatibility guarantees as other more stable APIs and may change from version to version.
Do not query this API using external monitoring tools.
Instead, obtain the information you require using other more stable cluster APIs.`,
  methods: ['GET', 'GET', 'GET'],
  patterns: ['/_cluster/state', '/_cluster/state/{metric}', '/_cluster/state/{metric}/{index}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-state',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cluster_state_request, 'body'),
    getLooseObjectFromProperty(cluster_state_request, 'path'),
    getLooseObjectFromProperty(cluster_state_request, 'query'),
    getLooseObjectFromProperty(cluster_state1_request, 'body'),
    getLooseObjectFromProperty(cluster_state1_request, 'path'),
    getLooseObjectFromProperty(cluster_state1_request, 'query'),
    getLooseObjectFromProperty(cluster_state2_request, 'body'),
    getLooseObjectFromProperty(cluster_state2_request, 'path'),
    getLooseObjectFromProperty(cluster_state2_request, 'query'),
  ]),
  outputSchema: z.union([cluster_state_response, cluster_state1_response, cluster_state2_response]),
};
const CLUSTER_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.stats',
  summary: `Get cluster statistics`,
  description: `Get cluster statistics.
Get basic index metrics (shard numbers, store size, memory usage) and information about the current nodes that form the cluster (number, roles, os, jvm versions, memory usage, cpu and installed plugins).`,
  methods: ['GET', 'GET'],
  patterns: ['/_cluster/stats', '/_cluster/stats/nodes/{node_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-stats',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cluster_stats_request, 'body'),
    getLooseObjectFromProperty(cluster_stats_request, 'path'),
    getLooseObjectFromProperty(cluster_stats_request, 'query'),
    getLooseObjectFromProperty(cluster_stats1_request, 'body'),
    getLooseObjectFromProperty(cluster_stats1_request, 'path'),
    getLooseObjectFromProperty(cluster_stats1_request, 'query'),
  ]),
  outputSchema: z.union([cluster_stats_response, cluster_stats1_response]),
};
const CONNECTOR_CHECK_IN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.check_in',
  summary: `Check in a connector`,
  description: `Check in a connector.

Update the \`last_seen\` field in the connector and set it to the current timestamp.`,
  methods: ['PUT'],
  patterns: ['/_connector/{connector_id}/_check_in'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-check-in',
  parameterTypes: {
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_check_in_request, 'body'),
    getLooseObjectFromProperty(connector_check_in_request, 'path'),
    getLooseObjectFromProperty(connector_check_in_request, 'query'),
  ]),
  outputSchema: connector_check_in_response,
};
const CONNECTOR_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.delete',
  summary: `Delete a connector`,
  description: `Delete a connector.

Removes a connector and associated sync jobs.
This is a destructive action that is not recoverable.
NOTE: This action doesn’t delete any API keys, ingest pipelines, or data indices associated with the connector.
These need to be removed manually.`,
  methods: ['DELETE'],
  patterns: ['/_connector/{connector_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-delete',
  parameterTypes: {
    pathParams: ['connector_id', 'connector_id'],
    urlParams: ['include_deleted', 'delete_sync_jobs', 'hard'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_delete_request, 'body'),
    getLooseObjectFromProperty(connector_delete_request, 'path'),
    getLooseObjectFromProperty(connector_delete_request, 'query'),
  ]),
  outputSchema: connector_delete_response,
};
const CONNECTOR_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.get',
  summary: `Get a connector`,
  description: `Get a connector.

Get the details about a connector.`,
  methods: ['GET'],
  patterns: ['/_connector/{connector_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-get',
  parameterTypes: {
    pathParams: ['connector_id', 'connector_id'],
    urlParams: ['include_deleted', 'delete_sync_jobs', 'hard'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_get_request, 'body'),
    getLooseObjectFromProperty(connector_get_request, 'path'),
    getLooseObjectFromProperty(connector_get_request, 'query'),
  ]),
  outputSchema: connector_get_response,
};
const CONNECTOR_LAST_SYNC_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.last_sync',
  summary: ``,
  description: `Update the connector last sync stats.

Update the fields related to the last sync of a connector.
This action is used for analytics and monitoring.`,
  methods: ['PUT'],
  patterns: ['/_connector/{connector_id}/_last_sync'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-last-sync',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const CONNECTOR_LIST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.list',
  summary: `Get all connectors`,
  description: `Get all connectors.

Get information about all connectors.`,
  methods: ['GET'],
  patterns: ['/_connector'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-list',
  parameterTypes: {
    pathParams: [],
    urlParams: [
      'from',
      'size',
      'index_name',
      'connector_name',
      'service_type',
      'include_deleted',
      'query',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_list_request, 'body'),
    getLooseObjectFromProperty(connector_list_request, 'path'),
    getLooseObjectFromProperty(connector_list_request, 'query'),
  ]),
  outputSchema: connector_list_response,
};
const CONNECTOR_POST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.post',
  summary: `Create a connector`,
  description: `Create a connector.

Connectors are Elasticsearch integrations that bring content from third-party data sources, which can be deployed on Elastic Cloud or hosted on your own infrastructure.
Elastic managed connectors (Native connectors) are a managed service on Elastic Cloud.
Self-managed connectors (Connector clients) are self-managed on your infrastructure.`,
  methods: ['POST'],
  patterns: ['/_connector'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-put',
  parameterTypes: {
    pathParams: [],
    urlParams: [
      'from',
      'size',
      'index_name',
      'connector_name',
      'service_type',
      'include_deleted',
      'query',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_post_request, 'body'),
    getLooseObjectFromProperty(connector_post_request, 'path'),
    getLooseObjectFromProperty(connector_post_request, 'query'),
  ]),
  outputSchema: connector_post_response,
};
const CONNECTOR_PUT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.put',
  summary: `Create or update a connector`,
  description: `Create or update a connector.`,
  methods: ['PUT', 'PUT'],
  patterns: ['/_connector/{connector_id}', '/_connector'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-put',
  parameterTypes: {
    pathParams: ['connector_id', 'connector_id'],
    urlParams: [
      'include_deleted',
      'delete_sync_jobs',
      'hard',
      'from',
      'size',
      'index_name',
      'connector_name',
      'service_type',
      'include_deleted',
      'query',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_put_request, 'body'),
    getLooseObjectFromProperty(connector_put_request, 'path'),
    getLooseObjectFromProperty(connector_put_request, 'query'),
    getLooseObjectFromProperty(connector_put1_request, 'body'),
    getLooseObjectFromProperty(connector_put1_request, 'path'),
    getLooseObjectFromProperty(connector_put1_request, 'query'),
  ]),
  outputSchema: z.union([connector_put_response, connector_put1_response]),
};
const CONNECTOR_SECRET_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.secret_delete',
  summary: ``,
  description: `Deletes a connector secret`,
  methods: ['DELETE'],
  patterns: ['/_connector/_secret/{id}'],
  isInternal: false,
  documentation: 'null',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const CONNECTOR_SECRET_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.secret_get',
  summary: ``,
  description: `Retrieves a secret stored by Connectors`,
  methods: ['GET'],
  patterns: ['/_connector/_secret/{id}'],
  isInternal: false,
  documentation: 'null',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const CONNECTOR_SECRET_POST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.secret_post',
  summary: ``,
  description: `Creates a secret for a Connector`,
  methods: ['POST'],
  patterns: ['/_connector/_secret'],
  isInternal: false,
  documentation: 'null',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const CONNECTOR_SECRET_PUT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.secret_put',
  summary: ``,
  description: `Creates or updates a secret for a Connector`,
  methods: ['PUT'],
  patterns: ['/_connector/_secret/{id}'],
  isInternal: false,
  documentation: 'null',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const CONNECTOR_SYNC_JOB_CANCEL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.sync_job_cancel',
  summary: `Cancel a connector sync job`,
  description: `Cancel a connector sync job.

Cancel a connector sync job, which sets the status to cancelling and updates \`cancellation_requested_at\` to the current time.
The connector service is then responsible for setting the status of connector sync jobs to cancelled.`,
  methods: ['PUT'],
  patterns: ['/_connector/_sync_job/{connector_sync_job_id}/_cancel'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-cancel',
  parameterTypes: {
    pathParams: ['connector_sync_job_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_sync_job_cancel_request, 'body'),
    getLooseObjectFromProperty(connector_sync_job_cancel_request, 'path'),
    getLooseObjectFromProperty(connector_sync_job_cancel_request, 'query'),
  ]),
  outputSchema: connector_sync_job_cancel_response,
};
const CONNECTOR_SYNC_JOB_CHECK_IN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.sync_job_check_in',
  summary: `Check in a connector sync job`,
  description: `Check in a connector sync job.
Check in a connector sync job and set the \`last_seen\` field to the current time before updating it in the internal index.

To sync data using self-managed connectors, you need to deploy the Elastic connector service on your own infrastructure.
This service runs automatically on Elastic Cloud for Elastic managed connectors.`,
  methods: ['PUT'],
  patterns: ['/_connector/_sync_job/{connector_sync_job_id}/_check_in'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-check-in',
  parameterTypes: {
    pathParams: ['connector_sync_job_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_sync_job_check_in_request, 'body'),
    getLooseObjectFromProperty(connector_sync_job_check_in_request, 'path'),
    getLooseObjectFromProperty(connector_sync_job_check_in_request, 'query'),
  ]),
  outputSchema: connector_sync_job_check_in_response,
};
const CONNECTOR_SYNC_JOB_CLAIM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.sync_job_claim',
  summary: `Claim a connector sync job`,
  description: `Claim a connector sync job.
This action updates the job status to \`in_progress\` and sets the \`last_seen\` and \`started_at\` timestamps to the current time.
Additionally, it can set the \`sync_cursor\` property for the sync job.

This API is not intended for direct connector management by users.
It supports the implementation of services that utilize the connector protocol to communicate with Elasticsearch.

To sync data using self-managed connectors, you need to deploy the Elastic connector service on your own infrastructure.
This service runs automatically on Elastic Cloud for Elastic managed connectors.`,
  methods: ['PUT'],
  patterns: ['/_connector/_sync_job/{connector_sync_job_id}/_claim'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-claim',
  parameterTypes: {
    pathParams: ['connector_sync_job_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_sync_job_claim_request, 'body'),
    getLooseObjectFromProperty(connector_sync_job_claim_request, 'path'),
    getLooseObjectFromProperty(connector_sync_job_claim_request, 'query'),
  ]),
  outputSchema: connector_sync_job_claim_response,
};
const CONNECTOR_SYNC_JOB_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.sync_job_delete',
  summary: `Delete a connector sync job`,
  description: `Delete a connector sync job.

Remove a connector sync job and its associated data.
This is a destructive action that is not recoverable.`,
  methods: ['DELETE'],
  patterns: ['/_connector/_sync_job/{connector_sync_job_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-delete',
  parameterTypes: {
    pathParams: ['connector_sync_job_id', 'connector_sync_job_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_sync_job_delete_request, 'body'),
    getLooseObjectFromProperty(connector_sync_job_delete_request, 'path'),
    getLooseObjectFromProperty(connector_sync_job_delete_request, 'query'),
  ]),
  outputSchema: connector_sync_job_delete_response,
};
const CONNECTOR_SYNC_JOB_ERROR_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.sync_job_error',
  summary: `Set a connector sync job error`,
  description: `Set a connector sync job error.
Set the \`error\` field for a connector sync job and set its \`status\` to \`error\`.

To sync data using self-managed connectors, you need to deploy the Elastic connector service on your own infrastructure.
This service runs automatically on Elastic Cloud for Elastic managed connectors.`,
  methods: ['PUT'],
  patterns: ['/_connector/_sync_job/{connector_sync_job_id}/_error'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-error',
  parameterTypes: {
    pathParams: ['connector_sync_job_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_sync_job_error_request, 'body'),
    getLooseObjectFromProperty(connector_sync_job_error_request, 'path'),
    getLooseObjectFromProperty(connector_sync_job_error_request, 'query'),
  ]),
  outputSchema: connector_sync_job_error_response,
};
const CONNECTOR_SYNC_JOB_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.sync_job_get',
  summary: `Get a connector sync job`,
  description: `Get a connector sync job.`,
  methods: ['GET'],
  patterns: ['/_connector/_sync_job/{connector_sync_job_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-get',
  parameterTypes: {
    pathParams: ['connector_sync_job_id', 'connector_sync_job_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_sync_job_get_request, 'body'),
    getLooseObjectFromProperty(connector_sync_job_get_request, 'path'),
    getLooseObjectFromProperty(connector_sync_job_get_request, 'query'),
  ]),
  outputSchema: connector_sync_job_get_response,
};
const CONNECTOR_SYNC_JOB_LIST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.sync_job_list',
  summary: `Get all connector sync jobs`,
  description: `Get all connector sync jobs.

Get information about all stored connector sync jobs listed by their creation date in ascending order.`,
  methods: ['GET'],
  patterns: ['/_connector/_sync_job'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-list',
  parameterTypes: {
    pathParams: [],
    urlParams: ['from', 'size', 'status', 'connector_id', 'job_type'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_sync_job_list_request, 'body'),
    getLooseObjectFromProperty(connector_sync_job_list_request, 'path'),
    getLooseObjectFromProperty(connector_sync_job_list_request, 'query'),
  ]),
  outputSchema: connector_sync_job_list_response,
};
const CONNECTOR_SYNC_JOB_POST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.sync_job_post',
  summary: `Create a connector sync job`,
  description: `Create a connector sync job.

Create a connector sync job document in the internal index and initialize its counters and timestamps with default values.`,
  methods: ['POST'],
  patterns: ['/_connector/_sync_job'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-post',
  parameterTypes: {
    pathParams: [],
    urlParams: ['from', 'size', 'status', 'connector_id', 'job_type'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_sync_job_post_request, 'body'),
    getLooseObjectFromProperty(connector_sync_job_post_request, 'path'),
    getLooseObjectFromProperty(connector_sync_job_post_request, 'query'),
  ]),
  outputSchema: connector_sync_job_post_response,
};
const CONNECTOR_SYNC_JOB_UPDATE_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.sync_job_update_stats',
  summary: `Set the connector sync job stats`,
  description: `Set the connector sync job stats.
Stats include: \`deleted_document_count\`, \`indexed_document_count\`, \`indexed_document_volume\`, and \`total_document_count\`.
You can also update \`last_seen\`.
This API is mainly used by the connector service for updating sync job information.

To sync data using self-managed connectors, you need to deploy the Elastic connector service on your own infrastructure.
This service runs automatically on Elastic Cloud for Elastic managed connectors.`,
  methods: ['PUT'],
  patterns: ['/_connector/_sync_job/{connector_sync_job_id}/_stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-update-stats',
  parameterTypes: {
    pathParams: ['connector_sync_job_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_sync_job_update_stats_request, 'body'),
    getLooseObjectFromProperty(connector_sync_job_update_stats_request, 'path'),
    getLooseObjectFromProperty(connector_sync_job_update_stats_request, 'query'),
  ]),
  outputSchema: connector_sync_job_update_stats_response,
};
const CONNECTOR_UPDATE_ACTIVE_FILTERING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_active_filtering',
  summary: `Activate the connector draft filter`,
  description: `Activate the connector draft filter.

Activates the valid draft filtering for a connector.`,
  methods: ['PUT'],
  patterns: ['/_connector/{connector_id}/_filtering/_activate'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-filtering',
  parameterTypes: {
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_update_active_filtering_request, 'body'),
    getLooseObjectFromProperty(connector_update_active_filtering_request, 'path'),
    getLooseObjectFromProperty(connector_update_active_filtering_request, 'query'),
  ]),
  outputSchema: connector_update_active_filtering_response,
};
const CONNECTOR_UPDATE_API_KEY_ID_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_api_key_id',
  summary: `Update the connector API key ID`,
  description: `Update the connector API key ID.

Update the \`api_key_id\` and \`api_key_secret_id\` fields of a connector.
You can specify the ID of the API key used for authorization and the ID of the connector secret where the API key is stored.
The connector secret ID is required only for Elastic managed (native) connectors.
Self-managed connectors (connector clients) do not use this field.`,
  methods: ['PUT'],
  patterns: ['/_connector/{connector_id}/_api_key_id'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-api-key-id',
  parameterTypes: {
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_update_api_key_id_request, 'body'),
    getLooseObjectFromProperty(connector_update_api_key_id_request, 'path'),
    getLooseObjectFromProperty(connector_update_api_key_id_request, 'query'),
  ]),
  outputSchema: connector_update_api_key_id_response,
};
const CONNECTOR_UPDATE_CONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_configuration',
  summary: `Update the connector configuration`,
  description: `Update the connector configuration.

Update the configuration field in the connector document.`,
  methods: ['PUT'],
  patterns: ['/_connector/{connector_id}/_configuration'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-configuration',
  parameterTypes: {
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_update_configuration_request, 'body'),
    getLooseObjectFromProperty(connector_update_configuration_request, 'path'),
    getLooseObjectFromProperty(connector_update_configuration_request, 'query'),
  ]),
  outputSchema: connector_update_configuration_response,
};
const CONNECTOR_UPDATE_ERROR_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_error',
  summary: `Update the connector error field`,
  description: `Update the connector error field.

Set the error field for the connector.
If the error provided in the request body is non-null, the connector’s status is updated to error.
Otherwise, if the error is reset to null, the connector status is updated to connected.`,
  methods: ['PUT'],
  patterns: ['/_connector/{connector_id}/_error'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-error',
  parameterTypes: {
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_update_error_request, 'body'),
    getLooseObjectFromProperty(connector_update_error_request, 'path'),
    getLooseObjectFromProperty(connector_update_error_request, 'query'),
  ]),
  outputSchema: connector_update_error_response,
};
const CONNECTOR_UPDATE_FEATURES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_features',
  summary: `Update the connector features`,
  description: `Update the connector features.
Update the connector features in the connector document.
This API can be used to control the following aspects of a connector:

* document-level security
* incremental syncs
* advanced sync rules
* basic sync rules

Normally, the running connector service automatically manages these features.
However, you can use this API to override the default behavior.

To sync data using self-managed connectors, you need to deploy the Elastic connector service on your own infrastructure.
This service runs automatically on Elastic Cloud for Elastic managed connectors.`,
  methods: ['PUT'],
  patterns: ['/_connector/{connector_id}/_features'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-features',
  parameterTypes: {
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_update_features_request, 'body'),
    getLooseObjectFromProperty(connector_update_features_request, 'path'),
    getLooseObjectFromProperty(connector_update_features_request, 'query'),
  ]),
  outputSchema: connector_update_features_response,
};
const CONNECTOR_UPDATE_FILTERING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_filtering',
  summary: `Update the connector filtering`,
  description: `Update the connector filtering.

Update the draft filtering configuration of a connector and marks the draft validation state as edited.
The filtering draft is activated once validated by the running Elastic connector service.
The filtering property is used to configure sync rules (both basic and advanced) for a connector.`,
  methods: ['PUT'],
  patterns: ['/_connector/{connector_id}/_filtering'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-filtering',
  parameterTypes: {
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_update_filtering_request, 'body'),
    getLooseObjectFromProperty(connector_update_filtering_request, 'path'),
    getLooseObjectFromProperty(connector_update_filtering_request, 'query'),
  ]),
  outputSchema: connector_update_filtering_response,
};
const CONNECTOR_UPDATE_FILTERING_VALIDATION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_filtering_validation',
  summary: `Update the connector draft filtering validation`,
  description: `Update the connector draft filtering validation.

Update the draft filtering validation info for a connector.`,
  methods: ['PUT'],
  patterns: ['/_connector/{connector_id}/_filtering/_validation'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-filtering-validation',
  parameterTypes: {
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_update_filtering_validation_request, 'body'),
    getLooseObjectFromProperty(connector_update_filtering_validation_request, 'path'),
    getLooseObjectFromProperty(connector_update_filtering_validation_request, 'query'),
  ]),
  outputSchema: connector_update_filtering_validation_response,
};
const CONNECTOR_UPDATE_INDEX_NAME_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_index_name',
  summary: `Update the connector index name`,
  description: `Update the connector index name.

Update the \`index_name\` field of a connector, specifying the index where the data ingested by the connector is stored.`,
  methods: ['PUT'],
  patterns: ['/_connector/{connector_id}/_index_name'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-index-name',
  parameterTypes: {
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_update_index_name_request, 'body'),
    getLooseObjectFromProperty(connector_update_index_name_request, 'path'),
    getLooseObjectFromProperty(connector_update_index_name_request, 'query'),
  ]),
  outputSchema: connector_update_index_name_response,
};
const CONNECTOR_UPDATE_NAME_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_name',
  summary: `Update the connector name and description`,
  description: `Update the connector name and description.`,
  methods: ['PUT'],
  patterns: ['/_connector/{connector_id}/_name'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-name',
  parameterTypes: {
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_update_name_request, 'body'),
    getLooseObjectFromProperty(connector_update_name_request, 'path'),
    getLooseObjectFromProperty(connector_update_name_request, 'query'),
  ]),
  outputSchema: connector_update_name_response,
};
const CONNECTOR_UPDATE_NATIVE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_native',
  summary: `Update the connector is_native flag`,
  description: `Update the connector is_native flag.`,
  methods: ['PUT'],
  patterns: ['/_connector/{connector_id}/_native'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-native',
  parameterTypes: {
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_update_native_request, 'body'),
    getLooseObjectFromProperty(connector_update_native_request, 'path'),
    getLooseObjectFromProperty(connector_update_native_request, 'query'),
  ]),
  outputSchema: connector_update_native_response,
};
const CONNECTOR_UPDATE_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_pipeline',
  summary: `Update the connector pipeline`,
  description: `Update the connector pipeline.

When you create a new connector, the configuration of an ingest pipeline is populated with default settings.`,
  methods: ['PUT'],
  patterns: ['/_connector/{connector_id}/_pipeline'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-pipeline',
  parameterTypes: {
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_update_pipeline_request, 'body'),
    getLooseObjectFromProperty(connector_update_pipeline_request, 'path'),
    getLooseObjectFromProperty(connector_update_pipeline_request, 'query'),
  ]),
  outputSchema: connector_update_pipeline_response,
};
const CONNECTOR_UPDATE_SCHEDULING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_scheduling',
  summary: `Update the connector scheduling`,
  description: `Update the connector scheduling.`,
  methods: ['PUT'],
  patterns: ['/_connector/{connector_id}/_scheduling'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-scheduling',
  parameterTypes: {
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_update_scheduling_request, 'body'),
    getLooseObjectFromProperty(connector_update_scheduling_request, 'path'),
    getLooseObjectFromProperty(connector_update_scheduling_request, 'query'),
  ]),
  outputSchema: connector_update_scheduling_response,
};
const CONNECTOR_UPDATE_SERVICE_TYPE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_service_type',
  summary: `Update the connector service type`,
  description: `Update the connector service type.`,
  methods: ['PUT'],
  patterns: ['/_connector/{connector_id}/_service_type'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-service-type',
  parameterTypes: {
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_update_service_type_request, 'body'),
    getLooseObjectFromProperty(connector_update_service_type_request, 'path'),
    getLooseObjectFromProperty(connector_update_service_type_request, 'query'),
  ]),
  outputSchema: connector_update_service_type_response,
};
const CONNECTOR_UPDATE_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_status',
  summary: `Update the connector status`,
  description: `Update the connector status.`,
  methods: ['PUT'],
  patterns: ['/_connector/{connector_id}/_status'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-status',
  parameterTypes: {
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(connector_update_status_request, 'body'),
    getLooseObjectFromProperty(connector_update_status_request, 'path'),
    getLooseObjectFromProperty(connector_update_status_request, 'query'),
  ]),
  outputSchema: connector_update_status_response,
};
const COUNT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.count',
  summary: `Count search results`,
  description: `Count search results.
Get the number of documents matching a query.

The query can be provided either by using a simple query string as a parameter, or by defining Query DSL within the request body.
The query is optional. When no query is provided, the API uses \`match_all\` to count all the documents.

The count API supports multi-target syntax. You can run a single count API search across multiple data streams and indices.

The operation is broadcast across all shards.
For each shard ID group, a replica is chosen and the search is run against it.
This means that replicas increase the scalability of the count.`,
  methods: ['POST', 'GET', 'POST', 'GET'],
  patterns: ['/_count', '/{index}/_count'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-count',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(count_request, 'body'),
    getLooseObjectFromProperty(count_request, 'path'),
    getLooseObjectFromProperty(count_request, 'query'),
    getLooseObjectFromProperty(count1_request, 'body'),
    getLooseObjectFromProperty(count1_request, 'path'),
    getLooseObjectFromProperty(count1_request, 'query'),
    getLooseObjectFromProperty(count2_request, 'body'),
    getLooseObjectFromProperty(count2_request, 'path'),
    getLooseObjectFromProperty(count2_request, 'query'),
    getLooseObjectFromProperty(count3_request, 'body'),
    getLooseObjectFromProperty(count3_request, 'path'),
    getLooseObjectFromProperty(count3_request, 'query'),
  ]),
  outputSchema: z.union([count_response, count1_response, count2_response, count3_response]),
};
const CREATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.create',
  summary: `Create a new document in the index`,
  description: `Create a new document in the index.

You can index a new JSON document with the \`/<target>/_doc/\` or \`/<target>/_create/<_id>\` APIs
Using \`_create\` guarantees that the document is indexed only if it does not already exist.
It returns a 409 response when a document with a same ID already exists in the index.
To update an existing document, you must use the \`/<target>/_doc/\` API.

If the Elasticsearch security features are enabled, you must have the following index privileges for the target data stream, index, or index alias:

* To add a document using the \`PUT /<target>/_create/<_id>\` or \`POST /<target>/_create/<_id>\` request formats, you must have the \`create_doc\`, \`create\`, \`index\`, or \`write\` index privilege.
* To automatically create a data stream or index with this API request, you must have the \`auto_configure\`, \`create_index\`, or \`manage\` index privilege.

Automatic data stream creation requires a matching index template with data stream enabled.

**Automatically create data streams and indices**

If the request's target doesn't exist and matches an index template with a \`data_stream\` definition, the index operation automatically creates the data stream.

If the target doesn't exist and doesn't match a data stream template, the operation automatically creates the index and applies any matching index templates.

NOTE: Elasticsearch includes several built-in index templates. To avoid naming collisions with these templates, refer to index pattern documentation.

If no mapping exists, the index operation creates a dynamic mapping.
By default, new fields and objects are automatically added to the mapping if needed.

Automatic index creation is controlled by the \`action.auto_create_index\` setting.
If it is \`true\`, any index can be created automatically.
You can modify this setting to explicitly allow or block automatic creation of indices that match specified patterns or set it to \`false\` to turn off automatic index creation entirely.
Specify a comma-separated list of patterns you want to allow or prefix each pattern with \`+\` or \`-\` to indicate whether it should be allowed or blocked.
When a list is specified, the default behaviour is to disallow.

NOTE: The \`action.auto_create_index\` setting affects the automatic creation of indices only.
It does not affect the creation of data streams.

**Routing**

By default, shard placement — or routing — is controlled by using a hash of the document's ID value.
For more explicit control, the value fed into the hash function used by the router can be directly specified on a per-operation basis using the \`routing\` parameter.

When setting up explicit mapping, you can also use the \`_routing\` field to direct the index operation to extract the routing value from the document itself.
This does come at the (very minimal) cost of an additional document parsing pass.
If the \`_routing\` mapping is defined and set to be required, the index operation will fail if no routing value is provided or extracted.

NOTE: Data streams do not support custom routing unless they were created with the \`allow_custom_routing\` setting enabled in the template.

**Distributed**

The index operation is directed to the primary shard based on its route and performed on the actual node containing this shard.
After the primary shard completes the operation, if needed, the update is distributed to applicable replicas.

**Active shards**

To improve the resiliency of writes to the system, indexing operations can be configured to wait for a certain number of active shard copies before proceeding with the operation.
If the requisite number of active shard copies are not available, then the write operation must wait and retry, until either the requisite shard copies have started or a timeout occurs.
By default, write operations only wait for the primary shards to be active before proceeding (that is to say \`wait_for_active_shards\` is \`1\`).
This default can be overridden in the index settings dynamically by setting \`index.write.wait_for_active_shards\`.
To alter this behavior per operation, use the \`wait_for_active_shards request\` parameter.

Valid values are all or any positive integer up to the total number of configured copies per shard in the index (which is \`number_of_replicas\`+1).
Specifying a negative value or a number greater than the number of shard copies will throw an error.

For example, suppose you have a cluster of three nodes, A, B, and C and you create an index index with the number of replicas set to 3 (resulting in 4 shard copies, one more copy than there are nodes).
If you attempt an indexing operation, by default the operation will only ensure the primary copy of each shard is available before proceeding.
This means that even if B and C went down and A hosted the primary shard copies, the indexing operation would still proceed with only one copy of the data.
If \`wait_for_active_shards\` is set on the request to \`3\` (and all three nodes are up), the indexing operation will require 3 active shard copies before proceeding.
This requirement should be met because there are 3 active nodes in the cluster, each one holding a copy of the shard.
However, if you set \`wait_for_active_shards\` to \`all\` (or to \`4\`, which is the same in this situation), the indexing operation will not proceed as you do not have all 4 copies of each shard active in the index.
The operation will timeout unless a new node is brought up in the cluster to host the fourth copy of the shard.

It is important to note that this setting greatly reduces the chances of the write operation not writing to the requisite number of shard copies, but it does not completely eliminate the possibility, because this check occurs before the write operation starts.
After the write operation is underway, it is still possible for replication to fail on any number of shard copies but still succeed on the primary.
The \`_shards\` section of the API response reveals the number of shard copies on which replication succeeded and failed.`,
  methods: ['PUT', 'POST'],
  patterns: ['/{index}/_create/{id}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-create',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_request, 'body'),
    getLooseObjectFromProperty(create_request, 'path'),
    getLooseObjectFromProperty(create_request, 'query'),
    getLooseObjectFromProperty(create1_request, 'body'),
    getLooseObjectFromProperty(create1_request, 'path'),
    getLooseObjectFromProperty(create1_request, 'query'),
  ]),
  outputSchema: z.union([create_response, create1_response]),
};
const DANGLING_INDICES_DELETE_DANGLING_INDEX_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.dangling_indices.delete_dangling_index',
  summary: `Delete a dangling index`,
  description: `Delete a dangling index.
If Elasticsearch encounters index data that is absent from the current cluster state, those indices are considered to be dangling.
For example, this can happen if you delete more than \`cluster.indices.tombstones.size\` indices while an Elasticsearch node is offline.`,
  methods: ['DELETE'],
  patterns: ['/_dangling/{index_uuid}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-dangling-indices-delete-dangling-index',
  parameterTypes: {
    pathParams: ['index_uuid', 'index_uuid'],
    urlParams: [
      'accept_data_loss',
      'master_timeout',
      'timeout',
      'accept_data_loss',
      'master_timeout',
      'timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(dangling_indices_delete_dangling_index_request, 'body'),
    getLooseObjectFromProperty(dangling_indices_delete_dangling_index_request, 'path'),
    getLooseObjectFromProperty(dangling_indices_delete_dangling_index_request, 'query'),
  ]),
  outputSchema: dangling_indices_delete_dangling_index_response,
};
const DANGLING_INDICES_IMPORT_DANGLING_INDEX_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.dangling_indices.import_dangling_index',
  summary: `Import a dangling index`,
  description: `Import a dangling index.

If Elasticsearch encounters index data that is absent from the current cluster state, those indices are considered to be dangling.
For example, this can happen if you delete more than \`cluster.indices.tombstones.size\` indices while an Elasticsearch node is offline.`,
  methods: ['POST'],
  patterns: ['/_dangling/{index_uuid}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-dangling-indices-import-dangling-index',
  parameterTypes: {
    pathParams: ['index_uuid', 'index_uuid'],
    urlParams: [
      'accept_data_loss',
      'master_timeout',
      'timeout',
      'accept_data_loss',
      'master_timeout',
      'timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(dangling_indices_import_dangling_index_request, 'body'),
    getLooseObjectFromProperty(dangling_indices_import_dangling_index_request, 'path'),
    getLooseObjectFromProperty(dangling_indices_import_dangling_index_request, 'query'),
  ]),
  outputSchema: dangling_indices_import_dangling_index_response,
};
const DANGLING_INDICES_LIST_DANGLING_INDICES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.dangling_indices.list_dangling_indices',
  summary: `Get the dangling indices`,
  description: `Get the dangling indices.

If Elasticsearch encounters index data that is absent from the current cluster state, those indices are considered to be dangling.
For example, this can happen if you delete more than \`cluster.indices.tombstones.size\` indices while an Elasticsearch node is offline.

Use this API to list dangling indices, which you can then import or delete.`,
  methods: ['GET'],
  patterns: ['/_dangling'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-dangling-indices-list-dangling-indices',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(dangling_indices_list_dangling_indices_request, 'body'),
    getLooseObjectFromProperty(dangling_indices_list_dangling_indices_request, 'path'),
    getLooseObjectFromProperty(dangling_indices_list_dangling_indices_request, 'query'),
  ]),
  outputSchema: dangling_indices_list_dangling_indices_response,
};
const DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.delete',
  summary: `Delete a document`,
  description: `Delete a document.

Remove a JSON document from the specified index.

NOTE: You cannot send deletion requests directly to a data stream.
To delete a document in a data stream, you must target the backing index containing the document.

**Optimistic concurrency control**

Delete operations can be made conditional and only be performed if the last modification to the document was assigned the sequence number and primary term specified by the \`if_seq_no\` and \`if_primary_term\` parameters.
If a mismatch is detected, the operation will result in a \`VersionConflictException\` and a status code of \`409\`.

**Versioning**

Each document indexed is versioned.
When deleting a document, the version can be specified to make sure the relevant document you are trying to delete is actually being deleted and it has not changed in the meantime.
Every write operation run on a document, deletes included, causes its version to be incremented.
The version number of a deleted document remains available for a short time after deletion to allow for control of concurrent operations.
The length of time for which a deleted document's version remains available is determined by the \`index.gc_deletes\` index setting.

**Routing**

If routing is used during indexing, the routing value also needs to be specified to delete a document.

If the \`_routing\` mapping is set to \`required\` and no routing value is specified, the delete API throws a \`RoutingMissingException\` and rejects the request.

For example:

\`\`\`
DELETE /my-index-000001/_doc/1?routing=shard-1
\`\`\`

This request deletes the document with ID 1, but it is routed based on the user.
The document is not deleted if the correct routing is not specified.

**Distributed**

The delete operation gets hashed into a specific shard ID.
It then gets redirected into the primary shard within that ID group and replicated (if needed) to shard replicas within that ID group.`,
  methods: ['DELETE'],
  patterns: ['/{index}/_doc/{id}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete',
  parameterTypes: {
    pathParams: ['index', 'id', 'index', 'id', 'index', 'id'],
    urlParams: [
      'preference',
      'realtime',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_exclude_vectors',
      '_source_includes',
      'stored_fields',
      'version',
      'version_type',
      'if_primary_term',
      'if_seq_no',
      'refresh',
      'routing',
      'timeout',
      'version',
      'version_type',
      'wait_for_active_shards',
      'preference',
      'realtime',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_includes',
      'stored_fields',
      'version',
      'version_type',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_request, 'body'),
    getLooseObjectFromProperty(delete_request, 'path'),
    getLooseObjectFromProperty(delete_request, 'query'),
  ]),
  outputSchema: delete_response,
};
const DELETE_BY_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.delete_by_query',
  summary: `Delete documents`,
  description: `Delete documents.

Deletes documents that match the specified query.

If the Elasticsearch security features are enabled, you must have the following index privileges for the target data stream, index, or alias:

* \`read\`
* \`delete\` or \`write\`

You can specify the query criteria in the request URI or the request body using the same syntax as the search API.
When you submit a delete by query request, Elasticsearch gets a snapshot of the data stream or index when it begins processing the request and deletes matching documents using internal versioning.
If a document changes between the time that the snapshot is taken and the delete operation is processed, it results in a version conflict and the delete operation fails.

NOTE: Documents with a version equal to 0 cannot be deleted using delete by query because internal versioning does not support 0 as a valid version number.

While processing a delete by query request, Elasticsearch performs multiple search requests sequentially to find all of the matching documents to delete.
A bulk delete request is performed for each batch of matching documents.
If a search or bulk request is rejected, the requests are retried up to 10 times, with exponential back off.
If the maximum retry limit is reached, processing halts and all failed requests are returned in the response.
Any delete requests that completed successfully still stick, they are not rolled back.

You can opt to count version conflicts instead of halting and returning by setting \`conflicts\` to \`proceed\`.
Note that if you opt to count version conflicts the operation could attempt to delete more documents from the source than \`max_docs\` until it has successfully deleted \`max_docs documents\`, or it has gone through every document in the source query.

**Throttling delete requests**

To control the rate at which delete by query issues batches of delete operations, you can set \`requests_per_second\` to any positive decimal number.
This pads each batch with a wait time to throttle the rate.
Set \`requests_per_second\` to \`-1\` to disable throttling.

Throttling uses a wait time between batches so that the internal scroll requests can be given a timeout that takes the request padding into account.
The padding time is the difference between the batch size divided by the \`requests_per_second\` and the time spent writing.
By default the batch size is \`1000\`, so if \`requests_per_second\` is set to \`500\`:

\`\`\`
target_time = 1000 / 500 per second = 2 seconds
wait_time = target_time - write_time = 2 seconds - .5 seconds = 1.5 seconds
\`\`\`

Since the batch is issued as a single \`_bulk\` request, large batch sizes cause Elasticsearch to create many requests and wait before starting the next set.
This is "bursty" instead of "smooth".

**Slicing**

Delete by query supports sliced scroll to parallelize the delete process.
This can improve efficiency and provide a convenient way to break the request down into smaller parts.

Setting \`slices\` to \`auto\` lets Elasticsearch choose the number of slices to use.
This setting will use one slice per shard, up to a certain limit.
If there are multiple source data streams or indices, it will choose the number of slices based on the index or backing index with the smallest number of shards.
Adding slices to the delete by query operation creates sub-requests which means it has some quirks:

* You can see these requests in the tasks APIs. These sub-requests are "child" tasks of the task for the request with slices.
* Fetching the status of the task for the request with slices only contains the status of completed slices.
* These sub-requests are individually addressable for things like cancellation and rethrottling.
* Rethrottling the request with \`slices\` will rethrottle the unfinished sub-request proportionally.
* Canceling the request with \`slices\` will cancel each sub-request.
* Due to the nature of \`slices\` each sub-request won't get a perfectly even portion of the documents. All documents will be addressed, but some slices may be larger than others. Expect larger slices to have a more even distribution.
* Parameters like \`requests_per_second\` and \`max_docs\` on a request with \`slices\` are distributed proportionally to each sub-request. Combine that with the earlier point about distribution being uneven and you should conclude that using \`max_docs\` with \`slices\` might not result in exactly \`max_docs\` documents being deleted.
* Each sub-request gets a slightly different snapshot of the source data stream or index though these are all taken at approximately the same time.

If you're slicing manually or otherwise tuning automatic slicing, keep in mind that:

* Query performance is most efficient when the number of slices is equal to the number of shards in the index or backing index. If that number is large (for example, 500), choose a lower number as too many \`slices\` hurts performance. Setting \`slices\` higher than the number of shards generally does not improve efficiency and adds overhead.
* Delete performance scales linearly across available resources with the number of slices.

Whether query or delete performance dominates the runtime depends on the documents being reindexed and cluster resources.

**Cancel a delete by query operation**

Any delete by query can be canceled using the task cancel API. For example:

\`\`\`
POST _tasks/r1A2WoRbTwKZ516z6NEs5A:36619/_cancel
\`\`\`

The task ID can be found by using the get tasks API.

Cancellation should happen quickly but might take a few seconds.
The get task status API will continue to list the delete by query task until this task checks that it has been cancelled and terminates itself.`,
  methods: ['POST'],
  patterns: ['/{index}/_delete_by_query'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete-by-query',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'analyzer',
      'analyze_wildcard',
      'conflicts',
      'default_operator',
      'df',
      'expand_wildcards',
      'from',
      'ignore_unavailable',
      'lenient',
      'max_docs',
      'preference',
      'refresh',
      'request_cache',
      'requests_per_second',
      'routing',
      'q',
      'scroll',
      'scroll_size',
      'search_timeout',
      'search_type',
      'slices',
      'sort',
      'stats',
      'terminate_after',
      'timeout',
      'version',
      'wait_for_active_shards',
      'wait_for_completion',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_by_query_request, 'body'),
    getLooseObjectFromProperty(delete_by_query_request, 'path'),
    getLooseObjectFromProperty(delete_by_query_request, 'query'),
  ]),
  outputSchema: delete_by_query_response,
};
const DELETE_BY_QUERY_RETHROTTLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.delete_by_query_rethrottle',
  summary: `Throttle a delete by query operation`,
  description: `Throttle a delete by query operation.

Change the number of requests per second for a particular delete by query operation.
Rethrottling that speeds up the query takes effect immediately but rethrotting that slows down the query takes effect after completing the current batch to prevent scroll timeouts.`,
  methods: ['POST'],
  patterns: ['/_delete_by_query/{task_id}/_rethrottle'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete-by-query-rethrottle',
  parameterTypes: {
    pathParams: ['task_id'],
    urlParams: ['requests_per_second'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_by_query_rethrottle_request, 'body'),
    getLooseObjectFromProperty(delete_by_query_rethrottle_request, 'path'),
    getLooseObjectFromProperty(delete_by_query_rethrottle_request, 'query'),
  ]),
  outputSchema: delete_by_query_rethrottle_response,
};
const DELETE_SCRIPT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.delete_script',
  summary: `Delete a script or search template`,
  description: `Delete a script or search template.
Deletes a stored script or search template.`,
  methods: ['DELETE'],
  patterns: ['/_scripts/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete-script',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['master_timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_script_request, 'body'),
    getLooseObjectFromProperty(delete_script_request, 'path'),
    getLooseObjectFromProperty(delete_script_request, 'query'),
  ]),
  outputSchema: delete_script_response,
};
const ENRICH_DELETE_POLICY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.enrich.delete_policy',
  summary: `Delete an enrich policy`,
  description: `Delete an enrich policy.
Deletes an existing enrich policy and its enrich index.`,
  methods: ['DELETE'],
  patterns: ['/_enrich/policy/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-delete-policy',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(enrich_delete_policy_request, 'body'),
    getLooseObjectFromProperty(enrich_delete_policy_request, 'path'),
    getLooseObjectFromProperty(enrich_delete_policy_request, 'query'),
  ]),
  outputSchema: enrich_delete_policy_response,
};
const ENRICH_EXECUTE_POLICY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.enrich.execute_policy',
  summary: `Run an enrich policy`,
  description: `Run an enrich policy.
Create the enrich index for an existing enrich policy.`,
  methods: ['PUT'],
  patterns: ['/_enrich/policy/{name}/_execute'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-execute-policy',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['master_timeout', 'wait_for_completion'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(enrich_execute_policy_request, 'body'),
    getLooseObjectFromProperty(enrich_execute_policy_request, 'path'),
    getLooseObjectFromProperty(enrich_execute_policy_request, 'query'),
  ]),
  outputSchema: enrich_execute_policy_response,
};
const ENRICH_GET_POLICY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.enrich.get_policy',
  summary: `Get an enrich policy`,
  description: `Get an enrich policy.
Returns information about an enrich policy.`,
  methods: ['GET', 'GET'],
  patterns: ['/_enrich/policy/{name}', '/_enrich/policy'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-get-policy',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(enrich_get_policy_request, 'body'),
    getLooseObjectFromProperty(enrich_get_policy_request, 'path'),
    getLooseObjectFromProperty(enrich_get_policy_request, 'query'),
    getLooseObjectFromProperty(enrich_get_policy1_request, 'body'),
    getLooseObjectFromProperty(enrich_get_policy1_request, 'path'),
    getLooseObjectFromProperty(enrich_get_policy1_request, 'query'),
  ]),
  outputSchema: z.union([enrich_get_policy_response, enrich_get_policy1_response]),
};
const ENRICH_PUT_POLICY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.enrich.put_policy',
  summary: `Create an enrich policy`,
  description: `Create an enrich policy.
Creates an enrich policy.`,
  methods: ['PUT'],
  patterns: ['/_enrich/policy/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-put-policy',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(enrich_put_policy_request, 'body'),
    getLooseObjectFromProperty(enrich_put_policy_request, 'path'),
    getLooseObjectFromProperty(enrich_put_policy_request, 'query'),
  ]),
  outputSchema: enrich_put_policy_response,
};
const ENRICH_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.enrich.stats',
  summary: `Get enrich stats`,
  description: `Get enrich stats.
Returns enrich coordinator statistics and information about enrich policies that are currently executing.`,
  methods: ['GET'],
  patterns: ['/_enrich/_stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-stats',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(enrich_stats_request, 'body'),
    getLooseObjectFromProperty(enrich_stats_request, 'path'),
    getLooseObjectFromProperty(enrich_stats_request, 'query'),
  ]),
  outputSchema: enrich_stats_response,
};
const EQL_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.eql.delete',
  summary: `Delete an async EQL search`,
  description: `Delete an async EQL search.
Delete an async EQL search or a stored synchronous EQL search.
The API also deletes results for the search.`,
  methods: ['DELETE'],
  patterns: ['/_eql/search/{id}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-eql-delete',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['keep_alive', 'wait_for_completion_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(eql_delete_request, 'body'),
    getLooseObjectFromProperty(eql_delete_request, 'path'),
    getLooseObjectFromProperty(eql_delete_request, 'query'),
  ]),
  outputSchema: eql_delete_response,
};
const EQL_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.eql.get',
  summary: `Get async EQL search results`,
  description: `Get async EQL search results.
Get the current status and available results for an async EQL search or a stored synchronous EQL search.`,
  methods: ['GET'],
  patterns: ['/_eql/search/{id}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-eql-get',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['keep_alive', 'wait_for_completion_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(eql_get_request, 'body'),
    getLooseObjectFromProperty(eql_get_request, 'path'),
    getLooseObjectFromProperty(eql_get_request, 'query'),
  ]),
  outputSchema: eql_get_response,
};
const EQL_GET_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.eql.get_status',
  summary: `Get the async EQL status`,
  description: `Get the async EQL status.
Get the current status for an async EQL search or a stored synchronous EQL search without returning results.`,
  methods: ['GET'],
  patterns: ['/_eql/search/status/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-eql-get-status',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(eql_get_status_request, 'body'),
    getLooseObjectFromProperty(eql_get_status_request, 'path'),
    getLooseObjectFromProperty(eql_get_status_request, 'query'),
  ]),
  outputSchema: eql_get_status_response,
};
const EQL_SEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.eql.search',
  summary: `Get EQL search results`,
  description: `Get EQL search results.
Returns search results for an Event Query Language (EQL) query.
EQL assumes each document in a data stream or index corresponds to an event.`,
  methods: ['GET', 'POST'],
  patterns: ['/{index}/_eql/search'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-eql-search',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(eql_search_request, 'body'),
    getLooseObjectFromProperty(eql_search_request, 'path'),
    getLooseObjectFromProperty(eql_search_request, 'query'),
    getLooseObjectFromProperty(eql_search1_request, 'body'),
    getLooseObjectFromProperty(eql_search1_request, 'path'),
    getLooseObjectFromProperty(eql_search1_request, 'query'),
  ]),
  outputSchema: z.union([eql_search_response, eql_search1_response]),
};
const ESQL_ASYNC_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.esql.async_query',
  summary: `Run an async ES|QL query`,
  description: `Run an async ES|QL query.
Asynchronously run an ES|QL (Elasticsearch query language) query, monitor its progress, and retrieve results when they become available.

The API accepts the same parameters and request body as the synchronous query API, along with additional async related properties.`,
  methods: ['POST'],
  patterns: ['/_query/async'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-async-query',
  parameterTypes: {
    pathParams: [],
    urlParams: ['allow_partial_results', 'delimiter', 'drop_null_columns', 'format'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(esql_async_query_request, 'body'),
    getLooseObjectFromProperty(esql_async_query_request, 'path'),
    getLooseObjectFromProperty(esql_async_query_request, 'query'),
  ]),
  outputSchema: esql_async_query_response,
};
const ESQL_ASYNC_QUERY_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.esql.async_query_delete',
  summary: `Delete an async ES|QL query`,
  description: `Delete an async ES|QL query.
If the query is still running, it is cancelled.
Otherwise, the stored results are deleted.

If the Elasticsearch security features are enabled, only the following users can use this API to delete a query:

* The authenticated user that submitted the original query request
* Users with the \`cancel_task\` cluster privilege`,
  methods: ['DELETE'],
  patterns: ['/_query/async/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-async-query-delete',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['drop_null_columns', 'format', 'keep_alive', 'wait_for_completion_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(esql_async_query_delete_request, 'body'),
    getLooseObjectFromProperty(esql_async_query_delete_request, 'path'),
    getLooseObjectFromProperty(esql_async_query_delete_request, 'query'),
  ]),
  outputSchema: esql_async_query_delete_response,
};
const ESQL_ASYNC_QUERY_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.esql.async_query_get',
  summary: `Get async ES|QL query results`,
  description: `Get async ES|QL query results.
Get the current status and available results or stored results for an ES|QL asynchronous query.
If the Elasticsearch security features are enabled, only the user who first submitted the ES|QL query can retrieve the results using this API.`,
  methods: ['GET'],
  patterns: ['/_query/async/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-async-query-get',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['drop_null_columns', 'format', 'keep_alive', 'wait_for_completion_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(esql_async_query_get_request, 'body'),
    getLooseObjectFromProperty(esql_async_query_get_request, 'path'),
    getLooseObjectFromProperty(esql_async_query_get_request, 'query'),
  ]),
  outputSchema: esql_async_query_get_response,
};
const ESQL_ASYNC_QUERY_STOP_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.esql.async_query_stop',
  summary: `Stop async ES|QL query`,
  description: `Stop async ES|QL query.

This API interrupts the query execution and returns the results so far.
If the Elasticsearch security features are enabled, only the user who first submitted the ES|QL query can stop it.`,
  methods: ['POST'],
  patterns: ['/_query/async/{id}/stop'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-async-query-stop',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: ['drop_null_columns'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(esql_async_query_stop_request, 'body'),
    getLooseObjectFromProperty(esql_async_query_stop_request, 'path'),
    getLooseObjectFromProperty(esql_async_query_stop_request, 'query'),
  ]),
  outputSchema: esql_async_query_stop_response,
};
const ESQL_GET_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.esql.get_query',
  summary: `Get a specific running ES|QL query information`,
  description: `Get a specific running ES|QL query information.
Returns an object extended information about a running ES|QL query.`,
  methods: ['GET'],
  patterns: ['/_query/queries/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-get-query',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(esql_get_query_request, 'body'),
    getLooseObjectFromProperty(esql_get_query_request, 'path'),
    getLooseObjectFromProperty(esql_get_query_request, 'query'),
  ]),
  outputSchema: esql_get_query_response,
};
const ESQL_LIST_QUERIES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.esql.list_queries',
  summary: `Get running ES|QL queries information`,
  description: `Get running ES|QL queries information.
Returns an object containing IDs and other information about the running ES|QL queries.`,
  methods: ['GET'],
  patterns: ['/_query/queries'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-list-queries',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(esql_list_queries_request, 'body'),
    getLooseObjectFromProperty(esql_list_queries_request, 'path'),
    getLooseObjectFromProperty(esql_list_queries_request, 'query'),
  ]),
  outputSchema: esql_list_queries_response,
};
const ESQL_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.esql.query',
  summary: `Run an ES|QL query`,
  description: `Run an ES|QL query.
Get search results for an ES|QL (Elasticsearch query language) query.`,
  methods: ['POST'],
  patterns: ['/_query'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/explore-analyze/query-filter/languages/esql-rest',
  parameterTypes: {
    pathParams: [],
    urlParams: ['format', 'delimiter', 'drop_null_columns', 'allow_partial_results'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(esql_query_request, 'body'),
    getLooseObjectFromProperty(esql_query_request, 'path'),
    getLooseObjectFromProperty(esql_query_request, 'query'),
  ]),
  outputSchema: esql_query_response,
};
const EXISTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.exists',
  summary: `Check a document`,
  description: `Check a document.

Verify that a document exists.
For example, check to see if a document with the \`_id\` 0 exists:

\`\`\`
HEAD my-index-000001/_doc/0
\`\`\`

If the document exists, the API returns a status code of \`200 - OK\`.
If the document doesn’t exist, the API returns \`404 - Not Found\`.

**Versioning support**

You can use the \`version\` parameter to check the document only if its current version is equal to the specified one.

Internally, Elasticsearch has marked the old document as deleted and added an entirely new document.
The old version of the document doesn't disappear immediately, although you won't be able to access it.
Elasticsearch cleans up deleted documents in the background as you continue to index more data.`,
  methods: ['HEAD'],
  patterns: ['/{index}/_doc/{id}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get',
  parameterTypes: {
    pathParams: ['index', 'id', 'index', 'id', 'index', 'id'],
    urlParams: [
      'preference',
      'realtime',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_exclude_vectors',
      '_source_includes',
      'stored_fields',
      'version',
      'version_type',
      'if_primary_term',
      'if_seq_no',
      'refresh',
      'routing',
      'timeout',
      'version',
      'version_type',
      'wait_for_active_shards',
      'preference',
      'realtime',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_includes',
      'stored_fields',
      'version',
      'version_type',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(exists_request, 'body'),
    getLooseObjectFromProperty(exists_request, 'path'),
    getLooseObjectFromProperty(exists_request, 'query'),
  ]),
  outputSchema: exists_response,
};
const EXISTS_SOURCE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.exists_source',
  summary: `Check for a document source`,
  description: `Check for a document source.

Check whether a document source exists in an index.
For example:

\`\`\`
HEAD my-index-000001/_source/1
\`\`\`

A document's source is not available if it is disabled in the mapping.`,
  methods: ['HEAD'],
  patterns: ['/{index}/_source/{id}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get',
  parameterTypes: {
    pathParams: ['index', 'id', 'index', 'id'],
    urlParams: [
      'preference',
      'realtime',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_includes',
      'version',
      'version_type',
      'preference',
      'realtime',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_includes',
      'version',
      'version_type',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(exists_source_request, 'body'),
    getLooseObjectFromProperty(exists_source_request, 'path'),
    getLooseObjectFromProperty(exists_source_request, 'query'),
  ]),
  outputSchema: exists_source_response,
};
const EXPLAIN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.explain',
  summary: `Explain a document match result`,
  description: `Explain a document match result.
Get information about why a specific document matches, or doesn't match, a query.
It computes a score explanation for a query and a specific document.`,
  methods: ['GET', 'POST'],
  patterns: ['/{index}/_explain/{id}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-explain',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(explain_request, 'body'),
    getLooseObjectFromProperty(explain_request, 'path'),
    getLooseObjectFromProperty(explain_request, 'query'),
    getLooseObjectFromProperty(explain1_request, 'body'),
    getLooseObjectFromProperty(explain1_request, 'path'),
    getLooseObjectFromProperty(explain1_request, 'query'),
  ]),
  outputSchema: z.union([explain_response, explain1_response]),
};
const FEATURES_GET_FEATURES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.features.get_features',
  summary: `Get the features`,
  description: `Get the features.
Get a list of features that can be included in snapshots using the \`feature_states\` field when creating a snapshot.
You can use this API to determine which feature states to include when taking a snapshot.
By default, all feature states are included in a snapshot if that snapshot includes the global state, or none if it does not.

A feature state includes one or more system indices necessary for a given feature to function.
In order to ensure data integrity, all system indices that comprise a feature state are snapshotted and restored together.

The features listed by this API are a combination of built-in features and features defined by plugins.
In order for a feature state to be listed in this API and recognized as a valid feature state by the create snapshot API, the plugin that defines that feature must be installed on the master node.`,
  methods: ['GET'],
  patterns: ['/_features'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-features-get-features',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(features_get_features_request, 'body'),
    getLooseObjectFromProperty(features_get_features_request, 'path'),
    getLooseObjectFromProperty(features_get_features_request, 'query'),
  ]),
  outputSchema: features_get_features_response,
};
const FEATURES_RESET_FEATURES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.features.reset_features',
  summary: `Reset the features`,
  description: `Reset the features.
Clear all of the state information stored in system indices by Elasticsearch features, including the security and machine learning indices.

WARNING: Intended for development and testing use only. Do not reset features on a production cluster.

Return a cluster to the same state as a new installation by resetting the feature state for all Elasticsearch features.
This deletes all state information stored in system indices.

The response code is HTTP 200 if the state is successfully reset for all features.
It is HTTP 500 if the reset operation failed for any feature.

Note that select features might provide a way to reset particular system indices.
Using this API resets all features, both those that are built-in and implemented as plugins.

To list the features that will be affected, use the get features API.

IMPORTANT: The features installed on the node you submit this request to are the features that will be reset. Run on the master node if you have any doubts about which plugins are installed on individual nodes.`,
  methods: ['POST'],
  patterns: ['/_features/_reset'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-features-reset-features',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(features_reset_features_request, 'body'),
    getLooseObjectFromProperty(features_reset_features_request, 'path'),
    getLooseObjectFromProperty(features_reset_features_request, 'query'),
  ]),
  outputSchema: features_reset_features_response,
};
const FIELD_CAPS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.field_caps',
  summary: `Get the field capabilities`,
  description: `Get the field capabilities.

Get information about the capabilities of fields among multiple indices.

For data streams, the API returns field capabilities among the stream’s backing indices.
It returns runtime fields like any other field.
For example, a runtime field with a type of keyword is returned the same as any other field that belongs to the \`keyword\` family.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_field_caps', '/{index}/_field_caps'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-field-caps',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(field_caps_request, 'body'),
    getLooseObjectFromProperty(field_caps_request, 'path'),
    getLooseObjectFromProperty(field_caps_request, 'query'),
    getLooseObjectFromProperty(field_caps1_request, 'body'),
    getLooseObjectFromProperty(field_caps1_request, 'path'),
    getLooseObjectFromProperty(field_caps1_request, 'query'),
    getLooseObjectFromProperty(field_caps2_request, 'body'),
    getLooseObjectFromProperty(field_caps2_request, 'path'),
    getLooseObjectFromProperty(field_caps2_request, 'query'),
    getLooseObjectFromProperty(field_caps3_request, 'body'),
    getLooseObjectFromProperty(field_caps3_request, 'path'),
    getLooseObjectFromProperty(field_caps3_request, 'query'),
  ]),
  outputSchema: z.union([
    field_caps_response,
    field_caps1_response,
    field_caps2_response,
    field_caps3_response,
  ]),
};
const FLEET_DELETE_SECRET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.fleet.delete_secret',
  summary: ``,
  description: `Deletes a secret stored by Fleet`,
  methods: ['DELETE'],
  patterns: ['/_fleet/secret/{id}'],
  isInternal: false,
  documentation: 'null',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const FLEET_GET_SECRET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.fleet.get_secret',
  summary: ``,
  description: `Retrieves a secret stored by Fleet`,
  methods: ['GET'],
  patterns: ['/_fleet/secret/{id}'],
  isInternal: false,
  documentation: 'null',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const FLEET_GLOBAL_CHECKPOINTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.fleet.global_checkpoints',
  summary: `Get global checkpoints`,
  description: `Get global checkpoints.

Get the current global checkpoints for an index.
This API is designed for internal use by the Fleet server project.`,
  methods: ['GET'],
  patterns: ['/{index}/_fleet/global_checkpoints'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-fleet',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: ['wait_for_advance', 'wait_for_index', 'checkpoints', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(fleet_global_checkpoints_request, 'body'),
    getLooseObjectFromProperty(fleet_global_checkpoints_request, 'path'),
    getLooseObjectFromProperty(fleet_global_checkpoints_request, 'query'),
  ]),
  outputSchema: fleet_global_checkpoints_response,
};
const FLEET_MSEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.fleet.msearch',
  summary: `Run multiple Fleet searches`,
  description: `Run multiple Fleet searches.
Run several Fleet searches with a single API request.
The API follows the same structure as the multi search API.
However, similar to the Fleet search API, it supports the \`wait_for_checkpoints\` parameter.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_fleet/_fleet_msearch', '/{index}/_fleet/_fleet_msearch'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-fleet-msearch',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(fleet_msearch_request, 'body'),
    getLooseObjectFromProperty(fleet_msearch_request, 'path'),
    getLooseObjectFromProperty(fleet_msearch_request, 'query'),
    getLooseObjectFromProperty(fleet_msearch1_request, 'body'),
    getLooseObjectFromProperty(fleet_msearch1_request, 'path'),
    getLooseObjectFromProperty(fleet_msearch1_request, 'query'),
    getLooseObjectFromProperty(fleet_msearch2_request, 'body'),
    getLooseObjectFromProperty(fleet_msearch2_request, 'path'),
    getLooseObjectFromProperty(fleet_msearch2_request, 'query'),
    getLooseObjectFromProperty(fleet_msearch3_request, 'body'),
    getLooseObjectFromProperty(fleet_msearch3_request, 'path'),
    getLooseObjectFromProperty(fleet_msearch3_request, 'query'),
  ]),
  outputSchema: z.union([
    fleet_msearch_response,
    fleet_msearch1_response,
    fleet_msearch2_response,
    fleet_msearch3_response,
  ]),
};
const FLEET_POST_SECRET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.fleet.post_secret',
  summary: ``,
  description: `Creates a secret stored by Fleet`,
  methods: ['POST'],
  patterns: ['/_fleet/secret'],
  isInternal: false,
  documentation: 'null',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const FLEET_SEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.fleet.search',
  summary: `Run a Fleet search`,
  description: `Run a Fleet search.
The purpose of the Fleet search API is to provide an API where the search will be run only
after the provided checkpoint has been processed and is visible for searches inside of Elasticsearch.`,
  methods: ['GET', 'POST'],
  patterns: ['/{index}/_fleet/_fleet_search'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-fleet-search',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(fleet_search_request, 'body'),
    getLooseObjectFromProperty(fleet_search_request, 'path'),
    getLooseObjectFromProperty(fleet_search_request, 'query'),
    getLooseObjectFromProperty(fleet_search1_request, 'body'),
    getLooseObjectFromProperty(fleet_search1_request, 'path'),
    getLooseObjectFromProperty(fleet_search1_request, 'query'),
  ]),
  outputSchema: z.union([fleet_search_response, fleet_search1_response]),
};
const GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.get',
  summary: `Get a document by its ID`,
  description: `Get a document by its ID.

Get a document and its source or stored fields from an index.

By default, this API is realtime and is not affected by the refresh rate of the index (when data will become visible for search).
In the case where stored fields are requested with the \`stored_fields\` parameter and the document has been updated but is not yet refreshed, the API will have to parse and analyze the source to extract the stored fields.
To turn off realtime behavior, set the \`realtime\` parameter to false.

**Source filtering**

By default, the API returns the contents of the \`_source\` field unless you have used the \`stored_fields\` parameter or the \`_source\` field is turned off.
You can turn off \`_source\` retrieval by using the \`_source\` parameter:

\`\`\`
GET my-index-000001/_doc/0?_source=false
\`\`\`

If you only need one or two fields from the \`_source\`, use the \`_source_includes\` or \`_source_excludes\` parameters to include or filter out particular fields.
This can be helpful with large documents where partial retrieval can save on network overhead
Both parameters take a comma separated list of fields or wildcard expressions.
For example:

\`\`\`
GET my-index-000001/_doc/0?_source_includes=*.id&_source_excludes=entities
\`\`\`

If you only want to specify includes, you can use a shorter notation:

\`\`\`
GET my-index-000001/_doc/0?_source=*.id
\`\`\`

**Routing**

If routing is used during indexing, the routing value also needs to be specified to retrieve a document.
For example:

\`\`\`
GET my-index-000001/_doc/2?routing=user1
\`\`\`

This request gets the document with ID 2, but it is routed based on the user.
The document is not fetched if the correct routing is not specified.

**Distributed**

The GET operation is hashed into a specific shard ID.
It is then redirected to one of the replicas within that shard ID and returns the result.
The replicas are the primary shard and its replicas within that shard ID group.
This means that the more replicas you have, the better your GET scaling will be.

**Versioning support**

You can use the \`version\` parameter to retrieve the document only if its current version is equal to the specified one.

Internally, Elasticsearch has marked the old document as deleted and added an entirely new document.
The old version of the document doesn't disappear immediately, although you won't be able to access it.
Elasticsearch cleans up deleted documents in the background as you continue to index more data.`,
  methods: ['GET'],
  patterns: ['/{index}/_doc/{id}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get',
  parameterTypes: {
    pathParams: ['index', 'id', 'index', 'id', 'index', 'id'],
    urlParams: [
      'preference',
      'realtime',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_exclude_vectors',
      '_source_includes',
      'stored_fields',
      'version',
      'version_type',
      'if_primary_term',
      'if_seq_no',
      'refresh',
      'routing',
      'timeout',
      'version',
      'version_type',
      'wait_for_active_shards',
      'preference',
      'realtime',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_includes',
      'stored_fields',
      'version',
      'version_type',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_request, 'body'),
    getLooseObjectFromProperty(get_request, 'path'),
    getLooseObjectFromProperty(get_request, 'query'),
  ]),
  outputSchema: get_response,
};
const GET_SCRIPT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.get_script',
  summary: `Get a script or search template`,
  description: `Get a script or search template.
Retrieves a stored script or search template.`,
  methods: ['GET'],
  patterns: ['/_scripts/{id}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get-script',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['master_timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_script_request, 'body'),
    getLooseObjectFromProperty(get_script_request, 'path'),
    getLooseObjectFromProperty(get_script_request, 'query'),
  ]),
  outputSchema: get_script_response,
};
const GET_SCRIPT_CONTEXT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.get_script_context',
  summary: `Get script contexts`,
  description: `Get script contexts.

Get a list of supported script contexts and their methods.`,
  methods: ['GET'],
  patterns: ['/_script_context'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get-script-context',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_script_context_request, 'body'),
    getLooseObjectFromProperty(get_script_context_request, 'path'),
    getLooseObjectFromProperty(get_script_context_request, 'query'),
  ]),
  outputSchema: get_script_context_response,
};
const GET_SCRIPT_LANGUAGES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.get_script_languages',
  summary: `Get script languages`,
  description: `Get script languages.

Get a list of available script types, languages, and contexts.`,
  methods: ['GET'],
  patterns: ['/_script_language'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get-script-languages',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_script_languages_request, 'body'),
    getLooseObjectFromProperty(get_script_languages_request, 'path'),
    getLooseObjectFromProperty(get_script_languages_request, 'query'),
  ]),
  outputSchema: get_script_languages_response,
};
const GET_SOURCE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.get_source',
  summary: `Get a document's source`,
  description: `Get a document's source.

Get the source of a document.
For example:

\`\`\`
GET my-index-000001/_source/1
\`\`\`

You can use the source filtering parameters to control which parts of the \`_source\` are returned:

\`\`\`
GET my-index-000001/_source/1/?_source_includes=*.id&_source_excludes=entities
\`\`\``,
  methods: ['GET'],
  patterns: ['/{index}/_source/{id}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get',
  parameterTypes: {
    pathParams: ['index', 'id', 'index', 'id'],
    urlParams: [
      'preference',
      'realtime',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_includes',
      'version',
      'version_type',
      'preference',
      'realtime',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_includes',
      'version',
      'version_type',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_source_request, 'body'),
    getLooseObjectFromProperty(get_source_request, 'path'),
    getLooseObjectFromProperty(get_source_request, 'query'),
  ]),
  outputSchema: get_source_response,
};
const GRAPH_EXPLORE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.graph.explore',
  summary: `Explore graph analytics`,
  description: `Explore graph analytics.
Extract and summarize information about the documents and terms in an Elasticsearch data stream or index.
The easiest way to understand the behavior of this API is to use the Graph UI to explore connections.
An initial request to the \`_explore\` API contains a seed query that identifies the documents of interest and specifies the fields that define the vertices and connections you want to include in the graph.
Subsequent requests enable you to spider out from one more vertices of interest.
You can exclude vertices that have already been returned.`,
  methods: ['GET', 'POST'],
  patterns: ['/{index}/_graph/explore'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-graph',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(graph_explore_request, 'body'),
    getLooseObjectFromProperty(graph_explore_request, 'path'),
    getLooseObjectFromProperty(graph_explore_request, 'query'),
    getLooseObjectFromProperty(graph_explore1_request, 'body'),
    getLooseObjectFromProperty(graph_explore1_request, 'path'),
    getLooseObjectFromProperty(graph_explore1_request, 'query'),
  ]),
  outputSchema: z.union([graph_explore_response, graph_explore1_response]),
};
const HEALTH_REPORT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.health_report',
  summary: `Get the cluster health`,
  description: `Get the cluster health.
Get a report with the health status of an Elasticsearch cluster.
The report contains a list of indicators that compose Elasticsearch functionality.

Each indicator has a health status of: green, unknown, yellow or red.
The indicator will provide an explanation and metadata describing the reason for its current health status.

The cluster’s status is controlled by the worst indicator status.

In the event that an indicator’s status is non-green, a list of impacts may be present in the indicator result which detail the functionalities that are negatively affected by the health issue.
Each impact carries with it a severity level, an area of the system that is affected, and a simple description of the impact on the system.

Some health indicators can determine the root cause of a health problem and prescribe a set of steps that can be performed in order to improve the health of the system.
The root cause and remediation steps are encapsulated in a diagnosis.
A diagnosis contains a cause detailing a root cause analysis, an action containing a brief description of the steps to take to fix the problem, the list of affected resources (if applicable), and a detailed step-by-step troubleshooting guide to fix the diagnosed problem.

NOTE: The health indicators perform root cause analysis of non-green health statuses. This can be computationally expensive when called frequently.
When setting up automated polling of the API for health status, set verbose to false to disable the more expensive analysis logic.`,
  methods: ['GET', 'GET'],
  patterns: ['/_health_report', '/_health_report/{feature}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-health-report',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(health_report_request, 'body'),
    getLooseObjectFromProperty(health_report_request, 'path'),
    getLooseObjectFromProperty(health_report_request, 'query'),
    getLooseObjectFromProperty(health_report1_request, 'body'),
    getLooseObjectFromProperty(health_report1_request, 'path'),
    getLooseObjectFromProperty(health_report1_request, 'query'),
  ]),
  outputSchema: z.union([health_report_response, health_report1_response]),
};
const ILM_DELETE_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.delete_lifecycle',
  summary: `Delete a lifecycle policy`,
  description: `Delete a lifecycle policy.
You cannot delete policies that are currently in use. If the policy is being used to manage any indices, the request fails and returns an error.`,
  methods: ['DELETE'],
  patterns: ['/_ilm/policy/{policy}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-delete-lifecycle',
  parameterTypes: {
    pathParams: ['policy', 'policy'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ilm_delete_lifecycle_request, 'body'),
    getLooseObjectFromProperty(ilm_delete_lifecycle_request, 'path'),
    getLooseObjectFromProperty(ilm_delete_lifecycle_request, 'query'),
  ]),
  outputSchema: ilm_delete_lifecycle_response,
};
const ILM_EXPLAIN_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.explain_lifecycle',
  summary: `Explain the lifecycle state`,
  description: `Explain the lifecycle state.
Get the current lifecycle status for one or more indices.
For data streams, the API retrieves the current lifecycle status for the stream's backing indices.

The response indicates when the index entered each lifecycle state, provides the definition of the running phase, and information about any failures.`,
  methods: ['GET'],
  patterns: ['/{index}/_ilm/explain'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-explain-lifecycle',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: ['only_errors', 'only_managed', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ilm_explain_lifecycle_request, 'body'),
    getLooseObjectFromProperty(ilm_explain_lifecycle_request, 'path'),
    getLooseObjectFromProperty(ilm_explain_lifecycle_request, 'query'),
  ]),
  outputSchema: ilm_explain_lifecycle_response,
};
const ILM_GET_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.get_lifecycle',
  summary: `Get lifecycle policies`,
  description: `Get lifecycle policies.`,
  methods: ['GET', 'GET'],
  patterns: ['/_ilm/policy/{policy}', '/_ilm/policy'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-get-lifecycle',
  parameterTypes: {
    pathParams: ['policy', 'policy'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ilm_get_lifecycle_request, 'body'),
    getLooseObjectFromProperty(ilm_get_lifecycle_request, 'path'),
    getLooseObjectFromProperty(ilm_get_lifecycle_request, 'query'),
    getLooseObjectFromProperty(ilm_get_lifecycle1_request, 'body'),
    getLooseObjectFromProperty(ilm_get_lifecycle1_request, 'path'),
    getLooseObjectFromProperty(ilm_get_lifecycle1_request, 'query'),
  ]),
  outputSchema: z.union([ilm_get_lifecycle_response, ilm_get_lifecycle1_response]),
};
const ILM_GET_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.get_status',
  summary: `Get the ILM status`,
  description: `Get the ILM status.

Get the current index lifecycle management status.`,
  methods: ['GET'],
  patterns: ['/_ilm/status'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-get-status',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ilm_get_status_request, 'body'),
    getLooseObjectFromProperty(ilm_get_status_request, 'path'),
    getLooseObjectFromProperty(ilm_get_status_request, 'query'),
  ]),
  outputSchema: ilm_get_status_response,
};
const ILM_MIGRATE_TO_DATA_TIERS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.migrate_to_data_tiers',
  summary: `Migrate to data tiers routing`,
  description: `Migrate to data tiers routing.
Switch the indices, ILM policies, and legacy, composable, and component templates from using custom node attributes and attribute-based allocation filters to using data tiers.
Optionally, delete one legacy index template.
Using node roles enables ILM to automatically move the indices between data tiers.

Migrating away from custom node attributes routing can be manually performed.
This API provides an automated way of performing three out of the four manual steps listed in the migration guide:

1. Stop setting the custom hot attribute on new indices.
1. Remove custom allocation settings from existing ILM policies.
1. Replace custom allocation settings from existing indices with the corresponding tier preference.

ILM must be stopped before performing the migration.
Use the stop ILM and get ILM status APIs to wait until the reported operation mode is \`STOPPED\`.`,
  methods: ['POST'],
  patterns: ['/_ilm/migrate_to_data_tiers'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-migrate-to-data-tiers',
  parameterTypes: {
    pathParams: [],
    urlParams: ['dry_run', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ilm_migrate_to_data_tiers_request, 'body'),
    getLooseObjectFromProperty(ilm_migrate_to_data_tiers_request, 'path'),
    getLooseObjectFromProperty(ilm_migrate_to_data_tiers_request, 'query'),
  ]),
  outputSchema: ilm_migrate_to_data_tiers_response,
};
const ILM_MOVE_TO_STEP_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.move_to_step',
  summary: `Move to a lifecycle step`,
  description: `Move to a lifecycle step.
Manually move an index into a specific step in the lifecycle policy and run that step.

WARNING: This operation can result in the loss of data. Manually moving an index into a specific step runs that step even if it has already been performed. This is a potentially destructive action and this should be considered an expert level API.

You must specify both the current step and the step to be executed in the body of the request.
The request will fail if the current step does not match the step currently running for the index
This is to prevent the index from being moved from an unexpected step into the next step.

When specifying the target (\`next_step\`) to which the index will be moved, either the name or both the action and name fields are optional.
If only the phase is specified, the index will move to the first step of the first action in the target phase.
If the phase and action are specified, the index will move to the first step of the specified action in the specified phase.
Only actions specified in the ILM policy are considered valid.
An index cannot move to a step that is not part of its policy.`,
  methods: ['POST'],
  patterns: ['/_ilm/move/{index}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-move-to-step',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ilm_move_to_step_request, 'body'),
    getLooseObjectFromProperty(ilm_move_to_step_request, 'path'),
    getLooseObjectFromProperty(ilm_move_to_step_request, 'query'),
  ]),
  outputSchema: ilm_move_to_step_response,
};
const ILM_PUT_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.put_lifecycle',
  summary: `Create or update a lifecycle policy`,
  description: `Create or update a lifecycle policy.
If the specified policy exists, it is replaced and the policy version is incremented.

NOTE: Only the latest version of the policy is stored, you cannot revert to previous versions.`,
  methods: ['PUT'],
  patterns: ['/_ilm/policy/{policy}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-put-lifecycle',
  parameterTypes: {
    pathParams: ['policy', 'policy'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ilm_put_lifecycle_request, 'body'),
    getLooseObjectFromProperty(ilm_put_lifecycle_request, 'path'),
    getLooseObjectFromProperty(ilm_put_lifecycle_request, 'query'),
  ]),
  outputSchema: ilm_put_lifecycle_response,
};
const ILM_REMOVE_POLICY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.remove_policy',
  summary: `Remove policies from an index`,
  description: `Remove policies from an index.
Remove the assigned lifecycle policies from an index or a data stream's backing indices.
It also stops managing the indices.`,
  methods: ['POST'],
  patterns: ['/{index}/_ilm/remove'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-remove-policy',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ilm_remove_policy_request, 'body'),
    getLooseObjectFromProperty(ilm_remove_policy_request, 'path'),
    getLooseObjectFromProperty(ilm_remove_policy_request, 'query'),
  ]),
  outputSchema: ilm_remove_policy_response,
};
const ILM_RETRY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.retry',
  summary: `Retry a policy`,
  description: `Retry a policy.
Retry running the lifecycle policy for an index that is in the ERROR step.
The API sets the policy back to the step where the error occurred and runs the step.
Use the explain lifecycle state API to determine whether an index is in the ERROR step.`,
  methods: ['POST'],
  patterns: ['/{index}/_ilm/retry'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-retry',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ilm_retry_request, 'body'),
    getLooseObjectFromProperty(ilm_retry_request, 'path'),
    getLooseObjectFromProperty(ilm_retry_request, 'query'),
  ]),
  outputSchema: ilm_retry_response,
};
const ILM_START_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.start',
  summary: `Start the ILM plugin`,
  description: `Start the ILM plugin.
Start the index lifecycle management plugin if it is currently stopped.
ILM is started automatically when the cluster is formed.
Restarting ILM is necessary only when it has been stopped using the stop ILM API.`,
  methods: ['POST'],
  patterns: ['/_ilm/start'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-start',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ilm_start_request, 'body'),
    getLooseObjectFromProperty(ilm_start_request, 'path'),
    getLooseObjectFromProperty(ilm_start_request, 'query'),
  ]),
  outputSchema: ilm_start_response,
};
const ILM_STOP_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.stop',
  summary: `Stop the ILM plugin`,
  description: `Stop the ILM plugin.
Halt all lifecycle management operations and stop the index lifecycle management plugin.
This is useful when you are performing maintenance on the cluster and need to prevent ILM from performing any actions on your indices.

The API returns as soon as the stop request has been acknowledged, but the plugin might continue to run until in-progress operations complete and the plugin can be safely stopped.
Use the get ILM status API to check whether ILM is running.`,
  methods: ['POST'],
  patterns: ['/_ilm/stop'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-stop',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ilm_stop_request, 'body'),
    getLooseObjectFromProperty(ilm_stop_request, 'path'),
    getLooseObjectFromProperty(ilm_stop_request, 'query'),
  ]),
  outputSchema: ilm_stop_response,
};
const INDEX_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.index',
  summary: `Create or update a document in an index`,
  description: `Create or update a document in an index.

Add a JSON document to the specified data stream or index and make it searchable.
If the target is an index and the document already exists, the request updates the document and increments its version.

NOTE: You cannot use this API to send update requests for existing documents in a data stream.

If the Elasticsearch security features are enabled, you must have the following index privileges for the target data stream, index, or index alias:

* To add or overwrite a document using the \`PUT /<target>/_doc/<_id>\` request format, you must have the \`create\`, \`index\`, or \`write\` index privilege.
* To add a document using the \`POST /<target>/_doc/\` request format, you must have the \`create_doc\`, \`create\`, \`index\`, or \`write\` index privilege.
* To automatically create a data stream or index with this API request, you must have the \`auto_configure\`, \`create_index\`, or \`manage\` index privilege.

Automatic data stream creation requires a matching index template with data stream enabled.

NOTE: Replica shards might not all be started when an indexing operation returns successfully.
By default, only the primary is required. Set \`wait_for_active_shards\` to change this default behavior.

**Automatically create data streams and indices**

If the request's target doesn't exist and matches an index template with a \`data_stream\` definition, the index operation automatically creates the data stream.

If the target doesn't exist and doesn't match a data stream template, the operation automatically creates the index and applies any matching index templates.

NOTE: Elasticsearch includes several built-in index templates. To avoid naming collisions with these templates, refer to index pattern documentation.

If no mapping exists, the index operation creates a dynamic mapping.
By default, new fields and objects are automatically added to the mapping if needed.

Automatic index creation is controlled by the \`action.auto_create_index\` setting.
If it is \`true\`, any index can be created automatically.
You can modify this setting to explicitly allow or block automatic creation of indices that match specified patterns or set it to \`false\` to turn off automatic index creation entirely.
Specify a comma-separated list of patterns you want to allow or prefix each pattern with \`+\` or \`-\` to indicate whether it should be allowed or blocked.
When a list is specified, the default behaviour is to disallow.

NOTE: The \`action.auto_create_index\` setting affects the automatic creation of indices only.
It does not affect the creation of data streams.

**Optimistic concurrency control**

Index operations can be made conditional and only be performed if the last modification to the document was assigned the sequence number and primary term specified by the \`if_seq_no\` and \`if_primary_term\` parameters.
If a mismatch is detected, the operation will result in a \`VersionConflictException\` and a status code of \`409\`.

**Routing**

By default, shard placement — or routing — is controlled by using a hash of the document's ID value.
For more explicit control, the value fed into the hash function used by the router can be directly specified on a per-operation basis using the \`routing\` parameter.

When setting up explicit mapping, you can also use the \`_routing\` field to direct the index operation to extract the routing value from the document itself.
This does come at the (very minimal) cost of an additional document parsing pass.
If the \`_routing\` mapping is defined and set to be required, the index operation will fail if no routing value is provided or extracted.

NOTE: Data streams do not support custom routing unless they were created with the \`allow_custom_routing\` setting enabled in the template.

**Distributed**

The index operation is directed to the primary shard based on its route and performed on the actual node containing this shard.
After the primary shard completes the operation, if needed, the update is distributed to applicable replicas.

**Active shards**

To improve the resiliency of writes to the system, indexing operations can be configured to wait for a certain number of active shard copies before proceeding with the operation.
If the requisite number of active shard copies are not available, then the write operation must wait and retry, until either the requisite shard copies have started or a timeout occurs.
By default, write operations only wait for the primary shards to be active before proceeding (that is to say \`wait_for_active_shards\` is \`1\`).
This default can be overridden in the index settings dynamically by setting \`index.write.wait_for_active_shards\`.
To alter this behavior per operation, use the \`wait_for_active_shards request\` parameter.

Valid values are all or any positive integer up to the total number of configured copies per shard in the index (which is \`number_of_replicas\`+1).
Specifying a negative value or a number greater than the number of shard copies will throw an error.

For example, suppose you have a cluster of three nodes, A, B, and C and you create an index index with the number of replicas set to 3 (resulting in 4 shard copies, one more copy than there are nodes).
If you attempt an indexing operation, by default the operation will only ensure the primary copy of each shard is available before proceeding.
This means that even if B and C went down and A hosted the primary shard copies, the indexing operation would still proceed with only one copy of the data.
If \`wait_for_active_shards\` is set on the request to \`3\` (and all three nodes are up), the indexing operation will require 3 active shard copies before proceeding.
This requirement should be met because there are 3 active nodes in the cluster, each one holding a copy of the shard.
However, if you set \`wait_for_active_shards\` to \`all\` (or to \`4\`, which is the same in this situation), the indexing operation will not proceed as you do not have all 4 copies of each shard active in the index.
The operation will timeout unless a new node is brought up in the cluster to host the fourth copy of the shard.

It is important to note that this setting greatly reduces the chances of the write operation not writing to the requisite number of shard copies, but it does not completely eliminate the possibility, because this check occurs before the write operation starts.
After the write operation is underway, it is still possible for replication to fail on any number of shard copies but still succeed on the primary.
The \`_shards\` section of the API response reveals the number of shard copies on which replication succeeded and failed.

**No operation (noop) updates**

When updating a document by using this API, a new version of the document is always created even if the document hasn't changed.
If this isn't acceptable use the \`_update\` API with \`detect_noop\` set to \`true\`.
The \`detect_noop\` option isn't available on this API because it doesn’t fetch the old source and isn't able to compare it against the new source.

There isn't a definitive rule for when noop updates aren't acceptable.
It's a combination of lots of factors like how frequently your data source sends updates that are actually noops and how many queries per second Elasticsearch runs on the shard receiving the updates.

**Versioning**

Each indexed document is given a version number.
By default, internal versioning is used that starts at 1 and increments with each update, deletes included.
Optionally, the version number can be set to an external value (for example, if maintained in a database).
To enable this functionality, \`version_type\` should be set to \`external\`.
The value provided must be a numeric, long value greater than or equal to 0, and less than around \`9.2e+18\`.

NOTE: Versioning is completely real time, and is not affected by the near real time aspects of search operations.
If no version is provided, the operation runs without any version checks.

When using the external version type, the system checks to see if the version number passed to the index request is greater than the version of the currently stored document.
If true, the document will be indexed and the new version number used.
If the value provided is less than or equal to the stored document's version number, a version conflict will occur and the index operation will fail. For example:

\`\`\`
PUT my-index-000001/_doc/1?version=2&version_type=external
{
  "user": {
    "id": "elkbee"
  }
}

In this example, the operation will succeed since the supplied version of 2 is higher than the current document version of 1.
If the document was already updated and its version was set to 2 or higher, the indexing command will fail and result in a conflict (409 HTTP status code).

A nice side effect is that there is no need to maintain strict ordering of async indexing operations run as a result of changes to a source database, as long as version numbers from the source database are used.
Even the simple case of updating the Elasticsearch index using data from a database is simplified if external versioning is used, as only the latest version will be used if the index operations arrive out of order.`,
  methods: ['PUT', 'POST', 'POST'],
  patterns: ['/{index}/_doc/{id}', '/{index}/_doc'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-create',
  parameterTypes: {
    pathParams: ['index', 'id', 'index', 'id', 'index', 'id'],
    urlParams: [
      'preference',
      'realtime',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_exclude_vectors',
      '_source_includes',
      'stored_fields',
      'version',
      'version_type',
      'if_primary_term',
      'if_seq_no',
      'refresh',
      'routing',
      'timeout',
      'version',
      'version_type',
      'wait_for_active_shards',
      'preference',
      'realtime',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_includes',
      'stored_fields',
      'version',
      'version_type',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(index_request, 'body'),
    getLooseObjectFromProperty(index_request, 'path'),
    getLooseObjectFromProperty(index_request, 'query'),
    getLooseObjectFromProperty(index1_request, 'body'),
    getLooseObjectFromProperty(index1_request, 'path'),
    getLooseObjectFromProperty(index1_request, 'query'),
    getLooseObjectFromProperty(index2_request, 'body'),
    getLooseObjectFromProperty(index2_request, 'path'),
    getLooseObjectFromProperty(index2_request, 'query'),
  ]),
  outputSchema: z.union([index_response, index1_response, index2_response]),
};
const INDICES_ADD_BLOCK_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.add_block',
  summary: `Add an index block`,
  description: `Add an index block.

Add an index block to an index.
Index blocks limit the operations allowed on an index by blocking specific operation types.`,
  methods: ['PUT'],
  patterns: ['/{index}/_block/{block}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-add-block',
  parameterTypes: {
    pathParams: ['index', 'block', 'index', 'block'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
      'master_timeout',
      'timeout',
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
      'master_timeout',
      'timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_add_block_request, 'body'),
    getLooseObjectFromProperty(indices_add_block_request, 'path'),
    getLooseObjectFromProperty(indices_add_block_request, 'query'),
  ]),
  outputSchema: indices_add_block_response,
};
const INDICES_ANALYZE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.analyze',
  summary: `Get tokens from text analysis`,
  description: `Get tokens from text analysis.
The analyze API performs analysis on a text string and returns the resulting tokens.

Generating excessive amount of tokens may cause a node to run out of memory.
The \`index.analyze.max_token_count\` setting enables you to limit the number of tokens that can be produced.
If more than this limit of tokens gets generated, an error occurs.
The \`_analyze\` endpoint without a specified index will always use \`10000\` as its limit.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_analyze', '/{index}/_analyze'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-analyze',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_analyze_request, 'body'),
    getLooseObjectFromProperty(indices_analyze_request, 'path'),
    getLooseObjectFromProperty(indices_analyze_request, 'query'),
    getLooseObjectFromProperty(indices_analyze1_request, 'body'),
    getLooseObjectFromProperty(indices_analyze1_request, 'path'),
    getLooseObjectFromProperty(indices_analyze1_request, 'query'),
    getLooseObjectFromProperty(indices_analyze2_request, 'body'),
    getLooseObjectFromProperty(indices_analyze2_request, 'path'),
    getLooseObjectFromProperty(indices_analyze2_request, 'query'),
    getLooseObjectFromProperty(indices_analyze3_request, 'body'),
    getLooseObjectFromProperty(indices_analyze3_request, 'path'),
    getLooseObjectFromProperty(indices_analyze3_request, 'query'),
  ]),
  outputSchema: z.union([
    indices_analyze_response,
    indices_analyze1_response,
    indices_analyze2_response,
    indices_analyze3_response,
  ]),
};
const INDICES_CANCEL_MIGRATE_REINDEX_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.cancel_migrate_reindex',
  summary: `Cancel a migration reindex operation`,
  description: `Cancel a migration reindex operation.

Cancel a migration reindex attempt for a data stream or index.`,
  methods: ['POST'],
  patterns: ['/_migration/reindex/{index}/_cancel'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-cancel-migrate-reindex',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_cancel_migrate_reindex_request, 'body'),
    getLooseObjectFromProperty(indices_cancel_migrate_reindex_request, 'path'),
    getLooseObjectFromProperty(indices_cancel_migrate_reindex_request, 'query'),
  ]),
  outputSchema: indices_cancel_migrate_reindex_response,
};
const INDICES_CLEAR_CACHE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.clear_cache',
  summary: `Clear the cache`,
  description: `Clear the cache.
Clear the cache of one or more indices.
For data streams, the API clears the caches of the stream's backing indices.

By default, the clear cache API clears all caches.
To clear only specific caches, use the \`fielddata\`, \`query\`, or \`request\` parameters.
To clear the cache only of specific fields, use the \`fields\` parameter.`,
  methods: ['POST', 'POST'],
  patterns: ['/_cache/clear', '/{index}/_cache/clear'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-clear-cache',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_clear_cache_request, 'body'),
    getLooseObjectFromProperty(indices_clear_cache_request, 'path'),
    getLooseObjectFromProperty(indices_clear_cache_request, 'query'),
    getLooseObjectFromProperty(indices_clear_cache1_request, 'body'),
    getLooseObjectFromProperty(indices_clear_cache1_request, 'path'),
    getLooseObjectFromProperty(indices_clear_cache1_request, 'query'),
  ]),
  outputSchema: z.union([indices_clear_cache_response, indices_clear_cache1_response]),
};
const INDICES_CLONE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.clone',
  summary: `Clone an index`,
  description: `Clone an index.
Clone an existing index into a new index.
Each original primary shard is cloned into a new primary shard in the new index.

IMPORTANT: Elasticsearch does not apply index templates to the resulting index.
The API also does not copy index metadata from the original index.
Index metadata includes aliases, index lifecycle management phase definitions, and cross-cluster replication (CCR) follower information.
For example, if you clone a CCR follower index, the resulting clone will not be a follower index.

The clone API copies most index settings from the source index to the resulting index, with the exception of \`index.number_of_replicas\` and \`index.auto_expand_replicas\`.
To set the number of replicas in the resulting index, configure these settings in the clone request.

Cloning works as follows:

* First, it creates a new target index with the same definition as the source index.
* Then it hard-links segments from the source index into the target index. If the file system does not support hard-linking, all segments are copied into the new index, which is a much more time consuming process.
* Finally, it recovers the target index as though it were a closed index which had just been re-opened.

IMPORTANT: Indices can only be cloned if they meet the following requirements:

* The index must be marked as read-only and have a cluster health status of green.
* The target index must not exist.
* The source index must have the same number of primary shards as the target index.
* The node handling the clone process must have sufficient free disk space to accommodate a second copy of the existing index.

The current write index on a data stream cannot be cloned.
In order to clone the current write index, the data stream must first be rolled over so that a new write index is created and then the previous write index can be cloned.

NOTE: Mappings cannot be specified in the \`_clone\` request. The mappings of the source index will be used for the target index.

**Monitor the cloning process**

The cloning process can be monitored with the cat recovery API or the cluster health API can be used to wait until all primary shards have been allocated by setting the \`wait_for_status\` parameter to \`yellow\`.

The \`_clone\` API returns as soon as the target index has been added to the cluster state, before any shards have been allocated.
At this point, all shards are in the state unassigned.
If, for any reason, the target index can't be allocated, its primary shard will remain unassigned until it can be allocated on that node.

Once the primary shard is allocated, it moves to state initializing, and the clone process begins.
When the clone operation completes, the shard will become active.
At that point, Elasticsearch will try to allocate any replicas and may decide to relocate the primary shard to another node.

**Wait for active shards**

Because the clone operation creates a new index to clone the shards to, the wait for active shards setting on index creation applies to the clone index action as well.`,
  methods: ['PUT', 'POST'],
  patterns: ['/{index}/_clone/{target}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-clone',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_clone_request, 'body'),
    getLooseObjectFromProperty(indices_clone_request, 'path'),
    getLooseObjectFromProperty(indices_clone_request, 'query'),
    getLooseObjectFromProperty(indices_clone1_request, 'body'),
    getLooseObjectFromProperty(indices_clone1_request, 'path'),
    getLooseObjectFromProperty(indices_clone1_request, 'query'),
  ]),
  outputSchema: z.union([indices_clone_response, indices_clone1_response]),
};
const INDICES_CLOSE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.close',
  summary: `Close an index`,
  description: `Close an index.
A closed index is blocked for read or write operations and does not allow all operations that opened indices allow.
It is not possible to index documents or to search for documents in a closed index.
Closed indices do not have to maintain internal data structures for indexing or searching documents, which results in a smaller overhead on the cluster.

When opening or closing an index, the master node is responsible for restarting the index shards to reflect the new state of the index.
The shards will then go through the normal recovery process.
The data of opened and closed indices is automatically replicated by the cluster to ensure that enough shard copies are safely kept around at all times.

You can open and close multiple indices.
An error is thrown if the request explicitly refers to a missing index.
This behaviour can be turned off using the \`ignore_unavailable=true\` parameter.

By default, you must explicitly name the indices you are opening or closing.
To open or close indices with \`_all\`, \`*\`, or other wildcard expressions, change the\` action.destructive_requires_name\` setting to \`false\`. This setting can also be changed with the cluster update settings API.

Closed indices consume a significant amount of disk-space which can cause problems in managed environments.
Closing indices can be turned off with the cluster settings API by setting \`cluster.indices.close.enable\` to \`false\`.`,
  methods: ['POST'],
  patterns: ['/{index}/_close'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-close',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
      'master_timeout',
      'timeout',
      'wait_for_active_shards',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_close_request, 'body'),
    getLooseObjectFromProperty(indices_close_request, 'path'),
    getLooseObjectFromProperty(indices_close_request, 'query'),
  ]),
  outputSchema: indices_close_response,
};
const INDICES_CREATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.create',
  summary: `Create an index`,
  description: `Create an index.
You can use the create index API to add a new index to an Elasticsearch cluster.
When creating an index, you can specify the following:

* Settings for the index.
* Mappings for fields in the index.
* Index aliases

**Wait for active shards**

By default, index creation will only return a response to the client when the primary copies of each shard have been started, or the request times out.
The index creation response will indicate what happened.
For example, \`acknowledged\` indicates whether the index was successfully created in the cluster, \`while shards_acknowledged\` indicates whether the requisite number of shard copies were started for each shard in the index before timing out.
Note that it is still possible for either \`acknowledged\` or \`shards_acknowledged\` to be \`false\`, but for the index creation to be successful.
These values simply indicate whether the operation completed before the timeout.
If \`acknowledged\` is false, the request timed out before the cluster state was updated with the newly created index, but it probably will be created sometime soon.
If \`shards_acknowledged\` is false, then the request timed out before the requisite number of shards were started (by default just the primaries), even if the cluster state was successfully updated to reflect the newly created index (that is to say, \`acknowledged\` is \`true\`).

You can change the default of only waiting for the primary shards to start through the index setting \`index.write.wait_for_active_shards\`.
Note that changing this setting will also affect the \`wait_for_active_shards\` value on all subsequent write operations.`,
  methods: ['PUT'],
  patterns: ['/{index}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create',
  parameterTypes: {
    pathParams: ['index', 'index', 'index', 'index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'flat_settings',
      'ignore_unavailable',
      'include_defaults',
      'local',
      'master_timeout',
      'features',
      'master_timeout',
      'timeout',
      'wait_for_active_shards',
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
      'master_timeout',
      'timeout',
      'allow_no_indices',
      'expand_wildcards',
      'flat_settings',
      'ignore_unavailable',
      'include_defaults',
      'local',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_create_request, 'body'),
    getLooseObjectFromProperty(indices_create_request, 'path'),
    getLooseObjectFromProperty(indices_create_request, 'query'),
  ]),
  outputSchema: indices_create_response,
};
const INDICES_CREATE_DATA_STREAM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.create_data_stream',
  summary: `Create a data stream`,
  description: `Create a data stream.

You must have a matching index template with data stream enabled.`,
  methods: ['PUT'],
  patterns: ['/_data_stream/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create-data-stream',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'expand_wildcards'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_create_data_stream_request, 'body'),
    getLooseObjectFromProperty(indices_create_data_stream_request, 'path'),
    getLooseObjectFromProperty(indices_create_data_stream_request, 'query'),
  ]),
  outputSchema: indices_create_data_stream_response,
};
const INDICES_CREATE_FROM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.create_from',
  summary: `Create an index from a source index`,
  description: `Create an index from a source index.

Copy the mappings and settings from the source index to a destination index while allowing request settings and mappings to override the source values.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_create_from/{source}/{dest}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create-from',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_create_from_request, 'body'),
    getLooseObjectFromProperty(indices_create_from_request, 'path'),
    getLooseObjectFromProperty(indices_create_from_request, 'query'),
    getLooseObjectFromProperty(indices_create_from1_request, 'body'),
    getLooseObjectFromProperty(indices_create_from1_request, 'path'),
    getLooseObjectFromProperty(indices_create_from1_request, 'query'),
  ]),
  outputSchema: z.union([indices_create_from_response, indices_create_from1_response]),
};
const INDICES_DATA_STREAMS_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.data_streams_stats',
  summary: `Get data stream stats`,
  description: `Get data stream stats.

Get statistics for one or more data streams.`,
  methods: ['GET', 'GET'],
  patterns: ['/_data_stream/_stats', '/_data_stream/{name}/_stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-data-streams-stats-1',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_data_streams_stats_request, 'body'),
    getLooseObjectFromProperty(indices_data_streams_stats_request, 'path'),
    getLooseObjectFromProperty(indices_data_streams_stats_request, 'query'),
    getLooseObjectFromProperty(indices_data_streams_stats1_request, 'body'),
    getLooseObjectFromProperty(indices_data_streams_stats1_request, 'path'),
    getLooseObjectFromProperty(indices_data_streams_stats1_request, 'query'),
  ]),
  outputSchema: z.union([
    indices_data_streams_stats_response,
    indices_data_streams_stats1_response,
  ]),
};
const INDICES_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.delete',
  summary: `Delete indices`,
  description: `Delete indices.
Deleting an index deletes its documents, shards, and metadata.
It does not delete related Kibana components, such as data views, visualizations, or dashboards.

You cannot delete the current write index of a data stream.
To delete the index, you must roll over the data stream so a new write index is created.
You can then use the delete index API to delete the previous write index.`,
  methods: ['DELETE'],
  patterns: ['/{index}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete',
  parameterTypes: {
    pathParams: ['index', 'index', 'index', 'index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'flat_settings',
      'ignore_unavailable',
      'include_defaults',
      'local',
      'master_timeout',
      'features',
      'master_timeout',
      'timeout',
      'wait_for_active_shards',
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
      'master_timeout',
      'timeout',
      'allow_no_indices',
      'expand_wildcards',
      'flat_settings',
      'ignore_unavailable',
      'include_defaults',
      'local',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_delete_request, 'body'),
    getLooseObjectFromProperty(indices_delete_request, 'path'),
    getLooseObjectFromProperty(indices_delete_request, 'query'),
  ]),
  outputSchema: indices_delete_response,
};
const INDICES_DELETE_ALIAS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.delete_alias',
  summary: `Delete an alias`,
  description: `Delete an alias.
Removes a data stream or index from an alias.`,
  methods: ['DELETE', 'DELETE'],
  patterns: ['/{index}/_alias/{name}', '/{index}/_aliases/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-alias',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_delete_alias_request, 'body'),
    getLooseObjectFromProperty(indices_delete_alias_request, 'path'),
    getLooseObjectFromProperty(indices_delete_alias_request, 'query'),
    getLooseObjectFromProperty(indices_delete_alias1_request, 'body'),
    getLooseObjectFromProperty(indices_delete_alias1_request, 'path'),
    getLooseObjectFromProperty(indices_delete_alias1_request, 'query'),
  ]),
  outputSchema: z.union([indices_delete_alias_response, indices_delete_alias1_response]),
};
const INDICES_DELETE_DATA_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.delete_data_lifecycle',
  summary: `Delete data stream lifecycles`,
  description: `Delete data stream lifecycles.
Removes the data stream lifecycle from a data stream, rendering it not managed by the data stream lifecycle.`,
  methods: ['DELETE'],
  patterns: ['/_data_stream/{name}/_lifecycle'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-data-lifecycle',
  parameterTypes: {
    pathParams: ['name', 'name', 'name'],
    urlParams: [
      'expand_wildcards',
      'include_defaults',
      'master_timeout',
      'expand_wildcards',
      'master_timeout',
      'timeout',
      'expand_wildcards',
      'master_timeout',
      'timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_delete_data_lifecycle_request, 'body'),
    getLooseObjectFromProperty(indices_delete_data_lifecycle_request, 'path'),
    getLooseObjectFromProperty(indices_delete_data_lifecycle_request, 'query'),
  ]),
  outputSchema: indices_delete_data_lifecycle_response,
};
const INDICES_DELETE_DATA_STREAM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.delete_data_stream',
  summary: `Delete data streams`,
  description: `Delete data streams.
Deletes one or more data streams and their backing indices.`,
  methods: ['DELETE'],
  patterns: ['/_data_stream/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-data-stream',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'expand_wildcards'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_delete_data_stream_request, 'body'),
    getLooseObjectFromProperty(indices_delete_data_stream_request, 'path'),
    getLooseObjectFromProperty(indices_delete_data_stream_request, 'query'),
  ]),
  outputSchema: indices_delete_data_stream_response,
};
const INDICES_DELETE_DATA_STREAM_OPTIONS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.delete_data_stream_options',
  summary: `Delete data stream options`,
  description: `Delete data stream options.
Removes the data stream options from a data stream.`,
  methods: ['DELETE'],
  patterns: ['/_data_stream/{name}/_options'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-data-stream-options',
  parameterTypes: {
    pathParams: ['name', 'name', 'name'],
    urlParams: [
      'expand_wildcards',
      'master_timeout',
      'expand_wildcards',
      'master_timeout',
      'timeout',
      'expand_wildcards',
      'master_timeout',
      'timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_delete_data_stream_options_request, 'body'),
    getLooseObjectFromProperty(indices_delete_data_stream_options_request, 'path'),
    getLooseObjectFromProperty(indices_delete_data_stream_options_request, 'query'),
  ]),
  outputSchema: indices_delete_data_stream_options_response,
};
const INDICES_DELETE_INDEX_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.delete_index_template',
  summary: `Delete an index template`,
  description: `Delete an index template.
The provided <index-template> may contain multiple template names separated by a comma. If multiple template
names are specified then there is no wildcard support and the provided names should match completely with
existing templates.`,
  methods: ['DELETE'],
  patterns: ['/_index_template/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-index-template',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'timeout', 'local', 'flat_settings', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_delete_index_template_request, 'body'),
    getLooseObjectFromProperty(indices_delete_index_template_request, 'path'),
    getLooseObjectFromProperty(indices_delete_index_template_request, 'query'),
  ]),
  outputSchema: indices_delete_index_template_response,
};
const INDICES_DELETE_SAMPLE_CONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.delete_sample_configuration',
  summary: ``,
  description: `Delete sampling configuration.
Delete the sampling configuration for the specified index.`,
  methods: ['DELETE'],
  patterns: ['/{index}/_sample/config'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/ingest-random-sampling',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const INDICES_DELETE_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.delete_template',
  summary: `Delete a legacy index template`,
  description: `Delete a legacy index template.
IMPORTANT: This documentation is about legacy index templates, which are deprecated and will be replaced by the composable templates introduced in Elasticsearch 7.8.`,
  methods: ['DELETE'],
  patterns: ['/_template/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-template',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'timeout', 'flat_settings', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_delete_template_request, 'body'),
    getLooseObjectFromProperty(indices_delete_template_request, 'path'),
    getLooseObjectFromProperty(indices_delete_template_request, 'query'),
  ]),
  outputSchema: indices_delete_template_response,
};
const INDICES_DISK_USAGE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.disk_usage',
  summary: `Analyze the index disk usage`,
  description: `Analyze the index disk usage.
Analyze the disk usage of each field of an index or data stream.
This API might not support indices created in previous Elasticsearch versions.
The result of a small index can be inaccurate as some parts of an index might not be analyzed by the API.

NOTE: The total size of fields of the analyzed shards of the index in the response is usually smaller than the index \`store_size\` value because some small metadata files are ignored and some parts of data files might not be scanned by the API.
Since stored fields are stored together in a compressed format, the sizes of stored fields are also estimates and can be inaccurate.
The stored size of the \`_id\` field is likely underestimated while the \`_source\` field is overestimated.

For usage examples see the External documentation or refer to [Analyze the index disk usage example](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/index-disk-usage) for an example.`,
  methods: ['POST'],
  patterns: ['/{index}/_disk_usage'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-disk-usage',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'flush',
      'ignore_unavailable',
      'run_expensive_tasks',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_disk_usage_request, 'body'),
    getLooseObjectFromProperty(indices_disk_usage_request, 'path'),
    getLooseObjectFromProperty(indices_disk_usage_request, 'query'),
  ]),
  outputSchema: indices_disk_usage_response,
};
const INDICES_DOWNSAMPLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.downsample',
  summary: `Downsample an index`,
  description: `Downsample an index.
Downsamples a time series (TSDS) index and reduces its size by keeping the last value or by pre-aggregating metrics:

- When running in \`aggregate\` mode, it pre-calculates and stores statistical summaries (\`min\`, \`max\`, \`sum\`, \`value_count\` and \`avg\`)
for each metric field grouped by a configured time interval and their dimensions.
- When running in \`last_value\` mode, it keeps the last value for each metric in the configured interval and their dimensions.

For example, a TSDS index that contains metrics sampled every 10 seconds can be downsampled to an hourly index.
All documents within an hour interval are summarized and stored as a single document in the downsample index.

NOTE: Only indices in a time series data stream are supported.
Neither field nor document level security can be defined on the source index.
The source index must be read-only (\`index.blocks.write: true\`).`,
  methods: ['POST'],
  patterns: ['/{index}/_downsample/{target_index}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-downsample',
  parameterTypes: {
    pathParams: ['index', 'target_index'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_downsample_request, 'body'),
    getLooseObjectFromProperty(indices_downsample_request, 'path'),
    getLooseObjectFromProperty(indices_downsample_request, 'query'),
  ]),
  outputSchema: indices_downsample_response,
};
const INDICES_EXISTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.exists',
  summary: `Check indices`,
  description: `Check indices.
Check if one or more indices, index aliases, or data streams exist.`,
  methods: ['HEAD'],
  patterns: ['/{index}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-exists',
  parameterTypes: {
    pathParams: ['index', 'index', 'index', 'index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'flat_settings',
      'ignore_unavailable',
      'include_defaults',
      'local',
      'master_timeout',
      'features',
      'master_timeout',
      'timeout',
      'wait_for_active_shards',
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
      'master_timeout',
      'timeout',
      'allow_no_indices',
      'expand_wildcards',
      'flat_settings',
      'ignore_unavailable',
      'include_defaults',
      'local',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_exists_request, 'body'),
    getLooseObjectFromProperty(indices_exists_request, 'path'),
    getLooseObjectFromProperty(indices_exists_request, 'query'),
  ]),
  outputSchema: indices_exists_response,
};
const INDICES_EXISTS_ALIAS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.exists_alias',
  summary: `Check aliases`,
  description: `Check aliases.

Check if one or more data stream or index aliases exist.`,
  methods: ['HEAD', 'HEAD'],
  patterns: ['/_alias/{name}', '/{index}/_alias/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-exists-alias',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_exists_alias_request, 'body'),
    getLooseObjectFromProperty(indices_exists_alias_request, 'path'),
    getLooseObjectFromProperty(indices_exists_alias_request, 'query'),
    getLooseObjectFromProperty(indices_exists_alias1_request, 'body'),
    getLooseObjectFromProperty(indices_exists_alias1_request, 'path'),
    getLooseObjectFromProperty(indices_exists_alias1_request, 'query'),
  ]),
  outputSchema: z.union([indices_exists_alias_response, indices_exists_alias1_response]),
};
const INDICES_EXISTS_INDEX_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.exists_index_template',
  summary: `Check index templates`,
  description: `Check index templates.

Check whether index templates exist.`,
  methods: ['HEAD'],
  patterns: ['/_index_template/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-exists-index-template',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'timeout', 'local', 'flat_settings', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_exists_index_template_request, 'body'),
    getLooseObjectFromProperty(indices_exists_index_template_request, 'path'),
    getLooseObjectFromProperty(indices_exists_index_template_request, 'query'),
  ]),
  outputSchema: indices_exists_index_template_response,
};
const INDICES_EXISTS_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.exists_template',
  summary: `Check existence of index templates`,
  description: `Check existence of index templates.
Get information about whether index templates exist.
Index templates define settings, mappings, and aliases that can be applied automatically to new indices.

IMPORTANT: This documentation is about legacy index templates, which are deprecated and will be replaced by the composable templates introduced in Elasticsearch 7.8.`,
  methods: ['HEAD'],
  patterns: ['/_template/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-exists-template',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'timeout', 'flat_settings', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_exists_template_request, 'body'),
    getLooseObjectFromProperty(indices_exists_template_request, 'path'),
    getLooseObjectFromProperty(indices_exists_template_request, 'query'),
  ]),
  outputSchema: indices_exists_template_response,
};
const INDICES_EXPLAIN_DATA_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.explain_data_lifecycle',
  summary: `Get the status for a data stream lifecycle`,
  description: `Get the status for a data stream lifecycle.
Get information about an index or data stream's current data stream lifecycle status, such as time since index creation, time since rollover, the lifecycle configuration managing the index, or any errors encountered during lifecycle execution.`,
  methods: ['GET'],
  patterns: ['/{index}/_lifecycle/explain'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-explain-data-lifecycle',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: ['include_defaults', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_explain_data_lifecycle_request, 'body'),
    getLooseObjectFromProperty(indices_explain_data_lifecycle_request, 'path'),
    getLooseObjectFromProperty(indices_explain_data_lifecycle_request, 'query'),
  ]),
  outputSchema: indices_explain_data_lifecycle_response,
};
const INDICES_FIELD_USAGE_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.field_usage_stats',
  summary: `Get field usage stats`,
  description: `Get field usage stats.
Get field usage information for each shard and field of an index.
Field usage statistics are automatically captured when queries are running on a cluster.
A shard-level search request that accesses a given field, even if multiple times during that request, is counted as a single use.

The response body reports the per-shard usage count of the data structures that back the fields in the index.
A given request will increment each count by a maximum value of 1, even if the request accesses the same field multiple times.`,
  methods: ['GET'],
  patterns: ['/{index}/_field_usage_stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-field-usage-stats',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: ['allow_no_indices', 'expand_wildcards', 'ignore_unavailable', 'fields'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_field_usage_stats_request, 'body'),
    getLooseObjectFromProperty(indices_field_usage_stats_request, 'path'),
    getLooseObjectFromProperty(indices_field_usage_stats_request, 'query'),
  ]),
  outputSchema: indices_field_usage_stats_response,
};
const INDICES_FLUSH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.flush',
  summary: `Flush data streams or indices`,
  description: `Flush data streams or indices.
Flushing a data stream or index is the process of making sure that any data that is currently only stored in the transaction log is also permanently stored in the Lucene index.
When restarting, Elasticsearch replays any unflushed operations from the transaction log into the Lucene index to bring it back into the state that it was in before the restart.
Elasticsearch automatically triggers flushes as needed, using heuristics that trade off the size of the unflushed transaction log against the cost of performing each flush.

After each operation has been flushed it is permanently stored in the Lucene index.
This may mean that there is no need to maintain an additional copy of it in the transaction log.
The transaction log is made up of multiple files, called generations, and Elasticsearch will delete any generation files when they are no longer needed, freeing up disk space.

It is also possible to trigger a flush on one or more indices using the flush API, although it is rare for users to need to call this API directly.
If you call the flush API after indexing some documents then a successful response indicates that Elasticsearch has flushed all the documents that were indexed before the flush API was called.`,
  methods: ['POST', 'GET', 'POST', 'GET'],
  patterns: ['/_flush', '/{index}/_flush'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-flush',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_flush_request, 'body'),
    getLooseObjectFromProperty(indices_flush_request, 'path'),
    getLooseObjectFromProperty(indices_flush_request, 'query'),
    getLooseObjectFromProperty(indices_flush1_request, 'body'),
    getLooseObjectFromProperty(indices_flush1_request, 'path'),
    getLooseObjectFromProperty(indices_flush1_request, 'query'),
    getLooseObjectFromProperty(indices_flush2_request, 'body'),
    getLooseObjectFromProperty(indices_flush2_request, 'path'),
    getLooseObjectFromProperty(indices_flush2_request, 'query'),
    getLooseObjectFromProperty(indices_flush3_request, 'body'),
    getLooseObjectFromProperty(indices_flush3_request, 'path'),
    getLooseObjectFromProperty(indices_flush3_request, 'query'),
  ]),
  outputSchema: z.union([
    indices_flush_response,
    indices_flush1_response,
    indices_flush2_response,
    indices_flush3_response,
  ]),
};
const INDICES_FORCEMERGE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.forcemerge',
  summary: `Force a merge`,
  description: `Force a merge.
Perform the force merge operation on the shards of one or more indices.
For data streams, the API forces a merge on the shards of the stream's backing indices.

Merging reduces the number of segments in each shard by merging some of them together and also frees up the space used by deleted documents.
Merging normally happens automatically, but sometimes it is useful to trigger a merge manually.

WARNING: We recommend force merging only a read-only index (meaning the index is no longer receiving writes).
When documents are updated or deleted, the old version is not immediately removed but instead soft-deleted and marked with a "tombstone".
These soft-deleted documents are automatically cleaned up during regular segment merges.
But force merge can cause very large (greater than 5 GB) segments to be produced, which are not eligible for regular merges.
So the number of soft-deleted documents can then grow rapidly, resulting in higher disk usage and worse search performance.
If you regularly force merge an index receiving writes, this can also make snapshots more expensive, since the new documents can't be backed up incrementally.

**Blocks during a force merge**

Calls to this API block until the merge is complete (unless request contains \`wait_for_completion=false\`).
If the client connection is lost before completion then the force merge process will continue in the background.
Any new requests to force merge the same indices will also block until the ongoing force merge is complete.

**Running force merge asynchronously**

If the request contains \`wait_for_completion=false\`, Elasticsearch performs some preflight checks, launches the request, and returns a task you can use to get the status of the task.
However, you can not cancel this task as the force merge task is not cancelable.
Elasticsearch creates a record of this task as a document at \`_tasks/<task_id>\`.
When you are done with a task, you should delete the task document so Elasticsearch can reclaim the space.

**Force merging multiple indices**

You can force merge multiple indices with a single request by targeting:

* One or more data streams that contain multiple backing indices
* Multiple indices
* One or more aliases
* All data streams and indices in a cluster

Each targeted shard is force-merged separately using the force_merge threadpool.
By default each node only has a single \`force_merge\` thread which means that the shards on that node are force-merged one at a time.
If you expand the \`force_merge\` threadpool on a node then it will force merge its shards in parallel

Force merge makes the storage for the shard being merged temporarily increase, as it may require free space up to triple its size in case \`max_num_segments parameter\` is set to \`1\`, to rewrite all segments into a new one.

**Data streams and time-based indices**

Force-merging is useful for managing a data stream's older backing indices and other time-based indices, particularly after a rollover.
In these cases, each index only receives indexing traffic for a certain period of time.
Once an index receive no more writes, its shards can be force-merged to a single segment.
This can be a good idea because single-segment shards can sometimes use simpler and more efficient data structures to perform searches.
For example:

\`\`\`
POST /.ds-my-data-stream-2099.03.07-000001/_forcemerge?max_num_segments=1
\`\`\``,
  methods: ['POST', 'POST'],
  patterns: ['/_forcemerge', '/{index}/_forcemerge'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-forcemerge',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_forcemerge_request, 'body'),
    getLooseObjectFromProperty(indices_forcemerge_request, 'path'),
    getLooseObjectFromProperty(indices_forcemerge_request, 'query'),
    getLooseObjectFromProperty(indices_forcemerge1_request, 'body'),
    getLooseObjectFromProperty(indices_forcemerge1_request, 'path'),
    getLooseObjectFromProperty(indices_forcemerge1_request, 'query'),
  ]),
  outputSchema: z.union([indices_forcemerge_response, indices_forcemerge1_response]),
};
const INDICES_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get',
  summary: `Get index information`,
  description: `Get index information.
Get information about one or more indices. For data streams, the API returns information about the
stream’s backing indices.`,
  methods: ['GET'],
  patterns: ['/{index}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get',
  parameterTypes: {
    pathParams: ['index', 'index', 'index', 'index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'flat_settings',
      'ignore_unavailable',
      'include_defaults',
      'local',
      'master_timeout',
      'features',
      'master_timeout',
      'timeout',
      'wait_for_active_shards',
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
      'master_timeout',
      'timeout',
      'allow_no_indices',
      'expand_wildcards',
      'flat_settings',
      'ignore_unavailable',
      'include_defaults',
      'local',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_get_request, 'body'),
    getLooseObjectFromProperty(indices_get_request, 'path'),
    getLooseObjectFromProperty(indices_get_request, 'query'),
  ]),
  outputSchema: indices_get_response,
};
const INDICES_GET_ALIAS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_alias',
  summary: `Get aliases`,
  description: `Get aliases.
Retrieves information for one or more data stream or index aliases.`,
  methods: ['GET', 'GET', 'GET', 'GET'],
  patterns: ['/_alias', '/_alias/{name}', '/{index}/_alias/{name}', '/{index}/_alias'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-alias',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_get_alias_request, 'body'),
    getLooseObjectFromProperty(indices_get_alias_request, 'path'),
    getLooseObjectFromProperty(indices_get_alias_request, 'query'),
    getLooseObjectFromProperty(indices_get_alias1_request, 'body'),
    getLooseObjectFromProperty(indices_get_alias1_request, 'path'),
    getLooseObjectFromProperty(indices_get_alias1_request, 'query'),
    getLooseObjectFromProperty(indices_get_alias2_request, 'body'),
    getLooseObjectFromProperty(indices_get_alias2_request, 'path'),
    getLooseObjectFromProperty(indices_get_alias2_request, 'query'),
    getLooseObjectFromProperty(indices_get_alias3_request, 'body'),
    getLooseObjectFromProperty(indices_get_alias3_request, 'path'),
    getLooseObjectFromProperty(indices_get_alias3_request, 'query'),
  ]),
  outputSchema: z.union([
    indices_get_alias_response,
    indices_get_alias1_response,
    indices_get_alias2_response,
    indices_get_alias3_response,
  ]),
};
const INDICES_GET_ALL_SAMPLE_CONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_all_sample_configuration',
  summary: ``,
  description: `Get all sampling configurations.
Get the sampling configurations for all indices.`,
  methods: ['GET'],
  patterns: ['/_sample/config'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/ingest-random-sampling',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const INDICES_GET_DATA_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_data_lifecycle',
  summary: `Get data stream lifecycles`,
  description: `Get data stream lifecycles.

Get the data stream lifecycle configuration of one or more data streams.`,
  methods: ['GET'],
  patterns: ['/_data_stream/{name}/_lifecycle'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-lifecycle',
  parameterTypes: {
    pathParams: ['name', 'name', 'name'],
    urlParams: [
      'expand_wildcards',
      'include_defaults',
      'master_timeout',
      'expand_wildcards',
      'master_timeout',
      'timeout',
      'expand_wildcards',
      'master_timeout',
      'timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_get_data_lifecycle_request, 'body'),
    getLooseObjectFromProperty(indices_get_data_lifecycle_request, 'path'),
    getLooseObjectFromProperty(indices_get_data_lifecycle_request, 'query'),
  ]),
  outputSchema: indices_get_data_lifecycle_response,
};
const INDICES_GET_DATA_LIFECYCLE_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_data_lifecycle_stats',
  summary: `Get data stream lifecycle stats`,
  description: `Get data stream lifecycle stats.
Get statistics about the data streams that are managed by a data stream lifecycle.`,
  methods: ['GET'],
  patterns: ['/_lifecycle/stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-lifecycle-stats',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_get_data_lifecycle_stats_request, 'body'),
    getLooseObjectFromProperty(indices_get_data_lifecycle_stats_request, 'path'),
    getLooseObjectFromProperty(indices_get_data_lifecycle_stats_request, 'query'),
  ]),
  outputSchema: indices_get_data_lifecycle_stats_response,
};
const INDICES_GET_DATA_STREAM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_data_stream',
  summary: `Get data streams`,
  description: `Get data streams.

Get information about one or more data streams.`,
  methods: ['GET', 'GET'],
  patterns: ['/_data_stream', '/_data_stream/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-stream',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'expand_wildcards'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_get_data_stream_request, 'body'),
    getLooseObjectFromProperty(indices_get_data_stream_request, 'path'),
    getLooseObjectFromProperty(indices_get_data_stream_request, 'query'),
    getLooseObjectFromProperty(indices_get_data_stream1_request, 'body'),
    getLooseObjectFromProperty(indices_get_data_stream1_request, 'path'),
    getLooseObjectFromProperty(indices_get_data_stream1_request, 'query'),
  ]),
  outputSchema: z.union([indices_get_data_stream_response, indices_get_data_stream1_response]),
};
const INDICES_GET_DATA_STREAM_MAPPINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_data_stream_mappings',
  summary: `Get data stream mappings`,
  description: `Get data stream mappings.

Get mapping information for one or more data streams.`,
  methods: ['GET'],
  patterns: ['/_data_stream/{name}/_mappings'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-stream-mappings',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'dry_run', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_get_data_stream_mappings_request, 'body'),
    getLooseObjectFromProperty(indices_get_data_stream_mappings_request, 'path'),
    getLooseObjectFromProperty(indices_get_data_stream_mappings_request, 'query'),
  ]),
  outputSchema: indices_get_data_stream_mappings_response,
};
const INDICES_GET_DATA_STREAM_OPTIONS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_data_stream_options',
  summary: `Get data stream options`,
  description: `Get data stream options.

Get the data stream options configuration of one or more data streams.`,
  methods: ['GET'],
  patterns: ['/_data_stream/{name}/_options'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-stream-options',
  parameterTypes: {
    pathParams: ['name', 'name', 'name'],
    urlParams: [
      'expand_wildcards',
      'master_timeout',
      'expand_wildcards',
      'master_timeout',
      'timeout',
      'expand_wildcards',
      'master_timeout',
      'timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_get_data_stream_options_request, 'body'),
    getLooseObjectFromProperty(indices_get_data_stream_options_request, 'path'),
    getLooseObjectFromProperty(indices_get_data_stream_options_request, 'query'),
  ]),
  outputSchema: indices_get_data_stream_options_response,
};
const INDICES_GET_DATA_STREAM_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_data_stream_settings',
  summary: `Get data stream settings`,
  description: `Get data stream settings.

Get setting information for one or more data streams.`,
  methods: ['GET'],
  patterns: ['/_data_stream/{name}/_settings'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-stream-settings',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'dry_run', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_get_data_stream_settings_request, 'body'),
    getLooseObjectFromProperty(indices_get_data_stream_settings_request, 'path'),
    getLooseObjectFromProperty(indices_get_data_stream_settings_request, 'query'),
  ]),
  outputSchema: indices_get_data_stream_settings_response,
};
const INDICES_GET_FIELD_MAPPING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_field_mapping',
  summary: `Get mapping definitions`,
  description: `Get mapping definitions.
Retrieves mapping definitions for one or more fields.
For data streams, the API retrieves field mappings for the stream’s backing indices.

This API is useful if you don't need a complete mapping or if an index mapping contains a large number of fields.`,
  methods: ['GET', 'GET'],
  patterns: ['/_mapping/field/{fields}', '/{index}/_mapping/field/{fields}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-mapping',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_get_field_mapping_request, 'body'),
    getLooseObjectFromProperty(indices_get_field_mapping_request, 'path'),
    getLooseObjectFromProperty(indices_get_field_mapping_request, 'query'),
    getLooseObjectFromProperty(indices_get_field_mapping1_request, 'body'),
    getLooseObjectFromProperty(indices_get_field_mapping1_request, 'path'),
    getLooseObjectFromProperty(indices_get_field_mapping1_request, 'query'),
  ]),
  outputSchema: z.union([indices_get_field_mapping_response, indices_get_field_mapping1_response]),
};
const INDICES_GET_INDEX_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_index_template',
  summary: `Get index templates`,
  description: `Get index templates.
Get information about one or more index templates.`,
  methods: ['GET', 'GET'],
  patterns: ['/_index_template', '/_index_template/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-index-template',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'timeout', 'local', 'flat_settings', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_get_index_template_request, 'body'),
    getLooseObjectFromProperty(indices_get_index_template_request, 'path'),
    getLooseObjectFromProperty(indices_get_index_template_request, 'query'),
    getLooseObjectFromProperty(indices_get_index_template1_request, 'body'),
    getLooseObjectFromProperty(indices_get_index_template1_request, 'path'),
    getLooseObjectFromProperty(indices_get_index_template1_request, 'query'),
  ]),
  outputSchema: z.union([
    indices_get_index_template_response,
    indices_get_index_template1_response,
  ]),
};
const INDICES_GET_MAPPING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_mapping',
  summary: `Get mapping definitions`,
  description: `Get mapping definitions.
For data streams, the API retrieves mappings for the stream’s backing indices.`,
  methods: ['GET', 'GET'],
  patterns: ['/_mapping', '/{index}/_mapping'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-mapping',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_get_mapping_request, 'body'),
    getLooseObjectFromProperty(indices_get_mapping_request, 'path'),
    getLooseObjectFromProperty(indices_get_mapping_request, 'query'),
    getLooseObjectFromProperty(indices_get_mapping1_request, 'body'),
    getLooseObjectFromProperty(indices_get_mapping1_request, 'path'),
    getLooseObjectFromProperty(indices_get_mapping1_request, 'query'),
  ]),
  outputSchema: z.union([indices_get_mapping_response, indices_get_mapping1_response]),
};
const INDICES_GET_MIGRATE_REINDEX_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_migrate_reindex_status',
  summary: `Get the migration reindexing status`,
  description: `Get the migration reindexing status.

Get the status of a migration reindex attempt for a data stream or index.`,
  methods: ['GET'],
  patterns: ['/_migration/reindex/{index}/_status'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-migration',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_get_migrate_reindex_status_request, 'body'),
    getLooseObjectFromProperty(indices_get_migrate_reindex_status_request, 'path'),
    getLooseObjectFromProperty(indices_get_migrate_reindex_status_request, 'query'),
  ]),
  outputSchema: indices_get_migrate_reindex_status_response,
};
const INDICES_GET_SAMPLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_sample',
  summary: ``,
  description: `Request for a random sample of raw documents ingested into the given index or data stream.`,
  methods: ['GET'],
  patterns: ['/{index}/_sample'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/ingest-random-sampling',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const INDICES_GET_SAMPLE_CONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_sample_configuration',
  summary: ``,
  description: `Get sampling configuration.
Get the sampling configuration for the specified index.`,
  methods: ['GET'],
  patterns: ['/{index}/_sample/config'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/ingest-random-sampling',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const INDICES_GET_SAMPLE_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_sample_stats',
  summary: ``,
  description: `Request stats for a random sample of raw documents ingested into the given index or data stream.`,
  methods: ['GET'],
  patterns: ['/{index}/_sample/stats'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/ingest-random-sampling',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const INDICES_GET_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_settings',
  summary: `Get index settings`,
  description: `Get index settings.
Get setting information for one or more indices.
For data streams, it returns setting information for the stream's backing indices.`,
  methods: ['GET', 'GET', 'GET', 'GET'],
  patterns: ['/_settings', '/{index}/_settings', '/{index}/_settings/{name}', '/_settings/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-settings',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_get_settings_request, 'body'),
    getLooseObjectFromProperty(indices_get_settings_request, 'path'),
    getLooseObjectFromProperty(indices_get_settings_request, 'query'),
    getLooseObjectFromProperty(indices_get_settings1_request, 'body'),
    getLooseObjectFromProperty(indices_get_settings1_request, 'path'),
    getLooseObjectFromProperty(indices_get_settings1_request, 'query'),
    getLooseObjectFromProperty(indices_get_settings2_request, 'body'),
    getLooseObjectFromProperty(indices_get_settings2_request, 'path'),
    getLooseObjectFromProperty(indices_get_settings2_request, 'query'),
    getLooseObjectFromProperty(indices_get_settings3_request, 'body'),
    getLooseObjectFromProperty(indices_get_settings3_request, 'path'),
    getLooseObjectFromProperty(indices_get_settings3_request, 'query'),
  ]),
  outputSchema: z.union([
    indices_get_settings_response,
    indices_get_settings1_response,
    indices_get_settings2_response,
    indices_get_settings3_response,
  ]),
};
const INDICES_GET_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_template',
  summary: `Get legacy index templates`,
  description: `Get legacy index templates.
Get information about one or more index templates.

IMPORTANT: This documentation is about legacy index templates, which are deprecated and will be replaced by the composable templates introduced in Elasticsearch 7.8.`,
  methods: ['GET', 'GET'],
  patterns: ['/_template', '/_template/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-template',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'timeout', 'flat_settings', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_get_template_request, 'body'),
    getLooseObjectFromProperty(indices_get_template_request, 'path'),
    getLooseObjectFromProperty(indices_get_template_request, 'query'),
    getLooseObjectFromProperty(indices_get_template1_request, 'body'),
    getLooseObjectFromProperty(indices_get_template1_request, 'path'),
    getLooseObjectFromProperty(indices_get_template1_request, 'query'),
  ]),
  outputSchema: z.union([indices_get_template_response, indices_get_template1_response]),
};
const INDICES_MIGRATE_REINDEX_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.migrate_reindex',
  summary: `Reindex legacy backing indices`,
  description: `Reindex legacy backing indices.

Reindex all legacy backing indices for a data stream.
This operation occurs in a persistent task.
The persistent task ID is returned immediately and the reindexing work is completed in that task.`,
  methods: ['POST'],
  patterns: ['/_migration/reindex'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-migrate-reindex',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_migrate_reindex_request, 'body'),
    getLooseObjectFromProperty(indices_migrate_reindex_request, 'path'),
    getLooseObjectFromProperty(indices_migrate_reindex_request, 'query'),
  ]),
  outputSchema: indices_migrate_reindex_response,
};
const INDICES_MIGRATE_TO_DATA_STREAM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.migrate_to_data_stream',
  summary: `Convert an index alias to a data stream`,
  description: `Convert an index alias to a data stream.
Converts an index alias to a data stream.
You must have a matching index template that is data stream enabled.
The alias must meet the following criteria:
The alias must have a write index;
All indices for the alias must have a \`@timestamp\` field mapping of a \`date\` or \`date_nanos\` field type;
The alias must not have any filters;
The alias must not use custom routing.
If successful, the request removes the alias and creates a data stream with the same name.
The indices for the alias become hidden backing indices for the stream.
The write index for the alias becomes the write index for the stream.`,
  methods: ['POST'],
  patterns: ['/_data_stream/_migrate/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-migrate-to-data-stream',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_migrate_to_data_stream_request, 'body'),
    getLooseObjectFromProperty(indices_migrate_to_data_stream_request, 'path'),
    getLooseObjectFromProperty(indices_migrate_to_data_stream_request, 'query'),
  ]),
  outputSchema: indices_migrate_to_data_stream_response,
};
const INDICES_MODIFY_DATA_STREAM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.modify_data_stream',
  summary: `Update data streams`,
  description: `Update data streams.
Performs one or more data stream modification actions in a single atomic operation.`,
  methods: ['POST'],
  patterns: ['/_data_stream/_modify'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-modify-data-stream',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_modify_data_stream_request, 'body'),
    getLooseObjectFromProperty(indices_modify_data_stream_request, 'path'),
    getLooseObjectFromProperty(indices_modify_data_stream_request, 'query'),
  ]),
  outputSchema: indices_modify_data_stream_response,
};
const INDICES_OPEN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.open',
  summary: `Open a closed index`,
  description: `Open a closed index.
For data streams, the API opens any closed backing indices.

A closed index is blocked for read/write operations and does not allow all operations that opened indices allow.
It is not possible to index documents or to search for documents in a closed index.
This allows closed indices to not have to maintain internal data structures for indexing or searching documents, resulting in a smaller overhead on the cluster.

When opening or closing an index, the master is responsible for restarting the index shards to reflect the new state of the index.
The shards will then go through the normal recovery process.
The data of opened or closed indices is automatically replicated by the cluster to ensure that enough shard copies are safely kept around at all times.

You can open and close multiple indices.
An error is thrown if the request explicitly refers to a missing index.
This behavior can be turned off by using the \`ignore_unavailable=true\` parameter.

By default, you must explicitly name the indices you are opening or closing.
To open or close indices with \`_all\`, \`*\`, or other wildcard expressions, change the \`action.destructive_requires_name\` setting to \`false\`.
This setting can also be changed with the cluster update settings API.

Closed indices consume a significant amount of disk-space which can cause problems in managed environments.
Closing indices can be turned off with the cluster settings API by setting \`cluster.indices.close.enable\` to \`false\`.

Because opening or closing an index allocates its shards, the \`wait_for_active_shards\` setting on index creation applies to the \`_open\` and \`_close\` index actions as well.`,
  methods: ['POST'],
  patterns: ['/{index}/_open'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-open',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
      'master_timeout',
      'timeout',
      'wait_for_active_shards',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_open_request, 'body'),
    getLooseObjectFromProperty(indices_open_request, 'path'),
    getLooseObjectFromProperty(indices_open_request, 'query'),
  ]),
  outputSchema: indices_open_response,
};
const INDICES_PROMOTE_DATA_STREAM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.promote_data_stream',
  summary: `Promote a data stream`,
  description: `Promote a data stream.
Promote a data stream from a replicated data stream managed by cross-cluster replication (CCR) to a regular data stream.

With CCR auto following, a data stream from a remote cluster can be replicated to the local cluster.
These data streams can't be rolled over in the local cluster.
These replicated data streams roll over only if the upstream data stream rolls over.
In the event that the remote cluster is no longer available, the data stream in the local cluster can be promoted to a regular data stream, which allows these data streams to be rolled over in the local cluster.

NOTE: When promoting a data stream, ensure the local cluster has a data stream enabled index template that matches the data stream.
If this is missing, the data stream will not be able to roll over until a matching index template is created.
This will affect the lifecycle management of the data stream and interfere with the data stream size and retention.`,
  methods: ['POST'],
  patterns: ['/_data_stream/_promote/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-promote-data-stream',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_promote_data_stream_request, 'body'),
    getLooseObjectFromProperty(indices_promote_data_stream_request, 'path'),
    getLooseObjectFromProperty(indices_promote_data_stream_request, 'query'),
  ]),
  outputSchema: indices_promote_data_stream_response,
};
const INDICES_PUT_ALIAS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_alias',
  summary: `Create or update an alias`,
  description: `Create or update an alias.
Adds a data stream or index to an alias.`,
  methods: ['PUT', 'POST', 'PUT', 'POST'],
  patterns: ['/{index}/_alias/{name}', '/{index}/_aliases/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-alias',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_put_alias_request, 'body'),
    getLooseObjectFromProperty(indices_put_alias_request, 'path'),
    getLooseObjectFromProperty(indices_put_alias_request, 'query'),
    getLooseObjectFromProperty(indices_put_alias1_request, 'body'),
    getLooseObjectFromProperty(indices_put_alias1_request, 'path'),
    getLooseObjectFromProperty(indices_put_alias1_request, 'query'),
    getLooseObjectFromProperty(indices_put_alias2_request, 'body'),
    getLooseObjectFromProperty(indices_put_alias2_request, 'path'),
    getLooseObjectFromProperty(indices_put_alias2_request, 'query'),
    getLooseObjectFromProperty(indices_put_alias3_request, 'body'),
    getLooseObjectFromProperty(indices_put_alias3_request, 'path'),
    getLooseObjectFromProperty(indices_put_alias3_request, 'query'),
  ]),
  outputSchema: z.union([
    indices_put_alias_response,
    indices_put_alias1_response,
    indices_put_alias2_response,
    indices_put_alias3_response,
  ]),
};
const INDICES_PUT_DATA_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_data_lifecycle',
  summary: `Update data stream lifecycles`,
  description: `Update data stream lifecycles.
Update the data stream lifecycle of the specified data streams.`,
  methods: ['PUT'],
  patterns: ['/_data_stream/{name}/_lifecycle'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-data-lifecycle',
  parameterTypes: {
    pathParams: ['name', 'name', 'name'],
    urlParams: [
      'expand_wildcards',
      'include_defaults',
      'master_timeout',
      'expand_wildcards',
      'master_timeout',
      'timeout',
      'expand_wildcards',
      'master_timeout',
      'timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_put_data_lifecycle_request, 'body'),
    getLooseObjectFromProperty(indices_put_data_lifecycle_request, 'path'),
    getLooseObjectFromProperty(indices_put_data_lifecycle_request, 'query'),
  ]),
  outputSchema: indices_put_data_lifecycle_response,
};
const INDICES_PUT_DATA_STREAM_MAPPINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_data_stream_mappings',
  summary: `Update data stream mappings`,
  description: `Update data stream mappings.

This API can be used to override mappings on specific data streams. These overrides will take precedence over what
is specified in the template that the data stream matches. The mapping change is only applied to new write indices
that are created during rollover after this API is called. No indices are changed by this API.`,
  methods: ['PUT'],
  patterns: ['/_data_stream/{name}/_mappings'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-data-stream-mappings',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'dry_run', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_put_data_stream_mappings_request, 'body'),
    getLooseObjectFromProperty(indices_put_data_stream_mappings_request, 'path'),
    getLooseObjectFromProperty(indices_put_data_stream_mappings_request, 'query'),
  ]),
  outputSchema: indices_put_data_stream_mappings_response,
};
const INDICES_PUT_DATA_STREAM_OPTIONS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_data_stream_options',
  summary: `Update data stream options`,
  description: `Update data stream options.
Update the data stream options of the specified data streams.`,
  methods: ['PUT'],
  patterns: ['/_data_stream/{name}/_options'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-data-stream-options',
  parameterTypes: {
    pathParams: ['name', 'name', 'name'],
    urlParams: [
      'expand_wildcards',
      'master_timeout',
      'expand_wildcards',
      'master_timeout',
      'timeout',
      'expand_wildcards',
      'master_timeout',
      'timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_put_data_stream_options_request, 'body'),
    getLooseObjectFromProperty(indices_put_data_stream_options_request, 'path'),
    getLooseObjectFromProperty(indices_put_data_stream_options_request, 'query'),
  ]),
  outputSchema: indices_put_data_stream_options_response,
};
const INDICES_PUT_DATA_STREAM_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_data_stream_settings',
  summary: `Update data stream settings`,
  description: `Update data stream settings.

This API can be used to override settings on specific data streams. These overrides will take precedence over what
is specified in the template that the data stream matches. To prevent your data stream from getting into an invalid state,
only certain settings are allowed. If possible, the setting change is applied to all
backing indices. Otherwise, it will be applied when the data stream is next rolled over.`,
  methods: ['PUT'],
  patterns: ['/_data_stream/{name}/_settings'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-data-stream-settings',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'dry_run', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_put_data_stream_settings_request, 'body'),
    getLooseObjectFromProperty(indices_put_data_stream_settings_request, 'path'),
    getLooseObjectFromProperty(indices_put_data_stream_settings_request, 'query'),
  ]),
  outputSchema: indices_put_data_stream_settings_response,
};
const INDICES_PUT_INDEX_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_index_template',
  summary: `Create or update an index template`,
  description: `Create or update an index template.
Index templates define settings, mappings, and aliases that can be applied automatically to new indices.

Elasticsearch applies templates to new indices based on an wildcard pattern that matches the index name.
Index templates are applied during data stream or index creation.
For data streams, these settings and mappings are applied when the stream's backing indices are created.
Settings and mappings specified in a create index API request override any settings or mappings specified in an index template.
Changes to index templates do not affect existing indices, including the existing backing indices of a data stream.

You can use C-style \`/* *\\/\` block comments in index templates.
You can include comments anywhere in the request body, except before the opening curly bracket.

**Multiple matching templates**

If multiple index templates match the name of a new index or data stream, the template with the highest priority is used.

Multiple templates with overlapping index patterns at the same priority are not allowed and an error will be thrown when attempting to create a template matching an existing index template at identical priorities.

**Composing aliases, mappings, and settings**

When multiple component templates are specified in the \`composed_of\` field for an index template, they are merged in the order specified, meaning that later component templates override earlier component templates.
Any mappings, settings, or aliases from the parent index template are merged in next.
Finally, any configuration on the index request itself is merged.
Mapping definitions are merged recursively, which means that later mapping components can introduce new field mappings and update the mapping configuration.
If a field mapping is already contained in an earlier component, its definition will be completely overwritten by the later one.
This recursive merging strategy applies not only to field mappings, but also root options like \`dynamic_templates\` and \`meta\`.
If an earlier component contains a \`dynamic_templates\` block, then by default new \`dynamic_templates\` entries are appended onto the end.
If an entry already exists with the same key, then it is overwritten by the new definition.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_index_template/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-index-template',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'timeout', 'local', 'flat_settings', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_put_index_template_request, 'body'),
    getLooseObjectFromProperty(indices_put_index_template_request, 'path'),
    getLooseObjectFromProperty(indices_put_index_template_request, 'query'),
    getLooseObjectFromProperty(indices_put_index_template1_request, 'body'),
    getLooseObjectFromProperty(indices_put_index_template1_request, 'path'),
    getLooseObjectFromProperty(indices_put_index_template1_request, 'query'),
  ]),
  outputSchema: z.union([
    indices_put_index_template_response,
    indices_put_index_template1_response,
  ]),
};
const INDICES_PUT_MAPPING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_mapping',
  summary: `Update field mappings`,
  description: `Update field mappings.
Add new fields to an existing data stream or index.
You can use the update mapping API to:

- Add a new field to an existing index
- Update mappings for multiple indices in a single request
- Add new properties to an object field
- Enable multi-fields for an existing field
- Update supported mapping parameters
- Change a field's mapping using reindexing
- Rename a field using a field alias

Learn how to use the update mapping API with practical examples in the [Update mapping API examples](https://www.elastic.co/docs/manage-data/data-store/mapping/update-mappings-examples) guide.`,
  methods: ['PUT', 'POST'],
  patterns: ['/{index}/_mapping'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-mapping',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_put_mapping_request, 'body'),
    getLooseObjectFromProperty(indices_put_mapping_request, 'path'),
    getLooseObjectFromProperty(indices_put_mapping_request, 'query'),
    getLooseObjectFromProperty(indices_put_mapping1_request, 'body'),
    getLooseObjectFromProperty(indices_put_mapping1_request, 'path'),
    getLooseObjectFromProperty(indices_put_mapping1_request, 'query'),
  ]),
  outputSchema: z.union([indices_put_mapping_response, indices_put_mapping1_response]),
};
const INDICES_PUT_SAMPLE_CONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_sample_configuration',
  summary: ``,
  description: `Create or update sampling configuration.
Create or update the sampling configuration for the specified index.`,
  methods: ['PUT'],
  patterns: ['/{index}/_sample/config'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/ingest-random-sampling',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const INDICES_PUT_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_settings',
  summary: `Update index settings`,
  description: `Update index settings.
Changes dynamic index settings in real time.
For data streams, index setting changes are applied to all backing indices by default.

To revert a setting to the default value, use a null value.
The list of per-index settings that can be updated dynamically on live indices can be found in index settings documentation.
To preserve existing settings from being updated, set the \`preserve_existing\` parameter to \`true\`.

For performance optimization during bulk indexing, you can disable the refresh interval.
Refer to [disable refresh interval](https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/indexing-speed#disable-refresh-interval) for an example.
There are multiple valid ways to represent index settings in the request body. You can specify only the setting, for example:

\`\`\`
{
  "number_of_replicas": 1
}
\`\`\`

Or you can use an \`index\` setting object:
\`\`\`
{
  "index": {
    "number_of_replicas": 1
  }
}
\`\`\`

Or you can use dot annotation:
\`\`\`
{
  "index.number_of_replicas": 1
}
\`\`\`

Or you can embed any of the aforementioned options in a \`settings\` object. For example:

\`\`\`
{
  "settings": {
    "index": {
      "number_of_replicas": 1
    }
  }
}
\`\`\`

NOTE: You can only define new analyzers on closed indices.
To add an analyzer, you must close the index, define the analyzer, and reopen the index.
You cannot close the write index of a data stream.
To update the analyzer for a data stream's write index and future backing indices, update the analyzer in the index template used by the stream.
Then roll over the data stream to apply the new analyzer to the stream's write index and future backing indices.
This affects searches and any new data added to the stream after the rollover.
However, it does not affect the data stream's backing indices or their existing data.
To change the analyzer for existing backing indices, you must create a new data stream and reindex your data into it.
Refer to [updating analyzers on existing indices](https://www.elastic.co/docs/manage-data/data-store/text-analysis/specify-an-analyzer#update-analyzers-on-existing-indices) for step-by-step examples.`,
  methods: ['PUT', 'PUT'],
  patterns: ['/_settings', '/{index}/_settings'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-settings',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_put_settings_request, 'body'),
    getLooseObjectFromProperty(indices_put_settings_request, 'path'),
    getLooseObjectFromProperty(indices_put_settings_request, 'query'),
    getLooseObjectFromProperty(indices_put_settings1_request, 'body'),
    getLooseObjectFromProperty(indices_put_settings1_request, 'path'),
    getLooseObjectFromProperty(indices_put_settings1_request, 'query'),
  ]),
  outputSchema: z.union([indices_put_settings_response, indices_put_settings1_response]),
};
const INDICES_PUT_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_template',
  summary: `Create or update a legacy index template`,
  description: `Create or update a legacy index template.
Index templates define settings, mappings, and aliases that can be applied automatically to new indices.
Elasticsearch applies templates to new indices based on an index pattern that matches the index name.

IMPORTANT: This documentation is about legacy index templates, which are deprecated and will be replaced by the composable templates introduced in Elasticsearch 7.8.

Composable templates always take precedence over legacy templates.
If no composable template matches a new index, matching legacy templates are applied according to their order.

Index templates are only applied during index creation.
Changes to index templates do not affect existing indices.
Settings and mappings specified in create index API requests override any settings or mappings specified in an index template.

You can use C-style \`/* *\\/\` block comments in index templates.
You can include comments anywhere in the request body, except before the opening curly bracket.

**Indices matching multiple templates**

Multiple index templates can potentially match an index, in this case, both the settings and mappings are merged into the final configuration of the index.
The order of the merging can be controlled using the order parameter, with lower order being applied first, and higher orders overriding them.
NOTE: Multiple matching templates with the same order value will result in a non-deterministic merging order.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_template/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-template',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: ['master_timeout', 'timeout', 'flat_settings', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_put_template_request, 'body'),
    getLooseObjectFromProperty(indices_put_template_request, 'path'),
    getLooseObjectFromProperty(indices_put_template_request, 'query'),
    getLooseObjectFromProperty(indices_put_template1_request, 'body'),
    getLooseObjectFromProperty(indices_put_template1_request, 'path'),
    getLooseObjectFromProperty(indices_put_template1_request, 'query'),
  ]),
  outputSchema: z.union([indices_put_template_response, indices_put_template1_response]),
};
const INDICES_RECOVERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.recovery',
  summary: `Get index recovery information`,
  description: `Get index recovery information.
Get information about ongoing and completed shard recoveries for one or more indices.
For data streams, the API returns information for the stream's backing indices.

All recoveries, whether ongoing or complete, are kept in the cluster state and may be reported on at any time.

Shard recovery is the process of initializing a shard copy, such as restoring a primary shard from a snapshot or creating a replica shard from a primary shard.
When a shard recovery completes, the recovered shard is available for search and indexing.

Recovery automatically occurs during the following processes:

* When creating an index for the first time.
* When a node rejoins the cluster and starts up any missing primary shard copies using the data that it holds in its data path.
* Creation of new replica shard copies from the primary.
* Relocation of a shard copy to a different node in the same cluster.
* A snapshot restore operation.
* A clone, shrink, or split operation.

You can determine the cause of a shard recovery using the recovery or cat recovery APIs.

The index recovery API reports information about completed recoveries only for shard copies that currently exist in the cluster.
It only reports the last recovery for each shard copy and does not report historical information about earlier recoveries, nor does it report information about the recoveries of shard copies that no longer exist.
This means that if a shard copy completes a recovery and then Elasticsearch relocates it onto a different node then the information about the original recovery will not be shown in the recovery API.`,
  methods: ['GET', 'GET'],
  patterns: ['/_recovery', '/{index}/_recovery'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-recovery',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_recovery_request, 'body'),
    getLooseObjectFromProperty(indices_recovery_request, 'path'),
    getLooseObjectFromProperty(indices_recovery_request, 'query'),
    getLooseObjectFromProperty(indices_recovery1_request, 'body'),
    getLooseObjectFromProperty(indices_recovery1_request, 'path'),
    getLooseObjectFromProperty(indices_recovery1_request, 'query'),
  ]),
  outputSchema: z.union([indices_recovery_response, indices_recovery1_response]),
};
const INDICES_REFRESH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.refresh',
  summary: `Refresh an index`,
  description: `Refresh an index.
A refresh makes recent operations performed on one or more indices available for search.
For data streams, the API runs the refresh operation on the stream’s backing indices.

By default, Elasticsearch periodically refreshes indices every second, but only on indices that have received one search request or more in the last 30 seconds.
You can change this default interval with the \`index.refresh_interval\` setting.

In Elastic Cloud Serverless, the default refresh interval is 5 seconds across all indices.

Refresh requests are synchronous and do not return a response until the refresh operation completes.

Refreshes are resource-intensive.
To ensure good cluster performance, it's recommended to wait for Elasticsearch's periodic refresh rather than performing an explicit refresh when possible.

If your application workflow indexes documents and then runs a search to retrieve the indexed document, it's recommended to use the index API's \`refresh=wait_for\` query parameter option.
This option ensures the indexing operation waits for a periodic refresh before running the search.`,
  methods: ['POST', 'GET', 'POST', 'GET'],
  patterns: ['/_refresh', '/{index}/_refresh'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-refresh',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_refresh_request, 'body'),
    getLooseObjectFromProperty(indices_refresh_request, 'path'),
    getLooseObjectFromProperty(indices_refresh_request, 'query'),
    getLooseObjectFromProperty(indices_refresh1_request, 'body'),
    getLooseObjectFromProperty(indices_refresh1_request, 'path'),
    getLooseObjectFromProperty(indices_refresh1_request, 'query'),
    getLooseObjectFromProperty(indices_refresh2_request, 'body'),
    getLooseObjectFromProperty(indices_refresh2_request, 'path'),
    getLooseObjectFromProperty(indices_refresh2_request, 'query'),
    getLooseObjectFromProperty(indices_refresh3_request, 'body'),
    getLooseObjectFromProperty(indices_refresh3_request, 'path'),
    getLooseObjectFromProperty(indices_refresh3_request, 'query'),
  ]),
  outputSchema: z.union([
    indices_refresh_response,
    indices_refresh1_response,
    indices_refresh2_response,
    indices_refresh3_response,
  ]),
};
const INDICES_RELOAD_SEARCH_ANALYZERS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.reload_search_analyzers',
  summary: `Reload search analyzers`,
  description: `Reload search analyzers.
Reload an index's search analyzers and their resources.
For data streams, the API reloads search analyzers and resources for the stream's backing indices.

IMPORTANT: After reloading the search analyzers you should clear the request cache to make sure it doesn't contain responses derived from the previous versions of the analyzer.

You can use the reload search analyzers API to pick up changes to synonym files used in the \`synonym_graph\` or \`synonym\` token filter of a search analyzer.
To be eligible, the token filter must have an \`updateable\` flag of \`true\` and only be used in search analyzers.

NOTE: This API does not perform a reload for each shard of an index.
Instead, it performs a reload for each node containing index shards.
As a result, the total shard count returned by the API can differ from the number of index shards.
Because reloading affects every node with an index shard, it is important to update the synonym file on every data node in the cluster--including nodes that don't contain a shard replica--before using this API.
This ensures the synonym file is updated everywhere in the cluster in case shards are relocated in the future.`,
  methods: ['GET', 'POST'],
  patterns: ['/{index}/_reload_search_analyzers'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-reload-search-analyzers',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_reload_search_analyzers_request, 'body'),
    getLooseObjectFromProperty(indices_reload_search_analyzers_request, 'path'),
    getLooseObjectFromProperty(indices_reload_search_analyzers_request, 'query'),
    getLooseObjectFromProperty(indices_reload_search_analyzers1_request, 'body'),
    getLooseObjectFromProperty(indices_reload_search_analyzers1_request, 'path'),
    getLooseObjectFromProperty(indices_reload_search_analyzers1_request, 'query'),
  ]),
  outputSchema: z.union([
    indices_reload_search_analyzers_response,
    indices_reload_search_analyzers1_response,
  ]),
};
const INDICES_REMOVE_BLOCK_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.remove_block',
  summary: `Remove an index block`,
  description: `Remove an index block.

Remove an index block from an index.
Index blocks limit the operations allowed on an index by blocking specific operation types.`,
  methods: ['DELETE'],
  patterns: ['/{index}/_block/{block}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-remove-block',
  parameterTypes: {
    pathParams: ['index', 'block', 'index', 'block'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
      'master_timeout',
      'timeout',
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
      'master_timeout',
      'timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_remove_block_request, 'body'),
    getLooseObjectFromProperty(indices_remove_block_request, 'path'),
    getLooseObjectFromProperty(indices_remove_block_request, 'query'),
  ]),
  outputSchema: indices_remove_block_response,
};
const INDICES_RESOLVE_CLUSTER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.resolve_cluster',
  summary: `Resolve the cluster`,
  description: `Resolve the cluster.

Resolve the specified index expressions to return information about each cluster, including the local "querying" cluster, if included.
If no index expression is provided, the API will return information about all the remote clusters that are configured on the querying cluster.

This endpoint is useful before doing a cross-cluster search in order to determine which remote clusters should be included in a search.

You use the same index expression with this endpoint as you would for cross-cluster search.
Index and cluster exclusions are also supported with this endpoint.

For each cluster in the index expression, information is returned about:

* Whether the querying ("local") cluster is currently connected to each remote cluster specified in the index expression. Note that this endpoint actively attempts to contact the remote clusters, unlike the \`remote/info\` endpoint.
* Whether each remote cluster is configured with \`skip_unavailable\` as \`true\` or \`false\`.
* Whether there are any indices, aliases, or data streams on that cluster that match the index expression.
* Whether the search is likely to have errors returned when you do the cross-cluster search (including any authorization errors if you do not have permission to query the index).
* Cluster version information, including the Elasticsearch server version.

For example, \`GET /_resolve/cluster/my-index-*,cluster*:my-index-*\` returns information about the local cluster and all remotely configured clusters that start with the alias \`cluster*\`.
Each cluster returns information about whether it has any indices, aliases or data streams that match \`my-index-*\`.

## Note on backwards compatibility
The ability to query without an index expression was added in version 8.18, so when
querying remote clusters older than that, the local cluster will send the index
expression \`dummy*\` to those remote clusters. Thus, if an errors occur, you may see a reference
to that index expression even though you didn't request it. If it causes a problem, you can
instead include an index expression like \`*:*\` to bypass the issue.

## Advantages of using this endpoint before a cross-cluster search

You may want to exclude a cluster or index from a search when:

* A remote cluster is not currently connected and is configured with \`skip_unavailable=false\`. Running a cross-cluster search under those conditions will cause the entire search to fail.
* A cluster has no matching indices, aliases or data streams for the index expression (or your user does not have permissions to search them). For example, suppose your index expression is \`logs*,remote1:logs*\` and the remote1 cluster has no indices, aliases or data streams that match \`logs*\`. In that case, that cluster will return no results from that cluster if you include it in a cross-cluster search.
* The index expression (combined with any query parameters you specify) will likely cause an exception to be thrown when you do the search. In these cases, the "error" field in the \`_resolve/cluster\` response will be present. (This is also where security/permission errors will be shown.)
* A remote cluster is an older version that does not support the feature you want to use in your search.

## Test availability of remote clusters

The \`remote/info\` endpoint is commonly used to test whether the "local" cluster (the cluster being queried) is connected to its remote clusters, but it does not necessarily reflect whether the remote cluster is available or not.
The remote cluster may be available, while the local cluster is not currently connected to it.

You can use the \`_resolve/cluster\` API to attempt to reconnect to remote clusters.
For example with \`GET _resolve/cluster\` or \`GET _resolve/cluster/*:*\`.
The \`connected\` field in the response will indicate whether it was successful.
If a connection was (re-)established, this will also cause the \`remote/info\` endpoint to now indicate a connected status.`,
  methods: ['GET', 'GET'],
  patterns: ['/_resolve/cluster', '/_resolve/cluster/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-resolve-cluster',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_resolve_cluster_request, 'body'),
    getLooseObjectFromProperty(indices_resolve_cluster_request, 'path'),
    getLooseObjectFromProperty(indices_resolve_cluster_request, 'query'),
    getLooseObjectFromProperty(indices_resolve_cluster1_request, 'body'),
    getLooseObjectFromProperty(indices_resolve_cluster1_request, 'path'),
    getLooseObjectFromProperty(indices_resolve_cluster1_request, 'query'),
  ]),
  outputSchema: z.union([indices_resolve_cluster_response, indices_resolve_cluster1_response]),
};
const INDICES_RESOLVE_INDEX_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.resolve_index',
  summary: `Resolve indices`,
  description: `Resolve indices.
Resolve the names and/or index patterns for indices, aliases, and data streams.
Multiple patterns and remote clusters are supported.`,
  methods: ['GET'],
  patterns: ['/_resolve/index/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-resolve-index',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['expand_wildcards', 'ignore_unavailable', 'allow_no_indices', 'mode'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_resolve_index_request, 'body'),
    getLooseObjectFromProperty(indices_resolve_index_request, 'path'),
    getLooseObjectFromProperty(indices_resolve_index_request, 'query'),
  ]),
  outputSchema: indices_resolve_index_response,
};
const INDICES_ROLLOVER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.rollover',
  summary: `Roll over to a new index`,
  description: `Roll over to a new index.
TIP: We recommend using the index lifecycle rollover action to automate rollovers. However, Serverless does not support Index Lifecycle Management (ILM), so don't use this approach in the Serverless context.

The rollover API creates a new index for a data stream or index alias.
The API behavior depends on the rollover target.

**Roll over a data stream**

If you roll over a data stream, the API creates a new write index for the stream.
The stream's previous write index becomes a regular backing index.
A rollover also increments the data stream's generation.

**Roll over an index alias with a write index**

TIP: Prior to Elasticsearch 7.9, you'd typically use an index alias with a write index to manage time series data.
Data streams replace this functionality, require less maintenance, and automatically integrate with data tiers.

If an index alias points to multiple indices, one of the indices must be a write index.
The rollover API creates a new write index for the alias with \`is_write_index\` set to \`true\`.
The API also \`sets is_write_index\` to \`false\` for the previous write index.

**Roll over an index alias with one index**

If you roll over an index alias that points to only one index, the API creates a new index for the alias and removes the original index from the alias.

NOTE: A rollover creates a new index and is subject to the \`wait_for_active_shards\` setting.

**Increment index names for an alias**

When you roll over an index alias, you can specify a name for the new index.
If you don't specify a name and the current index ends with \`-\` and a number, such as \`my-index-000001\` or \`my-index-3\`, the new index name increments that number.
For example, if you roll over an alias with a current index of \`my-index-000001\`, the rollover creates a new index named \`my-index-000002\`.
This number is always six characters and zero-padded, regardless of the previous index's name.

If you use an index alias for time series data, you can use date math in the index name to track the rollover date.
For example, you can create an alias that points to an index named \`<my-index-{now/d}-000001>\`.
If you create the index on May 6, 2099, the index's name is \`my-index-2099.05.06-000001\`.
If you roll over the alias on May 7, 2099, the new index's name is \`my-index-2099.05.07-000002\`.`,
  methods: ['POST', 'POST'],
  patterns: ['/{alias}/_rollover', '/{alias}/_rollover/{new_index}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-rollover',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_rollover_request, 'body'),
    getLooseObjectFromProperty(indices_rollover_request, 'path'),
    getLooseObjectFromProperty(indices_rollover_request, 'query'),
    getLooseObjectFromProperty(indices_rollover1_request, 'body'),
    getLooseObjectFromProperty(indices_rollover1_request, 'path'),
    getLooseObjectFromProperty(indices_rollover1_request, 'query'),
  ]),
  outputSchema: z.union([indices_rollover_response, indices_rollover1_response]),
};
const INDICES_SEGMENTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.segments',
  summary: `Get index segments`,
  description: `Get index segments.
Get low-level information about the Lucene segments in index shards.
For data streams, the API returns information about the stream's backing indices.`,
  methods: ['GET', 'GET'],
  patterns: ['/_segments', '/{index}/_segments'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-segments',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_segments_request, 'body'),
    getLooseObjectFromProperty(indices_segments_request, 'path'),
    getLooseObjectFromProperty(indices_segments_request, 'query'),
    getLooseObjectFromProperty(indices_segments1_request, 'body'),
    getLooseObjectFromProperty(indices_segments1_request, 'path'),
    getLooseObjectFromProperty(indices_segments1_request, 'query'),
  ]),
  outputSchema: z.union([indices_segments_response, indices_segments1_response]),
};
const INDICES_SHARD_STORES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.shard_stores',
  summary: `Get index shard stores`,
  description: `Get index shard stores.
Get store information about replica shards in one or more indices.
For data streams, the API retrieves store information for the stream's backing indices.

The index shard stores API returns the following information:

* The node on which each replica shard exists.
* The allocation ID for each replica shard.
* A unique ID for each replica shard.
* Any errors encountered while opening the shard index or from an earlier failure.

By default, the API returns store information only for primary shards that are unassigned or have one or more unassigned replica shards.`,
  methods: ['GET', 'GET'],
  patterns: ['/_shard_stores', '/{index}/_shard_stores'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-shard-stores',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_shard_stores_request, 'body'),
    getLooseObjectFromProperty(indices_shard_stores_request, 'path'),
    getLooseObjectFromProperty(indices_shard_stores_request, 'query'),
    getLooseObjectFromProperty(indices_shard_stores1_request, 'body'),
    getLooseObjectFromProperty(indices_shard_stores1_request, 'path'),
    getLooseObjectFromProperty(indices_shard_stores1_request, 'query'),
  ]),
  outputSchema: z.union([indices_shard_stores_response, indices_shard_stores1_response]),
};
const INDICES_SHRINK_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.shrink',
  summary: `Shrink an index`,
  description: `Shrink an index.
Shrink an index into a new index with fewer primary shards.

Before you can shrink an index:

* The index must be read-only.
* A copy of every shard in the index must reside on the same node.
* The index must have a green health status.

To make shard allocation easier, we recommend you also remove the index's replica shards.
You can later re-add replica shards as part of the shrink operation.

The requested number of primary shards in the target index must be a factor of the number of shards in the source index.
For example an index with 8 primary shards can be shrunk into 4, 2 or 1 primary shards or an index with 15 primary shards can be shrunk into 5, 3 or 1.
If the number of shards in the index is a prime number it can only be shrunk into a single primary shard
 Before shrinking, a (primary or replica) copy of every shard in the index must be present on the same node.

The current write index on a data stream cannot be shrunk. In order to shrink the current write index, the data stream must first be rolled over so that a new write index is created and then the previous write index can be shrunk.

A shrink operation:

* Creates a new target index with the same definition as the source index, but with a smaller number of primary shards.
* Hard-links segments from the source index into the target index. If the file system does not support hard-linking, then all segments are copied into the new index, which is a much more time consuming process. Also if using multiple data paths, shards on different data paths require a full copy of segment files if they are not on the same disk since hardlinks do not work across disks.
* Recovers the target index as though it were a closed index which had just been re-opened. Recovers shards to the \`.routing.allocation.initial_recovery._id\` index setting.

IMPORTANT: Indices can only be shrunk if they satisfy the following requirements:

* The target index must not exist.
* The source index must have more primary shards than the target index.
* The number of primary shards in the target index must be a factor of the number of primary shards in the source index. The source index must have more primary shards than the target index.
* The index must not contain more than 2,147,483,519 documents in total across all shards that will be shrunk into a single shard on the target index as this is the maximum number of docs that can fit into a single shard.
* The node handling the shrink process must have sufficient free disk space to accommodate a second copy of the existing index.`,
  methods: ['PUT', 'POST'],
  patterns: ['/{index}/_shrink/{target}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-shrink',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_shrink_request, 'body'),
    getLooseObjectFromProperty(indices_shrink_request, 'path'),
    getLooseObjectFromProperty(indices_shrink_request, 'query'),
    getLooseObjectFromProperty(indices_shrink1_request, 'body'),
    getLooseObjectFromProperty(indices_shrink1_request, 'path'),
    getLooseObjectFromProperty(indices_shrink1_request, 'query'),
  ]),
  outputSchema: z.union([indices_shrink_response, indices_shrink1_response]),
};
const INDICES_SIMULATE_INDEX_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.simulate_index_template',
  summary: `Simulate an index`,
  description: `Simulate an index.
Get the index configuration that would be applied to the specified index from an existing index template.`,
  methods: ['POST'],
  patterns: ['/_index_template/_simulate_index/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-simulate-index-template',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['create', 'cause', 'master_timeout', 'include_defaults'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_simulate_index_template_request, 'body'),
    getLooseObjectFromProperty(indices_simulate_index_template_request, 'path'),
    getLooseObjectFromProperty(indices_simulate_index_template_request, 'query'),
  ]),
  outputSchema: indices_simulate_index_template_response,
};
const INDICES_SIMULATE_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.simulate_template',
  summary: `Simulate an index template`,
  description: `Simulate an index template.
Get the index configuration that would be applied by a particular index template.`,
  methods: ['POST', 'POST'],
  patterns: ['/_index_template/_simulate', '/_index_template/_simulate/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-simulate-template',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_simulate_template_request, 'body'),
    getLooseObjectFromProperty(indices_simulate_template_request, 'path'),
    getLooseObjectFromProperty(indices_simulate_template_request, 'query'),
    getLooseObjectFromProperty(indices_simulate_template1_request, 'body'),
    getLooseObjectFromProperty(indices_simulate_template1_request, 'path'),
    getLooseObjectFromProperty(indices_simulate_template1_request, 'query'),
  ]),
  outputSchema: z.union([indices_simulate_template_response, indices_simulate_template1_response]),
};
const INDICES_SPLIT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.split',
  summary: `Split an index`,
  description: `Split an index.
Split an index into a new index with more primary shards.
* Before you can split an index:

* The index must be read-only.
* The cluster health status must be green.

You can do make an index read-only with the following request using the add index block API:

\`\`\`
PUT /my_source_index/_block/write
\`\`\`

The current write index on a data stream cannot be split.
In order to split the current write index, the data stream must first be rolled over so that a new write index is created and then the previous write index can be split.

The number of times the index can be split (and the number of shards that each original shard can be split into) is determined by the \`index.number_of_routing_shards\` setting.
The number of routing shards specifies the hashing space that is used internally to distribute documents across shards with consistent hashing.
For instance, a 5 shard index with \`number_of_routing_shards\` set to 30 (5 x 2 x 3) could be split by a factor of 2 or 3.

A split operation:

* Creates a new target index with the same definition as the source index, but with a larger number of primary shards.
* Hard-links segments from the source index into the target index. If the file system doesn't support hard-linking, all segments are copied into the new index, which is a much more time consuming process.
* Hashes all documents again, after low level files are created, to delete documents that belong to a different shard.
* Recovers the target index as though it were a closed index which had just been re-opened.

IMPORTANT: Indices can only be split if they satisfy the following requirements:

* The target index must not exist.
* The source index must have fewer primary shards than the target index.
* The number of primary shards in the target index must be a multiple of the number of primary shards in the source index.
* The node handling the split process must have sufficient free disk space to accommodate a second copy of the existing index.`,
  methods: ['PUT', 'POST'],
  patterns: ['/{index}/_split/{target}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-split',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_split_request, 'body'),
    getLooseObjectFromProperty(indices_split_request, 'path'),
    getLooseObjectFromProperty(indices_split_request, 'query'),
    getLooseObjectFromProperty(indices_split1_request, 'body'),
    getLooseObjectFromProperty(indices_split1_request, 'path'),
    getLooseObjectFromProperty(indices_split1_request, 'query'),
  ]),
  outputSchema: z.union([indices_split_response, indices_split1_response]),
};
const INDICES_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.stats',
  summary: `Get index statistics`,
  description: `Get index statistics.
For data streams, the API retrieves statistics for the stream's backing indices.

By default, the returned statistics are index-level with \`primaries\` and \`total\` aggregations.
\`primaries\` are the values for only the primary shards.
\`total\` are the accumulated values for both primary and replica shards.

To get shard-level statistics, set the \`level\` parameter to \`shards\`.

NOTE: When moving to another node, the shard-level statistics for a shard are cleared.
Although the shard is no longer part of the node, that node retains any node-level statistics to which the shard contributed.`,
  methods: ['GET', 'GET', 'GET', 'GET'],
  patterns: ['/_stats', '/_stats/{metric}', '/{index}/_stats', '/{index}/_stats/{metric}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-stats',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_stats_request, 'body'),
    getLooseObjectFromProperty(indices_stats_request, 'path'),
    getLooseObjectFromProperty(indices_stats_request, 'query'),
    getLooseObjectFromProperty(indices_stats1_request, 'body'),
    getLooseObjectFromProperty(indices_stats1_request, 'path'),
    getLooseObjectFromProperty(indices_stats1_request, 'query'),
    getLooseObjectFromProperty(indices_stats2_request, 'body'),
    getLooseObjectFromProperty(indices_stats2_request, 'path'),
    getLooseObjectFromProperty(indices_stats2_request, 'query'),
    getLooseObjectFromProperty(indices_stats3_request, 'body'),
    getLooseObjectFromProperty(indices_stats3_request, 'path'),
    getLooseObjectFromProperty(indices_stats3_request, 'query'),
  ]),
  outputSchema: z.union([
    indices_stats_response,
    indices_stats1_response,
    indices_stats2_response,
    indices_stats3_response,
  ]),
};
const INDICES_UPDATE_ALIASES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.update_aliases',
  summary: `Create or update an alias`,
  description: `Create or update an alias.
Adds a data stream or index to an alias.`,
  methods: ['POST'],
  patterns: ['/_aliases'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-update-aliases',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_update_aliases_request, 'body'),
    getLooseObjectFromProperty(indices_update_aliases_request, 'path'),
    getLooseObjectFromProperty(indices_update_aliases_request, 'query'),
  ]),
  outputSchema: indices_update_aliases_response,
};
const INDICES_VALIDATE_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.validate_query',
  summary: `Validate a query`,
  description: `Validate a query.
Validates a query without running it.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_validate/query', '/{index}/_validate/query'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-validate-query',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(indices_validate_query_request, 'body'),
    getLooseObjectFromProperty(indices_validate_query_request, 'path'),
    getLooseObjectFromProperty(indices_validate_query_request, 'query'),
    getLooseObjectFromProperty(indices_validate_query1_request, 'body'),
    getLooseObjectFromProperty(indices_validate_query1_request, 'path'),
    getLooseObjectFromProperty(indices_validate_query1_request, 'query'),
    getLooseObjectFromProperty(indices_validate_query2_request, 'body'),
    getLooseObjectFromProperty(indices_validate_query2_request, 'path'),
    getLooseObjectFromProperty(indices_validate_query2_request, 'query'),
    getLooseObjectFromProperty(indices_validate_query3_request, 'body'),
    getLooseObjectFromProperty(indices_validate_query3_request, 'path'),
    getLooseObjectFromProperty(indices_validate_query3_request, 'query'),
  ]),
  outputSchema: z.union([
    indices_validate_query_response,
    indices_validate_query1_response,
    indices_validate_query2_response,
    indices_validate_query3_response,
  ]),
};
const INFERENCE_CHAT_COMPLETION_UNIFIED_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.chat_completion_unified',
  summary: `Perform chat completion inference on the service
`,
  description: `Perform chat completion inference on the service

The chat completion inference API enables real-time responses for chat completion tasks by delivering answers incrementally, reducing response times during computation.
It only works with the \`chat_completion\` task type for \`openai\` and \`elastic\` inference services.

NOTE: The \`chat_completion\` task type is only available within the _stream API and only supports streaming.
The Chat completion inference API and the Stream inference API differ in their response structure and capabilities.
The Chat completion inference API provides more comprehensive customization options through more fields and function calling support.
If you use the \`openai\`, \`hugging_face\` or the \`elastic\` service, use the Chat completion inference API.`,
  methods: ['POST'],
  patterns: ['/_inference/chat_completion/{inference_id}/_stream'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-unified-inference',
  parameterTypes: {
    pathParams: ['inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_chat_completion_unified_request, 'body'),
    getLooseObjectFromProperty(inference_chat_completion_unified_request, 'path'),
    getLooseObjectFromProperty(inference_chat_completion_unified_request, 'query'),
  ]),
  outputSchema: inference_chat_completion_unified_response,
};
const INFERENCE_COMPLETION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.completion',
  summary: `Perform completion inference on the service
`,
  description: `Perform completion inference on the service
Get responses for completion tasks.
This API works only with the completion task type.

IMPORTANT: The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Azure, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face. For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models. However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.

This API requires the \`monitor_inference\` cluster privilege (the built-in \`inference_admin\` and \`inference_user\` roles grant this privilege).`,
  methods: ['POST'],
  patterns: ['/_inference/completion/{inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-inference',
  parameterTypes: {
    pathParams: ['inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_completion_request, 'body'),
    getLooseObjectFromProperty(inference_completion_request, 'path'),
    getLooseObjectFromProperty(inference_completion_request, 'query'),
  ]),
  outputSchema: inference_completion_response,
};
const INFERENCE_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.delete',
  summary: `Delete an inference endpoint
`,
  description: `Delete an inference endpoint
This API requires the manage_inference cluster privilege (the built-in \`inference_admin\` role grants this privilege).`,
  methods: ['DELETE', 'DELETE'],
  patterns: ['/_inference/{inference_id}', '/_inference/{task_type}/{inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-delete',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_delete_request, 'body'),
    getLooseObjectFromProperty(inference_delete_request, 'path'),
    getLooseObjectFromProperty(inference_delete_request, 'query'),
    getLooseObjectFromProperty(inference_delete1_request, 'body'),
    getLooseObjectFromProperty(inference_delete1_request, 'path'),
    getLooseObjectFromProperty(inference_delete1_request, 'query'),
  ]),
  outputSchema: z.union([inference_delete_response, inference_delete1_response]),
};
const INFERENCE_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.get',
  summary: `Get an inference endpoint
`,
  description: `Get an inference endpoint
This API requires the \`monitor_inference\` cluster privilege (the built-in \`inference_admin\` and \`inference_user\` roles grant this privilege).`,
  methods: ['GET', 'GET', 'GET'],
  patterns: ['/_inference', '/_inference/{inference_id}', '/_inference/{task_type}/{inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-get',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_get_request, 'body'),
    getLooseObjectFromProperty(inference_get_request, 'path'),
    getLooseObjectFromProperty(inference_get_request, 'query'),
    getLooseObjectFromProperty(inference_get1_request, 'body'),
    getLooseObjectFromProperty(inference_get1_request, 'path'),
    getLooseObjectFromProperty(inference_get1_request, 'query'),
    getLooseObjectFromProperty(inference_get2_request, 'body'),
    getLooseObjectFromProperty(inference_get2_request, 'path'),
    getLooseObjectFromProperty(inference_get2_request, 'query'),
  ]),
  outputSchema: z.union([inference_get_response, inference_get1_response, inference_get2_response]),
};
const INFERENCE_INFERENCE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.inference',
  summary: `Perform inference on the service`,
  description: `Perform inference on the service.

This API enables you to use machine learning models to perform specific tasks on data that you provide as an input.
It returns a response with the results of the tasks.
The inference endpoint you use can perform one specific task that has been defined when the endpoint was created with the create inference API.

For details about using this API with a service, such as Amazon Bedrock, Anthropic, or HuggingFace, refer to the service-specific documentation.

> info
> The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Azure, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face. For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models. However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.`,
  methods: ['POST', 'POST'],
  patterns: ['/_inference/{inference_id}', '/_inference/{task_type}/{inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-inference',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_inference_request, 'body'),
    getLooseObjectFromProperty(inference_inference_request, 'path'),
    getLooseObjectFromProperty(inference_inference_request, 'query'),
    getLooseObjectFromProperty(inference_inference1_request, 'body'),
    getLooseObjectFromProperty(inference_inference1_request, 'path'),
    getLooseObjectFromProperty(inference_inference1_request, 'query'),
  ]),
  outputSchema: z.union([inference_inference_response, inference_inference1_response]),
};
const INFERENCE_PUT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put',
  summary: `Create an inference endpoint`,
  description: `Create an inference endpoint.

IMPORTANT: The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Mistral, Azure OpenAI, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face.
For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models.
However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.

The following integrations are available through the inference API. You can find the available task types next to the integration name:
* AI21 (\`chat_completion\`, \`completion\`)
* AlibabaCloud AI Search (\`completion\`, \`rerank\`, \`sparse_embedding\`, \`text_embedding\`)
* Amazon Bedrock (\`completion\`, \`text_embedding\`)
* Amazon SageMaker (\`chat_completion\`, \`completion\`, \`rerank\`, \`sparse_embedding\`, \`text_embedding\`)
* Anthropic (\`completion\`)
* Azure AI Studio (\`completion\`, 'rerank', \`text_embedding\`)
* Azure OpenAI (\`completion\`, \`text_embedding\`)
* Cohere (\`completion\`, \`rerank\`, \`text_embedding\`)
* DeepSeek (\`chat_completion\`, \`completion\`)
* Elasticsearch (\`rerank\`, \`sparse_embedding\`, \`text_embedding\` - this service is for built-in models and models uploaded through Eland)
* ELSER (\`sparse_embedding\`)
* Google AI Studio (\`completion\`, \`text_embedding\`)
* Google Vertex AI (\`chat_completion\`, \`completion\`, \`rerank\`, \`text_embedding\`)
* Hugging Face (\`chat_completion\`, \`completion\`, \`rerank\`, \`text_embedding\`)
* JinaAI (\`rerank\`, \`text_embedding\`)
* Llama (\`chat_completion\`, \`completion\`, \`text_embedding\`)
* Mistral (\`chat_completion\`, \`completion\`, \`text_embedding\`)
* OpenAI (\`chat_completion\`, \`completion\`, \`text_embedding\`)
* VoyageAI (\`rerank\`, \`text_embedding\`)
* Watsonx inference integration (\`text_embedding\`)`,
  methods: ['PUT', 'PUT'],
  patterns: ['/_inference/{inference_id}', '/_inference/{task_type}/{inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_request, 'body'),
    getLooseObjectFromProperty(inference_put_request, 'path'),
    getLooseObjectFromProperty(inference_put_request, 'query'),
    getLooseObjectFromProperty(inference_put1_request, 'body'),
    getLooseObjectFromProperty(inference_put1_request, 'path'),
    getLooseObjectFromProperty(inference_put1_request, 'query'),
  ]),
  outputSchema: z.union([inference_put_response, inference_put1_response]),
};
const INFERENCE_PUT_AI21_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_ai21',
  summary: `Create a AI21 inference endpoint`,
  description: `Create a AI21 inference endpoint.

Create an inference endpoint to perform an inference task with the \`ai21\` service.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{ai21_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-ai21',
  parameterTypes: {
    pathParams: ['task_type', 'ai21_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_ai21_request, 'body'),
    getLooseObjectFromProperty(inference_put_ai21_request, 'path'),
    getLooseObjectFromProperty(inference_put_ai21_request, 'query'),
  ]),
  outputSchema: inference_put_ai21_response,
};
const INFERENCE_PUT_ALIBABACLOUD_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_alibabacloud',
  summary: `Create an AlibabaCloud AI Search inference endpoint`,
  description: `Create an AlibabaCloud AI Search inference endpoint.

Create an inference endpoint to perform an inference task with the \`alibabacloud-ai-search\` service.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{alibabacloud_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-alibabacloud',
  parameterTypes: {
    pathParams: ['task_type', 'alibabacloud_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_alibabacloud_request, 'body'),
    getLooseObjectFromProperty(inference_put_alibabacloud_request, 'path'),
    getLooseObjectFromProperty(inference_put_alibabacloud_request, 'query'),
  ]),
  outputSchema: inference_put_alibabacloud_response,
};
const INFERENCE_PUT_AMAZONBEDROCK_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_amazonbedrock',
  summary: `Create an Amazon Bedrock inference endpoint`,
  description: `Create an Amazon Bedrock inference endpoint.

Create an inference endpoint to perform an inference task with the \`amazonbedrock\` service.

>info
> You need to provide the access and secret keys only once, during the inference model creation. The get inference API does not retrieve your access or secret keys. After creating the inference model, you cannot change the associated key pairs. If you want to use a different access and secret key pair, delete the inference model and recreate it with the same name and the updated keys.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{amazonbedrock_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-amazonbedrock',
  parameterTypes: {
    pathParams: ['task_type', 'amazonbedrock_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_amazonbedrock_request, 'body'),
    getLooseObjectFromProperty(inference_put_amazonbedrock_request, 'path'),
    getLooseObjectFromProperty(inference_put_amazonbedrock_request, 'query'),
  ]),
  outputSchema: inference_put_amazonbedrock_response,
};
const INFERENCE_PUT_AMAZONSAGEMAKER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_amazonsagemaker',
  summary: `Create an Amazon SageMaker inference endpoint`,
  description: `Create an Amazon SageMaker inference endpoint.

Create an inference endpoint to perform an inference task with the \`amazon_sagemaker\` service.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{amazonsagemaker_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-amazonsagemaker',
  parameterTypes: {
    pathParams: ['task_type', 'amazonsagemaker_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_amazonsagemaker_request, 'body'),
    getLooseObjectFromProperty(inference_put_amazonsagemaker_request, 'path'),
    getLooseObjectFromProperty(inference_put_amazonsagemaker_request, 'query'),
  ]),
  outputSchema: inference_put_amazonsagemaker_response,
};
const INFERENCE_PUT_ANTHROPIC_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_anthropic',
  summary: `Create an Anthropic inference endpoint`,
  description: `Create an Anthropic inference endpoint.

Create an inference endpoint to perform an inference task with the \`anthropic\` service.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{anthropic_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-anthropic',
  parameterTypes: {
    pathParams: ['task_type', 'anthropic_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_anthropic_request, 'body'),
    getLooseObjectFromProperty(inference_put_anthropic_request, 'path'),
    getLooseObjectFromProperty(inference_put_anthropic_request, 'query'),
  ]),
  outputSchema: inference_put_anthropic_response,
};
const INFERENCE_PUT_AZUREAISTUDIO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_azureaistudio',
  summary: `Create an Azure AI studio inference endpoint`,
  description: `Create an Azure AI studio inference endpoint.

Create an inference endpoint to perform an inference task with the \`azureaistudio\` service.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{azureaistudio_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-azureaistudio',
  parameterTypes: {
    pathParams: ['task_type', 'azureaistudio_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_azureaistudio_request, 'body'),
    getLooseObjectFromProperty(inference_put_azureaistudio_request, 'path'),
    getLooseObjectFromProperty(inference_put_azureaistudio_request, 'query'),
  ]),
  outputSchema: inference_put_azureaistudio_response,
};
const INFERENCE_PUT_AZUREOPENAI_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_azureopenai',
  summary: `Create an Azure OpenAI inference endpoint`,
  description: `Create an Azure OpenAI inference endpoint.

Create an inference endpoint to perform an inference task with the \`azureopenai\` service.

The list of chat completion models that you can choose from in your Azure OpenAI deployment include:

* [GPT-4 and GPT-4 Turbo models](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models?tabs=global-standard%2Cstandard-chat-completions#gpt-4-and-gpt-4-turbo-models)
* [GPT-3.5](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models?tabs=global-standard%2Cstandard-chat-completions#gpt-35)

The list of embeddings models that you can choose from in your deployment can be found in the [Azure models documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models?tabs=global-standard%2Cstandard-chat-completions#embeddings).`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{azureopenai_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-azureopenai',
  parameterTypes: {
    pathParams: ['task_type', 'azureopenai_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_azureopenai_request, 'body'),
    getLooseObjectFromProperty(inference_put_azureopenai_request, 'path'),
    getLooseObjectFromProperty(inference_put_azureopenai_request, 'query'),
  ]),
  outputSchema: inference_put_azureopenai_response,
};
const INFERENCE_PUT_COHERE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_cohere',
  summary: `Create a Cohere inference endpoint`,
  description: `Create a Cohere inference endpoint.

Create an inference endpoint to perform an inference task with the \`cohere\` service.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{cohere_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-cohere',
  parameterTypes: {
    pathParams: ['task_type', 'cohere_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_cohere_request, 'body'),
    getLooseObjectFromProperty(inference_put_cohere_request, 'path'),
    getLooseObjectFromProperty(inference_put_cohere_request, 'query'),
  ]),
  outputSchema: inference_put_cohere_response,
};
const INFERENCE_PUT_CONTEXTUALAI_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_contextualai',
  summary: `Create an Contextual AI inference endpoint`,
  description: `Create an Contextual AI inference endpoint.

Create an inference endpoint to perform an inference task with the \`contexualai\` service.

To review the available \`rerank\` models, refer to <https://docs.contextual.ai/api-reference/rerank/rerank#body-model>.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{contextualai_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-contextualai',
  parameterTypes: {
    pathParams: ['task_type', 'contextualai_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_contextualai_request, 'body'),
    getLooseObjectFromProperty(inference_put_contextualai_request, 'path'),
    getLooseObjectFromProperty(inference_put_contextualai_request, 'query'),
  ]),
  outputSchema: inference_put_contextualai_response,
};
const INFERENCE_PUT_CUSTOM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_custom',
  summary: `Create a custom inference endpoint`,
  description: `Create a custom inference endpoint.

The custom service gives more control over how to interact with external inference services that aren't explicitly supported through dedicated integrations.
The custom service gives you the ability to define the headers, url, query parameters, request body, and secrets.
The custom service supports the template replacement functionality, which enables you to define a template that can be replaced with the value associated with that key.
Templates are portions of a string that start with \`\${\` and end with \`}\`.
The parameters \`secret_parameters\` and \`task_settings\` are checked for keys for template replacement. Template replacement is supported in the \`request\`, \`headers\`, \`url\`, and \`query_parameters\`.
If the definition (key) is not found for a template, an error message is returned.
In case of an endpoint definition like the following:
\`\`\`
PUT _inference/text_embedding/test-text-embedding
{
  "service": "custom",
  "service_settings": {
     "secret_parameters": {
          "api_key": "<some api key>"
     },
     "url": "...endpoints.huggingface.cloud/v1/embeddings",
     "headers": {
         "Authorization": "Bearer \${api_key}",
         "Content-Type": "application/json"
     },
     "request": "{\\"input\\": \${input}}",
     "response": {
         "json_parser": {
             "text_embeddings":"\$.data[*].embedding[*]"
         }
     }
  }
}
\`\`\`
To replace \`\${api_key}\` the \`secret_parameters\` and \`task_settings\` are checked for a key named \`api_key\`.

> info
> Templates should not be surrounded by quotes.

Pre-defined templates:
* \`\${input}\` refers to the array of input strings that comes from the \`input\` field of the subsequent inference requests.
* \`\${input_type}\` refers to the input type translation values.
* \`\${query}\` refers to the query field used specifically for reranking tasks.
* \`\${top_n}\` refers to the \`top_n\` field available when performing rerank requests.
* \`\${return_documents}\` refers to the \`return_documents\` field available when performing rerank requests.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{custom_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-custom',
  parameterTypes: {
    pathParams: ['task_type', 'custom_inference_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_custom_request, 'body'),
    getLooseObjectFromProperty(inference_put_custom_request, 'path'),
    getLooseObjectFromProperty(inference_put_custom_request, 'query'),
  ]),
  outputSchema: inference_put_custom_response,
};
const INFERENCE_PUT_DEEPSEEK_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_deepseek',
  summary: `Create a DeepSeek inference endpoint`,
  description: `Create a DeepSeek inference endpoint.

Create an inference endpoint to perform an inference task with the \`deepseek\` service.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{deepseek_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-deepseek',
  parameterTypes: {
    pathParams: ['task_type', 'deepseek_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_deepseek_request, 'body'),
    getLooseObjectFromProperty(inference_put_deepseek_request, 'path'),
    getLooseObjectFromProperty(inference_put_deepseek_request, 'query'),
  ]),
  outputSchema: inference_put_deepseek_response,
};
const INFERENCE_PUT_ELASTICSEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_elasticsearch',
  summary: `Create an Elasticsearch inference endpoint`,
  description: `Create an Elasticsearch inference endpoint.

Create an inference endpoint to perform an inference task with the \`elasticsearch\` service.

> info
> Your Elasticsearch deployment contains preconfigured ELSER and E5 inference endpoints, you only need to create the enpoints using the API if you want to customize the settings.

If you use the ELSER or the E5 model through the \`elasticsearch\` service, the API request will automatically download and deploy the model if it isn't downloaded yet.

> info
> You might see a 502 bad gateway error in the response when using the Kibana Console. This error usually just reflects a timeout, while the model downloads in the background. You can check the download progress in the Machine Learning UI. If using the Python client, you can set the timeout parameter to a higher value.

After creating the endpoint, wait for the model deployment to complete before using it.
To verify the deployment status, use the get trained model statistics API.
Look for \`"state": "fully_allocated"\` in the response and ensure that the \`"allocation_count"\` matches the \`"target_allocation_count"\`.
Avoid creating multiple endpoints for the same model unless required, as each endpoint consumes significant resources.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{elasticsearch_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-elasticsearch',
  parameterTypes: {
    pathParams: ['task_type', 'elasticsearch_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_elasticsearch_request, 'body'),
    getLooseObjectFromProperty(inference_put_elasticsearch_request, 'path'),
    getLooseObjectFromProperty(inference_put_elasticsearch_request, 'query'),
  ]),
  outputSchema: inference_put_elasticsearch_response,
};
const INFERENCE_PUT_ELSER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_elser',
  summary: `Create an ELSER inference endpoint`,
  description: `Create an ELSER inference endpoint.

Create an inference endpoint to perform an inference task with the \`elser\` service.
You can also deploy ELSER by using the Elasticsearch inference integration.

> info
> Your Elasticsearch deployment contains a preconfigured ELSER inference endpoint, you only need to create the enpoint using the API if you want to customize the settings.

The API request will automatically download and deploy the ELSER model if it isn't already downloaded.

> info
> You might see a 502 bad gateway error in the response when using the Kibana Console. This error usually just reflects a timeout, while the model downloads in the background. You can check the download progress in the Machine Learning UI. If using the Python client, you can set the timeout parameter to a higher value.

After creating the endpoint, wait for the model deployment to complete before using it.
To verify the deployment status, use the get trained model statistics API.
Look for \`"state": "fully_allocated"\` in the response and ensure that the \`"allocation_count"\` matches the \`"target_allocation_count"\`.
Avoid creating multiple endpoints for the same model unless required, as each endpoint consumes significant resources.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{elser_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-elser',
  parameterTypes: {
    pathParams: ['task_type', 'elser_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_elser_request, 'body'),
    getLooseObjectFromProperty(inference_put_elser_request, 'path'),
    getLooseObjectFromProperty(inference_put_elser_request, 'query'),
  ]),
  outputSchema: inference_put_elser_response,
};
const INFERENCE_PUT_GOOGLEAISTUDIO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_googleaistudio',
  summary: `Create an Google AI Studio inference endpoint`,
  description: `Create an Google AI Studio inference endpoint.

Create an inference endpoint to perform an inference task with the \`googleaistudio\` service.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{googleaistudio_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-googleaistudio',
  parameterTypes: {
    pathParams: ['task_type', 'googleaistudio_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_googleaistudio_request, 'body'),
    getLooseObjectFromProperty(inference_put_googleaistudio_request, 'path'),
    getLooseObjectFromProperty(inference_put_googleaistudio_request, 'query'),
  ]),
  outputSchema: inference_put_googleaistudio_response,
};
const INFERENCE_PUT_GOOGLEVERTEXAI_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_googlevertexai',
  summary: `Create a Google Vertex AI inference endpoint`,
  description: `Create a Google Vertex AI inference endpoint.

Create an inference endpoint to perform an inference task with the \`googlevertexai\` service.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{googlevertexai_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-googlevertexai',
  parameterTypes: {
    pathParams: ['task_type', 'googlevertexai_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_googlevertexai_request, 'body'),
    getLooseObjectFromProperty(inference_put_googlevertexai_request, 'path'),
    getLooseObjectFromProperty(inference_put_googlevertexai_request, 'query'),
  ]),
  outputSchema: inference_put_googlevertexai_response,
};
const INFERENCE_PUT_HUGGING_FACE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_hugging_face',
  summary: `Create a Hugging Face inference endpoint`,
  description: `Create a Hugging Face inference endpoint.

Create an inference endpoint to perform an inference task with the \`hugging_face\` service.
Supported tasks include: \`text_embedding\`, \`completion\`, and \`chat_completion\`.

To configure the endpoint, first visit the Hugging Face Inference Endpoints page and create a new endpoint.
Select a model that supports the task you intend to use.

For Elastic's \`text_embedding\` task:
The selected model must support the \`Sentence Embeddings\` task. On the new endpoint creation page, select the \`Sentence Embeddings\` task under the \`Advanced Configuration\` section.
After the endpoint has initialized, copy the generated endpoint URL.
Recommended models for \`text_embedding\` task:

* \`all-MiniLM-L6-v2\`
* \`all-MiniLM-L12-v2\`
* \`all-mpnet-base-v2\`
* \`e5-base-v2\`
* \`e5-small-v2\`
* \`multilingual-e5-base\`
* \`multilingual-e5-small\`

For Elastic's \`chat_completion\` and \`completion\` tasks:
The selected model must support the \`Text Generation\` task and expose OpenAI API. HuggingFace supports both serverless and dedicated endpoints for \`Text Generation\`. When creating dedicated endpoint select the \`Text Generation\` task.
After the endpoint is initialized (for dedicated) or ready (for serverless), ensure it supports the OpenAI API and includes \`/v1/chat/completions\` part in URL. Then, copy the full endpoint URL for use.
Recommended models for \`chat_completion\` and \`completion\` tasks:

* \`Mistral-7B-Instruct-v0.2\`
* \`QwQ-32B\`
* \`Phi-3-mini-128k-instruct\`

For Elastic's \`rerank\` task:
The selected model must support the \`sentence-ranking\` task and expose OpenAI API.
HuggingFace supports only dedicated (not serverless) endpoints for \`Rerank\` so far.
After the endpoint is initialized, copy the full endpoint URL for use.
Tested models for \`rerank\` task:

* \`bge-reranker-base\`
* \`jina-reranker-v1-turbo-en-GGUF\``,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{huggingface_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-hugging-face',
  parameterTypes: {
    pathParams: ['task_type', 'huggingface_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_hugging_face_request, 'body'),
    getLooseObjectFromProperty(inference_put_hugging_face_request, 'path'),
    getLooseObjectFromProperty(inference_put_hugging_face_request, 'query'),
  ]),
  outputSchema: inference_put_hugging_face_response,
};
const INFERENCE_PUT_JINAAI_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_jinaai',
  summary: `Create an JinaAI inference endpoint`,
  description: `Create an JinaAI inference endpoint.

Create an inference endpoint to perform an inference task with the \`jinaai\` service.

To review the available \`rerank\` models, refer to <https://jina.ai/reranker>.
To review the available \`text_embedding\` models, refer to the <https://jina.ai/embeddings/>.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{jinaai_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-jinaai',
  parameterTypes: {
    pathParams: ['task_type', 'jinaai_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_jinaai_request, 'body'),
    getLooseObjectFromProperty(inference_put_jinaai_request, 'path'),
    getLooseObjectFromProperty(inference_put_jinaai_request, 'query'),
  ]),
  outputSchema: inference_put_jinaai_response,
};
const INFERENCE_PUT_LLAMA_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_llama',
  summary: `Create a Llama inference endpoint`,
  description: `Create a Llama inference endpoint.

Create an inference endpoint to perform an inference task with the \`llama\` service.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{llama_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-llama',
  parameterTypes: {
    pathParams: ['task_type', 'llama_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_llama_request, 'body'),
    getLooseObjectFromProperty(inference_put_llama_request, 'path'),
    getLooseObjectFromProperty(inference_put_llama_request, 'query'),
  ]),
  outputSchema: inference_put_llama_response,
};
const INFERENCE_PUT_MISTRAL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_mistral',
  summary: `Create a Mistral inference endpoint`,
  description: `Create a Mistral inference endpoint.

Create an inference endpoint to perform an inference task with the \`mistral\` service.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{mistral_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-mistral',
  parameterTypes: {
    pathParams: ['task_type', 'mistral_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_mistral_request, 'body'),
    getLooseObjectFromProperty(inference_put_mistral_request, 'path'),
    getLooseObjectFromProperty(inference_put_mistral_request, 'query'),
  ]),
  outputSchema: inference_put_mistral_response,
};
const INFERENCE_PUT_OPENAI_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_openai',
  summary: `Create an OpenAI inference endpoint`,
  description: `Create an OpenAI inference endpoint.

Create an inference endpoint to perform an inference task with the \`openai\` service or \`openai\` compatible APIs.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{openai_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-openai',
  parameterTypes: {
    pathParams: ['task_type', 'openai_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_openai_request, 'body'),
    getLooseObjectFromProperty(inference_put_openai_request, 'path'),
    getLooseObjectFromProperty(inference_put_openai_request, 'query'),
  ]),
  outputSchema: inference_put_openai_response,
};
const INFERENCE_PUT_VOYAGEAI_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_voyageai',
  summary: `Create a VoyageAI inference endpoint`,
  description: `Create a VoyageAI inference endpoint.

Create an inference endpoint to perform an inference task with the \`voyageai\` service.

Avoid creating multiple endpoints for the same model unless required, as each endpoint consumes significant resources.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{voyageai_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-voyageai',
  parameterTypes: {
    pathParams: ['task_type', 'voyageai_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_voyageai_request, 'body'),
    getLooseObjectFromProperty(inference_put_voyageai_request, 'path'),
    getLooseObjectFromProperty(inference_put_voyageai_request, 'query'),
  ]),
  outputSchema: inference_put_voyageai_response,
};
const INFERENCE_PUT_WATSONX_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_watsonx',
  summary: `Create a Watsonx inference endpoint`,
  description: `Create a Watsonx inference endpoint.

Create an inference endpoint to perform an inference task with the \`watsonxai\` service.
You need an IBM Cloud Databases for Elasticsearch deployment to use the \`watsonxai\` inference service.
You can provision one through the IBM catalog, the Cloud Databases CLI plug-in, the Cloud Databases API, or Terraform.`,
  methods: ['PUT'],
  patterns: ['/_inference/{task_type}/{watsonx_inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-watsonx',
  parameterTypes: {
    pathParams: ['task_type', 'watsonx_inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_put_watsonx_request, 'body'),
    getLooseObjectFromProperty(inference_put_watsonx_request, 'path'),
    getLooseObjectFromProperty(inference_put_watsonx_request, 'query'),
  ]),
  outputSchema: inference_put_watsonx_response,
};
const INFERENCE_RERANK_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.rerank',
  summary: `Perform reranking inference on the service`,
  description: `Perform reranking inference on the service`,
  methods: ['POST'],
  patterns: ['/_inference/rerank/{inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-inference',
  parameterTypes: {
    pathParams: ['inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_rerank_request, 'body'),
    getLooseObjectFromProperty(inference_rerank_request, 'path'),
    getLooseObjectFromProperty(inference_rerank_request, 'query'),
  ]),
  outputSchema: inference_rerank_response,
};
const INFERENCE_SPARSE_EMBEDDING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.sparse_embedding',
  summary: `Perform sparse embedding inference on the service`,
  description: `Perform sparse embedding inference on the service`,
  methods: ['POST'],
  patterns: ['/_inference/sparse_embedding/{inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-inference',
  parameterTypes: {
    pathParams: ['inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_sparse_embedding_request, 'body'),
    getLooseObjectFromProperty(inference_sparse_embedding_request, 'path'),
    getLooseObjectFromProperty(inference_sparse_embedding_request, 'query'),
  ]),
  outputSchema: inference_sparse_embedding_response,
};
const INFERENCE_STREAM_COMPLETION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.stream_completion',
  summary: `Perform streaming completion inference on the service
`,
  description: `Perform streaming completion inference on the service
Get real-time responses for completion tasks by delivering answers incrementally, reducing response times during computation.
This API works only with the completion task type.

IMPORTANT: The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Azure, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face. For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models. However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.

This API requires the \`monitor_inference\` cluster privilege (the built-in \`inference_admin\` and \`inference_user\` roles grant this privilege). You must use a client that supports streaming.`,
  methods: ['POST'],
  patterns: ['/_inference/completion/{inference_id}/_stream'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-stream-inference',
  parameterTypes: {
    pathParams: ['inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_stream_completion_request, 'body'),
    getLooseObjectFromProperty(inference_stream_completion_request, 'path'),
    getLooseObjectFromProperty(inference_stream_completion_request, 'query'),
  ]),
  outputSchema: inference_stream_completion_response,
};
const INFERENCE_TEXT_EMBEDDING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.text_embedding',
  summary: `Perform text embedding inference on the service`,
  description: `Perform text embedding inference on the service`,
  methods: ['POST'],
  patterns: ['/_inference/text_embedding/{inference_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-inference',
  parameterTypes: {
    pathParams: ['inference_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_text_embedding_request, 'body'),
    getLooseObjectFromProperty(inference_text_embedding_request, 'path'),
    getLooseObjectFromProperty(inference_text_embedding_request, 'query'),
  ]),
  outputSchema: inference_text_embedding_response,
};
const INFERENCE_UPDATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.update',
  summary: `Update an inference endpoint`,
  description: `Update an inference endpoint.

Modify \`task_settings\`, secrets (within \`service_settings\`), or \`num_allocations\` for an inference endpoint, depending on the specific endpoint service and \`task_type\`.

IMPORTANT: The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Azure, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face.
For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models.
However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.`,
  methods: ['PUT', 'PUT'],
  patterns: [
    '/_inference/{inference_id}/_update',
    '/_inference/{task_type}/{inference_id}/_update',
  ],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-update',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(inference_update_request, 'body'),
    getLooseObjectFromProperty(inference_update_request, 'path'),
    getLooseObjectFromProperty(inference_update_request, 'query'),
    getLooseObjectFromProperty(inference_update1_request, 'body'),
    getLooseObjectFromProperty(inference_update1_request, 'path'),
    getLooseObjectFromProperty(inference_update1_request, 'query'),
  ]),
  outputSchema: z.union([inference_update_response, inference_update1_response]),
};
const INFO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.info',
  summary: `Get cluster info`,
  description: `Get cluster info.
Get basic build, version, and cluster information.
::: In Serverless, this API is retained for backward compatibility only. Some response fields, such as the version number, should be ignored.`,
  methods: ['GET'],
  patterns: ['/'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-info',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(info_request, 'body'),
    getLooseObjectFromProperty(info_request, 'path'),
    getLooseObjectFromProperty(info_request, 'query'),
  ]),
  outputSchema: info_response,
};
const INGEST_DELETE_GEOIP_DATABASE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.delete_geoip_database',
  summary: `Delete GeoIP database configurations`,
  description: `Delete GeoIP database configurations.

Delete one or more IP geolocation database configurations.`,
  methods: ['DELETE'],
  patterns: ['/_ingest/geoip/database/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-delete-geoip-database',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ingest_delete_geoip_database_request, 'body'),
    getLooseObjectFromProperty(ingest_delete_geoip_database_request, 'path'),
    getLooseObjectFromProperty(ingest_delete_geoip_database_request, 'query'),
  ]),
  outputSchema: ingest_delete_geoip_database_response,
};
const INGEST_DELETE_IP_LOCATION_DATABASE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.delete_ip_location_database',
  summary: `Delete IP geolocation database configurations`,
  description: `Delete IP geolocation database configurations.`,
  methods: ['DELETE'],
  patterns: ['/_ingest/ip_location/database/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-delete-ip-location-database',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ingest_delete_ip_location_database_request, 'body'),
    getLooseObjectFromProperty(ingest_delete_ip_location_database_request, 'path'),
    getLooseObjectFromProperty(ingest_delete_ip_location_database_request, 'query'),
  ]),
  outputSchema: ingest_delete_ip_location_database_response,
};
const INGEST_DELETE_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.delete_pipeline',
  summary: `Delete pipelines`,
  description: `Delete pipelines.
Delete one or more ingest pipelines.`,
  methods: ['DELETE'],
  patterns: ['/_ingest/pipeline/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-delete-pipeline',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['master_timeout', 'timeout', 'if_version', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ingest_delete_pipeline_request, 'body'),
    getLooseObjectFromProperty(ingest_delete_pipeline_request, 'path'),
    getLooseObjectFromProperty(ingest_delete_pipeline_request, 'query'),
  ]),
  outputSchema: ingest_delete_pipeline_response,
};
const INGEST_GEO_IP_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.geo_ip_stats',
  summary: `Get GeoIP statistics`,
  description: `Get GeoIP statistics.
Get download statistics for GeoIP2 databases that are used with the GeoIP processor.`,
  methods: ['GET'],
  patterns: ['/_ingest/geoip/stats'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/reference/enrich-processor/geoip-processor',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ingest_geo_ip_stats_request, 'body'),
    getLooseObjectFromProperty(ingest_geo_ip_stats_request, 'path'),
    getLooseObjectFromProperty(ingest_geo_ip_stats_request, 'query'),
  ]),
  outputSchema: ingest_geo_ip_stats_response,
};
const INGEST_GET_GEOIP_DATABASE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.get_geoip_database',
  summary: `Get GeoIP database configurations`,
  description: `Get GeoIP database configurations.

Get information about one or more IP geolocation database configurations.`,
  methods: ['GET', 'GET'],
  patterns: ['/_ingest/geoip/database', '/_ingest/geoip/database/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-get-geoip-database',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ingest_get_geoip_database_request, 'body'),
    getLooseObjectFromProperty(ingest_get_geoip_database_request, 'path'),
    getLooseObjectFromProperty(ingest_get_geoip_database_request, 'query'),
    getLooseObjectFromProperty(ingest_get_geoip_database1_request, 'body'),
    getLooseObjectFromProperty(ingest_get_geoip_database1_request, 'path'),
    getLooseObjectFromProperty(ingest_get_geoip_database1_request, 'query'),
  ]),
  outputSchema: z.union([ingest_get_geoip_database_response, ingest_get_geoip_database1_response]),
};
const INGEST_GET_IP_LOCATION_DATABASE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.get_ip_location_database',
  summary: `Get IP geolocation database configurations`,
  description: `Get IP geolocation database configurations.`,
  methods: ['GET', 'GET'],
  patterns: ['/_ingest/ip_location/database', '/_ingest/ip_location/database/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-get-ip-location-database',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ingest_get_ip_location_database_request, 'body'),
    getLooseObjectFromProperty(ingest_get_ip_location_database_request, 'path'),
    getLooseObjectFromProperty(ingest_get_ip_location_database_request, 'query'),
    getLooseObjectFromProperty(ingest_get_ip_location_database1_request, 'body'),
    getLooseObjectFromProperty(ingest_get_ip_location_database1_request, 'path'),
    getLooseObjectFromProperty(ingest_get_ip_location_database1_request, 'query'),
  ]),
  outputSchema: z.union([
    ingest_get_ip_location_database_response,
    ingest_get_ip_location_database1_response,
  ]),
};
const INGEST_GET_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.get_pipeline',
  summary: `Get pipelines`,
  description: `Get pipelines.

Get information about one or more ingest pipelines.
This API returns a local reference of the pipeline.`,
  methods: ['GET', 'GET'],
  patterns: ['/_ingest/pipeline', '/_ingest/pipeline/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-get-pipeline',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['master_timeout', 'timeout', 'if_version', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ingest_get_pipeline_request, 'body'),
    getLooseObjectFromProperty(ingest_get_pipeline_request, 'path'),
    getLooseObjectFromProperty(ingest_get_pipeline_request, 'query'),
    getLooseObjectFromProperty(ingest_get_pipeline1_request, 'body'),
    getLooseObjectFromProperty(ingest_get_pipeline1_request, 'path'),
    getLooseObjectFromProperty(ingest_get_pipeline1_request, 'query'),
  ]),
  outputSchema: z.union([ingest_get_pipeline_response, ingest_get_pipeline1_response]),
};
const INGEST_PROCESSOR_GROK_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.processor_grok',
  summary: `Run a grok processor`,
  description: `Run a grok processor.
Extract structured fields out of a single text field within a document.
You must choose which field to extract matched fields from, as well as the grok pattern you expect will match.
A grok pattern is like a regular expression that supports aliased expressions that can be reused.`,
  methods: ['GET'],
  patterns: ['/_ingest/processor/grok'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/reference/enrich-processor/grok-processor',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ingest_processor_grok_request, 'body'),
    getLooseObjectFromProperty(ingest_processor_grok_request, 'path'),
    getLooseObjectFromProperty(ingest_processor_grok_request, 'query'),
  ]),
  outputSchema: ingest_processor_grok_response,
};
const INGEST_PUT_GEOIP_DATABASE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.put_geoip_database',
  summary: `Create or update a GeoIP database configuration`,
  description: `Create or update a GeoIP database configuration.

Refer to the create or update IP geolocation database configuration API.`,
  methods: ['PUT'],
  patterns: ['/_ingest/geoip/database/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-put-geoip-database',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ingest_put_geoip_database_request, 'body'),
    getLooseObjectFromProperty(ingest_put_geoip_database_request, 'path'),
    getLooseObjectFromProperty(ingest_put_geoip_database_request, 'query'),
  ]),
  outputSchema: ingest_put_geoip_database_response,
};
const INGEST_PUT_IP_LOCATION_DATABASE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.put_ip_location_database',
  summary: `Create or update an IP geolocation database configuration`,
  description: `Create or update an IP geolocation database configuration.`,
  methods: ['PUT'],
  patterns: ['/_ingest/ip_location/database/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-put-ip-location-database',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ingest_put_ip_location_database_request, 'body'),
    getLooseObjectFromProperty(ingest_put_ip_location_database_request, 'path'),
    getLooseObjectFromProperty(ingest_put_ip_location_database_request, 'query'),
  ]),
  outputSchema: ingest_put_ip_location_database_response,
};
const INGEST_PUT_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.put_pipeline',
  summary: `Create or update a pipeline`,
  description: `Create or update a pipeline.
Changes made using this API take effect immediately.`,
  methods: ['PUT'],
  patterns: ['/_ingest/pipeline/{id}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/manage-data/ingest/transform-enrich/ingest-pipelines',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['master_timeout', 'timeout', 'if_version', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ingest_put_pipeline_request, 'body'),
    getLooseObjectFromProperty(ingest_put_pipeline_request, 'path'),
    getLooseObjectFromProperty(ingest_put_pipeline_request, 'query'),
  ]),
  outputSchema: ingest_put_pipeline_response,
};
const INGEST_SIMULATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.simulate',
  summary: `Simulate a pipeline`,
  description: `Simulate a pipeline.

Run an ingest pipeline against a set of provided documents.
You can either specify an existing pipeline to use with the provided documents or supply a pipeline definition in the body of the request.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_ingest/pipeline/_simulate', '/_ingest/pipeline/{id}/_simulate'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-simulate',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ingest_simulate_request, 'body'),
    getLooseObjectFromProperty(ingest_simulate_request, 'path'),
    getLooseObjectFromProperty(ingest_simulate_request, 'query'),
    getLooseObjectFromProperty(ingest_simulate1_request, 'body'),
    getLooseObjectFromProperty(ingest_simulate1_request, 'path'),
    getLooseObjectFromProperty(ingest_simulate1_request, 'query'),
    getLooseObjectFromProperty(ingest_simulate2_request, 'body'),
    getLooseObjectFromProperty(ingest_simulate2_request, 'path'),
    getLooseObjectFromProperty(ingest_simulate2_request, 'query'),
    getLooseObjectFromProperty(ingest_simulate3_request, 'body'),
    getLooseObjectFromProperty(ingest_simulate3_request, 'path'),
    getLooseObjectFromProperty(ingest_simulate3_request, 'query'),
  ]),
  outputSchema: z.union([
    ingest_simulate_response,
    ingest_simulate1_response,
    ingest_simulate2_response,
    ingest_simulate3_response,
  ]),
};
const KNN_SEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.knn_search',
  summary: ``,
  description: `Performs a kNN search`,
  methods: ['GET', 'POST'],
  patterns: ['/{index}/_knn_search'],
  isInternal: false,
  documentation: 'null',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const LICENSE_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.license.delete',
  summary: `Delete the license`,
  description: `Delete the license.

When the license expires, your subscription level reverts to Basic.

If the operator privileges feature is enabled, only operator users can use this API.`,
  methods: ['DELETE'],
  patterns: ['/_license'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-delete',
  parameterTypes: {
    pathParams: [],
    urlParams: ['accept_enterprise', 'local', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(license_delete_request, 'body'),
    getLooseObjectFromProperty(license_delete_request, 'path'),
    getLooseObjectFromProperty(license_delete_request, 'query'),
  ]),
  outputSchema: license_delete_response,
};
const LICENSE_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.license.get',
  summary: `Get license information`,
  description: `Get license information.

Get information about your Elastic license including its type, its status, when it was issued, and when it expires.

>info
> If the master node is generating a new cluster state, the get license API may return a \`404 Not Found\` response.
> If you receive an unexpected 404 response after cluster startup, wait a short period and retry the request.`,
  methods: ['GET'],
  patterns: ['/_license'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-get',
  parameterTypes: {
    pathParams: [],
    urlParams: ['accept_enterprise', 'local', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(license_get_request, 'body'),
    getLooseObjectFromProperty(license_get_request, 'path'),
    getLooseObjectFromProperty(license_get_request, 'query'),
  ]),
  outputSchema: license_get_response,
};
const LICENSE_GET_BASIC_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.license.get_basic_status',
  summary: `Get the basic license status`,
  description: `Get the basic license status.`,
  methods: ['GET'],
  patterns: ['/_license/basic_status'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-get-basic-status',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(license_get_basic_status_request, 'body'),
    getLooseObjectFromProperty(license_get_basic_status_request, 'path'),
    getLooseObjectFromProperty(license_get_basic_status_request, 'query'),
  ]),
  outputSchema: license_get_basic_status_response,
};
const LICENSE_GET_TRIAL_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.license.get_trial_status',
  summary: `Get the trial status`,
  description: `Get the trial status.`,
  methods: ['GET'],
  patterns: ['/_license/trial_status'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-get-trial-status',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(license_get_trial_status_request, 'body'),
    getLooseObjectFromProperty(license_get_trial_status_request, 'path'),
    getLooseObjectFromProperty(license_get_trial_status_request, 'query'),
  ]),
  outputSchema: license_get_trial_status_response,
};
const LICENSE_POST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.license.post',
  summary: `Update the license`,
  description: `Update the license.

You can update your license at runtime without shutting down your nodes.
License updates take effect immediately.
If the license you are installing does not support all of the features that were available with your previous license, however, you are notified in the response.
You must then re-submit the API request with the acknowledge parameter set to true.

NOTE: If Elasticsearch security features are enabled and you are installing a gold or higher license, you must enable TLS on the transport networking layer before you install the license.
If the operator privileges feature is enabled, only operator users can use this API.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_license'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-post',
  parameterTypes: {
    pathParams: [],
    urlParams: ['accept_enterprise', 'local', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(license_post_request, 'body'),
    getLooseObjectFromProperty(license_post_request, 'path'),
    getLooseObjectFromProperty(license_post_request, 'query'),
    getLooseObjectFromProperty(license_post1_request, 'body'),
    getLooseObjectFromProperty(license_post1_request, 'path'),
    getLooseObjectFromProperty(license_post1_request, 'query'),
  ]),
  outputSchema: z.union([license_post_response, license_post1_response]),
};
const LICENSE_POST_START_BASIC_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.license.post_start_basic',
  summary: `Start a basic license`,
  description: `Start a basic license.

Start an indefinite basic license, which gives access to all the basic features.

NOTE: In order to start a basic license, you must not currently have a basic license.

If the basic license does not support all of the features that are available with your current license, however, you are notified in the response.
You must then re-submit the API request with the \`acknowledge\` parameter set to \`true\`.

To check the status of your basic license, use the get basic license API.`,
  methods: ['POST'],
  patterns: ['/_license/start_basic'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-post-start-basic',
  parameterTypes: {
    pathParams: [],
    urlParams: ['acknowledge', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(license_post_start_basic_request, 'body'),
    getLooseObjectFromProperty(license_post_start_basic_request, 'path'),
    getLooseObjectFromProperty(license_post_start_basic_request, 'query'),
  ]),
  outputSchema: license_post_start_basic_response,
};
const LICENSE_POST_START_TRIAL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.license.post_start_trial',
  summary: `Start a trial`,
  description: `Start a trial.
Start a 30-day trial, which gives access to all subscription features.

NOTE: You are allowed to start a trial only if your cluster has not already activated a trial for the current major product version.
For example, if you have already activated a trial for v8.0, you cannot start a new trial until v9.0. You can, however, request an extended trial at https://www.elastic.co/trialextension.

To check the status of your trial, use the get trial status API.`,
  methods: ['POST'],
  patterns: ['/_license/start_trial'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-post-start-trial',
  parameterTypes: {
    pathParams: [],
    urlParams: ['acknowledge', 'type', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(license_post_start_trial_request, 'body'),
    getLooseObjectFromProperty(license_post_start_trial_request, 'path'),
    getLooseObjectFromProperty(license_post_start_trial_request, 'query'),
  ]),
  outputSchema: license_post_start_trial_response,
};
const LOGSTASH_DELETE_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.logstash.delete_pipeline',
  summary: `Delete a Logstash pipeline`,
  description: `Delete a Logstash pipeline.
Delete a pipeline that is used for Logstash Central Management.
If the request succeeds, you receive an empty response with an appropriate status code.`,
  methods: ['DELETE'],
  patterns: ['/_logstash/pipeline/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-logstash-delete-pipeline',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(logstash_delete_pipeline_request, 'body'),
    getLooseObjectFromProperty(logstash_delete_pipeline_request, 'path'),
    getLooseObjectFromProperty(logstash_delete_pipeline_request, 'query'),
  ]),
  outputSchema: logstash_delete_pipeline_response,
};
const LOGSTASH_GET_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.logstash.get_pipeline',
  summary: `Get Logstash pipelines`,
  description: `Get Logstash pipelines.
Get pipelines that are used for Logstash Central Management.`,
  methods: ['GET', 'GET'],
  patterns: ['/_logstash/pipeline', '/_logstash/pipeline/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-logstash-get-pipeline',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(logstash_get_pipeline_request, 'body'),
    getLooseObjectFromProperty(logstash_get_pipeline_request, 'path'),
    getLooseObjectFromProperty(logstash_get_pipeline_request, 'query'),
    getLooseObjectFromProperty(logstash_get_pipeline1_request, 'body'),
    getLooseObjectFromProperty(logstash_get_pipeline1_request, 'path'),
    getLooseObjectFromProperty(logstash_get_pipeline1_request, 'query'),
  ]),
  outputSchema: z.union([logstash_get_pipeline_response, logstash_get_pipeline1_response]),
};
const LOGSTASH_PUT_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.logstash.put_pipeline',
  summary: `Create or update a Logstash pipeline`,
  description: `Create or update a Logstash pipeline.

Create a pipeline that is used for Logstash Central Management.
If the specified pipeline exists, it is replaced.`,
  methods: ['PUT'],
  patterns: ['/_logstash/pipeline/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-logstash-put-pipeline',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(logstash_put_pipeline_request, 'body'),
    getLooseObjectFromProperty(logstash_put_pipeline_request, 'path'),
    getLooseObjectFromProperty(logstash_put_pipeline_request, 'query'),
  ]),
  outputSchema: logstash_put_pipeline_response,
};
const MGET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.mget',
  summary: `Get multiple documents`,
  description: `Get multiple documents.

Get multiple JSON documents by ID from one or more indices.
If you specify an index in the request URI, you only need to specify the document IDs in the request body.
To ensure fast responses, this multi get (mget) API responds with partial results if one or more shards fail.

**Filter source fields**

By default, the \`_source\` field is returned for every document (if stored).
Use the \`_source\` and \`_source_include\` or \`source_exclude\` attributes to filter what fields are returned for a particular document.
You can include the \`_source\`, \`_source_includes\`, and \`_source_excludes\` query parameters in the request URI to specify the defaults to use when there are no per-document instructions.

**Get stored fields**

Use the \`stored_fields\` attribute to specify the set of stored fields you want to retrieve.
Any requested fields that are not stored are ignored.
You can include the \`stored_fields\` query parameter in the request URI to specify the defaults to use when there are no per-document instructions.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_mget', '/{index}/_mget'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-mget',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(mget_request, 'body'),
    getLooseObjectFromProperty(mget_request, 'path'),
    getLooseObjectFromProperty(mget_request, 'query'),
    getLooseObjectFromProperty(mget1_request, 'body'),
    getLooseObjectFromProperty(mget1_request, 'path'),
    getLooseObjectFromProperty(mget1_request, 'query'),
    getLooseObjectFromProperty(mget2_request, 'body'),
    getLooseObjectFromProperty(mget2_request, 'path'),
    getLooseObjectFromProperty(mget2_request, 'query'),
    getLooseObjectFromProperty(mget3_request, 'body'),
    getLooseObjectFromProperty(mget3_request, 'path'),
    getLooseObjectFromProperty(mget3_request, 'query'),
  ]),
  outputSchema: z.union([mget_response, mget1_response, mget2_response, mget3_response]),
};
const MIGRATION_DEPRECATIONS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.migration.deprecations',
  summary: `Get deprecation information`,
  description: `Get deprecation information.
Get information about different cluster, node, and index level settings that use deprecated features that will be removed or changed in the next major version.

TIP: This APIs is designed for indirect use by the Upgrade Assistant.
You are strongly recommended to use the Upgrade Assistant.`,
  methods: ['GET', 'GET'],
  patterns: ['/_migration/deprecations', '/{index}/_migration/deprecations'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-migration-deprecations',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(migration_deprecations_request, 'body'),
    getLooseObjectFromProperty(migration_deprecations_request, 'path'),
    getLooseObjectFromProperty(migration_deprecations_request, 'query'),
    getLooseObjectFromProperty(migration_deprecations1_request, 'body'),
    getLooseObjectFromProperty(migration_deprecations1_request, 'path'),
    getLooseObjectFromProperty(migration_deprecations1_request, 'query'),
  ]),
  outputSchema: z.union([migration_deprecations_response, migration_deprecations1_response]),
};
const MIGRATION_GET_FEATURE_UPGRADE_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.migration.get_feature_upgrade_status',
  summary: `Get feature migration information`,
  description: `Get feature migration information.
Version upgrades sometimes require changes to how features store configuration information and data in system indices.
Check which features need to be migrated and the status of any migrations that are in progress.

TIP: This API is designed for indirect use by the Upgrade Assistant.
You are strongly recommended to use the Upgrade Assistant.`,
  methods: ['GET'],
  patterns: ['/_migration/system_features'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-migration-get-feature-upgrade-status',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(migration_get_feature_upgrade_status_request, 'body'),
    getLooseObjectFromProperty(migration_get_feature_upgrade_status_request, 'path'),
    getLooseObjectFromProperty(migration_get_feature_upgrade_status_request, 'query'),
  ]),
  outputSchema: migration_get_feature_upgrade_status_response,
};
const MIGRATION_POST_FEATURE_UPGRADE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.migration.post_feature_upgrade',
  summary: `Start the feature migration`,
  description: `Start the feature migration.
Version upgrades sometimes require changes to how features store configuration information and data in system indices.
This API starts the automatic migration process.

Some functionality might be temporarily unavailable during the migration process.

TIP: The API is designed for indirect use by the Upgrade Assistant. We strongly recommend you use the Upgrade Assistant.`,
  methods: ['POST'],
  patterns: ['/_migration/system_features'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-migration-get-feature-upgrade-status',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(migration_post_feature_upgrade_request, 'body'),
    getLooseObjectFromProperty(migration_post_feature_upgrade_request, 'path'),
    getLooseObjectFromProperty(migration_post_feature_upgrade_request, 'query'),
  ]),
  outputSchema: migration_post_feature_upgrade_response,
};
const ML_CLEAR_TRAINED_MODEL_DEPLOYMENT_CACHE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.clear_trained_model_deployment_cache',
  summary: `Clear trained model deployment cache`,
  description: `Clear trained model deployment cache.

Cache will be cleared on all nodes where the trained model is assigned.
A trained model deployment may have an inference cache enabled.
As requests are handled by each allocated node, their responses may be cached on that individual node.
Calling this API clears the caches without restarting the deployment.`,
  methods: ['POST'],
  patterns: ['/_ml/trained_models/{model_id}/deployment/cache/_clear'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-clear-trained-model-deployment-cache',
  parameterTypes: {
    pathParams: ['model_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_clear_trained_model_deployment_cache_request, 'body'),
    getLooseObjectFromProperty(ml_clear_trained_model_deployment_cache_request, 'path'),
    getLooseObjectFromProperty(ml_clear_trained_model_deployment_cache_request, 'query'),
  ]),
  outputSchema: ml_clear_trained_model_deployment_cache_response,
};
const ML_CLOSE_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.close_job',
  summary: `Close anomaly detection jobs`,
  description: `Close anomaly detection jobs.

A job can be opened and closed multiple times throughout its lifecycle. A closed job cannot receive data or perform analysis operations, but you can still explore and navigate results.
When you close a job, it runs housekeeping tasks such as pruning the model history, flushing buffers, calculating final results and persisting the model snapshots. Depending upon the size of the job, it could take several minutes to close and the equivalent time to re-open. After it is closed, the job has a minimal overhead on the cluster except for maintaining its meta data. Therefore it is a best practice to close jobs that are no longer required to process data.
If you close an anomaly detection job whose datafeed is running, the request first tries to stop the datafeed. This behavior is equivalent to calling stop datafeed API with the same timeout and force parameters as the close job request.
When a datafeed that has a specified end date stops, it automatically closes its associated job.`,
  methods: ['POST'],
  patterns: ['/_ml/anomaly_detectors/{job_id}/_close'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-close-job',
  parameterTypes: {
    pathParams: ['job_id'],
    urlParams: ['allow_no_match', 'force', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_close_job_request, 'body'),
    getLooseObjectFromProperty(ml_close_job_request, 'path'),
    getLooseObjectFromProperty(ml_close_job_request, 'query'),
  ]),
  outputSchema: ml_close_job_response,
};
const ML_DELETE_CALENDAR_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_calendar',
  summary: `Delete a calendar`,
  description: `Delete a calendar.

Remove all scheduled events from a calendar, then delete it.`,
  methods: ['DELETE'],
  patterns: ['/_ml/calendars/{calendar_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-calendar',
  parameterTypes: {
    pathParams: ['calendar_id', 'calendar_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_delete_calendar_request, 'body'),
    getLooseObjectFromProperty(ml_delete_calendar_request, 'path'),
    getLooseObjectFromProperty(ml_delete_calendar_request, 'query'),
  ]),
  outputSchema: ml_delete_calendar_response,
};
const ML_DELETE_CALENDAR_EVENT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_calendar_event',
  summary: `Delete events from a calendar`,
  description: `Delete events from a calendar.`,
  methods: ['DELETE'],
  patterns: ['/_ml/calendars/{calendar_id}/events/{event_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-calendar-event',
  parameterTypes: {
    pathParams: ['calendar_id', 'event_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_delete_calendar_event_request, 'body'),
    getLooseObjectFromProperty(ml_delete_calendar_event_request, 'path'),
    getLooseObjectFromProperty(ml_delete_calendar_event_request, 'query'),
  ]),
  outputSchema: ml_delete_calendar_event_response,
};
const ML_DELETE_CALENDAR_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_calendar_job',
  summary: `Delete anomaly jobs from a calendar`,
  description: `Delete anomaly jobs from a calendar.`,
  methods: ['DELETE'],
  patterns: ['/_ml/calendars/{calendar_id}/jobs/{job_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-calendar-job',
  parameterTypes: {
    pathParams: ['calendar_id', 'job_id', 'calendar_id', 'job_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_delete_calendar_job_request, 'body'),
    getLooseObjectFromProperty(ml_delete_calendar_job_request, 'path'),
    getLooseObjectFromProperty(ml_delete_calendar_job_request, 'query'),
  ]),
  outputSchema: ml_delete_calendar_job_response,
};
const ML_DELETE_DATA_FRAME_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_data_frame_analytics',
  summary: `Delete a data frame analytics job`,
  description: `Delete a data frame analytics job.`,
  methods: ['DELETE'],
  patterns: ['/_ml/data_frame/analytics/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-data-frame-analytics',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['force', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_delete_data_frame_analytics_request, 'body'),
    getLooseObjectFromProperty(ml_delete_data_frame_analytics_request, 'path'),
    getLooseObjectFromProperty(ml_delete_data_frame_analytics_request, 'query'),
  ]),
  outputSchema: ml_delete_data_frame_analytics_response,
};
const ML_DELETE_DATAFEED_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_datafeed',
  summary: `Delete a datafeed`,
  description: `Delete a datafeed.`,
  methods: ['DELETE'],
  patterns: ['/_ml/datafeeds/{datafeed_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-datafeed',
  parameterTypes: {
    pathParams: ['datafeed_id', 'datafeed_id'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'ignore_throttled',
      'ignore_unavailable',
      'force',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_delete_datafeed_request, 'body'),
    getLooseObjectFromProperty(ml_delete_datafeed_request, 'path'),
    getLooseObjectFromProperty(ml_delete_datafeed_request, 'query'),
  ]),
  outputSchema: ml_delete_datafeed_response,
};
const ML_DELETE_EXPIRED_DATA_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_expired_data',
  summary: `Delete expired ML data`,
  description: `Delete expired ML data.

Delete all job results, model snapshots and forecast data that have exceeded
their retention days period. Machine learning state documents that are not
associated with any job are also deleted.
You can limit the request to a single or set of anomaly detection jobs by
using a job identifier, a group name, a comma-separated list of jobs, or a
wildcard expression. You can delete expired data for all anomaly detection
jobs by using \`_all\`, by specifying \`*\` as the \`<job_id>\`, or by omitting the
\`<job_id>\`.`,
  methods: ['DELETE', 'DELETE'],
  patterns: ['/_ml/_delete_expired_data/{job_id}', '/_ml/_delete_expired_data'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-expired-data',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_delete_expired_data_request, 'body'),
    getLooseObjectFromProperty(ml_delete_expired_data_request, 'path'),
    getLooseObjectFromProperty(ml_delete_expired_data_request, 'query'),
    getLooseObjectFromProperty(ml_delete_expired_data1_request, 'body'),
    getLooseObjectFromProperty(ml_delete_expired_data1_request, 'path'),
    getLooseObjectFromProperty(ml_delete_expired_data1_request, 'query'),
  ]),
  outputSchema: z.union([ml_delete_expired_data_response, ml_delete_expired_data1_response]),
};
const ML_DELETE_FILTER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_filter',
  summary: `Delete a filter`,
  description: `Delete a filter.

If an anomaly detection job references the filter, you cannot delete the
filter. You must update or delete the job before you can delete the filter.`,
  methods: ['DELETE'],
  patterns: ['/_ml/filters/{filter_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-filter',
  parameterTypes: {
    pathParams: ['filter_id', 'filter_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_delete_filter_request, 'body'),
    getLooseObjectFromProperty(ml_delete_filter_request, 'path'),
    getLooseObjectFromProperty(ml_delete_filter_request, 'query'),
  ]),
  outputSchema: ml_delete_filter_response,
};
const ML_DELETE_FORECAST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_forecast',
  summary: `Delete forecasts from a job`,
  description: `Delete forecasts from a job.

By default, forecasts are retained for 14 days. You can specify a
different retention period with the \`expires_in\` parameter in the forecast
jobs API. The delete forecast API enables you to delete one or more
forecasts before they expire.`,
  methods: ['DELETE', 'DELETE'],
  patterns: [
    '/_ml/anomaly_detectors/{job_id}/_forecast',
    '/_ml/anomaly_detectors/{job_id}/_forecast/{forecast_id}',
  ],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-forecast',
  parameterTypes: {
    pathParams: ['job_id'],
    urlParams: ['duration', 'expires_in', 'max_model_memory'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_delete_forecast_request, 'body'),
    getLooseObjectFromProperty(ml_delete_forecast_request, 'path'),
    getLooseObjectFromProperty(ml_delete_forecast_request, 'query'),
    getLooseObjectFromProperty(ml_delete_forecast1_request, 'body'),
    getLooseObjectFromProperty(ml_delete_forecast1_request, 'path'),
    getLooseObjectFromProperty(ml_delete_forecast1_request, 'query'),
  ]),
  outputSchema: z.union([ml_delete_forecast_response, ml_delete_forecast1_response]),
};
const ML_DELETE_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_job',
  summary: `Delete an anomaly detection job`,
  description: `Delete an anomaly detection job.

All job configuration, model state and results are deleted.
It is not currently possible to delete multiple jobs using wildcards or a
comma separated list. If you delete a job that has a datafeed, the request
first tries to delete the datafeed. This behavior is equivalent to calling
the delete datafeed API with the same timeout and force parameters as the
delete job request.`,
  methods: ['DELETE'],
  patterns: ['/_ml/anomaly_detectors/{job_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-job',
  parameterTypes: {
    pathParams: ['job_id', 'job_id'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'ignore_throttled',
      'ignore_unavailable',
      'force',
      'delete_user_annotations',
      'wait_for_completion',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_delete_job_request, 'body'),
    getLooseObjectFromProperty(ml_delete_job_request, 'path'),
    getLooseObjectFromProperty(ml_delete_job_request, 'query'),
  ]),
  outputSchema: ml_delete_job_response,
};
const ML_DELETE_MODEL_SNAPSHOT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_model_snapshot',
  summary: `Delete a model snapshot`,
  description: `Delete a model snapshot.

You cannot delete the active model snapshot. To delete that snapshot, first
revert to a different one. To identify the active model snapshot, refer to
the \`model_snapshot_id\` in the results from the get jobs API.`,
  methods: ['DELETE'],
  patterns: ['/_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-model-snapshot',
  parameterTypes: {
    pathParams: ['job_id', 'snapshot_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_delete_model_snapshot_request, 'body'),
    getLooseObjectFromProperty(ml_delete_model_snapshot_request, 'path'),
    getLooseObjectFromProperty(ml_delete_model_snapshot_request, 'query'),
  ]),
  outputSchema: ml_delete_model_snapshot_response,
};
const ML_DELETE_TRAINED_MODEL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_trained_model',
  summary: `Delete an unreferenced trained model`,
  description: `Delete an unreferenced trained model.

The request deletes a trained inference model that is not referenced by an ingest pipeline.`,
  methods: ['DELETE'],
  patterns: ['/_ml/trained_models/{model_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-trained-model',
  parameterTypes: {
    pathParams: ['model_id', 'model_id'],
    urlParams: ['defer_definition_decompression', 'wait_for_completion', 'force', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_delete_trained_model_request, 'body'),
    getLooseObjectFromProperty(ml_delete_trained_model_request, 'path'),
    getLooseObjectFromProperty(ml_delete_trained_model_request, 'query'),
  ]),
  outputSchema: ml_delete_trained_model_response,
};
const ML_DELETE_TRAINED_MODEL_ALIAS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_trained_model_alias',
  summary: `Delete a trained model alias`,
  description: `Delete a trained model alias.

This API deletes an existing model alias that refers to a trained model. If
the model alias is missing or refers to a model other than the one identified
by the \`model_id\`, this API returns an error.`,
  methods: ['DELETE'],
  patterns: ['/_ml/trained_models/{model_id}/model_aliases/{model_alias}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-trained-model-alias',
  parameterTypes: {
    pathParams: ['model_id', 'model_alias', 'model_id', 'model_alias'],
    urlParams: ['reassign'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_delete_trained_model_alias_request, 'body'),
    getLooseObjectFromProperty(ml_delete_trained_model_alias_request, 'path'),
    getLooseObjectFromProperty(ml_delete_trained_model_alias_request, 'query'),
  ]),
  outputSchema: ml_delete_trained_model_alias_response,
};
const ML_ESTIMATE_MODEL_MEMORY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.estimate_model_memory',
  summary: `Estimate job model memory usage`,
  description: `Estimate job model memory usage.

Make an estimation of the memory usage for an anomaly detection job model.
The estimate is based on analysis configuration details for the job and cardinality
estimates for the fields it references.`,
  methods: ['POST'],
  patterns: ['/_ml/anomaly_detectors/_estimate_model_memory'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-estimate-model-memory',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_estimate_model_memory_request, 'body'),
    getLooseObjectFromProperty(ml_estimate_model_memory_request, 'path'),
    getLooseObjectFromProperty(ml_estimate_model_memory_request, 'query'),
  ]),
  outputSchema: ml_estimate_model_memory_response,
};
const ML_EVALUATE_DATA_FRAME_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.evaluate_data_frame',
  summary: `Evaluate data frame analytics`,
  description: `Evaluate data frame analytics.

The API packages together commonly used evaluation metrics for various types
of machine learning features. This has been designed for use on indexes
created by data frame analytics. Evaluation requires both a ground truth
field and an analytics result field to be present.`,
  methods: ['POST'],
  patterns: ['/_ml/data_frame/_evaluate'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-evaluate-data-frame',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_evaluate_data_frame_request, 'body'),
    getLooseObjectFromProperty(ml_evaluate_data_frame_request, 'path'),
    getLooseObjectFromProperty(ml_evaluate_data_frame_request, 'query'),
  ]),
  outputSchema: ml_evaluate_data_frame_response,
};
const ML_EXPLAIN_DATA_FRAME_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.explain_data_frame_analytics',
  summary: `Explain data frame analytics config`,
  description: `Explain data frame analytics config.

This API provides explanations for a data frame analytics config that either
exists already or one that has not been created yet. The following
explanations are provided:
* which fields are included or not in the analysis and why,
* how much memory is estimated to be required. The estimate can be used when deciding the appropriate value for model_memory_limit setting later on.
If you have object fields or fields that are excluded via source filtering, they are not included in the explanation.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_ml/data_frame/analytics/_explain', '/_ml/data_frame/analytics/{id}/_explain'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-explain-data-frame-analytics',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_explain_data_frame_analytics_request, 'body'),
    getLooseObjectFromProperty(ml_explain_data_frame_analytics_request, 'path'),
    getLooseObjectFromProperty(ml_explain_data_frame_analytics_request, 'query'),
    getLooseObjectFromProperty(ml_explain_data_frame_analytics1_request, 'body'),
    getLooseObjectFromProperty(ml_explain_data_frame_analytics1_request, 'path'),
    getLooseObjectFromProperty(ml_explain_data_frame_analytics1_request, 'query'),
    getLooseObjectFromProperty(ml_explain_data_frame_analytics2_request, 'body'),
    getLooseObjectFromProperty(ml_explain_data_frame_analytics2_request, 'path'),
    getLooseObjectFromProperty(ml_explain_data_frame_analytics2_request, 'query'),
    getLooseObjectFromProperty(ml_explain_data_frame_analytics3_request, 'body'),
    getLooseObjectFromProperty(ml_explain_data_frame_analytics3_request, 'path'),
    getLooseObjectFromProperty(ml_explain_data_frame_analytics3_request, 'query'),
  ]),
  outputSchema: z.union([
    ml_explain_data_frame_analytics_response,
    ml_explain_data_frame_analytics1_response,
    ml_explain_data_frame_analytics2_response,
    ml_explain_data_frame_analytics3_response,
  ]),
};
const ML_FLUSH_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.flush_job',
  summary: `Force buffered data to be processed`,
  description: `Force buffered data to be processed.
The flush jobs API is only applicable when sending data for analysis using
the post data API. Depending on the content of the buffer, then it might
additionally calculate new results. Both flush and close operations are
similar, however the flush is more efficient if you are expecting to send
more data for analysis. When flushing, the job remains open and is available
to continue analyzing data. A close operation additionally prunes and
persists the model state to disk and the job must be opened again before
analyzing further data.`,
  methods: ['POST'],
  patterns: ['/_ml/anomaly_detectors/{job_id}/_flush'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-flush-job',
  parameterTypes: {
    pathParams: ['job_id'],
    urlParams: ['advance_time', 'calc_interim', 'end', 'skip_time', 'start'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_flush_job_request, 'body'),
    getLooseObjectFromProperty(ml_flush_job_request, 'path'),
    getLooseObjectFromProperty(ml_flush_job_request, 'query'),
  ]),
  outputSchema: ml_flush_job_response,
};
const ML_FORECAST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.forecast',
  summary: `Predict future behavior of a time series`,
  description: `Predict future behavior of a time series.

Forecasts are not supported for jobs that perform population analysis; an
error occurs if you try to create a forecast for a job that has an
\`over_field_name\` in its configuration. Forcasts predict future behavior
based on historical data.`,
  methods: ['POST'],
  patterns: ['/_ml/anomaly_detectors/{job_id}/_forecast'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-forecast',
  parameterTypes: {
    pathParams: ['job_id'],
    urlParams: ['duration', 'expires_in', 'max_model_memory'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_forecast_request, 'body'),
    getLooseObjectFromProperty(ml_forecast_request, 'path'),
    getLooseObjectFromProperty(ml_forecast_request, 'query'),
  ]),
  outputSchema: ml_forecast_response,
};
const ML_GET_BUCKETS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_buckets',
  summary: `Get anomaly detection job results for buckets`,
  description: `Get anomaly detection job results for buckets.
The API presents a chronological view of the records, grouped by bucket.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: [
    '/_ml/anomaly_detectors/{job_id}/results/buckets/{timestamp}',
    '/_ml/anomaly_detectors/{job_id}/results/buckets',
  ],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-buckets',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_buckets_request, 'body'),
    getLooseObjectFromProperty(ml_get_buckets_request, 'path'),
    getLooseObjectFromProperty(ml_get_buckets_request, 'query'),
    getLooseObjectFromProperty(ml_get_buckets1_request, 'body'),
    getLooseObjectFromProperty(ml_get_buckets1_request, 'path'),
    getLooseObjectFromProperty(ml_get_buckets1_request, 'query'),
    getLooseObjectFromProperty(ml_get_buckets2_request, 'body'),
    getLooseObjectFromProperty(ml_get_buckets2_request, 'path'),
    getLooseObjectFromProperty(ml_get_buckets2_request, 'query'),
    getLooseObjectFromProperty(ml_get_buckets3_request, 'body'),
    getLooseObjectFromProperty(ml_get_buckets3_request, 'path'),
    getLooseObjectFromProperty(ml_get_buckets3_request, 'query'),
  ]),
  outputSchema: z.union([
    ml_get_buckets_response,
    ml_get_buckets1_response,
    ml_get_buckets2_response,
    ml_get_buckets3_response,
  ]),
};
const ML_GET_CALENDAR_EVENTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_calendar_events',
  summary: `Get info about events in calendars`,
  description: `Get info about events in calendars.`,
  methods: ['GET'],
  patterns: ['/_ml/calendars/{calendar_id}/events'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-calendar-events',
  parameterTypes: {
    pathParams: ['calendar_id', 'calendar_id'],
    urlParams: ['end', 'from', 'job_id', 'size', 'start'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_calendar_events_request, 'body'),
    getLooseObjectFromProperty(ml_get_calendar_events_request, 'path'),
    getLooseObjectFromProperty(ml_get_calendar_events_request, 'query'),
  ]),
  outputSchema: ml_get_calendar_events_response,
};
const ML_GET_CALENDARS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_calendars',
  summary: `Get calendar configuration info`,
  description: `Get calendar configuration info.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_ml/calendars', '/_ml/calendars/{calendar_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-calendars',
  parameterTypes: {
    pathParams: ['calendar_id', 'calendar_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_calendars_request, 'body'),
    getLooseObjectFromProperty(ml_get_calendars_request, 'path'),
    getLooseObjectFromProperty(ml_get_calendars_request, 'query'),
    getLooseObjectFromProperty(ml_get_calendars1_request, 'body'),
    getLooseObjectFromProperty(ml_get_calendars1_request, 'path'),
    getLooseObjectFromProperty(ml_get_calendars1_request, 'query'),
    getLooseObjectFromProperty(ml_get_calendars2_request, 'body'),
    getLooseObjectFromProperty(ml_get_calendars2_request, 'path'),
    getLooseObjectFromProperty(ml_get_calendars2_request, 'query'),
    getLooseObjectFromProperty(ml_get_calendars3_request, 'body'),
    getLooseObjectFromProperty(ml_get_calendars3_request, 'path'),
    getLooseObjectFromProperty(ml_get_calendars3_request, 'query'),
  ]),
  outputSchema: z.union([
    ml_get_calendars_response,
    ml_get_calendars1_response,
    ml_get_calendars2_response,
    ml_get_calendars3_response,
  ]),
};
const ML_GET_CATEGORIES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_categories',
  summary: `Get anomaly detection job results for categories`,
  description: `Get anomaly detection job results for categories.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: [
    '/_ml/anomaly_detectors/{job_id}/results/categories/{category_id}',
    '/_ml/anomaly_detectors/{job_id}/results/categories',
  ],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-categories',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_categories_request, 'body'),
    getLooseObjectFromProperty(ml_get_categories_request, 'path'),
    getLooseObjectFromProperty(ml_get_categories_request, 'query'),
    getLooseObjectFromProperty(ml_get_categories1_request, 'body'),
    getLooseObjectFromProperty(ml_get_categories1_request, 'path'),
    getLooseObjectFromProperty(ml_get_categories1_request, 'query'),
    getLooseObjectFromProperty(ml_get_categories2_request, 'body'),
    getLooseObjectFromProperty(ml_get_categories2_request, 'path'),
    getLooseObjectFromProperty(ml_get_categories2_request, 'query'),
    getLooseObjectFromProperty(ml_get_categories3_request, 'body'),
    getLooseObjectFromProperty(ml_get_categories3_request, 'path'),
    getLooseObjectFromProperty(ml_get_categories3_request, 'query'),
  ]),
  outputSchema: z.union([
    ml_get_categories_response,
    ml_get_categories1_response,
    ml_get_categories2_response,
    ml_get_categories3_response,
  ]),
};
const ML_GET_DATA_FRAME_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_data_frame_analytics',
  summary: `Get data frame analytics job configuration info`,
  description: `Get data frame analytics job configuration info.
You can get information for multiple data frame analytics jobs in a single
API request by using a comma-separated list of data frame analytics jobs or a
wildcard expression.`,
  methods: ['GET', 'GET'],
  patterns: ['/_ml/data_frame/analytics/{id}', '/_ml/data_frame/analytics'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-data-frame-analytics',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['force', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_data_frame_analytics_request, 'body'),
    getLooseObjectFromProperty(ml_get_data_frame_analytics_request, 'path'),
    getLooseObjectFromProperty(ml_get_data_frame_analytics_request, 'query'),
    getLooseObjectFromProperty(ml_get_data_frame_analytics1_request, 'body'),
    getLooseObjectFromProperty(ml_get_data_frame_analytics1_request, 'path'),
    getLooseObjectFromProperty(ml_get_data_frame_analytics1_request, 'query'),
  ]),
  outputSchema: z.union([
    ml_get_data_frame_analytics_response,
    ml_get_data_frame_analytics1_response,
  ]),
};
const ML_GET_DATA_FRAME_ANALYTICS_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_data_frame_analytics_stats',
  summary: `Get data frame analytics job stats`,
  description: `Get data frame analytics job stats.`,
  methods: ['GET', 'GET'],
  patterns: ['/_ml/data_frame/analytics/_stats', '/_ml/data_frame/analytics/{id}/_stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-data-frame-analytics-stats',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_data_frame_analytics_stats_request, 'body'),
    getLooseObjectFromProperty(ml_get_data_frame_analytics_stats_request, 'path'),
    getLooseObjectFromProperty(ml_get_data_frame_analytics_stats_request, 'query'),
    getLooseObjectFromProperty(ml_get_data_frame_analytics_stats1_request, 'body'),
    getLooseObjectFromProperty(ml_get_data_frame_analytics_stats1_request, 'path'),
    getLooseObjectFromProperty(ml_get_data_frame_analytics_stats1_request, 'query'),
  ]),
  outputSchema: z.union([
    ml_get_data_frame_analytics_stats_response,
    ml_get_data_frame_analytics_stats1_response,
  ]),
};
const ML_GET_DATAFEED_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_datafeed_stats',
  summary: `Get datafeed stats`,
  description: `Get datafeed stats.
You can get statistics for multiple datafeeds in a single API request by
using a comma-separated list of datafeeds or a wildcard expression. You can
get statistics for all datafeeds by using \`_all\`, by specifying \`*\` as the
\`<feed_id>\`, or by omitting the \`<feed_id>\`. If the datafeed is stopped, the
only information you receive is the \`datafeed_id\` and the \`state\`.
This API returns a maximum of 10,000 datafeeds.`,
  methods: ['GET', 'GET'],
  patterns: ['/_ml/datafeeds/{datafeed_id}/_stats', '/_ml/datafeeds/_stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-datafeed-stats',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_datafeed_stats_request, 'body'),
    getLooseObjectFromProperty(ml_get_datafeed_stats_request, 'path'),
    getLooseObjectFromProperty(ml_get_datafeed_stats_request, 'query'),
    getLooseObjectFromProperty(ml_get_datafeed_stats1_request, 'body'),
    getLooseObjectFromProperty(ml_get_datafeed_stats1_request, 'path'),
    getLooseObjectFromProperty(ml_get_datafeed_stats1_request, 'query'),
  ]),
  outputSchema: z.union([ml_get_datafeed_stats_response, ml_get_datafeed_stats1_response]),
};
const ML_GET_DATAFEEDS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_datafeeds',
  summary: `Get datafeeds configuration info`,
  description: `Get datafeeds configuration info.
You can get information for multiple datafeeds in a single API request by
using a comma-separated list of datafeeds or a wildcard expression. You can
get information for all datafeeds by using \`_all\`, by specifying \`*\` as the
\`<feed_id>\`, or by omitting the \`<feed_id>\`.
This API returns a maximum of 10,000 datafeeds.`,
  methods: ['GET', 'GET'],
  patterns: ['/_ml/datafeeds/{datafeed_id}', '/_ml/datafeeds'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-datafeeds',
  parameterTypes: {
    pathParams: ['datafeed_id', 'datafeed_id'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'ignore_throttled',
      'ignore_unavailable',
      'force',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_datafeeds_request, 'body'),
    getLooseObjectFromProperty(ml_get_datafeeds_request, 'path'),
    getLooseObjectFromProperty(ml_get_datafeeds_request, 'query'),
    getLooseObjectFromProperty(ml_get_datafeeds1_request, 'body'),
    getLooseObjectFromProperty(ml_get_datafeeds1_request, 'path'),
    getLooseObjectFromProperty(ml_get_datafeeds1_request, 'query'),
  ]),
  outputSchema: z.union([ml_get_datafeeds_response, ml_get_datafeeds1_response]),
};
const ML_GET_FILTERS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_filters',
  summary: `Get filters`,
  description: `Get filters.
You can get a single filter or all filters.`,
  methods: ['GET', 'GET'],
  patterns: ['/_ml/filters', '/_ml/filters/{filter_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-filters',
  parameterTypes: {
    pathParams: ['filter_id', 'filter_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_filters_request, 'body'),
    getLooseObjectFromProperty(ml_get_filters_request, 'path'),
    getLooseObjectFromProperty(ml_get_filters_request, 'query'),
    getLooseObjectFromProperty(ml_get_filters1_request, 'body'),
    getLooseObjectFromProperty(ml_get_filters1_request, 'path'),
    getLooseObjectFromProperty(ml_get_filters1_request, 'query'),
  ]),
  outputSchema: z.union([ml_get_filters_response, ml_get_filters1_response]),
};
const ML_GET_INFLUENCERS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_influencers',
  summary: `Get anomaly detection job results for influencers`,
  description: `Get anomaly detection job results for influencers.
Influencers are the entities that have contributed to, or are to blame for,
the anomalies. Influencer results are available only if an
\`influencer_field_name\` is specified in the job configuration.`,
  methods: ['GET', 'POST'],
  patterns: ['/_ml/anomaly_detectors/{job_id}/results/influencers'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-influencers',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_influencers_request, 'body'),
    getLooseObjectFromProperty(ml_get_influencers_request, 'path'),
    getLooseObjectFromProperty(ml_get_influencers_request, 'query'),
    getLooseObjectFromProperty(ml_get_influencers1_request, 'body'),
    getLooseObjectFromProperty(ml_get_influencers1_request, 'path'),
    getLooseObjectFromProperty(ml_get_influencers1_request, 'query'),
  ]),
  outputSchema: z.union([ml_get_influencers_response, ml_get_influencers1_response]),
};
const ML_GET_JOB_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_job_stats',
  summary: `Get anomaly detection job stats`,
  description: `Get anomaly detection job stats.`,
  methods: ['GET', 'GET'],
  patterns: ['/_ml/anomaly_detectors/_stats', '/_ml/anomaly_detectors/{job_id}/_stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-job-stats',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_job_stats_request, 'body'),
    getLooseObjectFromProperty(ml_get_job_stats_request, 'path'),
    getLooseObjectFromProperty(ml_get_job_stats_request, 'query'),
    getLooseObjectFromProperty(ml_get_job_stats1_request, 'body'),
    getLooseObjectFromProperty(ml_get_job_stats1_request, 'path'),
    getLooseObjectFromProperty(ml_get_job_stats1_request, 'query'),
  ]),
  outputSchema: z.union([ml_get_job_stats_response, ml_get_job_stats1_response]),
};
const ML_GET_JOBS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_jobs',
  summary: `Get anomaly detection jobs configuration info`,
  description: `Get anomaly detection jobs configuration info.
You can get information for multiple anomaly detection jobs in a single API
request by using a group name, a comma-separated list of jobs, or a wildcard
expression. You can get information for all anomaly detection jobs by using
\`_all\`, by specifying \`*\` as the \`<job_id>\`, or by omitting the \`<job_id>\`.`,
  methods: ['GET', 'GET'],
  patterns: ['/_ml/anomaly_detectors/{job_id}', '/_ml/anomaly_detectors'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-jobs',
  parameterTypes: {
    pathParams: ['job_id', 'job_id'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'ignore_throttled',
      'ignore_unavailable',
      'force',
      'delete_user_annotations',
      'wait_for_completion',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_jobs_request, 'body'),
    getLooseObjectFromProperty(ml_get_jobs_request, 'path'),
    getLooseObjectFromProperty(ml_get_jobs_request, 'query'),
    getLooseObjectFromProperty(ml_get_jobs1_request, 'body'),
    getLooseObjectFromProperty(ml_get_jobs1_request, 'path'),
    getLooseObjectFromProperty(ml_get_jobs1_request, 'query'),
  ]),
  outputSchema: z.union([ml_get_jobs_response, ml_get_jobs1_response]),
};
const ML_GET_MEMORY_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_memory_stats',
  summary: `Get machine learning memory usage info`,
  description: `Get machine learning memory usage info.
Get information about how machine learning jobs and trained models are using memory,
on each node, both within the JVM heap, and natively, outside of the JVM.`,
  methods: ['GET', 'GET'],
  patterns: ['/_ml/memory/_stats', '/_ml/memory/{node_id}/_stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-memory-stats',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_memory_stats_request, 'body'),
    getLooseObjectFromProperty(ml_get_memory_stats_request, 'path'),
    getLooseObjectFromProperty(ml_get_memory_stats_request, 'query'),
    getLooseObjectFromProperty(ml_get_memory_stats1_request, 'body'),
    getLooseObjectFromProperty(ml_get_memory_stats1_request, 'path'),
    getLooseObjectFromProperty(ml_get_memory_stats1_request, 'query'),
  ]),
  outputSchema: z.union([ml_get_memory_stats_response, ml_get_memory_stats1_response]),
};
const ML_GET_MODEL_SNAPSHOT_UPGRADE_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_model_snapshot_upgrade_stats',
  summary: `Get anomaly detection job model snapshot upgrade usage info`,
  description: `Get anomaly detection job model snapshot upgrade usage info.`,
  methods: ['GET'],
  patterns: ['/_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_upgrade/_stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-model-snapshot-upgrade-stats',
  parameterTypes: {
    pathParams: ['job_id', 'snapshot_id'],
    urlParams: ['allow_no_match'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_model_snapshot_upgrade_stats_request, 'body'),
    getLooseObjectFromProperty(ml_get_model_snapshot_upgrade_stats_request, 'path'),
    getLooseObjectFromProperty(ml_get_model_snapshot_upgrade_stats_request, 'query'),
  ]),
  outputSchema: ml_get_model_snapshot_upgrade_stats_response,
};
const ML_GET_MODEL_SNAPSHOTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_model_snapshots',
  summary: `Get model snapshots info`,
  description: `Get model snapshots info.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: [
    '/_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}',
    '/_ml/anomaly_detectors/{job_id}/model_snapshots',
  ],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-model-snapshots',
  parameterTypes: {
    pathParams: ['job_id', 'snapshot_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_model_snapshots_request, 'body'),
    getLooseObjectFromProperty(ml_get_model_snapshots_request, 'path'),
    getLooseObjectFromProperty(ml_get_model_snapshots_request, 'query'),
    getLooseObjectFromProperty(ml_get_model_snapshots1_request, 'body'),
    getLooseObjectFromProperty(ml_get_model_snapshots1_request, 'path'),
    getLooseObjectFromProperty(ml_get_model_snapshots1_request, 'query'),
    getLooseObjectFromProperty(ml_get_model_snapshots2_request, 'body'),
    getLooseObjectFromProperty(ml_get_model_snapshots2_request, 'path'),
    getLooseObjectFromProperty(ml_get_model_snapshots2_request, 'query'),
    getLooseObjectFromProperty(ml_get_model_snapshots3_request, 'body'),
    getLooseObjectFromProperty(ml_get_model_snapshots3_request, 'path'),
    getLooseObjectFromProperty(ml_get_model_snapshots3_request, 'query'),
  ]),
  outputSchema: z.union([
    ml_get_model_snapshots_response,
    ml_get_model_snapshots1_response,
    ml_get_model_snapshots2_response,
    ml_get_model_snapshots3_response,
  ]),
};
const ML_GET_OVERALL_BUCKETS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_overall_buckets',
  summary: `Get overall bucket results`,
  description: `Get overall bucket results.

Retrievs overall bucket results that summarize the bucket results of
multiple anomaly detection jobs.

The \`overall_score\` is calculated by combining the scores of all the
buckets within the overall bucket span. First, the maximum
\`anomaly_score\` per anomaly detection job in the overall bucket is
calculated. Then the \`top_n\` of those scores are averaged to result in
the \`overall_score\`. This means that you can fine-tune the
\`overall_score\` so that it is more or less sensitive to the number of
jobs that detect an anomaly at the same time. For example, if you set
\`top_n\` to \`1\`, the \`overall_score\` is the maximum bucket score in the
overall bucket. Alternatively, if you set \`top_n\` to the number of jobs,
the \`overall_score\` is high only when all jobs detect anomalies in that
overall bucket. If you set the \`bucket_span\` parameter (to a value
greater than its default), the \`overall_score\` is the maximum
\`overall_score\` of the overall buckets that have a span equal to the
jobs' largest bucket span.`,
  methods: ['GET', 'POST'],
  patterns: ['/_ml/anomaly_detectors/{job_id}/results/overall_buckets'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-overall-buckets',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_overall_buckets_request, 'body'),
    getLooseObjectFromProperty(ml_get_overall_buckets_request, 'path'),
    getLooseObjectFromProperty(ml_get_overall_buckets_request, 'query'),
    getLooseObjectFromProperty(ml_get_overall_buckets1_request, 'body'),
    getLooseObjectFromProperty(ml_get_overall_buckets1_request, 'path'),
    getLooseObjectFromProperty(ml_get_overall_buckets1_request, 'query'),
  ]),
  outputSchema: z.union([ml_get_overall_buckets_response, ml_get_overall_buckets1_response]),
};
const ML_GET_RECORDS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_records',
  summary: `Get anomaly records for an anomaly detection job`,
  description: `Get anomaly records for an anomaly detection job.
Records contain the detailed analytical results. They describe the anomalous
activity that has been identified in the input data based on the detector
configuration.
There can be many anomaly records depending on the characteristics and size
of the input data. In practice, there are often too many to be able to
manually process them. The machine learning features therefore perform a
sophisticated aggregation of the anomaly records into buckets.
The number of record results depends on the number of anomalies found in each
bucket, which relates to the number of time series being modeled and the
number of detectors.`,
  methods: ['GET', 'POST'],
  patterns: ['/_ml/anomaly_detectors/{job_id}/results/records'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-records',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_records_request, 'body'),
    getLooseObjectFromProperty(ml_get_records_request, 'path'),
    getLooseObjectFromProperty(ml_get_records_request, 'query'),
    getLooseObjectFromProperty(ml_get_records1_request, 'body'),
    getLooseObjectFromProperty(ml_get_records1_request, 'path'),
    getLooseObjectFromProperty(ml_get_records1_request, 'query'),
  ]),
  outputSchema: z.union([ml_get_records_response, ml_get_records1_response]),
};
const ML_GET_TRAINED_MODELS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_trained_models',
  summary: `Get trained model configuration info`,
  description: `Get trained model configuration info.`,
  methods: ['GET', 'GET'],
  patterns: ['/_ml/trained_models/{model_id}', '/_ml/trained_models'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-trained-models',
  parameterTypes: {
    pathParams: ['model_id', 'model_id'],
    urlParams: ['defer_definition_decompression', 'wait_for_completion', 'force', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_trained_models_request, 'body'),
    getLooseObjectFromProperty(ml_get_trained_models_request, 'path'),
    getLooseObjectFromProperty(ml_get_trained_models_request, 'query'),
    getLooseObjectFromProperty(ml_get_trained_models1_request, 'body'),
    getLooseObjectFromProperty(ml_get_trained_models1_request, 'path'),
    getLooseObjectFromProperty(ml_get_trained_models1_request, 'query'),
  ]),
  outputSchema: z.union([ml_get_trained_models_response, ml_get_trained_models1_response]),
};
const ML_GET_TRAINED_MODELS_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_trained_models_stats',
  summary: `Get trained models usage info`,
  description: `Get trained models usage info.
You can get usage information for multiple trained
models in a single API request by using a comma-separated list of model IDs or a wildcard expression.`,
  methods: ['GET', 'GET'],
  patterns: ['/_ml/trained_models/{model_id}/_stats', '/_ml/trained_models/_stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-trained-models-stats',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_get_trained_models_stats_request, 'body'),
    getLooseObjectFromProperty(ml_get_trained_models_stats_request, 'path'),
    getLooseObjectFromProperty(ml_get_trained_models_stats_request, 'query'),
    getLooseObjectFromProperty(ml_get_trained_models_stats1_request, 'body'),
    getLooseObjectFromProperty(ml_get_trained_models_stats1_request, 'path'),
    getLooseObjectFromProperty(ml_get_trained_models_stats1_request, 'query'),
  ]),
  outputSchema: z.union([
    ml_get_trained_models_stats_response,
    ml_get_trained_models_stats1_response,
  ]),
};
const ML_INFER_TRAINED_MODEL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.infer_trained_model',
  summary: `Evaluate a trained model`,
  description: `Evaluate a trained model.`,
  methods: ['POST'],
  patterns: ['/_ml/trained_models/{model_id}/_infer'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-infer-trained-model',
  parameterTypes: {
    pathParams: ['model_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_infer_trained_model_request, 'body'),
    getLooseObjectFromProperty(ml_infer_trained_model_request, 'path'),
    getLooseObjectFromProperty(ml_infer_trained_model_request, 'query'),
  ]),
  outputSchema: ml_infer_trained_model_response,
};
const ML_INFO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.info',
  summary: `Get machine learning information`,
  description: `Get machine learning information.
Get defaults and limits used by machine learning.
This endpoint is designed to be used by a user interface that needs to fully
understand machine learning configurations where some options are not
specified, meaning that the defaults should be used. This endpoint may be
used to find out what those defaults are. It also provides information about
the maximum size of machine learning jobs that could run in the current
cluster configuration.`,
  methods: ['GET'],
  patterns: ['/_ml/info'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-info',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_info_request, 'body'),
    getLooseObjectFromProperty(ml_info_request, 'path'),
    getLooseObjectFromProperty(ml_info_request, 'query'),
  ]),
  outputSchema: ml_info_response,
};
const ML_OPEN_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.open_job',
  summary: `Open anomaly detection jobs`,
  description: `Open anomaly detection jobs.

An anomaly detection job must be opened to be ready to receive and analyze
data. It can be opened and closed multiple times throughout its lifecycle.
When you open a new job, it starts with an empty model.
When you open an existing job, the most recent model state is automatically
loaded. The job is ready to resume its analysis from where it left off, once
new data is received.`,
  methods: ['POST'],
  patterns: ['/_ml/anomaly_detectors/{job_id}/_open'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-open-job',
  parameterTypes: {
    pathParams: ['job_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_open_job_request, 'body'),
    getLooseObjectFromProperty(ml_open_job_request, 'path'),
    getLooseObjectFromProperty(ml_open_job_request, 'query'),
  ]),
  outputSchema: ml_open_job_response,
};
const ML_POST_CALENDAR_EVENTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.post_calendar_events',
  summary: `Add scheduled events to the calendar`,
  description: `Add scheduled events to the calendar.`,
  methods: ['POST'],
  patterns: ['/_ml/calendars/{calendar_id}/events'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-post-calendar-events',
  parameterTypes: {
    pathParams: ['calendar_id', 'calendar_id'],
    urlParams: ['end', 'from', 'job_id', 'size', 'start'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_post_calendar_events_request, 'body'),
    getLooseObjectFromProperty(ml_post_calendar_events_request, 'path'),
    getLooseObjectFromProperty(ml_post_calendar_events_request, 'query'),
  ]),
  outputSchema: ml_post_calendar_events_response,
};
const ML_POST_DATA_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.post_data',
  summary: `Send data to an anomaly detection job for analysis`,
  description: `Send data to an anomaly detection job for analysis.

IMPORTANT: For each job, data can be accepted from only a single connection at a time.
It is not currently possible to post data to multiple jobs using wildcards or a comma-separated list.`,
  methods: ['POST'],
  patterns: ['/_ml/anomaly_detectors/{job_id}/_data'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-post-data',
  parameterTypes: {
    pathParams: ['job_id'],
    urlParams: ['reset_end', 'reset_start'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_post_data_request, 'body'),
    getLooseObjectFromProperty(ml_post_data_request, 'path'),
    getLooseObjectFromProperty(ml_post_data_request, 'query'),
  ]),
  outputSchema: ml_post_data_response,
};
const ML_PREVIEW_DATA_FRAME_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.preview_data_frame_analytics',
  summary: `Preview features used by data frame analytics`,
  description: `Preview features used by data frame analytics.
Preview the extracted features used by a data frame analytics config.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_ml/data_frame/analytics/_preview', '/_ml/data_frame/analytics/{id}/_preview'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-preview-data-frame-analytics',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_preview_data_frame_analytics_request, 'body'),
    getLooseObjectFromProperty(ml_preview_data_frame_analytics_request, 'path'),
    getLooseObjectFromProperty(ml_preview_data_frame_analytics_request, 'query'),
    getLooseObjectFromProperty(ml_preview_data_frame_analytics1_request, 'body'),
    getLooseObjectFromProperty(ml_preview_data_frame_analytics1_request, 'path'),
    getLooseObjectFromProperty(ml_preview_data_frame_analytics1_request, 'query'),
    getLooseObjectFromProperty(ml_preview_data_frame_analytics2_request, 'body'),
    getLooseObjectFromProperty(ml_preview_data_frame_analytics2_request, 'path'),
    getLooseObjectFromProperty(ml_preview_data_frame_analytics2_request, 'query'),
    getLooseObjectFromProperty(ml_preview_data_frame_analytics3_request, 'body'),
    getLooseObjectFromProperty(ml_preview_data_frame_analytics3_request, 'path'),
    getLooseObjectFromProperty(ml_preview_data_frame_analytics3_request, 'query'),
  ]),
  outputSchema: z.union([
    ml_preview_data_frame_analytics_response,
    ml_preview_data_frame_analytics1_response,
    ml_preview_data_frame_analytics2_response,
    ml_preview_data_frame_analytics3_response,
  ]),
};
const ML_PREVIEW_DATAFEED_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.preview_datafeed',
  summary: `Preview a datafeed`,
  description: `Preview a datafeed.
This API returns the first "page" of search results from a datafeed.
You can preview an existing datafeed or provide configuration details for a datafeed
and anomaly detection job in the API. The preview shows the structure of the data
that will be passed to the anomaly detection engine.
IMPORTANT: When Elasticsearch security features are enabled, the preview uses the credentials of the user that
called the API. However, when the datafeed starts it uses the roles of the last user that created or updated the
datafeed. To get a preview that accurately reflects the behavior of the datafeed, use the appropriate credentials.
You can also use secondary authorization headers to supply the credentials.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_ml/datafeeds/{datafeed_id}/_preview', '/_ml/datafeeds/_preview'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-preview-datafeed',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_preview_datafeed_request, 'body'),
    getLooseObjectFromProperty(ml_preview_datafeed_request, 'path'),
    getLooseObjectFromProperty(ml_preview_datafeed_request, 'query'),
    getLooseObjectFromProperty(ml_preview_datafeed1_request, 'body'),
    getLooseObjectFromProperty(ml_preview_datafeed1_request, 'path'),
    getLooseObjectFromProperty(ml_preview_datafeed1_request, 'query'),
    getLooseObjectFromProperty(ml_preview_datafeed2_request, 'body'),
    getLooseObjectFromProperty(ml_preview_datafeed2_request, 'path'),
    getLooseObjectFromProperty(ml_preview_datafeed2_request, 'query'),
    getLooseObjectFromProperty(ml_preview_datafeed3_request, 'body'),
    getLooseObjectFromProperty(ml_preview_datafeed3_request, 'path'),
    getLooseObjectFromProperty(ml_preview_datafeed3_request, 'query'),
  ]),
  outputSchema: z.union([
    ml_preview_datafeed_response,
    ml_preview_datafeed1_response,
    ml_preview_datafeed2_response,
    ml_preview_datafeed3_response,
  ]),
};
const ML_PUT_CALENDAR_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_calendar',
  summary: `Create a calendar`,
  description: `Create a calendar.`,
  methods: ['PUT'],
  patterns: ['/_ml/calendars/{calendar_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-calendar',
  parameterTypes: {
    pathParams: ['calendar_id', 'calendar_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_put_calendar_request, 'body'),
    getLooseObjectFromProperty(ml_put_calendar_request, 'path'),
    getLooseObjectFromProperty(ml_put_calendar_request, 'query'),
  ]),
  outputSchema: ml_put_calendar_response,
};
const ML_PUT_CALENDAR_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_calendar_job',
  summary: `Add anomaly detection job to calendar`,
  description: `Add anomaly detection job to calendar.`,
  methods: ['PUT'],
  patterns: ['/_ml/calendars/{calendar_id}/jobs/{job_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-calendar-job',
  parameterTypes: {
    pathParams: ['calendar_id', 'job_id', 'calendar_id', 'job_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_put_calendar_job_request, 'body'),
    getLooseObjectFromProperty(ml_put_calendar_job_request, 'path'),
    getLooseObjectFromProperty(ml_put_calendar_job_request, 'query'),
  ]),
  outputSchema: ml_put_calendar_job_response,
};
const ML_PUT_DATA_FRAME_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_data_frame_analytics',
  summary: `Create a data frame analytics job`,
  description: `Create a data frame analytics job.
This API creates a data frame analytics job that performs an analysis on the
source indices and stores the outcome in a destination index.
By default, the query used in the source configuration is \`{"match_all": {}}\`.

If the destination index does not exist, it is created automatically when you start the job.

If you supply only a subset of the regression or classification parameters, hyperparameter optimization occurs. It determines a value for each of the undefined parameters.`,
  methods: ['PUT'],
  patterns: ['/_ml/data_frame/analytics/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-data-frame-analytics',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['force', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_put_data_frame_analytics_request, 'body'),
    getLooseObjectFromProperty(ml_put_data_frame_analytics_request, 'path'),
    getLooseObjectFromProperty(ml_put_data_frame_analytics_request, 'query'),
  ]),
  outputSchema: ml_put_data_frame_analytics_response,
};
const ML_PUT_DATAFEED_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_datafeed',
  summary: `Create a datafeed`,
  description: `Create a datafeed.
Datafeeds retrieve data from Elasticsearch for analysis by an anomaly detection job.
You can associate only one datafeed with each anomaly detection job.
The datafeed contains a query that runs at a defined interval (\`frequency\`).
If you are concerned about delayed data, you can add a delay (\`query_delay') at each interval.
By default, the datafeed uses the following query: \`{"match_all": {"boost": 1}}\`.

When Elasticsearch security features are enabled, your datafeed remembers which roles the user who created it had
at the time of creation and runs the query using those same roles. If you provide secondary authorization headers,
those credentials are used instead.
You must use Kibana, this API, or the create anomaly detection jobs API to create a datafeed. Do not add a datafeed
directly to the \`.ml-config\` index. Do not give users \`write\` privileges on the \`.ml-config\` index.`,
  methods: ['PUT'],
  patterns: ['/_ml/datafeeds/{datafeed_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-datafeed',
  parameterTypes: {
    pathParams: ['datafeed_id', 'datafeed_id'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'ignore_throttled',
      'ignore_unavailable',
      'force',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_put_datafeed_request, 'body'),
    getLooseObjectFromProperty(ml_put_datafeed_request, 'path'),
    getLooseObjectFromProperty(ml_put_datafeed_request, 'query'),
  ]),
  outputSchema: ml_put_datafeed_response,
};
const ML_PUT_FILTER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_filter',
  summary: `Create a filter`,
  description: `Create a filter.
A filter contains a list of strings. It can be used by one or more anomaly detection jobs.
Specifically, filters are referenced in the \`custom_rules\` property of detector configuration objects.`,
  methods: ['PUT'],
  patterns: ['/_ml/filters/{filter_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-filter',
  parameterTypes: {
    pathParams: ['filter_id', 'filter_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_put_filter_request, 'body'),
    getLooseObjectFromProperty(ml_put_filter_request, 'path'),
    getLooseObjectFromProperty(ml_put_filter_request, 'query'),
  ]),
  outputSchema: ml_put_filter_response,
};
const ML_PUT_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_job',
  summary: `Create an anomaly detection job`,
  description: `Create an anomaly detection job.

If you include a \`datafeed_config\`, you must have read index privileges on the source index.
If you include a \`datafeed_config\` but do not provide a query, the datafeed uses \`{"match_all": {"boost": 1}}\`.`,
  methods: ['PUT'],
  patterns: ['/_ml/anomaly_detectors/{job_id}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-job',
  parameterTypes: {
    pathParams: ['job_id', 'job_id'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'ignore_throttled',
      'ignore_unavailable',
      'force',
      'delete_user_annotations',
      'wait_for_completion',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_put_job_request, 'body'),
    getLooseObjectFromProperty(ml_put_job_request, 'path'),
    getLooseObjectFromProperty(ml_put_job_request, 'query'),
  ]),
  outputSchema: ml_put_job_response,
};
const ML_PUT_TRAINED_MODEL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_trained_model',
  summary: `Create a trained model`,
  description: `Create a trained model.
Enable you to supply a trained model that is not created by data frame analytics.`,
  methods: ['PUT'],
  patterns: ['/_ml/trained_models/{model_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-trained-model',
  parameterTypes: {
    pathParams: ['model_id', 'model_id'],
    urlParams: ['defer_definition_decompression', 'wait_for_completion', 'force', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_put_trained_model_request, 'body'),
    getLooseObjectFromProperty(ml_put_trained_model_request, 'path'),
    getLooseObjectFromProperty(ml_put_trained_model_request, 'query'),
  ]),
  outputSchema: ml_put_trained_model_response,
};
const ML_PUT_TRAINED_MODEL_ALIAS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_trained_model_alias',
  summary: `Create or update a trained model alias`,
  description: `Create or update a trained model alias.
A trained model alias is a logical name used to reference a single trained
model.
You can use aliases instead of trained model identifiers to make it easier to
reference your models. For example, you can use aliases in inference
aggregations and processors.
An alias must be unique and refer to only a single trained model. However,
you can have multiple aliases for each trained model.
If you use this API to update an alias such that it references a different
trained model ID and the model uses a different type of data frame analytics,
an error occurs. For example, this situation occurs if you have a trained
model for regression analysis and a trained model for classification
analysis; you cannot reassign an alias from one type of trained model to
another.
If you use this API to update an alias and there are very few input fields in
common between the old and new trained models for the model alias, the API
returns a warning.`,
  methods: ['PUT'],
  patterns: ['/_ml/trained_models/{model_id}/model_aliases/{model_alias}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-trained-model-alias',
  parameterTypes: {
    pathParams: ['model_id', 'model_alias', 'model_id', 'model_alias'],
    urlParams: ['reassign'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_put_trained_model_alias_request, 'body'),
    getLooseObjectFromProperty(ml_put_trained_model_alias_request, 'path'),
    getLooseObjectFromProperty(ml_put_trained_model_alias_request, 'query'),
  ]),
  outputSchema: ml_put_trained_model_alias_response,
};
const ML_PUT_TRAINED_MODEL_DEFINITION_PART_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_trained_model_definition_part',
  summary: `Create part of a trained model definition`,
  description: `Create part of a trained model definition.`,
  methods: ['PUT'],
  patterns: ['/_ml/trained_models/{model_id}/definition/{part}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-trained-model-definition-part',
  parameterTypes: {
    pathParams: ['model_id', 'part'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_put_trained_model_definition_part_request, 'body'),
    getLooseObjectFromProperty(ml_put_trained_model_definition_part_request, 'path'),
    getLooseObjectFromProperty(ml_put_trained_model_definition_part_request, 'query'),
  ]),
  outputSchema: ml_put_trained_model_definition_part_response,
};
const ML_PUT_TRAINED_MODEL_VOCABULARY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_trained_model_vocabulary',
  summary: `Create a trained model vocabulary`,
  description: `Create a trained model vocabulary.
This API is supported only for natural language processing (NLP) models.
The vocabulary is stored in the index as described in \`inference_config.*.vocabulary\` of the trained model definition.`,
  methods: ['PUT'],
  patterns: ['/_ml/trained_models/{model_id}/vocabulary'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-trained-model-vocabulary',
  parameterTypes: {
    pathParams: ['model_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_put_trained_model_vocabulary_request, 'body'),
    getLooseObjectFromProperty(ml_put_trained_model_vocabulary_request, 'path'),
    getLooseObjectFromProperty(ml_put_trained_model_vocabulary_request, 'query'),
  ]),
  outputSchema: ml_put_trained_model_vocabulary_response,
};
const ML_RESET_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.reset_job',
  summary: `Reset an anomaly detection job`,
  description: `Reset an anomaly detection job.
All model state and results are deleted. The job is ready to start over as if
it had just been created.
It is not currently possible to reset multiple jobs using wildcards or a
comma separated list.`,
  methods: ['POST'],
  patterns: ['/_ml/anomaly_detectors/{job_id}/_reset'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-reset-job',
  parameterTypes: {
    pathParams: ['job_id'],
    urlParams: ['wait_for_completion', 'delete_user_annotations'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_reset_job_request, 'body'),
    getLooseObjectFromProperty(ml_reset_job_request, 'path'),
    getLooseObjectFromProperty(ml_reset_job_request, 'query'),
  ]),
  outputSchema: ml_reset_job_response,
};
const ML_REVERT_MODEL_SNAPSHOT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.revert_model_snapshot',
  summary: `Revert to a snapshot`,
  description: `Revert to a snapshot.
The machine learning features react quickly to anomalous input, learning new
behaviors in data. Highly anomalous input increases the variance in the
models whilst the system learns whether this is a new step-change in behavior
or a one-off event. In the case where this anomalous input is known to be a
one-off, then it might be appropriate to reset the model state to a time
before this event. For example, you might consider reverting to a saved
snapshot after Black Friday or a critical system failure.`,
  methods: ['POST'],
  patterns: ['/_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_revert'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-revert-model-snapshot',
  parameterTypes: {
    pathParams: ['job_id', 'snapshot_id'],
    urlParams: ['delete_intervening_results'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_revert_model_snapshot_request, 'body'),
    getLooseObjectFromProperty(ml_revert_model_snapshot_request, 'path'),
    getLooseObjectFromProperty(ml_revert_model_snapshot_request, 'query'),
  ]),
  outputSchema: ml_revert_model_snapshot_response,
};
const ML_SET_UPGRADE_MODE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.set_upgrade_mode',
  summary: `Set upgrade_mode for ML indices`,
  description: `Set upgrade_mode for ML indices.
Sets a cluster wide upgrade_mode setting that prepares machine learning
indices for an upgrade.
When upgrading your cluster, in some circumstances you must restart your
nodes and reindex your machine learning indices. In those circumstances,
there must be no machine learning jobs running. You can close the machine
learning jobs, do the upgrade, then open all the jobs again. Alternatively,
you can use this API to temporarily halt tasks associated with the jobs and
datafeeds and prevent new jobs from opening. You can also use this API
during upgrades that do not require you to reindex your machine learning
indices, though stopping jobs is not a requirement in that case.
You can see the current value for the upgrade_mode setting by using the get
machine learning info API.`,
  methods: ['POST'],
  patterns: ['/_ml/set_upgrade_mode'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-set-upgrade-mode',
  parameterTypes: {
    pathParams: [],
    urlParams: ['enabled', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_set_upgrade_mode_request, 'body'),
    getLooseObjectFromProperty(ml_set_upgrade_mode_request, 'path'),
    getLooseObjectFromProperty(ml_set_upgrade_mode_request, 'query'),
  ]),
  outputSchema: ml_set_upgrade_mode_response,
};
const ML_START_DATA_FRAME_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.start_data_frame_analytics',
  summary: `Start a data frame analytics job`,
  description: `Start a data frame analytics job.
A data frame analytics job can be started and stopped multiple times
throughout its lifecycle.
If the destination index does not exist, it is created automatically the
first time you start the data frame analytics job. The
\`index.number_of_shards\` and \`index.number_of_replicas\` settings for the
destination index are copied from the source index. If there are multiple
source indices, the destination index copies the highest setting values. The
mappings for the destination index are also copied from the source indices.
If there are any mapping conflicts, the job fails to start.
If the destination index exists, it is used as is. You can therefore set up
the destination index in advance with custom settings and mappings.`,
  methods: ['POST'],
  patterns: ['/_ml/data_frame/analytics/{id}/_start'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-start-data-frame-analytics',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_start_data_frame_analytics_request, 'body'),
    getLooseObjectFromProperty(ml_start_data_frame_analytics_request, 'path'),
    getLooseObjectFromProperty(ml_start_data_frame_analytics_request, 'query'),
  ]),
  outputSchema: ml_start_data_frame_analytics_response,
};
const ML_START_DATAFEED_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.start_datafeed',
  summary: `Start datafeeds`,
  description: `Start datafeeds.

A datafeed must be started in order to retrieve data from Elasticsearch. A datafeed can be started and stopped
multiple times throughout its lifecycle.

Before you can start a datafeed, the anomaly detection job must be open. Otherwise, an error occurs.

If you restart a stopped datafeed, it continues processing input data from the next millisecond after it was stopped.
If new data was indexed for that exact millisecond between stopping and starting, it will be ignored.

When Elasticsearch security features are enabled, your datafeed remembers which roles the last user to create or
update it had at the time of creation or update and runs the query using those same roles. If you provided secondary
authorization headers when you created or updated the datafeed, those credentials are used instead.`,
  methods: ['POST'],
  patterns: ['/_ml/datafeeds/{datafeed_id}/_start'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-start-datafeed',
  parameterTypes: {
    pathParams: ['datafeed_id'],
    urlParams: ['end', 'start', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_start_datafeed_request, 'body'),
    getLooseObjectFromProperty(ml_start_datafeed_request, 'path'),
    getLooseObjectFromProperty(ml_start_datafeed_request, 'query'),
  ]),
  outputSchema: ml_start_datafeed_response,
};
const ML_START_TRAINED_MODEL_DEPLOYMENT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.start_trained_model_deployment',
  summary: `Start a trained model deployment`,
  description: `Start a trained model deployment.
It allocates the model to every machine learning node.`,
  methods: ['POST'],
  patterns: ['/_ml/trained_models/{model_id}/deployment/_start'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-start-trained-model-deployment',
  parameterTypes: {
    pathParams: ['model_id'],
    urlParams: [
      'cache_size',
      'deployment_id',
      'number_of_allocations',
      'priority',
      'queue_capacity',
      'threads_per_allocation',
      'timeout',
      'wait_for',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_start_trained_model_deployment_request, 'body'),
    getLooseObjectFromProperty(ml_start_trained_model_deployment_request, 'path'),
    getLooseObjectFromProperty(ml_start_trained_model_deployment_request, 'query'),
  ]),
  outputSchema: ml_start_trained_model_deployment_response,
};
const ML_STOP_DATA_FRAME_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.stop_data_frame_analytics',
  summary: `Stop data frame analytics jobs`,
  description: `Stop data frame analytics jobs.
A data frame analytics job can be started and stopped multiple times
throughout its lifecycle.`,
  methods: ['POST'],
  patterns: ['/_ml/data_frame/analytics/{id}/_stop'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-stop-data-frame-analytics',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: ['allow_no_match', 'force', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_stop_data_frame_analytics_request, 'body'),
    getLooseObjectFromProperty(ml_stop_data_frame_analytics_request, 'path'),
    getLooseObjectFromProperty(ml_stop_data_frame_analytics_request, 'query'),
  ]),
  outputSchema: ml_stop_data_frame_analytics_response,
};
const ML_STOP_DATAFEED_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.stop_datafeed',
  summary: `Stop datafeeds`,
  description: `Stop datafeeds.
A datafeed that is stopped ceases to retrieve data from Elasticsearch. A datafeed can be started and stopped
multiple times throughout its lifecycle.`,
  methods: ['POST'],
  patterns: ['/_ml/datafeeds/{datafeed_id}/_stop'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-stop-datafeed',
  parameterTypes: {
    pathParams: ['datafeed_id'],
    urlParams: ['allow_no_match', 'force', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_stop_datafeed_request, 'body'),
    getLooseObjectFromProperty(ml_stop_datafeed_request, 'path'),
    getLooseObjectFromProperty(ml_stop_datafeed_request, 'query'),
  ]),
  outputSchema: ml_stop_datafeed_response,
};
const ML_STOP_TRAINED_MODEL_DEPLOYMENT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.stop_trained_model_deployment',
  summary: `Stop a trained model deployment`,
  description: `Stop a trained model deployment.`,
  methods: ['POST'],
  patterns: ['/_ml/trained_models/{model_id}/deployment/_stop'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-stop-trained-model-deployment',
  parameterTypes: {
    pathParams: ['model_id'],
    urlParams: ['allow_no_match', 'force'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_stop_trained_model_deployment_request, 'body'),
    getLooseObjectFromProperty(ml_stop_trained_model_deployment_request, 'path'),
    getLooseObjectFromProperty(ml_stop_trained_model_deployment_request, 'query'),
  ]),
  outputSchema: ml_stop_trained_model_deployment_response,
};
const ML_UPDATE_DATA_FRAME_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.update_data_frame_analytics',
  summary: `Update a data frame analytics job`,
  description: `Update a data frame analytics job.`,
  methods: ['POST'],
  patterns: ['/_ml/data_frame/analytics/{id}/_update'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-data-frame-analytics',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_update_data_frame_analytics_request, 'body'),
    getLooseObjectFromProperty(ml_update_data_frame_analytics_request, 'path'),
    getLooseObjectFromProperty(ml_update_data_frame_analytics_request, 'query'),
  ]),
  outputSchema: ml_update_data_frame_analytics_response,
};
const ML_UPDATE_DATAFEED_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.update_datafeed',
  summary: `Update a datafeed`,
  description: `Update a datafeed.
You must stop and start the datafeed for the changes to be applied.
When Elasticsearch security features are enabled, your datafeed remembers which roles the user who updated it had at
the time of the update and runs the query using those same roles. If you provide secondary authorization headers,
those credentials are used instead.`,
  methods: ['POST'],
  patterns: ['/_ml/datafeeds/{datafeed_id}/_update'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-datafeed',
  parameterTypes: {
    pathParams: ['datafeed_id'],
    urlParams: ['allow_no_indices', 'expand_wildcards', 'ignore_throttled', 'ignore_unavailable'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_update_datafeed_request, 'body'),
    getLooseObjectFromProperty(ml_update_datafeed_request, 'path'),
    getLooseObjectFromProperty(ml_update_datafeed_request, 'query'),
  ]),
  outputSchema: ml_update_datafeed_response,
};
const ML_UPDATE_FILTER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.update_filter',
  summary: `Update a filter`,
  description: `Update a filter.
Updates the description of a filter, adds items, or removes items from the list.`,
  methods: ['POST'],
  patterns: ['/_ml/filters/{filter_id}/_update'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-filter',
  parameterTypes: {
    pathParams: ['filter_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_update_filter_request, 'body'),
    getLooseObjectFromProperty(ml_update_filter_request, 'path'),
    getLooseObjectFromProperty(ml_update_filter_request, 'query'),
  ]),
  outputSchema: ml_update_filter_response,
};
const ML_UPDATE_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.update_job',
  summary: `Update an anomaly detection job`,
  description: `Update an anomaly detection job.
Updates certain properties of an anomaly detection job.`,
  methods: ['POST'],
  patterns: ['/_ml/anomaly_detectors/{job_id}/_update'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-job',
  parameterTypes: {
    pathParams: ['job_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_update_job_request, 'body'),
    getLooseObjectFromProperty(ml_update_job_request, 'path'),
    getLooseObjectFromProperty(ml_update_job_request, 'query'),
  ]),
  outputSchema: ml_update_job_response,
};
const ML_UPDATE_MODEL_SNAPSHOT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.update_model_snapshot',
  summary: `Update a snapshot`,
  description: `Update a snapshot.
Updates certain properties of a snapshot.`,
  methods: ['POST'],
  patterns: ['/_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_update'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-model-snapshot',
  parameterTypes: {
    pathParams: ['job_id', 'snapshot_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_update_model_snapshot_request, 'body'),
    getLooseObjectFromProperty(ml_update_model_snapshot_request, 'path'),
    getLooseObjectFromProperty(ml_update_model_snapshot_request, 'query'),
  ]),
  outputSchema: ml_update_model_snapshot_response,
};
const ML_UPDATE_TRAINED_MODEL_DEPLOYMENT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.update_trained_model_deployment',
  summary: `Update a trained model deployment`,
  description: `Update a trained model deployment.`,
  methods: ['POST'],
  patterns: ['/_ml/trained_models/{model_id}/deployment/_update'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-trained-model-deployment',
  parameterTypes: {
    pathParams: ['model_id'],
    urlParams: ['number_of_allocations'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_update_trained_model_deployment_request, 'body'),
    getLooseObjectFromProperty(ml_update_trained_model_deployment_request, 'path'),
    getLooseObjectFromProperty(ml_update_trained_model_deployment_request, 'query'),
  ]),
  outputSchema: ml_update_trained_model_deployment_response,
};
const ML_UPGRADE_JOB_SNAPSHOT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.upgrade_job_snapshot',
  summary: `Upgrade a snapshot`,
  description: `Upgrade a snapshot.
Upgrade an anomaly detection model snapshot to the latest major version.
Over time, older snapshot formats are deprecated and removed. Anomaly
detection jobs support only snapshots that are from the current or previous
major version.
This API provides a means to upgrade a snapshot to the current major version.
This aids in preparing the cluster for an upgrade to the next major version.
Only one snapshot per anomaly detection job can be upgraded at a time and the
upgraded snapshot cannot be the current snapshot of the anomaly detection
job.`,
  methods: ['POST'],
  patterns: ['/_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_upgrade'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-upgrade-job-snapshot',
  parameterTypes: {
    pathParams: ['job_id', 'snapshot_id'],
    urlParams: ['wait_for_completion', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_upgrade_job_snapshot_request, 'body'),
    getLooseObjectFromProperty(ml_upgrade_job_snapshot_request, 'path'),
    getLooseObjectFromProperty(ml_upgrade_job_snapshot_request, 'query'),
  ]),
  outputSchema: ml_upgrade_job_snapshot_response,
};
const ML_VALIDATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.validate',
  summary: ``,
  description: `Validate an anomaly detection job.`,
  methods: ['POST'],
  patterns: ['/_ml/anomaly_detectors/_validate'],
  isInternal: false,
  documentation: 'https://www.elastic.co/guide/en/machine-learning/current/ml-jobs.html',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const ML_VALIDATE_DETECTOR_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.validate_detector',
  summary: ``,
  description: `Validate an anomaly detection job.`,
  methods: ['POST'],
  patterns: ['/_ml/anomaly_detectors/_validate/detector'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const MONITORING_BULK_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.monitoring.bulk',
  summary: ``,
  description: `Send monitoring data.
This API is used by the monitoring features to send monitoring data.`,
  methods: ['POST', 'PUT', 'POST', 'PUT'],
  patterns: ['/_monitoring/bulk', '/_monitoring/{type}/bulk'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const MSEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.msearch',
  summary: `Run multiple searches`,
  description: `Run multiple searches.

The format of the request is similar to the bulk API format and makes use of the newline delimited JSON (NDJSON) format.
The structure is as follows:

\`\`\`
header\\n
body\\n
header\\n
body\\n
\`\`\`

This structure is specifically optimized to reduce parsing if a specific search ends up redirected to another node.

IMPORTANT: The final line of data must end with a newline character \`\\n\`.
Each newline character may be preceded by a carriage return \`\\r\`.
When sending requests to this endpoint the \`Content-Type\` header should be set to \`application/x-ndjson\`.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_msearch', '/{index}/_msearch'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-msearch',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(msearch_request, 'body'),
    getLooseObjectFromProperty(msearch_request, 'path'),
    getLooseObjectFromProperty(msearch_request, 'query'),
    getLooseObjectFromProperty(msearch1_request, 'body'),
    getLooseObjectFromProperty(msearch1_request, 'path'),
    getLooseObjectFromProperty(msearch1_request, 'query'),
    getLooseObjectFromProperty(msearch2_request, 'body'),
    getLooseObjectFromProperty(msearch2_request, 'path'),
    getLooseObjectFromProperty(msearch2_request, 'query'),
    getLooseObjectFromProperty(msearch3_request, 'body'),
    getLooseObjectFromProperty(msearch3_request, 'path'),
    getLooseObjectFromProperty(msearch3_request, 'query'),
  ]),
  outputSchema: z.union([
    msearch_response,
    msearch1_response,
    msearch2_response,
    msearch3_response,
  ]),
};
const MSEARCH_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.msearch_template',
  summary: `Run multiple templated searches`,
  description: `Run multiple templated searches.

Run multiple templated searches with a single request.
If you are providing a text file or text input to \`curl\`, use the \`--data-binary\` flag instead of \`-d\` to preserve newlines.
For example:

\`\`\`
\$ cat requests
{ "index": "my-index" }
{ "id": "my-search-template", "params": { "query_string": "hello world", "from": 0, "size": 10 }}
{ "index": "my-other-index" }
{ "id": "my-other-search-template", "params": { "query_type": "match_all" }}

\$ curl -H "Content-Type: application/x-ndjson" -XGET localhost:9200/_msearch/template --data-binary "@requests"; echo
\`\`\``,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_msearch/template', '/{index}/_msearch/template'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-msearch-template',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(msearch_template_request, 'body'),
    getLooseObjectFromProperty(msearch_template_request, 'path'),
    getLooseObjectFromProperty(msearch_template_request, 'query'),
    getLooseObjectFromProperty(msearch_template1_request, 'body'),
    getLooseObjectFromProperty(msearch_template1_request, 'path'),
    getLooseObjectFromProperty(msearch_template1_request, 'query'),
    getLooseObjectFromProperty(msearch_template2_request, 'body'),
    getLooseObjectFromProperty(msearch_template2_request, 'path'),
    getLooseObjectFromProperty(msearch_template2_request, 'query'),
    getLooseObjectFromProperty(msearch_template3_request, 'body'),
    getLooseObjectFromProperty(msearch_template3_request, 'path'),
    getLooseObjectFromProperty(msearch_template3_request, 'query'),
  ]),
  outputSchema: z.union([
    msearch_template_response,
    msearch_template1_response,
    msearch_template2_response,
    msearch_template3_response,
  ]),
};
const MTERMVECTORS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.mtermvectors',
  summary: `Get multiple term vectors`,
  description: `Get multiple term vectors.

Get multiple term vectors with a single request.
You can specify existing documents by index and ID or provide artificial documents in the body of the request.
You can specify the index in the request body or request URI.
The response contains a \`docs\` array with all the fetched termvectors.
Each element has the structure provided by the termvectors API.

**Artificial documents**

You can also use \`mtermvectors\` to generate term vectors for artificial documents provided in the body of the request.
The mapping used is determined by the specified \`_index\`.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_mtermvectors', '/{index}/_mtermvectors'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-mtermvectors',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(mtermvectors_request, 'body'),
    getLooseObjectFromProperty(mtermvectors_request, 'path'),
    getLooseObjectFromProperty(mtermvectors_request, 'query'),
    getLooseObjectFromProperty(mtermvectors1_request, 'body'),
    getLooseObjectFromProperty(mtermvectors1_request, 'path'),
    getLooseObjectFromProperty(mtermvectors1_request, 'query'),
    getLooseObjectFromProperty(mtermvectors2_request, 'body'),
    getLooseObjectFromProperty(mtermvectors2_request, 'path'),
    getLooseObjectFromProperty(mtermvectors2_request, 'query'),
    getLooseObjectFromProperty(mtermvectors3_request, 'body'),
    getLooseObjectFromProperty(mtermvectors3_request, 'path'),
    getLooseObjectFromProperty(mtermvectors3_request, 'query'),
  ]),
  outputSchema: z.union([
    mtermvectors_response,
    mtermvectors1_response,
    mtermvectors2_response,
    mtermvectors3_response,
  ]),
};
const NODES_CLEAR_REPOSITORIES_METERING_ARCHIVE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.nodes.clear_repositories_metering_archive',
  summary: `Clear the archived repositories metering`,
  description: `Clear the archived repositories metering.
Clear the archived repositories metering information in the cluster.`,
  methods: ['DELETE'],
  patterns: ['/_nodes/{node_id}/_repositories_metering/{max_archive_version}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-clear-repositories-metering-archive',
  parameterTypes: {
    pathParams: ['node_id', 'max_archive_version'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(nodes_clear_repositories_metering_archive_request, 'body'),
    getLooseObjectFromProperty(nodes_clear_repositories_metering_archive_request, 'path'),
    getLooseObjectFromProperty(nodes_clear_repositories_metering_archive_request, 'query'),
  ]),
  outputSchema: nodes_clear_repositories_metering_archive_response,
};
const NODES_GET_REPOSITORIES_METERING_INFO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.nodes.get_repositories_metering_info',
  summary: `Get cluster repositories metering`,
  description: `Get cluster repositories metering.
Get repositories metering information for a cluster.
This API exposes monotonically non-decreasing counters and it is expected that clients would durably store the information needed to compute aggregations over a period of time.
Additionally, the information exposed by this API is volatile, meaning that it will not be present after node restarts.`,
  methods: ['GET'],
  patterns: ['/_nodes/{node_id}/_repositories_metering'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-get-repositories-metering-info',
  parameterTypes: {
    pathParams: ['node_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(nodes_get_repositories_metering_info_request, 'body'),
    getLooseObjectFromProperty(nodes_get_repositories_metering_info_request, 'path'),
    getLooseObjectFromProperty(nodes_get_repositories_metering_info_request, 'query'),
  ]),
  outputSchema: nodes_get_repositories_metering_info_response,
};
const NODES_HOT_THREADS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.nodes.hot_threads',
  summary: `Get the hot threads for nodes`,
  description: `Get the hot threads for nodes.
Get a breakdown of the hot threads on each selected node in the cluster.
The output is plain text with a breakdown of the top hot threads for each node.`,
  methods: ['GET', 'GET'],
  patterns: ['/_nodes/hot_threads', '/_nodes/{node_id}/hot_threads'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-hot-threads',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(nodes_hot_threads_request, 'body'),
    getLooseObjectFromProperty(nodes_hot_threads_request, 'path'),
    getLooseObjectFromProperty(nodes_hot_threads_request, 'query'),
    getLooseObjectFromProperty(nodes_hot_threads1_request, 'body'),
    getLooseObjectFromProperty(nodes_hot_threads1_request, 'path'),
    getLooseObjectFromProperty(nodes_hot_threads1_request, 'query'),
  ]),
  outputSchema: z.union([nodes_hot_threads_response, nodes_hot_threads1_response]),
};
const NODES_INFO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.nodes.info',
  summary: `Get node information`,
  description: `Get node information.

By default, the API returns all attributes and core settings for cluster nodes.`,
  methods: ['GET', 'GET', 'GET', 'GET'],
  patterns: ['/_nodes', '/_nodes/{node_id}', '/_nodes/{metric}', '/_nodes/{node_id}/{metric}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-info',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(nodes_info_request, 'body'),
    getLooseObjectFromProperty(nodes_info_request, 'path'),
    getLooseObjectFromProperty(nodes_info_request, 'query'),
    getLooseObjectFromProperty(nodes_info1_request, 'body'),
    getLooseObjectFromProperty(nodes_info1_request, 'path'),
    getLooseObjectFromProperty(nodes_info1_request, 'query'),
    getLooseObjectFromProperty(nodes_info2_request, 'body'),
    getLooseObjectFromProperty(nodes_info2_request, 'path'),
    getLooseObjectFromProperty(nodes_info2_request, 'query'),
    getLooseObjectFromProperty(nodes_info3_request, 'body'),
    getLooseObjectFromProperty(nodes_info3_request, 'path'),
    getLooseObjectFromProperty(nodes_info3_request, 'query'),
  ]),
  outputSchema: z.union([
    nodes_info_response,
    nodes_info1_response,
    nodes_info2_response,
    nodes_info3_response,
  ]),
};
const NODES_RELOAD_SECURE_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.nodes.reload_secure_settings',
  summary: `Reload the keystore on nodes in the cluster`,
  description: `Reload the keystore on nodes in the cluster.

Secure settings are stored in an on-disk keystore. Certain of these settings are reloadable.
That is, you can change them on disk and reload them without restarting any nodes in the cluster.
When you have updated reloadable secure settings in your keystore, you can use this API to reload those settings on each node.

When the Elasticsearch keystore is password protected and not simply obfuscated, you must provide the password for the keystore when you reload the secure settings.
Reloading the settings for the whole cluster assumes that the keystores for all nodes are protected with the same password; this method is allowed only when inter-node communications are encrypted.
Alternatively, you can reload the secure settings on each node by locally accessing the API and passing the node-specific Elasticsearch keystore password.`,
  methods: ['POST', 'POST'],
  patterns: ['/_nodes/reload_secure_settings', '/_nodes/{node_id}/reload_secure_settings'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-reload-secure-settings',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(nodes_reload_secure_settings_request, 'body'),
    getLooseObjectFromProperty(nodes_reload_secure_settings_request, 'path'),
    getLooseObjectFromProperty(nodes_reload_secure_settings_request, 'query'),
    getLooseObjectFromProperty(nodes_reload_secure_settings1_request, 'body'),
    getLooseObjectFromProperty(nodes_reload_secure_settings1_request, 'path'),
    getLooseObjectFromProperty(nodes_reload_secure_settings1_request, 'query'),
  ]),
  outputSchema: z.union([
    nodes_reload_secure_settings_response,
    nodes_reload_secure_settings1_response,
  ]),
};
const NODES_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.nodes.stats',
  summary: `Get node statistics`,
  description: `Get node statistics.
Get statistics for nodes in a cluster.
By default, all stats are returned. You can limit the returned information by using metrics.`,
  methods: ['GET', 'GET', 'GET', 'GET', 'GET', 'GET'],
  patterns: [
    '/_nodes/stats',
    '/_nodes/{node_id}/stats',
    '/_nodes/stats/{metric}',
    '/_nodes/{node_id}/stats/{metric}',
    '/_nodes/stats/{metric}/{index_metric}',
    '/_nodes/{node_id}/stats/{metric}/{index_metric}',
  ],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-stats',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(nodes_stats_request, 'body'),
    getLooseObjectFromProperty(nodes_stats_request, 'path'),
    getLooseObjectFromProperty(nodes_stats_request, 'query'),
    getLooseObjectFromProperty(nodes_stats1_request, 'body'),
    getLooseObjectFromProperty(nodes_stats1_request, 'path'),
    getLooseObjectFromProperty(nodes_stats1_request, 'query'),
    getLooseObjectFromProperty(nodes_stats2_request, 'body'),
    getLooseObjectFromProperty(nodes_stats2_request, 'path'),
    getLooseObjectFromProperty(nodes_stats2_request, 'query'),
    getLooseObjectFromProperty(nodes_stats3_request, 'body'),
    getLooseObjectFromProperty(nodes_stats3_request, 'path'),
    getLooseObjectFromProperty(nodes_stats3_request, 'query'),
    getLooseObjectFromProperty(nodes_stats4_request, 'body'),
    getLooseObjectFromProperty(nodes_stats4_request, 'path'),
    getLooseObjectFromProperty(nodes_stats4_request, 'query'),
    getLooseObjectFromProperty(nodes_stats5_request, 'body'),
    getLooseObjectFromProperty(nodes_stats5_request, 'path'),
    getLooseObjectFromProperty(nodes_stats5_request, 'query'),
  ]),
  outputSchema: z.union([
    nodes_stats_response,
    nodes_stats1_response,
    nodes_stats2_response,
    nodes_stats3_response,
    nodes_stats4_response,
    nodes_stats5_response,
  ]),
};
const NODES_USAGE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.nodes.usage',
  summary: `Get feature usage information`,
  description: `Get feature usage information.`,
  methods: ['GET', 'GET', 'GET', 'GET'],
  patterns: [
    '/_nodes/usage',
    '/_nodes/{node_id}/usage',
    '/_nodes/usage/{metric}',
    '/_nodes/{node_id}/usage/{metric}',
  ],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-usage',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(nodes_usage_request, 'body'),
    getLooseObjectFromProperty(nodes_usage_request, 'path'),
    getLooseObjectFromProperty(nodes_usage_request, 'query'),
    getLooseObjectFromProperty(nodes_usage1_request, 'body'),
    getLooseObjectFromProperty(nodes_usage1_request, 'path'),
    getLooseObjectFromProperty(nodes_usage1_request, 'query'),
    getLooseObjectFromProperty(nodes_usage2_request, 'body'),
    getLooseObjectFromProperty(nodes_usage2_request, 'path'),
    getLooseObjectFromProperty(nodes_usage2_request, 'query'),
    getLooseObjectFromProperty(nodes_usage3_request, 'body'),
    getLooseObjectFromProperty(nodes_usage3_request, 'path'),
    getLooseObjectFromProperty(nodes_usage3_request, 'query'),
  ]),
  outputSchema: z.union([
    nodes_usage_response,
    nodes_usage1_response,
    nodes_usage2_response,
    nodes_usage3_response,
  ]),
};
const OPEN_POINT_IN_TIME_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.open_point_in_time',
  summary: `Open a point in time`,
  description: `Open a point in time.

A search request by default runs against the most recent visible data of the target indices,
which is called point in time. Elasticsearch pit (point in time) is a lightweight view into the
state of the data as it existed when initiated. In some cases, it’s preferred to perform multiple
search requests using the same point in time. For example, if refreshes happen between
\`search_after\` requests, then the results of those requests might not be consistent as changes happening
between searches are only visible to the more recent point in time.

A point in time must be opened explicitly before being used in search requests.

A subsequent search request with the \`pit\` parameter must not specify \`index\`, \`routing\`, or \`preference\` values as these parameters are copied from the point in time.

Just like regular searches, you can use \`from\` and \`size\` to page through point in time search results, up to the first 10,000 hits.
If you want to retrieve more hits, use PIT with \`search_after\`.

IMPORTANT: The open point in time request and each subsequent search request can return different identifiers; always use the most recently received ID for the next search request.

When a PIT that contains shard failures is used in a search request, the missing are always reported in the search response as a \`NoShardAvailableActionException\` exception.
To get rid of these exceptions, a new PIT needs to be created so that shards missing from the previous PIT can be handled, assuming they become available in the meantime.

**Keeping point in time alive**

The \`keep_alive\` parameter, which is passed to a open point in time request and search request, extends the time to live of the corresponding point in time.
The value does not need to be long enough to process all data — it just needs to be long enough for the next request.

Normally, the background merge process optimizes the index by merging together smaller segments to create new, bigger segments.
Once the smaller segments are no longer needed they are deleted.
However, open point-in-times prevent the old segments from being deleted since they are still in use.

TIP: Keeping older segments alive means that more disk space and file handles are needed.
Ensure that you have configured your nodes to have ample free file handles.

Additionally, if a segment contains deleted or updated documents then the point in time must keep track of whether each document in the segment was live at the time of the initial search request.
Ensure that your nodes have sufficient heap space if you have many open point-in-times on an index that is subject to ongoing deletes or updates.
Note that a point-in-time doesn't prevent its associated indices from being deleted.
You can check how many point-in-times (that is, search contexts) are open with the nodes stats API.`,
  methods: ['POST'],
  patterns: ['/{index}/_pit'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-open-point-in-time',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: [
      'keep_alive',
      'ignore_unavailable',
      'preference',
      'routing',
      'expand_wildcards',
      'allow_partial_search_results',
      'max_concurrent_shard_requests',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(open_point_in_time_request, 'body'),
    getLooseObjectFromProperty(open_point_in_time_request, 'path'),
    getLooseObjectFromProperty(open_point_in_time_request, 'query'),
  ]),
  outputSchema: open_point_in_time_response,
};
const PING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ping',
  summary: `Ping the cluster`,
  description: `Ping the cluster.
Get information about whether the cluster is running.`,
  methods: ['HEAD'],
  patterns: ['/'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-cluster',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ping_request, 'body'),
    getLooseObjectFromProperty(ping_request, 'path'),
    getLooseObjectFromProperty(ping_request, 'query'),
  ]),
  outputSchema: ping_response,
};
const PROFILING_FLAMEGRAPH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.profiling.flamegraph',
  summary: ``,
  description: `Extracts a UI-optimized structure to render flamegraphs from Universal Profiling`,
  methods: ['POST'],
  patterns: ['/_profiling/flamegraph'],
  isInternal: false,
  documentation: 'https://www.elastic.co/guide/en/observability/current/universal-profiling.html',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const PROFILING_STACKTRACES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.profiling.stacktraces',
  summary: ``,
  description: `Extracts raw stacktrace information from Universal Profiling`,
  methods: ['POST'],
  patterns: ['/_profiling/stacktraces'],
  isInternal: false,
  documentation: 'https://www.elastic.co/guide/en/observability/current/universal-profiling.html',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const PROFILING_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.profiling.status',
  summary: ``,
  description: `Returns basic information about the status of Universal Profiling`,
  methods: ['GET'],
  patterns: ['/_profiling/status'],
  isInternal: false,
  documentation: 'https://www.elastic.co/guide/en/observability/current/universal-profiling.html',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const PROFILING_TOPN_FUNCTIONS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.profiling.topn_functions',
  summary: ``,
  description: `Extracts a list of topN functions from Universal Profiling`,
  methods: ['POST'],
  patterns: ['/_profiling/topn/functions'],
  isInternal: false,
  documentation: 'https://www.elastic.co/guide/en/observability/current/universal-profiling.html',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const PROJECT_TAGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.project.tags',
  summary: ``,
  description: `Get tags.
Get the tags that are defined for the project.`,
  methods: ['GET'],
  patterns: ['/_project/tags'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch-serverless/operation/operation-project-tags',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const PUT_SCRIPT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.put_script',
  summary: `Create or update a script or search template`,
  description: `Create or update a script or search template.
Creates or updates a stored script or search template.`,
  methods: ['PUT', 'POST', 'PUT', 'POST'],
  patterns: ['/_scripts/{id}', '/_scripts/{id}/{context}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-put-script',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: ['master_timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_script_request, 'body'),
    getLooseObjectFromProperty(put_script_request, 'path'),
    getLooseObjectFromProperty(put_script_request, 'query'),
    getLooseObjectFromProperty(put_script1_request, 'body'),
    getLooseObjectFromProperty(put_script1_request, 'path'),
    getLooseObjectFromProperty(put_script1_request, 'query'),
    getLooseObjectFromProperty(put_script2_request, 'body'),
    getLooseObjectFromProperty(put_script2_request, 'path'),
    getLooseObjectFromProperty(put_script2_request, 'query'),
    getLooseObjectFromProperty(put_script3_request, 'body'),
    getLooseObjectFromProperty(put_script3_request, 'path'),
    getLooseObjectFromProperty(put_script3_request, 'query'),
  ]),
  outputSchema: z.union([
    put_script_response,
    put_script1_response,
    put_script2_response,
    put_script3_response,
  ]),
};
const QUERY_RULES_DELETE_RULE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.query_rules.delete_rule',
  summary: `Delete a query rule`,
  description: `Delete a query rule.
Delete a query rule within a query ruleset.
This is a destructive action that is only recoverable by re-adding the same rule with the create or update query rule API.`,
  methods: ['DELETE'],
  patterns: ['/_query_rules/{ruleset_id}/_rule/{rule_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-delete-rule',
  parameterTypes: {
    pathParams: ['ruleset_id', 'rule_id', 'ruleset_id', 'rule_id', 'ruleset_id', 'rule_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(query_rules_delete_rule_request, 'body'),
    getLooseObjectFromProperty(query_rules_delete_rule_request, 'path'),
    getLooseObjectFromProperty(query_rules_delete_rule_request, 'query'),
  ]),
  outputSchema: query_rules_delete_rule_response,
};
const QUERY_RULES_DELETE_RULESET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.query_rules.delete_ruleset',
  summary: `Delete a query ruleset`,
  description: `Delete a query ruleset.
Remove a query ruleset and its associated data.
This is a destructive action that is not recoverable.`,
  methods: ['DELETE'],
  patterns: ['/_query_rules/{ruleset_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-delete-ruleset',
  parameterTypes: {
    pathParams: ['ruleset_id', 'ruleset_id', 'ruleset_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(query_rules_delete_ruleset_request, 'body'),
    getLooseObjectFromProperty(query_rules_delete_ruleset_request, 'path'),
    getLooseObjectFromProperty(query_rules_delete_ruleset_request, 'query'),
  ]),
  outputSchema: query_rules_delete_ruleset_response,
};
const QUERY_RULES_GET_RULE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.query_rules.get_rule',
  summary: `Get a query rule`,
  description: `Get a query rule.
Get details about a query rule within a query ruleset.`,
  methods: ['GET'],
  patterns: ['/_query_rules/{ruleset_id}/_rule/{rule_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-get-rule',
  parameterTypes: {
    pathParams: ['ruleset_id', 'rule_id', 'ruleset_id', 'rule_id', 'ruleset_id', 'rule_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(query_rules_get_rule_request, 'body'),
    getLooseObjectFromProperty(query_rules_get_rule_request, 'path'),
    getLooseObjectFromProperty(query_rules_get_rule_request, 'query'),
  ]),
  outputSchema: query_rules_get_rule_response,
};
const QUERY_RULES_GET_RULESET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.query_rules.get_ruleset',
  summary: `Get a query ruleset`,
  description: `Get a query ruleset.
Get details about a query ruleset.`,
  methods: ['GET'],
  patterns: ['/_query_rules/{ruleset_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-get-ruleset',
  parameterTypes: {
    pathParams: ['ruleset_id', 'ruleset_id', 'ruleset_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(query_rules_get_ruleset_request, 'body'),
    getLooseObjectFromProperty(query_rules_get_ruleset_request, 'path'),
    getLooseObjectFromProperty(query_rules_get_ruleset_request, 'query'),
  ]),
  outputSchema: query_rules_get_ruleset_response,
};
const QUERY_RULES_LIST_RULESETS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.query_rules.list_rulesets',
  summary: `Get all query rulesets`,
  description: `Get all query rulesets.
Get summarized information about the query rulesets.`,
  methods: ['GET'],
  patterns: ['/_query_rules'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-list-rulesets',
  parameterTypes: {
    pathParams: [],
    urlParams: ['from', 'size'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(query_rules_list_rulesets_request, 'body'),
    getLooseObjectFromProperty(query_rules_list_rulesets_request, 'path'),
    getLooseObjectFromProperty(query_rules_list_rulesets_request, 'query'),
  ]),
  outputSchema: query_rules_list_rulesets_response,
};
const QUERY_RULES_PUT_RULE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.query_rules.put_rule',
  summary: `Create or update a query rule`,
  description: `Create or update a query rule.
Create or update a query rule within a query ruleset.

IMPORTANT: Due to limitations within pinned queries, you can only pin documents using ids or docs, but cannot use both in single rule.
It is advised to use one or the other in query rulesets, to avoid errors.
Additionally, pinned queries have a maximum limit of 100 pinned hits.
If multiple matching rules pin more than 100 documents, only the first 100 documents are pinned in the order they are specified in the ruleset.`,
  methods: ['PUT'],
  patterns: ['/_query_rules/{ruleset_id}/_rule/{rule_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-put-rule',
  parameterTypes: {
    pathParams: ['ruleset_id', 'rule_id', 'ruleset_id', 'rule_id', 'ruleset_id', 'rule_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(query_rules_put_rule_request, 'body'),
    getLooseObjectFromProperty(query_rules_put_rule_request, 'path'),
    getLooseObjectFromProperty(query_rules_put_rule_request, 'query'),
  ]),
  outputSchema: query_rules_put_rule_response,
};
const QUERY_RULES_PUT_RULESET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.query_rules.put_ruleset',
  summary: `Create or update a query ruleset`,
  description: `Create or update a query ruleset.
There is a limit of 100 rules per ruleset.
This limit can be increased by using the \`xpack.applications.rules.max_rules_per_ruleset\` cluster setting.

IMPORTANT: Due to limitations within pinned queries, you can only select documents using \`ids\` or \`docs\`, but cannot use both in single rule.
It is advised to use one or the other in query rulesets, to avoid errors.
Additionally, pinned queries have a maximum limit of 100 pinned hits.
If multiple matching rules pin more than 100 documents, only the first 100 documents are pinned in the order they are specified in the ruleset.`,
  methods: ['PUT'],
  patterns: ['/_query_rules/{ruleset_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-put-ruleset',
  parameterTypes: {
    pathParams: ['ruleset_id', 'ruleset_id', 'ruleset_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(query_rules_put_ruleset_request, 'body'),
    getLooseObjectFromProperty(query_rules_put_ruleset_request, 'path'),
    getLooseObjectFromProperty(query_rules_put_ruleset_request, 'query'),
  ]),
  outputSchema: query_rules_put_ruleset_response,
};
const QUERY_RULES_TEST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.query_rules.test',
  summary: `Test a query ruleset`,
  description: `Test a query ruleset.
Evaluate match criteria against a query ruleset to identify the rules that would match that criteria.`,
  methods: ['POST'],
  patterns: ['/_query_rules/{ruleset_id}/_test'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-test',
  parameterTypes: {
    pathParams: ['ruleset_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(query_rules_test_request, 'body'),
    getLooseObjectFromProperty(query_rules_test_request, 'path'),
    getLooseObjectFromProperty(query_rules_test_request, 'query'),
  ]),
  outputSchema: query_rules_test_response,
};
const RANK_EVAL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rank_eval',
  summary: `Evaluate ranked search results`,
  description: `Evaluate ranked search results.

Evaluate the quality of ranked search results over a set of typical search queries.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_rank_eval', '/{index}/_rank_eval'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rank-eval',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(rank_eval_request, 'body'),
    getLooseObjectFromProperty(rank_eval_request, 'path'),
    getLooseObjectFromProperty(rank_eval_request, 'query'),
    getLooseObjectFromProperty(rank_eval1_request, 'body'),
    getLooseObjectFromProperty(rank_eval1_request, 'path'),
    getLooseObjectFromProperty(rank_eval1_request, 'query'),
    getLooseObjectFromProperty(rank_eval2_request, 'body'),
    getLooseObjectFromProperty(rank_eval2_request, 'path'),
    getLooseObjectFromProperty(rank_eval2_request, 'query'),
    getLooseObjectFromProperty(rank_eval3_request, 'body'),
    getLooseObjectFromProperty(rank_eval3_request, 'path'),
    getLooseObjectFromProperty(rank_eval3_request, 'query'),
  ]),
  outputSchema: z.union([
    rank_eval_response,
    rank_eval1_response,
    rank_eval2_response,
    rank_eval3_response,
  ]),
};
const REINDEX_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.reindex',
  summary: `Reindex documents`,
  description: `Reindex documents.

Copy documents from a source to a destination.
You can copy all documents to the destination index or reindex a subset of the documents.
The source can be any existing index, alias, or data stream.
The destination must differ from the source.
For example, you cannot reindex a data stream into itself.

IMPORTANT: Reindex requires \`_source\` to be enabled for all documents in the source.
The destination should be configured as wanted before calling the reindex API.
Reindex does not copy the settings from the source or its associated template.
Mappings, shard counts, and replicas, for example, must be configured ahead of time.

If the Elasticsearch security features are enabled, you must have the following security privileges:

* The \`read\` index privilege for the source data stream, index, or alias.
* The \`write\` index privilege for the destination data stream, index, or index alias.
* To automatically create a data stream or index with a reindex API request, you must have the \`auto_configure\`, \`create_index\`, or \`manage\` index privilege for the destination data stream, index, or alias.
* If reindexing from a remote cluster, the \`source.remote.user\` must have the \`monitor\` cluster privilege and the \`read\` index privilege for the source data stream, index, or alias.

If reindexing from a remote cluster, you must explicitly allow the remote host in the \`reindex.remote.whitelist\` setting.
Automatic data stream creation requires a matching index template with data stream enabled.

The \`dest\` element can be configured like the index API to control optimistic concurrency control.
Omitting \`version_type\` or setting it to \`internal\` causes Elasticsearch to blindly dump documents into the destination, overwriting any that happen to have the same ID.

Setting \`version_type\` to \`external\` causes Elasticsearch to preserve the \`version\` from the source, create any documents that are missing, and update any documents that have an older version in the destination than they do in the source.

Setting \`op_type\` to \`create\` causes the reindex API to create only missing documents in the destination.
All existing documents will cause a version conflict.

IMPORTANT: Because data streams are append-only, any reindex request to a destination data stream must have an \`op_type\` of \`create\`.
A reindex can only add new documents to a destination data stream.
It cannot update existing documents in a destination data stream.

By default, version conflicts abort the reindex process.
To continue reindexing if there are conflicts, set the \`conflicts\` request body property to \`proceed\`.
In this case, the response includes a count of the version conflicts that were encountered.
Note that the handling of other error types is unaffected by the \`conflicts\` property.
Additionally, if you opt to count version conflicts, the operation could attempt to reindex more documents from the source than \`max_docs\` until it has successfully indexed \`max_docs\` documents into the target or it has gone through every document in the source query.

It's recommended to reindex on indices with a green status. Reindexing can fail when a node shuts down or crashes.
* When requested with \`wait_for_completion=true\` (default), the request fails if the node shuts down.
* When requested with \`wait_for_completion=false\`, a task id is returned, for use with the task management APIs. The task may disappear or fail if the node shuts down.
When retrying a failed reindex operation, it might be necessary to set \`conflicts=proceed\` or to first delete the partial destination index.
Additionally, dry runs, checking disk space, and fetching index recovery information can help address the root cause.

Refer to the linked documentation for examples of how to reindex documents.`,
  methods: ['POST'],
  patterns: ['/_reindex'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-reindex',
  parameterTypes: {
    pathParams: [],
    urlParams: [
      'refresh',
      'requests_per_second',
      'scroll',
      'slices',
      'max_docs',
      'timeout',
      'wait_for_active_shards',
      'wait_for_completion',
      'require_alias',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(reindex_request, 'body'),
    getLooseObjectFromProperty(reindex_request, 'path'),
    getLooseObjectFromProperty(reindex_request, 'query'),
  ]),
  outputSchema: reindex_response,
};
const REINDEX_RETHROTTLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.reindex_rethrottle',
  summary: `Throttle a reindex operation`,
  description: `Throttle a reindex operation.

Change the number of requests per second for a particular reindex operation.
For example:

\`\`\`
POST _reindex/r1A2WoRbTwKZ516z6NEs5A:36619/_rethrottle?requests_per_second=-1
\`\`\`

Rethrottling that speeds up the query takes effect immediately.
Rethrottling that slows down the query will take effect after completing the current batch.
This behavior prevents scroll timeouts.`,
  methods: ['POST'],
  patterns: ['/_reindex/{task_id}/_rethrottle'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-reindex',
  parameterTypes: {
    pathParams: ['task_id'],
    urlParams: ['requests_per_second'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(reindex_rethrottle_request, 'body'),
    getLooseObjectFromProperty(reindex_rethrottle_request, 'path'),
    getLooseObjectFromProperty(reindex_rethrottle_request, 'query'),
  ]),
  outputSchema: reindex_rethrottle_response,
};
const RENDER_SEARCH_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.render_search_template',
  summary: `Render a search template`,
  description: `Render a search template.

Render a search template as a search request body.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_render/template', '/_render/template/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-render-search-template',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(render_search_template_request, 'body'),
    getLooseObjectFromProperty(render_search_template_request, 'path'),
    getLooseObjectFromProperty(render_search_template_request, 'query'),
    getLooseObjectFromProperty(render_search_template1_request, 'body'),
    getLooseObjectFromProperty(render_search_template1_request, 'path'),
    getLooseObjectFromProperty(render_search_template1_request, 'query'),
    getLooseObjectFromProperty(render_search_template2_request, 'body'),
    getLooseObjectFromProperty(render_search_template2_request, 'path'),
    getLooseObjectFromProperty(render_search_template2_request, 'query'),
    getLooseObjectFromProperty(render_search_template3_request, 'body'),
    getLooseObjectFromProperty(render_search_template3_request, 'path'),
    getLooseObjectFromProperty(render_search_template3_request, 'query'),
  ]),
  outputSchema: z.union([
    render_search_template_response,
    render_search_template1_response,
    render_search_template2_response,
    render_search_template3_response,
  ]),
};
const ROLLUP_DELETE_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rollup.delete_job',
  summary: `Delete a rollup job`,
  description: `Delete a rollup job.

A job must be stopped before it can be deleted.
If you attempt to delete a started job, an error occurs.
Similarly, if you attempt to delete a nonexistent job, an exception occurs.

IMPORTANT: When you delete a job, you remove only the process that is actively monitoring and rolling up data.
The API does not delete any previously rolled up data.
This is by design; a user may wish to roll up a static data set.
Because the data set is static, after it has been fully rolled up there is no need to keep the indexing rollup job around (as there will be no new data).
Thus the job can be deleted, leaving behind the rolled up data for analysis.
If you wish to also remove the rollup data and the rollup index contains the data for only a single job, you can delete the whole rollup index.
If the rollup index stores data from several jobs, you must issue a delete-by-query that targets the rollup job's identifier in the rollup index. For example:

\`\`\`
POST my_rollup_index/_delete_by_query
{
  "query": {
    "term": {
      "_rollup.id": "the_rollup_job_id"
    }
  }
}
\`\`\``,
  methods: ['DELETE'],
  patterns: ['/_rollup/job/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-delete-job',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(rollup_delete_job_request, 'body'),
    getLooseObjectFromProperty(rollup_delete_job_request, 'path'),
    getLooseObjectFromProperty(rollup_delete_job_request, 'query'),
  ]),
  outputSchema: rollup_delete_job_response,
};
const ROLLUP_GET_JOBS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rollup.get_jobs',
  summary: `Get rollup job information`,
  description: `Get rollup job information.
Get the configuration, stats, and status of rollup jobs.

NOTE: This API returns only active (both \`STARTED\` and \`STOPPED\`) jobs.
If a job was created, ran for a while, then was deleted, the API does not return any details about it.
For details about a historical rollup job, the rollup capabilities API may be more useful.`,
  methods: ['GET', 'GET'],
  patterns: ['/_rollup/job/{id}', '/_rollup/job'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-get-jobs',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(rollup_get_jobs_request, 'body'),
    getLooseObjectFromProperty(rollup_get_jobs_request, 'path'),
    getLooseObjectFromProperty(rollup_get_jobs_request, 'query'),
    getLooseObjectFromProperty(rollup_get_jobs1_request, 'body'),
    getLooseObjectFromProperty(rollup_get_jobs1_request, 'path'),
    getLooseObjectFromProperty(rollup_get_jobs1_request, 'query'),
  ]),
  outputSchema: z.union([rollup_get_jobs_response, rollup_get_jobs1_response]),
};
const ROLLUP_GET_ROLLUP_CAPS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rollup.get_rollup_caps',
  summary: `Get the rollup job capabilities`,
  description: `Get the rollup job capabilities.
Get the capabilities of any rollup jobs that have been configured for a specific index or index pattern.

This API is useful because a rollup job is often configured to rollup only a subset of fields from the source index.
Furthermore, only certain aggregations can be configured for various fields, leading to a limited subset of functionality depending on that configuration.
This API enables you to inspect an index and determine:

1. Does this index have associated rollup data somewhere in the cluster?
2. If yes to the first question, what fields were rolled up, what aggregations can be performed, and where does the data live?`,
  methods: ['GET', 'GET'],
  patterns: ['/_rollup/data/{id}', '/_rollup/data'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-get-rollup-caps',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(rollup_get_rollup_caps_request, 'body'),
    getLooseObjectFromProperty(rollup_get_rollup_caps_request, 'path'),
    getLooseObjectFromProperty(rollup_get_rollup_caps_request, 'query'),
    getLooseObjectFromProperty(rollup_get_rollup_caps1_request, 'body'),
    getLooseObjectFromProperty(rollup_get_rollup_caps1_request, 'path'),
    getLooseObjectFromProperty(rollup_get_rollup_caps1_request, 'query'),
  ]),
  outputSchema: z.union([rollup_get_rollup_caps_response, rollup_get_rollup_caps1_response]),
};
const ROLLUP_GET_ROLLUP_INDEX_CAPS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rollup.get_rollup_index_caps',
  summary: `Get the rollup index capabilities`,
  description: `Get the rollup index capabilities.
Get the rollup capabilities of all jobs inside of a rollup index.
A single rollup index may store the data for multiple rollup jobs and may have a variety of capabilities depending on those jobs. This API enables you to determine:

* What jobs are stored in an index (or indices specified via a pattern)?
* What target indices were rolled up, what fields were used in those rollups, and what aggregations can be performed on each job?`,
  methods: ['GET'],
  patterns: ['/{index}/_rollup/data'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-get-rollup-index-caps',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(rollup_get_rollup_index_caps_request, 'body'),
    getLooseObjectFromProperty(rollup_get_rollup_index_caps_request, 'path'),
    getLooseObjectFromProperty(rollup_get_rollup_index_caps_request, 'query'),
  ]),
  outputSchema: rollup_get_rollup_index_caps_response,
};
const ROLLUP_PUT_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rollup.put_job',
  summary: `Create a rollup job`,
  description: `Create a rollup job.

WARNING: From 8.15.0, calling this API in a cluster with no rollup usage will fail with a message about the deprecation and planned removal of rollup features. A cluster needs to contain either a rollup job or a rollup index in order for this API to be allowed to run.

The rollup job configuration contains all the details about how the job should run, when it indexes documents, and what future queries will be able to run against the rollup index.

There are three main sections to the job configuration: the logistical details about the job (for example, the cron schedule), the fields that are used for grouping, and what metrics to collect for each group.

Jobs are created in a \`STOPPED\` state. You can start them with the start rollup jobs API.`,
  methods: ['PUT'],
  patterns: ['/_rollup/job/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-put-job',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(rollup_put_job_request, 'body'),
    getLooseObjectFromProperty(rollup_put_job_request, 'path'),
    getLooseObjectFromProperty(rollup_put_job_request, 'query'),
  ]),
  outputSchema: rollup_put_job_response,
};
const ROLLUP_ROLLUP_SEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rollup.rollup_search',
  summary: `Search rolled-up data`,
  description: `Search rolled-up data.
The rollup search endpoint is needed because, internally, rolled-up documents utilize a different document structure than the original data.
It rewrites standard Query DSL into a format that matches the rollup documents then takes the response and rewrites it back to what a client would expect given the original query.

The request body supports a subset of features from the regular search API.
The following functionality is not available:

\`size\`: Because rollups work on pre-aggregated data, no search hits can be returned and so size must be set to zero or omitted entirely.
\`highlighter\`, \`suggestors\`, \`post_filter\`, \`profile\`, \`explain\`: These are similarly disallowed.

For more detailed examples of using the rollup search API, including querying rolled-up data only or combining rolled-up and live data, refer to the External documentation.`,
  methods: ['GET', 'POST'],
  patterns: ['/{index}/_rollup_search'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-rollup-search',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(rollup_rollup_search_request, 'body'),
    getLooseObjectFromProperty(rollup_rollup_search_request, 'path'),
    getLooseObjectFromProperty(rollup_rollup_search_request, 'query'),
    getLooseObjectFromProperty(rollup_rollup_search1_request, 'body'),
    getLooseObjectFromProperty(rollup_rollup_search1_request, 'path'),
    getLooseObjectFromProperty(rollup_rollup_search1_request, 'query'),
  ]),
  outputSchema: z.union([rollup_rollup_search_response, rollup_rollup_search1_response]),
};
const ROLLUP_START_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rollup.start_job',
  summary: `Start rollup jobs`,
  description: `Start rollup jobs.
If you try to start a job that does not exist, an exception occurs.
If you try to start a job that is already started, nothing happens.`,
  methods: ['POST'],
  patterns: ['/_rollup/job/{id}/_start'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-start-job',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(rollup_start_job_request, 'body'),
    getLooseObjectFromProperty(rollup_start_job_request, 'path'),
    getLooseObjectFromProperty(rollup_start_job_request, 'query'),
  ]),
  outputSchema: rollup_start_job_response,
};
const ROLLUP_STOP_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rollup.stop_job',
  summary: `Stop rollup jobs`,
  description: `Stop rollup jobs.
If you try to stop a job that does not exist, an exception occurs.
If you try to stop a job that is already stopped, nothing happens.

Since only a stopped job can be deleted, it can be useful to block the API until the indexer has fully stopped.
This is accomplished with the \`wait_for_completion\` query parameter, and optionally a timeout. For example:

\`\`\`
POST _rollup/job/sensor/_stop?wait_for_completion=true&timeout=10s
\`\`\`
The parameter blocks the API call from returning until either the job has moved to STOPPED or the specified time has elapsed.
If the specified time elapses without the job moving to STOPPED, a timeout exception occurs.`,
  methods: ['POST'],
  patterns: ['/_rollup/job/{id}/_stop'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-stop-job',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: ['timeout', 'wait_for_completion'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(rollup_stop_job_request, 'body'),
    getLooseObjectFromProperty(rollup_stop_job_request, 'path'),
    getLooseObjectFromProperty(rollup_stop_job_request, 'query'),
  ]),
  outputSchema: rollup_stop_job_response,
};
const SCRIPTS_PAINLESS_EXECUTE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.scripts_painless_execute',
  summary: `Run a script`,
  description: `Run a script.

Runs a script and returns a result.
Use this API to build and test scripts, such as when defining a script for a runtime field.
This API requires very few dependencies and is especially useful if you don't have permissions to write documents on a cluster.

The API uses several _contexts_, which control how scripts are run, what variables are available at runtime, and what the return type is.

Each context requires a script, but additional parameters depend on the context you're using for that script.`,
  methods: ['GET', 'POST'],
  patterns: ['/_scripts/painless/_execute'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/reference/scripting-languages/painless/painless-api-examples',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(scripts_painless_execute_request, 'body'),
    getLooseObjectFromProperty(scripts_painless_execute_request, 'path'),
    getLooseObjectFromProperty(scripts_painless_execute_request, 'query'),
    getLooseObjectFromProperty(scripts_painless_execute1_request, 'body'),
    getLooseObjectFromProperty(scripts_painless_execute1_request, 'path'),
    getLooseObjectFromProperty(scripts_painless_execute1_request, 'query'),
  ]),
  outputSchema: z.union([scripts_painless_execute_response, scripts_painless_execute1_response]),
};
const SCROLL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.scroll',
  summary: `Run a scrolling search`,
  description: `Run a scrolling search.

IMPORTANT: The scroll API is no longer recommend for deep pagination. If you need to preserve the index state while paging through more than 10,000 hits, use the \`search_after\` parameter with a point in time (PIT).

The scroll API gets large sets of results from a single scrolling search request.
To get the necessary scroll ID, submit a search API request that includes an argument for the \`scroll\` query parameter.
The \`scroll\` parameter indicates how long Elasticsearch should retain the search context for the request.
The search response returns a scroll ID in the \`_scroll_id\` response body parameter.
You can then use the scroll ID with the scroll API to retrieve the next batch of results for the request.
If the Elasticsearch security features are enabled, the access to the results of a specific scroll ID is restricted to the user or API key that submitted the search.

You can also use the scroll API to specify a new scroll parameter that extends or shortens the retention period for the search context.

IMPORTANT: Results from a scrolling search reflect the state of the index at the time of the initial search request. Subsequent indexing or document changes only affect later search and scroll requests.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_search/scroll', '/_search/scroll/{scroll_id}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-scroll',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(scroll_request, 'body'),
    getLooseObjectFromProperty(scroll_request, 'path'),
    getLooseObjectFromProperty(scroll_request, 'query'),
    getLooseObjectFromProperty(scroll1_request, 'body'),
    getLooseObjectFromProperty(scroll1_request, 'path'),
    getLooseObjectFromProperty(scroll1_request, 'query'),
    getLooseObjectFromProperty(scroll2_request, 'body'),
    getLooseObjectFromProperty(scroll2_request, 'path'),
    getLooseObjectFromProperty(scroll2_request, 'query'),
    getLooseObjectFromProperty(scroll3_request, 'body'),
    getLooseObjectFromProperty(scroll3_request, 'path'),
    getLooseObjectFromProperty(scroll3_request, 'query'),
  ]),
  outputSchema: z.union([scroll_response, scroll1_response, scroll2_response, scroll3_response]),
};
const SEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search',
  summary: `Run a search`,
  description: `Run a search.

Get search hits that match the query defined in the request.
You can provide search queries using the \`q\` query string parameter or the request body.
If both are specified, only the query parameter is used.

If the Elasticsearch security features are enabled, you must have the read index privilege for the target data stream, index, or alias. For cross-cluster search, refer to the documentation about configuring CCS privileges.
To search a point in time (PIT) for an alias, you must have the \`read\` index privilege for the alias's data streams or indices.

**Search slicing**

When paging through a large number of documents, it can be helpful to split the search into multiple slices to consume them independently with the \`slice\` and \`pit\` properties.
By default the splitting is done first on the shards, then locally on each shard.
The local splitting partitions the shard into contiguous ranges based on Lucene document IDs.

For instance if the number of shards is equal to 2 and you request 4 slices, the slices 0 and 2 are assigned to the first shard and the slices 1 and 3 are assigned to the second shard.

IMPORTANT: The same point-in-time ID should be used for all slices.
If different PIT IDs are used, slices can overlap and miss documents.
This situation can occur because the splitting criterion is based on Lucene document IDs, which are not stable across changes to the index.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_search', '/{index}/_search'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(search_request, 'body'),
    getLooseObjectFromProperty(search_request, 'path'),
    getLooseObjectFromProperty(search_request, 'query'),
    getLooseObjectFromProperty(search1_request, 'body'),
    getLooseObjectFromProperty(search1_request, 'path'),
    getLooseObjectFromProperty(search1_request, 'query'),
    getLooseObjectFromProperty(search2_request, 'body'),
    getLooseObjectFromProperty(search2_request, 'path'),
    getLooseObjectFromProperty(search2_request, 'query'),
    getLooseObjectFromProperty(search3_request, 'body'),
    getLooseObjectFromProperty(search3_request, 'path'),
    getLooseObjectFromProperty(search3_request, 'query'),
  ]),
  outputSchema: z.union([search_response, search1_response, search2_response, search3_response]),
};
const SEARCH_APPLICATION_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.delete',
  summary: `Delete a search application`,
  description: `Delete a search application.

Remove a search application and its associated alias. Indices attached to the search application are not removed.`,
  methods: ['DELETE'],
  patterns: ['/_application/search_application/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-delete',
  parameterTypes: {
    pathParams: ['name', 'name', 'name'],
    urlParams: ['create'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(search_application_delete_request, 'body'),
    getLooseObjectFromProperty(search_application_delete_request, 'path'),
    getLooseObjectFromProperty(search_application_delete_request, 'query'),
  ]),
  outputSchema: search_application_delete_response,
};
const SEARCH_APPLICATION_DELETE_BEHAVIORAL_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.delete_behavioral_analytics',
  summary: `Delete a behavioral analytics collection`,
  description: `Delete a behavioral analytics collection.
The associated data stream is also deleted.`,
  methods: ['DELETE'],
  patterns: ['/_application/analytics/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-delete-behavioral-analytics',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(search_application_delete_behavioral_analytics_request, 'body'),
    getLooseObjectFromProperty(search_application_delete_behavioral_analytics_request, 'path'),
    getLooseObjectFromProperty(search_application_delete_behavioral_analytics_request, 'query'),
  ]),
  outputSchema: search_application_delete_behavioral_analytics_response,
};
const SEARCH_APPLICATION_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.get',
  summary: `Get search application details`,
  description: `Get search application details.`,
  methods: ['GET'],
  patterns: ['/_application/search_application/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-get',
  parameterTypes: {
    pathParams: ['name', 'name', 'name'],
    urlParams: ['create'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(search_application_get_request, 'body'),
    getLooseObjectFromProperty(search_application_get_request, 'path'),
    getLooseObjectFromProperty(search_application_get_request, 'query'),
  ]),
  outputSchema: search_application_get_response,
};
const SEARCH_APPLICATION_GET_BEHAVIORAL_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.get_behavioral_analytics',
  summary: `Get behavioral analytics collections`,
  description: `Get behavioral analytics collections.`,
  methods: ['GET', 'GET'],
  patterns: ['/_application/analytics', '/_application/analytics/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-get-behavioral-analytics',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(search_application_get_behavioral_analytics_request, 'body'),
    getLooseObjectFromProperty(search_application_get_behavioral_analytics_request, 'path'),
    getLooseObjectFromProperty(search_application_get_behavioral_analytics_request, 'query'),
    getLooseObjectFromProperty(search_application_get_behavioral_analytics1_request, 'body'),
    getLooseObjectFromProperty(search_application_get_behavioral_analytics1_request, 'path'),
    getLooseObjectFromProperty(search_application_get_behavioral_analytics1_request, 'query'),
  ]),
  outputSchema: z.union([
    search_application_get_behavioral_analytics_response,
    search_application_get_behavioral_analytics1_response,
  ]),
};
const SEARCH_APPLICATION_LIST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.list',
  summary: `Get search applications`,
  description: `Get search applications.
Get information about search applications.`,
  methods: ['GET'],
  patterns: ['/_application/search_application'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-get-behavioral-analytics',
  parameterTypes: {
    pathParams: [],
    urlParams: ['q', 'from', 'size'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(search_application_list_request, 'body'),
    getLooseObjectFromProperty(search_application_list_request, 'path'),
    getLooseObjectFromProperty(search_application_list_request, 'query'),
  ]),
  outputSchema: search_application_list_response,
};
const SEARCH_APPLICATION_POST_BEHAVIORAL_ANALYTICS_EVENT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.post_behavioral_analytics_event',
  summary: `Create a behavioral analytics collection event`,
  description: `Create a behavioral analytics collection event.`,
  methods: ['POST'],
  patterns: ['/_application/analytics/{collection_name}/event/{event_type}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-post-behavioral-analytics-event',
  parameterTypes: {
    pathParams: ['collection_name', 'event_type'],
    urlParams: ['debug'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(search_application_post_behavioral_analytics_event_request, 'body'),
    getLooseObjectFromProperty(search_application_post_behavioral_analytics_event_request, 'path'),
    getLooseObjectFromProperty(search_application_post_behavioral_analytics_event_request, 'query'),
  ]),
  outputSchema: search_application_post_behavioral_analytics_event_response,
};
const SEARCH_APPLICATION_PUT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.put',
  summary: `Create or update a search application`,
  description: `Create or update a search application.`,
  methods: ['PUT'],
  patterns: ['/_application/search_application/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-put',
  parameterTypes: {
    pathParams: ['name', 'name', 'name'],
    urlParams: ['create'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(search_application_put_request, 'body'),
    getLooseObjectFromProperty(search_application_put_request, 'path'),
    getLooseObjectFromProperty(search_application_put_request, 'query'),
  ]),
  outputSchema: search_application_put_response,
};
const SEARCH_APPLICATION_PUT_BEHAVIORAL_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.put_behavioral_analytics',
  summary: `Create a behavioral analytics collection`,
  description: `Create a behavioral analytics collection.`,
  methods: ['PUT'],
  patterns: ['/_application/analytics/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-put-behavioral-analytics',
  parameterTypes: {
    pathParams: ['name', 'name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(search_application_put_behavioral_analytics_request, 'body'),
    getLooseObjectFromProperty(search_application_put_behavioral_analytics_request, 'path'),
    getLooseObjectFromProperty(search_application_put_behavioral_analytics_request, 'query'),
  ]),
  outputSchema: search_application_put_behavioral_analytics_response,
};
const SEARCH_APPLICATION_RENDER_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.render_query',
  summary: `Render a search application query`,
  description: `Render a search application query.
Generate an Elasticsearch query using the specified query parameters and the search template associated with the search application or a default template if none is specified.
If a parameter used in the search template is not specified in \`params\`, the parameter's default value will be used.
The API returns the specific Elasticsearch query that would be generated and run by calling the search application search API.

You must have \`read\` privileges on the backing alias of the search application.`,
  methods: ['POST'],
  patterns: ['/_application/search_application/{name}/_render_query'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-render-query',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(search_application_render_query_request, 'body'),
    getLooseObjectFromProperty(search_application_render_query_request, 'path'),
    getLooseObjectFromProperty(search_application_render_query_request, 'query'),
  ]),
  outputSchema: search_application_render_query_response,
};
const SEARCH_APPLICATION_SEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.search',
  summary: `Run a search application search`,
  description: `Run a search application search.
Generate and run an Elasticsearch query that uses the specified query parameteter and the search template associated with the search application or default template.
Unspecified template parameters are assigned their default values if applicable.`,
  methods: ['GET', 'POST'],
  patterns: ['/_application/search_application/{name}/_search'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-search',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(search_application_search_request, 'body'),
    getLooseObjectFromProperty(search_application_search_request, 'path'),
    getLooseObjectFromProperty(search_application_search_request, 'query'),
    getLooseObjectFromProperty(search_application_search1_request, 'body'),
    getLooseObjectFromProperty(search_application_search1_request, 'path'),
    getLooseObjectFromProperty(search_application_search1_request, 'query'),
  ]),
  outputSchema: z.union([search_application_search_response, search_application_search1_response]),
};
const SEARCH_MVT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_mvt',
  summary: `Search a vector tile`,
  description: `Search a vector tile.

Search a vector tile for geospatial values.
Before using this API, you should be familiar with the Mapbox vector tile specification.
The API returns results as a binary mapbox vector tile.

Internally, Elasticsearch translates a vector tile search API request into a search containing:

* A \`geo_bounding_box\` query on the \`<field>\`. The query uses the \`<zoom>/<x>/<y>\` tile as a bounding box.
* A \`geotile_grid\` or \`geohex_grid\` aggregation on the \`<field>\`. The \`grid_agg\` parameter determines the aggregation type. The aggregation uses the \`<zoom>/<x>/<y>\` tile as a bounding box.
* Optionally, a \`geo_bounds\` aggregation on the \`<field>\`. The search only includes this aggregation if the \`exact_bounds\` parameter is \`true\`.
* If the optional parameter \`with_labels\` is \`true\`, the internal search will include a dynamic runtime field that calls the \`getLabelPosition\` function of the geometry doc value. This enables the generation of new point features containing suggested geometry labels, so that, for example, multi-polygons will have only one label.

The API returns results as a binary Mapbox vector tile.
Mapbox vector tiles are encoded as Google Protobufs (PBF). By default, the tile contains three layers:

* A \`hits\` layer containing a feature for each \`<field>\` value matching the \`geo_bounding_box\` query.
* An \`aggs\` layer containing a feature for each cell of the \`geotile_grid\` or \`geohex_grid\`. The layer only contains features for cells with matching data.
* A meta layer containing:
  * A feature containing a bounding box. By default, this is the bounding box of the tile.
  * Value ranges for any sub-aggregations on the \`geotile_grid\` or \`geohex_grid\`.
  * Metadata for the search.

The API only returns features that can display at its zoom level.
For example, if a polygon feature has no area at its zoom level, the API omits it.
The API returns errors as UTF-8 encoded JSON.

IMPORTANT: You can specify several options for this API as either a query parameter or request body parameter.
If you specify both parameters, the query parameter takes precedence.

**Grid precision for geotile**

For a \`grid_agg\` of \`geotile\`, you can use cells in the \`aggs\` layer as tiles for lower zoom levels.
\`grid_precision\` represents the additional zoom levels available through these cells. The final precision is computed by as follows: \`<zoom> + grid_precision\`.
For example, if \`<zoom>\` is 7 and \`grid_precision\` is 8, then the \`geotile_grid\` aggregation will use a precision of 15.
The maximum final precision is 29.
The \`grid_precision\` also determines the number of cells for the grid as follows: \`(2^grid_precision) x (2^grid_precision)\`.
For example, a value of 8 divides the tile into a grid of 256 x 256 cells.
The \`aggs\` layer only contains features for cells with matching data.

**Grid precision for geohex**

For a \`grid_agg\` of \`geohex\`, Elasticsearch uses \`<zoom>\` and \`grid_precision\` to calculate a final precision as follows: \`<zoom> + grid_precision\`.

This precision determines the H3 resolution of the hexagonal cells produced by the \`geohex\` aggregation.
The following table maps the H3 resolution for each precision.
For example, if \`<zoom>\` is 3 and \`grid_precision\` is 3, the precision is 6.
At a precision of 6, hexagonal cells have an H3 resolution of 2.
If \`<zoom>\` is 3 and \`grid_precision\` is 4, the precision is 7.
At a precision of 7, hexagonal cells have an H3 resolution of 3.

| Precision | Unique tile bins | H3 resolution | Unique hex bins |	Ratio |
| --------- | ---------------- | ------------- | ----------------| ----- |
| 1  | 4                  | 0  | 122             | 30.5           |
| 2  | 16                 | 0  | 122             | 7.625          |
| 3  | 64                 | 1  | 842             | 13.15625       |
| 4  | 256                | 1  | 842             | 3.2890625      |
| 5  | 1024               | 2  | 5882            | 5.744140625    |
| 6  | 4096               | 2  | 5882            | 1.436035156    |
| 7  | 16384              | 3  | 41162           | 2.512329102    |
| 8  | 65536              | 3  | 41162           | 0.6280822754   |
| 9  | 262144             | 4  | 288122          | 1.099098206    |
| 10 | 1048576            | 4  | 288122          | 0.2747745514   |
| 11 | 4194304            | 5  | 2016842         | 0.4808526039   |
| 12 | 16777216           | 6  | 14117882        | 0.8414913416   |
| 13 | 67108864           | 6  | 14117882        | 0.2103728354   |
| 14 | 268435456          | 7  | 98825162        | 0.3681524172   |
| 15 | 1073741824         | 8  | 691776122       | 0.644266719    |
| 16 | 4294967296         | 8  | 691776122       | 0.1610666797   |
| 17 | 17179869184        | 9  | 4842432842      | 0.2818666889   |
| 18 | 68719476736        | 10 | 33897029882     | 0.4932667053   |
| 19 | 274877906944       | 11 | 237279209162    | 0.8632167343   |
| 20 | 1099511627776      | 11 | 237279209162    | 0.2158041836   |
| 21 | 4398046511104      | 12 | 1660954464122   | 0.3776573213   |
| 22 | 17592186044416     | 13 | 11626681248842  | 0.6609003122   |
| 23 | 70368744177664     | 13 | 11626681248842  | 0.165225078    |
| 24 | 281474976710656    | 14 | 81386768741882  | 0.2891438866   |
| 25 | 1125899906842620   | 15 | 569707381193162 | 0.5060018015   |
| 26 | 4503599627370500   | 15 | 569707381193162 | 0.1265004504   |
| 27 | 18014398509482000  | 15 | 569707381193162 | 0.03162511259  |
| 28 | 72057594037927900  | 15 | 569707381193162 | 0.007906278149 |
| 29 | 288230376151712000 | 15 | 569707381193162 | 0.001976569537 |

Hexagonal cells don't align perfectly on a vector tile.
Some cells may intersect more than one vector tile.
To compute the H3 resolution for each precision, Elasticsearch compares the average density of hexagonal bins at each resolution with the average density of tile bins at each zoom level.
Elasticsearch uses the H3 resolution that is closest to the corresponding geotile density.

Learn how to use the vector tile search API with practical examples in the [Vector tile search examples](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/vector-tile-search) guide.`,
  methods: ['POST', 'GET'],
  patterns: ['/{index}/_mvt/{field}/{zoom}/{x}/{y}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-mvt',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(search_mvt_request, 'body'),
    getLooseObjectFromProperty(search_mvt_request, 'path'),
    getLooseObjectFromProperty(search_mvt_request, 'query'),
    getLooseObjectFromProperty(search_mvt1_request, 'body'),
    getLooseObjectFromProperty(search_mvt1_request, 'path'),
    getLooseObjectFromProperty(search_mvt1_request, 'query'),
  ]),
  outputSchema: z.union([search_mvt_response, search_mvt1_response]),
};
const SEARCH_SHARDS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_shards',
  summary: `Get the search shards`,
  description: `Get the search shards.

Get the indices and shards that a search request would be run against.
This information can be useful for working out issues or planning optimizations with routing and shard preferences.
When filtered aliases are used, the filter is returned as part of the \`indices\` section.

If the Elasticsearch security features are enabled, you must have the \`view_index_metadata\` or \`manage\` index privilege for the target data stream, index, or alias.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_search_shards', '/{index}/_search_shards'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-shards',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(search_shards_request, 'body'),
    getLooseObjectFromProperty(search_shards_request, 'path'),
    getLooseObjectFromProperty(search_shards_request, 'query'),
    getLooseObjectFromProperty(search_shards1_request, 'body'),
    getLooseObjectFromProperty(search_shards1_request, 'path'),
    getLooseObjectFromProperty(search_shards1_request, 'query'),
    getLooseObjectFromProperty(search_shards2_request, 'body'),
    getLooseObjectFromProperty(search_shards2_request, 'path'),
    getLooseObjectFromProperty(search_shards2_request, 'query'),
    getLooseObjectFromProperty(search_shards3_request, 'body'),
    getLooseObjectFromProperty(search_shards3_request, 'path'),
    getLooseObjectFromProperty(search_shards3_request, 'query'),
  ]),
  outputSchema: z.union([
    search_shards_response,
    search_shards1_response,
    search_shards2_response,
    search_shards3_response,
  ]),
};
const SEARCH_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_template',
  summary: `Run a search with a search template`,
  description: `Run a search with a search template.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_search/template', '/{index}/_search/template'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-template',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(search_template_request, 'body'),
    getLooseObjectFromProperty(search_template_request, 'path'),
    getLooseObjectFromProperty(search_template_request, 'query'),
    getLooseObjectFromProperty(search_template1_request, 'body'),
    getLooseObjectFromProperty(search_template1_request, 'path'),
    getLooseObjectFromProperty(search_template1_request, 'query'),
    getLooseObjectFromProperty(search_template2_request, 'body'),
    getLooseObjectFromProperty(search_template2_request, 'path'),
    getLooseObjectFromProperty(search_template2_request, 'query'),
    getLooseObjectFromProperty(search_template3_request, 'body'),
    getLooseObjectFromProperty(search_template3_request, 'path'),
    getLooseObjectFromProperty(search_template3_request, 'query'),
  ]),
  outputSchema: z.union([
    search_template_response,
    search_template1_response,
    search_template2_response,
    search_template3_response,
  ]),
};
const SEARCHABLE_SNAPSHOTS_CACHE_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.searchable_snapshots.cache_stats',
  summary: `Get cache statistics`,
  description: `Get cache statistics.
Get statistics about the shared cache for partially mounted indices.`,
  methods: ['GET', 'GET'],
  patterns: ['/_searchable_snapshots/cache/stats', '/_searchable_snapshots/{node_id}/cache/stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-searchable-snapshots-cache-stats',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(searchable_snapshots_cache_stats_request, 'body'),
    getLooseObjectFromProperty(searchable_snapshots_cache_stats_request, 'path'),
    getLooseObjectFromProperty(searchable_snapshots_cache_stats_request, 'query'),
    getLooseObjectFromProperty(searchable_snapshots_cache_stats1_request, 'body'),
    getLooseObjectFromProperty(searchable_snapshots_cache_stats1_request, 'path'),
    getLooseObjectFromProperty(searchable_snapshots_cache_stats1_request, 'query'),
  ]),
  outputSchema: z.union([
    searchable_snapshots_cache_stats_response,
    searchable_snapshots_cache_stats1_response,
  ]),
};
const SEARCHABLE_SNAPSHOTS_CLEAR_CACHE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.searchable_snapshots.clear_cache',
  summary: `Clear the cache`,
  description: `Clear the cache.
Clear indices and data streams from the shared cache for partially mounted indices.`,
  methods: ['POST', 'POST'],
  patterns: ['/_searchable_snapshots/cache/clear', '/{index}/_searchable_snapshots/cache/clear'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-searchable-snapshots-clear-cache',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(searchable_snapshots_clear_cache_request, 'body'),
    getLooseObjectFromProperty(searchable_snapshots_clear_cache_request, 'path'),
    getLooseObjectFromProperty(searchable_snapshots_clear_cache_request, 'query'),
    getLooseObjectFromProperty(searchable_snapshots_clear_cache1_request, 'body'),
    getLooseObjectFromProperty(searchable_snapshots_clear_cache1_request, 'path'),
    getLooseObjectFromProperty(searchable_snapshots_clear_cache1_request, 'query'),
  ]),
  outputSchema: z.union([
    searchable_snapshots_clear_cache_response,
    searchable_snapshots_clear_cache1_response,
  ]),
};
const SEARCHABLE_SNAPSHOTS_MOUNT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.searchable_snapshots.mount',
  summary: `Mount a snapshot`,
  description: `Mount a snapshot.
Mount a snapshot as a searchable snapshot index.
Do not use this API for snapshots managed by index lifecycle management (ILM).
Manually mounting ILM-managed snapshots can interfere with ILM processes.`,
  methods: ['POST'],
  patterns: ['/_snapshot/{repository}/{snapshot}/_mount'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-searchable-snapshots-mount',
  parameterTypes: {
    pathParams: ['repository', 'snapshot'],
    urlParams: ['master_timeout', 'wait_for_completion', 'storage'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(searchable_snapshots_mount_request, 'body'),
    getLooseObjectFromProperty(searchable_snapshots_mount_request, 'path'),
    getLooseObjectFromProperty(searchable_snapshots_mount_request, 'query'),
  ]),
  outputSchema: searchable_snapshots_mount_response,
};
const SEARCHABLE_SNAPSHOTS_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.searchable_snapshots.stats',
  summary: `Get searchable snapshot statistics`,
  description: `Get searchable snapshot statistics.`,
  methods: ['GET', 'GET'],
  patterns: ['/_searchable_snapshots/stats', '/{index}/_searchable_snapshots/stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-searchable-snapshots-stats',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(searchable_snapshots_stats_request, 'body'),
    getLooseObjectFromProperty(searchable_snapshots_stats_request, 'path'),
    getLooseObjectFromProperty(searchable_snapshots_stats_request, 'query'),
    getLooseObjectFromProperty(searchable_snapshots_stats1_request, 'body'),
    getLooseObjectFromProperty(searchable_snapshots_stats1_request, 'path'),
    getLooseObjectFromProperty(searchable_snapshots_stats1_request, 'query'),
  ]),
  outputSchema: z.union([
    searchable_snapshots_stats_response,
    searchable_snapshots_stats1_response,
  ]),
};
const SECURITY_ACTIVATE_USER_PROFILE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.activate_user_profile',
  summary: `Activate a user profile`,
  description: `Activate a user profile.

Create or update a user profile on behalf of another user.

NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
Individual users and external applications should not call this API directly.
The calling application must have either an \`access_token\` or a combination of \`username\` and \`password\` for the user that the profile document is intended for.
Elastic reserves the right to change or remove this feature in future releases without prior notice.

This API creates or updates a profile document for end users with information that is extracted from the user's authentication object including \`username\`, \`full_name,\` \`roles\`, and the authentication realm.
For example, in the JWT \`access_token\` case, the profile user's \`username\` is extracted from the JWT token claim pointed to by the \`claims.principal\` setting of the JWT realm that authenticated the token.

When updating a profile document, the API enables the document if it was disabled.
Any updates do not change existing content for either the \`labels\` or \`data\` fields.`,
  methods: ['POST'],
  patterns: ['/_security/profile/_activate'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-activate-user-profile',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_activate_user_profile_request, 'body'),
    getLooseObjectFromProperty(security_activate_user_profile_request, 'path'),
    getLooseObjectFromProperty(security_activate_user_profile_request, 'query'),
  ]),
  outputSchema: security_activate_user_profile_response,
};
const SECURITY_AUTHENTICATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.authenticate',
  summary: `Authenticate a user`,
  description: `Authenticate a user.

Authenticates a user and returns information about the authenticated user.
Include the user information in a [basic auth header](https://en.wikipedia.org/wiki/Basic_access_authentication).
A successful call returns a JSON structure that shows user information such as their username, the roles that are assigned to the user, any assigned metadata, and information about the realms that authenticated and authorized the user.
If the user cannot be authenticated, this API returns a 401 status code.`,
  methods: ['GET'],
  patterns: ['/_security/_authenticate'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-authenticate',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_authenticate_request, 'body'),
    getLooseObjectFromProperty(security_authenticate_request, 'path'),
    getLooseObjectFromProperty(security_authenticate_request, 'query'),
  ]),
  outputSchema: security_authenticate_response,
};
const SECURITY_BULK_DELETE_ROLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.bulk_delete_role',
  summary: `Bulk delete roles`,
  description: `Bulk delete roles.

The role management APIs are generally the preferred way to manage roles, rather than using file-based role management.
The bulk delete roles API cannot delete roles that are defined in roles files.`,
  methods: ['DELETE'],
  patterns: ['/_security/role'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-bulk-delete-role',
  parameterTypes: {
    pathParams: [],
    urlParams: ['refresh', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_bulk_delete_role_request, 'body'),
    getLooseObjectFromProperty(security_bulk_delete_role_request, 'path'),
    getLooseObjectFromProperty(security_bulk_delete_role_request, 'query'),
  ]),
  outputSchema: security_bulk_delete_role_response,
};
const SECURITY_BULK_PUT_ROLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.bulk_put_role',
  summary: `Bulk create or update roles`,
  description: `Bulk create or update roles.

The role management APIs are generally the preferred way to manage roles, rather than using file-based role management.
The bulk create or update roles API cannot update roles that are defined in roles files.`,
  methods: ['POST'],
  patterns: ['/_security/role'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-bulk-put-role',
  parameterTypes: {
    pathParams: [],
    urlParams: ['refresh', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_bulk_put_role_request, 'body'),
    getLooseObjectFromProperty(security_bulk_put_role_request, 'path'),
    getLooseObjectFromProperty(security_bulk_put_role_request, 'query'),
  ]),
  outputSchema: security_bulk_put_role_response,
};
const SECURITY_BULK_UPDATE_API_KEYS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.bulk_update_api_keys',
  summary: `Bulk update API keys`,
  description: `Bulk update API keys.
Update the attributes for multiple API keys.

IMPORTANT: It is not possible to use an API key as the authentication credential for this API. To update API keys, the owner user's credentials are required.

This API is similar to the update API key API but enables you to apply the same update to multiple API keys in one API call. This operation can greatly improve performance over making individual updates.

It is not possible to update expired or invalidated API keys.

This API supports updates to API key access scope, metadata and expiration.
The access scope of each API key is derived from the \`role_descriptors\` you specify in the request and a snapshot of the owner user's permissions at the time of the request.
The snapshot of the owner's permissions is updated automatically on every call.

IMPORTANT: If you don't specify \`role_descriptors\` in the request, a call to this API might still change an API key's access scope. This change can occur if the owner user's permissions have changed since the API key was created or last modified.

A successful request returns a JSON structure that contains the IDs of all updated API keys, the IDs of API keys that already had the requested changes and did not require an update, and error details for any failed update.`,
  methods: ['POST'],
  patterns: ['/_security/api_key/_bulk_update'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-bulk-update-api-keys',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_bulk_update_api_keys_request, 'body'),
    getLooseObjectFromProperty(security_bulk_update_api_keys_request, 'path'),
    getLooseObjectFromProperty(security_bulk_update_api_keys_request, 'query'),
  ]),
  outputSchema: security_bulk_update_api_keys_response,
};
const SECURITY_CHANGE_PASSWORD_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.change_password',
  summary: `Change passwords`,
  description: `Change passwords.

Change the passwords of users in the native realm and built-in users.`,
  methods: ['PUT', 'POST', 'PUT', 'POST'],
  patterns: ['/_security/user/{username}/_password', '/_security/user/_password'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-change-password',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_change_password_request, 'body'),
    getLooseObjectFromProperty(security_change_password_request, 'path'),
    getLooseObjectFromProperty(security_change_password_request, 'query'),
    getLooseObjectFromProperty(security_change_password1_request, 'body'),
    getLooseObjectFromProperty(security_change_password1_request, 'path'),
    getLooseObjectFromProperty(security_change_password1_request, 'query'),
    getLooseObjectFromProperty(security_change_password2_request, 'body'),
    getLooseObjectFromProperty(security_change_password2_request, 'path'),
    getLooseObjectFromProperty(security_change_password2_request, 'query'),
    getLooseObjectFromProperty(security_change_password3_request, 'body'),
    getLooseObjectFromProperty(security_change_password3_request, 'path'),
    getLooseObjectFromProperty(security_change_password3_request, 'query'),
  ]),
  outputSchema: z.union([
    security_change_password_response,
    security_change_password1_response,
    security_change_password2_response,
    security_change_password3_response,
  ]),
};
const SECURITY_CLEAR_API_KEY_CACHE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.clear_api_key_cache',
  summary: `Clear the API key cache`,
  description: `Clear the API key cache.

Evict a subset of all entries from the API key cache.
The cache is also automatically cleared on state changes of the security index.`,
  methods: ['POST'],
  patterns: ['/_security/api_key/{ids}/_clear_cache'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-api-key-cache',
  parameterTypes: {
    pathParams: ['ids'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_clear_api_key_cache_request, 'body'),
    getLooseObjectFromProperty(security_clear_api_key_cache_request, 'path'),
    getLooseObjectFromProperty(security_clear_api_key_cache_request, 'query'),
  ]),
  outputSchema: security_clear_api_key_cache_response,
};
const SECURITY_CLEAR_CACHED_PRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.clear_cached_privileges',
  summary: `Clear the privileges cache`,
  description: `Clear the privileges cache.

Evict privileges from the native application privilege cache.
The cache is also automatically cleared for applications that have their privileges updated.`,
  methods: ['POST'],
  patterns: ['/_security/privilege/{application}/_clear_cache'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-cached-privileges',
  parameterTypes: {
    pathParams: ['application'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_clear_cached_privileges_request, 'body'),
    getLooseObjectFromProperty(security_clear_cached_privileges_request, 'path'),
    getLooseObjectFromProperty(security_clear_cached_privileges_request, 'query'),
  ]),
  outputSchema: security_clear_cached_privileges_response,
};
const SECURITY_CLEAR_CACHED_REALMS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.clear_cached_realms',
  summary: `Clear the user cache`,
  description: `Clear the user cache.

Evict users from the user cache.
You can completely clear the cache or evict specific users.

User credentials are cached in memory on each node to avoid connecting to a remote authentication service or hitting the disk for every incoming request.
There are realm settings that you can use to configure the user cache.
For more information, refer to the documentation about controlling the user cache.`,
  methods: ['POST'],
  patterns: ['/_security/realm/{realms}/_clear_cache'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-cached-realms',
  parameterTypes: {
    pathParams: ['realms'],
    urlParams: ['usernames'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_clear_cached_realms_request, 'body'),
    getLooseObjectFromProperty(security_clear_cached_realms_request, 'path'),
    getLooseObjectFromProperty(security_clear_cached_realms_request, 'query'),
  ]),
  outputSchema: security_clear_cached_realms_response,
};
const SECURITY_CLEAR_CACHED_ROLES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.clear_cached_roles',
  summary: `Clear the roles cache`,
  description: `Clear the roles cache.

Evict roles from the native role cache.`,
  methods: ['POST'],
  patterns: ['/_security/role/{name}/_clear_cache'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-cached-roles',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_clear_cached_roles_request, 'body'),
    getLooseObjectFromProperty(security_clear_cached_roles_request, 'path'),
    getLooseObjectFromProperty(security_clear_cached_roles_request, 'query'),
  ]),
  outputSchema: security_clear_cached_roles_response,
};
const SECURITY_CLEAR_CACHED_SERVICE_TOKENS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.clear_cached_service_tokens',
  summary: `Clear service account token caches`,
  description: `Clear service account token caches.

Evict a subset of all entries from the service account token caches.
Two separate caches exist for service account tokens: one cache for tokens backed by the \`service_tokens\` file, and another for tokens backed by the \`.security\` index.
This API clears matching entries from both caches.

The cache for service account tokens backed by the \`.security\` index is cleared automatically on state changes of the security index.
The cache for tokens backed by the \`service_tokens\` file is cleared automatically on file changes.`,
  methods: ['POST'],
  patterns: ['/_security/service/{namespace}/{service}/credential/token/{name}/_clear_cache'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-cached-service-tokens',
  parameterTypes: {
    pathParams: ['namespace', 'service', 'name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_clear_cached_service_tokens_request, 'body'),
    getLooseObjectFromProperty(security_clear_cached_service_tokens_request, 'path'),
    getLooseObjectFromProperty(security_clear_cached_service_tokens_request, 'query'),
  ]),
  outputSchema: security_clear_cached_service_tokens_response,
};
const SECURITY_CREATE_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.create_api_key',
  summary: `Create an API key`,
  description: `Create an API key.

Create an API key for access without requiring basic authentication.

IMPORTANT: If the credential that is used to authenticate this request is an API key, the derived API key cannot have any privileges.
If you specify privileges, the API returns an error.

A successful request returns a JSON structure that contains the API key, its unique id, and its name.
If applicable, it also returns expiration information for the API key in milliseconds.

NOTE: By default, API keys never expire. You can specify expiration information when you create the API keys.

The API keys are created by the Elasticsearch API key service, which is automatically enabled.
To configure or turn off the API key service, refer to API key service setting documentation.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_security/api_key'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-api-key',
  parameterTypes: {
    pathParams: [],
    urlParams: [
      'id',
      'name',
      'owner',
      'realm_name',
      'username',
      'with_limited_by',
      'active_only',
      'with_profile_uid',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_create_api_key_request, 'body'),
    getLooseObjectFromProperty(security_create_api_key_request, 'path'),
    getLooseObjectFromProperty(security_create_api_key_request, 'query'),
    getLooseObjectFromProperty(security_create_api_key1_request, 'body'),
    getLooseObjectFromProperty(security_create_api_key1_request, 'path'),
    getLooseObjectFromProperty(security_create_api_key1_request, 'query'),
  ]),
  outputSchema: z.union([security_create_api_key_response, security_create_api_key1_response]),
};
const SECURITY_CREATE_CROSS_CLUSTER_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.create_cross_cluster_api_key',
  summary: `Create a cross-cluster API key`,
  description: `Create a cross-cluster API key.

Create an API key of the \`cross_cluster\` type for the API key based remote cluster access.
A \`cross_cluster\` API key cannot be used to authenticate through the REST interface.

IMPORTANT: To authenticate this request you must use a credential that is not an API key. Even if you use an API key that has the required privilege, the API returns an error.

Cross-cluster API keys are created by the Elasticsearch API key service, which is automatically enabled.

NOTE: Unlike REST API keys, a cross-cluster API key does not capture permissions of the authenticated user. The API key’s effective permission is exactly as specified with the \`access\` property.

A successful request returns a JSON structure that contains the API key, its unique ID, and its name. If applicable, it also returns expiration information for the API key in milliseconds.

By default, API keys never expire. You can specify expiration information when you create the API keys.

Cross-cluster API keys can only be updated with the update cross-cluster API key API.
Attempting to update them with the update REST API key API or the bulk update REST API keys API will result in an error.`,
  methods: ['POST'],
  patterns: ['/_security/cross_cluster/api_key'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-cross-cluster-api-key',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_create_cross_cluster_api_key_request, 'body'),
    getLooseObjectFromProperty(security_create_cross_cluster_api_key_request, 'path'),
    getLooseObjectFromProperty(security_create_cross_cluster_api_key_request, 'query'),
  ]),
  outputSchema: security_create_cross_cluster_api_key_response,
};
const SECURITY_CREATE_SERVICE_TOKEN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.create_service_token',
  summary: `Create a service account token`,
  description: `Create a service account token.

Create a service accounts token for access without requiring basic authentication.

NOTE: Service account tokens never expire.
You must actively delete them if they are no longer needed.`,
  methods: ['PUT', 'POST', 'POST'],
  patterns: [
    '/_security/service/{namespace}/{service}/credential/token/{name}',
    '/_security/service/{namespace}/{service}/credential/token',
  ],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-service-token',
  parameterTypes: {
    pathParams: ['namespace', 'service', 'name'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_create_service_token_request, 'body'),
    getLooseObjectFromProperty(security_create_service_token_request, 'path'),
    getLooseObjectFromProperty(security_create_service_token_request, 'query'),
    getLooseObjectFromProperty(security_create_service_token1_request, 'body'),
    getLooseObjectFromProperty(security_create_service_token1_request, 'path'),
    getLooseObjectFromProperty(security_create_service_token1_request, 'query'),
    getLooseObjectFromProperty(security_create_service_token2_request, 'body'),
    getLooseObjectFromProperty(security_create_service_token2_request, 'path'),
    getLooseObjectFromProperty(security_create_service_token2_request, 'query'),
  ]),
  outputSchema: z.union([
    security_create_service_token_response,
    security_create_service_token1_response,
    security_create_service_token2_response,
  ]),
};
const SECURITY_DELEGATE_PKI_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.delegate_pki',
  summary: `Delegate PKI authentication`,
  description: `Delegate PKI authentication.

This API implements the exchange of an X509Certificate chain for an Elasticsearch access token.
The certificate chain is validated, according to RFC 5280, by sequentially considering the trust configuration of every installed PKI realm that has \`delegation.enabled\` set to \`true\`.
A successfully trusted client certificate is also subject to the validation of the subject distinguished name according to thw \`username_pattern\` of the respective realm.

This API is called by smart and trusted proxies, such as Kibana, which terminate the user's TLS session but still want to authenticate the user by using a PKI realm—-​as if the user connected directly to Elasticsearch.

IMPORTANT: The association between the subject public key in the target certificate and the corresponding private key is not validated.
This is part of the TLS authentication process and it is delegated to the proxy that calls this API.
The proxy is trusted to have performed the TLS authentication and this API translates that authentication into an Elasticsearch access token.`,
  methods: ['POST'],
  patterns: ['/_security/delegate_pki'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delegate-pki',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_delegate_pki_request, 'body'),
    getLooseObjectFromProperty(security_delegate_pki_request, 'path'),
    getLooseObjectFromProperty(security_delegate_pki_request, 'query'),
  ]),
  outputSchema: security_delegate_pki_response,
};
const SECURITY_DELETE_PRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.delete_privileges',
  summary: `Delete application privileges`,
  description: `Delete application privileges.

To use this API, you must have one of the following privileges:

* The \`manage_security\` cluster privilege (or a greater privilege such as \`all\`).
* The "Manage Application Privileges" global privilege for the application being referenced in the request.`,
  methods: ['DELETE'],
  patterns: ['/_security/privilege/{application}/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-privileges',
  parameterTypes: {
    pathParams: ['application', 'name'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_delete_privileges_request, 'body'),
    getLooseObjectFromProperty(security_delete_privileges_request, 'path'),
    getLooseObjectFromProperty(security_delete_privileges_request, 'query'),
  ]),
  outputSchema: security_delete_privileges_response,
};
const SECURITY_DELETE_ROLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.delete_role',
  summary: `Delete roles`,
  description: `Delete roles.

Delete roles in the native realm.
The role management APIs are generally the preferred way to manage roles, rather than using file-based role management.
The delete roles API cannot remove roles that are defined in roles files.`,
  methods: ['DELETE'],
  patterns: ['/_security/role/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-role',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_delete_role_request, 'body'),
    getLooseObjectFromProperty(security_delete_role_request, 'path'),
    getLooseObjectFromProperty(security_delete_role_request, 'query'),
  ]),
  outputSchema: security_delete_role_response,
};
const SECURITY_DELETE_ROLE_MAPPING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.delete_role_mapping',
  summary: `Delete role mappings`,
  description: `Delete role mappings.

Role mappings define which roles are assigned to each user.
The role mapping APIs are generally the preferred way to manage role mappings rather than using role mapping files.
The delete role mappings API cannot remove role mappings that are defined in role mapping files.`,
  methods: ['DELETE'],
  patterns: ['/_security/role_mapping/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-role-mapping',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_delete_role_mapping_request, 'body'),
    getLooseObjectFromProperty(security_delete_role_mapping_request, 'path'),
    getLooseObjectFromProperty(security_delete_role_mapping_request, 'query'),
  ]),
  outputSchema: security_delete_role_mapping_response,
};
const SECURITY_DELETE_SERVICE_TOKEN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.delete_service_token',
  summary: `Delete service account tokens`,
  description: `Delete service account tokens.

Delete service account tokens for a service in a specified namespace.`,
  methods: ['DELETE'],
  patterns: ['/_security/service/{namespace}/{service}/credential/token/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-service-token',
  parameterTypes: {
    pathParams: ['namespace', 'service', 'name'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_delete_service_token_request, 'body'),
    getLooseObjectFromProperty(security_delete_service_token_request, 'path'),
    getLooseObjectFromProperty(security_delete_service_token_request, 'query'),
  ]),
  outputSchema: security_delete_service_token_response,
};
const SECURITY_DELETE_USER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.delete_user',
  summary: `Delete users`,
  description: `Delete users.

Delete users from the native realm.`,
  methods: ['DELETE'],
  patterns: ['/_security/user/{username}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-user',
  parameterTypes: {
    pathParams: ['username'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_delete_user_request, 'body'),
    getLooseObjectFromProperty(security_delete_user_request, 'path'),
    getLooseObjectFromProperty(security_delete_user_request, 'query'),
  ]),
  outputSchema: security_delete_user_response,
};
const SECURITY_DISABLE_USER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.disable_user',
  summary: `Disable users`,
  description: `Disable users.

Disable users in the native realm.
By default, when you create users, they are enabled.
You can use this API to revoke a user's access to Elasticsearch.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_security/user/{username}/_disable'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-disable-user',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_disable_user_request, 'body'),
    getLooseObjectFromProperty(security_disable_user_request, 'path'),
    getLooseObjectFromProperty(security_disable_user_request, 'query'),
    getLooseObjectFromProperty(security_disable_user1_request, 'body'),
    getLooseObjectFromProperty(security_disable_user1_request, 'path'),
    getLooseObjectFromProperty(security_disable_user1_request, 'query'),
  ]),
  outputSchema: z.union([security_disable_user_response, security_disable_user1_response]),
};
const SECURITY_DISABLE_USER_PROFILE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.disable_user_profile',
  summary: `Disable a user profile`,
  description: `Disable a user profile.

Disable user profiles so that they are not visible in user profile searches.

NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
Individual users and external applications should not call this API directly.
Elastic reserves the right to change or remove this feature in future releases without prior notice.

When you activate a user profile, its automatically enabled and visible in user profile searches. You can use the disable user profile API to disable a user profile so it’s not visible in these searches.
To re-enable a disabled user profile, use the enable user profile API .`,
  methods: ['PUT', 'POST'],
  patterns: ['/_security/profile/{uid}/_disable'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-disable-user-profile',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_disable_user_profile_request, 'body'),
    getLooseObjectFromProperty(security_disable_user_profile_request, 'path'),
    getLooseObjectFromProperty(security_disable_user_profile_request, 'query'),
    getLooseObjectFromProperty(security_disable_user_profile1_request, 'body'),
    getLooseObjectFromProperty(security_disable_user_profile1_request, 'path'),
    getLooseObjectFromProperty(security_disable_user_profile1_request, 'query'),
  ]),
  outputSchema: z.union([
    security_disable_user_profile_response,
    security_disable_user_profile1_response,
  ]),
};
const SECURITY_ENABLE_USER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.enable_user',
  summary: `Enable users`,
  description: `Enable users.

Enable users in the native realm.
By default, when you create users, they are enabled.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_security/user/{username}/_enable'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-enable-user',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_enable_user_request, 'body'),
    getLooseObjectFromProperty(security_enable_user_request, 'path'),
    getLooseObjectFromProperty(security_enable_user_request, 'query'),
    getLooseObjectFromProperty(security_enable_user1_request, 'body'),
    getLooseObjectFromProperty(security_enable_user1_request, 'path'),
    getLooseObjectFromProperty(security_enable_user1_request, 'query'),
  ]),
  outputSchema: z.union([security_enable_user_response, security_enable_user1_response]),
};
const SECURITY_ENABLE_USER_PROFILE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.enable_user_profile',
  summary: `Enable a user profile`,
  description: `Enable a user profile.

Enable user profiles to make them visible in user profile searches.

NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
Individual users and external applications should not call this API directly.
Elastic reserves the right to change or remove this feature in future releases without prior notice.

When you activate a user profile, it's automatically enabled and visible in user profile searches.
If you later disable the user profile, you can use the enable user profile API to make the profile visible in these searches again.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_security/profile/{uid}/_enable'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-enable-user-profile',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_enable_user_profile_request, 'body'),
    getLooseObjectFromProperty(security_enable_user_profile_request, 'path'),
    getLooseObjectFromProperty(security_enable_user_profile_request, 'query'),
    getLooseObjectFromProperty(security_enable_user_profile1_request, 'body'),
    getLooseObjectFromProperty(security_enable_user_profile1_request, 'path'),
    getLooseObjectFromProperty(security_enable_user_profile1_request, 'query'),
  ]),
  outputSchema: z.union([
    security_enable_user_profile_response,
    security_enable_user_profile1_response,
  ]),
};
const SECURITY_ENROLL_KIBANA_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.enroll_kibana',
  summary: `Enroll Kibana`,
  description: `Enroll Kibana.

Enable a Kibana instance to configure itself for communication with a secured Elasticsearch cluster.

NOTE: This API is currently intended for internal use only by Kibana.
Kibana uses this API internally to configure itself for communications with an Elasticsearch cluster that already has security features enabled.`,
  methods: ['GET'],
  patterns: ['/_security/enroll/kibana'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-enroll-kibana',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_enroll_kibana_request, 'body'),
    getLooseObjectFromProperty(security_enroll_kibana_request, 'path'),
    getLooseObjectFromProperty(security_enroll_kibana_request, 'query'),
  ]),
  outputSchema: security_enroll_kibana_response,
};
const SECURITY_ENROLL_NODE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.enroll_node',
  summary: `Enroll a node`,
  description: `Enroll a node.

Enroll a new node to allow it to join an existing cluster with security features enabled.

The response contains all the necessary information for the joining node to bootstrap discovery and security related settings so that it can successfully join the cluster.
The response contains key and certificate material that allows the caller to generate valid signed certificates for the HTTP layer of all nodes in the cluster.`,
  methods: ['GET'],
  patterns: ['/_security/enroll/node'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-enroll-node',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_enroll_node_request, 'body'),
    getLooseObjectFromProperty(security_enroll_node_request, 'path'),
    getLooseObjectFromProperty(security_enroll_node_request, 'query'),
  ]),
  outputSchema: security_enroll_node_response,
};
const SECURITY_GET_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_api_key',
  summary: `Get API key information`,
  description: `Get API key information.

Retrieves information for one or more API keys.
NOTE: If you have only the \`manage_own_api_key\` privilege, this API returns only the API keys that you own.
If you have \`read_security\`, \`manage_api_key\` or greater privileges (including \`manage_security\`), this API returns all API keys regardless of ownership.`,
  methods: ['GET'],
  patterns: ['/_security/api_key'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-api-key',
  parameterTypes: {
    pathParams: [],
    urlParams: [
      'id',
      'name',
      'owner',
      'realm_name',
      'username',
      'with_limited_by',
      'active_only',
      'with_profile_uid',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_get_api_key_request, 'body'),
    getLooseObjectFromProperty(security_get_api_key_request, 'path'),
    getLooseObjectFromProperty(security_get_api_key_request, 'query'),
  ]),
  outputSchema: security_get_api_key_response,
};
const SECURITY_GET_BUILTIN_PRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_builtin_privileges',
  summary: `Get builtin privileges`,
  description: `Get builtin privileges.

Get the list of cluster privileges and index privileges that are available in this version of Elasticsearch.`,
  methods: ['GET'],
  patterns: ['/_security/privilege/_builtin'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-builtin-privileges',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_get_builtin_privileges_request, 'body'),
    getLooseObjectFromProperty(security_get_builtin_privileges_request, 'path'),
    getLooseObjectFromProperty(security_get_builtin_privileges_request, 'query'),
  ]),
  outputSchema: security_get_builtin_privileges_response,
};
const SECURITY_GET_PRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_privileges',
  summary: `Get application privileges`,
  description: `Get application privileges.

To use this API, you must have one of the following privileges:

* The \`read_security\` cluster privilege (or a greater privilege such as \`manage_security\` or \`all\`).
* The "Manage Application Privileges" global privilege for the application being referenced in the request.`,
  methods: ['GET', 'GET', 'GET'],
  patterns: [
    '/_security/privilege',
    '/_security/privilege/{application}',
    '/_security/privilege/{application}/{name}',
  ],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-privileges',
  parameterTypes: {
    pathParams: ['application', 'name'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_get_privileges_request, 'body'),
    getLooseObjectFromProperty(security_get_privileges_request, 'path'),
    getLooseObjectFromProperty(security_get_privileges_request, 'query'),
    getLooseObjectFromProperty(security_get_privileges1_request, 'body'),
    getLooseObjectFromProperty(security_get_privileges1_request, 'path'),
    getLooseObjectFromProperty(security_get_privileges1_request, 'query'),
    getLooseObjectFromProperty(security_get_privileges2_request, 'body'),
    getLooseObjectFromProperty(security_get_privileges2_request, 'path'),
    getLooseObjectFromProperty(security_get_privileges2_request, 'query'),
  ]),
  outputSchema: z.union([
    security_get_privileges_response,
    security_get_privileges1_response,
    security_get_privileges2_response,
  ]),
};
const SECURITY_GET_ROLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_role',
  summary: `Get roles`,
  description: `Get roles.

Get roles in the native realm.
The role management APIs are generally the preferred way to manage roles, rather than using file-based role management.
The get roles API cannot retrieve roles that are defined in roles files.`,
  methods: ['GET', 'GET'],
  patterns: ['/_security/role/{name}', '/_security/role'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-role',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['refresh', 'refresh', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_get_role_request, 'body'),
    getLooseObjectFromProperty(security_get_role_request, 'path'),
    getLooseObjectFromProperty(security_get_role_request, 'query'),
    getLooseObjectFromProperty(security_get_role1_request, 'body'),
    getLooseObjectFromProperty(security_get_role1_request, 'path'),
    getLooseObjectFromProperty(security_get_role1_request, 'query'),
  ]),
  outputSchema: z.union([security_get_role_response, security_get_role1_response]),
};
const SECURITY_GET_ROLE_MAPPING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_role_mapping',
  summary: `Get role mappings`,
  description: `Get role mappings.

Role mappings define which roles are assigned to each user.
The role mapping APIs are generally the preferred way to manage role mappings rather than using role mapping files.
The get role mappings API cannot retrieve role mappings that are defined in role mapping files.`,
  methods: ['GET', 'GET'],
  patterns: ['/_security/role_mapping/{name}', '/_security/role_mapping'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-role-mapping',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_get_role_mapping_request, 'body'),
    getLooseObjectFromProperty(security_get_role_mapping_request, 'path'),
    getLooseObjectFromProperty(security_get_role_mapping_request, 'query'),
    getLooseObjectFromProperty(security_get_role_mapping1_request, 'body'),
    getLooseObjectFromProperty(security_get_role_mapping1_request, 'path'),
    getLooseObjectFromProperty(security_get_role_mapping1_request, 'query'),
  ]),
  outputSchema: z.union([security_get_role_mapping_response, security_get_role_mapping1_response]),
};
const SECURITY_GET_SERVICE_ACCOUNTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_service_accounts',
  summary: `Get service accounts`,
  description: `Get service accounts.

Get a list of service accounts that match the provided path parameters.

NOTE: Currently, only the \`elastic/fleet-server\` service account is available.`,
  methods: ['GET', 'GET', 'GET'],
  patterns: [
    '/_security/service/{namespace}/{service}',
    '/_security/service/{namespace}',
    '/_security/service',
  ],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-service-accounts',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_get_service_accounts_request, 'body'),
    getLooseObjectFromProperty(security_get_service_accounts_request, 'path'),
    getLooseObjectFromProperty(security_get_service_accounts_request, 'query'),
    getLooseObjectFromProperty(security_get_service_accounts1_request, 'body'),
    getLooseObjectFromProperty(security_get_service_accounts1_request, 'path'),
    getLooseObjectFromProperty(security_get_service_accounts1_request, 'query'),
    getLooseObjectFromProperty(security_get_service_accounts2_request, 'body'),
    getLooseObjectFromProperty(security_get_service_accounts2_request, 'path'),
    getLooseObjectFromProperty(security_get_service_accounts2_request, 'query'),
  ]),
  outputSchema: z.union([
    security_get_service_accounts_response,
    security_get_service_accounts1_response,
    security_get_service_accounts2_response,
  ]),
};
const SECURITY_GET_SERVICE_CREDENTIALS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_service_credentials',
  summary: `Get service account credentials`,
  description: `Get service account credentials.

To use this API, you must have at least the \`read_security\` cluster privilege (or a greater privilege such as \`manage_service_account\` or \`manage_security\`).

The response includes service account tokens that were created with the create service account tokens API as well as file-backed tokens from all nodes of the cluster.

NOTE: For tokens backed by the \`service_tokens\` file, the API collects them from all nodes of the cluster.
Tokens with the same name from different nodes are assumed to be the same token and are only counted once towards the total number of service tokens.`,
  methods: ['GET'],
  patterns: ['/_security/service/{namespace}/{service}/credential'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-service-credentials',
  parameterTypes: {
    pathParams: ['namespace', 'service'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_get_service_credentials_request, 'body'),
    getLooseObjectFromProperty(security_get_service_credentials_request, 'path'),
    getLooseObjectFromProperty(security_get_service_credentials_request, 'query'),
  ]),
  outputSchema: security_get_service_credentials_response,
};
const SECURITY_GET_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_settings',
  summary: `Get security index settings`,
  description: `Get security index settings.

Get the user-configurable settings for the security internal index (\`.security\` and associated indices).
Only a subset of the index settings — those that are user-configurable—will be shown.
This includes:

* \`index.auto_expand_replicas\`
* \`index.number_of_replicas\``,
  methods: ['GET'],
  patterns: ['/_security/settings'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-settings',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_get_settings_request, 'body'),
    getLooseObjectFromProperty(security_get_settings_request, 'path'),
    getLooseObjectFromProperty(security_get_settings_request, 'query'),
  ]),
  outputSchema: security_get_settings_response,
};
const SECURITY_GET_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_stats',
  summary: `Get security stats`,
  description: `Get security stats.

Gather security usage statistics from all node(s) within the cluster.`,
  methods: ['GET'],
  patterns: ['/_security/stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-stats',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_get_stats_request, 'body'),
    getLooseObjectFromProperty(security_get_stats_request, 'path'),
    getLooseObjectFromProperty(security_get_stats_request, 'query'),
  ]),
  outputSchema: security_get_stats_response,
};
const SECURITY_GET_TOKEN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_token',
  summary: `Get a token`,
  description: `Get a token.

Create a bearer token for access without requiring basic authentication.
The tokens are created by the Elasticsearch Token Service, which is automatically enabled when you configure TLS on the HTTP interface.
Alternatively, you can explicitly enable the \`xpack.security.authc.token.enabled\` setting.
When you are running in production mode, a bootstrap check prevents you from enabling the token service unless you also enable TLS on the HTTP interface.

The get token API takes the same parameters as a typical OAuth 2.0 token API except for the use of a JSON request body.

A successful get token API call returns a JSON structure that contains the access token, the amount of time (seconds) that the token expires in, the type, and the scope if available.

The tokens returned by the get token API have a finite period of time for which they are valid and after that time period, they can no longer be used.
That time period is defined by the \`xpack.security.authc.token.timeout\` setting.
If you want to invalidate a token immediately, you can do so by using the invalidate token API.`,
  methods: ['POST'],
  patterns: ['/_security/oauth2/token'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-token',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_get_token_request, 'body'),
    getLooseObjectFromProperty(security_get_token_request, 'path'),
    getLooseObjectFromProperty(security_get_token_request, 'query'),
  ]),
  outputSchema: security_get_token_response,
};
const SECURITY_GET_USER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_user',
  summary: `Get users`,
  description: `Get users.

Get information about users in the native realm and built-in users.`,
  methods: ['GET', 'GET'],
  patterns: ['/_security/user/{username}', '/_security/user'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-user',
  parameterTypes: {
    pathParams: ['username'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_get_user_request, 'body'),
    getLooseObjectFromProperty(security_get_user_request, 'path'),
    getLooseObjectFromProperty(security_get_user_request, 'query'),
    getLooseObjectFromProperty(security_get_user1_request, 'body'),
    getLooseObjectFromProperty(security_get_user1_request, 'path'),
    getLooseObjectFromProperty(security_get_user1_request, 'query'),
  ]),
  outputSchema: z.union([security_get_user_response, security_get_user1_response]),
};
const SECURITY_GET_USER_PRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_user_privileges',
  summary: `Get user privileges`,
  description: `Get user privileges.

Get the security privileges for the logged in user.
All users can use this API, but only to determine their own privileges.
To check the privileges of other users, you must use the run as feature.
To check whether a user has a specific list of privileges, use the has privileges API.`,
  methods: ['GET'],
  patterns: ['/_security/user/_privileges'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-user-privileges',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_get_user_privileges_request, 'body'),
    getLooseObjectFromProperty(security_get_user_privileges_request, 'path'),
    getLooseObjectFromProperty(security_get_user_privileges_request, 'query'),
  ]),
  outputSchema: security_get_user_privileges_response,
};
const SECURITY_GET_USER_PROFILE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_user_profile',
  summary: `Get a user profile`,
  description: `Get a user profile.

Get a user's profile using the unique profile ID.

NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
Individual users and external applications should not call this API directly.
Elastic reserves the right to change or remove this feature in future releases without prior notice.`,
  methods: ['GET'],
  patterns: ['/_security/profile/{uid}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-user-profile',
  parameterTypes: {
    pathParams: ['uid'],
    urlParams: ['data'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_get_user_profile_request, 'body'),
    getLooseObjectFromProperty(security_get_user_profile_request, 'path'),
    getLooseObjectFromProperty(security_get_user_profile_request, 'query'),
  ]),
  outputSchema: security_get_user_profile_response,
};
const SECURITY_GRANT_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.grant_api_key',
  summary: `Grant an API key`,
  description: `Grant an API key.

Create an API key on behalf of another user.
This API is similar to the create API keys API, however it creates the API key for a user that is different than the user that runs the API.
The caller must have authentication credentials for the user on whose behalf the API key will be created.
It is not possible to use this API to create an API key without that user's credentials.
The supported user authentication credential types are:

* username and password
* Elasticsearch access tokens
* JWTs

The user, for whom the authentication credentials is provided, can optionally "run as" (impersonate) another user.
In this case, the API key will be created on behalf of the impersonated user.

This API is intended be used by applications that need to create and manage API keys for end users, but cannot guarantee that those users have permission to create API keys on their own behalf.
The API keys are created by the Elasticsearch API key service, which is automatically enabled.

A successful grant API key API call returns a JSON structure that contains the API key, its unique id, and its name.
If applicable, it also returns expiration information for the API key in milliseconds.

By default, API keys never expire. You can specify expiration information when you create the API keys.`,
  methods: ['POST'],
  patterns: ['/_security/api_key/grant'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-grant-api-key',
  parameterTypes: {
    pathParams: [],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_grant_api_key_request, 'body'),
    getLooseObjectFromProperty(security_grant_api_key_request, 'path'),
    getLooseObjectFromProperty(security_grant_api_key_request, 'query'),
  ]),
  outputSchema: security_grant_api_key_response,
};
const SECURITY_HAS_PRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.has_privileges',
  summary: `Check user privileges`,
  description: `Check user privileges.

Determine whether the specified user has a specified list of privileges.
All users can use this API, but only to determine their own privileges.
To check the privileges of other users, you must use the run as feature.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_security/user/_has_privileges', '/_security/user/{user}/_has_privileges'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-has-privileges',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_has_privileges_request, 'body'),
    getLooseObjectFromProperty(security_has_privileges_request, 'path'),
    getLooseObjectFromProperty(security_has_privileges_request, 'query'),
    getLooseObjectFromProperty(security_has_privileges1_request, 'body'),
    getLooseObjectFromProperty(security_has_privileges1_request, 'path'),
    getLooseObjectFromProperty(security_has_privileges1_request, 'query'),
    getLooseObjectFromProperty(security_has_privileges2_request, 'body'),
    getLooseObjectFromProperty(security_has_privileges2_request, 'path'),
    getLooseObjectFromProperty(security_has_privileges2_request, 'query'),
    getLooseObjectFromProperty(security_has_privileges3_request, 'body'),
    getLooseObjectFromProperty(security_has_privileges3_request, 'path'),
    getLooseObjectFromProperty(security_has_privileges3_request, 'query'),
  ]),
  outputSchema: z.union([
    security_has_privileges_response,
    security_has_privileges1_response,
    security_has_privileges2_response,
    security_has_privileges3_response,
  ]),
};
const SECURITY_HAS_PRIVILEGES_USER_PROFILE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.has_privileges_user_profile',
  summary: `Check user profile privileges`,
  description: `Check user profile privileges.

Determine whether the users associated with the specified user profile IDs have all the requested privileges.

NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions. Individual users and external applications should not call this API directly.
Elastic reserves the right to change or remove this feature in future releases without prior notice.`,
  methods: ['GET', 'POST'],
  patterns: ['/_security/profile/_has_privileges'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-has-privileges-user-profile',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_has_privileges_user_profile_request, 'body'),
    getLooseObjectFromProperty(security_has_privileges_user_profile_request, 'path'),
    getLooseObjectFromProperty(security_has_privileges_user_profile_request, 'query'),
    getLooseObjectFromProperty(security_has_privileges_user_profile1_request, 'body'),
    getLooseObjectFromProperty(security_has_privileges_user_profile1_request, 'path'),
    getLooseObjectFromProperty(security_has_privileges_user_profile1_request, 'query'),
  ]),
  outputSchema: z.union([
    security_has_privileges_user_profile_response,
    security_has_privileges_user_profile1_response,
  ]),
};
const SECURITY_INVALIDATE_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.invalidate_api_key',
  summary: `Invalidate API keys`,
  description: `Invalidate API keys.

This API invalidates API keys created by the create API key or grant API key APIs.
Invalidated API keys fail authentication, but they can still be viewed using the get API key information and query API key information APIs, for at least the configured retention period, until they are automatically deleted.

To use this API, you must have at least the \`manage_security\`, \`manage_api_key\`, or \`manage_own_api_key\` cluster privileges.
The \`manage_security\` privilege allows deleting any API key, including both REST and cross cluster API keys.
The \`manage_api_key\` privilege allows deleting any REST API key, but not cross cluster API keys.
The \`manage_own_api_key\` only allows deleting REST API keys that are owned by the user.
In addition, with the \`manage_own_api_key\` privilege, an invalidation request must be issued in one of the three formats:

- Set the parameter \`owner=true\`.
- Or, set both \`username\` and \`realm_name\` to match the user's identity.
- Or, if the request is issued by an API key, that is to say an API key invalidates itself, specify its ID in the \`ids\` field.`,
  methods: ['DELETE'],
  patterns: ['/_security/api_key'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-invalidate-api-key',
  parameterTypes: {
    pathParams: [],
    urlParams: [
      'id',
      'name',
      'owner',
      'realm_name',
      'username',
      'with_limited_by',
      'active_only',
      'with_profile_uid',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_invalidate_api_key_request, 'body'),
    getLooseObjectFromProperty(security_invalidate_api_key_request, 'path'),
    getLooseObjectFromProperty(security_invalidate_api_key_request, 'query'),
  ]),
  outputSchema: security_invalidate_api_key_response,
};
const SECURITY_INVALIDATE_TOKEN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.invalidate_token',
  summary: `Invalidate a token`,
  description: `Invalidate a token.

The access tokens returned by the get token API have a finite period of time for which they are valid.
After that time period, they can no longer be used.
The time period is defined by the \`xpack.security.authc.token.timeout\` setting.

The refresh tokens returned by the get token API are only valid for 24 hours.
They can also be used exactly once.
If you want to invalidate one or more access or refresh tokens immediately, use this invalidate token API.

NOTE: While all parameters are optional, at least one of them is required.
More specifically, either one of \`token\` or \`refresh_token\` parameters is required.
If none of these two are specified, then \`realm_name\` and/or \`username\` need to be specified.`,
  methods: ['DELETE'],
  patterns: ['/_security/oauth2/token'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-invalidate-token',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_invalidate_token_request, 'body'),
    getLooseObjectFromProperty(security_invalidate_token_request, 'path'),
    getLooseObjectFromProperty(security_invalidate_token_request, 'query'),
  ]),
  outputSchema: security_invalidate_token_response,
};
const SECURITY_OIDC_AUTHENTICATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.oidc_authenticate',
  summary: `Authenticate OpenID Connect`,
  description: `Authenticate OpenID Connect.

Exchange an OpenID Connect authentication response message for an Elasticsearch internal access token and refresh token that can be subsequently used for authentication.

Elasticsearch exposes all the necessary OpenID Connect related functionality with the OpenID Connect APIs.
These APIs are used internally by Kibana in order to provide OpenID Connect based authentication, but can also be used by other, custom web applications or other clients.`,
  methods: ['POST'],
  patterns: ['/_security/oidc/authenticate'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-oidc-authenticate',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_oidc_authenticate_request, 'body'),
    getLooseObjectFromProperty(security_oidc_authenticate_request, 'path'),
    getLooseObjectFromProperty(security_oidc_authenticate_request, 'query'),
  ]),
  outputSchema: security_oidc_authenticate_response,
};
const SECURITY_OIDC_LOGOUT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.oidc_logout',
  summary: `Logout of OpenID Connect`,
  description: `Logout of OpenID Connect.

Invalidate an access token and a refresh token that were generated as a response to the \`/_security/oidc/authenticate\` API.

If the OpenID Connect authentication realm in Elasticsearch is accordingly configured, the response to this call will contain a URI pointing to the end session endpoint of the OpenID Connect Provider in order to perform single logout.

Elasticsearch exposes all the necessary OpenID Connect related functionality with the OpenID Connect APIs.
These APIs are used internally by Kibana in order to provide OpenID Connect based authentication, but can also be used by other, custom web applications or other clients.`,
  methods: ['POST'],
  patterns: ['/_security/oidc/logout'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-oidc-logout',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_oidc_logout_request, 'body'),
    getLooseObjectFromProperty(security_oidc_logout_request, 'path'),
    getLooseObjectFromProperty(security_oidc_logout_request, 'query'),
  ]),
  outputSchema: security_oidc_logout_response,
};
const SECURITY_OIDC_PREPARE_AUTHENTICATION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.oidc_prepare_authentication',
  summary: `Prepare OpenID connect authentication`,
  description: `Prepare OpenID connect authentication.

Create an oAuth 2.0 authentication request as a URL string based on the configuration of the OpenID Connect authentication realm in Elasticsearch.

The response of this API is a URL pointing to the Authorization Endpoint of the configured OpenID Connect Provider, which can be used to redirect the browser of the user in order to continue the authentication process.

Elasticsearch exposes all the necessary OpenID Connect related functionality with the OpenID Connect APIs.
These APIs are used internally by Kibana in order to provide OpenID Connect based authentication, but can also be used by other, custom web applications or other clients.`,
  methods: ['POST'],
  patterns: ['/_security/oidc/prepare'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-oidc-prepare-authentication',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_oidc_prepare_authentication_request, 'body'),
    getLooseObjectFromProperty(security_oidc_prepare_authentication_request, 'path'),
    getLooseObjectFromProperty(security_oidc_prepare_authentication_request, 'query'),
  ]),
  outputSchema: security_oidc_prepare_authentication_response,
};
const SECURITY_PUT_PRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.put_privileges',
  summary: `Create or update application privileges`,
  description: `Create or update application privileges.

To use this API, you must have one of the following privileges:

* The \`manage_security\` cluster privilege (or a greater privilege such as \`all\`).
* The "Manage Application Privileges" global privilege for the application being referenced in the request.

Application names are formed from a prefix, with an optional suffix that conform to the following rules:

* The prefix must begin with a lowercase ASCII letter.
* The prefix must contain only ASCII letters or digits.
* The prefix must be at least 3 characters long.
* If the suffix exists, it must begin with either a dash \`-\` or \`_\`.
* The suffix cannot contain any of the following characters: \`\\\`, \`/\`, \`*\`, \`?\`, \`"\`, \`<\`, \`>\`, \`|\`, \`,\`, \`*\`.
* No part of the name can contain whitespace.

Privilege names must begin with a lowercase ASCII letter and must contain only ASCII letters and digits along with the characters \`_\`, \`-\`, and \`.\`.

Action names can contain any number of printable ASCII characters and must contain at least one of the following characters: \`/\`, \`*\`, \`:\`.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_security/privilege'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-privileges',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_put_privileges_request, 'body'),
    getLooseObjectFromProperty(security_put_privileges_request, 'path'),
    getLooseObjectFromProperty(security_put_privileges_request, 'query'),
    getLooseObjectFromProperty(security_put_privileges1_request, 'body'),
    getLooseObjectFromProperty(security_put_privileges1_request, 'path'),
    getLooseObjectFromProperty(security_put_privileges1_request, 'query'),
  ]),
  outputSchema: z.union([security_put_privileges_response, security_put_privileges1_response]),
};
const SECURITY_PUT_ROLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.put_role',
  summary: `Create or update roles`,
  description: `Create or update roles.

The role management APIs are generally the preferred way to manage roles in the native realm, rather than using file-based role management.
The create or update roles API cannot update roles that are defined in roles files.
File-based role management is not available in Elastic Serverless.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_security/role/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-role',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_put_role_request, 'body'),
    getLooseObjectFromProperty(security_put_role_request, 'path'),
    getLooseObjectFromProperty(security_put_role_request, 'query'),
    getLooseObjectFromProperty(security_put_role1_request, 'body'),
    getLooseObjectFromProperty(security_put_role1_request, 'path'),
    getLooseObjectFromProperty(security_put_role1_request, 'query'),
  ]),
  outputSchema: z.union([security_put_role_response, security_put_role1_response]),
};
const SECURITY_PUT_ROLE_MAPPING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.put_role_mapping',
  summary: `Create or update role mappings`,
  description: `Create or update role mappings.

Role mappings define which roles are assigned to each user.
Each mapping has rules that identify users and a list of roles that are granted to those users.
The role mapping APIs are generally the preferred way to manage role mappings rather than using role mapping files. The create or update role mappings API cannot update role mappings that are defined in role mapping files.

NOTE: This API does not create roles. Rather, it maps users to existing roles.
Roles can be created by using the create or update roles API or roles files.

**Role templates**

The most common use for role mappings is to create a mapping from a known value on the user to a fixed role name.
For example, all users in the \`cn=admin,dc=example,dc=com\` LDAP group should be given the superuser role in Elasticsearch.
The \`roles\` field is used for this purpose.

For more complex needs, it is possible to use Mustache templates to dynamically determine the names of the roles that should be granted to the user.
The \`role_templates\` field is used for this purpose.

NOTE: To use role templates successfully, the relevant scripting feature must be enabled.
Otherwise, all attempts to create a role mapping with role templates fail.

All of the user fields that are available in the role mapping rules are also available in the role templates.
Thus it is possible to assign a user to a role that reflects their username, their groups, or the name of the realm to which they authenticated.

By default a template is evaluated to produce a single string that is the name of the role which should be assigned to the user.
If the format of the template is set to "json" then the template is expected to produce a JSON string or an array of JSON strings for the role names.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_security/role_mapping/{name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-role-mapping',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_put_role_mapping_request, 'body'),
    getLooseObjectFromProperty(security_put_role_mapping_request, 'path'),
    getLooseObjectFromProperty(security_put_role_mapping_request, 'query'),
    getLooseObjectFromProperty(security_put_role_mapping1_request, 'body'),
    getLooseObjectFromProperty(security_put_role_mapping1_request, 'path'),
    getLooseObjectFromProperty(security_put_role_mapping1_request, 'query'),
  ]),
  outputSchema: z.union([security_put_role_mapping_response, security_put_role_mapping1_response]),
};
const SECURITY_PUT_USER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.put_user',
  summary: `Create or update users`,
  description: `Create or update users.

Add and update users in the native realm.
A password is required for adding a new user but is optional when updating an existing user.
To change a user's password without updating any other fields, use the change password API.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_security/user/{username}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-user',
  parameterTypes: {
    pathParams: ['username'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_put_user_request, 'body'),
    getLooseObjectFromProperty(security_put_user_request, 'path'),
    getLooseObjectFromProperty(security_put_user_request, 'query'),
    getLooseObjectFromProperty(security_put_user1_request, 'body'),
    getLooseObjectFromProperty(security_put_user1_request, 'path'),
    getLooseObjectFromProperty(security_put_user1_request, 'query'),
  ]),
  outputSchema: z.union([security_put_user_response, security_put_user1_response]),
};
const SECURITY_QUERY_API_KEYS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.query_api_keys',
  summary: `Find API keys with a query`,
  description: `Find API keys with a query.

Get a paginated list of API keys and their information.
You can optionally filter the results with a query.

To use this API, you must have at least the \`manage_own_api_key\` or the \`read_security\` cluster privileges.
If you have only the \`manage_own_api_key\` privilege, this API returns only the API keys that you own.
If you have the \`read_security\`, \`manage_api_key\`, or greater privileges (including \`manage_security\`), this API returns all API keys regardless of ownership.
Refer to the linked documentation for examples of how to find API keys:`,
  methods: ['GET', 'POST'],
  patterns: ['/_security/_query/api_key'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-query-api-keys',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_query_api_keys_request, 'body'),
    getLooseObjectFromProperty(security_query_api_keys_request, 'path'),
    getLooseObjectFromProperty(security_query_api_keys_request, 'query'),
    getLooseObjectFromProperty(security_query_api_keys1_request, 'body'),
    getLooseObjectFromProperty(security_query_api_keys1_request, 'path'),
    getLooseObjectFromProperty(security_query_api_keys1_request, 'query'),
  ]),
  outputSchema: z.union([security_query_api_keys_response, security_query_api_keys1_response]),
};
const SECURITY_QUERY_ROLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.query_role',
  summary: `Find roles with a query`,
  description: `Find roles with a query.

Get roles in a paginated manner.
The role management APIs are generally the preferred way to manage roles, rather than using file-based role management.
The query roles API does not retrieve roles that are defined in roles files, nor built-in ones.
You can optionally filter the results with a query.
Also, the results can be paginated and sorted.`,
  methods: ['GET', 'POST'],
  patterns: ['/_security/_query/role'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-query-role',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_query_role_request, 'body'),
    getLooseObjectFromProperty(security_query_role_request, 'path'),
    getLooseObjectFromProperty(security_query_role_request, 'query'),
    getLooseObjectFromProperty(security_query_role1_request, 'body'),
    getLooseObjectFromProperty(security_query_role1_request, 'path'),
    getLooseObjectFromProperty(security_query_role1_request, 'query'),
  ]),
  outputSchema: z.union([security_query_role_response, security_query_role1_response]),
};
const SECURITY_QUERY_USER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.query_user',
  summary: `Find users with a query`,
  description: `Find users with a query.

Get information for users in a paginated manner.
You can optionally filter the results with a query.

NOTE: As opposed to the get user API, built-in users are excluded from the result.
This API is only for native users.`,
  methods: ['GET', 'POST'],
  patterns: ['/_security/_query/user'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-query-user',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_query_user_request, 'body'),
    getLooseObjectFromProperty(security_query_user_request, 'path'),
    getLooseObjectFromProperty(security_query_user_request, 'query'),
    getLooseObjectFromProperty(security_query_user1_request, 'body'),
    getLooseObjectFromProperty(security_query_user1_request, 'path'),
    getLooseObjectFromProperty(security_query_user1_request, 'query'),
  ]),
  outputSchema: z.union([security_query_user_response, security_query_user1_response]),
};
const SECURITY_SAML_AUTHENTICATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.saml_authenticate',
  summary: `Authenticate SAML`,
  description: `Authenticate SAML.

Submit a SAML response message to Elasticsearch for consumption.

NOTE: This API is intended for use by custom web applications other than Kibana.
If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.

The SAML message that is submitted can be:

* A response to a SAML authentication request that was previously created using the SAML prepare authentication API.
* An unsolicited SAML message in the case of an IdP-initiated single sign-on (SSO) flow.

In either case, the SAML message needs to be a base64 encoded XML document with a root element of \`<Response>\`.

After successful validation, Elasticsearch responds with an Elasticsearch internal access token and refresh token that can be subsequently used for authentication.
This API endpoint essentially exchanges SAML responses that indicate successful authentication in the IdP for Elasticsearch access and refresh tokens, which can be used for authentication against Elasticsearch.`,
  methods: ['POST'],
  patterns: ['/_security/saml/authenticate'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-authenticate',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_saml_authenticate_request, 'body'),
    getLooseObjectFromProperty(security_saml_authenticate_request, 'path'),
    getLooseObjectFromProperty(security_saml_authenticate_request, 'query'),
  ]),
  outputSchema: security_saml_authenticate_response,
};
const SECURITY_SAML_COMPLETE_LOGOUT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.saml_complete_logout',
  summary: `Logout of SAML completely`,
  description: `Logout of SAML completely.

Verifies the logout response sent from the SAML IdP.

NOTE: This API is intended for use by custom web applications other than Kibana.
If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.

The SAML IdP may send a logout response back to the SP after handling the SP-initiated SAML Single Logout.
This API verifies the response by ensuring the content is relevant and validating its signature.
An empty response is returned if the verification process is successful.
The response can be sent by the IdP with either the HTTP-Redirect or the HTTP-Post binding.
The caller of this API must prepare the request accordingly so that this API can handle either of them.`,
  methods: ['POST'],
  patterns: ['/_security/saml/complete_logout'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-complete-logout',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_saml_complete_logout_request, 'body'),
    getLooseObjectFromProperty(security_saml_complete_logout_request, 'path'),
    getLooseObjectFromProperty(security_saml_complete_logout_request, 'query'),
  ]),
  outputSchema: security_saml_complete_logout_response,
};
const SECURITY_SAML_INVALIDATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.saml_invalidate',
  summary: `Invalidate SAML`,
  description: `Invalidate SAML.

Submit a SAML LogoutRequest message to Elasticsearch for consumption.

NOTE: This API is intended for use by custom web applications other than Kibana.
If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.

The logout request comes from the SAML IdP during an IdP initiated Single Logout.
The custom web application can use this API to have Elasticsearch process the \`LogoutRequest\`.
After successful validation of the request, Elasticsearch invalidates the access token and refresh token that corresponds to that specific SAML principal and provides a URL that contains a SAML LogoutResponse message.
Thus the user can be redirected back to their IdP.`,
  methods: ['POST'],
  patterns: ['/_security/saml/invalidate'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-invalidate',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_saml_invalidate_request, 'body'),
    getLooseObjectFromProperty(security_saml_invalidate_request, 'path'),
    getLooseObjectFromProperty(security_saml_invalidate_request, 'query'),
  ]),
  outputSchema: security_saml_invalidate_response,
};
const SECURITY_SAML_LOGOUT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.saml_logout',
  summary: `Logout of SAML`,
  description: `Logout of SAML.

Submits a request to invalidate an access token and refresh token.

NOTE: This API is intended for use by custom web applications other than Kibana.
If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.

This API invalidates the tokens that were generated for a user by the SAML authenticate API.
If the SAML realm in Elasticsearch is configured accordingly and the SAML IdP supports this, the Elasticsearch response contains a URL to redirect the user to the IdP that contains a SAML logout request (starting an SP-initiated SAML Single Logout).`,
  methods: ['POST'],
  patterns: ['/_security/saml/logout'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-logout',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_saml_logout_request, 'body'),
    getLooseObjectFromProperty(security_saml_logout_request, 'path'),
    getLooseObjectFromProperty(security_saml_logout_request, 'query'),
  ]),
  outputSchema: security_saml_logout_response,
};
const SECURITY_SAML_PREPARE_AUTHENTICATION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.saml_prepare_authentication',
  summary: `Prepare SAML authentication`,
  description: `Prepare SAML authentication.

Create a SAML authentication request (\`<AuthnRequest>\`) as a URL string based on the configuration of the respective SAML realm in Elasticsearch.

NOTE: This API is intended for use by custom web applications other than Kibana.
If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.

This API returns a URL pointing to the SAML Identity Provider.
You can use the URL to redirect the browser of the user in order to continue the authentication process.
The URL includes a single parameter named \`SAMLRequest\`, which contains a SAML Authentication request that is deflated and Base64 encoded.
If the configuration dictates that SAML authentication requests should be signed, the URL has two extra parameters named \`SigAlg\` and \`Signature\`.
These parameters contain the algorithm used for the signature and the signature value itself.
It also returns a random string that uniquely identifies this SAML Authentication request.
The caller of this API needs to store this identifier as it needs to be used in a following step of the authentication process.`,
  methods: ['POST'],
  patterns: ['/_security/saml/prepare'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-prepare-authentication',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_saml_prepare_authentication_request, 'body'),
    getLooseObjectFromProperty(security_saml_prepare_authentication_request, 'path'),
    getLooseObjectFromProperty(security_saml_prepare_authentication_request, 'query'),
  ]),
  outputSchema: security_saml_prepare_authentication_response,
};
const SECURITY_SAML_SERVICE_PROVIDER_METADATA_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.saml_service_provider_metadata',
  summary: `Create SAML service provider metadata`,
  description: `Create SAML service provider metadata.

Generate SAML metadata for a SAML 2.0 Service Provider.

The SAML 2.0 specification provides a mechanism for Service Providers to describe their capabilities and configuration using a metadata file.
This API generates Service Provider metadata based on the configuration of a SAML realm in Elasticsearch.`,
  methods: ['GET'],
  patterns: ['/_security/saml/metadata/{realm_name}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-service-provider-metadata',
  parameterTypes: {
    pathParams: ['realm_name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_saml_service_provider_metadata_request, 'body'),
    getLooseObjectFromProperty(security_saml_service_provider_metadata_request, 'path'),
    getLooseObjectFromProperty(security_saml_service_provider_metadata_request, 'query'),
  ]),
  outputSchema: security_saml_service_provider_metadata_response,
};
const SECURITY_SUGGEST_USER_PROFILES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.suggest_user_profiles',
  summary: `Suggest a user profile`,
  description: `Suggest a user profile.

Get suggestions for user profiles that match specified search criteria.

NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
Individual users and external applications should not call this API directly.
Elastic reserves the right to change or remove this feature in future releases without prior notice.`,
  methods: ['GET', 'POST'],
  patterns: ['/_security/profile/_suggest'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-suggest-user-profiles',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_suggest_user_profiles_request, 'body'),
    getLooseObjectFromProperty(security_suggest_user_profiles_request, 'path'),
    getLooseObjectFromProperty(security_suggest_user_profiles_request, 'query'),
    getLooseObjectFromProperty(security_suggest_user_profiles1_request, 'body'),
    getLooseObjectFromProperty(security_suggest_user_profiles1_request, 'path'),
    getLooseObjectFromProperty(security_suggest_user_profiles1_request, 'query'),
  ]),
  outputSchema: z.union([
    security_suggest_user_profiles_response,
    security_suggest_user_profiles1_response,
  ]),
};
const SECURITY_UPDATE_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.update_api_key',
  summary: `Update an API key`,
  description: `Update an API key.

Update attributes of an existing API key.
This API supports updates to an API key's access scope, expiration, and metadata.

To use this API, you must have at least the \`manage_own_api_key\` cluster privilege.
Users can only update API keys that they created or that were granted to them.
To update another user’s API key, use the \`run_as\` feature to submit a request on behalf of another user.

IMPORTANT: It's not possible to use an API key as the authentication credential for this API. The owner user’s credentials are required.

Use this API to update API keys created by the create API key or grant API Key APIs.
If you need to apply the same update to many API keys, you can use the bulk update API keys API to reduce overhead.
It's not possible to update expired API keys or API keys that have been invalidated by the invalidate API key API.

The access scope of an API key is derived from the \`role_descriptors\` you specify in the request and a snapshot of the owner user's permissions at the time of the request.
The snapshot of the owner's permissions is updated automatically on every call.

IMPORTANT: If you don't specify \`role_descriptors\` in the request, a call to this API might still change the API key's access scope.
This change can occur if the owner user's permissions have changed since the API key was created or last modified.`,
  methods: ['PUT'],
  patterns: ['/_security/api_key/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-api-key',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_update_api_key_request, 'body'),
    getLooseObjectFromProperty(security_update_api_key_request, 'path'),
    getLooseObjectFromProperty(security_update_api_key_request, 'query'),
  ]),
  outputSchema: security_update_api_key_response,
};
const SECURITY_UPDATE_CROSS_CLUSTER_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.update_cross_cluster_api_key',
  summary: `Update a cross-cluster API key`,
  description: `Update a cross-cluster API key.

Update the attributes of an existing cross-cluster API key, which is used for API key based remote cluster access.

To use this API, you must have at least the \`manage_security\` cluster privilege.
Users can only update API keys that they created.
To update another user's API key, use the \`run_as\` feature to submit a request on behalf of another user.

IMPORTANT: It's not possible to use an API key as the authentication credential for this API.
To update an API key, the owner user's credentials are required.

It's not possible to update expired API keys, or API keys that have been invalidated by the invalidate API key API.

This API supports updates to an API key's access scope, metadata, and expiration.
The owner user's information, such as the \`username\` and \`realm\`, is also updated automatically on every call.

NOTE: This API cannot update REST API keys, which should be updated by either the update API key or bulk update API keys API.

To learn more about how to use this API, refer to the [Update cross cluter API key API examples page](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/update-cc-api-key-examples).`,
  methods: ['PUT'],
  patterns: ['/_security/cross_cluster/api_key/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-cross-cluster-api-key',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_update_cross_cluster_api_key_request, 'body'),
    getLooseObjectFromProperty(security_update_cross_cluster_api_key_request, 'path'),
    getLooseObjectFromProperty(security_update_cross_cluster_api_key_request, 'query'),
  ]),
  outputSchema: security_update_cross_cluster_api_key_response,
};
const SECURITY_UPDATE_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.update_settings',
  summary: `Update security index settings`,
  description: `Update security index settings.

Update the user-configurable settings for the security internal index (\`.security\` and associated indices). Only a subset of settings are allowed to be modified. This includes \`index.auto_expand_replicas\` and \`index.number_of_replicas\`.

NOTE: If \`index.auto_expand_replicas\` is set, \`index.number_of_replicas\` will be ignored during updates.

If a specific index is not in use on the system and settings are provided for it, the request will be rejected.
This API does not yet support configuring the settings for indices before they are in use.`,
  methods: ['PUT'],
  patterns: ['/_security/settings'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-settings',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_update_settings_request, 'body'),
    getLooseObjectFromProperty(security_update_settings_request, 'path'),
    getLooseObjectFromProperty(security_update_settings_request, 'query'),
  ]),
  outputSchema: security_update_settings_response,
};
const SECURITY_UPDATE_USER_PROFILE_DATA_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.update_user_profile_data',
  summary: `Update user profile data`,
  description: `Update user profile data.

Update specific data for the user profile that is associated with a unique ID.

NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
Individual users and external applications should not call this API directly.
Elastic reserves the right to change or remove this feature in future releases without prior notice.

To use this API, you must have one of the following privileges:

* The \`manage_user_profile\` cluster privilege.
* The \`update_profile_data\` global privilege for the namespaces that are referenced in the request.

This API updates the \`labels\` and \`data\` fields of an existing user profile document with JSON objects.
New keys and their values are added to the profile document and conflicting keys are replaced by data that's included in the request.

For both labels and data, content is namespaced by the top-level fields.
The \`update_profile_data\` global privilege grants privileges for updating only the allowed namespaces.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_security/profile/{uid}/_data'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-user-profile-data',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(security_update_user_profile_data_request, 'body'),
    getLooseObjectFromProperty(security_update_user_profile_data_request, 'path'),
    getLooseObjectFromProperty(security_update_user_profile_data_request, 'query'),
    getLooseObjectFromProperty(security_update_user_profile_data1_request, 'body'),
    getLooseObjectFromProperty(security_update_user_profile_data1_request, 'path'),
    getLooseObjectFromProperty(security_update_user_profile_data1_request, 'query'),
  ]),
  outputSchema: z.union([
    security_update_user_profile_data_response,
    security_update_user_profile_data1_response,
  ]),
};
const SHUTDOWN_DELETE_NODE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.shutdown.delete_node',
  summary: ``,
  description: `Cancel node shutdown preparations.
Remove a node from the shutdown list so it can resume normal operations.
You must explicitly clear the shutdown request when a node rejoins the cluster or when a node has permanently left the cluster.
Shutdown requests are never removed automatically by Elasticsearch.

NOTE: This feature is designed for indirect use by Elastic Cloud, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes.
Direct use is not supported.

If the operator privileges feature is enabled, you must be an operator to use this API.`,
  methods: ['DELETE'],
  patterns: ['/_nodes/{node_id}/shutdown'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-shutdown-delete-node',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const SHUTDOWN_GET_NODE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.shutdown.get_node',
  summary: ``,
  description: `Get the shutdown status.

Get information about nodes that are ready to be shut down, have shut down preparations still in progress, or have stalled.
The API returns status information for each part of the shut down process.

NOTE: This feature is designed for indirect use by Elasticsearch Service, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes. Direct use is not supported.

If the operator privileges feature is enabled, you must be an operator to use this API.`,
  methods: ['GET', 'GET'],
  patterns: ['/_nodes/shutdown', '/_nodes/{node_id}/shutdown'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-shutdown-get-node',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const SHUTDOWN_PUT_NODE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.shutdown.put_node',
  summary: ``,
  description: `Prepare a node to be shut down.

NOTE: This feature is designed for indirect use by Elastic Cloud, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes. Direct use is not supported.

If you specify a node that is offline, it will be prepared for shut down when it rejoins the cluster.

If the operator privileges feature is enabled, you must be an operator to use this API.

The API migrates ongoing tasks and index shards to other nodes as needed to prepare a node to be restarted or shut down and removed from the cluster.
This ensures that Elasticsearch can be stopped safely with minimal disruption to the cluster.

You must specify the type of shutdown: \`restart\`, \`remove\`, or \`replace\`.
If a node is already being prepared for shutdown, you can use this API to change the shutdown type.

IMPORTANT: This API does NOT terminate the Elasticsearch process.
Monitor the node shutdown status to determine when it is safe to stop Elasticsearch.`,
  methods: ['PUT'],
  patterns: ['/_nodes/{node_id}/shutdown'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-shutdown-put-node',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const SIMULATE_INGEST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.simulate.ingest',
  summary: `Simulate data ingestion`,
  description: `Simulate data ingestion.
Run ingest pipelines against a set of provided documents, optionally with substitute pipeline definitions, to simulate ingesting data into an index.

This API is meant to be used for troubleshooting or pipeline development, as it does not actually index any data into Elasticsearch.

The API runs the default and final pipeline for that index against a set of documents provided in the body of the request.
If a pipeline contains a reroute processor, it follows that reroute processor to the new index, running that index's pipelines as well the same way that a non-simulated ingest would.
No data is indexed into Elasticsearch.
Instead, the transformed document is returned, along with the list of pipelines that have been run and the name of the index where the document would have been indexed if this were not a simulation.
The transformed document is validated against the mappings that would apply to this index, and any validation error is reported in the result.

This API differs from the simulate pipeline API in that you specify a single pipeline for that API, and it runs only that one pipeline.
The simulate pipeline API is more useful for developing a single pipeline, while the simulate ingest API is more useful for troubleshooting the interaction of the various pipelines that get applied when ingesting into an index.

By default, the pipeline definitions that are currently in the system are used.
However, you can supply substitute pipeline definitions in the body of the request.
These will be used in place of the pipeline definitions that are already in the system. This can be used to replace existing pipeline definitions or to create new ones. The pipeline substitutions are used only within this request.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_ingest/_simulate', '/_ingest/{index}/_simulate'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-simulate-ingest',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(simulate_ingest_request, 'body'),
    getLooseObjectFromProperty(simulate_ingest_request, 'path'),
    getLooseObjectFromProperty(simulate_ingest_request, 'query'),
    getLooseObjectFromProperty(simulate_ingest1_request, 'body'),
    getLooseObjectFromProperty(simulate_ingest1_request, 'path'),
    getLooseObjectFromProperty(simulate_ingest1_request, 'query'),
    getLooseObjectFromProperty(simulate_ingest2_request, 'body'),
    getLooseObjectFromProperty(simulate_ingest2_request, 'path'),
    getLooseObjectFromProperty(simulate_ingest2_request, 'query'),
    getLooseObjectFromProperty(simulate_ingest3_request, 'body'),
    getLooseObjectFromProperty(simulate_ingest3_request, 'path'),
    getLooseObjectFromProperty(simulate_ingest3_request, 'query'),
  ]),
  outputSchema: z.union([
    simulate_ingest_response,
    simulate_ingest1_response,
    simulate_ingest2_response,
    simulate_ingest3_response,
  ]),
};
const SLM_DELETE_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.delete_lifecycle',
  summary: `Delete a policy`,
  description: `Delete a policy.
Delete a snapshot lifecycle policy definition.
This operation prevents any future snapshots from being taken but does not cancel in-progress snapshots or remove previously-taken snapshots.`,
  methods: ['DELETE'],
  patterns: ['/_slm/policy/{policy_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-delete-lifecycle',
  parameterTypes: {
    pathParams: ['policy_id', 'policy_id'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(slm_delete_lifecycle_request, 'body'),
    getLooseObjectFromProperty(slm_delete_lifecycle_request, 'path'),
    getLooseObjectFromProperty(slm_delete_lifecycle_request, 'query'),
  ]),
  outputSchema: slm_delete_lifecycle_response,
};
const SLM_EXECUTE_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.execute_lifecycle',
  summary: `Run a policy`,
  description: `Run a policy.
Immediately create a snapshot according to the snapshot lifecycle policy without waiting for the scheduled time.
The snapshot policy is normally applied according to its schedule, but you might want to manually run a policy before performing an upgrade or other maintenance.`,
  methods: ['PUT'],
  patterns: ['/_slm/policy/{policy_id}/_execute'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-execute-lifecycle',
  parameterTypes: {
    pathParams: ['policy_id'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(slm_execute_lifecycle_request, 'body'),
    getLooseObjectFromProperty(slm_execute_lifecycle_request, 'path'),
    getLooseObjectFromProperty(slm_execute_lifecycle_request, 'query'),
  ]),
  outputSchema: slm_execute_lifecycle_response,
};
const SLM_EXECUTE_RETENTION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.execute_retention',
  summary: `Run a retention policy`,
  description: `Run a retention policy.
Manually apply the retention policy to force immediate removal of snapshots that are expired according to the snapshot lifecycle policy retention rules.
The retention policy is normally applied according to its schedule.`,
  methods: ['POST'],
  patterns: ['/_slm/_execute_retention'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-execute-retention',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(slm_execute_retention_request, 'body'),
    getLooseObjectFromProperty(slm_execute_retention_request, 'path'),
    getLooseObjectFromProperty(slm_execute_retention_request, 'query'),
  ]),
  outputSchema: slm_execute_retention_response,
};
const SLM_GET_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.get_lifecycle',
  summary: `Get policy information`,
  description: `Get policy information.
Get snapshot lifecycle policy definitions and information about the latest snapshot attempts.`,
  methods: ['GET', 'GET'],
  patterns: ['/_slm/policy/{policy_id}', '/_slm/policy'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-get-lifecycle',
  parameterTypes: {
    pathParams: ['policy_id', 'policy_id'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(slm_get_lifecycle_request, 'body'),
    getLooseObjectFromProperty(slm_get_lifecycle_request, 'path'),
    getLooseObjectFromProperty(slm_get_lifecycle_request, 'query'),
    getLooseObjectFromProperty(slm_get_lifecycle1_request, 'body'),
    getLooseObjectFromProperty(slm_get_lifecycle1_request, 'path'),
    getLooseObjectFromProperty(slm_get_lifecycle1_request, 'query'),
  ]),
  outputSchema: z.union([slm_get_lifecycle_response, slm_get_lifecycle1_response]),
};
const SLM_GET_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.get_stats',
  summary: `Get snapshot lifecycle management statistics`,
  description: `Get snapshot lifecycle management statistics.
Get global and policy-level statistics about actions taken by snapshot lifecycle management.`,
  methods: ['GET'],
  patterns: ['/_slm/stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-get-stats',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(slm_get_stats_request, 'body'),
    getLooseObjectFromProperty(slm_get_stats_request, 'path'),
    getLooseObjectFromProperty(slm_get_stats_request, 'query'),
  ]),
  outputSchema: slm_get_stats_response,
};
const SLM_GET_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.get_status',
  summary: `Get the snapshot lifecycle management status`,
  description: `Get the snapshot lifecycle management status.`,
  methods: ['GET'],
  patterns: ['/_slm/status'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-get-status',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(slm_get_status_request, 'body'),
    getLooseObjectFromProperty(slm_get_status_request, 'path'),
    getLooseObjectFromProperty(slm_get_status_request, 'query'),
  ]),
  outputSchema: slm_get_status_response,
};
const SLM_PUT_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.put_lifecycle',
  summary: `Create or update a policy`,
  description: `Create or update a policy.
Create or update a snapshot lifecycle policy.
If the policy already exists, this request increments the policy version.
Only the latest version of a policy is stored.`,
  methods: ['PUT'],
  patterns: ['/_slm/policy/{policy_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-put-lifecycle',
  parameterTypes: {
    pathParams: ['policy_id', 'policy_id'],
    urlParams: ['master_timeout', 'timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(slm_put_lifecycle_request, 'body'),
    getLooseObjectFromProperty(slm_put_lifecycle_request, 'path'),
    getLooseObjectFromProperty(slm_put_lifecycle_request, 'query'),
  ]),
  outputSchema: slm_put_lifecycle_response,
};
const SLM_START_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.start',
  summary: `Start snapshot lifecycle management`,
  description: `Start snapshot lifecycle management.
Snapshot lifecycle management (SLM) starts automatically when a cluster is formed.
Manually starting SLM is necessary only if it has been stopped using the stop SLM API.`,
  methods: ['POST'],
  patterns: ['/_slm/start'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-start',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(slm_start_request, 'body'),
    getLooseObjectFromProperty(slm_start_request, 'path'),
    getLooseObjectFromProperty(slm_start_request, 'query'),
  ]),
  outputSchema: slm_start_response,
};
const SLM_STOP_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.stop',
  summary: `Stop snapshot lifecycle management`,
  description: `Stop snapshot lifecycle management.
Stop all snapshot lifecycle management (SLM) operations and the SLM plugin.
This API is useful when you are performing maintenance on a cluster and need to prevent SLM from performing any actions on your data streams or indices.
Stopping SLM does not stop any snapshots that are in progress.
You can manually trigger snapshots with the run snapshot lifecycle policy API even if SLM is stopped.

The API returns a response as soon as the request is acknowledged, but the plugin might continue to run until in-progress operations complete and it can be safely stopped.
Use the get snapshot lifecycle management status API to see if SLM is running.`,
  methods: ['POST'],
  patterns: ['/_slm/stop'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-stop',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(slm_stop_request, 'body'),
    getLooseObjectFromProperty(slm_stop_request, 'path'),
    getLooseObjectFromProperty(slm_stop_request, 'query'),
  ]),
  outputSchema: slm_stop_response,
};
const SNAPSHOT_CLEANUP_REPOSITORY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.cleanup_repository',
  summary: `Clean up the snapshot repository`,
  description: `Clean up the snapshot repository.
Trigger the review of the contents of a snapshot repository and delete any stale data not referenced by existing snapshots.`,
  methods: ['POST'],
  patterns: ['/_snapshot/{repository}/_cleanup'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-cleanup-repository',
  parameterTypes: {
    pathParams: ['repository'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(snapshot_cleanup_repository_request, 'body'),
    getLooseObjectFromProperty(snapshot_cleanup_repository_request, 'path'),
    getLooseObjectFromProperty(snapshot_cleanup_repository_request, 'query'),
  ]),
  outputSchema: snapshot_cleanup_repository_response,
};
const SNAPSHOT_CLONE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.clone',
  summary: `Clone a snapshot`,
  description: `Clone a snapshot.
Clone part of all of a snapshot into another snapshot in the same repository.`,
  methods: ['PUT'],
  patterns: ['/_snapshot/{repository}/{snapshot}/_clone/{target_snapshot}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-clone',
  parameterTypes: {
    pathParams: ['repository', 'snapshot', 'target_snapshot'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(snapshot_clone_request, 'body'),
    getLooseObjectFromProperty(snapshot_clone_request, 'path'),
    getLooseObjectFromProperty(snapshot_clone_request, 'query'),
  ]),
  outputSchema: snapshot_clone_response,
};
const SNAPSHOT_CREATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.create',
  summary: `Create a snapshot`,
  description: `Create a snapshot.
Take a snapshot of a cluster or of data streams and indices.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_snapshot/{repository}/{snapshot}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-create',
  parameterTypes: {
    pathParams: ['repository', 'snapshot', 'repository', 'snapshot'],
    urlParams: [
      'after',
      'from_sort_value',
      'ignore_unavailable',
      'index_details',
      'index_names',
      'include_repository',
      'master_timeout',
      'order',
      'offset',
      'size',
      'slm_policy_filter',
      'sort',
      'state',
      'verbose',
      'master_timeout',
      'wait_for_completion',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(snapshot_create_request, 'body'),
    getLooseObjectFromProperty(snapshot_create_request, 'path'),
    getLooseObjectFromProperty(snapshot_create_request, 'query'),
    getLooseObjectFromProperty(snapshot_create1_request, 'body'),
    getLooseObjectFromProperty(snapshot_create1_request, 'path'),
    getLooseObjectFromProperty(snapshot_create1_request, 'query'),
  ]),
  outputSchema: z.union([snapshot_create_response, snapshot_create1_response]),
};
const SNAPSHOT_CREATE_REPOSITORY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.create_repository',
  summary: `Create or update a snapshot repository`,
  description: `Create or update a snapshot repository.
IMPORTANT: If you are migrating searchable snapshots, the repository name must be identical in the source and destination clusters.
To register a snapshot repository, the cluster's global metadata must be writeable.
Ensure there are no cluster blocks (for example, \`cluster.blocks.read_only\` and \`clsuter.blocks.read_only_allow_delete\` settings) that prevent write access.

Several options for this API can be specified using a query parameter or a request body parameter.
If both parameters are specified, only the query parameter is used.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_snapshot/{repository}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-create-repository',
  parameterTypes: {
    pathParams: ['repository'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(snapshot_create_repository_request, 'body'),
    getLooseObjectFromProperty(snapshot_create_repository_request, 'path'),
    getLooseObjectFromProperty(snapshot_create_repository_request, 'query'),
    getLooseObjectFromProperty(snapshot_create_repository1_request, 'body'),
    getLooseObjectFromProperty(snapshot_create_repository1_request, 'path'),
    getLooseObjectFromProperty(snapshot_create_repository1_request, 'query'),
  ]),
  outputSchema: z.union([
    snapshot_create_repository_response,
    snapshot_create_repository1_response,
  ]),
};
const SNAPSHOT_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.delete',
  summary: `Delete snapshots`,
  description: `Delete snapshots.`,
  methods: ['DELETE'],
  patterns: ['/_snapshot/{repository}/{snapshot}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-delete',
  parameterTypes: {
    pathParams: ['repository', 'snapshot', 'repository', 'snapshot'],
    urlParams: [
      'after',
      'from_sort_value',
      'ignore_unavailable',
      'index_details',
      'index_names',
      'include_repository',
      'master_timeout',
      'order',
      'offset',
      'size',
      'slm_policy_filter',
      'sort',
      'state',
      'verbose',
      'master_timeout',
      'wait_for_completion',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(snapshot_delete_request, 'body'),
    getLooseObjectFromProperty(snapshot_delete_request, 'path'),
    getLooseObjectFromProperty(snapshot_delete_request, 'query'),
  ]),
  outputSchema: snapshot_delete_response,
};
const SNAPSHOT_DELETE_REPOSITORY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.delete_repository',
  summary: `Delete snapshot repositories`,
  description: `Delete snapshot repositories.
When a repository is unregistered, Elasticsearch removes only the reference to the location where the repository is storing the snapshots.
The snapshots themselves are left untouched and in place.`,
  methods: ['DELETE'],
  patterns: ['/_snapshot/{repository}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-delete-repository',
  parameterTypes: {
    pathParams: ['repository'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(snapshot_delete_repository_request, 'body'),
    getLooseObjectFromProperty(snapshot_delete_repository_request, 'path'),
    getLooseObjectFromProperty(snapshot_delete_repository_request, 'query'),
  ]),
  outputSchema: snapshot_delete_repository_response,
};
const SNAPSHOT_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.get',
  summary: `Get snapshot information`,
  description: `Get snapshot information.

NOTE: The \`after\` parameter and \`next\` field enable you to iterate through snapshots with some consistency guarantees regarding concurrent creation or deletion of snapshots.
It is guaranteed that any snapshot that exists at the beginning of the iteration and is not concurrently deleted will be seen during the iteration.
Snapshots concurrently created may be seen during an iteration.`,
  methods: ['GET'],
  patterns: ['/_snapshot/{repository}/{snapshot}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-get',
  parameterTypes: {
    pathParams: ['repository', 'snapshot', 'repository', 'snapshot'],
    urlParams: [
      'after',
      'from_sort_value',
      'ignore_unavailable',
      'index_details',
      'index_names',
      'include_repository',
      'master_timeout',
      'order',
      'offset',
      'size',
      'slm_policy_filter',
      'sort',
      'state',
      'verbose',
      'master_timeout',
      'wait_for_completion',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(snapshot_get_request, 'body'),
    getLooseObjectFromProperty(snapshot_get_request, 'path'),
    getLooseObjectFromProperty(snapshot_get_request, 'query'),
  ]),
  outputSchema: snapshot_get_response,
};
const SNAPSHOT_GET_REPOSITORY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.get_repository',
  summary: `Get snapshot repository information`,
  description: `Get snapshot repository information.`,
  methods: ['GET', 'GET'],
  patterns: ['/_snapshot', '/_snapshot/{repository}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-get-repository',
  parameterTypes: {
    pathParams: ['repository'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(snapshot_get_repository_request, 'body'),
    getLooseObjectFromProperty(snapshot_get_repository_request, 'path'),
    getLooseObjectFromProperty(snapshot_get_repository_request, 'query'),
    getLooseObjectFromProperty(snapshot_get_repository1_request, 'body'),
    getLooseObjectFromProperty(snapshot_get_repository1_request, 'path'),
    getLooseObjectFromProperty(snapshot_get_repository1_request, 'query'),
  ]),
  outputSchema: z.union([snapshot_get_repository_response, snapshot_get_repository1_response]),
};
const SNAPSHOT_REPOSITORY_ANALYZE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.repository_analyze',
  summary: `Analyze a snapshot repository`,
  description: `Analyze a snapshot repository.

Performs operations on a snapshot repository in order to check for incorrect behaviour.

There are a large number of third-party storage systems available, not all of which are suitable for use as a snapshot repository by Elasticsearch.
Some storage systems behave incorrectly, or perform poorly, especially when accessed concurrently by multiple clients as the nodes of an Elasticsearch cluster do.
This API performs a collection of read and write operations on your repository which are designed to detect incorrect behaviour and to measure the performance characteristics of your storage system.

The default values for the parameters are deliberately low to reduce the impact of running an analysis inadvertently and to provide a sensible starting point for your investigations.
Run your first analysis with the default parameter values to check for simple problems.
Some repositories may behave correctly when lightly loaded but incorrectly under production-like workloads.
If the first analysis is successful, run a sequence of increasingly large analyses until you encounter a failure or you reach a \`blob_count\` of at least \`2000\`, a \`max_blob_size\` of at least \`2gb\`, a \`max_total_data_size\` of at least \`1tb\`, and a \`register_operation_count\` of at least \`100\`.
Always specify a generous timeout, possibly \`1h\` or longer, to allow time for each analysis to run to completion.
Some repositories may behave correctly when accessed by a small number of Elasticsearch nodes but incorrectly when accessed concurrently by a production-scale cluster.
Perform the analyses using a multi-node cluster of a similar size to your production cluster so that it can detect any problems that only arise when the repository is accessed by many nodes at once.

If the analysis fails, Elasticsearch detected that your repository behaved unexpectedly.
This usually means you are using a third-party storage system with an incorrect or incompatible implementation of the API it claims to support.
If so, this storage system is not suitable for use as a snapshot repository.
Repository analysis triggers conditions that occur only rarely when taking snapshots in a production system.
Snapshotting to unsuitable storage may appear to work correctly most of the time despite repository analysis failures.
However your snapshot data is at risk if you store it in a snapshot repository that does not reliably pass repository analysis.
You can demonstrate that the analysis failure is due to an incompatible storage implementation by verifying that Elasticsearch does not detect the same problem when analysing the reference implementation of the storage protocol you are using.
For instance, if you are using storage that offers an API which the supplier claims to be compatible with AWS S3, verify that repositories in AWS S3 do not fail repository analysis.
This allows you to demonstrate to your storage supplier that a repository analysis failure must only be caused by an incompatibility with AWS S3 and cannot be attributed to a problem in Elasticsearch.
Please do not report Elasticsearch issues involving third-party storage systems unless you can demonstrate that the same issue exists when analysing a repository that uses the reference implementation of the same storage protocol.
You will need to work with the supplier of your storage system to address the incompatibilities that Elasticsearch detects.

If the analysis is successful, the API returns details of the testing process, optionally including how long each operation took.
You can use this information to determine the performance of your storage system.
If any operation fails or returns an incorrect result, the API returns an error.
If the API returns an error, it may not have removed all the data it wrote to the repository.
The error will indicate the location of any leftover data and this path is also recorded in the Elasticsearch logs.
You should verify that this location has been cleaned up correctly.
If there is still leftover data at the specified location, you should manually remove it.

If the connection from your client to Elasticsearch is closed while the client is waiting for the result of the analysis, the test is cancelled.
Some clients are configured to close their connection if no response is received within a certain timeout.
An analysis takes a long time to complete so you might need to relax any such client-side timeouts.
On cancellation the analysis attempts to clean up the data it was writing, but it may not be able to remove it all.
The path to the leftover data is recorded in the Elasticsearch logs.
You should verify that this location has been cleaned up correctly.
If there is still leftover data at the specified location, you should manually remove it.

If the analysis is successful then it detected no incorrect behaviour, but this does not mean that correct behaviour is guaranteed.
The analysis attempts to detect common bugs but it does not offer 100% coverage.
Additionally, it does not test the following:

* Your repository must perform durable writes. Once a blob has been written it must remain in place until it is deleted, even after a power loss or similar disaster.
* Your repository must not suffer from silent data corruption. Once a blob has been written, its contents must remain unchanged until it is deliberately modified or deleted.
* Your repository must behave correctly even if connectivity from the cluster is disrupted. Reads and writes may fail in this case, but they must not return incorrect results.

IMPORTANT: An analysis writes a substantial amount of data to your repository and then reads it back again.
This consumes bandwidth on the network between the cluster and the repository, and storage space and I/O bandwidth on the repository itself.
You must ensure this load does not affect other users of these systems.
Analyses respect the repository settings \`max_snapshot_bytes_per_sec\` and \`max_restore_bytes_per_sec\` if available and the cluster setting \`indices.recovery.max_bytes_per_sec\` which you can use to limit the bandwidth they consume.

NOTE: This API is intended for exploratory use by humans.
You should expect the request parameters and the response format to vary in future versions.
The response exposes immplementation details of the analysis which may change from version to version.

NOTE: Different versions of Elasticsearch may perform different checks for repository compatibility, with newer versions typically being stricter than older ones.
A storage system that passes repository analysis with one version of Elasticsearch may fail with a different version.
This indicates it behaves incorrectly in ways that the former version did not detect.
You must work with the supplier of your storage system to address the incompatibilities detected by the repository analysis API in any version of Elasticsearch.

NOTE: This API may not work correctly in a mixed-version cluster.

*Implementation details*

NOTE: This section of documentation describes how the repository analysis API works in this version of Elasticsearch, but you should expect the implementation to vary between versions.
The request parameters and response format depend on details of the implementation so may also be different in newer versions.

The analysis comprises a number of blob-level tasks, as set by the \`blob_count\` parameter and a number of compare-and-exchange operations on linearizable registers, as set by the \`register_operation_count\` parameter.
These tasks are distributed over the data and master-eligible nodes in the cluster for execution.

For most blob-level tasks, the executing node first writes a blob to the repository and then instructs some of the other nodes in the cluster to attempt to read the data it just wrote.
The size of the blob is chosen randomly, according to the \`max_blob_size\` and \`max_total_data_size\` parameters.
If any of these reads fails then the repository does not implement the necessary read-after-write semantics that Elasticsearch requires.

For some blob-level tasks, the executing node will instruct some of its peers to attempt to read the data before the writing process completes.
These reads are permitted to fail, but must not return partial data.
If any read returns partial data then the repository does not implement the necessary atomicity semantics that Elasticsearch requires.

For some blob-level tasks, the executing node will overwrite the blob while its peers are reading it.
In this case the data read may come from either the original or the overwritten blob, but the read operation must not return partial data or a mix of data from the two blobs.
If any of these reads returns partial data or a mix of the two blobs then the repository does not implement the necessary atomicity semantics that Elasticsearch requires for overwrites.

The executing node will use a variety of different methods to write the blob.
For instance, where applicable, it will use both single-part and multi-part uploads.
Similarly, the reading nodes will use a variety of different methods to read the data back again.
For instance they may read the entire blob from start to end or may read only a subset of the data.

For some blob-level tasks, the executing node will cancel the write before it is complete.
In this case, it still instructs some of the other nodes in the cluster to attempt to read the blob but all of these reads must fail to find the blob.

Linearizable registers are special blobs that Elasticsearch manipulates using an atomic compare-and-exchange operation.
This operation ensures correct and strongly-consistent behavior even when the blob is accessed by multiple nodes at the same time.
The detailed implementation of the compare-and-exchange operation on linearizable registers varies by repository type.
Repository analysis verifies that that uncontended compare-and-exchange operations on a linearizable register blob always succeed.
Repository analysis also verifies that contended operations either succeed or report the contention but do not return incorrect results.
If an operation fails due to contention, Elasticsearch retries the operation until it succeeds.
Most of the compare-and-exchange operations performed by repository analysis atomically increment a counter which is represented as an 8-byte blob.
Some operations also verify the behavior on small blobs with sizes other than 8 bytes.`,
  methods: ['POST'],
  patterns: ['/_snapshot/{repository}/_analyze'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-repository-analyze',
  parameterTypes: {
    pathParams: ['repository'],
    urlParams: [
      'blob_count',
      'concurrency',
      'detailed',
      'early_read_node_count',
      'max_blob_size',
      'max_total_data_size',
      'rare_action_probability',
      'rarely_abort_writes',
      'read_node_count',
      'register_operation_count',
      'seed',
      'timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(snapshot_repository_analyze_request, 'body'),
    getLooseObjectFromProperty(snapshot_repository_analyze_request, 'path'),
    getLooseObjectFromProperty(snapshot_repository_analyze_request, 'query'),
  ]),
  outputSchema: snapshot_repository_analyze_response,
};
const SNAPSHOT_REPOSITORY_VERIFY_INTEGRITY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.repository_verify_integrity',
  summary: `Verify the repository integrity`,
  description: `Verify the repository integrity.
Verify the integrity of the contents of a snapshot repository.

This API enables you to perform a comprehensive check of the contents of a repository, looking for any anomalies in its data or metadata which might prevent you from restoring snapshots from the repository or which might cause future snapshot create or delete operations to fail.

If you suspect the integrity of the contents of one of your snapshot repositories, cease all write activity to this repository immediately, set its \`read_only\` option to \`true\`, and use this API to verify its integrity.
Until you do so:

* It may not be possible to restore some snapshots from this repository.
* Searchable snapshots may report errors when searched or may have unassigned shards.
* Taking snapshots into this repository may fail or may appear to succeed but have created a snapshot which cannot be restored.
* Deleting snapshots from this repository may fail or may appear to succeed but leave the underlying data on disk.
* Continuing to write to the repository while it is in an invalid state may causing additional damage to its contents.

If the API finds any problems with the integrity of the contents of your repository, Elasticsearch will not be able to repair the damage.
The only way to bring the repository back into a fully working state after its contents have been damaged is by restoring its contents from a repository backup which was taken before the damage occurred.
You must also identify what caused the damage and take action to prevent it from happening again.

If you cannot restore a repository backup, register a new repository and use this for all future snapshot operations.
In some cases it may be possible to recover some of the contents of a damaged repository, either by restoring as many of its snapshots as needed and taking new snapshots of the restored data, or by using the reindex API to copy data from any searchable snapshots mounted from the damaged repository.

Avoid all operations which write to the repository while the verify repository integrity API is running.
If something changes the repository contents while an integrity verification is running then Elasticsearch may incorrectly report having detected some anomalies in its contents due to the concurrent writes.
It may also incorrectly fail to report some anomalies that the concurrent writes prevented it from detecting.

NOTE: This API is intended for exploratory use by humans. You should expect the request parameters and the response format to vary in future versions.

NOTE: This API may not work correctly in a mixed-version cluster.

The default values for the parameters of this API are designed to limit the impact of the integrity verification on other activities in your cluster.
For instance, by default it will only use at most half of the \`snapshot_meta\` threads to verify the integrity of each snapshot, allowing other snapshot operations to use the other half of this thread pool.
If you modify these parameters to speed up the verification process, you risk disrupting other snapshot-related operations in your cluster.
For large repositories, consider setting up a separate single-node Elasticsearch cluster just for running the integrity verification API.

The response exposes implementation details of the analysis which may change from version to version.
The response body format is therefore not considered stable and may be different in newer versions.`,
  methods: ['POST'],
  patterns: ['/_snapshot/{repository}/_verify_integrity'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-repository-verify-integrity',
  parameterTypes: {
    pathParams: ['repository'],
    urlParams: [
      'blob_thread_pool_concurrency',
      'index_snapshot_verification_concurrency',
      'index_verification_concurrency',
      'max_bytes_per_sec',
      'max_failed_shard_snapshots',
      'meta_thread_pool_concurrency',
      'snapshot_verification_concurrency',
      'verify_blob_contents',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(snapshot_repository_verify_integrity_request, 'body'),
    getLooseObjectFromProperty(snapshot_repository_verify_integrity_request, 'path'),
    getLooseObjectFromProperty(snapshot_repository_verify_integrity_request, 'query'),
  ]),
  outputSchema: snapshot_repository_verify_integrity_response,
};
const SNAPSHOT_RESTORE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.restore',
  summary: `Restore a snapshot`,
  description: `Restore a snapshot.
Restore a snapshot of a cluster or data streams and indices.

You can restore a snapshot only to a running cluster with an elected master node.
The snapshot repository must be registered and available to the cluster.
The snapshot and cluster versions must be compatible.

To restore a snapshot, the cluster's global metadata must be writable. Ensure there are't any cluster blocks that prevent writes. The restore operation ignores index blocks.

Before you restore a data stream, ensure the cluster contains a matching index template with data streams enabled. To check, use the index management feature in Kibana or the get index template API:

\`\`\`
GET _index_template/*?filter_path=index_templates.name,index_templates.index_template.index_patterns,index_templates.index_template.data_stream
\`\`\`

If no such template exists, you can create one or restore a cluster state that contains one. Without a matching index template, a data stream can't roll over or create backing indices.

If your snapshot contains data from App Search or Workplace Search, you must restore the Enterprise Search encryption key before you restore the snapshot.`,
  methods: ['POST'],
  patterns: ['/_snapshot/{repository}/{snapshot}/_restore'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-restore',
  parameterTypes: {
    pathParams: ['repository', 'snapshot'],
    urlParams: ['master_timeout', 'wait_for_completion'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(snapshot_restore_request, 'body'),
    getLooseObjectFromProperty(snapshot_restore_request, 'path'),
    getLooseObjectFromProperty(snapshot_restore_request, 'query'),
  ]),
  outputSchema: snapshot_restore_response,
};
const SNAPSHOT_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.status',
  summary: `Get the snapshot status`,
  description: `Get the snapshot status.
Get a detailed description of the current state for each shard participating in the snapshot.

Note that this API should be used only to obtain detailed shard-level information for ongoing snapshots.
If this detail is not needed or you want to obtain information about one or more existing snapshots, use the get snapshot API.

If you omit the \`<snapshot>\` request path parameter, the request retrieves information only for currently running snapshots.
This usage is preferred.
If needed, you can specify \`<repository>\` and \`<snapshot>\` to retrieve information for specific snapshots, even if they're not currently running.

Note that the stats will not be available for any shard snapshots in an ongoing snapshot completed by a node that (even momentarily) left the cluster.
Loading the stats from the repository is an expensive operation (see the WARNING below).
Therefore the stats values for such shards will be -1 even though the "stage" value will be "DONE", in order to minimize latency.
A "description" field will be present for a shard snapshot completed by a departed node explaining why the shard snapshot's stats results are invalid.
Consequently, the total stats for the index will be less than expected due to the missing values from these shards.

WARNING: Using the API to return the status of any snapshots other than currently running snapshots can be expensive.
The API requires a read from the repository for each shard in each snapshot.
For example, if you have 100 snapshots with 1,000 shards each, an API request that includes all snapshots will require 100,000 reads (100 snapshots x 1,000 shards).

Depending on the latency of your storage, such requests can take an extremely long time to return results.
These requests can also tax machine resources and, when using cloud storage, incur high processing costs.`,
  methods: ['GET', 'GET', 'GET'],
  patterns: [
    '/_snapshot/_status',
    '/_snapshot/{repository}/_status',
    '/_snapshot/{repository}/{snapshot}/_status',
  ],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-status',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(snapshot_status_request, 'body'),
    getLooseObjectFromProperty(snapshot_status_request, 'path'),
    getLooseObjectFromProperty(snapshot_status_request, 'query'),
    getLooseObjectFromProperty(snapshot_status1_request, 'body'),
    getLooseObjectFromProperty(snapshot_status1_request, 'path'),
    getLooseObjectFromProperty(snapshot_status1_request, 'query'),
    getLooseObjectFromProperty(snapshot_status2_request, 'body'),
    getLooseObjectFromProperty(snapshot_status2_request, 'path'),
    getLooseObjectFromProperty(snapshot_status2_request, 'query'),
  ]),
  outputSchema: z.union([
    snapshot_status_response,
    snapshot_status1_response,
    snapshot_status2_response,
  ]),
};
const SNAPSHOT_VERIFY_REPOSITORY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.verify_repository',
  summary: `Verify a snapshot repository`,
  description: `Verify a snapshot repository.
Check for common misconfigurations in a snapshot repository.`,
  methods: ['POST'],
  patterns: ['/_snapshot/{repository}/_verify'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-verify-repository',
  parameterTypes: {
    pathParams: ['repository'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(snapshot_verify_repository_request, 'body'),
    getLooseObjectFromProperty(snapshot_verify_repository_request, 'path'),
    getLooseObjectFromProperty(snapshot_verify_repository_request, 'query'),
  ]),
  outputSchema: snapshot_verify_repository_response,
};
const SQL_CLEAR_CURSOR_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.sql.clear_cursor',
  summary: `Clear an SQL search cursor`,
  description: `Clear an SQL search cursor.`,
  methods: ['POST'],
  patterns: ['/_sql/close'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-clear-cursor',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(sql_clear_cursor_request, 'body'),
    getLooseObjectFromProperty(sql_clear_cursor_request, 'path'),
    getLooseObjectFromProperty(sql_clear_cursor_request, 'query'),
  ]),
  outputSchema: sql_clear_cursor_response,
};
const SQL_DELETE_ASYNC_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.sql.delete_async',
  summary: `Delete an async SQL search`,
  description: `Delete an async SQL search.
Delete an async SQL search or a stored synchronous SQL search.
If the search is still running, the API cancels it.

If the Elasticsearch security features are enabled, only the following users can use this API to delete a search:

* Users with the \`cancel_task\` cluster privilege.
* The user who first submitted the search.`,
  methods: ['DELETE'],
  patterns: ['/_sql/async/delete/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-delete-async',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(sql_delete_async_request, 'body'),
    getLooseObjectFromProperty(sql_delete_async_request, 'path'),
    getLooseObjectFromProperty(sql_delete_async_request, 'query'),
  ]),
  outputSchema: sql_delete_async_response,
};
const SQL_GET_ASYNC_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.sql.get_async',
  summary: `Get async SQL search results`,
  description: `Get async SQL search results.
Get the current status and available results for an async SQL search or stored synchronous SQL search.

If the Elasticsearch security features are enabled, only the user who first submitted the SQL search can retrieve the search using this API.`,
  methods: ['GET'],
  patterns: ['/_sql/async/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-get-async',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: ['delimiter', 'format', 'keep_alive', 'wait_for_completion_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(sql_get_async_request, 'body'),
    getLooseObjectFromProperty(sql_get_async_request, 'path'),
    getLooseObjectFromProperty(sql_get_async_request, 'query'),
  ]),
  outputSchema: sql_get_async_response,
};
const SQL_GET_ASYNC_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.sql.get_async_status',
  summary: `Get the async SQL search status`,
  description: `Get the async SQL search status.
Get the current status of an async SQL search or a stored synchronous SQL search.`,
  methods: ['GET'],
  patterns: ['/_sql/async/status/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-get-async-status',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(sql_get_async_status_request, 'body'),
    getLooseObjectFromProperty(sql_get_async_status_request, 'path'),
    getLooseObjectFromProperty(sql_get_async_status_request, 'query'),
  ]),
  outputSchema: sql_get_async_status_response,
};
const SQL_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.sql.query',
  summary: `Get SQL search results`,
  description: `Get SQL search results.
Run an SQL request.`,
  methods: ['POST', 'GET'],
  patterns: ['/_sql'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-query',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(sql_query_request, 'body'),
    getLooseObjectFromProperty(sql_query_request, 'path'),
    getLooseObjectFromProperty(sql_query_request, 'query'),
    getLooseObjectFromProperty(sql_query1_request, 'body'),
    getLooseObjectFromProperty(sql_query1_request, 'path'),
    getLooseObjectFromProperty(sql_query1_request, 'query'),
  ]),
  outputSchema: z.union([sql_query_response, sql_query1_response]),
};
const SQL_TRANSLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.sql.translate',
  summary: `Translate SQL into Elasticsearch queries`,
  description: `Translate SQL into Elasticsearch queries.
Translate an SQL search into a search API request containing Query DSL.
It accepts the same request body parameters as the SQL search API, excluding \`cursor\`.`,
  methods: ['POST', 'GET'],
  patterns: ['/_sql/translate'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-translate',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(sql_translate_request, 'body'),
    getLooseObjectFromProperty(sql_translate_request, 'path'),
    getLooseObjectFromProperty(sql_translate_request, 'query'),
    getLooseObjectFromProperty(sql_translate1_request, 'body'),
    getLooseObjectFromProperty(sql_translate1_request, 'path'),
    getLooseObjectFromProperty(sql_translate1_request, 'query'),
  ]),
  outputSchema: z.union([sql_translate_response, sql_translate1_response]),
};
const SSL_CERTIFICATES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ssl.certificates',
  summary: `Get SSL certificates`,
  description: `Get SSL certificates.

Get information about the X.509 certificates that are used to encrypt communications in the cluster.
The API returns a list that includes certificates from all TLS contexts including:

- Settings for transport and HTTP interfaces
- TLS settings that are used within authentication realms
- TLS settings for remote monitoring exporters

The list includes certificates that are used for configuring trust, such as those configured in the \`xpack.security.transport.ssl.truststore\` and \`xpack.security.transport.ssl.certificate_authorities\` settings.
It also includes certificates that are used for configuring server identity, such as \`xpack.security.http.ssl.keystore\` and \`xpack.security.http.ssl.certificate settings\`.

The list does not include certificates that are sourced from the default SSL context of the Java Runtime Environment (JRE), even if those certificates are in use within Elasticsearch.

NOTE: When a PKCS#11 token is configured as the truststore of the JRE, the API returns all the certificates that are included in the PKCS#11 token irrespective of whether these are used in the Elasticsearch TLS configuration.

If Elasticsearch is configured to use a keystore or truststore, the API output includes all certificates in that store, even though some of the certificates might not be in active use within the cluster.`,
  methods: ['GET'],
  patterns: ['/_ssl/certificates'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ssl-certificates',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ssl_certificates_request, 'body'),
    getLooseObjectFromProperty(ssl_certificates_request, 'path'),
    getLooseObjectFromProperty(ssl_certificates_request, 'query'),
  ]),
  outputSchema: ssl_certificates_response,
};
const STREAMS_LOGS_DISABLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.streams.logs_disable',
  summary: ``,
  description: `Disable logs stream.

Turn off the logs stream feature for this cluster.`,
  methods: ['POST'],
  patterns: ['/_streams/logs/_disable'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch#TODO',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const STREAMS_LOGS_ENABLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.streams.logs_enable',
  summary: ``,
  description: `Enable logs stream.

Turn on the logs stream feature for this cluster.

NOTE: To protect existing data, this feature can be turned on only if the
cluster does not have existing indices or data streams that match the pattern \`logs|logs.*\`.
If those indices or data streams exist, a \`409 - Conflict\` response and error is returned.`,
  methods: ['POST'],
  patterns: ['/_streams/logs/_enable'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch#TODO',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const STREAMS_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.streams.status',
  summary: ``,
  description: `Get the status of streams.

Get the current status for all types of streams.`,
  methods: ['GET'],
  patterns: ['/_streams/status'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch#TODO',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const SYNONYMS_DELETE_SYNONYM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.synonyms.delete_synonym',
  summary: `Delete a synonym set`,
  description: `Delete a synonym set.

You can only delete a synonyms set that is not in use by any index analyzer.

Synonyms sets can be used in synonym graph token filters and synonym token filters.
These synonym filters can be used as part of search analyzers.

Analyzers need to be loaded when an index is restored (such as when a node starts, or the index becomes open).
Even if the analyzer is not used on any field mapping, it still needs to be loaded on the index recovery phase.

If any analyzers cannot be loaded, the index becomes unavailable and the cluster status becomes red or yellow as index shards are not available.
To prevent that, synonyms sets that are used in analyzers can't be deleted.
A delete request in this case will return a 400 response code.

To remove a synonyms set, you must first remove all indices that contain analyzers using it.
You can migrate an index by creating a new index that does not contain the token filter with the synonyms set, and use the reindex API in order to copy over the index data.
Once finished, you can delete the index.
When the synonyms set is not used in analyzers, you will be able to delete it.`,
  methods: ['DELETE'],
  patterns: ['/_synonyms/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-delete-synonym',
  parameterTypes: {
    pathParams: ['id', 'id', 'id'],
    urlParams: ['from', 'size', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(synonyms_delete_synonym_request, 'body'),
    getLooseObjectFromProperty(synonyms_delete_synonym_request, 'path'),
    getLooseObjectFromProperty(synonyms_delete_synonym_request, 'query'),
  ]),
  outputSchema: synonyms_delete_synonym_response,
};
const SYNONYMS_DELETE_SYNONYM_RULE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.synonyms.delete_synonym_rule',
  summary: `Delete a synonym rule`,
  description: `Delete a synonym rule.
Delete a synonym rule from a synonym set.`,
  methods: ['DELETE'],
  patterns: ['/_synonyms/{set_id}/{rule_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-delete-synonym-rule',
  parameterTypes: {
    pathParams: ['set_id', 'rule_id', 'set_id', 'rule_id', 'set_id', 'rule_id'],
    urlParams: ['refresh', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(synonyms_delete_synonym_rule_request, 'body'),
    getLooseObjectFromProperty(synonyms_delete_synonym_rule_request, 'path'),
    getLooseObjectFromProperty(synonyms_delete_synonym_rule_request, 'query'),
  ]),
  outputSchema: synonyms_delete_synonym_rule_response,
};
const SYNONYMS_GET_SYNONYM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.synonyms.get_synonym',
  summary: `Get a synonym set`,
  description: `Get a synonym set.`,
  methods: ['GET'],
  patterns: ['/_synonyms/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-get-synonym',
  parameterTypes: {
    pathParams: ['id', 'id', 'id'],
    urlParams: ['from', 'size', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(synonyms_get_synonym_request, 'body'),
    getLooseObjectFromProperty(synonyms_get_synonym_request, 'path'),
    getLooseObjectFromProperty(synonyms_get_synonym_request, 'query'),
  ]),
  outputSchema: synonyms_get_synonym_response,
};
const SYNONYMS_GET_SYNONYM_RULE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.synonyms.get_synonym_rule',
  summary: `Get a synonym rule`,
  description: `Get a synonym rule.
Get a synonym rule from a synonym set.`,
  methods: ['GET'],
  patterns: ['/_synonyms/{set_id}/{rule_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-get-synonym-rule',
  parameterTypes: {
    pathParams: ['set_id', 'rule_id', 'set_id', 'rule_id', 'set_id', 'rule_id'],
    urlParams: ['refresh', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(synonyms_get_synonym_rule_request, 'body'),
    getLooseObjectFromProperty(synonyms_get_synonym_rule_request, 'path'),
    getLooseObjectFromProperty(synonyms_get_synonym_rule_request, 'query'),
  ]),
  outputSchema: synonyms_get_synonym_rule_response,
};
const SYNONYMS_GET_SYNONYMS_SETS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.synonyms.get_synonyms_sets',
  summary: `Get all synonym sets`,
  description: `Get all synonym sets.
Get a summary of all defined synonym sets.`,
  methods: ['GET'],
  patterns: ['/_synonyms'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-get-synonym',
  parameterTypes: {
    pathParams: [],
    urlParams: ['from', 'size'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(synonyms_get_synonyms_sets_request, 'body'),
    getLooseObjectFromProperty(synonyms_get_synonyms_sets_request, 'path'),
    getLooseObjectFromProperty(synonyms_get_synonyms_sets_request, 'query'),
  ]),
  outputSchema: synonyms_get_synonyms_sets_response,
};
const SYNONYMS_PUT_SYNONYM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.synonyms.put_synonym',
  summary: `Create or update a synonym set`,
  description: `Create or update a synonym set.
Synonyms sets are limited to a maximum of 10,000 synonym rules per set.
If you need to manage more synonym rules, you can create multiple synonym sets.

When an existing synonyms set is updated, the search analyzers that use the synonyms set are reloaded automatically for all indices.
This is equivalent to invoking the reload search analyzers API for all indices that use the synonyms set.

For practical examples of how to create or update a synonyms set, refer to the External documentation.`,
  methods: ['PUT'],
  patterns: ['/_synonyms/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-put-synonym',
  parameterTypes: {
    pathParams: ['id', 'id', 'id'],
    urlParams: ['from', 'size', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(synonyms_put_synonym_request, 'body'),
    getLooseObjectFromProperty(synonyms_put_synonym_request, 'path'),
    getLooseObjectFromProperty(synonyms_put_synonym_request, 'query'),
  ]),
  outputSchema: synonyms_put_synonym_response,
};
const SYNONYMS_PUT_SYNONYM_RULE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.synonyms.put_synonym_rule',
  summary: `Create or update a synonym rule`,
  description: `Create or update a synonym rule.
Create or update a synonym rule in a synonym set.

If any of the synonym rules included is invalid, the API returns an error.

When you update a synonym rule, all analyzers using the synonyms set will be reloaded automatically to reflect the new rule.`,
  methods: ['PUT'],
  patterns: ['/_synonyms/{set_id}/{rule_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-put-synonym-rule',
  parameterTypes: {
    pathParams: ['set_id', 'rule_id', 'set_id', 'rule_id', 'set_id', 'rule_id'],
    urlParams: ['refresh', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(synonyms_put_synonym_rule_request, 'body'),
    getLooseObjectFromProperty(synonyms_put_synonym_rule_request, 'path'),
    getLooseObjectFromProperty(synonyms_put_synonym_rule_request, 'query'),
  ]),
  outputSchema: synonyms_put_synonym_rule_response,
};
const TASKS_CANCEL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.tasks.cancel',
  summary: `Cancel a task`,
  description: `Cancel a task.

WARNING: The task management API is new and should still be considered a beta feature.
The API may change in ways that are not backwards compatible.

A task may continue to run for some time after it has been cancelled because it may not be able to safely stop its current activity straight away.
It is also possible that Elasticsearch must complete its work on other tasks before it can process the cancellation.
The get task information API will continue to list these cancelled tasks until they complete.
The cancelled flag in the response indicates that the cancellation command has been processed and the task will stop as soon as possible.

To troubleshoot why a cancelled task does not complete promptly, use the get task information API with the \`?detailed\` parameter to identify the other tasks the system is running.
You can also use the node hot threads API to obtain detailed information about the work the system is doing instead of completing the cancelled task.`,
  methods: ['POST', 'POST'],
  patterns: ['/_tasks/_cancel', '/_tasks/{task_id}/_cancel'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-tasks',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(tasks_cancel_request, 'body'),
    getLooseObjectFromProperty(tasks_cancel_request, 'path'),
    getLooseObjectFromProperty(tasks_cancel_request, 'query'),
    getLooseObjectFromProperty(tasks_cancel1_request, 'body'),
    getLooseObjectFromProperty(tasks_cancel1_request, 'path'),
    getLooseObjectFromProperty(tasks_cancel1_request, 'query'),
  ]),
  outputSchema: z.union([tasks_cancel_response, tasks_cancel1_response]),
};
const TASKS_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.tasks.get',
  summary: `Get task information`,
  description: `Get task information.
Get information about a task currently running in the cluster.

WARNING: The task management API is new and should still be considered a beta feature.
The API may change in ways that are not backwards compatible.

If the task identifier is not found, a 404 response code indicates that there are no resources that match the request.`,
  methods: ['GET'],
  patterns: ['/_tasks/{task_id}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-tasks',
  parameterTypes: {
    pathParams: ['task_id'],
    urlParams: ['timeout', 'wait_for_completion'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(tasks_get_request, 'body'),
    getLooseObjectFromProperty(tasks_get_request, 'path'),
    getLooseObjectFromProperty(tasks_get_request, 'query'),
  ]),
  outputSchema: tasks_get_response,
};
const TASKS_LIST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.tasks.list',
  summary: `Get all tasks`,
  description: `Get all tasks.
Get information about the tasks currently running on one or more nodes in the cluster.

WARNING: The task management API is new and should still be considered a beta feature.
The API may change in ways that are not backwards compatible.

**Identifying running tasks**

The \`X-Opaque-Id header\`, when provided on the HTTP request header, is going to be returned as a header in the response as well as in the headers field for in the task information.
This enables you to track certain calls or associate certain tasks with the client that started them.
For example:

\`\`\`
curl -i -H "X-Opaque-Id: 123456" "http://localhost:9200/_tasks?group_by=parents"
\`\`\`

The API returns the following result:

\`\`\`
HTTP/1.1 200 OK
X-Opaque-Id: 123456
content-type: application/json; charset=UTF-8
content-length: 831

{
  "tasks" : {
    "u5lcZHqcQhu-rUoFaqDphA:45" : {
      "node" : "u5lcZHqcQhu-rUoFaqDphA",
      "id" : 45,
      "type" : "transport",
      "action" : "cluster:monitor/tasks/lists",
      "start_time_in_millis" : 1513823752749,
      "running_time_in_nanos" : 293139,
      "cancellable" : false,
      "headers" : {
        "X-Opaque-Id" : "123456"
      },
      "children" : [
        {
          "node" : "u5lcZHqcQhu-rUoFaqDphA",
          "id" : 46,
          "type" : "direct",
          "action" : "cluster:monitor/tasks/lists[n]",
          "start_time_in_millis" : 1513823752750,
          "running_time_in_nanos" : 92133,
          "cancellable" : false,
          "parent_task_id" : "u5lcZHqcQhu-rUoFaqDphA:45",
          "headers" : {
            "X-Opaque-Id" : "123456"
          }
        }
      ]
    }
  }
 }
\`\`\`
In this example, \`X-Opaque-Id: 123456\` is the ID as a part of the response header.
The \`X-Opaque-Id\` in the task \`headers\` is the ID for the task that was initiated by the REST request.
The \`X-Opaque-Id\` in the children \`headers\` is the child task of the task that was initiated by the REST request.`,
  methods: ['GET'],
  patterns: ['/_tasks'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-tasks',
  parameterTypes: {
    pathParams: [],
    urlParams: [
      'actions',
      'detailed',
      'group_by',
      'nodes',
      'parent_task_id',
      'timeout',
      'wait_for_completion',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(tasks_list_request, 'body'),
    getLooseObjectFromProperty(tasks_list_request, 'path'),
    getLooseObjectFromProperty(tasks_list_request, 'query'),
  ]),
  outputSchema: tasks_list_response,
};
const TERMS_ENUM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.terms_enum',
  summary: `Get terms in an index`,
  description: `Get terms in an index.

Discover terms that match a partial string in an index.
This API is designed for low-latency look-ups used in auto-complete scenarios.

> info
> The terms enum API may return terms from deleted documents. Deleted documents are initially only marked as deleted. It is not until their segments are merged that documents are actually deleted. Until that happens, the terms enum API will return terms from these documents.`,
  methods: ['GET', 'POST'],
  patterns: ['/{index}/_terms_enum'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-terms-enum',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(terms_enum_request, 'body'),
    getLooseObjectFromProperty(terms_enum_request, 'path'),
    getLooseObjectFromProperty(terms_enum_request, 'query'),
    getLooseObjectFromProperty(terms_enum1_request, 'body'),
    getLooseObjectFromProperty(terms_enum1_request, 'path'),
    getLooseObjectFromProperty(terms_enum1_request, 'query'),
  ]),
  outputSchema: z.union([terms_enum_response, terms_enum1_response]),
};
const TERMVECTORS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.termvectors',
  summary: `Get term vector information`,
  description: `Get term vector information.

Get information and statistics about terms in the fields of a particular document.

You can retrieve term vectors for documents stored in the index or for artificial documents passed in the body of the request.
You can specify the fields you are interested in through the \`fields\` parameter or by adding the fields to the request body.
For example:

\`\`\`
GET /my-index-000001/_termvectors/1?fields=message
\`\`\`

Fields can be specified using wildcards, similar to the multi match query.

Term vectors are real-time by default, not near real-time.
This can be changed by setting \`realtime\` parameter to \`false\`.

You can request three types of values: _term information_, _term statistics_, and _field statistics_.
By default, all term information and field statistics are returned for all fields but term statistics are excluded.

**Term information**

* term frequency in the field (always returned)
* term positions (\`positions: true\`)
* start and end offsets (\`offsets: true\`)
* term payloads (\`payloads: true\`), as base64 encoded bytes

If the requested information wasn't stored in the index, it will be computed on the fly if possible.
Additionally, term vectors could be computed for documents not even existing in the index, but instead provided by the user.

> warn
> Start and end offsets assume UTF-16 encoding is being used. If you want to use these offsets in order to get the original text that produced this token, you should make sure that the string you are taking a sub-string of is also encoded using UTF-16.

**Behaviour**

The term and field statistics are not accurate.
Deleted documents are not taken into account.
The information is only retrieved for the shard the requested document resides in.
The term and field statistics are therefore only useful as relative measures whereas the absolute numbers have no meaning in this context.
By default, when requesting term vectors of artificial documents, a shard to get the statistics from is randomly selected.
Use \`routing\` only to hit a particular shard.
Refer to the linked documentation for detailed examples of how to use this API.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/{index}/_termvectors/{id}', '/{index}/_termvectors'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-termvectors',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(termvectors_request, 'body'),
    getLooseObjectFromProperty(termvectors_request, 'path'),
    getLooseObjectFromProperty(termvectors_request, 'query'),
    getLooseObjectFromProperty(termvectors1_request, 'body'),
    getLooseObjectFromProperty(termvectors1_request, 'path'),
    getLooseObjectFromProperty(termvectors1_request, 'query'),
    getLooseObjectFromProperty(termvectors2_request, 'body'),
    getLooseObjectFromProperty(termvectors2_request, 'path'),
    getLooseObjectFromProperty(termvectors2_request, 'query'),
    getLooseObjectFromProperty(termvectors3_request, 'body'),
    getLooseObjectFromProperty(termvectors3_request, 'path'),
    getLooseObjectFromProperty(termvectors3_request, 'query'),
  ]),
  outputSchema: z.union([
    termvectors_response,
    termvectors1_response,
    termvectors2_response,
    termvectors3_response,
  ]),
};
const TEXT_STRUCTURE_FIND_FIELD_STRUCTURE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.text_structure.find_field_structure',
  summary: `Find the structure of a text field`,
  description: `Find the structure of a text field.
Find the structure of a text field in an Elasticsearch index.

This API provides a starting point for extracting further information from log messages already ingested into Elasticsearch.
For example, if you have ingested data into a very simple index that has just \`@timestamp\` and message fields, you can use this API to see what common structure exists in the message field.

The response from the API contains:

* Sample messages.
* Statistics that reveal the most common values for all fields detected within the text and basic numeric statistics for numeric fields.
* Information about the structure of the text, which is useful when you write ingest configurations to index it or similarly formatted text.
* Appropriate mappings for an Elasticsearch index, which you could use to ingest the text.

All this information can be calculated by the structure finder with no guidance.
However, you can optionally override some of the decisions about the text structure by specifying one or more query parameters.

If the structure finder produces unexpected results, specify the \`explain\` query parameter and an explanation will appear in the response.
It helps determine why the returned structure was chosen.`,
  methods: ['GET'],
  patterns: ['/_text_structure/find_field_structure'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-text_structure',
  parameterTypes: {
    pathParams: [],
    urlParams: [
      'column_names',
      'delimiter',
      'documents_to_sample',
      'ecs_compatibility',
      'explain',
      'field',
      'format',
      'grok_pattern',
      'index',
      'quote',
      'should_trim_fields',
      'timeout',
      'timestamp_field',
      'timestamp_format',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(text_structure_find_field_structure_request, 'body'),
    getLooseObjectFromProperty(text_structure_find_field_structure_request, 'path'),
    getLooseObjectFromProperty(text_structure_find_field_structure_request, 'query'),
  ]),
  outputSchema: text_structure_find_field_structure_response,
};
const TEXT_STRUCTURE_FIND_MESSAGE_STRUCTURE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.text_structure.find_message_structure',
  summary: `Find the structure of text messages`,
  description: `Find the structure of text messages.
Find the structure of a list of text messages.
The messages must contain data that is suitable to be ingested into Elasticsearch.

This API provides a starting point for ingesting data into Elasticsearch in a format that is suitable for subsequent use with other Elastic Stack functionality.
Use this API rather than the find text structure API if your input text has already been split up into separate messages by some other process.

The response from the API contains:

* Sample messages.
* Statistics that reveal the most common values for all fields detected within the text and basic numeric statistics for numeric fields.
* Information about the structure of the text, which is useful when you write ingest configurations to index it or similarly formatted text.
Appropriate mappings for an Elasticsearch index, which you could use to ingest the text.

All this information can be calculated by the structure finder with no guidance.
However, you can optionally override some of the decisions about the text structure by specifying one or more query parameters.

If the structure finder produces unexpected results, specify the \`explain\` query parameter and an explanation will appear in the response.
It helps determine why the returned structure was chosen.`,
  methods: ['GET', 'POST'],
  patterns: ['/_text_structure/find_message_structure'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-text-structure-find-message-structure',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(text_structure_find_message_structure_request, 'body'),
    getLooseObjectFromProperty(text_structure_find_message_structure_request, 'path'),
    getLooseObjectFromProperty(text_structure_find_message_structure_request, 'query'),
    getLooseObjectFromProperty(text_structure_find_message_structure1_request, 'body'),
    getLooseObjectFromProperty(text_structure_find_message_structure1_request, 'path'),
    getLooseObjectFromProperty(text_structure_find_message_structure1_request, 'query'),
  ]),
  outputSchema: z.union([
    text_structure_find_message_structure_response,
    text_structure_find_message_structure1_response,
  ]),
};
const TEXT_STRUCTURE_FIND_STRUCTURE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.text_structure.find_structure',
  summary: `Find the structure of a text file`,
  description: `Find the structure of a text file.
The text file must contain data that is suitable to be ingested into Elasticsearch.

This API provides a starting point for ingesting data into Elasticsearch in a format that is suitable for subsequent use with other Elastic Stack functionality.
Unlike other Elasticsearch endpoints, the data that is posted to this endpoint does not need to be UTF-8 encoded and in JSON format.
It must, however, be text; binary text formats are not currently supported.
The size is limited to the Elasticsearch HTTP receive buffer size, which defaults to 100 Mb.

The response from the API contains:

* A couple of messages from the beginning of the text.
* Statistics that reveal the most common values for all fields detected within the text and basic numeric statistics for numeric fields.
* Information about the structure of the text, which is useful when you write ingest configurations to index it or similarly formatted text.
* Appropriate mappings for an Elasticsearch index, which you could use to ingest the text.

All this information can be calculated by the structure finder with no guidance.
However, you can optionally override some of the decisions about the text structure by specifying one or more query parameters.`,
  methods: ['POST'],
  patterns: ['/_text_structure/find_structure'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-text-structure-find-structure',
  parameterTypes: {
    pathParams: [],
    urlParams: [
      'charset',
      'column_names',
      'delimiter',
      'ecs_compatibility',
      'explain',
      'format',
      'grok_pattern',
      'has_header_row',
      'line_merge_size_limit',
      'lines_to_sample',
      'quote',
      'should_trim_fields',
      'timeout',
      'timestamp_field',
      'timestamp_format',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(text_structure_find_structure_request, 'body'),
    getLooseObjectFromProperty(text_structure_find_structure_request, 'path'),
    getLooseObjectFromProperty(text_structure_find_structure_request, 'query'),
  ]),
  outputSchema: text_structure_find_structure_response,
};
const TEXT_STRUCTURE_TEST_GROK_PATTERN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.text_structure.test_grok_pattern',
  summary: `Test a Grok pattern`,
  description: `Test a Grok pattern.
Test a Grok pattern on one or more lines of text.
The API indicates whether the lines match the pattern together with the offsets and lengths of the matched substrings.`,
  methods: ['GET', 'POST'],
  patterns: ['/_text_structure/test_grok_pattern'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-text-structure-test-grok-pattern',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(text_structure_test_grok_pattern_request, 'body'),
    getLooseObjectFromProperty(text_structure_test_grok_pattern_request, 'path'),
    getLooseObjectFromProperty(text_structure_test_grok_pattern_request, 'query'),
    getLooseObjectFromProperty(text_structure_test_grok_pattern1_request, 'body'),
    getLooseObjectFromProperty(text_structure_test_grok_pattern1_request, 'path'),
    getLooseObjectFromProperty(text_structure_test_grok_pattern1_request, 'query'),
  ]),
  outputSchema: z.union([
    text_structure_test_grok_pattern_response,
    text_structure_test_grok_pattern1_response,
  ]),
};
const TRANSFORM_DELETE_TRANSFORM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.delete_transform',
  summary: `Delete a transform`,
  description: `Delete a transform.`,
  methods: ['DELETE'],
  patterns: ['/_transform/{transform_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-delete-transform',
  parameterTypes: {
    pathParams: ['transform_id', 'transform_id'],
    urlParams: ['defer_validation', 'timeout', 'force', 'delete_dest_index', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(transform_delete_transform_request, 'body'),
    getLooseObjectFromProperty(transform_delete_transform_request, 'path'),
    getLooseObjectFromProperty(transform_delete_transform_request, 'query'),
  ]),
  outputSchema: transform_delete_transform_response,
};
const TRANSFORM_GET_NODE_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.get_node_stats',
  summary: ``,
  description: `Retrieves transform usage information for transform nodes`,
  methods: ['GET'],
  patterns: ['/_transform/_node_stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/guide/en/elasticsearch/reference/current/get-transform-node-stats.html',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.looseObject({})),
  outputSchema: z.optional(z.looseObject({})),
};
const TRANSFORM_GET_TRANSFORM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.get_transform',
  summary: `Get transforms`,
  description: `Get transforms.
Get configuration information for transforms.`,
  methods: ['GET', 'GET'],
  patterns: ['/_transform/{transform_id}', '/_transform'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-get-transform',
  parameterTypes: {
    pathParams: ['transform_id', 'transform_id'],
    urlParams: ['defer_validation', 'timeout', 'force', 'delete_dest_index', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(transform_get_transform_request, 'body'),
    getLooseObjectFromProperty(transform_get_transform_request, 'path'),
    getLooseObjectFromProperty(transform_get_transform_request, 'query'),
    getLooseObjectFromProperty(transform_get_transform1_request, 'body'),
    getLooseObjectFromProperty(transform_get_transform1_request, 'path'),
    getLooseObjectFromProperty(transform_get_transform1_request, 'query'),
  ]),
  outputSchema: z.union([transform_get_transform_response, transform_get_transform1_response]),
};
const TRANSFORM_GET_TRANSFORM_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.get_transform_stats',
  summary: `Get transform stats`,
  description: `Get transform stats.

Get usage information for transforms.`,
  methods: ['GET'],
  patterns: ['/_transform/{transform_id}/_stats'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-get-transform-stats',
  parameterTypes: {
    pathParams: ['transform_id'],
    urlParams: ['allow_no_match', 'from', 'size', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(transform_get_transform_stats_request, 'body'),
    getLooseObjectFromProperty(transform_get_transform_stats_request, 'path'),
    getLooseObjectFromProperty(transform_get_transform_stats_request, 'query'),
  ]),
  outputSchema: transform_get_transform_stats_response,
};
const TRANSFORM_PREVIEW_TRANSFORM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.preview_transform',
  summary: `Preview a transform`,
  description: `Preview a transform.
Generates a preview of the results that you will get when you create a transform with the same configuration.

It returns a maximum of 100 results. The calculations are based on all the current data in the source index. It also
generates a list of mappings and settings for the destination index. These values are determined based on the field
types of the source index and the transform aggregations.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_transform/{transform_id}/_preview', '/_transform/_preview'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-preview-transform',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(transform_preview_transform_request, 'body'),
    getLooseObjectFromProperty(transform_preview_transform_request, 'path'),
    getLooseObjectFromProperty(transform_preview_transform_request, 'query'),
    getLooseObjectFromProperty(transform_preview_transform1_request, 'body'),
    getLooseObjectFromProperty(transform_preview_transform1_request, 'path'),
    getLooseObjectFromProperty(transform_preview_transform1_request, 'query'),
    getLooseObjectFromProperty(transform_preview_transform2_request, 'body'),
    getLooseObjectFromProperty(transform_preview_transform2_request, 'path'),
    getLooseObjectFromProperty(transform_preview_transform2_request, 'query'),
    getLooseObjectFromProperty(transform_preview_transform3_request, 'body'),
    getLooseObjectFromProperty(transform_preview_transform3_request, 'path'),
    getLooseObjectFromProperty(transform_preview_transform3_request, 'query'),
  ]),
  outputSchema: z.union([
    transform_preview_transform_response,
    transform_preview_transform1_response,
    transform_preview_transform2_response,
    transform_preview_transform3_response,
  ]),
};
const TRANSFORM_PUT_TRANSFORM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.put_transform',
  summary: `Create a transform`,
  description: `Create a transform.
Creates a transform.

A transform copies data from source indices, transforms it, and persists it into an entity-centric destination index. You can also think of the destination index as a two-dimensional tabular data structure (known as
a data frame). The ID for each document in the data frame is generated from a hash of the entity, so there is a
unique row per entity.

You must choose either the latest or pivot method for your transform; you cannot use both in a single transform. If
you choose to use the pivot method for your transform, the entities are defined by the set of \`group_by\` fields in
the pivot object. If you choose to use the latest method, the entities are defined by the \`unique_key\` field values
in the latest object.

You must have \`create_index\`, \`index\`, and \`read\` privileges on the destination index and \`read\` and
\`view_index_metadata\` privileges on the source indices. When Elasticsearch security features are enabled, the
transform remembers which roles the user that created it had at the time of creation and uses those same roles. If
those roles do not have the required privileges on the source and destination indices, the transform fails when it
attempts unauthorized operations.

NOTE: You must use Kibana or this API to create a transform. Do not add a transform directly into any
\`.transform-internal*\` indices using the Elasticsearch index API. If Elasticsearch security features are enabled, do
not give users any privileges on \`.transform-internal*\` indices. If you used transforms prior to 7.5, also do not
give users any privileges on \`.data-frame-internal*\` indices.`,
  methods: ['PUT'],
  patterns: ['/_transform/{transform_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-put-transform',
  parameterTypes: {
    pathParams: ['transform_id', 'transform_id'],
    urlParams: ['defer_validation', 'timeout', 'force', 'delete_dest_index', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(transform_put_transform_request, 'body'),
    getLooseObjectFromProperty(transform_put_transform_request, 'path'),
    getLooseObjectFromProperty(transform_put_transform_request, 'query'),
  ]),
  outputSchema: transform_put_transform_response,
};
const TRANSFORM_RESET_TRANSFORM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.reset_transform',
  summary: `Reset a transform`,
  description: `Reset a transform.

Before you can reset it, you must stop it; alternatively, use the \`force\` query parameter.
If the destination index was created by the transform, it is deleted.`,
  methods: ['POST'],
  patterns: ['/_transform/{transform_id}/_reset'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-reset-transform',
  parameterTypes: {
    pathParams: ['transform_id'],
    urlParams: ['force', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(transform_reset_transform_request, 'body'),
    getLooseObjectFromProperty(transform_reset_transform_request, 'path'),
    getLooseObjectFromProperty(transform_reset_transform_request, 'query'),
  ]),
  outputSchema: transform_reset_transform_response,
};
const TRANSFORM_SCHEDULE_NOW_TRANSFORM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.schedule_now_transform',
  summary: `Schedule a transform to start now`,
  description: `Schedule a transform to start now.

Instantly run a transform to process data.
If you run this API, the transform will process the new data instantly,
without waiting for the configured frequency interval. After the API is called,
the transform will be processed again at \`now + frequency\` unless the API
is called again in the meantime.`,
  methods: ['POST'],
  patterns: ['/_transform/{transform_id}/_schedule_now'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-schedule-now-transform',
  parameterTypes: {
    pathParams: ['transform_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(transform_schedule_now_transform_request, 'body'),
    getLooseObjectFromProperty(transform_schedule_now_transform_request, 'path'),
    getLooseObjectFromProperty(transform_schedule_now_transform_request, 'query'),
  ]),
  outputSchema: transform_schedule_now_transform_response,
};
const TRANSFORM_SET_UPGRADE_MODE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.set_upgrade_mode',
  summary: `Set upgrade_mode for transform indices`,
  description: `Set upgrade_mode for transform indices.
Sets a cluster wide upgrade_mode setting that prepares transform
indices for an upgrade.
When upgrading your cluster, in some circumstances you must restart your
nodes and reindex your transform indices. In those circumstances,
there must be no transforms running. You can close the transforms,
do the upgrade, then open all the transforms again. Alternatively,
you can use this API to temporarily halt tasks associated with the transforms
and prevent new transforms from opening. You can also use this API
during upgrades that do not require you to reindex your transform
indices, though stopping transforms is not a requirement in that case.
You can see the current value for the upgrade_mode setting by using the get
transform info API.`,
  methods: ['POST'],
  patterns: ['/_transform/set_upgrade_mode'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-set-upgrade-mode',
  parameterTypes: {
    pathParams: [],
    urlParams: ['enabled', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(transform_set_upgrade_mode_request, 'body'),
    getLooseObjectFromProperty(transform_set_upgrade_mode_request, 'path'),
    getLooseObjectFromProperty(transform_set_upgrade_mode_request, 'query'),
  ]),
  outputSchema: transform_set_upgrade_mode_response,
};
const TRANSFORM_START_TRANSFORM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.start_transform',
  summary: `Start a transform`,
  description: `Start a transform.

When you start a transform, it creates the destination index if it does not already exist. The \`number_of_shards\` is
set to \`1\` and the \`auto_expand_replicas\` is set to \`0-1\`. If it is a pivot transform, it deduces the mapping
definitions for the destination index from the source indices and the transform aggregations. If fields in the
destination index are derived from scripts (as in the case of \`scripted_metric\` or \`bucket_script\` aggregations),
the transform uses dynamic mappings unless an index template exists. If it is a latest transform, it does not deduce
mapping definitions; it uses dynamic mappings. To use explicit mappings, create the destination index before you
start the transform. Alternatively, you can create an index template, though it does not affect the deduced mappings
in a pivot transform.

When the transform starts, a series of validations occur to ensure its success. If you deferred validation when you
created the transform, they occur when you start the transform—​with the exception of privilege checks. When
Elasticsearch security features are enabled, the transform remembers which roles the user that created it had at the
time of creation and uses those same roles. If those roles do not have the required privileges on the source and
destination indices, the transform fails when it attempts unauthorized operations.`,
  methods: ['POST'],
  patterns: ['/_transform/{transform_id}/_start'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-start-transform',
  parameterTypes: {
    pathParams: ['transform_id'],
    urlParams: ['timeout', 'from'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(transform_start_transform_request, 'body'),
    getLooseObjectFromProperty(transform_start_transform_request, 'path'),
    getLooseObjectFromProperty(transform_start_transform_request, 'query'),
  ]),
  outputSchema: transform_start_transform_response,
};
const TRANSFORM_STOP_TRANSFORM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.stop_transform',
  summary: `Stop transforms`,
  description: `Stop transforms.
Stops one or more transforms.`,
  methods: ['POST'],
  patterns: ['/_transform/{transform_id}/_stop'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-stop-transform',
  parameterTypes: {
    pathParams: ['transform_id'],
    urlParams: ['allow_no_match', 'force', 'timeout', 'wait_for_checkpoint', 'wait_for_completion'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(transform_stop_transform_request, 'body'),
    getLooseObjectFromProperty(transform_stop_transform_request, 'path'),
    getLooseObjectFromProperty(transform_stop_transform_request, 'query'),
  ]),
  outputSchema: transform_stop_transform_response,
};
const TRANSFORM_UPDATE_TRANSFORM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.update_transform',
  summary: `Update a transform`,
  description: `Update a transform.
Updates certain properties of a transform.

All updated properties except \`description\` do not take effect until after the transform starts the next checkpoint,
thus there is data consistency in each checkpoint. To use this API, you must have \`read\` and \`view_index_metadata\`
privileges for the source indices. You must also have \`index\` and \`read\` privileges for the destination index. When
Elasticsearch security features are enabled, the transform remembers which roles the user who updated it had at the
time of update and runs with those privileges.`,
  methods: ['POST'],
  patterns: ['/_transform/{transform_id}/_update'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-update-transform',
  parameterTypes: {
    pathParams: ['transform_id'],
    urlParams: ['defer_validation', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(transform_update_transform_request, 'body'),
    getLooseObjectFromProperty(transform_update_transform_request, 'path'),
    getLooseObjectFromProperty(transform_update_transform_request, 'query'),
  ]),
  outputSchema: transform_update_transform_response,
};
const TRANSFORM_UPGRADE_TRANSFORMS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.upgrade_transforms',
  summary: `Upgrade all transforms`,
  description: `Upgrade all transforms.

Transforms are compatible across minor versions and between supported major versions.
However, over time, the format of transform configuration information may change.
This API identifies transforms that have a legacy configuration format and upgrades them to the latest version.
It also cleans up the internal data structures that store the transform state and checkpoints.
The upgrade does not affect the source and destination indices.
The upgrade also does not affect the roles that transforms use when Elasticsearch security features are enabled; the role used to read source data and write to the destination index remains unchanged.

If a transform upgrade step fails, the upgrade stops and an error is returned about the underlying issue.
Resolve the issue then re-run the process again.
A summary is returned when the upgrade is finished.

To ensure continuous transforms remain running during a major version upgrade of the cluster – for example, from 7.16 to 8.0 – it is recommended to upgrade transforms before upgrading the cluster.
You may want to perform a recent cluster backup prior to the upgrade.`,
  methods: ['POST'],
  patterns: ['/_transform/_upgrade'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-upgrade-transforms',
  parameterTypes: {
    pathParams: [],
    urlParams: ['dry_run', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(transform_upgrade_transforms_request, 'body'),
    getLooseObjectFromProperty(transform_upgrade_transforms_request, 'path'),
    getLooseObjectFromProperty(transform_upgrade_transforms_request, 'query'),
  ]),
  outputSchema: transform_upgrade_transforms_response,
};
const UPDATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.update',
  summary: `Update a document`,
  description: `Update a document.

Update a document by running a script or passing a partial document.

If the Elasticsearch security features are enabled, you must have the \`index\` or \`write\` index privilege for the target index or index alias.

The script can update, delete, or skip modifying the document.
The API also supports passing a partial document, which is merged into the existing document.
To fully replace an existing document, use the index API.
This operation:

* Gets the document (collocated with the shard) from the index.
* Runs the specified script.
* Indexes the result.

The document must still be reindexed, but using this API removes some network roundtrips and reduces chances of version conflicts between the GET and the index operation.

The \`_source\` field must be enabled to use this API.
In addition to \`_source\`, you can access the following variables through the \`ctx\` map: \`_index\`, \`_type\`, \`_id\`, \`_version\`, \`_routing\`, and \`_now\` (the current timestamp).
For usage examples such as partial updates, upserts, and scripted updates, see the External documentation.`,
  methods: ['POST'],
  patterns: ['/{index}/_update/{id}'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-update',
  parameterTypes: {
    pathParams: ['index', 'id'],
    urlParams: [
      'if_primary_term',
      'if_seq_no',
      'include_source_on_error',
      'lang',
      'refresh',
      'require_alias',
      'retry_on_conflict',
      'routing',
      'timeout',
      'wait_for_active_shards',
      '_source',
      '_source_excludes',
      '_source_includes',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_request, 'body'),
    getLooseObjectFromProperty(update_request, 'path'),
    getLooseObjectFromProperty(update_request, 'query'),
  ]),
  outputSchema: update_response,
};
const UPDATE_BY_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.update_by_query',
  summary: `Update documents`,
  description: `Update documents.
Updates documents that match the specified query.
If no query is specified, performs an update on every document in the data stream or index without modifying the source, which is useful for picking up mapping changes.

If the Elasticsearch security features are enabled, you must have the following index privileges for the target data stream, index, or alias:

* \`read\`
* \`index\` or \`write\`

You can specify the query criteria in the request URI or the request body using the same syntax as the search API.

When you submit an update by query request, Elasticsearch gets a snapshot of the data stream or index when it begins processing the request and updates matching documents using internal versioning.
When the versions match, the document is updated and the version number is incremented.
If a document changes between the time that the snapshot is taken and the update operation is processed, it results in a version conflict and the operation fails.
You can opt to count version conflicts instead of halting and returning by setting \`conflicts\` to \`proceed\`.
Note that if you opt to count version conflicts, the operation could attempt to update more documents from the source than \`max_docs\` until it has successfully updated \`max_docs\` documents or it has gone through every document in the source query.

NOTE: Documents with a version equal to 0 cannot be updated using update by query because internal versioning does not support 0 as a valid version number.

While processing an update by query request, Elasticsearch performs multiple search requests sequentially to find all of the matching documents.
A bulk update request is performed for each batch of matching documents.
Any query or update failures cause the update by query request to fail and the failures are shown in the response.
Any update requests that completed successfully still stick, they are not rolled back.

**Refreshing shards**

Specifying the \`refresh\` parameter refreshes all shards once the request completes.
This is different to the update API's \`refresh\` parameter, which causes only the shard
that received the request to be refreshed. Unlike the update API, it does not support
\`wait_for\`.

**Running update by query asynchronously**

If the request contains \`wait_for_completion=false\`, Elasticsearch
performs some preflight checks, launches the request, and returns a
[task](https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-tasks) you can use to cancel or get the status of the task.
Elasticsearch creates a record of this task as a document at \`.tasks/task/\${taskId}\`.

**Waiting for active shards**

\`wait_for_active_shards\` controls how many copies of a shard must be active
before proceeding with the request. See [\`wait_for_active_shards\`](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-create#operation-create-wait_for_active_shards)
for details. \`timeout\` controls how long each write request waits for unavailable
shards to become available. Both work exactly the way they work in the
[Bulk API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk). Update by query uses scrolled searches, so you can also
specify the \`scroll\` parameter to control how long it keeps the search context
alive, for example \`?scroll=10m\`. The default is 5 minutes.

**Throttling update requests**

To control the rate at which update by query issues batches of update operations, you can set \`requests_per_second\` to any positive decimal number.
This pads each batch with a wait time to throttle the rate.
Set \`requests_per_second\` to \`-1\` to turn off throttling.

Throttling uses a wait time between batches so that the internal scroll requests can be given a timeout that takes the request padding into account.
The padding time is the difference between the batch size divided by the \`requests_per_second\` and the time spent writing.
By default the batch size is 1000, so if \`requests_per_second\` is set to \`500\`:

\`\`\`
target_time = 1000 / 500 per second = 2 seconds
wait_time = target_time - write_time = 2 seconds - .5 seconds = 1.5 seconds
\`\`\`

Since the batch is issued as a single _bulk request, large batch sizes cause Elasticsearch to create many requests and wait before starting the next set.
This is "bursty" instead of "smooth".

**Slicing**

Update by query supports sliced scroll to parallelize the update process.
This can improve efficiency and provide a convenient way to break the request down into smaller parts.

Setting \`slices\` to \`auto\` chooses a reasonable number for most data streams and indices.
This setting will use one slice per shard, up to a certain limit.
If there are multiple source data streams or indices, it will choose the number of slices based on the index or backing index with the smallest number of shards.

Adding \`slices\` to \`_update_by_query\` just automates the manual process of creating sub-requests, which means it has some quirks:

* You can see these requests in the tasks APIs. These sub-requests are "child" tasks of the task for the request with slices.
* Fetching the status of the task for the request with \`slices\` only contains the status of completed slices.
* These sub-requests are individually addressable for things like cancellation and rethrottling.
* Rethrottling the request with \`slices\` will rethrottle the unfinished sub-request proportionally.
* Canceling the request with slices will cancel each sub-request.
* Due to the nature of slices each sub-request won't get a perfectly even portion of the documents. All documents will be addressed, but some slices may be larger than others. Expect larger slices to have a more even distribution.
* Parameters like \`requests_per_second\` and \`max_docs\` on a request with slices are distributed proportionally to each sub-request. Combine that with the point above about distribution being uneven and you should conclude that using \`max_docs\` with \`slices\` might not result in exactly \`max_docs\` documents being updated.
* Each sub-request gets a slightly different snapshot of the source data stream or index though these are all taken at approximately the same time.

If you're slicing manually or otherwise tuning automatic slicing, keep in mind that:

* Query performance is most efficient when the number of slices is equal to the number of shards in the index or backing index. If that number is large (for example, 500), choose a lower number as too many slices hurts performance. Setting slices higher than the number of shards generally does not improve efficiency and adds overhead.
* Update performance scales linearly across available resources with the number of slices.

Whether query or update performance dominates the runtime depends on the documents being reindexed and cluster resources.
Refer to the linked documentation for examples of how to update documents using the \`_update_by_query\` API:`,
  methods: ['POST'],
  patterns: ['/{index}/_update_by_query'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-update-by-query',
  parameterTypes: {
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'analyzer',
      'analyze_wildcard',
      'conflicts',
      'default_operator',
      'df',
      'expand_wildcards',
      'from',
      'ignore_unavailable',
      'lenient',
      'max_docs',
      'pipeline',
      'preference',
      'q',
      'refresh',
      'request_cache',
      'requests_per_second',
      'routing',
      'scroll',
      'scroll_size',
      'search_timeout',
      'search_type',
      'slices',
      'sort',
      'stats',
      'terminate_after',
      'timeout',
      'version',
      'version_type',
      'wait_for_active_shards',
      'wait_for_completion',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_by_query_request, 'body'),
    getLooseObjectFromProperty(update_by_query_request, 'path'),
    getLooseObjectFromProperty(update_by_query_request, 'query'),
  ]),
  outputSchema: update_by_query_response,
};
const UPDATE_BY_QUERY_RETHROTTLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.update_by_query_rethrottle',
  summary: `Throttle an update by query operation`,
  description: `Throttle an update by query operation.

Change the number of requests per second for a particular update by query operation.
Rethrottling that speeds up the query takes effect immediately but rethrotting that slows down the query takes effect after completing the current batch to prevent scroll timeouts.`,
  methods: ['POST'],
  patterns: ['/_update_by_query/{task_id}/_rethrottle'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-update-by-query-rethrottle',
  parameterTypes: {
    pathParams: ['task_id'],
    urlParams: ['requests_per_second'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_by_query_rethrottle_request, 'body'),
    getLooseObjectFromProperty(update_by_query_rethrottle_request, 'path'),
    getLooseObjectFromProperty(update_by_query_rethrottle_request, 'query'),
  ]),
  outputSchema: update_by_query_rethrottle_response,
};
const WATCHER_ACK_WATCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.ack_watch',
  summary: `Acknowledge a watch`,
  description: `Acknowledge a watch.
Acknowledging a watch enables you to manually throttle the execution of the watch's actions.

The acknowledgement state of an action is stored in the \`status.actions.<id>.ack.state\` structure.

IMPORTANT: If the specified watch is currently being executed, this API will return an error
The reason for this behavior is to prevent overwriting the watch status from a watch execution.

Acknowledging an action throttles further executions of that action until its \`ack.state\` is reset to \`awaits_successful_execution\`.
This happens when the condition of the watch is not met (the condition evaluates to false).
To demonstrate how throttling works in practice and how it can be configured for individual actions within a watch, refer to External documentation.`,
  methods: ['PUT', 'POST', 'PUT', 'POST'],
  patterns: ['/_watcher/watch/{watch_id}/_ack', '/_watcher/watch/{watch_id}/_ack/{action_id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-ack-watch',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(watcher_ack_watch_request, 'body'),
    getLooseObjectFromProperty(watcher_ack_watch_request, 'path'),
    getLooseObjectFromProperty(watcher_ack_watch_request, 'query'),
    getLooseObjectFromProperty(watcher_ack_watch1_request, 'body'),
    getLooseObjectFromProperty(watcher_ack_watch1_request, 'path'),
    getLooseObjectFromProperty(watcher_ack_watch1_request, 'query'),
    getLooseObjectFromProperty(watcher_ack_watch2_request, 'body'),
    getLooseObjectFromProperty(watcher_ack_watch2_request, 'path'),
    getLooseObjectFromProperty(watcher_ack_watch2_request, 'query'),
    getLooseObjectFromProperty(watcher_ack_watch3_request, 'body'),
    getLooseObjectFromProperty(watcher_ack_watch3_request, 'path'),
    getLooseObjectFromProperty(watcher_ack_watch3_request, 'query'),
  ]),
  outputSchema: z.union([
    watcher_ack_watch_response,
    watcher_ack_watch1_response,
    watcher_ack_watch2_response,
    watcher_ack_watch3_response,
  ]),
};
const WATCHER_ACTIVATE_WATCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.activate_watch',
  summary: `Activate a watch`,
  description: `Activate a watch.
A watch can be either active or inactive.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_watcher/watch/{watch_id}/_activate'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-activate-watch',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(watcher_activate_watch_request, 'body'),
    getLooseObjectFromProperty(watcher_activate_watch_request, 'path'),
    getLooseObjectFromProperty(watcher_activate_watch_request, 'query'),
    getLooseObjectFromProperty(watcher_activate_watch1_request, 'body'),
    getLooseObjectFromProperty(watcher_activate_watch1_request, 'path'),
    getLooseObjectFromProperty(watcher_activate_watch1_request, 'query'),
  ]),
  outputSchema: z.union([watcher_activate_watch_response, watcher_activate_watch1_response]),
};
const WATCHER_DEACTIVATE_WATCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.deactivate_watch',
  summary: `Deactivate a watch`,
  description: `Deactivate a watch.
A watch can be either active or inactive.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_watcher/watch/{watch_id}/_deactivate'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-deactivate-watch',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(watcher_deactivate_watch_request, 'body'),
    getLooseObjectFromProperty(watcher_deactivate_watch_request, 'path'),
    getLooseObjectFromProperty(watcher_deactivate_watch_request, 'query'),
    getLooseObjectFromProperty(watcher_deactivate_watch1_request, 'body'),
    getLooseObjectFromProperty(watcher_deactivate_watch1_request, 'path'),
    getLooseObjectFromProperty(watcher_deactivate_watch1_request, 'query'),
  ]),
  outputSchema: z.union([watcher_deactivate_watch_response, watcher_deactivate_watch1_response]),
};
const WATCHER_DELETE_WATCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.delete_watch',
  summary: `Delete a watch`,
  description: `Delete a watch.
When the watch is removed, the document representing the watch in the \`.watches\` index is gone and it will never be run again.

Deleting a watch does not delete any watch execution records related to this watch from the watch history.

IMPORTANT: Deleting a watch must be done by using only this API.
Do not delete the watch directly from the \`.watches\` index using the Elasticsearch delete document API
When Elasticsearch security features are enabled, make sure no write privileges are granted to anyone for the \`.watches\` index.`,
  methods: ['DELETE'],
  patterns: ['/_watcher/watch/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-delete-watch',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(watcher_delete_watch_request, 'body'),
    getLooseObjectFromProperty(watcher_delete_watch_request, 'path'),
    getLooseObjectFromProperty(watcher_delete_watch_request, 'query'),
  ]),
  outputSchema: watcher_delete_watch_response,
};
const WATCHER_EXECUTE_WATCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.execute_watch',
  summary: `Run a watch`,
  description: `Run a watch.
This API can be used to force execution of the watch outside of its triggering logic or to simulate the watch execution for debugging purposes.

For testing and debugging purposes, you also have fine-grained control on how the watch runs.
You can run the watch without running all of its actions or alternatively by simulating them.
You can also force execution by ignoring the watch condition and control whether a watch record would be written to the watch history after it runs.

You can use the run watch API to run watches that are not yet registered by specifying the watch definition inline.
This serves as great tool for testing and debugging your watches prior to adding them to Watcher.

When Elasticsearch security features are enabled on your cluster, watches are run with the privileges of the user that stored the watches.
If your user is allowed to read index \`a\`, but not index \`b\`, then the exact same set of rules will apply during execution of a watch.

When using the run watch API, the authorization data of the user that called the API will be used as a base, instead of the information who stored the watch.
Refer to the external documentation for examples of watch execution requests, including existing, customized, and inline watches.`,
  methods: ['PUT', 'POST', 'PUT', 'POST'],
  patterns: ['/_watcher/watch/{id}/_execute', '/_watcher/watch/_execute'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-execute-watch',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(watcher_execute_watch_request, 'body'),
    getLooseObjectFromProperty(watcher_execute_watch_request, 'path'),
    getLooseObjectFromProperty(watcher_execute_watch_request, 'query'),
    getLooseObjectFromProperty(watcher_execute_watch1_request, 'body'),
    getLooseObjectFromProperty(watcher_execute_watch1_request, 'path'),
    getLooseObjectFromProperty(watcher_execute_watch1_request, 'query'),
    getLooseObjectFromProperty(watcher_execute_watch2_request, 'body'),
    getLooseObjectFromProperty(watcher_execute_watch2_request, 'path'),
    getLooseObjectFromProperty(watcher_execute_watch2_request, 'query'),
    getLooseObjectFromProperty(watcher_execute_watch3_request, 'body'),
    getLooseObjectFromProperty(watcher_execute_watch3_request, 'path'),
    getLooseObjectFromProperty(watcher_execute_watch3_request, 'query'),
  ]),
  outputSchema: z.union([
    watcher_execute_watch_response,
    watcher_execute_watch1_response,
    watcher_execute_watch2_response,
    watcher_execute_watch3_response,
  ]),
};
const WATCHER_GET_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.get_settings',
  summary: `Get Watcher index settings`,
  description: `Get Watcher index settings.
Get settings for the Watcher internal index (\`.watches\`).
Only a subset of settings are shown, for example \`index.auto_expand_replicas\` and \`index.number_of_replicas\`.`,
  methods: ['GET'],
  patterns: ['/_watcher/settings'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-get-settings',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(watcher_get_settings_request, 'body'),
    getLooseObjectFromProperty(watcher_get_settings_request, 'path'),
    getLooseObjectFromProperty(watcher_get_settings_request, 'query'),
  ]),
  outputSchema: watcher_get_settings_response,
};
const WATCHER_GET_WATCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.get_watch',
  summary: `Get a watch`,
  description: `Get a watch.`,
  methods: ['GET'],
  patterns: ['/_watcher/watch/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-get-watch',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(watcher_get_watch_request, 'body'),
    getLooseObjectFromProperty(watcher_get_watch_request, 'path'),
    getLooseObjectFromProperty(watcher_get_watch_request, 'query'),
  ]),
  outputSchema: watcher_get_watch_response,
};
const WATCHER_PUT_WATCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.put_watch',
  summary: `Create or update a watch`,
  description: `Create or update a watch.
When a watch is registered, a new document that represents the watch is added to the \`.watches\` index and its trigger is immediately registered with the relevant trigger engine.
Typically for the \`schedule\` trigger, the scheduler is the trigger engine.

IMPORTANT: You must use Kibana or this API to create a watch.
Do not add a watch directly to the \`.watches\` index by using the Elasticsearch index API.
If Elasticsearch security features are enabled, do not give users write privileges on the \`.watches\` index.

When you add a watch you can also define its initial active state by setting the *active* parameter.

When Elasticsearch security features are enabled, your watch can index or search only on indices for which the user that stored the watch has privileges.
If the user is able to read index \`a\`, but not index \`b\`, the same will apply when the watch runs.`,
  methods: ['PUT', 'POST'],
  patterns: ['/_watcher/watch/{id}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-put-watch',
  parameterTypes: {
    pathParams: ['id', 'id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(watcher_put_watch_request, 'body'),
    getLooseObjectFromProperty(watcher_put_watch_request, 'path'),
    getLooseObjectFromProperty(watcher_put_watch_request, 'query'),
    getLooseObjectFromProperty(watcher_put_watch1_request, 'body'),
    getLooseObjectFromProperty(watcher_put_watch1_request, 'path'),
    getLooseObjectFromProperty(watcher_put_watch1_request, 'query'),
  ]),
  outputSchema: z.union([watcher_put_watch_response, watcher_put_watch1_response]),
};
const WATCHER_QUERY_WATCHES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.query_watches',
  summary: `Query watches`,
  description: `Query watches.
Get all registered watches in a paginated manner and optionally filter watches by a query.

Note that only the \`_id\` and \`metadata.*\` fields are queryable or sortable.`,
  methods: ['GET', 'POST'],
  patterns: ['/_watcher/_query/watches'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-query-watches',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(watcher_query_watches_request, 'body'),
    getLooseObjectFromProperty(watcher_query_watches_request, 'path'),
    getLooseObjectFromProperty(watcher_query_watches_request, 'query'),
    getLooseObjectFromProperty(watcher_query_watches1_request, 'body'),
    getLooseObjectFromProperty(watcher_query_watches1_request, 'path'),
    getLooseObjectFromProperty(watcher_query_watches1_request, 'query'),
  ]),
  outputSchema: z.union([watcher_query_watches_response, watcher_query_watches1_response]),
};
const WATCHER_START_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.start',
  summary: `Start the watch service`,
  description: `Start the watch service.
Start the Watcher service if it is not already running.`,
  methods: ['POST'],
  patterns: ['/_watcher/_start'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-start',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(watcher_start_request, 'body'),
    getLooseObjectFromProperty(watcher_start_request, 'path'),
    getLooseObjectFromProperty(watcher_start_request, 'query'),
  ]),
  outputSchema: watcher_start_response,
};
const WATCHER_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.stats',
  summary: `Get Watcher statistics`,
  description: `Get Watcher statistics.
This API always returns basic metrics.
You retrieve more metrics by using the metric parameter.`,
  methods: ['GET', 'GET'],
  patterns: ['/_watcher/stats', '/_watcher/stats/{metric}'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-stats',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(watcher_stats_request, 'body'),
    getLooseObjectFromProperty(watcher_stats_request, 'path'),
    getLooseObjectFromProperty(watcher_stats_request, 'query'),
    getLooseObjectFromProperty(watcher_stats1_request, 'body'),
    getLooseObjectFromProperty(watcher_stats1_request, 'path'),
    getLooseObjectFromProperty(watcher_stats1_request, 'query'),
  ]),
  outputSchema: z.union([watcher_stats_response, watcher_stats1_response]),
};
const WATCHER_STOP_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.stop',
  summary: `Stop the watch service`,
  description: `Stop the watch service.
Stop the Watcher service if it is running.`,
  methods: ['POST'],
  patterns: ['/_watcher/_stop'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-stop',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(watcher_stop_request, 'body'),
    getLooseObjectFromProperty(watcher_stop_request, 'path'),
    getLooseObjectFromProperty(watcher_stop_request, 'query'),
  ]),
  outputSchema: watcher_stop_response,
};
const WATCHER_UPDATE_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.update_settings',
  summary: `Update Watcher index settings`,
  description: `Update Watcher index settings.
Update settings for the Watcher internal index (\`.watches\`).
Only a subset of settings can be modified.
This includes \`index.auto_expand_replicas\`, \`index.number_of_replicas\`, \`index.routing.allocation.exclude.*\`,
\`index.routing.allocation.include.*\` and \`index.routing.allocation.require.*\`.
Modification of \`index.routing.allocation.include._tier_preference\` is an exception and is not allowed as the
Watcher shards must always be in the \`data_content\` tier.`,
  methods: ['PUT'],
  patterns: ['/_watcher/settings'],
  isInternal: false,
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-update-settings',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(watcher_update_settings_request, 'body'),
    getLooseObjectFromProperty(watcher_update_settings_request, 'path'),
    getLooseObjectFromProperty(watcher_update_settings_request, 'query'),
  ]),
  outputSchema: watcher_update_settings_response,
};
const XPACK_INFO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.xpack.info',
  summary: `Get information`,
  description: `Get information.
The information provided by the API includes:

* Build information including the build number and timestamp.
* License information about the currently installed license.
* Feature information for the features that are currently enabled and available under the current license.`,
  methods: ['GET'],
  patterns: ['/_xpack'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-info',
  parameterTypes: {
    pathParams: [],
    urlParams: ['categories', 'accept_enterprise', 'human'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(xpack_info_request, 'body'),
    getLooseObjectFromProperty(xpack_info_request, 'path'),
    getLooseObjectFromProperty(xpack_info_request, 'query'),
  ]),
  outputSchema: xpack_info_response,
};
const XPACK_USAGE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.xpack.usage',
  summary: `Get usage information`,
  description: `Get usage information.
Get information about the features that are currently enabled and available under the current license.
The API also provides some usage statistics.`,
  methods: ['GET'],
  patterns: ['/_xpack/usage'],
  isInternal: false,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-xpack',
  parameterTypes: {
    pathParams: [],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(xpack_usage_request, 'body'),
    getLooseObjectFromProperty(xpack_usage_request, 'path'),
    getLooseObjectFromProperty(xpack_usage_request, 'query'),
  ]),
  outputSchema: xpack_usage_response,
};

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
