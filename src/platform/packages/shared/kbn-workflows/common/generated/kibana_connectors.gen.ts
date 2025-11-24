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
 * This file contains Kibana connector definitions generated from the Kibana OpenAPI specification.
 * Generated at: 2025-11-24T17:35:07.313Z
 * Source: /oas_docs/output/kibana.yaml (undefined APIs)
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';
import {
  add_case_comment_default_space_request,
  add_case_comment_default_space_response,
  add_case_file_default_space_request,
  add_case_file_default_space_response,
  alerts_migration_cleanup_request,
  alerts_migration_cleanup_response,
  apply_entity_engine_dataview_indices_request,
  apply_entity_engine_dataview_indices_response,
  attack_discovery_find_request,
  attack_discovery_find_response,
  bulk_create_saved_objects_request,
  bulk_create_saved_objects_response,
  bulk_delete_op_request,
  bulk_delete_op_response,
  bulk_delete_saved_objects_request,
  bulk_delete_saved_objects_response,
  bulk_delete_status_op_request,
  bulk_delete_status_op_response,
  bulk_get_saved_objects_request,
  bulk_get_saved_objects_response,
  bulk_resolve_saved_objects_request,
  bulk_resolve_saved_objects_response,
  bulk_update_saved_objects_request,
  bulk_update_saved_objects_response,
  bulk_upsert_asset_criticality_records_request,
  bulk_upsert_asset_criticality_records_response,
  cancel_action_request,
  cancel_action_response,
  chat_complete_request,
  chat_complete_response,
  clean_draft_timelines_request,
  clean_draft_timelines_response,
  clean_up_risk_engine_request,
  clean_up_risk_engine_response,
  configure_risk_engine_saved_object_request,
  configure_risk_engine_saved_object_response,
  copy_timeline_request,
  copy_timeline_response,
  create_agent_key_request,
  create_agent_key_response,
  create_alerts_index_request,
  create_alerts_index_response,
  create_alerts_migration_request,
  create_alerts_migration_response,
  create_annotation_request,
  create_annotation_response,
  create_asset_criticality_record_request,
  create_asset_criticality_record_response,
  create_attack_discovery_schedules_request,
  create_attack_discovery_schedules_response,
  create_case_default_space_request,
  create_case_default_space_response,
  create_conversation_request,
  create_conversation_response,
  create_data_view_defaultw_request,
  create_data_view_defaultw_response,
  create_endpoint_list_item_request,
  create_endpoint_list_item_response,
  create_endpoint_list_request,
  create_endpoint_list_response,
  create_exception_list_item_request,
  create_exception_list_item_response,
  create_exception_list_request,
  create_exception_list_response,
  create_knowledge_base_entry_request,
  create_knowledge_base_entry_response,
  create_knowledge_base_request,
  create_knowledge_base_response,
  create_list_index_request,
  create_list_index_response,
  create_list_item_request,
  create_list_item_response,
  create_list_request,
  create_list_response,
  create_priv_mon_user_request,
  create_priv_mon_user_response,
  create_rule_exception_list_items_request,
  create_rule_exception_list_items_response,
  create_rule_request,
  create_rule_response,
  create_runtime_field_default_request,
  create_runtime_field_default_response,
  create_saved_object_id_request,
  create_saved_object_id_response,
  create_saved_object_request,
  create_saved_object_response,
  create_shared_exception_list_request,
  create_shared_exception_list_response,
  create_slo_op_request,
  create_slo_op_response,
  create_timelines_request,
  create_timelines_response,
  create_update_agent_configuration_request,
  create_update_agent_configuration_response,
  create_update_protection_updates_note_request,
  create_update_protection_updates_note_response,
  create_update_runtime_field_default_request,
  create_update_runtime_field_default_response,
  delete_actions_connector_id_request,
  delete_actions_connector_id_response,
  delete_agent_builder_agents_id_request,
  delete_agent_builder_agents_id_response,
  delete_agent_builder_conversations_conversation_id_request,
  delete_agent_builder_conversations_conversation_id_response,
  delete_agent_builder_tools_toolid_request,
  delete_agent_builder_tools_toolid_response,
  delete_agent_configuration_request,
  delete_agent_configuration_response,
  delete_alerting_rule_id_request,
  delete_alerting_rule_id_response,
  delete_alerting_rule_ruleid_snooze_schedule_scheduleid_request,
  delete_alerting_rule_ruleid_snooze_schedule_scheduleid_response,
  delete_alerts_index_request,
  delete_alerts_index_response,
  delete_all_conversations_request,
  delete_all_conversations_response,
  delete_asset_criticality_record_request,
  delete_asset_criticality_record_response,
  delete_attack_discovery_schedules_request,
  delete_attack_discovery_schedules_response,
  delete_case_comment_default_space_request,
  delete_case_comment_default_space_response,
  delete_case_comments_default_space_request,
  delete_case_comments_default_space_response,
  delete_case_default_space_request,
  delete_case_default_space_response,
  delete_conversation_request,
  delete_conversation_response,
  delete_data_view_default_request,
  delete_data_view_default_response,
  delete_endpoint_list_item_request,
  delete_endpoint_list_item_response,
  delete_entity_engine_request,
  delete_entity_engine_response,
  delete_entity_engines_request,
  delete_entity_engines_response,
  delete_exception_list_item_request,
  delete_exception_list_item_response,
  delete_exception_list_request,
  delete_exception_list_response,
  delete_fleet_agent_download_sources_sourceid_request,
  delete_fleet_agent_download_sources_sourceid_response,
  delete_fleet_agentless_policies_policyid_request,
  delete_fleet_agentless_policies_policyid_response,
  delete_fleet_agents_agentid_request,
  delete_fleet_agents_agentid_response,
  delete_fleet_agents_files_fileid_request,
  delete_fleet_agents_files_fileid_response,
  delete_fleet_cloud_connectors_cloudconnectorid_request,
  delete_fleet_cloud_connectors_cloudconnectorid_response,
  delete_fleet_enrollment_api_keys_keyid_request,
  delete_fleet_enrollment_api_keys_keyid_response,
  delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets_request,
  delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets_response,
  delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request,
  delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets_response,
  delete_fleet_epm_packages_pkgname_pkgversion_request,
  delete_fleet_epm_packages_pkgname_pkgversion_response,
  delete_fleet_fleet_server_hosts_itemid_request,
  delete_fleet_fleet_server_hosts_itemid_response,
  delete_fleet_outputs_outputid_request,
  delete_fleet_outputs_outputid_response,
  delete_fleet_package_policies_packagepolicyid_request,
  delete_fleet_package_policies_packagepolicyid_response,
  delete_fleet_proxies_itemid_request,
  delete_fleet_proxies_itemid_response,
  delete_knowledge_base_entry_request,
  delete_knowledge_base_entry_response,
  delete_list_index_request,
  delete_list_index_response,
  delete_list_item_request,
  delete_list_item_response,
  delete_list_request,
  delete_list_response,
  delete_logstash_pipeline_request,
  delete_logstash_pipeline_response,
  delete_maintenance_window_id_request,
  delete_maintenance_window_id_response,
  delete_monitoring_engine_request,
  delete_monitoring_engine_response,
  delete_note_request,
  delete_note_response,
  delete_parameter_request,
  delete_parameter_response,
  delete_parameters_request,
  delete_parameters_response,
  delete_priv_mon_user_request,
  delete_priv_mon_user_response,
  delete_private_location_request,
  delete_private_location_response,
  delete_rollup_data_op_request,
  delete_rollup_data_op_response,
  delete_rule_request,
  delete_rule_response,
  delete_runtime_field_default_request,
  delete_runtime_field_default_response,
  delete_security_role_name_request,
  delete_security_role_name_response,
  delete_single_entity_request,
  delete_single_entity_response,
  delete_slo_instances_op_request,
  delete_slo_instances_op_response,
  delete_slo_op_request,
  delete_slo_op_response,
  delete_source_map_request,
  delete_source_map_response,
  delete_spaces_space_id_request,
  delete_spaces_space_id_response,
  delete_streams_name_dashboards_dashboardid_request,
  delete_streams_name_dashboards_dashboardid_response,
  delete_streams_name_queries_queryid_request,
  delete_streams_name_queries_queryid_response,
  delete_streams_name_request,
  delete_streams_name_response,
  delete_streams_name_rules_ruleid_request,
  delete_streams_name_rules_ruleid_response,
  delete_synthetic_monitor_request,
  delete_synthetic_monitor_response,
  delete_synthetic_monitors_request,
  delete_synthetic_monitors_response,
  delete_timelines_request,
  delete_timelines_response,
  delete_url_request,
  delete_url_response,
  disable_attack_discovery_schedules_request,
  disable_attack_discovery_schedules_response,
  disable_monitoring_engine_request,
  disable_monitoring_engine_response,
  disable_slo_op_request,
  disable_slo_op_response,
  duplicate_exception_list_request,
  duplicate_exception_list_response,
  enable_attack_discovery_schedules_request,
  enable_attack_discovery_schedules_response,
  enable_slo_op_request,
  enable_slo_op_response,
  endpoint_execute_action_request,
  endpoint_execute_action_response,
  endpoint_file_download_request,
  endpoint_file_download_response,
  endpoint_file_info_request,
  endpoint_file_info_response,
  endpoint_get_actions_details_request,
  endpoint_get_actions_details_response,
  endpoint_get_actions_list_request,
  endpoint_get_actions_list_response,
  endpoint_get_actions_state_request,
  endpoint_get_actions_state_response,
  endpoint_get_actions_status_request,
  endpoint_get_actions_status_response,
  endpoint_get_file_action_request,
  endpoint_get_file_action_response,
  endpoint_get_processes_action_request,
  endpoint_get_processes_action_response,
  endpoint_isolate_action_request,
  endpoint_isolate_action_response,
  endpoint_kill_process_action_request,
  endpoint_kill_process_action_response,
  endpoint_scan_action_request,
  endpoint_scan_action_response,
  endpoint_suspend_process_action_request,
  endpoint_suspend_process_action_response,
  endpoint_unisolate_action_request,
  endpoint_unisolate_action_response,
  endpoint_upload_action_request,
  endpoint_upload_action_response,
  export_exception_list_request,
  export_exception_list_response,
  export_list_items_request,
  export_list_items_response,
  export_rules_request,
  export_rules_response,
  export_timelines_request,
  export_timelines_response,
  finalize_alerts_migration_request,
  finalize_alerts_migration_response,
  find_anonymization_fields_request,
  find_anonymization_fields_response,
  find_asset_criticality_records_request,
  find_asset_criticality_records_response,
  find_attack_discovery_schedules_request,
  find_attack_discovery_schedules_response,
  find_case_activity_default_space_request,
  find_case_activity_default_space_response,
  find_case_comments_default_space_request,
  find_case_comments_default_space_response,
  find_case_connectors_default_space_request,
  find_case_connectors_default_space_response,
  find_cases_default_space_request,
  find_cases_default_space_response,
  find_conversations_request,
  find_conversations_response,
  find_endpoint_list_items_request,
  find_endpoint_list_items_response,
  find_exception_list_items_request,
  find_exception_list_items_response,
  find_exception_lists_request,
  find_exception_lists_response,
  find_knowledge_base_entries_request,
  find_knowledge_base_entries_response,
  find_list_items_request,
  find_list_items_response,
  find_lists_request,
  find_lists_response,
  find_prompts_request,
  find_prompts_response,
  find_rules_request,
  find_rules_response,
  find_saved_objects_request,
  find_saved_objects_response,
  find_slos_op_request,
  find_slos_op_response,
  get_actions_connector_id_request,
  get_actions_connector_id_response,
  get_actions_connector_types_request,
  get_actions_connector_types_response,
  get_actions_connectors_request,
  get_actions_connectors_response,
  get_agent_builder_a2a_agentid_json_request,
  get_agent_builder_a2a_agentid_json_response,
  get_agent_builder_agents_id_request,
  get_agent_builder_agents_id_response,
  get_agent_builder_agents_request,
  get_agent_builder_agents_response,
  get_agent_builder_conversations_conversation_id_request,
  get_agent_builder_conversations_conversation_id_response,
  get_agent_builder_conversations_request,
  get_agent_builder_conversations_response,
  get_agent_builder_tools_request,
  get_agent_builder_tools_response,
  get_agent_builder_tools_toolid_request,
  get_agent_builder_tools_toolid_response,
  get_agent_configurations_request,
  get_agent_configurations_response,
  get_agent_name_for_service_request,
  get_agent_name_for_service_response,
  get_alerting_health_request,
  get_alerting_health_response,
  get_alerting_rule_id_request,
  get_alerting_rule_id_response,
  get_alerting_rules_find_request,
  get_alerting_rules_find_response,
  get_all_data_views_default_request,
  get_all_data_views_default_response,
  get_annotation_request,
  get_annotation_response,
  get_asset_criticality_record_request,
  get_asset_criticality_record_response,
  get_attack_discovery_generation_request,
  get_attack_discovery_generation_response,
  get_attack_discovery_generations_request,
  get_attack_discovery_generations_response,
  get_attack_discovery_schedules_request,
  get_attack_discovery_schedules_response,
  get_case_alerts_default_space_request,
  get_case_alerts_default_space_response,
  get_case_comment_default_space_request,
  get_case_comment_default_space_response,
  get_case_configuration_default_space_request,
  get_case_configuration_default_space_response,
  get_case_default_space_request,
  get_case_default_space_response,
  get_case_reporters_default_space_request,
  get_case_reporters_default_space_response,
  get_case_tags_default_space_request,
  get_case_tags_default_space_response,
  get_cases_by_alert_default_space_request,
  get_cases_by_alert_default_space_response,
  get_data_view_default_request,
  get_data_view_default_response,
  get_default_data_view_default_request,
  get_default_data_view_default_response,
  get_definitions_op_request,
  get_definitions_op_response,
  get_draft_timelines_request,
  get_draft_timelines_response,
  get_endpoint_metadata_list_request,
  get_endpoint_metadata_list_response,
  get_endpoint_metadata_request,
  get_endpoint_metadata_response,
  get_entity_engine_request,
  get_entity_engine_response,
  get_entity_store_status_request,
  get_entity_store_status_response,
  get_environments_for_service_request,
  get_environments_for_service_response,
  get_features_request,
  get_features_response,
  get_fleet_agent_download_sources_request,
  get_fleet_agent_download_sources_response,
  get_fleet_agent_download_sources_sourceid_request,
  get_fleet_agent_download_sources_sourceid_response,
  get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status_request,
  get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status_response,
  get_fleet_agent_policies_agentpolicyid_download_request,
  get_fleet_agent_policies_agentpolicyid_download_response,
  get_fleet_agent_policies_agentpolicyid_full_request,
  get_fleet_agent_policies_agentpolicyid_full_response,
  get_fleet_agent_policies_agentpolicyid_outputs_request,
  get_fleet_agent_policies_agentpolicyid_outputs_response,
  get_fleet_agent_policies_agentpolicyid_request,
  get_fleet_agent_policies_agentpolicyid_response,
  get_fleet_agent_policies_request,
  get_fleet_agent_policies_response,
  get_fleet_agent_status_data_request,
  get_fleet_agent_status_data_response,
  get_fleet_agent_status_request,
  get_fleet_agent_status_response,
  get_fleet_agents_action_status_request,
  get_fleet_agents_action_status_response,
  get_fleet_agents_agentid_request,
  get_fleet_agents_agentid_response,
  get_fleet_agents_agentid_uploads_request,
  get_fleet_agents_agentid_uploads_response,
  get_fleet_agents_available_versions_request,
  get_fleet_agents_available_versions_response,
  get_fleet_agents_files_fileid_filename_request,
  get_fleet_agents_files_fileid_filename_response,
  get_fleet_agents_request,
  get_fleet_agents_response,
  get_fleet_agents_setup_request,
  get_fleet_agents_setup_response,
  get_fleet_agents_tags_request,
  get_fleet_agents_tags_response,
  get_fleet_check_permissions_request,
  get_fleet_check_permissions_response,
  get_fleet_cloud_connectors_cloudconnectorid_request,
  get_fleet_cloud_connectors_cloudconnectorid_response,
  get_fleet_cloud_connectors_request,
  get_fleet_cloud_connectors_response,
  get_fleet_data_streams_request,
  get_fleet_data_streams_response,
  get_fleet_enrollment_api_keys_keyid_request,
  get_fleet_enrollment_api_keys_keyid_response,
  get_fleet_enrollment_api_keys_request,
  get_fleet_enrollment_api_keys_response,
  get_fleet_epm_categories_request,
  get_fleet_epm_categories_response,
  get_fleet_epm_data_streams_request,
  get_fleet_epm_data_streams_response,
  get_fleet_epm_packages_bulk_rollback_taskid_request,
  get_fleet_epm_packages_bulk_rollback_taskid_response,
  get_fleet_epm_packages_bulk_uninstall_taskid_request,
  get_fleet_epm_packages_bulk_uninstall_taskid_response,
  get_fleet_epm_packages_bulk_upgrade_taskid_request,
  get_fleet_epm_packages_bulk_upgrade_taskid_response,
  get_fleet_epm_packages_installed_request,
  get_fleet_epm_packages_installed_response,
  get_fleet_epm_packages_limited_request,
  get_fleet_epm_packages_limited_response,
  get_fleet_epm_packages_pkgname_pkgversion_filepath_request,
  get_fleet_epm_packages_pkgname_pkgversion_filepath_response,
  get_fleet_epm_packages_pkgname_pkgversion_request,
  get_fleet_epm_packages_pkgname_pkgversion_response,
  get_fleet_epm_packages_pkgname_stats_request,
  get_fleet_epm_packages_pkgname_stats_response,
  get_fleet_epm_packages_request,
  get_fleet_epm_packages_response,
  get_fleet_epm_templates_pkgname_pkgversion_inputs_request,
  get_fleet_epm_templates_pkgname_pkgversion_inputs_response,
  get_fleet_epm_verification_key_id_request,
  get_fleet_epm_verification_key_id_response,
  get_fleet_fleet_server_hosts_itemid_request,
  get_fleet_fleet_server_hosts_itemid_response,
  get_fleet_fleet_server_hosts_request,
  get_fleet_fleet_server_hosts_response,
  get_fleet_kubernetes_download_request,
  get_fleet_kubernetes_download_response,
  get_fleet_kubernetes_request,
  get_fleet_kubernetes_response,
  get_fleet_outputs_outputid_health_request,
  get_fleet_outputs_outputid_health_response,
  get_fleet_outputs_outputid_request,
  get_fleet_outputs_outputid_response,
  get_fleet_outputs_request,
  get_fleet_outputs_response,
  get_fleet_package_policies_packagepolicyid_request,
  get_fleet_package_policies_packagepolicyid_response,
  get_fleet_package_policies_request,
  get_fleet_package_policies_response,
  get_fleet_proxies_itemid_request,
  get_fleet_proxies_itemid_response,
  get_fleet_proxies_request,
  get_fleet_proxies_response,
  get_fleet_remote_synced_integrations_outputid_remote_status_request,
  get_fleet_remote_synced_integrations_outputid_remote_status_response,
  get_fleet_remote_synced_integrations_status_request,
  get_fleet_remote_synced_integrations_status_response,
  get_fleet_settings_request,
  get_fleet_settings_response,
  get_fleet_space_settings_request,
  get_fleet_space_settings_response,
  get_fleet_uninstall_tokens_request,
  get_fleet_uninstall_tokens_response,
  get_fleet_uninstall_tokens_uninstalltokenid_request,
  get_fleet_uninstall_tokens_uninstalltokenid_response,
  get_knowledge_base_request,
  get_knowledge_base_response,
  get_logstash_pipeline_request,
  get_logstash_pipeline_response,
  get_logstash_pipelines_request,
  get_logstash_pipelines_response,
  get_maintenance_window_find_request,
  get_maintenance_window_find_response,
  get_maintenance_window_id_request,
  get_maintenance_window_id_response,
  get_notes_request,
  get_notes_response,
  get_parameter_request,
  get_parameter_response,
  get_parameters_request,
  get_parameters_response,
  get_policy_response_request,
  get_policy_response_response,
  get_private_location_request,
  get_private_location_response,
  get_private_locations_request,
  get_private_locations_response,
  get_privileged_access_detection_package_status_request,
  get_privileged_access_detection_package_status_response,
  get_protection_updates_note_request,
  get_protection_updates_note_response,
  get_rule_types_request,
  get_rule_types_response,
  get_runtime_field_default_request,
  get_runtime_field_default_response,
  get_saved_object_request,
  get_saved_object_response,
  get_security_role_name_request,
  get_security_role_name_response,
  get_security_role_request,
  get_security_role_response,
  get_single_agent_configuration_request,
  get_single_agent_configuration_response,
  get_slo_op_request,
  get_slo_op_response,
  get_source_maps_request,
  get_source_maps_response,
  get_spaces_space_id_request,
  get_spaces_space_id_response,
  get_spaces_space_request,
  get_spaces_space_response,
  get_status_request,
  get_status_response,
  get_streams_name_dashboards_request,
  get_streams_name_dashboards_response,
  get_streams_name_group_request,
  get_streams_name_group_response,
  get_streams_name_ingest_request,
  get_streams_name_ingest_response,
  get_streams_name_queries_request,
  get_streams_name_queries_response,
  get_streams_name_request,
  get_streams_name_response,
  get_streams_name_rules_request,
  get_streams_name_rules_response,
  get_streams_name_significant_events_request,
  get_streams_name_significant_events_response,
  get_streams_request,
  get_streams_response,
  get_synthetic_monitor_request,
  get_synthetic_monitor_response,
  get_synthetic_monitors_request,
  get_synthetic_monitors_response,
  get_timeline_request,
  get_timeline_response,
  get_timelines_request,
  get_timelines_response,
  get_upgrade_status_request,
  get_upgrade_status_response,
  get_uptime_settings_request,
  get_uptime_settings_response,
  get_url_request,
  get_url_response,
  import_exception_list_request,
  import_exception_list_response,
  import_list_items_request,
  import_list_items_response,
  import_rules_request,
  import_rules_response,
  import_timelines_request,
  import_timelines_response,
  init_entity_engine_request,
  init_entity_engine_response,
  init_entity_store_request,
  init_entity_store_response,
  init_monitoring_engine_request,
  init_monitoring_engine_response,
  install_prebuilt_rules_and_timelines_request,
  install_prebuilt_rules_and_timelines_response,
  install_prepacked_timelines_request,
  install_prepacked_timelines_response,
  install_privileged_access_detection_package_request,
  install_privileged_access_detection_package_response,
  list_entities_request,
  list_entities_response,
  list_entity_engines_request,
  list_entity_engines_response,
  list_priv_mon_users_request,
  list_priv_mon_users_response,
  ml_sync_request,
  ml_sync_response,
  observability_ai_assistant_chat_complete_request,
  observability_ai_assistant_chat_complete_response,
  osquery_create_live_query_request,
  osquery_create_live_query_response,
  osquery_create_packs_request,
  osquery_create_packs_response,
  osquery_create_saved_query_request,
  osquery_create_saved_query_response,
  osquery_delete_packs_request,
  osquery_delete_packs_response,
  osquery_delete_saved_query_request,
  osquery_delete_saved_query_response,
  osquery_find_live_queries_request,
  osquery_find_live_queries_response,
  osquery_find_packs_request,
  osquery_find_packs_response,
  osquery_find_saved_queries_request,
  osquery_find_saved_queries_response,
  osquery_get_live_query_details_request,
  osquery_get_live_query_details_response,
  osquery_get_live_query_results_request,
  osquery_get_live_query_results_response,
  osquery_get_packs_details_request,
  osquery_get_packs_details_response,
  osquery_get_saved_query_details_request,
  osquery_get_saved_query_details_response,
  osquery_update_packs_request,
  osquery_update_packs_response,
  osquery_update_saved_query_request,
  osquery_update_saved_query_response,
  patch_list_item_request,
  patch_list_item_response,
  patch_list_request,
  patch_list_response,
  patch_maintenance_window_id_request,
  patch_maintenance_window_id_response,
  patch_rule_request,
  patch_rule_response,
  patch_timeline_request,
  patch_timeline_response,
  perform_anonymization_fields_bulk_action_request,
  perform_anonymization_fields_bulk_action_response,
  perform_knowledge_base_entry_bulk_action_request,
  perform_knowledge_base_entry_bulk_action_response,
  perform_prompts_bulk_action_request,
  perform_prompts_bulk_action_response,
  perform_rules_bulk_action_request,
  perform_rules_bulk_action_response,
  persist_favorite_route_request,
  persist_favorite_route_response,
  persist_note_route_request,
  persist_note_route_response,
  persist_pinned_event_route_request,
  persist_pinned_event_route_response,
  post_actions_connector_id_execute_request,
  post_actions_connector_id_execute_response,
  post_actions_connector_id_request,
  post_actions_connector_id_response,
  post_agent_builder_a2a_agentid_request,
  post_agent_builder_a2a_agentid_response,
  post_agent_builder_agents_request,
  post_agent_builder_agents_response,
  post_agent_builder_converse_async_request,
  post_agent_builder_converse_async_response,
  post_agent_builder_converse_request,
  post_agent_builder_converse_response,
  post_agent_builder_mcp_request,
  post_agent_builder_mcp_response,
  post_agent_builder_tools_execute_request,
  post_agent_builder_tools_execute_response,
  post_agent_builder_tools_request,
  post_agent_builder_tools_response,
  post_alerting_rule_id_disable_request,
  post_alerting_rule_id_disable_response,
  post_alerting_rule_id_enable_request,
  post_alerting_rule_id_enable_response,
  post_alerting_rule_id_mute_all_request,
  post_alerting_rule_id_mute_all_response,
  post_alerting_rule_id_request,
  post_alerting_rule_id_response,
  post_alerting_rule_id_snooze_schedule_request,
  post_alerting_rule_id_snooze_schedule_response,
  post_alerting_rule_id_unmute_all_request,
  post_alerting_rule_id_unmute_all_response,
  post_alerting_rule_id_update_api_key_request,
  post_alerting_rule_id_update_api_key_response,
  post_alerting_rule_rule_id_alert_alert_id_mute_request,
  post_alerting_rule_rule_id_alert_alert_id_mute_response,
  post_alerting_rule_rule_id_alert_alert_id_unmute_request,
  post_alerting_rule_rule_id_alert_alert_id_unmute_response,
  post_attack_discovery_bulk_request,
  post_attack_discovery_bulk_response,
  post_attack_discovery_generate_request,
  post_attack_discovery_generate_response,
  post_attack_discovery_generations_dismiss_request,
  post_attack_discovery_generations_dismiss_response,
  post_fleet_agent_download_sources_request,
  post_fleet_agent_download_sources_response,
  post_fleet_agent_policies_agentpolicyid_copy_request,
  post_fleet_agent_policies_agentpolicyid_copy_response,
  post_fleet_agent_policies_bulk_get_request,
  post_fleet_agent_policies_bulk_get_response,
  post_fleet_agent_policies_delete_request,
  post_fleet_agent_policies_delete_response,
  post_fleet_agent_policies_outputs_request,
  post_fleet_agent_policies_outputs_response,
  post_fleet_agent_policies_request,
  post_fleet_agent_policies_response,
  post_fleet_agentless_policies_request,
  post_fleet_agentless_policies_response,
  post_fleet_agents_actions_actionid_cancel_request,
  post_fleet_agents_actions_actionid_cancel_response,
  post_fleet_agents_agentid_actions_request,
  post_fleet_agents_agentid_actions_response,
  post_fleet_agents_agentid_migrate_request,
  post_fleet_agents_agentid_migrate_response,
  post_fleet_agents_agentid_reassign_request,
  post_fleet_agents_agentid_reassign_response,
  post_fleet_agents_agentid_request_diagnostics_request,
  post_fleet_agents_agentid_request_diagnostics_response,
  post_fleet_agents_agentid_unenroll_request,
  post_fleet_agents_agentid_unenroll_response,
  post_fleet_agents_agentid_upgrade_request,
  post_fleet_agents_agentid_upgrade_response,
  post_fleet_agents_bulk_migrate_request,
  post_fleet_agents_bulk_migrate_response,
  post_fleet_agents_bulk_reassign_request,
  post_fleet_agents_bulk_reassign_response,
  post_fleet_agents_bulk_request_diagnostics_request,
  post_fleet_agents_bulk_request_diagnostics_response,
  post_fleet_agents_bulk_unenroll_request,
  post_fleet_agents_bulk_unenroll_response,
  post_fleet_agents_bulk_update_agent_tags_request,
  post_fleet_agents_bulk_update_agent_tags_response,
  post_fleet_agents_bulk_upgrade_request,
  post_fleet_agents_bulk_upgrade_response,
  post_fleet_agents_request,
  post_fleet_agents_response,
  post_fleet_agents_setup_request,
  post_fleet_agents_setup_response,
  post_fleet_cloud_connectors_request,
  post_fleet_cloud_connectors_response,
  post_fleet_enrollment_api_keys_request,
  post_fleet_enrollment_api_keys_response,
  post_fleet_epm_bulk_assets_request,
  post_fleet_epm_bulk_assets_response,
  post_fleet_epm_custom_integrations_request,
  post_fleet_epm_custom_integrations_response,
  post_fleet_epm_packages_bulk_request,
  post_fleet_epm_packages_bulk_response,
  post_fleet_epm_packages_bulk_rollback_request,
  post_fleet_epm_packages_bulk_rollback_response,
  post_fleet_epm_packages_bulk_uninstall_request,
  post_fleet_epm_packages_bulk_uninstall_response,
  post_fleet_epm_packages_bulk_upgrade_request,
  post_fleet_epm_packages_bulk_upgrade_response,
  post_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request,
  post_fleet_epm_packages_pkgname_pkgversion_kibana_assets_response,
  post_fleet_epm_packages_pkgname_pkgversion_request,
  post_fleet_epm_packages_pkgname_pkgversion_response,
  post_fleet_epm_packages_pkgname_pkgversion_rule_assets_request,
  post_fleet_epm_packages_pkgname_pkgversion_rule_assets_response,
  post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_request,
  post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_response,
  post_fleet_epm_packages_pkgname_rollback_request,
  post_fleet_epm_packages_pkgname_rollback_response,
  post_fleet_epm_packages_request,
  post_fleet_epm_packages_response,
  post_fleet_fleet_server_hosts_request,
  post_fleet_fleet_server_hosts_response,
  post_fleet_health_check_request,
  post_fleet_health_check_response,
  post_fleet_logstash_api_keys_request,
  post_fleet_logstash_api_keys_response,
  post_fleet_message_signing_service_rotate_key_pair_request,
  post_fleet_message_signing_service_rotate_key_pair_response,
  post_fleet_outputs_request,
  post_fleet_outputs_response,
  post_fleet_package_policies_bulk_get_request,
  post_fleet_package_policies_bulk_get_response,
  post_fleet_package_policies_delete_request,
  post_fleet_package_policies_delete_response,
  post_fleet_package_policies_request,
  post_fleet_package_policies_response,
  post_fleet_package_policies_upgrade_dryrun_request,
  post_fleet_package_policies_upgrade_dryrun_response,
  post_fleet_package_policies_upgrade_request,
  post_fleet_package_policies_upgrade_response,
  post_fleet_proxies_request,
  post_fleet_proxies_response,
  post_fleet_service_tokens_request,
  post_fleet_service_tokens_response,
  post_fleet_setup_request,
  post_fleet_setup_response,
  post_knowledge_base_request,
  post_knowledge_base_response,
  post_maintenance_window_id_archive_request,
  post_maintenance_window_id_archive_response,
  post_maintenance_window_id_unarchive_request,
  post_maintenance_window_id_unarchive_response,
  post_maintenance_window_request,
  post_maintenance_window_response,
  post_parameters_request,
  post_parameters_response,
  post_private_location_request,
  post_private_location_response,
  post_saved_objects_export_request,
  post_saved_objects_export_response,
  post_saved_objects_import_request,
  post_saved_objects_import_response,
  post_security_role_query_request,
  post_security_role_query_response,
  post_security_roles_request,
  post_security_roles_response,
  post_security_session_invalidate_request,
  post_security_session_invalidate_response,
  post_spaces_copy_saved_objects_request,
  post_spaces_copy_saved_objects_response,
  post_spaces_disable_legacy_url_aliases_request,
  post_spaces_disable_legacy_url_aliases_response,
  post_spaces_get_shareable_references_request,
  post_spaces_get_shareable_references_response,
  post_spaces_resolve_copy_saved_objects_errors_request,
  post_spaces_resolve_copy_saved_objects_errors_response,
  post_spaces_space_request,
  post_spaces_space_response,
  post_spaces_update_objects_spaces_request,
  post_spaces_update_objects_spaces_response,
  post_streams_disable_request,
  post_streams_disable_response,
  post_streams_enable_request,
  post_streams_enable_response,
  post_streams_name_content_export_request,
  post_streams_name_content_export_response,
  post_streams_name_content_import_request,
  post_streams_name_content_import_response,
  post_streams_name_dashboards_bulk_request,
  post_streams_name_dashboards_bulk_response,
  post_streams_name_fork_request,
  post_streams_name_fork_response,
  post_streams_name_queries_bulk_request,
  post_streams_name_queries_bulk_response,
  post_streams_name_significant_events_generate_request,
  post_streams_name_significant_events_generate_response,
  post_streams_name_significant_events_preview_request,
  post_streams_name_significant_events_preview_response,
  post_streams_resync_request,
  post_streams_resync_response,
  post_synthetic_monitors_request,
  post_synthetic_monitors_response,
  post_synthetics_monitor_test_request,
  post_synthetics_monitor_test_response,
  post_url_request,
  post_url_response,
  preview_swap_data_views_default_request,
  preview_swap_data_views_default_response,
  priv_mon_health_request,
  priv_mon_health_response,
  priv_mon_privileges_request,
  priv_mon_privileges_response,
  privmon_bulk_upload_users_c_s_v_request,
  privmon_bulk_upload_users_c_s_v_response,
  push_case_default_space_request,
  push_case_default_space_response,
  put_actions_connector_id_request,
  put_actions_connector_id_response,
  put_agent_builder_agents_id_request,
  put_agent_builder_agents_id_response,
  put_agent_builder_tools_toolid_request,
  put_agent_builder_tools_toolid_response,
  put_alerting_rule_id_request,
  put_alerting_rule_id_response,
  put_fleet_agent_download_sources_sourceid_request,
  put_fleet_agent_download_sources_sourceid_response,
  put_fleet_agent_policies_agentpolicyid_request,
  put_fleet_agent_policies_agentpolicyid_response,
  put_fleet_agents_agentid_request,
  put_fleet_agents_agentid_response,
  put_fleet_cloud_connectors_cloudconnectorid_request,
  put_fleet_cloud_connectors_cloudconnectorid_response,
  put_fleet_epm_custom_integrations_pkgname_request,
  put_fleet_epm_custom_integrations_pkgname_response,
  put_fleet_epm_packages_pkgname_pkgversion_request,
  put_fleet_epm_packages_pkgname_pkgversion_response,
  put_fleet_fleet_server_hosts_itemid_request,
  put_fleet_fleet_server_hosts_itemid_response,
  put_fleet_outputs_outputid_request,
  put_fleet_outputs_outputid_response,
  put_fleet_package_policies_packagepolicyid_request,
  put_fleet_package_policies_packagepolicyid_response,
  put_fleet_proxies_itemid_request,
  put_fleet_proxies_itemid_response,
  put_fleet_settings_request,
  put_fleet_settings_response,
  put_fleet_space_settings_request,
  put_fleet_space_settings_response,
  put_logstash_pipeline_request,
  put_logstash_pipeline_response,
  put_parameter_request,
  put_parameter_response,
  put_private_location_request,
  put_private_location_response,
  put_security_role_name_request,
  put_security_role_name_response,
  put_spaces_space_id_request,
  put_spaces_space_id_response,
  put_streams_name_dashboards_dashboardid_request,
  put_streams_name_dashboards_dashboardid_response,
  put_streams_name_group_request,
  put_streams_name_group_response,
  put_streams_name_ingest_request,
  put_streams_name_ingest_response,
  put_streams_name_queries_queryid_request,
  put_streams_name_queries_queryid_response,
  put_streams_name_request,
  put_streams_name_response,
  put_streams_name_rules_ruleid_request,
  put_streams_name_rules_ruleid_response,
  put_synthetic_monitor_request,
  put_synthetic_monitor_response,
  put_uptime_settings_request,
  put_uptime_settings_response,
  read_alerts_index_request,
  read_alerts_index_response,
  read_alerts_migration_status_request,
  read_alerts_migration_status_response,
  read_conversation_request,
  read_conversation_response,
  read_endpoint_list_item_request,
  read_endpoint_list_item_response,
  read_exception_list_item_request,
  read_exception_list_item_response,
  read_exception_list_request,
  read_exception_list_response,
  read_exception_list_summary_request,
  read_exception_list_summary_response,
  read_knowledge_base_entry_request,
  read_knowledge_base_entry_response,
  read_knowledge_base_request,
  read_knowledge_base_response,
  read_list_index_request,
  read_list_index_response,
  read_list_item_request,
  read_list_item_response,
  read_list_privileges_request,
  read_list_privileges_response,
  read_list_request,
  read_list_response,
  read_prebuilt_rules_and_timelines_status_request,
  read_prebuilt_rules_and_timelines_status_response,
  read_privileges_request,
  read_privileges_response,
  read_rule_request,
  read_rule_response,
  read_tags_request,
  read_tags_response,
  reset_slo_op_request,
  reset_slo_op_response,
  resolve_import_errors_request,
  resolve_import_errors_response,
  resolve_saved_object_request,
  resolve_saved_object_response,
  resolve_timeline_request,
  resolve_timeline_response,
  resolve_url_request,
  resolve_url_response,
  rotate_encryption_key_request,
  rotate_encryption_key_response,
  rule_preview_request,
  rule_preview_response,
  run_script_action_request,
  run_script_action_response,
  save_apm_server_schema_request,
  save_apm_server_schema_response,
  schedule_monitoring_engine_request,
  schedule_monitoring_engine_response,
  schedule_risk_engine_now_request,
  schedule_risk_engine_now_response,
  search_alerts_request,
  search_alerts_response,
  search_single_configuration_request,
  search_single_configuration_response,
  set_alert_assignees_request,
  set_alert_assignees_response,
  set_alert_tags_request,
  set_alert_tags_response,
  set_alerts_status_request,
  set_alerts_status_response,
  set_case_configuration_default_space_request,
  set_case_configuration_default_space_response,
  set_default_datail_view_default_request,
  set_default_datail_view_default_response,
  start_entity_engine_request,
  start_entity_engine_response,
  stop_entity_engine_request,
  stop_entity_engine_response,
  swap_data_views_default_request,
  swap_data_views_default_response,
  task_manager_health_request,
  task_manager_health_response,
  update_attack_discovery_schedules_request,
  update_attack_discovery_schedules_response,
  update_case_comment_default_space_request,
  update_case_comment_default_space_response,
  update_case_configuration_default_space_request,
  update_case_configuration_default_space_response,
  update_case_default_space_request,
  update_case_default_space_response,
  update_conversation_request,
  update_conversation_response,
  update_data_view_default_request,
  update_data_view_default_response,
  update_endpoint_list_item_request,
  update_endpoint_list_item_response,
  update_exception_list_item_request,
  update_exception_list_item_response,
  update_exception_list_request,
  update_exception_list_response,
  update_fields_metadata_default_request,
  update_fields_metadata_default_response,
  update_knowledge_base_entry_request,
  update_knowledge_base_entry_response,
  update_list_item_request,
  update_list_item_response,
  update_list_request,
  update_list_response,
  update_priv_mon_user_request,
  update_priv_mon_user_response,
  update_rule_request,
  update_rule_response,
  update_runtime_field_default_request,
  update_runtime_field_default_response,
  update_saved_object_request,
  update_saved_object_response,
  update_slo_op_request,
  update_slo_op_response,
  upload_source_map_request,
  upload_source_map_response,
  upsert_entities_bulk_request,
  upsert_entities_bulk_response,
  upsert_entity_request,
  upsert_entity_response,
} from './schemas/kibana_openapi_zod.gen';
import type { InternalConnectorContract } from '../../types/latest';

import { getZodLooseObjectFromProperty } from '../utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec

// declare contracts
const GET_ACTIONS_CONNECTOR_TYPES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_actions_connector_types',
  connectorGroup: 'internal',
  summary: `Get connector types`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector_types</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You do not need any Kibana feature privileges to run this API.`,
  methods: ['GET'],
  patterns: ['/api/actions/connector_types'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['feature_id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_actions_connector_types_request, 'body'),
    getZodLooseObjectFromProperty(get_actions_connector_types_request, 'path'),
    getZodLooseObjectFromProperty(get_actions_connector_types_request, 'query'),
  ]),
  outputSchema: get_actions_connector_types_response,
};
const DELETE_ACTIONS_CONNECTOR_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_actions_connector_id',
  connectorGroup: 'internal',
  summary: `Delete a connector`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: When you delete a connector, it cannot be recovered.`,
  methods: ['DELETE'],
  patterns: ['/api/actions/connector/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_actions_connector_id_request, 'body'),
    getZodLooseObjectFromProperty(delete_actions_connector_id_request, 'path'),
    getZodLooseObjectFromProperty(delete_actions_connector_id_request, 'query'),
  ]),
  outputSchema: delete_actions_connector_id_response,
};
const GET_ACTIONS_CONNECTOR_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_actions_connector_id',
  connectorGroup: 'internal',
  summary: `Get connector information`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/actions/connector/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_actions_connector_id_request, 'body'),
    getZodLooseObjectFromProperty(get_actions_connector_id_request, 'path'),
    getZodLooseObjectFromProperty(get_actions_connector_id_request, 'query'),
  ]),
  outputSchema: get_actions_connector_id_response,
};
const POST_ACTIONS_CONNECTOR_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_actions_connector_id',
  connectorGroup: 'internal',
  summary: `Create a connector`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/actions/connector/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['connector_type_id', 'name', 'config', 'secrets'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_actions_connector_id_request, 'body'),
    getZodLooseObjectFromProperty(post_actions_connector_id_request, 'path'),
    getZodLooseObjectFromProperty(post_actions_connector_id_request, 'query'),
  ]),
  outputSchema: post_actions_connector_id_response,
};
const PUT_ACTIONS_CONNECTOR_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_actions_connector_id',
  connectorGroup: 'internal',
  summary: `Update a connector`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['PUT'],
  patterns: ['/api/actions/connector/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['name', 'config', 'secrets'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_actions_connector_id_request, 'body'),
    getZodLooseObjectFromProperty(put_actions_connector_id_request, 'path'),
    getZodLooseObjectFromProperty(put_actions_connector_id_request, 'query'),
  ]),
  outputSchema: put_actions_connector_id_response,
};
const POST_ACTIONS_CONNECTOR_ID_EXECUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_actions_connector_id_execute',
  connectorGroup: 'internal',
  summary: `Run a connector`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector/{id}/_execute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You can use this API to test an action that involves interaction with Kibana services or integrations with third-party systems.`,
  methods: ['POST'],
  patterns: ['/api/actions/connector/{id}/_execute'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['params'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_actions_connector_id_execute_request, 'body'),
    getZodLooseObjectFromProperty(post_actions_connector_id_execute_request, 'path'),
    getZodLooseObjectFromProperty(post_actions_connector_id_execute_request, 'query'),
  ]),
  outputSchema: post_actions_connector_id_execute_response,
};
const GET_ACTIONS_CONNECTORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_actions_connectors',
  connectorGroup: 'internal',
  summary: `Get all connectors`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connectors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/actions/connectors'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_actions_connectors_request, 'body'),
    getZodLooseObjectFromProperty(get_actions_connectors_request, 'path'),
    getZodLooseObjectFromProperty(get_actions_connectors_request, 'query'),
  ]),
  outputSchema: get_actions_connectors_response,
};
const POST_AGENT_BUILDER_A2A_AGENTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_a2a_agentid',
  connectorGroup: 'internal',
  summary: `Send A2A task`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/a2a/{agentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: This endpoint is designed for A2A protocol clients and should not be used directly via REST APIs. Use an A2A SDK or A2A Inspector instead.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['POST'],
  patterns: ['/api/agent_builder/a2a/{agentId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_agent_builder_a2a_agentid_request, 'body'),
    getZodLooseObjectFromProperty(post_agent_builder_a2a_agentid_request, 'path'),
    getZodLooseObjectFromProperty(post_agent_builder_a2a_agentid_request, 'query'),
  ]),
  outputSchema: post_agent_builder_a2a_agentid_response,
};
const GET_AGENT_BUILDER_A2A_AGENTID_JSON_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_a2a_agentid_json',
  connectorGroup: 'internal',
  summary: `Get A2A agent card`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/a2a/{agentId}.json</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get agent discovery metadata in JSON format. Use this endpoint to provide agent information for A2A protocol integration and discovery.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['GET'],
  patterns: ['/api/agent_builder/a2a/{agentId}.json'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_agent_builder_a2a_agentid_json_request, 'body'),
    getZodLooseObjectFromProperty(get_agent_builder_a2a_agentid_json_request, 'path'),
    getZodLooseObjectFromProperty(get_agent_builder_a2a_agentid_json_request, 'query'),
  ]),
  outputSchema: get_agent_builder_a2a_agentid_json_response,
};
const GET_AGENT_BUILDER_AGENTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_agents',
  connectorGroup: 'internal',
  summary: `List agents`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/agents</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List all available agents. Use this endpoint to retrieve complete agent information including their current configuration and assigned tools.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['GET'],
  patterns: ['/api/agent_builder/agents'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_agent_builder_agents_request, 'body'),
    getZodLooseObjectFromProperty(get_agent_builder_agents_request, 'path'),
    getZodLooseObjectFromProperty(get_agent_builder_agents_request, 'query'),
  ]),
  outputSchema: get_agent_builder_agents_response,
};
const POST_AGENT_BUILDER_AGENTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_agents',
  connectorGroup: 'internal',
  summary: `Create an agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/agents</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new agent. Use this endpoint to define the agent's behavior, appearance, and capabilities through comprehensive configuration options.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['POST'],
  patterns: ['/api/agent_builder/agents'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'avatar_color',
      'avatar_symbol',
      'configuration',
      'description',
      'id',
      'labels',
      'name',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_agent_builder_agents_request, 'body'),
    getZodLooseObjectFromProperty(post_agent_builder_agents_request, 'path'),
    getZodLooseObjectFromProperty(post_agent_builder_agents_request, 'query'),
  ]),
  outputSchema: post_agent_builder_agents_response,
};
const DELETE_AGENT_BUILDER_AGENTS_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_agent_builder_agents_id',
  connectorGroup: 'internal',
  summary: `Delete an agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/agents/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an agent by ID. This action cannot be undone.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['DELETE'],
  patterns: ['/api/agent_builder/agents/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_agent_builder_agents_id_request, 'body'),
    getZodLooseObjectFromProperty(delete_agent_builder_agents_id_request, 'path'),
    getZodLooseObjectFromProperty(delete_agent_builder_agents_id_request, 'query'),
  ]),
  outputSchema: delete_agent_builder_agents_id_response,
};
const GET_AGENT_BUILDER_AGENTS_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_agents_id',
  connectorGroup: 'internal',
  summary: `Get an agent by ID`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/agents/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a specific agent by ID. Use this endpoint to retrieve the complete agent definition including all configuration details and tool assignments.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['GET'],
  patterns: ['/api/agent_builder/agents/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_agent_builder_agents_id_request, 'body'),
    getZodLooseObjectFromProperty(get_agent_builder_agents_id_request, 'path'),
    getZodLooseObjectFromProperty(get_agent_builder_agents_id_request, 'query'),
  ]),
  outputSchema: get_agent_builder_agents_id_response,
};
const PUT_AGENT_BUILDER_AGENTS_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_agent_builder_agents_id',
  connectorGroup: 'internal',
  summary: `Update an agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/agents/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing agent configuration. Use this endpoint to modify any aspect of the agent's behavior, appearance, or capabilities.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['PUT'],
  patterns: ['/api/agent_builder/agents/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['avatar_color', 'avatar_symbol', 'configuration', 'description', 'labels', 'name'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_agent_builder_agents_id_request, 'body'),
    getZodLooseObjectFromProperty(put_agent_builder_agents_id_request, 'path'),
    getZodLooseObjectFromProperty(put_agent_builder_agents_id_request, 'query'),
  ]),
  outputSchema: put_agent_builder_agents_id_response,
};
const GET_AGENT_BUILDER_CONVERSATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_conversations',
  connectorGroup: 'internal',
  summary: `List conversations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/conversations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List all conversations for a user. Use the optional agent ID to filter conversations by a specific agent.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['GET'],
  patterns: ['/api/agent_builder/conversations'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['agent_id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_agent_builder_conversations_request, 'body'),
    getZodLooseObjectFromProperty(get_agent_builder_conversations_request, 'path'),
    getZodLooseObjectFromProperty(get_agent_builder_conversations_request, 'query'),
  ]),
  outputSchema: get_agent_builder_conversations_response,
};
const DELETE_AGENT_BUILDER_CONVERSATIONS_CONVERSATION_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_agent_builder_conversations_conversation_id',
  connectorGroup: 'internal',
  summary: `Delete conversation by ID`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/conversations/{conversation_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a conversation by ID. This action cannot be undone.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['DELETE'],
  patterns: ['/api/agent_builder/conversations/{conversation_id}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['conversation_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(
      delete_agent_builder_conversations_conversation_id_request,
      'body'
    ),
    getZodLooseObjectFromProperty(
      delete_agent_builder_conversations_conversation_id_request,
      'path'
    ),
    getZodLooseObjectFromProperty(
      delete_agent_builder_conversations_conversation_id_request,
      'query'
    ),
  ]),
  outputSchema: delete_agent_builder_conversations_conversation_id_response,
};
const GET_AGENT_BUILDER_CONVERSATIONS_CONVERSATION_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_conversations_conversation_id',
  connectorGroup: 'internal',
  summary: `Get conversation by ID`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/conversations/{conversation_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a specific conversation by ID. Use this endpoint to retrieve the complete conversation history including all messages and metadata.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['GET'],
  patterns: ['/api/agent_builder/conversations/{conversation_id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['conversation_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_agent_builder_conversations_conversation_id_request, 'body'),
    getZodLooseObjectFromProperty(get_agent_builder_conversations_conversation_id_request, 'path'),
    getZodLooseObjectFromProperty(get_agent_builder_conversations_conversation_id_request, 'query'),
  ]),
  outputSchema: get_agent_builder_conversations_conversation_id_response,
};
const POST_AGENT_BUILDER_CONVERSE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_converse',
  connectorGroup: 'internal',
  summary: `Send chat message`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/converse</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Send a message to an agent and receive a complete response. This synchronous endpoint waits for the agent to fully process your request before returning the final result. Use this for simple chat interactions where you need the complete response.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['POST'],
  patterns: ['/api/agent_builder/converse'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'agent_id',
      'attachments',
      'browser_api_tools',
      'capabilities',
      'connector_id',
      'conversation_id',
      'input',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_agent_builder_converse_request, 'body'),
    getZodLooseObjectFromProperty(post_agent_builder_converse_request, 'path'),
    getZodLooseObjectFromProperty(post_agent_builder_converse_request, 'query'),
  ]),
  outputSchema: post_agent_builder_converse_response,
};
const POST_AGENT_BUILDER_CONVERSE_ASYNC_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_converse_async',
  connectorGroup: 'internal',
  summary: `Send chat message (streaming)`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/converse/async</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Send a message to an agent and receive real-time streaming events. This asynchronous endpoint provides live updates as the agent processes your request, allowing you to see intermediate steps and progress. Use this for interactive experiences where you want to monitor the agent's thinking process.

## Event types

The endpoint emits Server-Sent Events (SSE) with the following custom event types:

\`conversation_id_set\`

Sets the conversation ID.

Schema:
\`\`\`json
{
  "conversation_id": "uuid"
}
\`\`\`

---

\`conversation_created\`

Fires when a new conversation is persisted and assigned an ID.

Schema:
\`\`\`json
{
  "conversation_id": "uuid",
  "title": "conversation title"
}
\`\`\`

---

\`conversation_updated\`

Fires when a conversation is updated.

Schema:
\`\`\`json
{
  "conversation_id": "uuid",
  "title": "updated conversation title"
}
\`\`\`

---

\`reasoning\`

Handles reasoning-related data.

Schema:
\`\`\`json
{
  "reasoning": "plain text reasoning content",
  "transient": false
}
\`\`\`

---

\`tool_call\`

Triggers when a tool is invoked.

Schema:
\`\`\`json
{
  "tool_call_id": "uuid",
  "tool_id": "tool_name",
  "params": {}
}
\`\`\`

---

\`tool_progress\`

Reports progress of a running tool.

Schema:
\`\`\`json
{
  "tool_call_id": "uuid",
  "message": "progress message"
}
\`\`\`

---

\`tool_result\`

Returns results from a completed tool call.

Schema:
\`\`\`json
{
  "tool_call_id": "uuid",
  "tool_id": "tool_name",
  "results": []
}
\`\`\`

**Note:** \`results\` is an array of \`ToolResult\` objects.

---

\`message_chunk\`

Streams partial text chunks.

Schema:
\`\`\`json
{
  "message_id": "uuid",
  "text_chunk": "partial text"
}
\`\`\`

---

\`message_complete\`

Indicates message stream is finished.

Schema:
\`\`\`json
{
  "message_id": "uuid",
  "message_content": "full text content of the message"
}
\`\`\`

---

\`thinking_complete\`

Marks the end of the thinking/reasoning phase.

Schema:
\`\`\`json
{
  "time_to_first_token": 0
}
\`\`\`

**Note:** \`time_to_first_token\` is in milliseconds.

---

\`round_complete\`

Marks end of one conversation round.

Schema:
\`\`\`json
{
  "round": {}
}
\`\`\`

**Note:** \`round\` contains the full round json object.

---

## Event flow

A typical conversation round emits events in this sequence:

1. \`reasoning\` (potentially multiple, some transient)
2. \`tool_call\` (if tools are used)
3. \`tool_progress\` (zero or more progress updates)
4. \`tool_result\` (when tool completes)
5. \`thinking_complete\`
6. \`message_chunk\` (multiple, as text streams)
7. \`message_complete\`
8. \`round_complete\`<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['POST'],
  patterns: ['/api/agent_builder/converse/async'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'agent_id',
      'attachments',
      'browser_api_tools',
      'capabilities',
      'connector_id',
      'conversation_id',
      'input',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_agent_builder_converse_async_request, 'body'),
    getZodLooseObjectFromProperty(post_agent_builder_converse_async_request, 'path'),
    getZodLooseObjectFromProperty(post_agent_builder_converse_async_request, 'query'),
  ]),
  outputSchema: post_agent_builder_converse_async_response,
};
const POST_AGENT_BUILDER_MCP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_mcp',
  connectorGroup: 'internal',
  summary: `MCP server`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/mcp</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: This endpoint is designed for MCP clients (Claude Desktop, Cursor, VS Code, etc.) and should not be used directly via REST APIs. Use MCP Inspector or native MCP clients instead.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['POST'],
  patterns: ['/api/agent_builder/mcp'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_agent_builder_mcp_request, 'body'),
    getZodLooseObjectFromProperty(post_agent_builder_mcp_request, 'path'),
    getZodLooseObjectFromProperty(post_agent_builder_mcp_request, 'query'),
  ]),
  outputSchema: post_agent_builder_mcp_response,
};
const GET_AGENT_BUILDER_TOOLS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_tools',
  connectorGroup: 'internal',
  summary: `List tools`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List all available tools. Use this endpoint to retrieve complete tool definitions including their schemas and configuration requirements.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['GET'],
  patterns: ['/api/agent_builder/tools'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_agent_builder_tools_request, 'body'),
    getZodLooseObjectFromProperty(get_agent_builder_tools_request, 'path'),
    getZodLooseObjectFromProperty(get_agent_builder_tools_request, 'query'),
  ]),
  outputSchema: get_agent_builder_tools_response,
};
const POST_AGENT_BUILDER_TOOLS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_tools',
  connectorGroup: 'internal',
  summary: `Create a tool`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new tool. Use this endpoint to define a custom tool with specific functionality and configuration for use by agents.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['POST'],
  patterns: ['/api/agent_builder/tools'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['configuration', 'description', 'id', 'tags', 'type'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_agent_builder_tools_request, 'body'),
    getZodLooseObjectFromProperty(post_agent_builder_tools_request, 'path'),
    getZodLooseObjectFromProperty(post_agent_builder_tools_request, 'query'),
  ]),
  outputSchema: post_agent_builder_tools_response,
};
const POST_AGENT_BUILDER_TOOLS_EXECUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_tools_execute',
  connectorGroup: 'internal',
  summary: `Execute a Tool`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools/_execute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Execute a tool with parameters. Use this endpoint to run a tool directly with specified inputs and optional external connector integration.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['POST'],
  patterns: ['/api/agent_builder/tools/_execute'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['connector_id', 'tool_id', 'tool_params'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_agent_builder_tools_execute_request, 'body'),
    getZodLooseObjectFromProperty(post_agent_builder_tools_execute_request, 'path'),
    getZodLooseObjectFromProperty(post_agent_builder_tools_execute_request, 'query'),
  ]),
  outputSchema: post_agent_builder_tools_execute_response,
};
const DELETE_AGENT_BUILDER_TOOLS_TOOLID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_agent_builder_tools_toolid',
  connectorGroup: 'internal',
  summary: `Delete a tool`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools/{toolId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a tool by ID. This action cannot be undone.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['DELETE'],
  patterns: ['/api/agent_builder/tools/{toolId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['toolId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_agent_builder_tools_toolid_request, 'body'),
    getZodLooseObjectFromProperty(delete_agent_builder_tools_toolid_request, 'path'),
    getZodLooseObjectFromProperty(delete_agent_builder_tools_toolid_request, 'query'),
  ]),
  outputSchema: delete_agent_builder_tools_toolid_response,
};
const GET_AGENT_BUILDER_TOOLS_TOOLID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_tools_toolid',
  connectorGroup: 'internal',
  summary: `Get a tool by id`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools/{toolId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a specific tool by ID. Use this endpoint to retrieve the complete tool definition including its schema and configuration requirements.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['GET'],
  patterns: ['/api/agent_builder/tools/{toolId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['toolId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_agent_builder_tools_toolid_request, 'body'),
    getZodLooseObjectFromProperty(get_agent_builder_tools_toolid_request, 'path'),
    getZodLooseObjectFromProperty(get_agent_builder_tools_toolid_request, 'query'),
  ]),
  outputSchema: get_agent_builder_tools_toolid_response,
};
const PUT_AGENT_BUILDER_TOOLS_TOOLID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_agent_builder_tools_toolid',
  connectorGroup: 'internal',
  summary: `Update a tool`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools/{toolId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing tool. Use this endpoint to modify any aspect of the tool's configuration or metadata.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['PUT'],
  patterns: ['/api/agent_builder/tools/{toolId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['toolId'],
    urlParams: [],
    bodyParams: ['configuration', 'description', 'tags'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_agent_builder_tools_toolid_request, 'body'),
    getZodLooseObjectFromProperty(put_agent_builder_tools_toolid_request, 'path'),
    getZodLooseObjectFromProperty(put_agent_builder_tools_toolid_request, 'query'),
  ]),
  outputSchema: put_agent_builder_tools_toolid_response,
};
const GETALERTINGHEALTH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getAlertingHealth',
  connectorGroup: 'internal',
  summary: `Get the alerting framework health`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/_health</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Management > Stack Rules** feature or for at least one of the **Analytics > Discover**, **Analytics > Machine Learning**, **Observability**, or **Security** features.
`,
  methods: ['GET'],
  patterns: ['/api/alerting/_health'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_alerting_health_request, 'body'),
    getZodLooseObjectFromProperty(get_alerting_health_request, 'path'),
    getZodLooseObjectFromProperty(get_alerting_health_request, 'query'),
  ]),
  outputSchema: get_alerting_health_response,
};
const GETRULETYPES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getRuleTypes',
  connectorGroup: 'internal',
  summary: `Get the rule types`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule_types</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

If you have \`read\` privileges for one or more Kibana features, the API response contains information about the appropriate rule types. For example, there are rule types associated with the **Management > Stack Rules** feature, **Analytics > Discover** and **Machine Learning** features, **Observability** features, and **Security** features. To get rule types associated with the **Stack Monitoring** feature, use the \`monitoring_user\` built-in role.
`,
  methods: ['GET'],
  patterns: ['/api/alerting/rule_types'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_rule_types_request, 'body'),
    getZodLooseObjectFromProperty(get_rule_types_request, 'path'),
    getZodLooseObjectFromProperty(get_rule_types_request, 'query'),
  ]),
  outputSchema: get_rule_types_response,
};
const DELETE_ALERTING_RULE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_alerting_rule_id',
  connectorGroup: 'internal',
  summary: `Delete a rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/alerting/rule/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_alerting_rule_id_request, 'body'),
    getZodLooseObjectFromProperty(delete_alerting_rule_id_request, 'path'),
    getZodLooseObjectFromProperty(delete_alerting_rule_id_request, 'query'),
  ]),
  outputSchema: delete_alerting_rule_id_response,
};
const GET_ALERTING_RULE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_alerting_rule_id',
  connectorGroup: 'internal',
  summary: `Get rule details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/alerting/rule/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_alerting_rule_id_request, 'body'),
    getZodLooseObjectFromProperty(get_alerting_rule_id_request, 'path'),
    getZodLooseObjectFromProperty(get_alerting_rule_id_request, 'query'),
  ]),
  outputSchema: get_alerting_rule_id_response,
};
const POST_ALERTING_RULE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id',
  connectorGroup: 'internal',
  summary: `Create a rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [
      'actions',
      'alert_delay',
      'artifacts',
      'consumer',
      'enabled',
      'flapping',
      'name',
      'notify_when',
      'rule_type_id',
      'schedule',
      'tags',
      'throttle',
      'params',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_alerting_rule_id_request, 'body'),
    getZodLooseObjectFromProperty(post_alerting_rule_id_request, 'path'),
    getZodLooseObjectFromProperty(post_alerting_rule_id_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_id_response,
};
const PUT_ALERTING_RULE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_alerting_rule_id',
  connectorGroup: 'internal',
  summary: `Update a rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['PUT'],
  patterns: ['/api/alerting/rule/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [
      'actions',
      'alert_delay',
      'artifacts',
      'flapping',
      'name',
      'notify_when',
      'params',
      'schedule',
      'tags',
      'throttle',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_alerting_rule_id_request, 'body'),
    getZodLooseObjectFromProperty(put_alerting_rule_id_request, 'path'),
    getZodLooseObjectFromProperty(put_alerting_rule_id_request, 'query'),
  ]),
  outputSchema: put_alerting_rule_id_response,
};
const POST_ALERTING_RULE_ID_DISABLE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_disable',
  connectorGroup: 'internal',
  summary: `Disable a rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/_disable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{id}/_disable'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['untrack'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_alerting_rule_id_disable_request, 'body'),
    getZodLooseObjectFromProperty(post_alerting_rule_id_disable_request, 'path'),
    getZodLooseObjectFromProperty(post_alerting_rule_id_disable_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_id_disable_response,
};
const POST_ALERTING_RULE_ID_ENABLE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_enable',
  connectorGroup: 'internal',
  summary: `Enable a rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/_enable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{id}/_enable'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_alerting_rule_id_enable_request, 'body'),
    getZodLooseObjectFromProperty(post_alerting_rule_id_enable_request, 'path'),
    getZodLooseObjectFromProperty(post_alerting_rule_id_enable_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_id_enable_response,
};
const POST_ALERTING_RULE_ID_MUTE_ALL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_mute_all',
  connectorGroup: 'internal',
  summary: `Mute all alerts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/_mute_all</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{id}/_mute_all'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_alerting_rule_id_mute_all_request, 'body'),
    getZodLooseObjectFromProperty(post_alerting_rule_id_mute_all_request, 'path'),
    getZodLooseObjectFromProperty(post_alerting_rule_id_mute_all_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_id_mute_all_response,
};
const POST_ALERTING_RULE_ID_UNMUTE_ALL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_unmute_all',
  connectorGroup: 'internal',
  summary: `Unmute all alerts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/_unmute_all</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{id}/_unmute_all'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_alerting_rule_id_unmute_all_request, 'body'),
    getZodLooseObjectFromProperty(post_alerting_rule_id_unmute_all_request, 'path'),
    getZodLooseObjectFromProperty(post_alerting_rule_id_unmute_all_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_id_unmute_all_response,
};
const POST_ALERTING_RULE_ID_UPDATE_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_update_api_key',
  connectorGroup: 'internal',
  summary: `Update the API key for a rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/_update_api_key</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{id}/_update_api_key'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_alerting_rule_id_update_api_key_request, 'body'),
    getZodLooseObjectFromProperty(post_alerting_rule_id_update_api_key_request, 'path'),
    getZodLooseObjectFromProperty(post_alerting_rule_id_update_api_key_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_id_update_api_key_response,
};
const POST_ALERTING_RULE_ID_SNOOZE_SCHEDULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_snooze_schedule',
  connectorGroup: 'internal',
  summary: `Schedule a snooze for the rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/snooze_schedule</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

When you snooze a rule, the rule checks continue to run but alerts will not generate actions. You can snooze for a specified period of time and schedule single or recurring downtimes.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{id}/snooze_schedule'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['schedule'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_alerting_rule_id_snooze_schedule_request, 'body'),
    getZodLooseObjectFromProperty(post_alerting_rule_id_snooze_schedule_request, 'path'),
    getZodLooseObjectFromProperty(post_alerting_rule_id_snooze_schedule_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_id_snooze_schedule_response,
};
const POST_ALERTING_RULE_RULE_ID_ALERT_ALERT_ID_MUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_rule_id_alert_alert_id_mute',
  connectorGroup: 'internal',
  summary: `Mute an alert`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{rule_id}/alert/{alert_id}/_mute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{rule_id}/alert/{alert_id}/_mute'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['rule_id', 'alert_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_alerting_rule_rule_id_alert_alert_id_mute_request, 'body'),
    getZodLooseObjectFromProperty(post_alerting_rule_rule_id_alert_alert_id_mute_request, 'path'),
    getZodLooseObjectFromProperty(post_alerting_rule_rule_id_alert_alert_id_mute_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_rule_id_alert_alert_id_mute_response,
};
const POST_ALERTING_RULE_RULE_ID_ALERT_ALERT_ID_UNMUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_rule_id_alert_alert_id_unmute',
  connectorGroup: 'internal',
  summary: `Unmute an alert`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{rule_id}/alert/{alert_id}/_unmute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{rule_id}/alert/{alert_id}/_unmute'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['rule_id', 'alert_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_alerting_rule_rule_id_alert_alert_id_unmute_request, 'body'),
    getZodLooseObjectFromProperty(post_alerting_rule_rule_id_alert_alert_id_unmute_request, 'path'),
    getZodLooseObjectFromProperty(
      post_alerting_rule_rule_id_alert_alert_id_unmute_request,
      'query'
    ),
  ]),
  outputSchema: post_alerting_rule_rule_id_alert_alert_id_unmute_response,
};
const DELETE_ALERTING_RULE_RULEID_SNOOZE_SCHEDULE_SCHEDULEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_alerting_rule_ruleid_snooze_schedule_scheduleid',
  connectorGroup: 'internal',
  summary: `Delete a snooze schedule for a rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{ruleId}/snooze_schedule/{scheduleId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/alerting/rule/{ruleId}/snooze_schedule/{scheduleId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['ruleId', 'scheduleId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(
      delete_alerting_rule_ruleid_snooze_schedule_scheduleid_request,
      'body'
    ),
    getZodLooseObjectFromProperty(
      delete_alerting_rule_ruleid_snooze_schedule_scheduleid_request,
      'path'
    ),
    getZodLooseObjectFromProperty(
      delete_alerting_rule_ruleid_snooze_schedule_scheduleid_request,
      'query'
    ),
  ]),
  outputSchema: delete_alerting_rule_ruleid_snooze_schedule_scheduleid_response,
};
const GET_ALERTING_RULES_FIND_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_alerting_rules_find',
  connectorGroup: 'internal',
  summary: `Get information about rules`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rules/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/alerting/rules/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'per_page',
      'page',
      'search',
      'default_search_operator',
      'search_fields',
      'sort_field',
      'sort_order',
      'has_reference',
      'fields',
      'filter',
      'filter_consumers',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_alerting_rules_find_request, 'body'),
    getZodLooseObjectFromProperty(get_alerting_rules_find_request, 'path'),
    getZodLooseObjectFromProperty(get_alerting_rules_find_request, 'query'),
  ]),
  outputSchema: get_alerting_rules_find_response,
};
const CREATEAGENTKEY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createAgentKey',
  connectorGroup: 'internal',
  summary: `Create an APM agent key`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/agent_keys</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new agent key for APM.
The user creating an APM agent API key must have at least the \`manage_own_api_key\` cluster privilege and the APM application-level privileges that it wishes to grant.
After it is created, you can copy the API key (Base64 encoded) and use it to to authorize requests from APM agents to the APM Server.
`,
  methods: ['POST'],
  patterns: ['/api/apm/agent_keys'],
  documentation: null,
  parameterTypes: {
    headerParams: ['elastic-api-version', 'kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['name', 'privileges'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_agent_key_request, 'body'),
    getZodLooseObjectFromProperty(create_agent_key_request, 'path'),
    getZodLooseObjectFromProperty(create_agent_key_request, 'query'),
  ]),
  outputSchema: create_agent_key_response,
};
const SAVEAPMSERVERSCHEMA_CONTRACT: InternalConnectorContract = {
  type: 'kibana.saveApmServerSchema',
  connectorGroup: 'internal',
  summary: `Save APM server schema`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/fleet/apm_server_schema</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/apm/fleet/apm_server_schema'],
  documentation: null,
  parameterTypes: {
    headerParams: ['elastic-api-version', 'kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['schema'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(save_apm_server_schema_request, 'body'),
    getZodLooseObjectFromProperty(save_apm_server_schema_request, 'path'),
    getZodLooseObjectFromProperty(save_apm_server_schema_request, 'query'),
  ]),
  outputSchema: save_apm_server_schema_response,
};
const CREATEANNOTATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createAnnotation',
  connectorGroup: 'internal',
  summary: `Create a service annotation`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/services/{serviceName}/annotation</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new annotation for a specific service.`,
  methods: ['POST'],
  patterns: ['/api/apm/services/{serviceName}/annotation'],
  documentation: null,
  parameterTypes: {
    headerParams: ['elastic-api-version', 'kbn-xsrf'],
    pathParams: ['serviceName'],
    urlParams: [],
    bodyParams: ['@timestamp', 'message', 'service', 'tags'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_annotation_request, 'body'),
    getZodLooseObjectFromProperty(create_annotation_request, 'path'),
    getZodLooseObjectFromProperty(create_annotation_request, 'query'),
  ]),
  outputSchema: create_annotation_response,
};
const GETANNOTATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getAnnotation',
  connectorGroup: 'internal',
  summary: `Search for annotations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/services/{serviceName}/annotation/search</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Search for annotations related to a specific service.`,
  methods: ['GET'],
  patterns: ['/api/apm/services/{serviceName}/annotation/search'],
  documentation: null,
  parameterTypes: {
    headerParams: ['elastic-api-version'],
    pathParams: ['serviceName'],
    urlParams: ['environment', 'start', 'end'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_annotation_request, 'body'),
    getZodLooseObjectFromProperty(get_annotation_request, 'path'),
    getZodLooseObjectFromProperty(get_annotation_request, 'query'),
  ]),
  outputSchema: get_annotation_response,
};
const DELETEAGENTCONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteAgentConfiguration',
  connectorGroup: 'internal',
  summary: `Delete agent configuration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/apm/settings/agent-configuration'],
  documentation: null,
  parameterTypes: {
    headerParams: ['elastic-api-version', 'kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['service'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_agent_configuration_request, 'body'),
    getZodLooseObjectFromProperty(delete_agent_configuration_request, 'path'),
    getZodLooseObjectFromProperty(delete_agent_configuration_request, 'query'),
  ]),
  outputSchema: delete_agent_configuration_response,
};
const GETAGENTCONFIGURATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getAgentConfigurations',
  connectorGroup: 'internal',
  summary: `Get a list of agent configurations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/apm/settings/agent-configuration'],
  documentation: null,
  parameterTypes: {
    headerParams: ['elastic-api-version'],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_agent_configurations_request, 'body'),
    getZodLooseObjectFromProperty(get_agent_configurations_request, 'path'),
    getZodLooseObjectFromProperty(get_agent_configurations_request, 'query'),
  ]),
  outputSchema: get_agent_configurations_response,
};
const CREATEUPDATEAGENTCONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createUpdateAgentConfiguration',
  connectorGroup: 'internal',
  summary: `Create or update agent configuration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['PUT'],
  patterns: ['/api/apm/settings/agent-configuration'],
  documentation: null,
  parameterTypes: {
    headerParams: ['elastic-api-version', 'kbn-xsrf'],
    pathParams: [],
    urlParams: ['overwrite'],
    bodyParams: ['agent_name', 'service', 'settings'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_update_agent_configuration_request, 'body'),
    getZodLooseObjectFromProperty(create_update_agent_configuration_request, 'path'),
    getZodLooseObjectFromProperty(create_update_agent_configuration_request, 'query'),
  ]),
  outputSchema: create_update_agent_configuration_response,
};
const GETAGENTNAMEFORSERVICE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getAgentNameForService',
  connectorGroup: 'internal',
  summary: `Get agent name for service`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration/agent_name</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve \`agentName\` for a service.`,
  methods: ['GET'],
  patterns: ['/api/apm/settings/agent-configuration/agent_name'],
  documentation: null,
  parameterTypes: {
    headerParams: ['elastic-api-version'],
    pathParams: [],
    urlParams: ['serviceName'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_agent_name_for_service_request, 'body'),
    getZodLooseObjectFromProperty(get_agent_name_for_service_request, 'path'),
    getZodLooseObjectFromProperty(get_agent_name_for_service_request, 'query'),
  ]),
  outputSchema: get_agent_name_for_service_response,
};
const GETENVIRONMENTSFORSERVICE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getEnvironmentsForService',
  connectorGroup: 'internal',
  summary: `Get environments for service`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration/environments</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/apm/settings/agent-configuration/environments'],
  documentation: null,
  parameterTypes: {
    headerParams: ['elastic-api-version'],
    pathParams: [],
    urlParams: ['serviceName'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_environments_for_service_request, 'body'),
    getZodLooseObjectFromProperty(get_environments_for_service_request, 'path'),
    getZodLooseObjectFromProperty(get_environments_for_service_request, 'query'),
  ]),
  outputSchema: get_environments_for_service_response,
};
const SEARCHSINGLECONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.searchSingleConfiguration',
  connectorGroup: 'internal',
  summary: `Lookup single agent configuration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration/search</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

This endpoint enables you to search for a single agent configuration and update the 'applied_by_agent' field.
`,
  methods: ['POST'],
  patterns: ['/api/apm/settings/agent-configuration/search'],
  documentation: null,
  parameterTypes: {
    headerParams: ['elastic-api-version', 'kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['etag', 'mark_as_applied_by_agent', 'service'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(search_single_configuration_request, 'body'),
    getZodLooseObjectFromProperty(search_single_configuration_request, 'path'),
    getZodLooseObjectFromProperty(search_single_configuration_request, 'query'),
  ]),
  outputSchema: search_single_configuration_response,
};
const GETSINGLEAGENTCONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getSingleAgentConfiguration',
  connectorGroup: 'internal',
  summary: `Get single agent configuration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration/view</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/apm/settings/agent-configuration/view'],
  documentation: null,
  parameterTypes: {
    headerParams: ['elastic-api-version'],
    pathParams: [],
    urlParams: ['name', 'environment'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_single_agent_configuration_request, 'body'),
    getZodLooseObjectFromProperty(get_single_agent_configuration_request, 'path'),
    getZodLooseObjectFromProperty(get_single_agent_configuration_request, 'query'),
  ]),
  outputSchema: get_single_agent_configuration_response,
};
const GETSOURCEMAPS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getSourceMaps',
  connectorGroup: 'internal',
  summary: `Get source maps`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/sourcemaps</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get an array of Fleet artifacts, including source map uploads. You must have \`read\` or \`all\` Kibana privileges for the APM and User Experience feature.
`,
  methods: ['GET'],
  patterns: ['/api/apm/sourcemaps'],
  documentation: null,
  parameterTypes: {
    headerParams: ['elastic-api-version'],
    pathParams: [],
    urlParams: ['page', 'perPage'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_source_maps_request, 'body'),
    getZodLooseObjectFromProperty(get_source_maps_request, 'path'),
    getZodLooseObjectFromProperty(get_source_maps_request, 'query'),
  ]),
  outputSchema: get_source_maps_response,
};
const UPLOADSOURCEMAP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.uploadSourceMap',
  connectorGroup: 'internal',
  summary: `Upload a source map`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/sourcemaps</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upload a source map for a specific service and version. You must have \`all\` Kibana privileges for the APM and User Experience feature.
The maximum payload size is \`1mb\`. If you attempt to upload a source map that exceeds the maximum payload size, you will get a 413 error. Before uploading source maps that exceed this default, change the maximum payload size allowed by Kibana with the \`server.maxPayload\` variable.
`,
  methods: ['POST'],
  patterns: ['/api/apm/sourcemaps'],
  documentation: null,
  parameterTypes: {
    headerParams: ['elastic-api-version', 'kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(upload_source_map_request, 'body'),
    getZodLooseObjectFromProperty(upload_source_map_request, 'path'),
    getZodLooseObjectFromProperty(upload_source_map_request, 'query'),
  ]),
  outputSchema: upload_source_map_response,
};
const DELETESOURCEMAP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteSourceMap',
  connectorGroup: 'internal',
  summary: `Delete source map`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/sourcemaps/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a previously uploaded source map. You must have \`all\` Kibana privileges for the APM and User Experience feature.
`,
  methods: ['DELETE'],
  patterns: ['/api/apm/sourcemaps/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['elastic-api-version', 'kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_source_map_request, 'body'),
    getZodLooseObjectFromProperty(delete_source_map_request, 'path'),
    getZodLooseObjectFromProperty(delete_source_map_request, 'query'),
  ]),
  outputSchema: delete_source_map_response,
};
const DELETEASSETCRITICALITYRECORD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteAssetCriticalityRecord',
  connectorGroup: 'internal',
  summary: `Delete an asset criticality record`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete the asset criticality record for a specific entity.`,
  methods: ['DELETE'],
  patterns: ['/api/asset_criticality'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id_value', 'id_field', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_asset_criticality_record_request, 'body'),
    getZodLooseObjectFromProperty(delete_asset_criticality_record_request, 'path'),
    getZodLooseObjectFromProperty(delete_asset_criticality_record_request, 'query'),
  ]),
  outputSchema: delete_asset_criticality_record_response,
};
const GETASSETCRITICALITYRECORD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetAssetCriticalityRecord',
  connectorGroup: 'internal',
  summary: `Get an asset criticality record`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the asset criticality record for a specific entity.`,
  methods: ['GET'],
  patterns: ['/api/asset_criticality'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id_value', 'id_field'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_asset_criticality_record_request, 'body'),
    getZodLooseObjectFromProperty(get_asset_criticality_record_request, 'path'),
    getZodLooseObjectFromProperty(get_asset_criticality_record_request, 'query'),
  ]),
  outputSchema: get_asset_criticality_record_response,
};
const CREATEASSETCRITICALITYRECORD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateAssetCriticalityRecord',
  connectorGroup: 'internal',
  summary: `Upsert an asset criticality record`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create or update an asset criticality record for a specific entity.

If a record already exists for the specified entity, that record is overwritten with the specified value. If a record doesn't exist for the specified entity, a new record is created.
`,
  methods: ['POST'],
  patterns: ['/api/asset_criticality'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_asset_criticality_record_request, 'body'),
    getZodLooseObjectFromProperty(create_asset_criticality_record_request, 'path'),
    getZodLooseObjectFromProperty(create_asset_criticality_record_request, 'query'),
  ]),
  outputSchema: create_asset_criticality_record_response,
};
const BULKUPSERTASSETCRITICALITYRECORDS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.BulkUpsertAssetCriticalityRecords',
  connectorGroup: 'internal',
  summary: `Bulk upsert asset criticality records`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality/bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Bulk upsert up to 1000 asset criticality records.

If asset criticality records already exist for the specified entities, those records are overwritten with the specified values. If asset criticality records don't exist for the specified entities, new records are created.
`,
  methods: ['POST'],
  patterns: ['/api/asset_criticality/bulk'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['records'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(bulk_upsert_asset_criticality_records_request, 'body'),
    getZodLooseObjectFromProperty(bulk_upsert_asset_criticality_records_request, 'path'),
    getZodLooseObjectFromProperty(bulk_upsert_asset_criticality_records_request, 'query'),
  ]),
  outputSchema: bulk_upsert_asset_criticality_records_response,
};
const FINDASSETCRITICALITYRECORDS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindAssetCriticalityRecords',
  connectorGroup: 'internal',
  summary: `List asset criticality records`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality/list</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List asset criticality records, paging, sorting and filtering as needed.`,
  methods: ['GET'],
  patterns: ['/api/asset_criticality/list'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['sort_field', 'sort_direction', 'page', 'per_page', 'kuery'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_asset_criticality_records_request, 'body'),
    getZodLooseObjectFromProperty(find_asset_criticality_records_request, 'path'),
    getZodLooseObjectFromProperty(find_asset_criticality_records_request, 'query'),
  ]),
  outputSchema: find_asset_criticality_records_response,
};
const POSTATTACKDISCOVERYBULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PostAttackDiscoveryBulk',
  connectorGroup: 'internal',
  summary: `Bulk update Attack discoveries`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/_bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Performs bulk updates on multiple Attack discoveries, including workflow status changes and visibility settings. This endpoint allows efficient batch processing of alert modifications without requiring individual API calls for each alert. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/_bulk'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['update'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_attack_discovery_bulk_request, 'body'),
    getZodLooseObjectFromProperty(post_attack_discovery_bulk_request, 'path'),
    getZodLooseObjectFromProperty(post_attack_discovery_bulk_request, 'query'),
  ]),
  outputSchema: post_attack_discovery_bulk_response,
};
const ATTACKDISCOVERYFIND_CONTRACT: InternalConnectorContract = {
  type: 'kibana.AttackDiscoveryFind',
  connectorGroup: 'internal',
  summary: `Find Attack discoveries that match the search criteria`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Find Attack discoveries that match the search criteria. Supports free text search, filtering, pagination, and sorting. \`Technical preview\``,
  methods: ['GET'],
  patterns: ['/api/attack_discovery/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'alert_ids',
      'connector_names',
      'enable_field_rendering',
      'end',
      'ids',
      'include_unique_alert_ids',
      'page',
      'per_page',
      'search',
      'shared',
      'sort_field',
      'sort_order',
      'start',
      'status',
      'with_replacements',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(attack_discovery_find_request, 'body'),
    getZodLooseObjectFromProperty(attack_discovery_find_request, 'path'),
    getZodLooseObjectFromProperty(attack_discovery_find_request, 'query'),
  ]),
  outputSchema: attack_discovery_find_response,
};
const POSTATTACKDISCOVERYGENERATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PostAttackDiscoveryGenerate',
  connectorGroup: 'internal',
  summary: `Generate attack discoveries from alerts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/_generate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Initiates the generation of attack discoveries by analyzing security alerts using AI. Returns an execution UUID that can be used to track the generation progress and retrieve results. Results may also be retrieved via the find endpoint. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/_generate'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'alertsIndexPattern',
      'anonymizationFields',
      'apiConfig',
      'connectorName',
      'end',
      'filter',
      'model',
      'replacements',
      'size',
      'start',
      'subAction',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_attack_discovery_generate_request, 'body'),
    getZodLooseObjectFromProperty(post_attack_discovery_generate_request, 'path'),
    getZodLooseObjectFromProperty(post_attack_discovery_generate_request, 'query'),
  ]),
  outputSchema: post_attack_discovery_generate_response,
};
const GETATTACKDISCOVERYGENERATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetAttackDiscoveryGenerations',
  connectorGroup: 'internal',
  summary: `Get the latest attack discovery generations metadata for the current user`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/generations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the latest attack discovery generations metadata (that are not dismissed) for the current user. This endpoint retrieves generation metadata including execution status and statistics for Attack discovery generations. \`Technical preview\``,
  methods: ['GET'],
  patterns: ['/api/attack_discovery/generations'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['end', 'size', 'start'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_attack_discovery_generations_request, 'body'),
    getZodLooseObjectFromProperty(get_attack_discovery_generations_request, 'path'),
    getZodLooseObjectFromProperty(get_attack_discovery_generations_request, 'query'),
  ]),
  outputSchema: get_attack_discovery_generations_response,
};
const GETATTACKDISCOVERYGENERATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetAttackDiscoveryGeneration',
  connectorGroup: 'internal',
  summary: `Get a single Attack discovery generation, including its discoveries and (optional) generation metadata`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/generations/{execution_uuid}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Returns a specific Attack discovery generation, including all generated Attack discoveries and associated metadata, including execution status and statistics. \`Technical preview\``,
  methods: ['GET'],
  patterns: ['/api/attack_discovery/generations/{execution_uuid}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['execution_uuid'],
    urlParams: ['enable_field_rendering', 'with_replacements'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_attack_discovery_generation_request, 'body'),
    getZodLooseObjectFromProperty(get_attack_discovery_generation_request, 'path'),
    getZodLooseObjectFromProperty(get_attack_discovery_generation_request, 'query'),
  ]),
  outputSchema: get_attack_discovery_generation_response,
};
const POSTATTACKDISCOVERYGENERATIONSDISMISS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PostAttackDiscoveryGenerationsDismiss',
  connectorGroup: 'internal',
  summary: `Dismiss an attack discovery generation`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/generations/{execution_uuid}/_dismiss</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Dismisses an attack discovery generation for the current user, indicating that it's status should not be reported in the UI. This sets the generation's status to "dismissed" and affects how the generation appears in subsequent queries. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/generations/{execution_uuid}/_dismiss'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['execution_uuid'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_attack_discovery_generations_dismiss_request, 'body'),
    getZodLooseObjectFromProperty(post_attack_discovery_generations_dismiss_request, 'path'),
    getZodLooseObjectFromProperty(post_attack_discovery_generations_dismiss_request, 'query'),
  ]),
  outputSchema: post_attack_discovery_generations_dismiss_response,
};
const CREATEATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateAttackDiscoverySchedules',
  connectorGroup: 'internal',
  summary: `Create Attack discovery schedule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Creates a new Attack discovery schedule that analyzes security alerts at specified intervals. The schedule defines when and how Attack discovery analysis should run, including which alerts to analyze, which AI connector to use, and what actions to take when discoveries are found. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/schedules'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['actions', 'enabled', 'name', 'params', 'schedule'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_attack_discovery_schedules_request, 'body'),
    getZodLooseObjectFromProperty(create_attack_discovery_schedules_request, 'path'),
    getZodLooseObjectFromProperty(create_attack_discovery_schedules_request, 'query'),
  ]),
  outputSchema: create_attack_discovery_schedules_response,
};
const FINDATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindAttackDiscoverySchedules',
  connectorGroup: 'internal',
  summary: `Finds Attack discovery schedules that match the search criteria`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Finds Attack discovery schedules that match the search criteria. Supports pagination and sorting by various fields. \`Technical preview\``,
  methods: ['GET'],
  patterns: ['/api/attack_discovery/schedules/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['page', 'per_page', 'sort_field', 'sort_direction'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_attack_discovery_schedules_request, 'body'),
    getZodLooseObjectFromProperty(find_attack_discovery_schedules_request, 'path'),
    getZodLooseObjectFromProperty(find_attack_discovery_schedules_request, 'query'),
  ]),
  outputSchema: find_attack_discovery_schedules_response,
};
const DELETEATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteAttackDiscoverySchedules',
  connectorGroup: 'internal',
  summary: `Delete Attack discovery schedule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Permanently deletes an Attack discovery schedule and all associated configuration. \`Technical preview\``,
  methods: ['DELETE'],
  patterns: ['/api/attack_discovery/schedules/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_attack_discovery_schedules_request, 'body'),
    getZodLooseObjectFromProperty(delete_attack_discovery_schedules_request, 'path'),
    getZodLooseObjectFromProperty(delete_attack_discovery_schedules_request, 'query'),
  ]),
  outputSchema: delete_attack_discovery_schedules_response,
};
const GETATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetAttackDiscoverySchedules',
  connectorGroup: 'internal',
  summary: `Get Attack discovery schedule by ID`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieves a specific Attack discovery schedule by its unique identifier. Returns complete schedule configuration including parameters, interval settings, associated actions, and execution history. \`Technical preview\``,
  methods: ['GET'],
  patterns: ['/api/attack_discovery/schedules/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_attack_discovery_schedules_request, 'body'),
    getZodLooseObjectFromProperty(get_attack_discovery_schedules_request, 'path'),
    getZodLooseObjectFromProperty(get_attack_discovery_schedules_request, 'query'),
  ]),
  outputSchema: get_attack_discovery_schedules_response,
};
const UPDATEATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateAttackDiscoverySchedules',
  connectorGroup: 'internal',
  summary: `Update Attack discovery schedule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Updates an existing Attack discovery schedule with new configuration. All schedule properties can be modified including name, parameters, interval, and actions. The update operation replaces the entire schedule configuration with the provided values. \`Technical preview\``,
  methods: ['PUT'],
  patterns: ['/api/attack_discovery/schedules/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['actions', 'name', 'params', 'schedule'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_attack_discovery_schedules_request, 'body'),
    getZodLooseObjectFromProperty(update_attack_discovery_schedules_request, 'path'),
    getZodLooseObjectFromProperty(update_attack_discovery_schedules_request, 'query'),
  ]),
  outputSchema: update_attack_discovery_schedules_response,
};
const DISABLEATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DisableAttackDiscoverySchedules',
  connectorGroup: 'internal',
  summary: `Disable Attack discovery schedule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}/_disable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Disables an Attack discovery schedule, preventing it from running according to its configured interval. The schedule configuration is preserved and can be re-enabled later. Any currently running executions will complete, but no new executions will be started. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/schedules/{id}/_disable'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(disable_attack_discovery_schedules_request, 'body'),
    getZodLooseObjectFromProperty(disable_attack_discovery_schedules_request, 'path'),
    getZodLooseObjectFromProperty(disable_attack_discovery_schedules_request, 'query'),
  ]),
  outputSchema: disable_attack_discovery_schedules_response,
};
const ENABLEATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EnableAttackDiscoverySchedules',
  connectorGroup: 'internal',
  summary: `Enable Attack discovery schedule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}/_enable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Enables a previously disabled Attack discovery schedule, allowing it to run according to its configured interval. Once enabled, the schedule will begin executing at the next scheduled time based on its interval configuration. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/schedules/{id}/_enable'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(enable_attack_discovery_schedules_request, 'body'),
    getZodLooseObjectFromProperty(enable_attack_discovery_schedules_request, 'path'),
    getZodLooseObjectFromProperty(enable_attack_discovery_schedules_request, 'query'),
  ]),
  outputSchema: enable_attack_discovery_schedules_response,
};
const DELETECASEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteCaseDefaultSpace',
  connectorGroup: 'internal',
  summary: `Delete cases`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` or \`all\` privileges and the \`delete\` sub-feature privilege for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're deleting.
`,
  methods: ['DELETE'],
  patterns: ['/api/cases'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['ids'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_case_default_space_request, 'body'),
    getZodLooseObjectFromProperty(delete_case_default_space_request, 'path'),
    getZodLooseObjectFromProperty(delete_case_default_space_request, 'query'),
  ]),
  outputSchema: delete_case_default_space_response,
};
const UPDATECASEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateCaseDefaultSpace',
  connectorGroup: 'internal',
  summary: `Update cases`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the  **Management**, **Observability**, or **Security** section of the Kibana  feature privileges, depending on the owner of the case you're updating.
`,
  methods: ['PATCH'],
  patterns: ['/api/cases'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['cases'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_case_default_space_request, 'body'),
    getZodLooseObjectFromProperty(update_case_default_space_request, 'path'),
    getZodLooseObjectFromProperty(update_case_default_space_request, 'query'),
  ]),
  outputSchema: update_case_default_space_response,
};
const CREATECASEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createCaseDefaultSpace',
  connectorGroup: 'internal',
  summary: `Create a case`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana  feature privileges, depending on the owner of the case you're creating.
`,
  methods: ['POST'],
  patterns: ['/api/cases'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'assignees',
      'category',
      'connector',
      'customFields',
      'description',
      'owner',
      'settings',
      'severity',
      'tags',
      'title',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_case_default_space_request, 'body'),
    getZodLooseObjectFromProperty(create_case_default_space_request, 'path'),
    getZodLooseObjectFromProperty(create_case_default_space_request, 'query'),
  ]),
  outputSchema: create_case_default_space_response,
};
const FINDCASESDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findCasesDefaultSpace',
  connectorGroup: 'internal',
  summary: `Search cases`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'assignees',
      'category',
      'defaultSearchOperator',
      'from',
      'owner',
      'page',
      'perPage',
      'reporters',
      'search',
      'searchFields',
      'severity',
      'sortField',
      'sortOrder',
      'status',
      'tags',
      'to',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_cases_default_space_request, 'body'),
    getZodLooseObjectFromProperty(find_cases_default_space_request, 'path'),
    getZodLooseObjectFromProperty(find_cases_default_space_request, 'query'),
  ]),
  outputSchema: find_cases_default_space_response,
};
const GETCASEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseDefaultSpace',
  connectorGroup: 'internal',
  summary: `Get case information`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/{caseId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['caseId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_case_default_space_request, 'body'),
    getZodLooseObjectFromProperty(get_case_default_space_request, 'path'),
    getZodLooseObjectFromProperty(get_case_default_space_request, 'query'),
  ]),
  outputSchema: get_case_default_space_response,
};
const GETCASEALERTSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseAlertsDefaultSpace',
  connectorGroup: 'internal',
  summary: `Get all alerts for a case`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/alerts</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/{caseId}/alerts'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['caseId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_case_alerts_default_space_request, 'body'),
    getZodLooseObjectFromProperty(get_case_alerts_default_space_request, 'path'),
    getZodLooseObjectFromProperty(get_case_alerts_default_space_request, 'query'),
  ]),
  outputSchema: get_case_alerts_default_space_response,
};
const DELETECASECOMMENTSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteCaseCommentsDefaultSpace',
  connectorGroup: 'internal',
  summary: `Delete all case comments and alerts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Deletes all comments and alerts from a case. You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're deleting.
`,
  methods: ['DELETE'],
  patterns: ['/api/cases/{caseId}/comments'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['caseId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_case_comments_default_space_request, 'body'),
    getZodLooseObjectFromProperty(delete_case_comments_default_space_request, 'path'),
    getZodLooseObjectFromProperty(delete_case_comments_default_space_request, 'query'),
  ]),
  outputSchema: delete_case_comments_default_space_response,
};
const UPDATECASECOMMENTDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateCaseCommentDefaultSpace',
  connectorGroup: 'internal',
  summary: `Update a case comment or alert`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're updating. NOTE: You cannot change the comment type or the owner of a comment.
`,
  methods: ['PATCH'],
  patterns: ['/api/cases/{caseId}/comments'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['caseId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_case_comment_default_space_request, 'body'),
    getZodLooseObjectFromProperty(update_case_comment_default_space_request, 'path'),
    getZodLooseObjectFromProperty(update_case_comment_default_space_request, 'query'),
  ]),
  outputSchema: update_case_comment_default_space_response,
};
const ADDCASECOMMENTDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.addCaseCommentDefaultSpace',
  connectorGroup: 'internal',
  summary: `Add a case comment or alert`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're creating. NOTE: Each case can have a maximum of 1,000 alerts.
`,
  methods: ['POST'],
  patterns: ['/api/cases/{caseId}/comments'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['caseId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(add_case_comment_default_space_request, 'body'),
    getZodLooseObjectFromProperty(add_case_comment_default_space_request, 'path'),
    getZodLooseObjectFromProperty(add_case_comment_default_space_request, 'query'),
  ]),
  outputSchema: add_case_comment_default_space_response,
};
const FINDCASECOMMENTSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findCaseCommentsDefaultSpace',
  connectorGroup: 'internal',
  summary: `Find case comments and alerts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieves a paginated list of comments for a case. You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases with the comments you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/{caseId}/comments/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['caseId'],
    urlParams: ['page', 'perPage', 'sortOrder'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_case_comments_default_space_request, 'body'),
    getZodLooseObjectFromProperty(find_case_comments_default_space_request, 'path'),
    getZodLooseObjectFromProperty(find_case_comments_default_space_request, 'query'),
  ]),
  outputSchema: find_case_comments_default_space_response,
};
const DELETECASECOMMENTDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteCaseCommentDefaultSpace',
  connectorGroup: 'internal',
  summary: `Delete a case comment or alert`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments/{commentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're deleting.
`,
  methods: ['DELETE'],
  patterns: ['/api/cases/{caseId}/comments/{commentId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['caseId', 'commentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_case_comment_default_space_request, 'body'),
    getZodLooseObjectFromProperty(delete_case_comment_default_space_request, 'path'),
    getZodLooseObjectFromProperty(delete_case_comment_default_space_request, 'query'),
  ]),
  outputSchema: delete_case_comment_default_space_response,
};
const GETCASECOMMENTDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseCommentDefaultSpace',
  connectorGroup: 'internal',
  summary: `Get a case comment or alert`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments/{commentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases with the comments you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/{caseId}/comments/{commentId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['caseId', 'commentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_case_comment_default_space_request, 'body'),
    getZodLooseObjectFromProperty(get_case_comment_default_space_request, 'path'),
    getZodLooseObjectFromProperty(get_case_comment_default_space_request, 'query'),
  ]),
  outputSchema: get_case_comment_default_space_response,
};
const PUSHCASEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.pushCaseDefaultSpace',
  connectorGroup: 'internal',
  summary: `Push a case to an external service`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/connector/{connectorId}/_push</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Actions and Connectors** feature in the **Management** section of the Kibana feature privileges. You must also have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're pushing.
`,
  methods: ['POST'],
  patterns: ['/api/cases/{caseId}/connector/{connectorId}/_push'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['caseId', 'connectorId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(push_case_default_space_request, 'body'),
    getZodLooseObjectFromProperty(push_case_default_space_request, 'path'),
    getZodLooseObjectFromProperty(push_case_default_space_request, 'query'),
  ]),
  outputSchema: push_case_default_space_response,
};
const ADDCASEFILEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.addCaseFileDefaultSpace',
  connectorGroup: 'internal',
  summary: `Attach a file to a case`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/files</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Attach a file to a case. You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're updating. The request must include:
- The \`Content-Type: multipart/form-data\` HTTP header.
- The location of the file that is being uploaded.
`,
  methods: ['POST'],
  patterns: ['/api/cases/{caseId}/files'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['caseId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(add_case_file_default_space_request, 'body'),
    getZodLooseObjectFromProperty(add_case_file_default_space_request, 'path'),
    getZodLooseObjectFromProperty(add_case_file_default_space_request, 'query'),
  ]),
  outputSchema: add_case_file_default_space_response,
};
const FINDCASEACTIVITYDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findCaseActivityDefaultSpace',
  connectorGroup: 'internal',
  summary: `Find case activity`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/user_actions/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrives a paginated list of user activity for a case. You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/{caseId}/user_actions/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['caseId'],
    urlParams: ['page', 'perPage', 'sortOrder', 'types'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_case_activity_default_space_request, 'body'),
    getZodLooseObjectFromProperty(find_case_activity_default_space_request, 'path'),
    getZodLooseObjectFromProperty(find_case_activity_default_space_request, 'query'),
  ]),
  outputSchema: find_case_activity_default_space_response,
};
const GETCASESBYALERTDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCasesByAlertDefaultSpace',
  connectorGroup: 'internal',
  summary: `Get cases for an alert`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/alerts/{alertId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/alerts/{alertId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['alertId'],
    urlParams: ['owner'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_cases_by_alert_default_space_request, 'body'),
    getZodLooseObjectFromProperty(get_cases_by_alert_default_space_request, 'path'),
    getZodLooseObjectFromProperty(get_cases_by_alert_default_space_request, 'query'),
  ]),
  outputSchema: get_cases_by_alert_default_space_response,
};
const GETCASECONFIGURATIONDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseConfigurationDefaultSpace',
  connectorGroup: 'internal',
  summary: `Get case settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/configure</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get setting details such as the closure type, custom fields, templatse, and the default connector for cases. You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on where the cases were created.
`,
  methods: ['GET'],
  patterns: ['/api/cases/configure'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['owner'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_case_configuration_default_space_request, 'body'),
    getZodLooseObjectFromProperty(get_case_configuration_default_space_request, 'path'),
    getZodLooseObjectFromProperty(get_case_configuration_default_space_request, 'query'),
  ]),
  outputSchema: get_case_configuration_default_space_response,
};
const SETCASECONFIGURATIONDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.setCaseConfigurationDefaultSpace',
  connectorGroup: 'internal',
  summary: `Add case settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/configure</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Case settings include external connection details, custom fields, and templates. Connectors are used to interface with external systems. You must create a connector before you can use it in your cases. If you set a default connector, it is automatically selected when you create cases in Kibana. If you use the create case API, however, you must still specify all of the connector details. You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on where you are creating cases.
`,
  methods: ['POST'],
  patterns: ['/api/cases/configure'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['closure_type', 'connector', 'customFields', 'owner', 'templates'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(set_case_configuration_default_space_request, 'body'),
    getZodLooseObjectFromProperty(set_case_configuration_default_space_request, 'path'),
    getZodLooseObjectFromProperty(set_case_configuration_default_space_request, 'query'),
  ]),
  outputSchema: set_case_configuration_default_space_response,
};
const UPDATECASECONFIGURATIONDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateCaseConfigurationDefaultSpace',
  connectorGroup: 'internal',
  summary: `Update case settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/configure/{configurationId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Updates setting details such as the closure type, custom fields, templates, and the default connector for cases. Connectors are used to interface with external systems. You must create a connector before you can use it in your cases. You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on where the case was created.
`,
  methods: ['PATCH'],
  patterns: ['/api/cases/configure/{configurationId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['configurationId'],
    urlParams: [],
    bodyParams: ['closure_type', 'connector', 'customFields', 'templates', 'version'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_case_configuration_default_space_request, 'body'),
    getZodLooseObjectFromProperty(update_case_configuration_default_space_request, 'path'),
    getZodLooseObjectFromProperty(update_case_configuration_default_space_request, 'query'),
  ]),
  outputSchema: update_case_configuration_default_space_response,
};
const FINDCASECONNECTORSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findCaseConnectorsDefaultSpace',
  connectorGroup: 'internal',
  summary: `Get case connectors`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/configure/connectors/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get information about connectors that are supported for use in cases. You must have \`read\` privileges for the **Actions and Connectors** feature in the **Management** section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/api/cases/configure/connectors/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_case_connectors_default_space_request, 'body'),
    getZodLooseObjectFromProperty(find_case_connectors_default_space_request, 'path'),
    getZodLooseObjectFromProperty(find_case_connectors_default_space_request, 'query'),
  ]),
  outputSchema: find_case_connectors_default_space_response,
};
const GETCASEREPORTERSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseReportersDefaultSpace',
  connectorGroup: 'internal',
  summary: `Get case creators`,
  description: `Returns information about the users who opened cases. You must have read privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases. The API returns information about the users as they existed at the time of the case creation, including their name, full name, and email address. If any of those details change thereafter or if a user is deleted, the information returned by this API is unchanged.
`,
  methods: ['GET'],
  patterns: ['/api/cases/reporters'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['owner'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_case_reporters_default_space_request, 'body'),
    getZodLooseObjectFromProperty(get_case_reporters_default_space_request, 'path'),
    getZodLooseObjectFromProperty(get_case_reporters_default_space_request, 'query'),
  ]),
  outputSchema: get_case_reporters_default_space_response,
};
const GETCASETAGSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseTagsDefaultSpace',
  connectorGroup: 'internal',
  summary: `Get case tags`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/tags</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Aggregates and returns a list of case tags. You must have read privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/tags'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['owner'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_case_tags_default_space_request, 'body'),
    getZodLooseObjectFromProperty(get_case_tags_default_space_request, 'path'),
    getZodLooseObjectFromProperty(get_case_tags_default_space_request, 'query'),
  ]),
  outputSchema: get_case_tags_default_space_response,
};
const GETALLDATAVIEWSDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getAllDataViewsDefault',
  connectorGroup: 'internal',
  summary: `Get all data views`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/data_views'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_all_data_views_default_request, 'body'),
    getZodLooseObjectFromProperty(get_all_data_views_default_request, 'path'),
    getZodLooseObjectFromProperty(get_all_data_views_default_request, 'query'),
  ]),
  outputSchema: get_all_data_views_default_response,
};
const CREATEDATAVIEWDEFAULTW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createDataViewDefaultw',
  connectorGroup: 'internal',
  summary: `Create a data view`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/data_views/data_view'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['data_view', 'override'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_data_view_defaultw_request, 'body'),
    getZodLooseObjectFromProperty(create_data_view_defaultw_request, 'path'),
    getZodLooseObjectFromProperty(create_data_view_defaultw_request, 'query'),
  ]),
  outputSchema: create_data_view_defaultw_response,
};
const DELETEDATAVIEWDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteDataViewDefault',
  connectorGroup: 'internal',
  summary: `Delete a data view`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: When you delete a data view, it cannot be recovered.
`,
  methods: ['DELETE'],
  patterns: ['/api/data_views/data_view/{viewId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['viewId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_data_view_default_request, 'body'),
    getZodLooseObjectFromProperty(delete_data_view_default_request, 'path'),
    getZodLooseObjectFromProperty(delete_data_view_default_request, 'query'),
  ]),
  outputSchema: delete_data_view_default_response,
};
const GETDATAVIEWDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getDataViewDefault',
  connectorGroup: 'internal',
  summary: `Get a data view`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/data_views/data_view/{viewId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['viewId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_data_view_default_request, 'body'),
    getZodLooseObjectFromProperty(get_data_view_default_request, 'path'),
    getZodLooseObjectFromProperty(get_data_view_default_request, 'query'),
  ]),
  outputSchema: get_data_view_default_response,
};
const UPDATEDATAVIEWDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateDataViewDefault',
  connectorGroup: 'internal',
  summary: `Update a data view`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/data_views/data_view/{viewId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['viewId'],
    urlParams: [],
    bodyParams: ['data_view', 'refresh_fields'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_data_view_default_request, 'body'),
    getZodLooseObjectFromProperty(update_data_view_default_request, 'path'),
    getZodLooseObjectFromProperty(update_data_view_default_request, 'query'),
  ]),
  outputSchema: update_data_view_default_response,
};
const UPDATEFIELDSMETADATADEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateFieldsMetadataDefault',
  connectorGroup: 'internal',
  summary: `Update data view fields metadata`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/fields</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update fields presentation metadata such as count, customLabel, customDescription, and format.
`,
  methods: ['POST'],
  patterns: ['/api/data_views/data_view/{viewId}/fields'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['viewId'],
    urlParams: [],
    bodyParams: ['fields'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_fields_metadata_default_request, 'body'),
    getZodLooseObjectFromProperty(update_fields_metadata_default_request, 'path'),
    getZodLooseObjectFromProperty(update_fields_metadata_default_request, 'query'),
  ]),
  outputSchema: update_fields_metadata_default_response,
};
const CREATERUNTIMEFIELDDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createRuntimeFieldDefault',
  connectorGroup: 'internal',
  summary: `Create a runtime field`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/runtime_field</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/data_views/data_view/{viewId}/runtime_field'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['viewId'],
    urlParams: [],
    bodyParams: ['name', 'runtimeField'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_runtime_field_default_request, 'body'),
    getZodLooseObjectFromProperty(create_runtime_field_default_request, 'path'),
    getZodLooseObjectFromProperty(create_runtime_field_default_request, 'query'),
  ]),
  outputSchema: create_runtime_field_default_response,
};
const CREATEUPDATERUNTIMEFIELDDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createUpdateRuntimeFieldDefault',
  connectorGroup: 'internal',
  summary: `Create or update a runtime field`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/runtime_field</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['PUT'],
  patterns: ['/api/data_views/data_view/{viewId}/runtime_field'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['viewId'],
    urlParams: [],
    bodyParams: ['name', 'runtimeField'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_update_runtime_field_default_request, 'body'),
    getZodLooseObjectFromProperty(create_update_runtime_field_default_request, 'path'),
    getZodLooseObjectFromProperty(create_update_runtime_field_default_request, 'query'),
  ]),
  outputSchema: create_update_runtime_field_default_response,
};
const DELETERUNTIMEFIELDDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteRuntimeFieldDefault',
  connectorGroup: 'internal',
  summary: `Delete a runtime field from a data view`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/runtime_field/{fieldName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/data_views/data_view/{viewId}/runtime_field/{fieldName}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['fieldName', 'viewId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_runtime_field_default_request, 'body'),
    getZodLooseObjectFromProperty(delete_runtime_field_default_request, 'path'),
    getZodLooseObjectFromProperty(delete_runtime_field_default_request, 'query'),
  ]),
  outputSchema: delete_runtime_field_default_response,
};
const GETRUNTIMEFIELDDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getRuntimeFieldDefault',
  connectorGroup: 'internal',
  summary: `Get a runtime field`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/runtime_field/{fieldName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/data_views/data_view/{viewId}/runtime_field/{fieldName}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['fieldName', 'viewId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_runtime_field_default_request, 'body'),
    getZodLooseObjectFromProperty(get_runtime_field_default_request, 'path'),
    getZodLooseObjectFromProperty(get_runtime_field_default_request, 'query'),
  ]),
  outputSchema: get_runtime_field_default_response,
};
const UPDATERUNTIMEFIELDDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateRuntimeFieldDefault',
  connectorGroup: 'internal',
  summary: `Update a runtime field`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/runtime_field/{fieldName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/data_views/data_view/{viewId}/runtime_field/{fieldName}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['fieldName', 'viewId'],
    urlParams: [],
    bodyParams: ['runtimeField'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_runtime_field_default_request, 'body'),
    getZodLooseObjectFromProperty(update_runtime_field_default_request, 'path'),
    getZodLooseObjectFromProperty(update_runtime_field_default_request, 'query'),
  ]),
  outputSchema: update_runtime_field_default_response,
};
const GETDEFAULTDATAVIEWDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getDefaultDataViewDefault',
  connectorGroup: 'internal',
  summary: `Get the default data view`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/default</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/data_views/default'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_default_data_view_default_request, 'body'),
    getZodLooseObjectFromProperty(get_default_data_view_default_request, 'path'),
    getZodLooseObjectFromProperty(get_default_data_view_default_request, 'query'),
  ]),
  outputSchema: get_default_data_view_default_response,
};
const SETDEFAULTDATAILVIEWDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.setDefaultDatailViewDefault',
  connectorGroup: 'internal',
  summary: `Set the default data view`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/default</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/data_views/default'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['data_view_id', 'force'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(set_default_datail_view_default_request, 'body'),
    getZodLooseObjectFromProperty(set_default_datail_view_default_request, 'path'),
    getZodLooseObjectFromProperty(set_default_datail_view_default_request, 'query'),
  ]),
  outputSchema: set_default_datail_view_default_response,
};
const SWAPDATAVIEWSDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.swapDataViewsDefault',
  connectorGroup: 'internal',
  summary: `Swap saved object references`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/swap_references</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Changes saved object references from one data view identifier to another. WARNING: Misuse can break large numbers of saved objects! Practicing with a backup is recommended.
`,
  methods: ['POST'],
  patterns: ['/api/data_views/swap_references'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['delete', 'forId', 'forType', 'fromId', 'fromType', 'toId'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(swap_data_views_default_request, 'body'),
    getZodLooseObjectFromProperty(swap_data_views_default_request, 'path'),
    getZodLooseObjectFromProperty(swap_data_views_default_request, 'query'),
  ]),
  outputSchema: swap_data_views_default_response,
};
const PREVIEWSWAPDATAVIEWSDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.previewSwapDataViewsDefault',
  connectorGroup: 'internal',
  summary: `Preview a saved object reference swap`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/swap_references/_preview</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Preview the impact of swapping saved object references from one data view identifier to another.
`,
  methods: ['POST'],
  patterns: ['/api/data_views/swap_references/_preview'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['delete', 'forId', 'forType', 'fromId', 'fromType', 'toId'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(preview_swap_data_views_default_request, 'body'),
    getZodLooseObjectFromProperty(preview_swap_data_views_default_request, 'path'),
    getZodLooseObjectFromProperty(preview_swap_data_views_default_request, 'query'),
  ]),
  outputSchema: preview_swap_data_views_default_response,
};
const DELETEALERTSINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteAlertsIndex',
  connectorGroup: 'internal',
  summary: `Delete an alerts index`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/detection_engine/index'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_alerts_index_request, 'body'),
    getZodLooseObjectFromProperty(delete_alerts_index_request, 'path'),
    getZodLooseObjectFromProperty(delete_alerts_index_request, 'query'),
  ]),
  outputSchema: delete_alerts_index_response,
};
const READALERTSINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadAlertsIndex',
  connectorGroup: 'internal',
  summary: `Reads the alert index name if it exists`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/detection_engine/index'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_alerts_index_request, 'body'),
    getZodLooseObjectFromProperty(read_alerts_index_request, 'path'),
    getZodLooseObjectFromProperty(read_alerts_index_request, 'query'),
  ]),
  outputSchema: read_alerts_index_response,
};
const CREATEALERTSINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateAlertsIndex',
  connectorGroup: 'internal',
  summary: `Create an alerts index`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/index'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_alerts_index_request, 'body'),
    getZodLooseObjectFromProperty(create_alerts_index_request, 'path'),
    getZodLooseObjectFromProperty(create_alerts_index_request, 'query'),
  ]),
  outputSchema: create_alerts_index_response,
};
const READPRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadPrivileges',
  connectorGroup: 'internal',
  summary: `Returns user privileges for the Kibana space`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/privileges</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieves whether or not the user is authenticated, and the user's Kibana
space and index privileges, which determine if the user can create an
index for the Elastic Security alerts generated by
detection engine rules.
`,
  methods: ['GET'],
  patterns: ['/api/detection_engine/privileges'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_privileges_request, 'body'),
    getZodLooseObjectFromProperty(read_privileges_request, 'path'),
    getZodLooseObjectFromProperty(read_privileges_request, 'query'),
  ]),
  outputSchema: read_privileges_response,
};
const DELETERULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteRule',
  connectorGroup: 'internal',
  summary: `Delete a detection rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a detection rule using the \`rule_id\` or \`id\` field.

The URL query must include one of the following:

* \`id\` - \`DELETE /api/detection_engine/rules?id=<id>\`
* \`rule_id\`- \`DELETE /api/detection_engine/rules?rule_id=<rule_id>\`

The difference between the \`id\` and \`rule_id\` is that the \`id\` is a unique rule identifier that is randomly generated when a rule is created and cannot be set, whereas \`rule_id\` is a stable rule identifier that can be assigned during rule creation.
`,
  methods: ['DELETE'],
  patterns: ['/api/detection_engine/rules'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'rule_id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_rule_request, 'body'),
    getZodLooseObjectFromProperty(delete_rule_request, 'path'),
    getZodLooseObjectFromProperty(delete_rule_request, 'query'),
  ]),
  outputSchema: delete_rule_response,
};
const READRULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadRule',
  connectorGroup: 'internal',
  summary: `Retrieve a detection rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a detection rule using the \`rule_id\` or \`id\` field.

The URL query must include one of the following:

* \`id\` - \`GET /api/detection_engine/rules?id=<id>\`
* \`rule_id\` - \`GET /api/detection_engine/rules?rule_id=<rule_id>\`

The difference between the \`id\` and \`rule_id\` is that the \`id\` is a unique rule identifier that is randomly generated when a rule is created and cannot be set, whereas \`rule_id\` is a stable rule identifier that can be assigned during rule creation.
`,
  methods: ['GET'],
  patterns: ['/api/detection_engine/rules'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'rule_id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_rule_request, 'body'),
    getZodLooseObjectFromProperty(read_rule_request, 'path'),
    getZodLooseObjectFromProperty(read_rule_request, 'query'),
  ]),
  outputSchema: read_rule_response,
};
const PATCHRULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PatchRule',
  connectorGroup: 'internal',
  summary: `Patch a detection rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update specific fields of an existing detection rule using the \`rule_id\` or \`id\` field.

The difference between the \`id\` and \`rule_id\` is that the \`id\` is a unique rule identifier that is randomly generated when a rule is created and cannot be set, whereas \`rule_id\` is a stable rule identifier that can be assigned during rule creation.
> warn
> When used with [API key](https://www.elastic.co/docs/deploy-manage/api-keys) authentication, the user's key gets assigned to the affected rules. If the user's key gets deleted or the user becomes inactive, the rules will stop running.

> If the API key that is used for authorization has different privileges than the key that created or most recently updated the rule, the rule behavior might change.
`,
  methods: ['PATCH'],
  patterns: ['/api/detection_engine/rules'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(patch_rule_request, 'body'),
    getZodLooseObjectFromProperty(patch_rule_request, 'path'),
    getZodLooseObjectFromProperty(patch_rule_request, 'query'),
  ]),
  outputSchema: patch_rule_response,
};
const CREATERULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateRule',
  connectorGroup: 'internal',
  summary: `Create a detection rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new detection rule.
> warn
> When used with [API key](https://www.elastic.co/docs/deploy-manage/api-keys) authentication, the user's key gets assigned to the affected rules. If the user's key gets deleted or the user becomes inactive, the rules will stop running.

> If the API key that is used for authorization has different privileges than the key that created or most recently updated the rule, the rule behavior might change.

You can create the following types of rules:

* **Custom query**: Searches the defined indices and creates an alert when a document matches the rule's KQL query.
* **Event correlation**: Searches the defined indices and creates an alert when results match an [Event Query Language (EQL)](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql.html) query.
* **Threshold**: Searches the defined indices and creates an alert when the number of times the specified field's value meets the threshold during a single execution. When there are multiple values that meet the threshold, an alert is generated for each value.
  For example, if the threshold \`field\` is \`source.ip\` and its \`value\` is \`10\`, an alert is generated for every source IP address that appears in at least 10 of the rule's search results. If you're interested, see [Terms Aggregation](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-terms-aggregation.html) for more information.
* **Indicator match**: Creates an alert when fields match values defined in the specified [Elasticsearch index](https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-create-index.html). For example, you can create an index for IP addresses and use this index to create an alert whenever an event's \`destination.ip\` equals a value in the index. The index's field mappings should be [ECS-compliant](https://www.elastic.co/guide/en/ecs/current/ecs-reference.html).
* **New terms**: Generates an alert for each new term detected in source documents within a specified time range.
* **ES|QL**: Uses [Elasticsearch Query Language (ES|QL)](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html) to find events and aggregate search results.
* **Machine learning rules**: Creates an alert when a machine learning job discovers an anomaly above the defined threshold.
> info
> To create machine learning rules, you must have the [appropriate license](https://www.elastic.co/subscriptions) or use a [cloud deployment](https://cloud.elastic.co/registration). Additionally, for the machine learning rule to function correctly, the associated machine learning job must be running.

To retrieve machine learning job IDs, which are required to create machine learning jobs, call the [Elasticsearch Get jobs API](https://www.elastic.co/guide/en/elasticsearch/reference/current/ml-get-job.html). Machine learning jobs that contain \`siem\` in the \`groups\` field can be used to create rules:

\`\`\`json
...
"job_id": "linux_anomalous_network_activity_ecs",
"job_type": "anomaly_detector",
"job_version": "7.7.0",
"groups": [
  "auditbeat",
  "process",
  "siem"
],
...
\`\`\`

Additionally, you can set up notifications for when rules create alerts. The notifications use the [Alerting and Actions framework](https://www.elastic.co/guide/en/kibana/current/alerting-getting-started.html). Each action type requires a connector. Connectors store the information required to send notifications via external systems. The following connector types are supported for rule notifications:

* Slack
* Email
* PagerDuty
* Webhook
* Microsoft Teams
* IBM Resilient
* Jira
* ServiceNow ITSM
> info
> For more information on PagerDuty fields, see [Send a v2 Event](https://developer.pagerduty.com/docs/events-api-v2/trigger-events/).

To retrieve connector IDs, which are required to configure rule notifications, call the [Find objects API](https://www.elastic.co/guide/en/kibana/current/saved-objects-api-find.html) with \`"type": "action"\` in the request payload.

For detailed information on Kibana actions and alerting, and additional API calls, see:

* [Alerting API](https://www.elastic.co/docs/api/doc/kibana/group/endpoint-alerting)
* [Alerting and Actions framework](https://www.elastic.co/guide/en/kibana/current/alerting-getting-started.html)
* [Connectors API](https://www.elastic.co/docs/api/doc/kibana/group/endpoint-connectors)
`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/rules'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_rule_request, 'body'),
    getZodLooseObjectFromProperty(create_rule_request, 'path'),
    getZodLooseObjectFromProperty(create_rule_request, 'query'),
  ]),
  outputSchema: create_rule_response,
};
const UPDATERULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateRule',
  connectorGroup: 'internal',
  summary: `Update a detection rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a detection rule using the \`rule_id\` or \`id\` field. The original rule is replaced, and all unspecified fields are deleted.

The difference between the \`id\` and \`rule_id\` is that the \`id\` is a unique rule identifier that is randomly generated when a rule is created and cannot be set, whereas \`rule_id\` is a stable rule identifier that can be assigned during rule creation.
> warn
> When used with [API key](https://www.elastic.co/docs/deploy-manage/api-keys) authentication, the user's key gets assigned to the affected rules. If the user's key gets deleted or the user becomes inactive, the rules will stop running.

> If the API key that is used for authorization has different privileges than the key that created or most recently updated the rule, the rule behavior might change.
`,
  methods: ['PUT'],
  patterns: ['/api/detection_engine/rules'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_rule_request, 'body'),
    getZodLooseObjectFromProperty(update_rule_request, 'path'),
    getZodLooseObjectFromProperty(update_rule_request, 'query'),
  ]),
  outputSchema: update_rule_response,
};
const PERFORMRULESBULKACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PerformRulesBulkAction',
  connectorGroup: 'internal',
  summary: `Apply a bulk action to detection rules`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/_bulk_action</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Apply a bulk action, such as bulk edit, duplicate, or delete, to multiple detection rules. The bulk action is applied to all rules that match the query or to the rules listed by their IDs.

The edit action allows you to add, delete, or set tags, index patterns, investigation fields, rule actions and schedules for multiple rules at once. 
The edit action is idempotent, meaning that if you add a tag to a rule that already has that tag, no changes are made. The same is true for other edit actions, for example removing an index pattern that is not specified in a rule will not result in any changes. The only exception is the \`add_rule_actions\` and \`set_rule_actions\` action, which is non-idempotent. This means that if you add or set a rule action to a rule that already has that action, a new action is created with a new unique ID.
> warn
> When used with [API key](https://www.elastic.co/docs/deploy-manage/api-keys) authentication, the user's key gets assigned to the affected rules. If the user's key gets deleted or the user becomes inactive, the rules will stop running.

> If the API key that is used for authorization has different privileges than the key that created or most recently updated the rule, the rule behavior might change.
`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/rules/_bulk_action'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['dry_run'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(perform_rules_bulk_action_request, 'body'),
    getZodLooseObjectFromProperty(perform_rules_bulk_action_request, 'path'),
    getZodLooseObjectFromProperty(perform_rules_bulk_action_request, 'query'),
  ]),
  outputSchema: perform_rules_bulk_action_response,
};
const EXPORTRULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ExportRules',
  connectorGroup: 'internal',
  summary: `Export detection rules`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/_export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Export detection rules to an \`.ndjson\` file. The following configuration items are also included in the \`.ndjson\` file:
- Actions
- Exception lists
> info
> Rule actions and connectors are included in the exported file, but sensitive information about the connector (such as authentication credentials) is not included. You must re-add missing connector details after importing detection rules.

> You can use Kibana’s [Saved Objects](https://www.elastic.co/guide/en/kibana/current/managing-saved-objects.html) UI (Stack Management → Kibana → Saved Objects) or the Saved Objects APIs (experimental) to [export](https://www.elastic.co/docs/api/doc/kibana/operation/operation-exportsavedobjectsdefault) and [import](https://www.elastic.co/docs/api/doc/kibana/operation/operation-importsavedobjectsdefault) any necessary connectors before importing detection rules.

> Similarly, any value lists used for rule exceptions are not included in rule exports or imports. Use the [Manage value lists](https://www.elastic.co/guide/en/security/current/value-lists-exceptions.html#manage-value-lists) UI (Rules → Detection rules (SIEM) → Manage value lists) to export and import value lists separately.
`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/rules/_export'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['exclude_export_details', 'file_name'],
    bodyParams: ['objects'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(export_rules_request, 'body'),
    getZodLooseObjectFromProperty(export_rules_request, 'path'),
    getZodLooseObjectFromProperty(export_rules_request, 'query'),
  ]),
  outputSchema: export_rules_response,
};
const FINDRULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindRules',
  connectorGroup: 'internal',
  summary: `List all detection rules`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a paginated list of detection rules. By default, the first page is returned, with 20 results per page.`,
  methods: ['GET'],
  patterns: ['/api/detection_engine/rules/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'fields',
      'filter',
      'sort_field',
      'sort_order',
      'page',
      'per_page',
      'gaps_range_start',
      'gaps_range_end',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_rules_request, 'body'),
    getZodLooseObjectFromProperty(find_rules_request, 'path'),
    getZodLooseObjectFromProperty(find_rules_request, 'query'),
  ]),
  outputSchema: find_rules_response,
};
const IMPORTRULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ImportRules',
  connectorGroup: 'internal',
  summary: `Import detection rules`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/_import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Import detection rules from an \`.ndjson\` file, including actions and exception lists. The request must include:
- The \`Content-Type: multipart/form-data\` HTTP header.
- A link to the \`.ndjson\` file containing the rules.
> warn
> When used with [API key](https://www.elastic.co/docs/deploy-manage/api-keys) authentication, the user's key gets assigned to the affected rules. If the user's key gets deleted or the user becomes inactive, the rules will stop running.

> If the API key that is used for authorization has different privileges than the key that created or most recently updated the rule, the rule behavior might change.
> info
> To import rules with actions, you need at least Read privileges for the Action and Connectors feature. To overwrite or add new connectors, you need All privileges for the Actions and Connectors feature. To import rules without actions, you don’t need Actions and Connectors privileges. Refer to [Enable and access detections](https://www.elastic.co/guide/en/security/current/detections-permissions-section.html#enable-detections-ui) for more information.

> info
> Rule actions and connectors are included in the exported file, but sensitive information about the connector (such as authentication credentials) is not included. You must re-add missing connector details after importing detection rules.

> You can use Kibana’s [Saved Objects](https://www.elastic.co/guide/en/kibana/current/managing-saved-objects.html) UI (Stack Management → Kibana → Saved Objects) or the Saved Objects APIs (experimental) to [export](https://www.elastic.co/docs/api/doc/kibana/operation/operation-exportsavedobjectsdefault) and [import](https://www.elastic.co/docs/api/doc/kibana/operation/operation-importsavedobjectsdefault) any necessary connectors before importing detection rules.

> Similarly, any value lists used for rule exceptions are not included in rule exports or imports. Use the [Manage value lists](https://www.elastic.co/guide/en/security/current/value-lists-exceptions.html#manage-value-lists) UI (Rules → Detection rules (SIEM) → Manage value lists) to export and import value lists separately.
`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/rules/_import'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['overwrite', 'overwrite_exceptions', 'overwrite_action_connectors', 'as_new_list'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(import_rules_request, 'body'),
    getZodLooseObjectFromProperty(import_rules_request, 'path'),
    getZodLooseObjectFromProperty(import_rules_request, 'query'),
  ]),
  outputSchema: import_rules_response,
};
const CREATERULEEXCEPTIONLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateRuleExceptionListItems',
  connectorGroup: 'internal',
  summary: `Create rule exception items`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/{id}/exceptions</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create exception items that apply to a single detection rule.`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/rules/{id}/exceptions'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['items'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_rule_exception_list_items_request, 'body'),
    getZodLooseObjectFromProperty(create_rule_exception_list_items_request, 'path'),
    getZodLooseObjectFromProperty(create_rule_exception_list_items_request, 'query'),
  ]),
  outputSchema: create_rule_exception_list_items_response,
};
const INSTALLPREBUILTRULESANDTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InstallPrebuiltRulesAndTimelines',
  connectorGroup: 'internal',
  summary: `Install prebuilt detection rules and Timelines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/prepackaged</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Install and update all Elastic prebuilt detection rules and Timelines.

This endpoint allows you to install and update prebuilt detection rules and Timelines provided by Elastic. 
When you call this endpoint, it will:
- Install any new prebuilt detection rules that are not currently installed in your system.
- Update any existing prebuilt detection rules that have been modified or improved by Elastic.
- Install any new prebuilt Timelines that are not currently installed in your system.
- Update any existing prebuilt Timelines that have been modified or improved by Elastic.

This ensures that your detection engine is always up-to-date with the latest rules and Timelines, 
providing you with the most current and effective threat detection capabilities.
`,
  methods: ['PUT'],
  patterns: ['/api/detection_engine/rules/prepackaged'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(install_prebuilt_rules_and_timelines_request, 'body'),
    getZodLooseObjectFromProperty(install_prebuilt_rules_and_timelines_request, 'path'),
    getZodLooseObjectFromProperty(install_prebuilt_rules_and_timelines_request, 'query'),
  ]),
  outputSchema: install_prebuilt_rules_and_timelines_response,
};
const READPREBUILTRULESANDTIMELINESSTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadPrebuiltRulesAndTimelinesStatus',
  connectorGroup: 'internal',
  summary: `Retrieve the status of prebuilt detection rules and Timelines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/prepackaged/_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve the status of all Elastic prebuilt detection rules and Timelines. 

This endpoint provides detailed information about the number of custom rules, installed prebuilt rules, available prebuilt rules that are not installed, outdated prebuilt rules, installed prebuilt timelines, available prebuilt timelines that are not installed, and outdated prebuilt timelines.
`,
  methods: ['GET'],
  patterns: ['/api/detection_engine/rules/prepackaged/_status'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_prebuilt_rules_and_timelines_status_request, 'body'),
    getZodLooseObjectFromProperty(read_prebuilt_rules_and_timelines_status_request, 'path'),
    getZodLooseObjectFromProperty(read_prebuilt_rules_and_timelines_status_request, 'query'),
  ]),
  outputSchema: read_prebuilt_rules_and_timelines_status_response,
};
const RULEPREVIEW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.RulePreview',
  connectorGroup: 'internal',
  summary: `Preview rule alerts generated on specified time range`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/preview</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/rules/preview'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['enable_logged_requests'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(rule_preview_request, 'body'),
    getZodLooseObjectFromProperty(rule_preview_request, 'path'),
    getZodLooseObjectFromProperty(rule_preview_request, 'query'),
  ]),
  outputSchema: rule_preview_response,
};
const SETALERTASSIGNEES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.SetAlertAssignees',
  connectorGroup: 'internal',
  summary: `Assign and unassign users from detection alerts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/assignees</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Assign users to detection alerts, and unassign them from alerts.
> info
> You cannot add and remove the same assignee in the same request.
`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/signals/assignees'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['assignees', 'ids'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(set_alert_assignees_request, 'body'),
    getZodLooseObjectFromProperty(set_alert_assignees_request, 'path'),
    getZodLooseObjectFromProperty(set_alert_assignees_request, 'query'),
  ]),
  outputSchema: set_alert_assignees_response,
};
const FINALIZEALERTSMIGRATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FinalizeAlertsMigration',
  connectorGroup: 'internal',
  summary: `Finalize detection alert migrations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/finalize_migration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Finalize successful migrations of detection alerts. This replaces the original index's alias with the successfully migrated index's alias.
The endpoint is idempotent; therefore, it can safely be used to poll a given migration and, upon completion,
finalize it.
`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/signals/finalize_migration'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['migration_ids'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(finalize_alerts_migration_request, 'body'),
    getZodLooseObjectFromProperty(finalize_alerts_migration_request, 'path'),
    getZodLooseObjectFromProperty(finalize_alerts_migration_request, 'query'),
  ]),
  outputSchema: finalize_alerts_migration_response,
};
const ALERTSMIGRATIONCLEANUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.AlertsMigrationCleanup',
  connectorGroup: 'internal',
  summary: `Clean up detection alert migrations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/migration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Migrations favor data integrity over shard size. Consequently, unused or orphaned indices are artifacts of
the migration process. A successful migration will result in both the old and new indices being present.
As such, the old, orphaned index can (and likely should) be deleted.

While you can delete these indices manually,
the endpoint accomplishes this task by applying a deletion policy to the relevant index, causing it to be deleted
after 30 days. It also deletes other artifacts specific to the migration implementation.
`,
  methods: ['DELETE'],
  patterns: ['/api/detection_engine/signals/migration'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['migration_ids'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(alerts_migration_cleanup_request, 'body'),
    getZodLooseObjectFromProperty(alerts_migration_cleanup_request, 'path'),
    getZodLooseObjectFromProperty(alerts_migration_cleanup_request, 'query'),
  ]),
  outputSchema: alerts_migration_cleanup_response,
};
const CREATEALERTSMIGRATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateAlertsMigration',
  connectorGroup: 'internal',
  summary: `Initiate a detection alert migration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/migration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Initiate a migration of detection alerts.
Migrations are initiated per index. While the process is neither destructive nor interferes with existing data, it may be resource-intensive. As such, it is recommended that you plan your migrations accordingly.
`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/signals/migration'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_alerts_migration_request, 'body'),
    getZodLooseObjectFromProperty(create_alerts_migration_request, 'path'),
    getZodLooseObjectFromProperty(create_alerts_migration_request, 'query'),
  ]),
  outputSchema: create_alerts_migration_response,
};
const READALERTSMIGRATIONSTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadAlertsMigrationStatus',
  connectorGroup: 'internal',
  summary: `Retrieve the status of detection alert migrations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/migration_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve indices that contain detection alerts of a particular age, along with migration information for each of those indices.`,
  methods: ['GET'],
  patterns: ['/api/detection_engine/signals/migration_status'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['from'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_alerts_migration_status_request, 'body'),
    getZodLooseObjectFromProperty(read_alerts_migration_status_request, 'path'),
    getZodLooseObjectFromProperty(read_alerts_migration_status_request, 'query'),
  ]),
  outputSchema: read_alerts_migration_status_response,
};
const SEARCHALERTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.SearchAlerts',
  connectorGroup: 'internal',
  summary: `Find and/or aggregate detection alerts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/search</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Find and/or aggregate detection alerts that match the given query.`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/signals/search'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      '_source',
      'aggs',
      'fields',
      'query',
      'runtime_mappings',
      'size',
      'sort',
      'track_total_hits',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(search_alerts_request, 'body'),
    getZodLooseObjectFromProperty(search_alerts_request, 'path'),
    getZodLooseObjectFromProperty(search_alerts_request, 'query'),
  ]),
  outputSchema: search_alerts_response,
};
const SETALERTSSTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.SetAlertsStatus',
  connectorGroup: 'internal',
  summary: `Set a detection alert status`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Set the status of one or more detection alerts.`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/signals/status'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(set_alerts_status_request, 'body'),
    getZodLooseObjectFromProperty(set_alerts_status_request, 'path'),
    getZodLooseObjectFromProperty(set_alerts_status_request, 'query'),
  ]),
  outputSchema: set_alerts_status_response,
};
const SETALERTTAGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.SetAlertTags',
  connectorGroup: 'internal',
  summary: `Add and remove detection alert tags`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/tags</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

And tags to detection alerts, and remove them from alerts.
> info
> You cannot add and remove the same alert tag in the same request.
`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/signals/tags'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['ids', 'tags'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(set_alert_tags_request, 'body'),
    getZodLooseObjectFromProperty(set_alert_tags_request, 'path'),
    getZodLooseObjectFromProperty(set_alert_tags_request, 'query'),
  ]),
  outputSchema: set_alert_tags_response,
};
const READTAGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadTags',
  connectorGroup: 'internal',
  summary: `List all detection rule tags`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/tags</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List all unique tags from all detection rules.`,
  methods: ['GET'],
  patterns: ['/api/detection_engine/tags'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_tags_request, 'body'),
    getZodLooseObjectFromProperty(read_tags_request, 'path'),
    getZodLooseObjectFromProperty(read_tags_request, 'query'),
  ]),
  outputSchema: read_tags_response,
};
const ROTATEENCRYPTIONKEY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.rotateEncryptionKey',
  connectorGroup: 'internal',
  summary: `Rotate a key for encrypted saved objects`,
  description: `Superuser role required.

If a saved object cannot be decrypted using the primary encryption key, then Kibana will attempt to decrypt it using the specified decryption-only keys. In most of the cases this overhead is negligible, but if you're dealing with a large number of saved objects and experiencing performance issues, you may want to rotate the encryption key.

This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.
`,
  methods: ['POST'],
  patterns: ['/api/encrypted_saved_objects/_rotate_key'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['batch_size', 'type'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(rotate_encryption_key_request, 'body'),
    getZodLooseObjectFromProperty(rotate_encryption_key_request, 'path'),
    getZodLooseObjectFromProperty(rotate_encryption_key_request, 'query'),
  ]),
  outputSchema: rotate_encryption_key_response,
};
const CREATEENDPOINTLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateEndpointList',
  connectorGroup: 'internal',
  summary: `Create an Elastic Endpoint rule exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create the exception list for Elastic Endpoint rule exceptions. When you create the exception list, it will have a \`list_id\` of \`endpoint_list\`. If the Elastic Endpoint exception list already exists, your request will return an empty response.`,
  methods: ['POST'],
  patterns: ['/api/endpoint_list'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_endpoint_list_request, 'body'),
    getZodLooseObjectFromProperty(create_endpoint_list_request, 'path'),
    getZodLooseObjectFromProperty(create_endpoint_list_request, 'query'),
  ]),
  outputSchema: create_endpoint_list_response,
};
const DELETEENDPOINTLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteEndpointListItem',
  connectorGroup: 'internal',
  summary: `Delete an Elastic Endpoint exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an Elastic Endpoint exception list item, specified by the \`id\` or \`item_id\` field.`,
  methods: ['DELETE'],
  patterns: ['/api/endpoint_list/items'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'item_id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_endpoint_list_item_request, 'body'),
    getZodLooseObjectFromProperty(delete_endpoint_list_item_request, 'path'),
    getZodLooseObjectFromProperty(delete_endpoint_list_item_request, 'query'),
  ]),
  outputSchema: delete_endpoint_list_item_response,
};
const READENDPOINTLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadEndpointListItem',
  connectorGroup: 'internal',
  summary: `Get an Elastic Endpoint rule exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an Elastic Endpoint exception list item, specified by the \`id\` or \`item_id\` field.`,
  methods: ['GET'],
  patterns: ['/api/endpoint_list/items'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'item_id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_endpoint_list_item_request, 'body'),
    getZodLooseObjectFromProperty(read_endpoint_list_item_request, 'path'),
    getZodLooseObjectFromProperty(read_endpoint_list_item_request, 'query'),
  ]),
  outputSchema: read_endpoint_list_item_response,
};
const CREATEENDPOINTLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateEndpointListItem',
  connectorGroup: 'internal',
  summary: `Create an Elastic Endpoint rule exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create an Elastic Endpoint exception list item, and associate it with the Elastic Endpoint exception list.`,
  methods: ['POST'],
  patterns: ['/api/endpoint_list/items'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'comments',
      'description',
      'entries',
      'item_id',
      'meta',
      'name',
      'os_types',
      'tags',
      'type',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_endpoint_list_item_request, 'body'),
    getZodLooseObjectFromProperty(create_endpoint_list_item_request, 'path'),
    getZodLooseObjectFromProperty(create_endpoint_list_item_request, 'query'),
  ]),
  outputSchema: create_endpoint_list_item_response,
};
const UPDATEENDPOINTLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateEndpointListItem',
  connectorGroup: 'internal',
  summary: `Update an Elastic Endpoint rule exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an Elastic Endpoint exception list item, specified by the \`id\` or \`item_id\` field.`,
  methods: ['PUT'],
  patterns: ['/api/endpoint_list/items'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      '_version',
      'comments',
      'description',
      'entries',
      'id',
      'item_id',
      'meta',
      'name',
      'os_types',
      'tags',
      'type',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_endpoint_list_item_request, 'body'),
    getZodLooseObjectFromProperty(update_endpoint_list_item_request, 'path'),
    getZodLooseObjectFromProperty(update_endpoint_list_item_request, 'query'),
  ]),
  outputSchema: update_endpoint_list_item_response,
};
const FINDENDPOINTLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindEndpointListItems',
  connectorGroup: 'internal',
  summary: `Get Elastic Endpoint exception list items`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all Elastic Endpoint exception list items.`,
  methods: ['GET'],
  patterns: ['/api/endpoint_list/items/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['filter', 'page', 'per_page', 'sort_field', 'sort_order'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_endpoint_list_items_request, 'body'),
    getZodLooseObjectFromProperty(find_endpoint_list_items_request, 'path'),
    getZodLooseObjectFromProperty(find_endpoint_list_items_request, 'query'),
  ]),
  outputSchema: find_endpoint_list_items_response,
};
const ENDPOINTGETACTIONSLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetActionsList',
  connectorGroup: 'internal',
  summary: `Get response actions`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all response actions.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/action'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'page',
      'pageSize',
      'commands',
      'agentIds',
      'userIds',
      'startDate',
      'endDate',
      'agentTypes',
      'withOutputs',
      'types',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(endpoint_get_actions_list_request, 'body'),
    getZodLooseObjectFromProperty(endpoint_get_actions_list_request, 'path'),
    getZodLooseObjectFromProperty(endpoint_get_actions_list_request, 'query'),
  ]),
  outputSchema: endpoint_get_actions_list_response,
};
const ENDPOINTGETACTIONSSTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetActionsStatus',
  connectorGroup: 'internal',
  summary: `Get response actions status`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the status of response actions for the specified agent IDs.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/action_status'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['query'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(endpoint_get_actions_status_request, 'body'),
    getZodLooseObjectFromProperty(endpoint_get_actions_status_request, 'path'),
    getZodLooseObjectFromProperty(endpoint_get_actions_status_request, 'query'),
  ]),
  outputSchema: endpoint_get_actions_status_response,
};
const ENDPOINTGETACTIONSDETAILS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetActionsDetails',
  connectorGroup: 'internal',
  summary: `Get action details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/{action_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a response action using the action ID.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/action/{action_id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['action_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(endpoint_get_actions_details_request, 'body'),
    getZodLooseObjectFromProperty(endpoint_get_actions_details_request, 'path'),
    getZodLooseObjectFromProperty(endpoint_get_actions_details_request, 'query'),
  ]),
  outputSchema: endpoint_get_actions_details_response,
};
const ENDPOINTFILEINFO_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointFileInfo',
  connectorGroup: 'internal',
  summary: `Get file information`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/{action_id}/file/{file_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get information for the specified response action file download.
`,
  methods: ['GET'],
  patterns: ['/api/endpoint/action/{action_id}/file/{file_id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['action_id', 'file_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(endpoint_file_info_request, 'body'),
    getZodLooseObjectFromProperty(endpoint_file_info_request, 'path'),
    getZodLooseObjectFromProperty(endpoint_file_info_request, 'query'),
  ]),
  outputSchema: endpoint_file_info_response,
};
const ENDPOINTFILEDOWNLOAD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointFileDownload',
  connectorGroup: 'internal',
  summary: `Download a file`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/{action_id}/file/{file_id}/download</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Download a file associated with a response action.
`,
  methods: ['GET'],
  patterns: ['/api/endpoint/action/{action_id}/file/{file_id}/download'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['action_id', 'file_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(endpoint_file_download_request, 'body'),
    getZodLooseObjectFromProperty(endpoint_file_download_request, 'path'),
    getZodLooseObjectFromProperty(endpoint_file_download_request, 'query'),
  ]),
  outputSchema: endpoint_file_download_response,
};
const CANCELACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CancelAction',
  connectorGroup: 'internal',
  summary: `Cancel a response action`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/cancel</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Cancel a running or pending response action (Applies only to some agent types).`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/cancel'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(cancel_action_request, 'body'),
    getZodLooseObjectFromProperty(cancel_action_request, 'path'),
    getZodLooseObjectFromProperty(cancel_action_request, 'query'),
  ]),
  outputSchema: cancel_action_response,
};
const ENDPOINTEXECUTEACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointExecuteAction',
  connectorGroup: 'internal',
  summary: `Run a command`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/execute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Run a shell command on an endpoint.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/execute'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(endpoint_execute_action_request, 'body'),
    getZodLooseObjectFromProperty(endpoint_execute_action_request, 'path'),
    getZodLooseObjectFromProperty(endpoint_execute_action_request, 'query'),
  ]),
  outputSchema: endpoint_execute_action_response,
};
const ENDPOINTGETFILEACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetFileAction',
  connectorGroup: 'internal',
  summary: `Get a file`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/get_file</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a file from an endpoint.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/get_file'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(endpoint_get_file_action_request, 'body'),
    getZodLooseObjectFromProperty(endpoint_get_file_action_request, 'path'),
    getZodLooseObjectFromProperty(endpoint_get_file_action_request, 'query'),
  ]),
  outputSchema: endpoint_get_file_action_response,
};
const ENDPOINTISOLATEACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointIsolateAction',
  connectorGroup: 'internal',
  summary: `Isolate an endpoint`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/isolate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Isolate an endpoint from the network. The endpoint remains isolated until it's released.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/isolate'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(endpoint_isolate_action_request, 'body'),
    getZodLooseObjectFromProperty(endpoint_isolate_action_request, 'path'),
    getZodLooseObjectFromProperty(endpoint_isolate_action_request, 'query'),
  ]),
  outputSchema: endpoint_isolate_action_response,
};
const ENDPOINTKILLPROCESSACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointKillProcessAction',
  connectorGroup: 'internal',
  summary: `Terminate a process`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/kill_process</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Terminate a running process on an endpoint.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/kill_process'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(endpoint_kill_process_action_request, 'body'),
    getZodLooseObjectFromProperty(endpoint_kill_process_action_request, 'path'),
    getZodLooseObjectFromProperty(endpoint_kill_process_action_request, 'query'),
  ]),
  outputSchema: endpoint_kill_process_action_response,
};
const ENDPOINTGETPROCESSESACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetProcessesAction',
  connectorGroup: 'internal',
  summary: `Get running processes`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/running_procs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all processes running on an endpoint.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/running_procs'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(endpoint_get_processes_action_request, 'body'),
    getZodLooseObjectFromProperty(endpoint_get_processes_action_request, 'path'),
    getZodLooseObjectFromProperty(endpoint_get_processes_action_request, 'query'),
  ]),
  outputSchema: endpoint_get_processes_action_response,
};
const RUNSCRIPTACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.RunScriptAction',
  connectorGroup: 'internal',
  summary: `Run a script`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/runscript</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Run a script on a host. Currently supported only for some agent types.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/runscript'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(run_script_action_request, 'body'),
    getZodLooseObjectFromProperty(run_script_action_request, 'path'),
    getZodLooseObjectFromProperty(run_script_action_request, 'query'),
  ]),
  outputSchema: run_script_action_response,
};
const ENDPOINTSCANACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointScanAction',
  connectorGroup: 'internal',
  summary: `Scan a file or directory`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/scan</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Scan a specific file or directory on an endpoint for malware.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/scan'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(endpoint_scan_action_request, 'body'),
    getZodLooseObjectFromProperty(endpoint_scan_action_request, 'path'),
    getZodLooseObjectFromProperty(endpoint_scan_action_request, 'query'),
  ]),
  outputSchema: endpoint_scan_action_response,
};
const ENDPOINTGETACTIONSSTATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetActionsState',
  connectorGroup: 'internal',
  summary: `Get actions state`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/state</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a response actions state, which reports whether encryption is enabled.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/action/state'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(endpoint_get_actions_state_request, 'body'),
    getZodLooseObjectFromProperty(endpoint_get_actions_state_request, 'path'),
    getZodLooseObjectFromProperty(endpoint_get_actions_state_request, 'query'),
  ]),
  outputSchema: endpoint_get_actions_state_response,
};
const ENDPOINTSUSPENDPROCESSACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointSuspendProcessAction',
  connectorGroup: 'internal',
  summary: `Suspend a process`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/suspend_process</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Suspend a running process on an endpoint.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/suspend_process'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(endpoint_suspend_process_action_request, 'body'),
    getZodLooseObjectFromProperty(endpoint_suspend_process_action_request, 'path'),
    getZodLooseObjectFromProperty(endpoint_suspend_process_action_request, 'query'),
  ]),
  outputSchema: endpoint_suspend_process_action_response,
};
const ENDPOINTUNISOLATEACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointUnisolateAction',
  connectorGroup: 'internal',
  summary: `Release an isolated endpoint`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/unisolate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Release an isolated endpoint, allowing it to rejoin a network.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/unisolate'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(endpoint_unisolate_action_request, 'body'),
    getZodLooseObjectFromProperty(endpoint_unisolate_action_request, 'path'),
    getZodLooseObjectFromProperty(endpoint_unisolate_action_request, 'query'),
  ]),
  outputSchema: endpoint_unisolate_action_response,
};
const ENDPOINTUPLOADACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointUploadAction',
  connectorGroup: 'internal',
  summary: `Upload a file`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/upload</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upload a file to an endpoint.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/upload'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(endpoint_upload_action_request, 'body'),
    getZodLooseObjectFromProperty(endpoint_upload_action_request, 'path'),
    getZodLooseObjectFromProperty(endpoint_upload_action_request, 'query'),
  ]),
  outputSchema: endpoint_upload_action_response,
};
const GETENDPOINTMETADATALIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetEndpointMetadataList',
  connectorGroup: 'internal',
  summary: `Get a metadata list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/metadata</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/metadata'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['page', 'pageSize', 'kuery', 'hostStatuses', 'sortField', 'sortDirection'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_endpoint_metadata_list_request, 'body'),
    getZodLooseObjectFromProperty(get_endpoint_metadata_list_request, 'path'),
    getZodLooseObjectFromProperty(get_endpoint_metadata_list_request, 'query'),
  ]),
  outputSchema: get_endpoint_metadata_list_response,
};
const GETENDPOINTMETADATA_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetEndpointMetadata',
  connectorGroup: 'internal',
  summary: `Get metadata`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/metadata/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/metadata/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_endpoint_metadata_request, 'body'),
    getZodLooseObjectFromProperty(get_endpoint_metadata_request, 'path'),
    getZodLooseObjectFromProperty(get_endpoint_metadata_request, 'query'),
  ]),
  outputSchema: get_endpoint_metadata_response,
};
const GETPOLICYRESPONSE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetPolicyResponse',
  connectorGroup: 'internal',
  summary: `Get a policy response`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/policy_response</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/policy_response'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['query'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_policy_response_request, 'body'),
    getZodLooseObjectFromProperty(get_policy_response_request, 'path'),
    getZodLooseObjectFromProperty(get_policy_response_request, 'query'),
  ]),
  outputSchema: get_policy_response_response,
};
const GETPROTECTIONUPDATESNOTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetProtectionUpdatesNote',
  connectorGroup: 'internal',
  summary: `Get a protection updates note`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/protection_updates_note/{package_policy_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/protection_updates_note/{package_policy_id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['package_policy_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_protection_updates_note_request, 'body'),
    getZodLooseObjectFromProperty(get_protection_updates_note_request, 'path'),
    getZodLooseObjectFromProperty(get_protection_updates_note_request, 'query'),
  ]),
  outputSchema: get_protection_updates_note_response,
};
const CREATEUPDATEPROTECTIONUPDATESNOTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateUpdateProtectionUpdatesNote',
  connectorGroup: 'internal',
  summary: `Create or update a protection updates note`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/protection_updates_note/{package_policy_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/protection_updates_note/{package_policy_id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['package_policy_id'],
    urlParams: [],
    bodyParams: ['note'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_update_protection_updates_note_request, 'body'),
    getZodLooseObjectFromProperty(create_update_protection_updates_note_request, 'path'),
    getZodLooseObjectFromProperty(create_update_protection_updates_note_request, 'query'),
  ]),
  outputSchema: create_update_protection_updates_note_response,
};
const DELETEMONITORINGENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteMonitoringEngine',
  connectorGroup: 'internal',
  summary: `Delete the Privilege Monitoring Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/engine/delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/entity_analytics/monitoring/engine/delete'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['data'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_monitoring_engine_request, 'body'),
    getZodLooseObjectFromProperty(delete_monitoring_engine_request, 'path'),
    getZodLooseObjectFromProperty(delete_monitoring_engine_request, 'query'),
  ]),
  outputSchema: delete_monitoring_engine_response,
};
const DISABLEMONITORINGENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DisableMonitoringEngine',
  connectorGroup: 'internal',
  summary: `Disable the Privilege Monitoring Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/engine/disable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_analytics/monitoring/engine/disable'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(disable_monitoring_engine_request, 'body'),
    getZodLooseObjectFromProperty(disable_monitoring_engine_request, 'path'),
    getZodLooseObjectFromProperty(disable_monitoring_engine_request, 'query'),
  ]),
  outputSchema: disable_monitoring_engine_response,
};
const INITMONITORINGENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InitMonitoringEngine',
  connectorGroup: 'internal',
  summary: `Initialize the Privilege Monitoring Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/engine/init</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_analytics/monitoring/engine/init'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(init_monitoring_engine_request, 'body'),
    getZodLooseObjectFromProperty(init_monitoring_engine_request, 'path'),
    getZodLooseObjectFromProperty(init_monitoring_engine_request, 'query'),
  ]),
  outputSchema: init_monitoring_engine_response,
};
const SCHEDULEMONITORINGENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ScheduleMonitoringEngine',
  connectorGroup: 'internal',
  summary: `Schedule the Privilege Monitoring Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/engine/schedule_now</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_analytics/monitoring/engine/schedule_now'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(schedule_monitoring_engine_request, 'body'),
    getZodLooseObjectFromProperty(schedule_monitoring_engine_request, 'path'),
    getZodLooseObjectFromProperty(schedule_monitoring_engine_request, 'query'),
  ]),
  outputSchema: schedule_monitoring_engine_response,
};
const PRIVMONHEALTH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PrivMonHealth',
  connectorGroup: 'internal',
  summary: `Health check on Privilege Monitoring`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/privileges/health</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/entity_analytics/monitoring/privileges/health'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(priv_mon_health_request, 'body'),
    getZodLooseObjectFromProperty(priv_mon_health_request, 'path'),
    getZodLooseObjectFromProperty(priv_mon_health_request, 'query'),
  ]),
  outputSchema: priv_mon_health_response,
};
const PRIVMONPRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PrivMonPrivileges',
  connectorGroup: 'internal',
  summary: `Run a privileges check on Privilege Monitoring`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/privileges/privileges</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Check if the current user has all required permissions for Privilege Monitoring`,
  methods: ['GET'],
  patterns: ['/api/entity_analytics/monitoring/privileges/privileges'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(priv_mon_privileges_request, 'body'),
    getZodLooseObjectFromProperty(priv_mon_privileges_request, 'path'),
    getZodLooseObjectFromProperty(priv_mon_privileges_request, 'query'),
  ]),
  outputSchema: priv_mon_privileges_response,
};
const CREATEPRIVMONUSER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreatePrivMonUser',
  connectorGroup: 'internal',
  summary: `Create a new monitored user`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_analytics/monitoring/users'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['user'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_priv_mon_user_request, 'body'),
    getZodLooseObjectFromProperty(create_priv_mon_user_request, 'path'),
    getZodLooseObjectFromProperty(create_priv_mon_user_request, 'query'),
  ]),
  outputSchema: create_priv_mon_user_response,
};
const PRIVMONBULKUPLOADUSERSCSV_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PrivmonBulkUploadUsersCSV',
  connectorGroup: 'internal',
  summary: `Upsert multiple monitored users via CSV upload`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users/_csv</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_analytics/monitoring/users/_csv'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(privmon_bulk_upload_users_c_s_v_request, 'body'),
    getZodLooseObjectFromProperty(privmon_bulk_upload_users_c_s_v_request, 'path'),
    getZodLooseObjectFromProperty(privmon_bulk_upload_users_c_s_v_request, 'query'),
  ]),
  outputSchema: privmon_bulk_upload_users_c_s_v_response,
};
const DELETEPRIVMONUSER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeletePrivMonUser',
  connectorGroup: 'internal',
  summary: `Delete a monitored user`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/entity_analytics/monitoring/users/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_priv_mon_user_request, 'body'),
    getZodLooseObjectFromProperty(delete_priv_mon_user_request, 'path'),
    getZodLooseObjectFromProperty(delete_priv_mon_user_request, 'query'),
  ]),
  outputSchema: delete_priv_mon_user_response,
};
const UPDATEPRIVMONUSER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdatePrivMonUser',
  connectorGroup: 'internal',
  summary: `Update a monitored user`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['PUT'],
  patterns: ['/api/entity_analytics/monitoring/users/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['entity_analytics_monitoring', 'id', 'labels', 'user'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_priv_mon_user_request, 'body'),
    getZodLooseObjectFromProperty(update_priv_mon_user_request, 'path'),
    getZodLooseObjectFromProperty(update_priv_mon_user_request, 'query'),
  ]),
  outputSchema: update_priv_mon_user_response,
};
const LISTPRIVMONUSERS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ListPrivMonUsers',
  connectorGroup: 'internal',
  summary: `List all monitored users`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users/list</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/entity_analytics/monitoring/users/list'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['kql'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(list_priv_mon_users_request, 'body'),
    getZodLooseObjectFromProperty(list_priv_mon_users_request, 'path'),
    getZodLooseObjectFromProperty(list_priv_mon_users_request, 'query'),
  ]),
  outputSchema: list_priv_mon_users_response,
};
const INSTALLPRIVILEGEDACCESSDETECTIONPACKAGE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InstallPrivilegedAccessDetectionPackage',
  connectorGroup: 'internal',
  summary: `Installs the privileged access detection package for the Entity Analytics privileged user monitoring experience`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/privileged_user_monitoring/pad/install</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_analytics/privileged_user_monitoring/pad/install'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(install_privileged_access_detection_package_request, 'body'),
    getZodLooseObjectFromProperty(install_privileged_access_detection_package_request, 'path'),
    getZodLooseObjectFromProperty(install_privileged_access_detection_package_request, 'query'),
  ]),
  outputSchema: install_privileged_access_detection_package_response,
};
const GETPRIVILEGEDACCESSDETECTIONPACKAGESTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetPrivilegedAccessDetectionPackageStatus',
  connectorGroup: 'internal',
  summary: `Gets the status of the privileged access detection package for the Entity Analytics privileged user monitoring experience`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/privileged_user_monitoring/pad/status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/entity_analytics/privileged_user_monitoring/pad/status'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_privileged_access_detection_package_status_request, 'body'),
    getZodLooseObjectFromProperty(get_privileged_access_detection_package_status_request, 'path'),
    getZodLooseObjectFromProperty(get_privileged_access_detection_package_status_request, 'query'),
  ]),
  outputSchema: get_privileged_access_detection_package_status_response,
};
const INITENTITYSTORE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InitEntityStore',
  connectorGroup: 'internal',
  summary: `Initialize the Entity Store`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/enable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_store/enable'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'delay',
      'docsPerSecond',
      'enrichPolicyExecutionInterval',
      'entityTypes',
      'fieldHistoryLength',
      'filter',
      'frequency',
      'indexPattern',
      'lookbackPeriod',
      'maxPageSearchSize',
      'timeout',
      'timestampField',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(init_entity_store_request, 'body'),
    getZodLooseObjectFromProperty(init_entity_store_request, 'path'),
    getZodLooseObjectFromProperty(init_entity_store_request, 'query'),
  ]),
  outputSchema: init_entity_store_response,
};
const DELETEENTITYENGINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteEntityEngines',
  connectorGroup: 'internal',
  summary: `Delete Entity Engines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/entity_store/engines'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['entityTypes', 'delete_data'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_entity_engines_request, 'body'),
    getZodLooseObjectFromProperty(delete_entity_engines_request, 'path'),
    getZodLooseObjectFromProperty(delete_entity_engines_request, 'query'),
  ]),
  outputSchema: delete_entity_engines_response,
};
const LISTENTITYENGINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ListEntityEngines',
  connectorGroup: 'internal',
  summary: `List the Entity Engines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/entity_store/engines'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(list_entity_engines_request, 'body'),
    getZodLooseObjectFromProperty(list_entity_engines_request, 'path'),
    getZodLooseObjectFromProperty(list_entity_engines_request, 'query'),
  ]),
  outputSchema: list_entity_engines_response,
};
const DELETEENTITYENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteEntityEngine',
  connectorGroup: 'internal',
  summary: `Delete the Entity Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/{entityType}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/entity_store/engines/{entityType}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['entityType'],
    urlParams: ['delete_data', 'data'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_entity_engine_request, 'body'),
    getZodLooseObjectFromProperty(delete_entity_engine_request, 'path'),
    getZodLooseObjectFromProperty(delete_entity_engine_request, 'query'),
  ]),
  outputSchema: delete_entity_engine_response,
};
const GETENTITYENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetEntityEngine',
  connectorGroup: 'internal',
  summary: `Get an Entity Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/{entityType}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/entity_store/engines/{entityType}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['entityType'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_entity_engine_request, 'body'),
    getZodLooseObjectFromProperty(get_entity_engine_request, 'path'),
    getZodLooseObjectFromProperty(get_entity_engine_request, 'query'),
  ]),
  outputSchema: get_entity_engine_response,
};
const INITENTITYENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InitEntityEngine',
  connectorGroup: 'internal',
  summary: `Initialize an Entity Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/{entityType}/init</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_store/engines/{entityType}/init'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['entityType'],
    urlParams: [],
    bodyParams: [
      'delay',
      'docsPerSecond',
      'enrichPolicyExecutionInterval',
      'fieldHistoryLength',
      'filter',
      'frequency',
      'indexPattern',
      'lookbackPeriod',
      'maxPageSearchSize',
      'timeout',
      'timestampField',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(init_entity_engine_request, 'body'),
    getZodLooseObjectFromProperty(init_entity_engine_request, 'path'),
    getZodLooseObjectFromProperty(init_entity_engine_request, 'query'),
  ]),
  outputSchema: init_entity_engine_response,
};
const STARTENTITYENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.StartEntityEngine',
  connectorGroup: 'internal',
  summary: `Start an Entity Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/{entityType}/start</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_store/engines/{entityType}/start'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['entityType'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(start_entity_engine_request, 'body'),
    getZodLooseObjectFromProperty(start_entity_engine_request, 'path'),
    getZodLooseObjectFromProperty(start_entity_engine_request, 'query'),
  ]),
  outputSchema: start_entity_engine_response,
};
const STOPENTITYENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.StopEntityEngine',
  connectorGroup: 'internal',
  summary: `Stop an Entity Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/{entityType}/stop</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_store/engines/{entityType}/stop'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['entityType'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(stop_entity_engine_request, 'body'),
    getZodLooseObjectFromProperty(stop_entity_engine_request, 'path'),
    getZodLooseObjectFromProperty(stop_entity_engine_request, 'query'),
  ]),
  outputSchema: stop_entity_engine_response,
};
const APPLYENTITYENGINEDATAVIEWINDICES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ApplyEntityEngineDataviewIndices',
  connectorGroup: 'internal',
  summary: `Apply DataView indices to all installed engines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/apply_dataview_indices</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_store/engines/apply_dataview_indices'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(apply_entity_engine_dataview_indices_request, 'body'),
    getZodLooseObjectFromProperty(apply_entity_engine_dataview_indices_request, 'path'),
    getZodLooseObjectFromProperty(apply_entity_engine_dataview_indices_request, 'query'),
  ]),
  outputSchema: apply_entity_engine_dataview_indices_response,
};
const DELETESINGLEENTITY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteSingleEntity',
  connectorGroup: 'internal',
  summary: `Delete an entity in Entity Store`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/entities/{entityType}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a single entity in Entity Store.
The entity will be immediately deleted from the latest index.  It will remain available in historical snapshots if it has been snapshotted.  The delete operation does not prevent the entity from being recreated if it is observed again in the future. 
`,
  methods: ['DELETE'],
  patterns: ['/api/entity_store/entities/{entityType}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['entityType'],
    urlParams: [],
    bodyParams: ['id'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_single_entity_request, 'body'),
    getZodLooseObjectFromProperty(delete_single_entity_request, 'path'),
    getZodLooseObjectFromProperty(delete_single_entity_request, 'query'),
  ]),
  outputSchema: delete_single_entity_response,
};
const UPSERTENTITY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpsertEntity',
  connectorGroup: 'internal',
  summary: `Upsert an entity in Entity Store`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/entities/{entityType}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update or create an entity in Entity Store.
If the specified entity already exists, it is updated with the provided values.  If the entity does not exist, a new one is created. By default, only the following fields can be updated: * \`entity.attributes.*\` * \`entity.lifecycle.*\` * \`entity.behavior.*\` To update other fields, set the \`force\` query parameter to \`true\`. > info > Some fields always retain the first observed value. Updates to these fields will not appear in the final index.
> Due to technical limitations, not all updates are guaranteed to appear in the final list of observed values.
> Due to technical limitations, create is an async operation. The time for a document to be present in the  > final index depends on the entity store transform and usually takes more than 1 minute.
`,
  methods: ['PUT'],
  patterns: ['/api/entity_store/entities/{entityType}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['entityType'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(upsert_entity_request, 'body'),
    getZodLooseObjectFromProperty(upsert_entity_request, 'path'),
    getZodLooseObjectFromProperty(upsert_entity_request, 'query'),
  ]),
  outputSchema: upsert_entity_response,
};
const UPSERTENTITIESBULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpsertEntitiesBulk',
  connectorGroup: 'internal',
  summary: `Upsert many entities in Entity Store`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/entities/bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update or create many entities in Entity Store.
If the specified entity already exists, it is updated with the provided values.  If the entity does not exist, a new one is created.
The creation is asynchronous. The time for a document to be present in the  final index depends on the entity store transform and usually takes more than 1 minute.
`,
  methods: ['PUT'],
  patterns: ['/api/entity_store/entities/bulk'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['force'],
    bodyParams: ['entities'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(upsert_entities_bulk_request, 'body'),
    getZodLooseObjectFromProperty(upsert_entities_bulk_request, 'path'),
    getZodLooseObjectFromProperty(upsert_entities_bulk_request, 'query'),
  ]),
  outputSchema: upsert_entities_bulk_response,
};
const LISTENTITIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ListEntities',
  connectorGroup: 'internal',
  summary: `List Entity Store Entities`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/entities/list</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List entities records, paging, sorting and filtering as needed.`,
  methods: ['GET'],
  patterns: ['/api/entity_store/entities/list'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['sort_field', 'sort_order', 'page', 'per_page', 'filterQuery', 'entity_types'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(list_entities_request, 'body'),
    getZodLooseObjectFromProperty(list_entities_request, 'path'),
    getZodLooseObjectFromProperty(list_entities_request, 'query'),
  ]),
  outputSchema: list_entities_response,
};
const GETENTITYSTORESTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetEntityStoreStatus',
  connectorGroup: 'internal',
  summary: `Get the status of the Entity Store`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/entity_store/status'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['include_components'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_entity_store_status_request, 'body'),
    getZodLooseObjectFromProperty(get_entity_store_status_request, 'path'),
    getZodLooseObjectFromProperty(get_entity_store_status_request, 'query'),
  ]),
  outputSchema: get_entity_store_status_response,
};
const DELETEEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteExceptionList',
  connectorGroup: 'internal',
  summary: `Delete an exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an exception list using the \`id\` or \`list_id\` field.`,
  methods: ['DELETE'],
  patterns: ['/api/exception_lists'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'list_id', 'namespace_type'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_exception_list_request, 'body'),
    getZodLooseObjectFromProperty(delete_exception_list_request, 'path'),
    getZodLooseObjectFromProperty(delete_exception_list_request, 'query'),
  ]),
  outputSchema: delete_exception_list_response,
};
const READEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadExceptionList',
  connectorGroup: 'internal',
  summary: `Get exception list details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an exception list using the \`id\` or \`list_id\` field.`,
  methods: ['GET'],
  patterns: ['/api/exception_lists'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'list_id', 'namespace_type'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_exception_list_request, 'body'),
    getZodLooseObjectFromProperty(read_exception_list_request, 'path'),
    getZodLooseObjectFromProperty(read_exception_list_request, 'query'),
  ]),
  outputSchema: read_exception_list_response,
};
const CREATEEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateExceptionList',
  connectorGroup: 'internal',
  summary: `Create an exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

An exception list groups exception items and can be associated with detection rules. You can assign exception lists to multiple detection rules.
> info
> All exception items added to the same list are evaluated using \`OR\` logic. That is, if any of the items in a list evaluate to \`true\`, the exception prevents the rule from generating an alert. Likewise, \`OR\` logic is used for evaluating exceptions when more than one exception list is assigned to a rule. To use the \`AND\` operator, you can define multiple clauses (\`entries\`) in a single exception item.
`,
  methods: ['POST'],
  patterns: ['/api/exception_lists'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'description',
      'list_id',
      'meta',
      'name',
      'namespace_type',
      'os_types',
      'tags',
      'type',
      'version',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_exception_list_request, 'body'),
    getZodLooseObjectFromProperty(create_exception_list_request, 'path'),
    getZodLooseObjectFromProperty(create_exception_list_request, 'query'),
  ]),
  outputSchema: create_exception_list_response,
};
const UPDATEEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateExceptionList',
  connectorGroup: 'internal',
  summary: `Update an exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an exception list using the \`id\` or \`list_id\` field.`,
  methods: ['PUT'],
  patterns: ['/api/exception_lists'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      '_version',
      'description',
      'id',
      'list_id',
      'meta',
      'name',
      'namespace_type',
      'os_types',
      'tags',
      'type',
      'version',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_exception_list_request, 'body'),
    getZodLooseObjectFromProperty(update_exception_list_request, 'path'),
    getZodLooseObjectFromProperty(update_exception_list_request, 'query'),
  ]),
  outputSchema: update_exception_list_response,
};
const DUPLICATEEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DuplicateExceptionList',
  connectorGroup: 'internal',
  summary: `Duplicate an exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/_duplicate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Duplicate an existing exception list.`,
  methods: ['POST'],
  patterns: ['/api/exception_lists/_duplicate'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['list_id', 'namespace_type', 'include_expired_exceptions'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(duplicate_exception_list_request, 'body'),
    getZodLooseObjectFromProperty(duplicate_exception_list_request, 'path'),
    getZodLooseObjectFromProperty(duplicate_exception_list_request, 'query'),
  ]),
  outputSchema: duplicate_exception_list_response,
};
const EXPORTEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ExportExceptionList',
  connectorGroup: 'internal',
  summary: `Export an exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/_export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Export an exception list and its associated items to an NDJSON file.`,
  methods: ['POST'],
  patterns: ['/api/exception_lists/_export'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'list_id', 'namespace_type', 'include_expired_exceptions'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(export_exception_list_request, 'body'),
    getZodLooseObjectFromProperty(export_exception_list_request, 'path'),
    getZodLooseObjectFromProperty(export_exception_list_request, 'query'),
  ]),
  outputSchema: export_exception_list_response,
};
const FINDEXCEPTIONLISTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindExceptionLists',
  connectorGroup: 'internal',
  summary: `Get exception lists`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all exception list containers.`,
  methods: ['GET'],
  patterns: ['/api/exception_lists/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['filter', 'namespace_type', 'page', 'per_page', 'sort_field', 'sort_order'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_exception_lists_request, 'body'),
    getZodLooseObjectFromProperty(find_exception_lists_request, 'path'),
    getZodLooseObjectFromProperty(find_exception_lists_request, 'query'),
  ]),
  outputSchema: find_exception_lists_response,
};
const IMPORTEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ImportExceptionList',
  connectorGroup: 'internal',
  summary: `Import an exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/_import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Import an exception list and its associated items from an NDJSON file.`,
  methods: ['POST'],
  patterns: ['/api/exception_lists/_import'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['overwrite', 'as_new_list'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(import_exception_list_request, 'body'),
    getZodLooseObjectFromProperty(import_exception_list_request, 'path'),
    getZodLooseObjectFromProperty(import_exception_list_request, 'query'),
  ]),
  outputSchema: import_exception_list_response,
};
const DELETEEXCEPTIONLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteExceptionListItem',
  connectorGroup: 'internal',
  summary: `Delete an exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an exception list item using the \`id\` or \`item_id\` field.`,
  methods: ['DELETE'],
  patterns: ['/api/exception_lists/items'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'item_id', 'namespace_type'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_exception_list_item_request, 'body'),
    getZodLooseObjectFromProperty(delete_exception_list_item_request, 'path'),
    getZodLooseObjectFromProperty(delete_exception_list_item_request, 'query'),
  ]),
  outputSchema: delete_exception_list_item_response,
};
const READEXCEPTIONLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadExceptionListItem',
  connectorGroup: 'internal',
  summary: `Get an exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an exception list item using the \`id\` or \`item_id\` field.`,
  methods: ['GET'],
  patterns: ['/api/exception_lists/items'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'item_id', 'namespace_type'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_exception_list_item_request, 'body'),
    getZodLooseObjectFromProperty(read_exception_list_item_request, 'path'),
    getZodLooseObjectFromProperty(read_exception_list_item_request, 'query'),
  ]),
  outputSchema: read_exception_list_item_response,
};
const CREATEEXCEPTIONLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateExceptionListItem',
  connectorGroup: 'internal',
  summary: `Create an exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create an exception item and associate it with the specified exception list.
> info
> Before creating exception items, you must create an exception list.
`,
  methods: ['POST'],
  patterns: ['/api/exception_lists/items'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'comments',
      'description',
      'entries',
      'expire_time',
      'item_id',
      'list_id',
      'meta',
      'name',
      'namespace_type',
      'os_types',
      'tags',
      'type',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_exception_list_item_request, 'body'),
    getZodLooseObjectFromProperty(create_exception_list_item_request, 'path'),
    getZodLooseObjectFromProperty(create_exception_list_item_request, 'query'),
  ]),
  outputSchema: create_exception_list_item_response,
};
const UPDATEEXCEPTIONLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateExceptionListItem',
  connectorGroup: 'internal',
  summary: `Update an exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an exception list item using the \`id\` or \`item_id\` field.`,
  methods: ['PUT'],
  patterns: ['/api/exception_lists/items'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      '_version',
      'comments',
      'description',
      'entries',
      'expire_time',
      'id',
      'item_id',
      'list_id',
      'meta',
      'name',
      'namespace_type',
      'os_types',
      'tags',
      'type',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_exception_list_item_request, 'body'),
    getZodLooseObjectFromProperty(update_exception_list_item_request, 'path'),
    getZodLooseObjectFromProperty(update_exception_list_item_request, 'query'),
  ]),
  outputSchema: update_exception_list_item_response,
};
const FINDEXCEPTIONLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindExceptionListItems',
  connectorGroup: 'internal',
  summary: `Get exception list items`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/items/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all exception list items in the specified list.`,
  methods: ['GET'],
  patterns: ['/api/exception_lists/items/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'list_id',
      'filter',
      'namespace_type',
      'search',
      'page',
      'per_page',
      'sort_field',
      'sort_order',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_exception_list_items_request, 'body'),
    getZodLooseObjectFromProperty(find_exception_list_items_request, 'path'),
    getZodLooseObjectFromProperty(find_exception_list_items_request, 'query'),
  ]),
  outputSchema: find_exception_list_items_response,
};
const READEXCEPTIONLISTSUMMARY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadExceptionListSummary',
  connectorGroup: 'internal',
  summary: `Get an exception list summary`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/summary</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a summary of the specified exception list.`,
  methods: ['GET'],
  patterns: ['/api/exception_lists/summary'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'list_id', 'namespace_type', 'filter'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_exception_list_summary_request, 'body'),
    getZodLooseObjectFromProperty(read_exception_list_summary_request, 'path'),
    getZodLooseObjectFromProperty(read_exception_list_summary_request, 'query'),
  ]),
  outputSchema: read_exception_list_summary_response,
};
const CREATESHAREDEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateSharedExceptionList',
  connectorGroup: 'internal',
  summary: `Create a shared exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exceptions/shared</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

An exception list groups exception items and can be associated with detection rules. A shared exception list can apply to multiple detection rules.
> info
> All exception items added to the same list are evaluated using \`OR\` logic. That is, if any of the items in a list evaluate to \`true\`, the exception prevents the rule from generating an alert. Likewise, \`OR\` logic is used for evaluating exceptions when more than one exception list is assigned to a rule. To use the \`AND\` operator, you can define multiple clauses (\`entries\`) in a single exception item.
`,
  methods: ['POST'],
  patterns: ['/api/exceptions/shared'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['description', 'name'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_shared_exception_list_request, 'body'),
    getZodLooseObjectFromProperty(create_shared_exception_list_request, 'path'),
    getZodLooseObjectFromProperty(create_shared_exception_list_request, 'query'),
  ]),
  outputSchema: create_shared_exception_list_response,
};
const GET_FEATURES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_features',
  connectorGroup: 'internal',
  summary: `Get features`,
  description: `Get information about all Kibana features. Features are used by spaces and security to refine and secure access to Kibana.
`,
  methods: ['GET'],
  patterns: ['/api/features'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_features_request, 'body'),
    getZodLooseObjectFromProperty(get_features_request, 'path'),
    getZodLooseObjectFromProperty(get_features_request, 'query'),
  ]),
  outputSchema: get_features_response,
};
const GET_FLEET_AGENT_DOWNLOAD_SOURCES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_download_sources',
  connectorGroup: 'internal',
  summary: `Get agent binary download sources`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_download_sources</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_download_sources'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agent_download_sources_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agent_download_sources_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agent_download_sources_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_download_sources_response,
};
const POST_FLEET_AGENT_DOWNLOAD_SOURCES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_download_sources',
  connectorGroup: 'internal',
  summary: `Create an agent binary download source`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_download_sources</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agent_download_sources'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['host', 'id', 'is_default', 'name', 'proxy_id', 'secrets', 'ssl'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agent_download_sources_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agent_download_sources_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agent_download_sources_request, 'query'),
  ]),
  outputSchema: post_fleet_agent_download_sources_response,
};
const DELETE_FLEET_AGENT_DOWNLOAD_SOURCES_SOURCEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_agent_download_sources_sourceid',
  connectorGroup: 'internal',
  summary: `Delete an agent binary download source`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_download_sources/{sourceId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an agent binary download source by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/agent_download_sources/{sourceId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['sourceId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_fleet_agent_download_sources_sourceid_request, 'body'),
    getZodLooseObjectFromProperty(delete_fleet_agent_download_sources_sourceid_request, 'path'),
    getZodLooseObjectFromProperty(delete_fleet_agent_download_sources_sourceid_request, 'query'),
  ]),
  outputSchema: delete_fleet_agent_download_sources_sourceid_response,
};
const GET_FLEET_AGENT_DOWNLOAD_SOURCES_SOURCEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_download_sources_sourceid',
  connectorGroup: 'internal',
  summary: `Get an agent binary download source`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_download_sources/{sourceId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get an agent binary download source by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_download_sources/{sourceId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['sourceId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agent_download_sources_sourceid_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agent_download_sources_sourceid_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agent_download_sources_sourceid_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_download_sources_sourceid_response,
};
const PUT_FLEET_AGENT_DOWNLOAD_SOURCES_SOURCEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_agent_download_sources_sourceid',
  connectorGroup: 'internal',
  summary: `Update an agent binary download source`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_download_sources/{sourceId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an agent binary download source by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/agent_download_sources/{sourceId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['sourceId'],
    urlParams: [],
    bodyParams: ['host', 'id', 'is_default', 'name', 'proxy_id', 'secrets', 'ssl'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_fleet_agent_download_sources_sourceid_request, 'body'),
    getZodLooseObjectFromProperty(put_fleet_agent_download_sources_sourceid_request, 'path'),
    getZodLooseObjectFromProperty(put_fleet_agent_download_sources_sourceid_request, 'query'),
  ]),
  outputSchema: put_fleet_agent_download_sources_sourceid_response,
};
const GET_FLEET_AGENT_POLICIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_policies',
  connectorGroup: 'internal',
  summary: `Get agent policies`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-agents-read OR fleet-setup.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_policies'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'page',
      'perPage',
      'sortField',
      'sortOrder',
      'showUpgradeable',
      'kuery',
      'noAgentCount',
      'withAgentCount',
      'full',
      'format',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agent_policies_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agent_policies_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agent_policies_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_policies_response,
};
const POST_FLEET_AGENT_POLICIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies',
  connectorGroup: 'internal',
  summary: `Create an agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agent_policies'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['sys_monitoring'],
    bodyParams: [
      'advanced_settings',
      'agent_features',
      'agentless',
      'data_output_id',
      'description',
      'download_source_id',
      'fleet_server_host_id',
      'force',
      'global_data_tags',
      'has_fleet_server',
      'id',
      'inactivity_timeout',
      'is_default',
      'is_default_fleet_server',
      'is_managed',
      'is_protected',
      'keep_monitoring_alive',
      'monitoring_diagnostics',
      'monitoring_enabled',
      'monitoring_http',
      'monitoring_output_id',
      'monitoring_pprof_enabled',
      'name',
      'namespace',
      'overrides',
      'required_versions',
      'space_ids',
      'supports_agentless',
      'unenroll_timeout',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agent_policies_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agent_policies_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agent_policies_request, 'query'),
  ]),
  outputSchema: post_fleet_agent_policies_response,
};
const POST_FLEET_AGENT_POLICIES_BULK_GET_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies_bulk_get',
  connectorGroup: 'internal',
  summary: `Bulk get agent policies`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/_bulk_get</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-agents-read OR fleet-setup.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agent_policies/_bulk_get'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['format'],
    bodyParams: ['full', 'ids', 'ignoreMissing'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agent_policies_bulk_get_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agent_policies_bulk_get_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agent_policies_bulk_get_request, 'query'),
  ]),
  outputSchema: post_fleet_agent_policies_bulk_get_response,
};
const GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_policies_agentpolicyid',
  connectorGroup: 'internal',
  summary: `Get an agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get an agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-agents-read OR fleet-setup.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['agentPolicyId'],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_policies_agentpolicyid_response,
};
const PUT_FLEET_AGENT_POLICIES_AGENTPOLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_agent_policies_agentpolicyid',
  connectorGroup: 'internal',
  summary: `Update an agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['agentPolicyId'],
    urlParams: ['format'],
    bodyParams: [
      'advanced_settings',
      'agent_features',
      'agentless',
      'bumpRevision',
      'data_output_id',
      'description',
      'download_source_id',
      'fleet_server_host_id',
      'force',
      'global_data_tags',
      'has_fleet_server',
      'id',
      'inactivity_timeout',
      'is_default',
      'is_default_fleet_server',
      'is_managed',
      'is_protected',
      'keep_monitoring_alive',
      'monitoring_diagnostics',
      'monitoring_enabled',
      'monitoring_http',
      'monitoring_output_id',
      'monitoring_pprof_enabled',
      'name',
      'namespace',
      'overrides',
      'required_versions',
      'space_ids',
      'supports_agentless',
      'unenroll_timeout',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_fleet_agent_policies_agentpolicyid_request, 'body'),
    getZodLooseObjectFromProperty(put_fleet_agent_policies_agentpolicyid_request, 'path'),
    getZodLooseObjectFromProperty(put_fleet_agent_policies_agentpolicyid_request, 'query'),
  ]),
  outputSchema: put_fleet_agent_policies_agentpolicyid_response,
};
const GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_AUTO_UPGRADE_AGENTS_STATUS_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status',
    connectorGroup: 'internal',
    summary: `Get auto upgrade agent status`,
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}/auto_upgrade_agents_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get auto upgrade agent status<br/><br/>[Required authorization] Route required privileges: fleet-agents-read.`,
    methods: ['GET'],
    patterns: ['/api/fleet/agent_policies/{agentPolicyId}/auto_upgrade_agents_status'],
    documentation: null,
    parameterTypes: {
      headerParams: [],
      pathParams: ['agentPolicyId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.union([
      getZodLooseObjectFromProperty(
        get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status_request,
        'body'
      ),
      getZodLooseObjectFromProperty(
        get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status_request,
        'path'
      ),
      getZodLooseObjectFromProperty(
        get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status_request,
        'query'
      ),
    ]),
    outputSchema: get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status_response,
  };
const POST_FLEET_AGENT_POLICIES_AGENTPOLICYID_COPY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies_agentpolicyid_copy',
  connectorGroup: 'internal',
  summary: `Copy an agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}/copy</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Copy an agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}/copy'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['agentPolicyId'],
    urlParams: ['format'],
    bodyParams: ['description', 'name'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agent_policies_agentpolicyid_copy_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agent_policies_agentpolicyid_copy_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agent_policies_agentpolicyid_copy_request, 'query'),
  ]),
  outputSchema: post_fleet_agent_policies_agentpolicyid_copy_response,
};
const GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_DOWNLOAD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_policies_agentpolicyid_download',
  connectorGroup: 'internal',
  summary: `Download an agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}/download</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Download an agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-setup.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}/download'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['agentPolicyId'],
    urlParams: ['download', 'standalone', 'kubernetes'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_download_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_download_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_download_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_policies_agentpolicyid_download_response,
};
const GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_FULL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_policies_agentpolicyid_full',
  connectorGroup: 'internal',
  summary: `Get a full agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}/full</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a full agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}/full'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['agentPolicyId'],
    urlParams: ['download', 'standalone', 'kubernetes'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_full_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_full_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_full_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_policies_agentpolicyid_full_response,
};
const GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_OUTPUTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_policies_agentpolicyid_outputs',
  connectorGroup: 'internal',
  summary: `Get outputs for an agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}/outputs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of outputs associated with agent policy by policy id.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read AND fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}/outputs'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['agentPolicyId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_outputs_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_outputs_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_outputs_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_policies_agentpolicyid_outputs_response,
};
const POST_FLEET_AGENT_POLICIES_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies_delete',
  connectorGroup: 'internal',
  summary: `Delete an agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agent_policies/delete'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['agentPolicyId', 'force'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agent_policies_delete_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agent_policies_delete_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agent_policies_delete_request, 'query'),
  ]),
  outputSchema: post_fleet_agent_policies_delete_response,
};
const POST_FLEET_AGENT_POLICIES_OUTPUTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies_outputs',
  connectorGroup: 'internal',
  summary: `Get outputs for agent policies`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/outputs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of outputs associated with agent policies.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read AND fleet-settings-read.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agent_policies/outputs'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['ids'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agent_policies_outputs_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agent_policies_outputs_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agent_policies_outputs_request, 'query'),
  ]),
  outputSchema: post_fleet_agent_policies_outputs_response,
};
const GET_FLEET_AGENT_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_status',
  connectorGroup: 'internal',
  summary: `Get an agent status summary`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_status'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['policyId', 'policyIds', 'kuery'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agent_status_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agent_status_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agent_status_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_status_response,
};
const GET_FLEET_AGENT_STATUS_DATA_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_status_data',
  connectorGroup: 'internal',
  summary: `Get incoming agent data`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_status/data</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_status/data'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['agentsIds', 'pkgName', 'pkgVersion', 'previewData'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agent_status_data_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agent_status_data_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agent_status_data_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_status_data_response,
};
const POST_FLEET_AGENTLESS_POLICIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agentless_policies',
  connectorGroup: 'internal',
  summary: `Create an agentless policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agentless_policies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create an agentless policy`,
  methods: ['POST'],
  patterns: ['/api/fleet/agentless_policies'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['format'],
    bodyParams: [
      'additional_datastreams_permissions',
      'description',
      'force',
      'id',
      'inputs',
      'name',
      'namespace',
      'package',
      'vars',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agentless_policies_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agentless_policies_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agentless_policies_request, 'query'),
  ]),
  outputSchema: post_fleet_agentless_policies_response,
};
const DELETE_FLEET_AGENTLESS_POLICIES_POLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_agentless_policies_policyid',
  connectorGroup: 'internal',
  summary: `Delete an agentless policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agentless_policies/{policyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an agentless policy`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/agentless_policies/{policyId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['policyId'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_fleet_agentless_policies_policyid_request, 'body'),
    getZodLooseObjectFromProperty(delete_fleet_agentless_policies_policyid_request, 'path'),
    getZodLooseObjectFromProperty(delete_fleet_agentless_policies_policyid_request, 'query'),
  ]),
  outputSchema: delete_fleet_agentless_policies_policyid_response,
};
const GET_FLEET_AGENTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents',
  connectorGroup: 'internal',
  summary: `Get agents`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agents'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'page',
      'perPage',
      'kuery',
      'showAgentless',
      'showInactive',
      'withMetrics',
      'showUpgradeable',
      'getStatusSummary',
      'sortField',
      'sortOrder',
      'searchAfter',
      'openPit',
      'pitId',
      'pitKeepAlive',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agents_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agents_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agents_request, 'query'),
  ]),
  outputSchema: get_fleet_agents_response,
};
const POST_FLEET_AGENTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents',
  connectorGroup: 'internal',
  summary: `Get agents by action ids`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['actionIds'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agents_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agents_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agents_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_response,
};
const DELETE_FLEET_AGENTS_AGENTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_agents_agentid',
  connectorGroup: 'internal',
  summary: `Delete an agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an agent by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/agents/{agentId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_fleet_agents_agentid_request, 'body'),
    getZodLooseObjectFromProperty(delete_fleet_agents_agentid_request, 'path'),
    getZodLooseObjectFromProperty(delete_fleet_agents_agentid_request, 'query'),
  ]),
  outputSchema: delete_fleet_agents_agentid_response,
};
const GET_FLEET_AGENTS_AGENTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_agentid',
  connectorGroup: 'internal',
  summary: `Get an agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get an agent by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agents/{agentId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['agentId'],
    urlParams: ['withMetrics'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agents_agentid_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agents_agentid_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agents_agentid_request, 'query'),
  ]),
  outputSchema: get_fleet_agents_agentid_response,
};
const PUT_FLEET_AGENTS_AGENTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_agents_agentid',
  connectorGroup: 'internal',
  summary: `Update an agent by ID`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an agent by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/agents/{agentId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: ['tags', 'user_provided_metadata'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_fleet_agents_agentid_request, 'body'),
    getZodLooseObjectFromProperty(put_fleet_agents_agentid_request, 'path'),
    getZodLooseObjectFromProperty(put_fleet_agents_agentid_request, 'query'),
  ]),
  outputSchema: put_fleet_agents_agentid_response,
};
const POST_FLEET_AGENTS_AGENTID_ACTIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_actions',
  connectorGroup: 'internal',
  summary: `Create an agent action`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/actions</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/{agentId}/actions'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: ['action'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_actions_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_actions_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_actions_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_agentid_actions_response,
};
const POST_FLEET_AGENTS_AGENTID_MIGRATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_migrate',
  connectorGroup: 'internal',
  summary: `Migrate a single agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/migrate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Migrate a single agent to another cluster.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/{agentId}/migrate'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: ['enrollment_token', 'settings', 'uri'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_migrate_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_migrate_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_migrate_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_agentid_migrate_response,
};
const POST_FLEET_AGENTS_AGENTID_REASSIGN_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_reassign',
  connectorGroup: 'internal',
  summary: `Reassign an agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/reassign</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/{agentId}/reassign'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: ['policy_id'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_reassign_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_reassign_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_reassign_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_agentid_reassign_response,
};
const POST_FLEET_AGENTS_AGENTID_REQUEST_DIAGNOSTICS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_request_diagnostics',
  connectorGroup: 'internal',
  summary: `Request agent diagnostics`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/request_diagnostics</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/{agentId}/request_diagnostics'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: ['additional_metrics'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_request_diagnostics_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_request_diagnostics_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_request_diagnostics_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_agentid_request_diagnostics_response,
};
const POST_FLEET_AGENTS_AGENTID_UNENROLL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_unenroll',
  connectorGroup: 'internal',
  summary: `Unenroll an agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/unenroll</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/{agentId}/unenroll'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: ['force', 'revoke'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_unenroll_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_unenroll_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_unenroll_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_agentid_unenroll_response,
};
const POST_FLEET_AGENTS_AGENTID_UPGRADE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_upgrade',
  connectorGroup: 'internal',
  summary: `Upgrade an agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/upgrade</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/{agentId}/upgrade'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: ['force', 'skipRateLimitCheck', 'source_uri', 'version'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_upgrade_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_upgrade_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agents_agentid_upgrade_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_agentid_upgrade_response,
};
const GET_FLEET_AGENTS_AGENTID_UPLOADS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_agentid_uploads',
  connectorGroup: 'internal',
  summary: `Get agent uploads`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/uploads</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agents/{agentId}/uploads'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agents_agentid_uploads_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agents_agentid_uploads_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agents_agentid_uploads_request, 'query'),
  ]),
  outputSchema: get_fleet_agents_agentid_uploads_response,
};
const GET_FLEET_AGENTS_ACTION_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_action_status',
  connectorGroup: 'internal',
  summary: `Get an agent action status`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/action_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agents/action_status'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['page', 'perPage', 'date', 'latest', 'errorSize'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agents_action_status_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agents_action_status_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agents_action_status_request, 'query'),
  ]),
  outputSchema: get_fleet_agents_action_status_response,
};
const POST_FLEET_AGENTS_ACTIONS_ACTIONID_CANCEL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_actions_actionid_cancel',
  connectorGroup: 'internal',
  summary: `Cancel an agent action`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/actions/{actionId}/cancel</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/actions/{actionId}/cancel'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['actionId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agents_actions_actionid_cancel_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agents_actions_actionid_cancel_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agents_actions_actionid_cancel_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_actions_actionid_cancel_response,
};
const GET_FLEET_AGENTS_AVAILABLE_VERSIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_available_versions',
  connectorGroup: 'internal',
  summary: `Get available agent versions`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/available_versions</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agents/available_versions'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agents_available_versions_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agents_available_versions_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agents_available_versions_request, 'query'),
  ]),
  outputSchema: get_fleet_agents_available_versions_response,
};
const POST_FLEET_AGENTS_BULK_MIGRATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_migrate',
  connectorGroup: 'internal',
  summary: `Migrate multiple agents`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_migrate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Bulk migrate agents to another cluster.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/bulk_migrate'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['agents', 'batchSize', 'enrollment_token', 'settings', 'uri'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_migrate_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_migrate_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_migrate_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_bulk_migrate_response,
};
const POST_FLEET_AGENTS_BULK_REASSIGN_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_reassign',
  connectorGroup: 'internal',
  summary: `Bulk reassign agents`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_reassign</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/bulk_reassign'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['agents', 'batchSize', 'includeInactive', 'policy_id'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_reassign_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_reassign_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_reassign_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_bulk_reassign_response,
};
const POST_FLEET_AGENTS_BULK_REQUEST_DIAGNOSTICS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_request_diagnostics',
  connectorGroup: 'internal',
  summary: `Bulk request diagnostics from agents`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_request_diagnostics</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/bulk_request_diagnostics'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['additional_metrics', 'agents', 'batchSize'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_request_diagnostics_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_request_diagnostics_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_request_diagnostics_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_bulk_request_diagnostics_response,
};
const POST_FLEET_AGENTS_BULK_UNENROLL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_unenroll',
  connectorGroup: 'internal',
  summary: `Bulk unenroll agents`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_unenroll</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/bulk_unenroll'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['agents', 'batchSize', 'force', 'includeInactive', 'revoke'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_unenroll_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_unenroll_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_unenroll_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_bulk_unenroll_response,
};
const POST_FLEET_AGENTS_BULK_UPDATE_AGENT_TAGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_update_agent_tags',
  connectorGroup: 'internal',
  summary: `Bulk update agent tags`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_update_agent_tags</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/bulk_update_agent_tags'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['agents', 'batchSize', 'includeInactive', 'tagsToAdd', 'tagsToRemove'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_update_agent_tags_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_update_agent_tags_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_update_agent_tags_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_bulk_update_agent_tags_response,
};
const POST_FLEET_AGENTS_BULK_UPGRADE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_upgrade',
  connectorGroup: 'internal',
  summary: `Bulk upgrade agents`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_upgrade</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/bulk_upgrade'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'agents',
      'batchSize',
      'force',
      'includeInactive',
      'rollout_duration_seconds',
      'skipRateLimitCheck',
      'source_uri',
      'start_time',
      'version',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_upgrade_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_upgrade_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agents_bulk_upgrade_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_bulk_upgrade_response,
};
const DELETE_FLEET_AGENTS_FILES_FILEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_agents_files_fileid',
  connectorGroup: 'internal',
  summary: `Delete an uploaded file`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/files/{fileId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a file uploaded by an agent.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/agents/files/{fileId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['fileId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_fleet_agents_files_fileid_request, 'body'),
    getZodLooseObjectFromProperty(delete_fleet_agents_files_fileid_request, 'path'),
    getZodLooseObjectFromProperty(delete_fleet_agents_files_fileid_request, 'query'),
  ]),
  outputSchema: delete_fleet_agents_files_fileid_response,
};
const GET_FLEET_AGENTS_FILES_FILEID_FILENAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_files_fileid_filename',
  connectorGroup: 'internal',
  summary: `Get an uploaded file`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/files/{fileId}/{fileName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a file uploaded by an agent.<br/><br/>[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agents/files/{fileId}/{fileName}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['fileId', 'fileName'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agents_files_fileid_filename_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agents_files_fileid_filename_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agents_files_fileid_filename_request, 'query'),
  ]),
  outputSchema: get_fleet_agents_files_fileid_filename_response,
};
const GET_FLEET_AGENTS_SETUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_setup',
  connectorGroup: 'internal',
  summary: `Get agent setup info`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/setup</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read OR fleet-agent-policies-read OR fleet-settings-read OR fleet-setup.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agents/setup'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agents_setup_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agents_setup_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agents_setup_request, 'query'),
  ]),
  outputSchema: get_fleet_agents_setup_response,
};
const POST_FLEET_AGENTS_SETUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_setup',
  connectorGroup: 'internal',
  summary: `Initiate agent setup`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/setup</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read OR fleet-agent-policies-read OR fleet-settings-read OR fleet-setup.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/setup'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_agents_setup_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_agents_setup_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_agents_setup_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_setup_response,
};
const GET_FLEET_AGENTS_TAGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_tags',
  connectorGroup: 'internal',
  summary: `Get agent tags`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/tags</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agents/tags'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['kuery', 'showInactive'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_agents_tags_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_agents_tags_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_agents_tags_request, 'query'),
  ]),
  outputSchema: get_fleet_agents_tags_response,
};
const GET_FLEET_CHECK_PERMISSIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_check_permissions',
  connectorGroup: 'internal',
  summary: `Check permissions`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/check-permissions</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/fleet/check-permissions'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['fleetServerSetup'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_check_permissions_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_check_permissions_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_check_permissions_request, 'query'),
  ]),
  outputSchema: get_fleet_check_permissions_response,
};
const GET_FLEET_CLOUD_CONNECTORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_cloud_connectors',
  connectorGroup: 'internal',
  summary: `Get cloud connectors`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/cloud_connectors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR integrations-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/cloud_connectors'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['page', 'perPage', 'kuery'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_cloud_connectors_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_cloud_connectors_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_cloud_connectors_request, 'query'),
  ]),
  outputSchema: get_fleet_cloud_connectors_response,
};
const POST_FLEET_CLOUD_CONNECTORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_cloud_connectors',
  connectorGroup: 'internal',
  summary: `Create cloud connector`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/cloud_connectors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-all OR integrations-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/cloud_connectors'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['cloudProvider', 'name', 'vars'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_cloud_connectors_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_cloud_connectors_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_cloud_connectors_request, 'query'),
  ]),
  outputSchema: post_fleet_cloud_connectors_response,
};
const DELETE_FLEET_CLOUD_CONNECTORS_CLOUDCONNECTORID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_cloud_connectors_cloudconnectorid',
  connectorGroup: 'internal',
  summary: `Delete cloud connector (supports force deletion)`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/cloud_connectors/{cloudConnectorId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-all OR integrations-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/cloud_connectors/{cloudConnectorId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['cloudConnectorId'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_fleet_cloud_connectors_cloudconnectorid_request, 'body'),
    getZodLooseObjectFromProperty(delete_fleet_cloud_connectors_cloudconnectorid_request, 'path'),
    getZodLooseObjectFromProperty(delete_fleet_cloud_connectors_cloudconnectorid_request, 'query'),
  ]),
  outputSchema: delete_fleet_cloud_connectors_cloudconnectorid_response,
};
const GET_FLEET_CLOUD_CONNECTORS_CLOUDCONNECTORID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_cloud_connectors_cloudconnectorid',
  connectorGroup: 'internal',
  summary: `Get cloud connector`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/cloud_connectors/{cloudConnectorId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR integrations-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/cloud_connectors/{cloudConnectorId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['cloudConnectorId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_cloud_connectors_cloudconnectorid_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_cloud_connectors_cloudconnectorid_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_cloud_connectors_cloudconnectorid_request, 'query'),
  ]),
  outputSchema: get_fleet_cloud_connectors_cloudconnectorid_response,
};
const PUT_FLEET_CLOUD_CONNECTORS_CLOUDCONNECTORID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_cloud_connectors_cloudconnectorid',
  connectorGroup: 'internal',
  summary: `Update cloud connector`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/cloud_connectors/{cloudConnectorId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-all OR integrations-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/cloud_connectors/{cloudConnectorId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['cloudConnectorId'],
    urlParams: [],
    bodyParams: ['name', 'vars'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_fleet_cloud_connectors_cloudconnectorid_request, 'body'),
    getZodLooseObjectFromProperty(put_fleet_cloud_connectors_cloudconnectorid_request, 'path'),
    getZodLooseObjectFromProperty(put_fleet_cloud_connectors_cloudconnectorid_request, 'query'),
  ]),
  outputSchema: put_fleet_cloud_connectors_cloudconnectorid_response,
};
const GET_FLEET_DATA_STREAMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_data_streams',
  connectorGroup: 'internal',
  summary: `Get data streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/data_streams</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all AND fleet-agent-policies-all AND fleet-settings-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/data_streams'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_data_streams_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_data_streams_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_data_streams_request, 'query'),
  ]),
  outputSchema: get_fleet_data_streams_response,
};
const GET_FLEET_ENROLLMENT_API_KEYS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_enrollment_api_keys',
  connectorGroup: 'internal',
  summary: `Get enrollment API keys`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/enrollment_api_keys</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all OR fleet-setup.`,
  methods: ['GET'],
  patterns: ['/api/fleet/enrollment_api_keys'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['page', 'perPage', 'kuery'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_enrollment_api_keys_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_enrollment_api_keys_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_enrollment_api_keys_request, 'query'),
  ]),
  outputSchema: get_fleet_enrollment_api_keys_response,
};
const POST_FLEET_ENROLLMENT_API_KEYS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_enrollment_api_keys',
  connectorGroup: 'internal',
  summary: `Create an enrollment API key`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/enrollment_api_keys</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/enrollment_api_keys'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['expiration', 'name', 'policy_id'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_enrollment_api_keys_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_enrollment_api_keys_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_enrollment_api_keys_request, 'query'),
  ]),
  outputSchema: post_fleet_enrollment_api_keys_response,
};
const DELETE_FLEET_ENROLLMENT_API_KEYS_KEYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_enrollment_api_keys_keyid',
  connectorGroup: 'internal',
  summary: `Revoke an enrollment API key`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/enrollment_api_keys/{keyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Revoke an enrollment API key by ID by marking it as inactive.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/enrollment_api_keys/{keyId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['keyId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_fleet_enrollment_api_keys_keyid_request, 'body'),
    getZodLooseObjectFromProperty(delete_fleet_enrollment_api_keys_keyid_request, 'path'),
    getZodLooseObjectFromProperty(delete_fleet_enrollment_api_keys_keyid_request, 'query'),
  ]),
  outputSchema: delete_fleet_enrollment_api_keys_keyid_response,
};
const GET_FLEET_ENROLLMENT_API_KEYS_KEYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_enrollment_api_keys_keyid',
  connectorGroup: 'internal',
  summary: `Get an enrollment API key`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/enrollment_api_keys/{keyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get an enrollment API key by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all OR fleet-setup.`,
  methods: ['GET'],
  patterns: ['/api/fleet/enrollment_api_keys/{keyId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['keyId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_enrollment_api_keys_keyid_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_enrollment_api_keys_keyid_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_enrollment_api_keys_keyid_request, 'query'),
  ]),
  outputSchema: get_fleet_enrollment_api_keys_keyid_response,
};
const POST_FLEET_EPM_BULK_ASSETS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_bulk_assets',
  connectorGroup: 'internal',
  summary: `Bulk get assets`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/bulk_assets</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/bulk_assets'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['assetIds'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_epm_bulk_assets_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_epm_bulk_assets_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_epm_bulk_assets_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_bulk_assets_response,
};
const GET_FLEET_EPM_CATEGORIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_categories',
  connectorGroup: 'internal',
  summary: `Get package categories`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/categories</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/categories'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['prerelease', 'include_policy_templates'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_epm_categories_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_epm_categories_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_epm_categories_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_categories_response,
};
const POST_FLEET_EPM_CUSTOM_INTEGRATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_custom_integrations',
  connectorGroup: 'internal',
  summary: `Create a custom integration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/custom_integrations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/custom_integrations'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['datasets', 'force', 'integrationName'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_epm_custom_integrations_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_epm_custom_integrations_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_epm_custom_integrations_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_custom_integrations_response,
};
const PUT_FLEET_EPM_CUSTOM_INTEGRATIONS_PKGNAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_epm_custom_integrations_pkgname',
  connectorGroup: 'internal',
  summary: `Update a custom integration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/custom_integrations/{pkgName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all AND integrations-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/epm/custom_integrations/{pkgName}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['pkgName'],
    urlParams: [],
    bodyParams: ['categories', 'readMeData'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_fleet_epm_custom_integrations_pkgname_request, 'body'),
    getZodLooseObjectFromProperty(put_fleet_epm_custom_integrations_pkgname_request, 'path'),
    getZodLooseObjectFromProperty(put_fleet_epm_custom_integrations_pkgname_request, 'query'),
  ]),
  outputSchema: put_fleet_epm_custom_integrations_pkgname_response,
};
const GET_FLEET_EPM_DATA_STREAMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_data_streams',
  connectorGroup: 'internal',
  summary: `Get data streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/data_streams</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/data_streams'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['type', 'datasetQuery', 'sortOrder', 'uncategorisedOnly'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_epm_data_streams_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_epm_data_streams_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_epm_data_streams_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_data_streams_response,
};
const GET_FLEET_EPM_PACKAGES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages',
  connectorGroup: 'internal',
  summary: `Get packages`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['category', 'prerelease', 'excludeInstallStatus', 'withPackagePoliciesCount'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_epm_packages_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_epm_packages_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_epm_packages_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_response,
};
const POST_FLEET_EPM_PACKAGES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages',
  connectorGroup: 'internal',
  summary: `Install a package by upload`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/packages'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['ignoreMappingUpdateErrors', 'skipDataStreamRollover'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_epm_packages_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_epm_packages_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_epm_packages_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_packages_response,
};
const POST_FLEET_EPM_PACKAGES_BULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_bulk',
  connectorGroup: 'internal',
  summary: `Bulk install packages`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/packages/_bulk'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['prerelease'],
    bodyParams: ['force', 'packages'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_epm_packages_bulk_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_epm_packages_bulk_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_epm_packages_bulk_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_packages_bulk_response,
};
const POST_FLEET_EPM_PACKAGES_BULK_ROLLBACK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_bulk_rollback',
  connectorGroup: 'internal',
  summary: `Bulk rollback packages`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_rollback</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/packages/_bulk_rollback'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['packages'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_epm_packages_bulk_rollback_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_epm_packages_bulk_rollback_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_epm_packages_bulk_rollback_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_packages_bulk_rollback_response,
};
const GET_FLEET_EPM_PACKAGES_BULK_ROLLBACK_TASKID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_bulk_rollback_taskid',
  connectorGroup: 'internal',
  summary: `Get Bulk rollback packages details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_rollback/{taskId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/_bulk_rollback/{taskId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['taskId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_epm_packages_bulk_rollback_taskid_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_epm_packages_bulk_rollback_taskid_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_epm_packages_bulk_rollback_taskid_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_bulk_rollback_taskid_response,
};
const POST_FLEET_EPM_PACKAGES_BULK_UNINSTALL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_bulk_uninstall',
  connectorGroup: 'internal',
  summary: `Bulk uninstall packages`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_uninstall</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/packages/_bulk_uninstall'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['force', 'packages'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_epm_packages_bulk_uninstall_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_epm_packages_bulk_uninstall_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_epm_packages_bulk_uninstall_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_packages_bulk_uninstall_response,
};
const GET_FLEET_EPM_PACKAGES_BULK_UNINSTALL_TASKID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_bulk_uninstall_taskid',
  connectorGroup: 'internal',
  summary: `Get Bulk uninstall packages details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_uninstall/{taskId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/_bulk_uninstall/{taskId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['taskId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_epm_packages_bulk_uninstall_taskid_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_epm_packages_bulk_uninstall_taskid_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_epm_packages_bulk_uninstall_taskid_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_bulk_uninstall_taskid_response,
};
const POST_FLEET_EPM_PACKAGES_BULK_UPGRADE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_bulk_upgrade',
  connectorGroup: 'internal',
  summary: `Bulk upgrade packages`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_upgrade</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/packages/_bulk_upgrade'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['force', 'packages', 'prerelease', 'upgrade_package_policies'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_epm_packages_bulk_upgrade_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_epm_packages_bulk_upgrade_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_epm_packages_bulk_upgrade_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_packages_bulk_upgrade_response,
};
const GET_FLEET_EPM_PACKAGES_BULK_UPGRADE_TASKID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_bulk_upgrade_taskid',
  connectorGroup: 'internal',
  summary: `Get Bulk upgrade packages details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_upgrade/{taskId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/_bulk_upgrade/{taskId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['taskId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_epm_packages_bulk_upgrade_taskid_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_epm_packages_bulk_upgrade_taskid_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_epm_packages_bulk_upgrade_taskid_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_bulk_upgrade_taskid_response,
};
const DELETE_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_epm_packages_pkgname_pkgversion',
  connectorGroup: 'internal',
  summary: `Delete a package`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_fleet_epm_packages_pkgname_pkgversion_request, 'body'),
    getZodLooseObjectFromProperty(delete_fleet_epm_packages_pkgname_pkgversion_request, 'path'),
    getZodLooseObjectFromProperty(delete_fleet_epm_packages_pkgname_pkgversion_request, 'query'),
  ]),
  outputSchema: delete_fleet_epm_packages_pkgname_pkgversion_response,
};
const GET_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_pkgname_pkgversion',
  connectorGroup: 'internal',
  summary: `Get a package`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: ['ignoreUnverified', 'prerelease', 'full', 'withMetadata'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_epm_packages_pkgname_pkgversion_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_epm_packages_pkgname_pkgversion_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_epm_packages_pkgname_pkgversion_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_pkgname_pkgversion_response,
};
const POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_pkgname_pkgversion',
  connectorGroup: 'internal',
  summary: `Install a package from the registry`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: ['prerelease', 'ignoreMappingUpdateErrors', 'skipDataStreamRollover'],
    bodyParams: ['force', 'ignore_constraints'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_epm_packages_pkgname_pkgversion_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_epm_packages_pkgname_pkgversion_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_epm_packages_pkgname_pkgversion_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_packages_pkgname_pkgversion_response,
};
const PUT_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_epm_packages_pkgname_pkgversion',
  connectorGroup: 'internal',
  summary: `Update package settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: [],
    bodyParams: ['keepPoliciesUpToDate'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_fleet_epm_packages_pkgname_pkgversion_request, 'body'),
    getZodLooseObjectFromProperty(put_fleet_epm_packages_pkgname_pkgversion_request, 'path'),
    getZodLooseObjectFromProperty(put_fleet_epm_packages_pkgname_pkgversion_request, 'query'),
  ]),
  outputSchema: put_fleet_epm_packages_pkgname_pkgversion_response,
};
const GET_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_FILEPATH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_pkgname_pkgversion_filepath',
  connectorGroup: 'internal',
  summary: `Get a package file`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/{filePath}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/{filePath}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['pkgName', 'pkgVersion', 'filePath'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(
      get_fleet_epm_packages_pkgname_pkgversion_filepath_request,
      'body'
    ),
    getZodLooseObjectFromProperty(
      get_fleet_epm_packages_pkgname_pkgversion_filepath_request,
      'path'
    ),
    getZodLooseObjectFromProperty(
      get_fleet_epm_packages_pkgname_pkgversion_filepath_request,
      'query'
    ),
  ]),
  outputSchema: get_fleet_epm_packages_pkgname_pkgversion_filepath_response,
};
const DELETE_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_DATASTREAM_ASSETS_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets',
    connectorGroup: 'internal',
    summary: `Delete assets for an input package`,
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/datastream_assets</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
    methods: ['DELETE'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/datastream_assets'],
    documentation: null,
    parameterTypes: {
      headerParams: ['kbn-xsrf'],
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: ['packagePolicyId'],
      bodyParams: [],
    },
    paramsSchema: z.union([
      getZodLooseObjectFromProperty(
        delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets_request,
        'body'
      ),
      getZodLooseObjectFromProperty(
        delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets_request,
        'path'
      ),
      getZodLooseObjectFromProperty(
        delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets_request,
        'query'
      ),
    ]),
    outputSchema: delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets_response,
  };
const DELETE_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_KIBANA_ASSETS_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets',
    connectorGroup: 'internal',
    summary: `Delete Kibana assets for a package`,
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/kibana_assets</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
    methods: ['DELETE'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/kibana_assets'],
    documentation: null,
    parameterTypes: {
      headerParams: ['kbn-xsrf'],
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.union([
      getZodLooseObjectFromProperty(
        delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request,
        'body'
      ),
      getZodLooseObjectFromProperty(
        delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request,
        'path'
      ),
      getZodLooseObjectFromProperty(
        delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request,
        'query'
      ),
    ]),
    outputSchema: delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets_response,
  };
const POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_KIBANA_ASSETS_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.post_fleet_epm_packages_pkgname_pkgversion_kibana_assets',
    connectorGroup: 'internal',
    summary: `Install Kibana assets for a package`,
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/kibana_assets</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
    methods: ['POST'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/kibana_assets'],
    documentation: null,
    parameterTypes: {
      headerParams: ['kbn-xsrf'],
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: [],
      bodyParams: ['force', 'space_ids'],
    },
    paramsSchema: z.union([
      getZodLooseObjectFromProperty(
        post_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request,
        'body'
      ),
      getZodLooseObjectFromProperty(
        post_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request,
        'path'
      ),
      getZodLooseObjectFromProperty(
        post_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request,
        'query'
      ),
    ]),
    outputSchema: post_fleet_epm_packages_pkgname_pkgversion_kibana_assets_response,
  };
const POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_RULE_ASSETS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_pkgname_pkgversion_rule_assets',
  connectorGroup: 'internal',
  summary: `Install Kibana alert rule for a package`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/rule_assets</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/rule_assets'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: [],
    bodyParams: ['force'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(
      post_fleet_epm_packages_pkgname_pkgversion_rule_assets_request,
      'body'
    ),
    getZodLooseObjectFromProperty(
      post_fleet_epm_packages_pkgname_pkgversion_rule_assets_request,
      'path'
    ),
    getZodLooseObjectFromProperty(
      post_fleet_epm_packages_pkgname_pkgversion_rule_assets_request,
      'query'
    ),
  ]),
  outputSchema: post_fleet_epm_packages_pkgname_pkgversion_rule_assets_response,
};
const POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_TRANSFORMS_AUTHORIZE_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize',
    connectorGroup: 'internal',
    summary: `Authorize transforms`,
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/transforms/authorize</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
    methods: ['POST'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/transforms/authorize'],
    documentation: null,
    parameterTypes: {
      headerParams: ['kbn-xsrf'],
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: ['prerelease'],
      bodyParams: ['transforms'],
    },
    paramsSchema: z.union([
      getZodLooseObjectFromProperty(
        post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_request,
        'body'
      ),
      getZodLooseObjectFromProperty(
        post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_request,
        'path'
      ),
      getZodLooseObjectFromProperty(
        post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_request,
        'query'
      ),
    ]),
    outputSchema: post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_response,
  };
const POST_FLEET_EPM_PACKAGES_PKGNAME_ROLLBACK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_pkgname_rollback',
  connectorGroup: 'internal',
  summary: `Rollback a package to previous version`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/rollback</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/rollback'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['pkgName'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_epm_packages_pkgname_rollback_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_epm_packages_pkgname_rollback_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_epm_packages_pkgname_rollback_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_packages_pkgname_rollback_response,
};
const GET_FLEET_EPM_PACKAGES_PKGNAME_STATS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_pkgname_stats',
  connectorGroup: 'internal',
  summary: `Get package stats`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/stats</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/stats'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['pkgName'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_epm_packages_pkgname_stats_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_epm_packages_pkgname_stats_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_epm_packages_pkgname_stats_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_pkgname_stats_response,
};
const GET_FLEET_EPM_PACKAGES_INSTALLED_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_installed',
  connectorGroup: 'internal',
  summary: `Get installed packages`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/installed</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/installed'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'dataStreamType',
      'showOnlyActiveDataStreams',
      'nameQuery',
      'searchAfter',
      'perPage',
      'sortOrder',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_epm_packages_installed_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_epm_packages_installed_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_epm_packages_installed_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_installed_response,
};
const GET_FLEET_EPM_PACKAGES_LIMITED_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_limited',
  connectorGroup: 'internal',
  summary: `Get a limited package list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/limited</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/limited'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_epm_packages_limited_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_epm_packages_limited_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_epm_packages_limited_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_limited_response,
};
const GET_FLEET_EPM_TEMPLATES_PKGNAME_PKGVERSION_INPUTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_templates_pkgname_pkgversion_inputs',
  connectorGroup: 'internal',
  summary: `Get an inputs template`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/templates/{pkgName}/{pkgVersion}/inputs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/templates/{pkgName}/{pkgVersion}/inputs'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: ['format', 'prerelease', 'ignoreUnverified'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(
      get_fleet_epm_templates_pkgname_pkgversion_inputs_request,
      'body'
    ),
    getZodLooseObjectFromProperty(
      get_fleet_epm_templates_pkgname_pkgversion_inputs_request,
      'path'
    ),
    getZodLooseObjectFromProperty(
      get_fleet_epm_templates_pkgname_pkgversion_inputs_request,
      'query'
    ),
  ]),
  outputSchema: get_fleet_epm_templates_pkgname_pkgversion_inputs_response,
};
const GET_FLEET_EPM_VERIFICATION_KEY_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_verification_key_id',
  connectorGroup: 'internal',
  summary: `Get a package signature verification key ID`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/verification_key_id</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/verification_key_id'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_epm_verification_key_id_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_epm_verification_key_id_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_epm_verification_key_id_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_verification_key_id_response,
};
const GET_FLEET_FLEET_SERVER_HOSTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_fleet_server_hosts',
  connectorGroup: 'internal',
  summary: `Get Fleet Server hosts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/fleet_server_hosts</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all OR fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/fleet_server_hosts'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_fleet_server_hosts_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_fleet_server_hosts_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_fleet_server_hosts_request, 'query'),
  ]),
  outputSchema: get_fleet_fleet_server_hosts_response,
};
const POST_FLEET_FLEET_SERVER_HOSTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_fleet_server_hosts',
  connectorGroup: 'internal',
  summary: `Create a Fleet Server host`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/fleet_server_hosts</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/fleet_server_hosts'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'host_urls',
      'id',
      'is_default',
      'is_internal',
      'is_preconfigured',
      'name',
      'proxy_id',
      'secrets',
      'ssl',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_fleet_server_hosts_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_fleet_server_hosts_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_fleet_server_hosts_request, 'query'),
  ]),
  outputSchema: post_fleet_fleet_server_hosts_response,
};
const DELETE_FLEET_FLEET_SERVER_HOSTS_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_fleet_server_hosts_itemid',
  connectorGroup: 'internal',
  summary: `Delete a Fleet Server host`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/fleet_server_hosts/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a Fleet Server host by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/fleet_server_hosts/{itemId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_fleet_fleet_server_hosts_itemid_request, 'body'),
    getZodLooseObjectFromProperty(delete_fleet_fleet_server_hosts_itemid_request, 'path'),
    getZodLooseObjectFromProperty(delete_fleet_fleet_server_hosts_itemid_request, 'query'),
  ]),
  outputSchema: delete_fleet_fleet_server_hosts_itemid_response,
};
const GET_FLEET_FLEET_SERVER_HOSTS_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_fleet_server_hosts_itemid',
  connectorGroup: 'internal',
  summary: `Get a Fleet Server host`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/fleet_server_hosts/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a Fleet Server host by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/fleet_server_hosts/{itemId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_fleet_server_hosts_itemid_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_fleet_server_hosts_itemid_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_fleet_server_hosts_itemid_request, 'query'),
  ]),
  outputSchema: get_fleet_fleet_server_hosts_itemid_response,
};
const PUT_FLEET_FLEET_SERVER_HOSTS_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_fleet_server_hosts_itemid',
  connectorGroup: 'internal',
  summary: `Update a Fleet Server host`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/fleet_server_hosts/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a Fleet Server host by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/fleet_server_hosts/{itemId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: ['host_urls', 'is_default', 'is_internal', 'name', 'proxy_id', 'secrets', 'ssl'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_fleet_fleet_server_hosts_itemid_request, 'body'),
    getZodLooseObjectFromProperty(put_fleet_fleet_server_hosts_itemid_request, 'path'),
    getZodLooseObjectFromProperty(put_fleet_fleet_server_hosts_itemid_request, 'query'),
  ]),
  outputSchema: put_fleet_fleet_server_hosts_itemid_response,
};
const POST_FLEET_HEALTH_CHECK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_health_check',
  connectorGroup: 'internal',
  summary: `Check Fleet Server health`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/health_check</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/health_check'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['id'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_health_check_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_health_check_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_health_check_request, 'query'),
  ]),
  outputSchema: post_fleet_health_check_response,
};
const GET_FLEET_KUBERNETES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_kubernetes',
  connectorGroup: 'internal',
  summary: `Get a full K8s agent manifest`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/kubernetes</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-setup.`,
  methods: ['GET'],
  patterns: ['/api/fleet/kubernetes'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['download', 'fleetServer', 'enrolToken'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_kubernetes_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_kubernetes_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_kubernetes_request, 'query'),
  ]),
  outputSchema: get_fleet_kubernetes_response,
};
const GET_FLEET_KUBERNETES_DOWNLOAD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_kubernetes_download',
  connectorGroup: 'internal',
  summary: `Download an agent manifest`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/kubernetes/download</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-setup.`,
  methods: ['GET'],
  patterns: ['/api/fleet/kubernetes/download'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['download', 'fleetServer', 'enrolToken'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_kubernetes_download_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_kubernetes_download_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_kubernetes_download_request, 'query'),
  ]),
  outputSchema: get_fleet_kubernetes_download_response,
};
const POST_FLEET_LOGSTASH_API_KEYS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_logstash_api_keys',
  connectorGroup: 'internal',
  summary: `Generate a Logstash API key`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/logstash_api_keys</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/logstash_api_keys'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_logstash_api_keys_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_logstash_api_keys_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_logstash_api_keys_request, 'query'),
  ]),
  outputSchema: post_fleet_logstash_api_keys_response,
};
const POST_FLEET_MESSAGE_SIGNING_SERVICE_ROTATE_KEY_PAIR_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_message_signing_service_rotate_key_pair',
  connectorGroup: 'internal',
  summary: `Rotate a Fleet message signing key pair`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/message_signing_service/rotate_key_pair</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all AND fleet-agent-policies-all AND fleet-settings-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/message_signing_service/rotate_key_pair'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['acknowledge'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(
      post_fleet_message_signing_service_rotate_key_pair_request,
      'body'
    ),
    getZodLooseObjectFromProperty(
      post_fleet_message_signing_service_rotate_key_pair_request,
      'path'
    ),
    getZodLooseObjectFromProperty(
      post_fleet_message_signing_service_rotate_key_pair_request,
      'query'
    ),
  ]),
  outputSchema: post_fleet_message_signing_service_rotate_key_pair_response,
};
const GET_FLEET_OUTPUTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_outputs',
  connectorGroup: 'internal',
  summary: `Get outputs`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read OR fleet-agent-policies-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/outputs'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_outputs_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_outputs_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_outputs_request, 'query'),
  ]),
  outputSchema: get_fleet_outputs_response,
};
const POST_FLEET_OUTPUTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_outputs',
  connectorGroup: 'internal',
  summary: `Create output`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/outputs'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_outputs_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_outputs_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_outputs_request, 'query'),
  ]),
  outputSchema: post_fleet_outputs_response,
};
const DELETE_FLEET_OUTPUTS_OUTPUTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_outputs_outputid',
  connectorGroup: 'internal',
  summary: `Delete output`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs/{outputId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete output by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/outputs/{outputId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['outputId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_fleet_outputs_outputid_request, 'body'),
    getZodLooseObjectFromProperty(delete_fleet_outputs_outputid_request, 'path'),
    getZodLooseObjectFromProperty(delete_fleet_outputs_outputid_request, 'query'),
  ]),
  outputSchema: delete_fleet_outputs_outputid_response,
};
const GET_FLEET_OUTPUTS_OUTPUTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_outputs_outputid',
  connectorGroup: 'internal',
  summary: `Get output`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs/{outputId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get output by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-read OR fleet-agent-policies-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/outputs/{outputId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['outputId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_outputs_outputid_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_outputs_outputid_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_outputs_outputid_request, 'query'),
  ]),
  outputSchema: get_fleet_outputs_outputid_response,
};
const PUT_FLEET_OUTPUTS_OUTPUTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_outputs_outputid',
  connectorGroup: 'internal',
  summary: `Update output`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs/{outputId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update output by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all OR fleet-agent-policies-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/outputs/{outputId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['outputId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_fleet_outputs_outputid_request, 'body'),
    getZodLooseObjectFromProperty(put_fleet_outputs_outputid_request, 'path'),
    getZodLooseObjectFromProperty(put_fleet_outputs_outputid_request, 'query'),
  ]),
  outputSchema: put_fleet_outputs_outputid_response,
};
const GET_FLEET_OUTPUTS_OUTPUTID_HEALTH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_outputs_outputid_health',
  connectorGroup: 'internal',
  summary: `Get the latest output health`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs/{outputId}/health</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/outputs/{outputId}/health'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['outputId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_outputs_outputid_health_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_outputs_outputid_health_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_outputs_outputid_health_request, 'query'),
  ]),
  outputSchema: get_fleet_outputs_outputid_health_response,
};
const GET_FLEET_PACKAGE_POLICIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_package_policies',
  connectorGroup: 'internal',
  summary: `Get package policies`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/fleet/package_policies'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'page',
      'perPage',
      'sortField',
      'sortOrder',
      'showUpgradeable',
      'kuery',
      'format',
      'withAgentCount',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_package_policies_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_package_policies_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_package_policies_request, 'query'),
  ]),
  outputSchema: get_fleet_package_policies_response,
};
const POST_FLEET_PACKAGE_POLICIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_package_policies',
  connectorGroup: 'internal',
  summary: `Create a package policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/fleet/package_policies'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_package_policies_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_package_policies_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_package_policies_request, 'query'),
  ]),
  outputSchema: post_fleet_package_policies_response,
};
const POST_FLEET_PACKAGE_POLICIES_BULK_GET_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_package_policies_bulk_get',
  connectorGroup: 'internal',
  summary: `Bulk get package policies`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/_bulk_get</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/fleet/package_policies/_bulk_get'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['format'],
    bodyParams: ['ids', 'ignoreMissing'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_package_policies_bulk_get_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_package_policies_bulk_get_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_package_policies_bulk_get_request, 'query'),
  ]),
  outputSchema: post_fleet_package_policies_bulk_get_response,
};
const DELETE_FLEET_PACKAGE_POLICIES_PACKAGEPOLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_package_policies_packagepolicyid',
  connectorGroup: 'internal',
  summary: `Delete a package policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/{packagePolicyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a package policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-all AND integrations-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/package_policies/{packagePolicyId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['packagePolicyId'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_fleet_package_policies_packagepolicyid_request, 'body'),
    getZodLooseObjectFromProperty(delete_fleet_package_policies_packagepolicyid_request, 'path'),
    getZodLooseObjectFromProperty(delete_fleet_package_policies_packagepolicyid_request, 'query'),
  ]),
  outputSchema: delete_fleet_package_policies_packagepolicyid_response,
};
const GET_FLEET_PACKAGE_POLICIES_PACKAGEPOLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_package_policies_packagepolicyid',
  connectorGroup: 'internal',
  summary: `Get a package policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/{packagePolicyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a package policy by ID.`,
  methods: ['GET'],
  patterns: ['/api/fleet/package_policies/{packagePolicyId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['packagePolicyId'],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_package_policies_packagepolicyid_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_package_policies_packagepolicyid_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_package_policies_packagepolicyid_request, 'query'),
  ]),
  outputSchema: get_fleet_package_policies_packagepolicyid_response,
};
const PUT_FLEET_PACKAGE_POLICIES_PACKAGEPOLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_package_policies_packagepolicyid',
  connectorGroup: 'internal',
  summary: `Update a package policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/{packagePolicyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a package policy by ID.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/package_policies/{packagePolicyId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['packagePolicyId'],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_fleet_package_policies_packagepolicyid_request, 'body'),
    getZodLooseObjectFromProperty(put_fleet_package_policies_packagepolicyid_request, 'path'),
    getZodLooseObjectFromProperty(put_fleet_package_policies_packagepolicyid_request, 'query'),
  ]),
  outputSchema: put_fleet_package_policies_packagepolicyid_response,
};
const POST_FLEET_PACKAGE_POLICIES_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_package_policies_delete',
  connectorGroup: 'internal',
  summary: `Bulk delete package policies`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-all AND integrations-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/package_policies/delete'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['force', 'packagePolicyIds'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_package_policies_delete_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_package_policies_delete_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_package_policies_delete_request, 'query'),
  ]),
  outputSchema: post_fleet_package_policies_delete_response,
};
const POST_FLEET_PACKAGE_POLICIES_UPGRADE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_package_policies_upgrade',
  connectorGroup: 'internal',
  summary: `Upgrade a package policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/upgrade</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upgrade a package policy to a newer package version.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-all AND integrations-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/package_policies/upgrade'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['packagePolicyIds'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_package_policies_upgrade_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_package_policies_upgrade_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_package_policies_upgrade_request, 'query'),
  ]),
  outputSchema: post_fleet_package_policies_upgrade_response,
};
const POST_FLEET_PACKAGE_POLICIES_UPGRADE_DRYRUN_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_package_policies_upgrade_dryrun',
  connectorGroup: 'internal',
  summary: `Dry run a package policy upgrade`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/upgrade/dryrun</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read AND integrations-read.`,
  methods: ['POST'],
  patterns: ['/api/fleet/package_policies/upgrade/dryrun'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['packagePolicyIds', 'packageVersion'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_package_policies_upgrade_dryrun_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_package_policies_upgrade_dryrun_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_package_policies_upgrade_dryrun_request, 'query'),
  ]),
  outputSchema: post_fleet_package_policies_upgrade_dryrun_response,
};
const GET_FLEET_PROXIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_proxies',
  connectorGroup: 'internal',
  summary: `Get proxies`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/proxies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/proxies'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_proxies_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_proxies_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_proxies_request, 'query'),
  ]),
  outputSchema: get_fleet_proxies_response,
};
const POST_FLEET_PROXIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_proxies',
  connectorGroup: 'internal',
  summary: `Create a proxy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/proxies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/proxies'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'certificate',
      'certificate_authorities',
      'certificate_key',
      'id',
      'is_preconfigured',
      'name',
      'proxy_headers',
      'url',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_proxies_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_proxies_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_proxies_request, 'query'),
  ]),
  outputSchema: post_fleet_proxies_response,
};
const DELETE_FLEET_PROXIES_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_proxies_itemid',
  connectorGroup: 'internal',
  summary: `Delete a proxy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/proxies/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a proxy by ID<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/proxies/{itemId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_fleet_proxies_itemid_request, 'body'),
    getZodLooseObjectFromProperty(delete_fleet_proxies_itemid_request, 'path'),
    getZodLooseObjectFromProperty(delete_fleet_proxies_itemid_request, 'query'),
  ]),
  outputSchema: delete_fleet_proxies_itemid_response,
};
const GET_FLEET_PROXIES_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_proxies_itemid',
  connectorGroup: 'internal',
  summary: `Get a proxy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/proxies/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a proxy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/proxies/{itemId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_proxies_itemid_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_proxies_itemid_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_proxies_itemid_request, 'query'),
  ]),
  outputSchema: get_fleet_proxies_itemid_response,
};
const PUT_FLEET_PROXIES_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_proxies_itemid',
  connectorGroup: 'internal',
  summary: `Update a proxy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/proxies/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a proxy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/proxies/{itemId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: [
      'certificate',
      'certificate_authorities',
      'certificate_key',
      'name',
      'proxy_headers',
      'url',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_fleet_proxies_itemid_request, 'body'),
    getZodLooseObjectFromProperty(put_fleet_proxies_itemid_request, 'path'),
    getZodLooseObjectFromProperty(put_fleet_proxies_itemid_request, 'query'),
  ]),
  outputSchema: put_fleet_proxies_itemid_response,
};
const GET_FLEET_REMOTE_SYNCED_INTEGRATIONS_OUTPUTID_REMOTE_STATUS_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.get_fleet_remote_synced_integrations_outputid_remote_status',
    connectorGroup: 'internal',
    summary: `Get remote synced integrations status by outputId`,
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/remote_synced_integrations/{outputId}/remote_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read AND integrations-read.`,
    methods: ['GET'],
    patterns: ['/api/fleet/remote_synced_integrations/{outputId}/remote_status'],
    documentation: null,
    parameterTypes: {
      headerParams: [],
      pathParams: ['outputId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.union([
      getZodLooseObjectFromProperty(
        get_fleet_remote_synced_integrations_outputid_remote_status_request,
        'body'
      ),
      getZodLooseObjectFromProperty(
        get_fleet_remote_synced_integrations_outputid_remote_status_request,
        'path'
      ),
      getZodLooseObjectFromProperty(
        get_fleet_remote_synced_integrations_outputid_remote_status_request,
        'query'
      ),
    ]),
    outputSchema: get_fleet_remote_synced_integrations_outputid_remote_status_response,
  };
const GET_FLEET_REMOTE_SYNCED_INTEGRATIONS_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_remote_synced_integrations_status',
  connectorGroup: 'internal',
  summary: `Get remote synced integrations status`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/remote_synced_integrations/status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read AND integrations-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/remote_synced_integrations/status'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_remote_synced_integrations_status_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_remote_synced_integrations_status_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_remote_synced_integrations_status_request, 'query'),
  ]),
  outputSchema: get_fleet_remote_synced_integrations_status_response,
};
const POST_FLEET_SERVICE_TOKENS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_service_tokens',
  connectorGroup: 'internal',
  summary: `Create a service token`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/service_tokens</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/service_tokens'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['remote'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_service_tokens_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_service_tokens_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_service_tokens_request, 'query'),
  ]),
  outputSchema: post_fleet_service_tokens_response,
};
const GET_FLEET_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_settings',
  connectorGroup: 'internal',
  summary: `Get settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/settings'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_settings_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_settings_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_settings_request, 'query'),
  ]),
  outputSchema: get_fleet_settings_response,
};
const PUT_FLEET_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_settings',
  connectorGroup: 'internal',
  summary: `Update settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/settings'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'additional_yaml_config',
      'delete_unenrolled_agents',
      'has_seen_add_data_notice',
      'kibana_ca_sha256',
      'kibana_urls',
      'prerelease_integrations_enabled',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_fleet_settings_request, 'body'),
    getZodLooseObjectFromProperty(put_fleet_settings_request, 'path'),
    getZodLooseObjectFromProperty(put_fleet_settings_request, 'query'),
  ]),
  outputSchema: put_fleet_settings_response,
};
const POST_FLEET_SETUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_setup',
  connectorGroup: 'internal',
  summary: `Initiate Fleet setup`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/setup</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read OR fleet-agent-policies-read OR fleet-settings-read OR fleet-setup.`,
  methods: ['POST'],
  patterns: ['/api/fleet/setup'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_fleet_setup_request, 'body'),
    getZodLooseObjectFromProperty(post_fleet_setup_request, 'path'),
    getZodLooseObjectFromProperty(post_fleet_setup_request, 'query'),
  ]),
  outputSchema: post_fleet_setup_response,
};
const GET_FLEET_SPACE_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_space_settings',
  connectorGroup: 'internal',
  summary: `Get space settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/space_settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/fleet/space_settings'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_space_settings_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_space_settings_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_space_settings_request, 'query'),
  ]),
  outputSchema: get_fleet_space_settings_response,
};
const PUT_FLEET_SPACE_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_space_settings',
  connectorGroup: 'internal',
  summary: `Create space settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/space_settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/space_settings'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['allowed_namespace_prefixes'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_fleet_space_settings_request, 'body'),
    getZodLooseObjectFromProperty(put_fleet_space_settings_request, 'path'),
    getZodLooseObjectFromProperty(put_fleet_space_settings_request, 'query'),
  ]),
  outputSchema: put_fleet_space_settings_response,
};
const GET_FLEET_UNINSTALL_TOKENS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_uninstall_tokens',
  connectorGroup: 'internal',
  summary: `Get metadata for latest uninstall tokens`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/uninstall_tokens</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List the metadata for the latest uninstall tokens per agent policy.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/uninstall_tokens'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['policyId', 'search', 'perPage', 'page'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_uninstall_tokens_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_uninstall_tokens_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_uninstall_tokens_request, 'query'),
  ]),
  outputSchema: get_fleet_uninstall_tokens_response,
};
const GET_FLEET_UNINSTALL_TOKENS_UNINSTALLTOKENID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_uninstall_tokens_uninstalltokenid',
  connectorGroup: 'internal',
  summary: `Get a decrypted uninstall token`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/uninstall_tokens/{uninstallTokenId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get one decrypted uninstall token by its ID.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/uninstall_tokens/{uninstallTokenId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['uninstallTokenId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_fleet_uninstall_tokens_uninstalltokenid_request, 'body'),
    getZodLooseObjectFromProperty(get_fleet_uninstall_tokens_uninstalltokenid_request, 'path'),
    getZodLooseObjectFromProperty(get_fleet_uninstall_tokens_uninstalltokenid_request, 'query'),
  ]),
  outputSchema: get_fleet_uninstall_tokens_uninstalltokenid_response,
};
const DELETELIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteList',
  connectorGroup: 'internal',
  summary: `Delete a value list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a value list using the list ID.
> info
> When you delete a list, all of its list items are also deleted.
`,
  methods: ['DELETE'],
  patterns: ['/api/lists'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'deleteReferences', 'ignoreReferences'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_list_request, 'body'),
    getZodLooseObjectFromProperty(delete_list_request, 'path'),
    getZodLooseObjectFromProperty(delete_list_request, 'query'),
  ]),
  outputSchema: delete_list_response,
};
const READLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadList',
  connectorGroup: 'internal',
  summary: `Get value list details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a value list using the list ID.`,
  methods: ['GET'],
  patterns: ['/api/lists'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_list_request, 'body'),
    getZodLooseObjectFromProperty(read_list_request, 'path'),
    getZodLooseObjectFromProperty(read_list_request, 'query'),
  ]),
  outputSchema: read_list_response,
};
const PATCHLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PatchList',
  connectorGroup: 'internal',
  summary: `Patch a value list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update specific fields of an existing list using the list \`id\`.`,
  methods: ['PATCH'],
  patterns: ['/api/lists'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['_version', 'description', 'id', 'meta', 'name', 'version'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(patch_list_request, 'body'),
    getZodLooseObjectFromProperty(patch_list_request, 'path'),
    getZodLooseObjectFromProperty(patch_list_request, 'query'),
  ]),
  outputSchema: patch_list_response,
};
const CREATELIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateList',
  connectorGroup: 'internal',
  summary: `Create a value list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new value list.`,
  methods: ['POST'],
  patterns: ['/api/lists'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'description',
      'deserializer',
      'id',
      'meta',
      'name',
      'serializer',
      'type',
      'version',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_list_request, 'body'),
    getZodLooseObjectFromProperty(create_list_request, 'path'),
    getZodLooseObjectFromProperty(create_list_request, 'query'),
  ]),
  outputSchema: create_list_response,
};
const UPDATELIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateList',
  connectorGroup: 'internal',
  summary: `Update a value list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a value list using the list \`id\`. The original list is replaced, and all unspecified fields are deleted.
> info
> You cannot modify the \`id\` value.
`,
  methods: ['PUT'],
  patterns: ['/api/lists'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['_version', 'description', 'id', 'meta', 'name', 'version'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_list_request, 'body'),
    getZodLooseObjectFromProperty(update_list_request, 'path'),
    getZodLooseObjectFromProperty(update_list_request, 'query'),
  ]),
  outputSchema: update_list_response,
};
const FINDLISTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindLists',
  connectorGroup: 'internal',
  summary: `Get value lists`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a paginated subset of value lists. By default, the first page is returned, with 20 results per page.`,
  methods: ['GET'],
  patterns: ['/api/lists/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['page', 'per_page', 'sort_field', 'sort_order', 'cursor', 'filter'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_lists_request, 'body'),
    getZodLooseObjectFromProperty(find_lists_request, 'path'),
    getZodLooseObjectFromProperty(find_lists_request, 'query'),
  ]),
  outputSchema: find_lists_response,
};
const DELETELISTINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteListIndex',
  connectorGroup: 'internal',
  summary: `Delete value list data streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete the \`.lists\` and \`.items\` data streams.`,
  methods: ['DELETE'],
  patterns: ['/api/lists/index'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_list_index_request, 'body'),
    getZodLooseObjectFromProperty(delete_list_index_request, 'path'),
    getZodLooseObjectFromProperty(delete_list_index_request, 'query'),
  ]),
  outputSchema: delete_list_index_response,
};
const READLISTINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadListIndex',
  connectorGroup: 'internal',
  summary: `Get status of value list data streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Verify that \`.lists\` and \`.items\` data streams exist.`,
  methods: ['GET'],
  patterns: ['/api/lists/index'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_list_index_request, 'body'),
    getZodLooseObjectFromProperty(read_list_index_request, 'path'),
    getZodLooseObjectFromProperty(read_list_index_request, 'query'),
  ]),
  outputSchema: read_list_index_response,
};
const CREATELISTINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateListIndex',
  connectorGroup: 'internal',
  summary: `Create list data streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create \`.lists\` and \`.items\` data streams in the relevant space.`,
  methods: ['POST'],
  patterns: ['/api/lists/index'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_list_index_request, 'body'),
    getZodLooseObjectFromProperty(create_list_index_request, 'path'),
    getZodLooseObjectFromProperty(create_list_index_request, 'query'),
  ]),
  outputSchema: create_list_index_response,
};
const DELETELISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteListItem',
  connectorGroup: 'internal',
  summary: `Delete a value list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a value list item using its \`id\`, or its \`list_id\` and \`value\` fields.`,
  methods: ['DELETE'],
  patterns: ['/api/lists/items'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'list_id', 'value', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_list_item_request, 'body'),
    getZodLooseObjectFromProperty(delete_list_item_request, 'path'),
    getZodLooseObjectFromProperty(delete_list_item_request, 'query'),
  ]),
  outputSchema: delete_list_item_response,
};
const READLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadListItem',
  connectorGroup: 'internal',
  summary: `Get a value list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a value list item.`,
  methods: ['GET'],
  patterns: ['/api/lists/items'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'list_id', 'value'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_list_item_request, 'body'),
    getZodLooseObjectFromProperty(read_list_item_request, 'path'),
    getZodLooseObjectFromProperty(read_list_item_request, 'query'),
  ]),
  outputSchema: read_list_item_response,
};
const PATCHLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PatchListItem',
  connectorGroup: 'internal',
  summary: `Patch a value list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update specific fields of an existing value list item using the item \`id\`.`,
  methods: ['PATCH'],
  patterns: ['/api/lists/items'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['_version', 'id', 'meta', 'refresh', 'value'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(patch_list_item_request, 'body'),
    getZodLooseObjectFromProperty(patch_list_item_request, 'path'),
    getZodLooseObjectFromProperty(patch_list_item_request, 'query'),
  ]),
  outputSchema: patch_list_item_response,
};
const CREATELISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateListItem',
  connectorGroup: 'internal',
  summary: `Create a value list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a value list item and associate it with the specified value list.

All value list items in the same list must be the same type. For example, each list item in an \`ip\` list must define a specific IP address.
> info
> Before creating a list item, you must create a list.
`,
  methods: ['POST'],
  patterns: ['/api/lists/items'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['id', 'list_id', 'meta', 'refresh', 'value'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_list_item_request, 'body'),
    getZodLooseObjectFromProperty(create_list_item_request, 'path'),
    getZodLooseObjectFromProperty(create_list_item_request, 'query'),
  ]),
  outputSchema: create_list_item_response,
};
const UPDATELISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateListItem',
  connectorGroup: 'internal',
  summary: `Update a value list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a value list item using the list item ID. The original list item is replaced, and all unspecified fields are deleted.
> info
> You cannot modify the \`id\` value.
`,
  methods: ['PUT'],
  patterns: ['/api/lists/items'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['_version', 'id', 'meta', 'value'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_list_item_request, 'body'),
    getZodLooseObjectFromProperty(update_list_item_request, 'path'),
    getZodLooseObjectFromProperty(update_list_item_request, 'query'),
  ]),
  outputSchema: update_list_item_response,
};
const EXPORTLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ExportListItems',
  connectorGroup: 'internal',
  summary: `Export value list items`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items/_export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Export list item values from the specified value list.`,
  methods: ['POST'],
  patterns: ['/api/lists/items/_export'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['list_id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(export_list_items_request, 'body'),
    getZodLooseObjectFromProperty(export_list_items_request, 'path'),
    getZodLooseObjectFromProperty(export_list_items_request, 'query'),
  ]),
  outputSchema: export_list_items_response,
};
const FINDLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindListItems',
  connectorGroup: 'internal',
  summary: `Get value list items`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get all value list items in the specified list.`,
  methods: ['GET'],
  patterns: ['/api/lists/items/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['list_id', 'page', 'per_page', 'sort_field', 'sort_order', 'cursor', 'filter'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_list_items_request, 'body'),
    getZodLooseObjectFromProperty(find_list_items_request, 'path'),
    getZodLooseObjectFromProperty(find_list_items_request, 'query'),
  ]),
  outputSchema: find_list_items_response,
};
const IMPORTLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ImportListItems',
  connectorGroup: 'internal',
  summary: `Import value list items`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items/_import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Import value list items from a TXT or CSV file. The maximum file size is 9 million bytes.

You can import items to a new or existing list.
`,
  methods: ['POST'],
  patterns: ['/api/lists/items/_import'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['list_id', 'type', 'serializer', 'deserializer', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(import_list_items_request, 'body'),
    getZodLooseObjectFromProperty(import_list_items_request, 'path'),
    getZodLooseObjectFromProperty(import_list_items_request, 'query'),
  ]),
  outputSchema: import_list_items_response,
};
const READLISTPRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadListPrivileges',
  connectorGroup: 'internal',
  summary: `Get value list privileges`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/privileges</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/lists/privileges'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_list_privileges_request, 'body'),
    getZodLooseObjectFromProperty(read_list_privileges_request, 'path'),
    getZodLooseObjectFromProperty(read_list_privileges_request, 'query'),
  ]),
  outputSchema: read_list_privileges_response,
};
const DELETE_LOGSTASH_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_logstash_pipeline',
  connectorGroup: 'internal',
  summary: `Delete a Logstash pipeline`,
  description: `Delete a centrally-managed Logstash pipeline.
If your Elasticsearch cluster is protected with basic authentication, you must have either the \`logstash_admin\` built-in role or a customized Logstash writer role.
`,
  methods: ['DELETE'],
  patterns: ['/api/logstash/pipeline/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_logstash_pipeline_request, 'body'),
    getZodLooseObjectFromProperty(delete_logstash_pipeline_request, 'path'),
    getZodLooseObjectFromProperty(delete_logstash_pipeline_request, 'query'),
  ]),
  outputSchema: delete_logstash_pipeline_response,
};
const GET_LOGSTASH_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_logstash_pipeline',
  connectorGroup: 'internal',
  summary: `Get a Logstash pipeline`,
  description: `Get information for a centrally-managed Logstash pipeline.
To use this API, you must have either the \`logstash_admin\` built-in role or a customized Logstash reader role.
`,
  methods: ['GET'],
  patterns: ['/api/logstash/pipeline/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_logstash_pipeline_request, 'body'),
    getZodLooseObjectFromProperty(get_logstash_pipeline_request, 'path'),
    getZodLooseObjectFromProperty(get_logstash_pipeline_request, 'query'),
  ]),
  outputSchema: get_logstash_pipeline_response,
};
const PUT_LOGSTASH_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_logstash_pipeline',
  connectorGroup: 'internal',
  summary: `Create or update a Logstash pipeline`,
  description: `Create a centrally-managed Logstash pipeline or update a pipeline.
To use this API, you must have either the \`logstash_admin\` built-in role or a customized Logstash writer role.
`,
  methods: ['PUT'],
  patterns: ['/api/logstash/pipeline/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['description', 'pipeline', 'settings'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_logstash_pipeline_request, 'body'),
    getZodLooseObjectFromProperty(put_logstash_pipeline_request, 'path'),
    getZodLooseObjectFromProperty(put_logstash_pipeline_request, 'query'),
  ]),
  outputSchema: put_logstash_pipeline_response,
};
const GET_LOGSTASH_PIPELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_logstash_pipelines',
  connectorGroup: 'internal',
  summary: `Get all Logstash pipelines`,
  description: `Get a list of all centrally-managed Logstash pipelines.

To use this API, you must have either the \`logstash_admin\` built-in role or a customized Logstash reader role.
> info
> Limit the number of pipelines to 10,000 or fewer. As the number of pipelines nears and surpasses 10,000, you may see performance issues on Kibana.

The \`username\` property appears in the response when security is enabled and depends on when the pipeline was created or last updated.
`,
  methods: ['GET'],
  patterns: ['/api/logstash/pipelines'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_logstash_pipelines_request, 'body'),
    getZodLooseObjectFromProperty(get_logstash_pipelines_request, 'path'),
    getZodLooseObjectFromProperty(get_logstash_pipelines_request, 'query'),
  ]),
  outputSchema: get_logstash_pipelines_response,
};
const POST_MAINTENANCE_WINDOW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_maintenance_window',
  connectorGroup: 'internal',
  summary: `Create a maintenance window.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['POST'],
  patterns: ['/api/maintenance_window'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['enabled', 'schedule', 'scope', 'title'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_maintenance_window_request, 'body'),
    getZodLooseObjectFromProperty(post_maintenance_window_request, 'path'),
    getZodLooseObjectFromProperty(post_maintenance_window_request, 'query'),
  ]),
  outputSchema: post_maintenance_window_response,
};
const GET_MAINTENANCE_WINDOW_FIND_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_maintenance_window_find',
  connectorGroup: 'internal',
  summary: `Search for a maintenance window.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: read-maintenance-window.`,
  methods: ['GET'],
  patterns: ['/api/maintenance_window/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['title', 'created_by', 'status', 'page', 'per_page'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_maintenance_window_find_request, 'body'),
    getZodLooseObjectFromProperty(get_maintenance_window_find_request, 'path'),
    getZodLooseObjectFromProperty(get_maintenance_window_find_request, 'query'),
  ]),
  outputSchema: get_maintenance_window_find_response,
};
const DELETE_MAINTENANCE_WINDOW_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_maintenance_window_id',
  connectorGroup: 'internal',
  summary: `Delete a maintenance window.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['DELETE'],
  patterns: ['/api/maintenance_window/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_maintenance_window_id_request, 'body'),
    getZodLooseObjectFromProperty(delete_maintenance_window_id_request, 'path'),
    getZodLooseObjectFromProperty(delete_maintenance_window_id_request, 'query'),
  ]),
  outputSchema: delete_maintenance_window_id_response,
};
const GET_MAINTENANCE_WINDOW_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_maintenance_window_id',
  connectorGroup: 'internal',
  summary: `Get maintenance window details.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: read-maintenance-window.`,
  methods: ['GET'],
  patterns: ['/api/maintenance_window/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_maintenance_window_id_request, 'body'),
    getZodLooseObjectFromProperty(get_maintenance_window_id_request, 'path'),
    getZodLooseObjectFromProperty(get_maintenance_window_id_request, 'query'),
  ]),
  outputSchema: get_maintenance_window_id_response,
};
const PATCH_MAINTENANCE_WINDOW_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.patch_maintenance_window_id',
  connectorGroup: 'internal',
  summary: `Update a maintenance window.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['PATCH'],
  patterns: ['/api/maintenance_window/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['enabled', 'schedule', 'scope', 'title'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(patch_maintenance_window_id_request, 'body'),
    getZodLooseObjectFromProperty(patch_maintenance_window_id_request, 'path'),
    getZodLooseObjectFromProperty(patch_maintenance_window_id_request, 'query'),
  ]),
  outputSchema: patch_maintenance_window_id_response,
};
const POST_MAINTENANCE_WINDOW_ID_ARCHIVE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_maintenance_window_id_archive',
  connectorGroup: 'internal',
  summary: `Archive a maintenance window.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}/_archive</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['POST'],
  patterns: ['/api/maintenance_window/{id}/_archive'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_maintenance_window_id_archive_request, 'body'),
    getZodLooseObjectFromProperty(post_maintenance_window_id_archive_request, 'path'),
    getZodLooseObjectFromProperty(post_maintenance_window_id_archive_request, 'query'),
  ]),
  outputSchema: post_maintenance_window_id_archive_response,
};
const POST_MAINTENANCE_WINDOW_ID_UNARCHIVE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_maintenance_window_id_unarchive',
  connectorGroup: 'internal',
  summary: `Unarchive a maintenance window.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}/_unarchive</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['POST'],
  patterns: ['/api/maintenance_window/{id}/_unarchive'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_maintenance_window_id_unarchive_request, 'body'),
    getZodLooseObjectFromProperty(post_maintenance_window_id_unarchive_request, 'path'),
    getZodLooseObjectFromProperty(post_maintenance_window_id_unarchive_request, 'query'),
  ]),
  outputSchema: post_maintenance_window_id_unarchive_response,
};
const MLSYNC_CONTRACT: InternalConnectorContract = {
  type: 'kibana.mlSync',
  connectorGroup: 'internal',
  summary: `Sync saved objects in the default space`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/ml/saved_objects/sync</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Synchronizes Kibana saved objects for machine learning jobs and trained models in the default space. You must have \`all\` privileges for the **Machine Learning** feature in the **Analytics** section of the Kibana feature privileges. This API runs automatically when you start Kibana and periodically thereafter.
`,
  methods: ['GET'],
  patterns: ['/api/ml/saved_objects/sync'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['simulate'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(ml_sync_request, 'body'),
    getZodLooseObjectFromProperty(ml_sync_request, 'path'),
    getZodLooseObjectFromProperty(ml_sync_request, 'query'),
  ]),
  outputSchema: ml_sync_response,
};
const DELETENOTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteNote',
  connectorGroup: 'internal',
  summary: `Delete a note`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/note</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a note from a Timeline using the note ID.`,
  methods: ['DELETE'],
  patterns: ['/api/note'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_note_request, 'body'),
    getZodLooseObjectFromProperty(delete_note_request, 'path'),
    getZodLooseObjectFromProperty(delete_note_request, 'query'),
  ]),
  outputSchema: delete_note_response,
};
const GETNOTES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetNotes',
  connectorGroup: 'internal',
  summary: `Get notes`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/note</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get all notes for a given document.`,
  methods: ['GET'],
  patterns: ['/api/note'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'documentIds',
      'savedObjectIds',
      'page',
      'perPage',
      'search',
      'sortField',
      'sortOrder',
      'filter',
      'createdByFilter',
      'associatedFilter',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_notes_request, 'body'),
    getZodLooseObjectFromProperty(get_notes_request, 'path'),
    getZodLooseObjectFromProperty(get_notes_request, 'query'),
  ]),
  outputSchema: get_notes_response,
};
const PERSISTNOTEROUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PersistNoteRoute',
  connectorGroup: 'internal',
  summary: `Add or update a note`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/note</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Add a note to a Timeline or update an existing note.`,
  methods: ['PATCH'],
  patterns: ['/api/note'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['note', 'noteId', 'version'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(persist_note_route_request, 'body'),
    getZodLooseObjectFromProperty(persist_note_route_request, 'path'),
    getZodLooseObjectFromProperty(persist_note_route_request, 'query'),
  ]),
  outputSchema: persist_note_route_response,
};
const OBSERVABILITY_AI_ASSISTANT_CHAT_COMPLETE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.observability_ai_assistant_chat_complete',
  connectorGroup: 'internal',
  summary: `Generate a chat completion`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/observability_ai_assistant/chat/complete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new chat completion by using the Observability AI Assistant. 

The API returns the model's response based on the current conversation context. 

It also handles any tool requests within the conversation, which may trigger multiple calls to the underlying large language model (LLM). 

This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.
`,
  methods: ['POST'],
  patterns: ['/api/observability_ai_assistant/chat/complete'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'actions',
      'connectorId',
      'conversationId',
      'disableFunctions',
      'instructions',
      'messages',
      'persist',
      'title',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(observability_ai_assistant_chat_complete_request, 'body'),
    getZodLooseObjectFromProperty(observability_ai_assistant_chat_complete_request, 'path'),
    getZodLooseObjectFromProperty(observability_ai_assistant_chat_complete_request, 'query'),
  ]),
  outputSchema: observability_ai_assistant_chat_complete_response,
};
const OSQUERYFINDLIVEQUERIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryFindLiveQueries',
  connectorGroup: 'internal',
  summary: `Get live queries`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/live_queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all live queries.`,
  methods: ['GET'],
  patterns: ['/api/osquery/live_queries'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['kuery', 'page', 'pageSize', 'sort', 'sortOrder'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(osquery_find_live_queries_request, 'body'),
    getZodLooseObjectFromProperty(osquery_find_live_queries_request, 'path'),
    getZodLooseObjectFromProperty(osquery_find_live_queries_request, 'query'),
  ]),
  outputSchema: osquery_find_live_queries_response,
};
const OSQUERYCREATELIVEQUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryCreateLiveQuery',
  connectorGroup: 'internal',
  summary: `Create a live query`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/live_queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create and run a live query.`,
  methods: ['POST'],
  patterns: ['/api/osquery/live_queries'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'agent_all',
      'agent_ids',
      'agent_platforms',
      'agent_policy_ids',
      'alert_ids',
      'case_ids',
      'ecs_mapping',
      'event_ids',
      'metadata',
      'pack_id',
      'queries',
      'query',
      'saved_query_id',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(osquery_create_live_query_request, 'body'),
    getZodLooseObjectFromProperty(osquery_create_live_query_request, 'path'),
    getZodLooseObjectFromProperty(osquery_create_live_query_request, 'query'),
  ]),
  outputSchema: osquery_create_live_query_response,
};
const OSQUERYGETLIVEQUERYDETAILS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryGetLiveQueryDetails',
  connectorGroup: 'internal',
  summary: `Get live query details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/live_queries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a live query using the query ID.`,
  methods: ['GET'],
  patterns: ['/api/osquery/live_queries/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(osquery_get_live_query_details_request, 'body'),
    getZodLooseObjectFromProperty(osquery_get_live_query_details_request, 'path'),
    getZodLooseObjectFromProperty(osquery_get_live_query_details_request, 'query'),
  ]),
  outputSchema: osquery_get_live_query_details_response,
};
const OSQUERYGETLIVEQUERYRESULTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryGetLiveQueryResults',
  connectorGroup: 'internal',
  summary: `Get live query results`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/live_queries/{id}/results/{actionId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the results of a live query using the query action ID.`,
  methods: ['GET'],
  patterns: ['/api/osquery/live_queries/{id}/results/{actionId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id', 'actionId'],
    urlParams: ['kuery', 'page', 'pageSize', 'sort', 'sortOrder'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(osquery_get_live_query_results_request, 'body'),
    getZodLooseObjectFromProperty(osquery_get_live_query_results_request, 'path'),
    getZodLooseObjectFromProperty(osquery_get_live_query_results_request, 'query'),
  ]),
  outputSchema: osquery_get_live_query_results_response,
};
const OSQUERYFINDPACKS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryFindPacks',
  connectorGroup: 'internal',
  summary: `Get packs`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/packs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all query packs.`,
  methods: ['GET'],
  patterns: ['/api/osquery/packs'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['page', 'pageSize', 'sort', 'sortOrder'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(osquery_find_packs_request, 'body'),
    getZodLooseObjectFromProperty(osquery_find_packs_request, 'path'),
    getZodLooseObjectFromProperty(osquery_find_packs_request, 'query'),
  ]),
  outputSchema: osquery_find_packs_response,
};
const OSQUERYCREATEPACKS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryCreatePacks',
  connectorGroup: 'internal',
  summary: `Create a pack`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/packs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a query pack.`,
  methods: ['POST'],
  patterns: ['/api/osquery/packs'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['description', 'enabled', 'name', 'policy_ids', 'queries', 'shards'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(osquery_create_packs_request, 'body'),
    getZodLooseObjectFromProperty(osquery_create_packs_request, 'path'),
    getZodLooseObjectFromProperty(osquery_create_packs_request, 'query'),
  ]),
  outputSchema: osquery_create_packs_response,
};
const OSQUERYDELETEPACKS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryDeletePacks',
  connectorGroup: 'internal',
  summary: `Delete a pack`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/packs/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a query pack using the pack ID.`,
  methods: ['DELETE'],
  patterns: ['/api/osquery/packs/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(osquery_delete_packs_request, 'body'),
    getZodLooseObjectFromProperty(osquery_delete_packs_request, 'path'),
    getZodLooseObjectFromProperty(osquery_delete_packs_request, 'query'),
  ]),
  outputSchema: osquery_delete_packs_response,
};
const OSQUERYGETPACKSDETAILS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryGetPacksDetails',
  connectorGroup: 'internal',
  summary: `Get pack details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/packs/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a query pack using the pack ID.`,
  methods: ['GET'],
  patterns: ['/api/osquery/packs/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(osquery_get_packs_details_request, 'body'),
    getZodLooseObjectFromProperty(osquery_get_packs_details_request, 'path'),
    getZodLooseObjectFromProperty(osquery_get_packs_details_request, 'query'),
  ]),
  outputSchema: osquery_get_packs_details_response,
};
const OSQUERYUPDATEPACKS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryUpdatePacks',
  connectorGroup: 'internal',
  summary: `Update a pack`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/packs/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a query pack using the pack ID.
> info
> You cannot update a prebuilt pack.
`,
  methods: ['PUT'],
  patterns: ['/api/osquery/packs/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['description', 'enabled', 'name', 'policy_ids', 'queries', 'shards'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(osquery_update_packs_request, 'body'),
    getZodLooseObjectFromProperty(osquery_update_packs_request, 'path'),
    getZodLooseObjectFromProperty(osquery_update_packs_request, 'query'),
  ]),
  outputSchema: osquery_update_packs_response,
};
const OSQUERYFINDSAVEDQUERIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryFindSavedQueries',
  connectorGroup: 'internal',
  summary: `Get saved queries`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/saved_queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all saved queries.`,
  methods: ['GET'],
  patterns: ['/api/osquery/saved_queries'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['page', 'pageSize', 'sort', 'sortOrder'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(osquery_find_saved_queries_request, 'body'),
    getZodLooseObjectFromProperty(osquery_find_saved_queries_request, 'path'),
    getZodLooseObjectFromProperty(osquery_find_saved_queries_request, 'query'),
  ]),
  outputSchema: osquery_find_saved_queries_response,
};
const OSQUERYCREATESAVEDQUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryCreateSavedQuery',
  connectorGroup: 'internal',
  summary: `Create a saved query`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/saved_queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create and run a saved query.`,
  methods: ['POST'],
  patterns: ['/api/osquery/saved_queries'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'description',
      'ecs_mapping',
      'id',
      'interval',
      'platform',
      'query',
      'removed',
      'snapshot',
      'version',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(osquery_create_saved_query_request, 'body'),
    getZodLooseObjectFromProperty(osquery_create_saved_query_request, 'path'),
    getZodLooseObjectFromProperty(osquery_create_saved_query_request, 'query'),
  ]),
  outputSchema: osquery_create_saved_query_response,
};
const OSQUERYDELETESAVEDQUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryDeleteSavedQuery',
  connectorGroup: 'internal',
  summary: `Delete a saved query`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/saved_queries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a saved query using the query ID.`,
  methods: ['DELETE'],
  patterns: ['/api/osquery/saved_queries/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(osquery_delete_saved_query_request, 'body'),
    getZodLooseObjectFromProperty(osquery_delete_saved_query_request, 'path'),
    getZodLooseObjectFromProperty(osquery_delete_saved_query_request, 'query'),
  ]),
  outputSchema: osquery_delete_saved_query_response,
};
const OSQUERYGETSAVEDQUERYDETAILS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryGetSavedQueryDetails',
  connectorGroup: 'internal',
  summary: `Get saved query details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/saved_queries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a saved query using the query ID.`,
  methods: ['GET'],
  patterns: ['/api/osquery/saved_queries/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(osquery_get_saved_query_details_request, 'body'),
    getZodLooseObjectFromProperty(osquery_get_saved_query_details_request, 'path'),
    getZodLooseObjectFromProperty(osquery_get_saved_query_details_request, 'query'),
  ]),
  outputSchema: osquery_get_saved_query_details_response,
};
const OSQUERYUPDATESAVEDQUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryUpdateSavedQuery',
  connectorGroup: 'internal',
  summary: `Update a saved query`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/saved_queries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a saved query using the query ID.
> info
> You cannot update a prebuilt saved query.
`,
  methods: ['PUT'],
  patterns: ['/api/osquery/saved_queries/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [
      'description',
      'ecs_mapping',
      'id',
      'interval',
      'platform',
      'query',
      'removed',
      'snapshot',
      'version',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(osquery_update_saved_query_request, 'body'),
    getZodLooseObjectFromProperty(osquery_update_saved_query_request, 'path'),
    getZodLooseObjectFromProperty(osquery_update_saved_query_request, 'query'),
  ]),
  outputSchema: osquery_update_saved_query_response,
};
const PERSISTPINNEDEVENTROUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PersistPinnedEventRoute',
  connectorGroup: 'internal',
  summary: `Pin/unpin an event`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/pinned_event</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Pin/unpin an event to/from an existing Timeline.`,
  methods: ['PATCH'],
  patterns: ['/api/pinned_event'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['eventId', 'pinnedEventId', 'timelineId'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(persist_pinned_event_route_request, 'body'),
    getZodLooseObjectFromProperty(persist_pinned_event_route_request, 'path'),
    getZodLooseObjectFromProperty(persist_pinned_event_route_request, 'query'),
  ]),
  outputSchema: persist_pinned_event_route_response,
};
const CLEANUPRISKENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CleanUpRiskEngine',
  connectorGroup: 'internal',
  summary: `Cleanup the Risk Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/risk_score/engine/dangerously_delete_data</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Cleaning up the the Risk Engine by removing the indices, mapping and transforms`,
  methods: ['DELETE'],
  patterns: ['/api/risk_score/engine/dangerously_delete_data'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(clean_up_risk_engine_request, 'body'),
    getZodLooseObjectFromProperty(clean_up_risk_engine_request, 'path'),
    getZodLooseObjectFromProperty(clean_up_risk_engine_request, 'query'),
  ]),
  outputSchema: clean_up_risk_engine_response,
};
const CONFIGURERISKENGINESAVEDOBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ConfigureRiskEngineSavedObject',
  connectorGroup: 'internal',
  summary: `Configure the Risk Engine Saved Object`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/risk_score/engine/saved_object/configure</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Configuring the Risk Engine Saved Object`,
  methods: ['PATCH'],
  patterns: ['/api/risk_score/engine/saved_object/configure'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'enable_reset_to_zero',
      'exclude_alert_statuses',
      'exclude_alert_tags',
      'filters',
      'range',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(configure_risk_engine_saved_object_request, 'body'),
    getZodLooseObjectFromProperty(configure_risk_engine_saved_object_request, 'path'),
    getZodLooseObjectFromProperty(configure_risk_engine_saved_object_request, 'query'),
  ]),
  outputSchema: configure_risk_engine_saved_object_response,
};
const SCHEDULERISKENGINENOW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ScheduleRiskEngineNow',
  connectorGroup: 'internal',
  summary: `Run the risk scoring engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/risk_score/engine/schedule_now</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Schedule the risk scoring engine to run as soon as possible. You can use this to recalculate entity risk scores after updating their asset criticality.`,
  methods: ['POST'],
  patterns: ['/api/risk_score/engine/schedule_now'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(schedule_risk_engine_now_request, 'body'),
    getZodLooseObjectFromProperty(schedule_risk_engine_now_request, 'path'),
    getZodLooseObjectFromProperty(schedule_risk_engine_now_request, 'query'),
  ]),
  outputSchema: schedule_risk_engine_now_response,
};
const BULKCREATESAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkCreateSavedObjects',
  connectorGroup: 'internal',
  summary: `Create saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_create</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_bulk_create'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['overwrite'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(bulk_create_saved_objects_request, 'body'),
    getZodLooseObjectFromProperty(bulk_create_saved_objects_request, 'path'),
    getZodLooseObjectFromProperty(bulk_create_saved_objects_request, 'query'),
  ]),
  outputSchema: bulk_create_saved_objects_response,
};
const BULKDELETESAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkDeleteSavedObjects',
  connectorGroup: 'internal',
  summary: `Delete saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: When you delete a saved object, it cannot be recovered.
`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_bulk_delete'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(bulk_delete_saved_objects_request, 'body'),
    getZodLooseObjectFromProperty(bulk_delete_saved_objects_request, 'path'),
    getZodLooseObjectFromProperty(bulk_delete_saved_objects_request, 'query'),
  ]),
  outputSchema: bulk_delete_saved_objects_response,
};
const BULKGETSAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkGetSavedObjects',
  connectorGroup: 'internal',
  summary: `Get saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_get</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_bulk_get'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(bulk_get_saved_objects_request, 'body'),
    getZodLooseObjectFromProperty(bulk_get_saved_objects_request, 'path'),
    getZodLooseObjectFromProperty(bulk_get_saved_objects_request, 'query'),
  ]),
  outputSchema: bulk_get_saved_objects_response,
};
const BULKRESOLVESAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkResolveSavedObjects',
  connectorGroup: 'internal',
  summary: `Resolve saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_resolve</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve multiple Kibana saved objects by identifier using any legacy URL aliases if they exist. Under certain circumstances when Kibana is upgraded, saved object migrations may necessitate regenerating some object IDs to enable new features. When an object's ID is regenerated, a legacy URL alias is created for that object, preserving its old ID. In such a scenario, that object can be retrieved by the bulk resolve API using either its new ID or its old ID.
`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_bulk_resolve'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(bulk_resolve_saved_objects_request, 'body'),
    getZodLooseObjectFromProperty(bulk_resolve_saved_objects_request, 'path'),
    getZodLooseObjectFromProperty(bulk_resolve_saved_objects_request, 'query'),
  ]),
  outputSchema: bulk_resolve_saved_objects_response,
};
const BULKUPDATESAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkUpdateSavedObjects',
  connectorGroup: 'internal',
  summary: `Update saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_update</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update the attributes for multiple Kibana saved objects.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_bulk_update'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(bulk_update_saved_objects_request, 'body'),
    getZodLooseObjectFromProperty(bulk_update_saved_objects_request, 'path'),
    getZodLooseObjectFromProperty(bulk_update_saved_objects_request, 'query'),
  ]),
  outputSchema: bulk_update_saved_objects_response,
};
const POST_SAVED_OBJECTS_EXPORT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_saved_objects_export',
  connectorGroup: 'internal',
  summary: `Export saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve sets of saved objects that you want to import into Kibana. You must include \`type\` or \`objects\` in the request body. The output of exporting saved objects must be treated as opaque. Tampering with exported data risks introducing unspecified errors and data loss.

Exported saved objects are not backwards compatible and cannot be imported into an older version of Kibana.

NOTE: The \`savedObjects.maxImportExportSize\` configuration setting limits the number of saved objects which may be exported.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_export'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'excludeExportDetails',
      'hasReference',
      'includeReferencesDeep',
      'objects',
      'search',
      'type',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_saved_objects_export_request, 'body'),
    getZodLooseObjectFromProperty(post_saved_objects_export_request, 'path'),
    getZodLooseObjectFromProperty(post_saved_objects_export_request, 'query'),
  ]),
  outputSchema: post_saved_objects_export_response,
};
const FINDSAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findSavedObjects',
  connectorGroup: 'internal',
  summary: `Search for saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a paginated set of Kibana saved objects.`,
  methods: ['GET'],
  patterns: ['/api/saved_objects/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'aggs',
      'default_search_operator',
      'fields',
      'filter',
      'has_no_reference',
      'has_no_reference_operator',
      'has_reference',
      'has_reference_operator',
      'page',
      'per_page',
      'search',
      'search_fields',
      'sort_field',
      'type',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_saved_objects_request, 'body'),
    getZodLooseObjectFromProperty(find_saved_objects_request, 'path'),
    getZodLooseObjectFromProperty(find_saved_objects_request, 'query'),
  ]),
  outputSchema: find_saved_objects_response,
};
const POST_SAVED_OBJECTS_IMPORT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_saved_objects_import',
  connectorGroup: 'internal',
  summary: `Import saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create sets of Kibana saved objects from a file created by the export API. Saved objects can only be imported into the same version, a newer minor on the same major, or the next major. Tampering with exported data risks introducing unspecified errors and data loss.

Exported saved objects are not backwards compatible and cannot be imported into an older version of Kibana.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_import'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['overwrite', 'createNewCopies', 'compatibilityMode'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_saved_objects_import_request, 'body'),
    getZodLooseObjectFromProperty(post_saved_objects_import_request, 'path'),
    getZodLooseObjectFromProperty(post_saved_objects_import_request, 'query'),
  ]),
  outputSchema: post_saved_objects_import_response,
};
const RESOLVEIMPORTERRORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.resolveImportErrors',
  connectorGroup: 'internal',
  summary: `Resolve import errors`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_resolve_import_errors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

To resolve errors from the Import objects API, you can:

* Retry certain saved objects
* Overwrite specific saved objects
* Change references to different saved objects
`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_resolve_import_errors'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['compatibilityMode', 'createNewCopies'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(resolve_import_errors_request, 'body'),
    getZodLooseObjectFromProperty(resolve_import_errors_request, 'path'),
    getZodLooseObjectFromProperty(resolve_import_errors_request, 'query'),
  ]),
  outputSchema: resolve_import_errors_response,
};
const CREATESAVEDOBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createSavedObject',
  connectorGroup: 'internal',
  summary: `Create a saved object`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/{type}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a Kibana saved object with a randomly generated identifier.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/{type}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['type'],
    urlParams: ['overwrite'],
    bodyParams: ['attributes', 'initialNamespaces', 'references'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_saved_object_request, 'body'),
    getZodLooseObjectFromProperty(create_saved_object_request, 'path'),
    getZodLooseObjectFromProperty(create_saved_object_request, 'query'),
  ]),
  outputSchema: create_saved_object_response,
};
const GETSAVEDOBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getSavedObject',
  connectorGroup: 'internal',
  summary: `Get a saved object`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/{type}/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a single Kibana saved object by identifier.`,
  methods: ['GET'],
  patterns: ['/api/saved_objects/{type}/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id', 'type'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_saved_object_request, 'body'),
    getZodLooseObjectFromProperty(get_saved_object_request, 'path'),
    getZodLooseObjectFromProperty(get_saved_object_request, 'query'),
  ]),
  outputSchema: get_saved_object_response,
};
const CREATESAVEDOBJECTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createSavedObjectId',
  connectorGroup: 'internal',
  summary: `Create a saved object`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/{type}/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a Kibana saved object and specify its identifier instead of using a randomly generated ID.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/{type}/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id', 'type'],
    urlParams: ['overwrite'],
    bodyParams: ['attributes', 'initialNamespaces', 'references'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_saved_object_id_request, 'body'),
    getZodLooseObjectFromProperty(create_saved_object_id_request, 'path'),
    getZodLooseObjectFromProperty(create_saved_object_id_request, 'query'),
  ]),
  outputSchema: create_saved_object_id_response,
};
const UPDATESAVEDOBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateSavedObject',
  connectorGroup: 'internal',
  summary: `Update a saved object`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/{type}/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update the attributes for Kibana saved objects.`,
  methods: ['PUT'],
  patterns: ['/api/saved_objects/{type}/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id', 'type'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_saved_object_request, 'body'),
    getZodLooseObjectFromProperty(update_saved_object_request, 'path'),
    getZodLooseObjectFromProperty(update_saved_object_request, 'query'),
  ]),
  outputSchema: update_saved_object_response,
};
const RESOLVESAVEDOBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.resolveSavedObject',
  connectorGroup: 'internal',
  summary: `Resolve a saved object`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/resolve/{type}/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a single Kibana saved object by identifier using any legacy URL alias if it exists. Under certain circumstances, when Kibana is upgraded, saved object migrations may necessitate regenerating some object IDs to enable new features. When an object's ID is regenerated, a legacy URL alias is created for that object, preserving its old ID. In such a scenario, that object can be retrieved using either its new ID or its old ID.
`,
  methods: ['GET'],
  patterns: ['/api/saved_objects/resolve/{type}/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id', 'type'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(resolve_saved_object_request, 'body'),
    getZodLooseObjectFromProperty(resolve_saved_object_request, 'path'),
    getZodLooseObjectFromProperty(resolve_saved_object_request, 'query'),
  ]),
  outputSchema: resolve_saved_object_response,
};
const PERFORMANONYMIZATIONFIELDSBULKACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PerformAnonymizationFieldsBulkAction',
  connectorGroup: 'internal',
  summary: `Apply a bulk action to anonymization fields`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/anonymization_fields/_bulk_action</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Apply a bulk action to multiple anonymization fields. The bulk action is applied to all anonymization fields that match the filter or to the list of anonymization fields by their IDs.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/anonymization_fields/_bulk_action'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['create', 'delete', 'update'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(perform_anonymization_fields_bulk_action_request, 'body'),
    getZodLooseObjectFromProperty(perform_anonymization_fields_bulk_action_request, 'path'),
    getZodLooseObjectFromProperty(perform_anonymization_fields_bulk_action_request, 'query'),
  ]),
  outputSchema: perform_anonymization_fields_bulk_action_response,
};
const FINDANONYMIZATIONFIELDS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindAnonymizationFields',
  connectorGroup: 'internal',
  summary: `Get anonymization fields`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/anonymization_fields/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all anonymization fields.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/anonymization_fields/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['fields', 'filter', 'sort_field', 'sort_order', 'page', 'per_page', 'all_data'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_anonymization_fields_request, 'body'),
    getZodLooseObjectFromProperty(find_anonymization_fields_request, 'path'),
    getZodLooseObjectFromProperty(find_anonymization_fields_request, 'query'),
  ]),
  outputSchema: find_anonymization_fields_response,
};
const CHATCOMPLETE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ChatComplete',
  connectorGroup: 'internal',
  summary: `Create a model response`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/chat/complete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a model response for the given chat conversation.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/chat/complete'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['content_references_disabled'],
    bodyParams: [
      'connectorId',
      'conversationId',
      'isStream',
      'langSmithApiKey',
      'langSmithProject',
      'messages',
      'model',
      'persist',
      'promptId',
      'responseLanguage',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(chat_complete_request, 'body'),
    getZodLooseObjectFromProperty(chat_complete_request, 'path'),
    getZodLooseObjectFromProperty(chat_complete_request, 'query'),
  ]),
  outputSchema: chat_complete_response,
};
const DELETEALLCONVERSATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteAllConversations',
  connectorGroup: 'internal',
  summary: `Delete conversations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

This endpoint allows users to permanently delete all conversations.`,
  methods: ['DELETE'],
  patterns: ['/api/security_ai_assistant/current_user/conversations'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['excludedIds'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_all_conversations_request, 'body'),
    getZodLooseObjectFromProperty(delete_all_conversations_request, 'path'),
    getZodLooseObjectFromProperty(delete_all_conversations_request, 'query'),
  ]),
  outputSchema: delete_all_conversations_response,
};
const CREATECONVERSATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateConversation',
  connectorGroup: 'internal',
  summary: `Create a conversation`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new Security AI Assistant conversation. This endpoint allows the user to initiate a conversation with the Security AI Assistant by providing the required parameters.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/current_user/conversations'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'apiConfig',
      'category',
      'excludeFromLastConversationStorage',
      'id',
      'messages',
      'replacements',
      'title',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_conversation_request, 'body'),
    getZodLooseObjectFromProperty(create_conversation_request, 'path'),
    getZodLooseObjectFromProperty(create_conversation_request, 'query'),
  ]),
  outputSchema: create_conversation_response,
};
const FINDCONVERSATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindConversations',
  connectorGroup: 'internal',
  summary: `Get conversations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all conversations for the current user. This endpoint allows users to search, filter, sort, and paginate through their conversations.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/current_user/conversations/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['fields', 'filter', 'sort_field', 'sort_order', 'page', 'per_page', 'is_owner'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_conversations_request, 'body'),
    getZodLooseObjectFromProperty(find_conversations_request, 'path'),
    getZodLooseObjectFromProperty(find_conversations_request, 'query'),
  ]),
  outputSchema: find_conversations_response,
};
const DELETECONVERSATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteConversation',
  connectorGroup: 'internal',
  summary: `Delete a conversation`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an existing conversation using the conversation ID. This endpoint allows users to permanently delete a conversation.`,
  methods: ['DELETE'],
  patterns: ['/api/security_ai_assistant/current_user/conversations/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_conversation_request, 'body'),
    getZodLooseObjectFromProperty(delete_conversation_request, 'path'),
    getZodLooseObjectFromProperty(delete_conversation_request, 'query'),
  ]),
  outputSchema: delete_conversation_response,
};
const READCONVERSATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadConversation',
  connectorGroup: 'internal',
  summary: `Get a conversation`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an existing conversation using the conversation ID. This allows users to fetch the specific conversation data by its unique ID.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/current_user/conversations/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_conversation_request, 'body'),
    getZodLooseObjectFromProperty(read_conversation_request, 'path'),
    getZodLooseObjectFromProperty(read_conversation_request, 'query'),
  ]),
  outputSchema: read_conversation_response,
};
const UPDATECONVERSATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateConversation',
  connectorGroup: 'internal',
  summary: `Update a conversation`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing conversation using the conversation ID. This endpoint allows users to modify the details of an existing conversation.`,
  methods: ['PUT'],
  patterns: ['/api/security_ai_assistant/current_user/conversations/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [
      'apiConfig',
      'category',
      'excludeFromLastConversationStorage',
      'id',
      'messages',
      'replacements',
      'title',
      'users',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_conversation_request, 'body'),
    getZodLooseObjectFromProperty(update_conversation_request, 'path'),
    getZodLooseObjectFromProperty(update_conversation_request, 'query'),
  ]),
  outputSchema: update_conversation_response,
};
const GETKNOWLEDGEBASE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetKnowledgeBase',
  connectorGroup: 'internal',
  summary: `Read a KnowledgeBase`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Read a single KB`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/knowledge_base'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_knowledge_base_request, 'body'),
    getZodLooseObjectFromProperty(get_knowledge_base_request, 'path'),
    getZodLooseObjectFromProperty(get_knowledge_base_request, 'query'),
  ]),
  outputSchema: get_knowledge_base_response,
};
const POSTKNOWLEDGEBASE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PostKnowledgeBase',
  connectorGroup: 'internal',
  summary: `Create a KnowledgeBase`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/knowledge_base'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['modelId', 'ignoreSecurityLabs'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_knowledge_base_request, 'body'),
    getZodLooseObjectFromProperty(post_knowledge_base_request, 'path'),
    getZodLooseObjectFromProperty(post_knowledge_base_request, 'query'),
  ]),
  outputSchema: post_knowledge_base_response,
};
const READKNOWLEDGEBASE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadKnowledgeBase',
  connectorGroup: 'internal',
  summary: `Read a KnowledgeBase for a resource`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/{resource}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Read a knowledge base with a specific resource identifier.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/knowledge_base/{resource}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['resource'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_knowledge_base_request, 'body'),
    getZodLooseObjectFromProperty(read_knowledge_base_request, 'path'),
    getZodLooseObjectFromProperty(read_knowledge_base_request, 'query'),
  ]),
  outputSchema: read_knowledge_base_response,
};
const CREATEKNOWLEDGEBASE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateKnowledgeBase',
  connectorGroup: 'internal',
  summary: `Create a KnowledgeBase for a resource`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/{resource}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a knowledge base with a specific resource identifier.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/knowledge_base/{resource}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['resource'],
    urlParams: ['modelId', 'ignoreSecurityLabs'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_knowledge_base_request, 'body'),
    getZodLooseObjectFromProperty(create_knowledge_base_request, 'path'),
    getZodLooseObjectFromProperty(create_knowledge_base_request, 'query'),
  ]),
  outputSchema: create_knowledge_base_response,
};
const CREATEKNOWLEDGEBASEENTRY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateKnowledgeBaseEntry',
  connectorGroup: 'internal',
  summary: `Create a Knowledge Base Entry`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a Knowledge Base Entry`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_knowledge_base_entry_request, 'body'),
    getZodLooseObjectFromProperty(create_knowledge_base_entry_request, 'path'),
    getZodLooseObjectFromProperty(create_knowledge_base_entry_request, 'query'),
  ]),
  outputSchema: create_knowledge_base_entry_response,
};
const PERFORMKNOWLEDGEBASEENTRYBULKACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PerformKnowledgeBaseEntryBulkAction',
  connectorGroup: 'internal',
  summary: `Applies a bulk action to multiple Knowledge Base Entries`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/_bulk_action</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

The bulk action is applied to all Knowledge Base Entries that match the filter or to the list of Knowledge Base Entries by their IDs.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/_bulk_action'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['create', 'delete', 'update'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(perform_knowledge_base_entry_bulk_action_request, 'body'),
    getZodLooseObjectFromProperty(perform_knowledge_base_entry_bulk_action_request, 'path'),
    getZodLooseObjectFromProperty(perform_knowledge_base_entry_bulk_action_request, 'query'),
  ]),
  outputSchema: perform_knowledge_base_entry_bulk_action_response,
};
const FINDKNOWLEDGEBASEENTRIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindKnowledgeBaseEntries',
  connectorGroup: 'internal',
  summary: `Finds Knowledge Base Entries that match the given query.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Finds Knowledge Base Entries that match the given query.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['fields', 'filter', 'sort_field', 'sort_order', 'page', 'per_page'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_knowledge_base_entries_request, 'body'),
    getZodLooseObjectFromProperty(find_knowledge_base_entries_request, 'path'),
    getZodLooseObjectFromProperty(find_knowledge_base_entries_request, 'query'),
  ]),
  outputSchema: find_knowledge_base_entries_response,
};
const DELETEKNOWLEDGEBASEENTRY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteKnowledgeBaseEntry',
  connectorGroup: 'internal',
  summary: `Deletes a single Knowledge Base Entry using the \`id\` field`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a Knowledge Base Entry by its unique \`id\`.`,
  methods: ['DELETE'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_knowledge_base_entry_request, 'body'),
    getZodLooseObjectFromProperty(delete_knowledge_base_entry_request, 'path'),
    getZodLooseObjectFromProperty(delete_knowledge_base_entry_request, 'query'),
  ]),
  outputSchema: delete_knowledge_base_entry_response,
};
const READKNOWLEDGEBASEENTRY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadKnowledgeBaseEntry',
  connectorGroup: 'internal',
  summary: `Read a Knowledge Base Entry`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a Knowledge Base Entry by its unique \`id\`.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(read_knowledge_base_entry_request, 'body'),
    getZodLooseObjectFromProperty(read_knowledge_base_entry_request, 'path'),
    getZodLooseObjectFromProperty(read_knowledge_base_entry_request, 'query'),
  ]),
  outputSchema: read_knowledge_base_entry_response,
};
const UPDATEKNOWLEDGEBASEENTRY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateKnowledgeBaseEntry',
  connectorGroup: 'internal',
  summary: `Update a Knowledge Base Entry`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing Knowledge Base Entry by its unique \`id\`.`,
  methods: ['PUT'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_knowledge_base_entry_request, 'body'),
    getZodLooseObjectFromProperty(update_knowledge_base_entry_request, 'path'),
    getZodLooseObjectFromProperty(update_knowledge_base_entry_request, 'query'),
  ]),
  outputSchema: update_knowledge_base_entry_response,
};
const PERFORMPROMPTSBULKACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PerformPromptsBulkAction',
  connectorGroup: 'internal',
  summary: `Apply a bulk action to prompts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/prompts/_bulk_action</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Apply a bulk action to multiple prompts. The bulk action is applied to all prompts that match the filter or to the list of prompts by their IDs. This action allows for bulk create, update, or delete operations.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/prompts/_bulk_action'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['create', 'delete', 'update'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(perform_prompts_bulk_action_request, 'body'),
    getZodLooseObjectFromProperty(perform_prompts_bulk_action_request, 'path'),
    getZodLooseObjectFromProperty(perform_prompts_bulk_action_request, 'query'),
  ]),
  outputSchema: perform_prompts_bulk_action_response,
};
const FINDPROMPTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindPrompts',
  connectorGroup: 'internal',
  summary: `Get prompts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/prompts/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all prompts based on optional filters, sorting, and pagination.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/prompts/_find'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['fields', 'filter', 'sort_field', 'sort_order', 'page', 'per_page'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_prompts_request, 'body'),
    getZodLooseObjectFromProperty(find_prompts_request, 'path'),
    getZodLooseObjectFromProperty(find_prompts_request, 'query'),
  ]),
  outputSchema: find_prompts_response,
};
const GET_SECURITY_ROLE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_security_role',
  connectorGroup: 'internal',
  summary: `Get all roles`,
  description: null,
  methods: ['GET'],
  patterns: ['/api/security/role'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['replaceDeprecatedPrivileges'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_security_role_request, 'body'),
    getZodLooseObjectFromProperty(get_security_role_request, 'path'),
    getZodLooseObjectFromProperty(get_security_role_request, 'query'),
  ]),
  outputSchema: get_security_role_response,
};
const POST_SECURITY_ROLE_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_security_role_query',
  connectorGroup: 'internal',
  summary: `Query roles`,
  description: null,
  methods: ['POST'],
  patterns: ['/api/security/role/_query'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['filters', 'from', 'query', 'size', 'sort'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_security_role_query_request, 'body'),
    getZodLooseObjectFromProperty(post_security_role_query_request, 'path'),
    getZodLooseObjectFromProperty(post_security_role_query_request, 'query'),
  ]),
  outputSchema: post_security_role_query_response,
};
const DELETE_SECURITY_ROLE_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_security_role_name',
  connectorGroup: 'internal',
  summary: `Delete a role`,
  description: null,
  methods: ['DELETE'],
  patterns: ['/api/security/role/{name}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_security_role_name_request, 'body'),
    getZodLooseObjectFromProperty(delete_security_role_name_request, 'path'),
    getZodLooseObjectFromProperty(delete_security_role_name_request, 'query'),
  ]),
  outputSchema: delete_security_role_name_response,
};
const GET_SECURITY_ROLE_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_security_role_name',
  connectorGroup: 'internal',
  summary: `Get a role`,
  description: null,
  methods: ['GET'],
  patterns: ['/api/security/role/{name}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['replaceDeprecatedPrivileges'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_security_role_name_request, 'body'),
    getZodLooseObjectFromProperty(get_security_role_name_request, 'path'),
    getZodLooseObjectFromProperty(get_security_role_name_request, 'query'),
  ]),
  outputSchema: get_security_role_name_response,
};
const PUT_SECURITY_ROLE_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_security_role_name',
  connectorGroup: 'internal',
  summary: `Create or update a role`,
  description: `Create a new Kibana role or update the attributes of an existing role. Kibana roles are stored in the Elasticsearch native realm.`,
  methods: ['PUT'],
  patterns: ['/api/security/role/{name}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name'],
    urlParams: ['createOnly'],
    bodyParams: ['description', 'elasticsearch', 'kibana', 'metadata'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_security_role_name_request, 'body'),
    getZodLooseObjectFromProperty(put_security_role_name_request, 'path'),
    getZodLooseObjectFromProperty(put_security_role_name_request, 'query'),
  ]),
  outputSchema: put_security_role_name_response,
};
const POST_SECURITY_ROLES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_security_roles',
  connectorGroup: 'internal',
  summary: `Create or update roles`,
  description: null,
  methods: ['POST'],
  patterns: ['/api/security/roles'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['roles'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_security_roles_request, 'body'),
    getZodLooseObjectFromProperty(post_security_roles_request, 'path'),
    getZodLooseObjectFromProperty(post_security_roles_request, 'query'),
  ]),
  outputSchema: post_security_roles_response,
};
const POST_SECURITY_SESSION_INVALIDATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_security_session_invalidate',
  connectorGroup: 'internal',
  summary: `Invalidate user sessions`,
  description: `Invalidate user sessions that match a query. To use this API, you must be a superuser.
`,
  methods: ['POST'],
  patterns: ['/api/security/session/_invalidate'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['match', 'query'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_security_session_invalidate_request, 'body'),
    getZodLooseObjectFromProperty(post_security_session_invalidate_request, 'path'),
    getZodLooseObjectFromProperty(post_security_session_invalidate_request, 'query'),
  ]),
  outputSchema: post_security_session_invalidate_response,
};
const POST_URL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_url',
  connectorGroup: 'internal',
  summary: `Create a short URL`,
  description: `Kibana URLs may be long and cumbersome, short URLs are much easier to remember and share.
Short URLs are created by specifying the locator ID and locator parameters. When a short URL is resolved, the locator ID and locator parameters are used to redirect user to the right Kibana page.
`,
  methods: ['POST'],
  patterns: ['/api/short_url'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['humanReadableSlug', 'locatorId', 'params', 'slug'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_url_request, 'body'),
    getZodLooseObjectFromProperty(post_url_request, 'path'),
    getZodLooseObjectFromProperty(post_url_request, 'query'),
  ]),
  outputSchema: post_url_response,
};
const RESOLVE_URL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.resolve_url',
  connectorGroup: 'internal',
  summary: `Resolve a short URL`,
  description: `Resolve a Kibana short URL by its slug.
`,
  methods: ['GET'],
  patterns: ['/api/short_url/_slug/{slug}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['slug'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(resolve_url_request, 'body'),
    getZodLooseObjectFromProperty(resolve_url_request, 'path'),
    getZodLooseObjectFromProperty(resolve_url_request, 'query'),
  ]),
  outputSchema: resolve_url_response,
};
const DELETE_URL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_url',
  connectorGroup: 'internal',
  summary: `Delete a short URL`,
  description: `Delete a Kibana short URL.
`,
  methods: ['DELETE'],
  patterns: ['/api/short_url/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_url_request, 'body'),
    getZodLooseObjectFromProperty(delete_url_request, 'path'),
    getZodLooseObjectFromProperty(delete_url_request, 'query'),
  ]),
  outputSchema: delete_url_response,
};
const GET_URL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_url',
  connectorGroup: 'internal',
  summary: `Get a short URL`,
  description: `Get a single Kibana short URL.
`,
  methods: ['GET'],
  patterns: ['/api/short_url/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_url_request, 'body'),
    getZodLooseObjectFromProperty(get_url_request, 'path'),
    getZodLooseObjectFromProperty(get_url_request, 'query'),
  ]),
  outputSchema: get_url_response,
};
const POST_SPACES_COPY_SAVED_OBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_copy_saved_objects',
  connectorGroup: 'internal',
  summary: `Copy saved objects between spaces`,
  description: `It also allows you to automatically copy related objects, so when you copy a dashboard, this can automatically copy over the associated visualizations, data views, and saved Discover sessions, as required. You can request to overwrite any objects that already exist in the target space if they share an identifier or you can use the resolve copy saved objects conflicts API to do this on a per-object basis.<br/><br/>[Required authorization] Route required privileges: copySavedObjectsToSpaces.`,
  methods: ['POST'],
  patterns: ['/api/spaces/_copy_saved_objects'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'compatibilityMode',
      'createNewCopies',
      'includeReferences',
      'objects',
      'overwrite',
      'spaces',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_spaces_copy_saved_objects_request, 'body'),
    getZodLooseObjectFromProperty(post_spaces_copy_saved_objects_request, 'path'),
    getZodLooseObjectFromProperty(post_spaces_copy_saved_objects_request, 'query'),
  ]),
  outputSchema: post_spaces_copy_saved_objects_response,
};
const POST_SPACES_DISABLE_LEGACY_URL_ALIASES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_disable_legacy_url_aliases',
  connectorGroup: 'internal',
  summary: `Disable legacy URL aliases`,
  description: null,
  methods: ['POST'],
  patterns: ['/api/spaces/_disable_legacy_url_aliases'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['aliases'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_spaces_disable_legacy_url_aliases_request, 'body'),
    getZodLooseObjectFromProperty(post_spaces_disable_legacy_url_aliases_request, 'path'),
    getZodLooseObjectFromProperty(post_spaces_disable_legacy_url_aliases_request, 'query'),
  ]),
  outputSchema: post_spaces_disable_legacy_url_aliases_response,
};
const POST_SPACES_GET_SHAREABLE_REFERENCES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_get_shareable_references',
  connectorGroup: 'internal',
  summary: `Get shareable references`,
  description: `Collect references and space contexts for saved objects.`,
  methods: ['POST'],
  patterns: ['/api/spaces/_get_shareable_references'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['objects'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_spaces_get_shareable_references_request, 'body'),
    getZodLooseObjectFromProperty(post_spaces_get_shareable_references_request, 'path'),
    getZodLooseObjectFromProperty(post_spaces_get_shareable_references_request, 'query'),
  ]),
  outputSchema: post_spaces_get_shareable_references_response,
};
const POST_SPACES_RESOLVE_COPY_SAVED_OBJECTS_ERRORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_resolve_copy_saved_objects_errors',
  connectorGroup: 'internal',
  summary: `Resolve conflicts copying saved objects`,
  description: `Overwrite saved objects that are returned as errors from the copy saved objects to space API.<br/><br/>[Required authorization] Route required privileges: copySavedObjectsToSpaces.`,
  methods: ['POST'],
  patterns: ['/api/spaces/_resolve_copy_saved_objects_errors'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['compatibilityMode', 'createNewCopies', 'includeReferences', 'objects', 'retries'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_spaces_resolve_copy_saved_objects_errors_request, 'body'),
    getZodLooseObjectFromProperty(post_spaces_resolve_copy_saved_objects_errors_request, 'path'),
    getZodLooseObjectFromProperty(post_spaces_resolve_copy_saved_objects_errors_request, 'query'),
  ]),
  outputSchema: post_spaces_resolve_copy_saved_objects_errors_response,
};
const POST_SPACES_UPDATE_OBJECTS_SPACES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_update_objects_spaces',
  connectorGroup: 'internal',
  summary: `Update saved objects in spaces`,
  description: `Update one or more saved objects to add or remove them from some spaces.`,
  methods: ['POST'],
  patterns: ['/api/spaces/_update_objects_spaces'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['objects', 'spacesToAdd', 'spacesToRemove'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_spaces_update_objects_spaces_request, 'body'),
    getZodLooseObjectFromProperty(post_spaces_update_objects_spaces_request, 'path'),
    getZodLooseObjectFromProperty(post_spaces_update_objects_spaces_request, 'query'),
  ]),
  outputSchema: post_spaces_update_objects_spaces_response,
};
const GET_SPACES_SPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_spaces_space',
  connectorGroup: 'internal',
  summary: `Get all spaces`,
  description: null,
  methods: ['GET'],
  patterns: ['/api/spaces/space'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['purpose', 'include_authorized_purposes'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_spaces_space_request, 'body'),
    getZodLooseObjectFromProperty(get_spaces_space_request, 'path'),
    getZodLooseObjectFromProperty(get_spaces_space_request, 'query'),
  ]),
  outputSchema: get_spaces_space_response,
};
const POST_SPACES_SPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_space',
  connectorGroup: 'internal',
  summary: `Create a space`,
  description: null,
  methods: ['POST'],
  patterns: ['/api/spaces/space'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      '_reserved',
      'color',
      'description',
      'disabledFeatures',
      'id',
      'imageUrl',
      'initials',
      'name',
      'solution',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_spaces_space_request, 'body'),
    getZodLooseObjectFromProperty(post_spaces_space_request, 'path'),
    getZodLooseObjectFromProperty(post_spaces_space_request, 'query'),
  ]),
  outputSchema: post_spaces_space_response,
};
const DELETE_SPACES_SPACE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_spaces_space_id',
  connectorGroup: 'internal',
  summary: `Delete a space`,
  description: `When you delete a space, all saved objects that belong to the space are automatically deleted, which is permanent and cannot be undone.`,
  methods: ['DELETE'],
  patterns: ['/api/spaces/space/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_spaces_space_id_request, 'body'),
    getZodLooseObjectFromProperty(delete_spaces_space_id_request, 'path'),
    getZodLooseObjectFromProperty(delete_spaces_space_id_request, 'query'),
  ]),
  outputSchema: delete_spaces_space_id_response,
};
const GET_SPACES_SPACE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_spaces_space_id',
  connectorGroup: 'internal',
  summary: `Get a space`,
  description: null,
  methods: ['GET'],
  patterns: ['/api/spaces/space/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_spaces_space_id_request, 'body'),
    getZodLooseObjectFromProperty(get_spaces_space_id_request, 'path'),
    getZodLooseObjectFromProperty(get_spaces_space_id_request, 'query'),
  ]),
  outputSchema: get_spaces_space_id_response,
};
const PUT_SPACES_SPACE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_spaces_space_id',
  connectorGroup: 'internal',
  summary: `Update a space`,
  description: null,
  methods: ['PUT'],
  patterns: ['/api/spaces/space/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [
      '_reserved',
      'color',
      'description',
      'disabledFeatures',
      'id',
      'imageUrl',
      'initials',
      'name',
      'solution',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_spaces_space_id_request, 'body'),
    getZodLooseObjectFromProperty(put_spaces_space_id_request, 'path'),
    getZodLooseObjectFromProperty(put_spaces_space_id_request, 'query'),
  ]),
  outputSchema: put_spaces_space_id_response,
};
const GET_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_status',
  connectorGroup: 'internal',
  summary: `Get Kibana's current status`,
  description: null,
  methods: ['GET'],
  patterns: ['/api/status'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['v7format', 'v8format'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_status_request, 'body'),
    getZodLooseObjectFromProperty(get_status_request, 'path'),
    getZodLooseObjectFromProperty(get_status_request, 'query'),
  ]),
  outputSchema: get_status_response,
};
const GET_STREAMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams',
  connectorGroup: 'internal',
  summary: `Get stream list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches list of all streams<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['GET'],
  patterns: ['/api/streams'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_streams_request, 'body'),
    getZodLooseObjectFromProperty(get_streams_request, 'path'),
    getZodLooseObjectFromProperty(get_streams_request, 'query'),
  ]),
  outputSchema: get_streams_response,
};
const POST_STREAMS_DISABLE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_disable',
  connectorGroup: 'internal',
  summary: `Disable streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/_disable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Disables wired streams and deletes all existing stream definitions. The data of wired streams is deleted, but the data of classic streams is preserved.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/_disable'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_streams_disable_request, 'body'),
    getZodLooseObjectFromProperty(post_streams_disable_request, 'path'),
    getZodLooseObjectFromProperty(post_streams_disable_request, 'query'),
  ]),
  outputSchema: post_streams_disable_response,
};
const POST_STREAMS_ENABLE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_enable',
  connectorGroup: 'internal',
  summary: `Enable streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/_enable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Enables wired streams<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/_enable'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_streams_enable_request, 'body'),
    getZodLooseObjectFromProperty(post_streams_enable_request, 'path'),
    getZodLooseObjectFromProperty(post_streams_enable_request, 'query'),
  ]),
  outputSchema: post_streams_enable_response,
};
const POST_STREAMS_RESYNC_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_resync',
  connectorGroup: 'internal',
  summary: `Resync streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/_resync</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Resyncs all streams, making sure that Elasticsearch assets are up to date<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/_resync'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_streams_resync_request, 'body'),
    getZodLooseObjectFromProperty(post_streams_resync_request, 'path'),
    getZodLooseObjectFromProperty(post_streams_resync_request, 'query'),
  ]),
  outputSchema: post_streams_resync_response,
};
const DELETE_STREAMS_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_streams_name',
  connectorGroup: 'internal',
  summary: `Delete a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Deletes a stream definition and the underlying data stream<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['DELETE'],
  patterns: ['/api/streams/{name}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_streams_name_request, 'body'),
    getZodLooseObjectFromProperty(delete_streams_name_request, 'path'),
    getZodLooseObjectFromProperty(delete_streams_name_request, 'query'),
  ]),
  outputSchema: delete_streams_name_response,
};
const GET_STREAMS_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name',
  connectorGroup: 'internal',
  summary: `Get a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches a stream definition and associated dashboards<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['GET'],
  patterns: ['/api/streams/{name}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_streams_name_request, 'body'),
    getZodLooseObjectFromProperty(get_streams_name_request, 'path'),
    getZodLooseObjectFromProperty(get_streams_name_request, 'query'),
  ]),
  outputSchema: get_streams_name_response,
};
const PUT_STREAMS_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name',
  connectorGroup: 'internal',
  summary: `Create or update a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Creates or updates a stream definition. Classic streams can not be created through this API, only updated<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['PUT'],
  patterns: ['/api/streams/{name}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_streams_name_request, 'body'),
    getZodLooseObjectFromProperty(put_streams_name_request, 'path'),
    getZodLooseObjectFromProperty(put_streams_name_request, 'query'),
  ]),
  outputSchema: put_streams_name_response,
};
const POST_STREAMS_NAME_FORK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_fork',
  connectorGroup: 'internal',
  summary: `Fork a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/_fork</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Forks a wired stream and creates a child stream<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/{name}/_fork'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: ['status', 'stream', 'where'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_streams_name_fork_request, 'body'),
    getZodLooseObjectFromProperty(post_streams_name_fork_request, 'path'),
    getZodLooseObjectFromProperty(post_streams_name_fork_request, 'query'),
  ]),
  outputSchema: post_streams_name_fork_response,
};
const GET_STREAMS_NAME_GROUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_group',
  connectorGroup: 'internal',
  summary: `Get group stream settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/_group</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches the group settings of a group stream definition<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['GET'],
  patterns: ['/api/streams/{name}/_group'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_streams_name_group_request, 'body'),
    getZodLooseObjectFromProperty(get_streams_name_group_request, 'path'),
    getZodLooseObjectFromProperty(get_streams_name_group_request, 'query'),
  ]),
  outputSchema: get_streams_name_group_response,
};
const PUT_STREAMS_NAME_GROUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_group',
  connectorGroup: 'internal',
  summary: `Upsert group stream settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/_group</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upserts the group settings of a group stream definition<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['PUT'],
  patterns: ['/api/streams/{name}/_group'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: ['group'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_streams_name_group_request, 'body'),
    getZodLooseObjectFromProperty(put_streams_name_group_request, 'path'),
    getZodLooseObjectFromProperty(put_streams_name_group_request, 'query'),
  ]),
  outputSchema: put_streams_name_group_response,
};
const GET_STREAMS_NAME_INGEST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_ingest',
  connectorGroup: 'internal',
  summary: `Get ingest stream settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/_ingest</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches the ingest settings of an ingest stream definition<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['GET'],
  patterns: ['/api/streams/{name}/_ingest'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_streams_name_ingest_request, 'body'),
    getZodLooseObjectFromProperty(get_streams_name_ingest_request, 'path'),
    getZodLooseObjectFromProperty(get_streams_name_ingest_request, 'query'),
  ]),
  outputSchema: get_streams_name_ingest_response,
};
const PUT_STREAMS_NAME_INGEST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_ingest',
  connectorGroup: 'internal',
  summary: `Update ingest stream settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/_ingest</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upserts the ingest settings of an ingest stream definition<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['PUT'],
  patterns: ['/api/streams/{name}/_ingest'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: ['ingest'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_streams_name_ingest_request, 'body'),
    getZodLooseObjectFromProperty(put_streams_name_ingest_request, 'path'),
    getZodLooseObjectFromProperty(put_streams_name_ingest_request, 'query'),
  ]),
  outputSchema: put_streams_name_ingest_response,
};
const POST_STREAMS_NAME_CONTENT_EXPORT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_content_export',
  connectorGroup: 'internal',
  summary: `Export stream content`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/content/export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Exports the content associated to a stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/{name}/content/export'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: ['description', 'include', 'name', 'version'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_streams_name_content_export_request, 'body'),
    getZodLooseObjectFromProperty(post_streams_name_content_export_request, 'path'),
    getZodLooseObjectFromProperty(post_streams_name_content_export_request, 'query'),
  ]),
  outputSchema: post_streams_name_content_export_response,
};
const POST_STREAMS_NAME_CONTENT_IMPORT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_content_import',
  connectorGroup: 'internal',
  summary: `Import content into a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/content/import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Links content objects to a stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/{name}/content/import'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_streams_name_content_import_request, 'body'),
    getZodLooseObjectFromProperty(post_streams_name_content_import_request, 'path'),
    getZodLooseObjectFromProperty(post_streams_name_content_import_request, 'query'),
  ]),
  outputSchema: post_streams_name_content_import_response,
};
const GET_STREAMS_NAME_DASHBOARDS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_dashboards',
  connectorGroup: 'internal',
  summary: `Get stream dashboards`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/dashboards</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches all dashboards linked to a stream that are visible to the current user in the current space.<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['GET'],
  patterns: ['/api/streams/{name}/dashboards'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_streams_name_dashboards_request, 'body'),
    getZodLooseObjectFromProperty(get_streams_name_dashboards_request, 'path'),
    getZodLooseObjectFromProperty(get_streams_name_dashboards_request, 'query'),
  ]),
  outputSchema: get_streams_name_dashboards_response,
};
const POST_STREAMS_NAME_DASHBOARDS_BULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_dashboards_bulk',
  connectorGroup: 'internal',
  summary: `Bulk update dashboards`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/dashboards/_bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Bulk update dashboards linked to a stream. Can link new dashboards and delete existing ones.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/{name}/dashboards/_bulk'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: ['operations'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_streams_name_dashboards_bulk_request, 'body'),
    getZodLooseObjectFromProperty(post_streams_name_dashboards_bulk_request, 'path'),
    getZodLooseObjectFromProperty(post_streams_name_dashboards_bulk_request, 'query'),
  ]),
  outputSchema: post_streams_name_dashboards_bulk_response,
};
const DELETE_STREAMS_NAME_DASHBOARDS_DASHBOARDID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_streams_name_dashboards_dashboardid',
  connectorGroup: 'internal',
  summary: `Unlink a dashboard from a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/dashboards/{dashboardId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Unlinks a dashboard from a stream. Noop if the dashboard is not linked to the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['DELETE'],
  patterns: ['/api/streams/{name}/dashboards/{dashboardId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name', 'dashboardId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_streams_name_dashboards_dashboardid_request, 'body'),
    getZodLooseObjectFromProperty(delete_streams_name_dashboards_dashboardid_request, 'path'),
    getZodLooseObjectFromProperty(delete_streams_name_dashboards_dashboardid_request, 'query'),
  ]),
  outputSchema: delete_streams_name_dashboards_dashboardid_response,
};
const PUT_STREAMS_NAME_DASHBOARDS_DASHBOARDID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_dashboards_dashboardid',
  connectorGroup: 'internal',
  summary: `Link a dashboard to a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/dashboards/{dashboardId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Links a dashboard to a stream. Noop if the dashboard is already linked to the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['PUT'],
  patterns: ['/api/streams/{name}/dashboards/{dashboardId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name', 'dashboardId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_streams_name_dashboards_dashboardid_request, 'body'),
    getZodLooseObjectFromProperty(put_streams_name_dashboards_dashboardid_request, 'path'),
    getZodLooseObjectFromProperty(put_streams_name_dashboards_dashboardid_request, 'query'),
  ]),
  outputSchema: put_streams_name_dashboards_dashboardid_response,
};
const GET_STREAMS_NAME_QUERIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_queries',
  connectorGroup: 'internal',
  summary: `Get stream queries`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches all queries linked to a stream that are visible to the current user in the current space.<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['GET'],
  patterns: ['/api/streams/{name}/queries'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_streams_name_queries_request, 'body'),
    getZodLooseObjectFromProperty(get_streams_name_queries_request, 'path'),
    getZodLooseObjectFromProperty(get_streams_name_queries_request, 'query'),
  ]),
  outputSchema: get_streams_name_queries_response,
};
const POST_STREAMS_NAME_QUERIES_BULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_queries_bulk',
  connectorGroup: 'internal',
  summary: `Bulk update queries`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/queries/_bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Bulk update queries of a stream. Can add new queries and delete existing ones.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/{name}/queries/_bulk'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: ['operations'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_streams_name_queries_bulk_request, 'body'),
    getZodLooseObjectFromProperty(post_streams_name_queries_bulk_request, 'path'),
    getZodLooseObjectFromProperty(post_streams_name_queries_bulk_request, 'query'),
  ]),
  outputSchema: post_streams_name_queries_bulk_response,
};
const DELETE_STREAMS_NAME_QUERIES_QUERYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_streams_name_queries_queryid',
  connectorGroup: 'internal',
  summary: `Remove a query from a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/queries/{queryId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Remove a query from a stream. Noop if the query is not found on the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['DELETE'],
  patterns: ['/api/streams/{name}/queries/{queryId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name', 'queryId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_streams_name_queries_queryid_request, 'body'),
    getZodLooseObjectFromProperty(delete_streams_name_queries_queryid_request, 'path'),
    getZodLooseObjectFromProperty(delete_streams_name_queries_queryid_request, 'query'),
  ]),
  outputSchema: delete_streams_name_queries_queryid_response,
};
const PUT_STREAMS_NAME_QUERIES_QUERYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_queries_queryid',
  connectorGroup: 'internal',
  summary: `Upsert a query to a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/queries/{queryId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Adds a query to a stream. Noop if the query is already present on the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['PUT'],
  patterns: ['/api/streams/{name}/queries/{queryId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name', 'queryId'],
    urlParams: [],
    bodyParams: ['feature', 'kql', 'title'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_streams_name_queries_queryid_request, 'body'),
    getZodLooseObjectFromProperty(put_streams_name_queries_queryid_request, 'path'),
    getZodLooseObjectFromProperty(put_streams_name_queries_queryid_request, 'query'),
  ]),
  outputSchema: put_streams_name_queries_queryid_response,
};
const GET_STREAMS_NAME_RULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_rules',
  connectorGroup: 'internal',
  summary: `Get stream rules`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/rules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches all rules linked to a stream that are visible to the current user in the current space.<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['GET'],
  patterns: ['/api/streams/{name}/rules'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_streams_name_rules_request, 'body'),
    getZodLooseObjectFromProperty(get_streams_name_rules_request, 'path'),
    getZodLooseObjectFromProperty(get_streams_name_rules_request, 'query'),
  ]),
  outputSchema: get_streams_name_rules_response,
};
const DELETE_STREAMS_NAME_RULES_RULEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_streams_name_rules_ruleid',
  connectorGroup: 'internal',
  summary: `Unlink a rule from a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/rules/{ruleId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Unlinks a rule from a stream. Noop if the rule is not linked to the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['DELETE'],
  patterns: ['/api/streams/{name}/rules/{ruleId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name', 'ruleId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_streams_name_rules_ruleid_request, 'body'),
    getZodLooseObjectFromProperty(delete_streams_name_rules_ruleid_request, 'path'),
    getZodLooseObjectFromProperty(delete_streams_name_rules_ruleid_request, 'query'),
  ]),
  outputSchema: delete_streams_name_rules_ruleid_response,
};
const PUT_STREAMS_NAME_RULES_RULEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_rules_ruleid',
  connectorGroup: 'internal',
  summary: `Link a rule to a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/rules/{ruleId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Links a rule to a stream. Noop if the rule is already linked to the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['PUT'],
  patterns: ['/api/streams/{name}/rules/{ruleId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name', 'ruleId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_streams_name_rules_ruleid_request, 'body'),
    getZodLooseObjectFromProperty(put_streams_name_rules_ruleid_request, 'path'),
    getZodLooseObjectFromProperty(put_streams_name_rules_ruleid_request, 'query'),
  ]),
  outputSchema: put_streams_name_rules_ruleid_response,
};
const GET_STREAMS_NAME_SIGNIFICANT_EVENTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_significant_events',
  connectorGroup: 'internal',
  summary: `Read the significant events`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/significant_events</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Read the significant events<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['GET'],
  patterns: ['/api/streams/{name}/significant_events'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['from', 'to', 'bucketSize'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_streams_name_significant_events_request, 'body'),
    getZodLooseObjectFromProperty(get_streams_name_significant_events_request, 'path'),
    getZodLooseObjectFromProperty(get_streams_name_significant_events_request, 'query'),
  ]),
  outputSchema: get_streams_name_significant_events_response,
};
const POST_STREAMS_NAME_SIGNIFICANT_EVENTS_GENERATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_significant_events_generate',
  connectorGroup: 'internal',
  summary: `Generate significant events`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/significant_events/_generate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Generate significant events queries based on the stream data<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/{name}/significant_events/_generate'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name'],
    urlParams: ['connectorId', 'currentDate', 'from', 'to'],
    bodyParams: ['feature'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_streams_name_significant_events_generate_request, 'body'),
    getZodLooseObjectFromProperty(post_streams_name_significant_events_generate_request, 'path'),
    getZodLooseObjectFromProperty(post_streams_name_significant_events_generate_request, 'query'),
  ]),
  outputSchema: post_streams_name_significant_events_generate_response,
};
const POST_STREAMS_NAME_SIGNIFICANT_EVENTS_PREVIEW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_significant_events_preview',
  connectorGroup: 'internal',
  summary: `Preview significant events`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/significant_events/_preview</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Preview significant event results based on a given query<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/{name}/significant_events/_preview'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name'],
    urlParams: ['from', 'to', 'bucketSize'],
    bodyParams: ['query'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_streams_name_significant_events_preview_request, 'body'),
    getZodLooseObjectFromProperty(post_streams_name_significant_events_preview_request, 'path'),
    getZodLooseObjectFromProperty(post_streams_name_significant_events_preview_request, 'query'),
  ]),
  outputSchema: post_streams_name_significant_events_preview_response,
};
const POST_SYNTHETICS_MONITOR_TEST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_synthetics_monitor_test',
  connectorGroup: 'internal',
  summary: `Trigger an on-demand test run for a monitor`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitor/test/{monitorId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Trigger an immediate test execution for the specified monitor. The response includes the generated \`testRunId\`. If the test encounters issues in one or more service locations, an \`errors\` array is also returned with details about the failures.
`,
  methods: ['POST'],
  patterns: ['/api/synthetics/monitor/test/{monitorId}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['monitorId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_synthetics_monitor_test_request, 'body'),
    getZodLooseObjectFromProperty(post_synthetics_monitor_test_request, 'path'),
    getZodLooseObjectFromProperty(post_synthetics_monitor_test_request, 'query'),
  ]),
  outputSchema: post_synthetics_monitor_test_response,
};
const GET_SYNTHETIC_MONITORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_synthetic_monitors',
  connectorGroup: 'internal',
  summary: `Get monitors`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of monitors.
You must have \`read\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/api/synthetics/monitors'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'filter',
      'locations',
      'monitorTypes',
      'page',
      'per_page',
      'projects',
      'query',
      'schedules',
      'sortField',
      'sortOrder',
      'status',
      'tags',
      'useLogicalAndFor',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_synthetic_monitors_request, 'body'),
    getZodLooseObjectFromProperty(get_synthetic_monitors_request, 'path'),
    getZodLooseObjectFromProperty(get_synthetic_monitors_request, 'query'),
  ]),
  outputSchema: get_synthetic_monitors_response,
};
const POST_SYNTHETIC_MONITORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_synthetic_monitors',
  connectorGroup: 'internal',
  summary: `Create a monitor`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new monitor with the specified attributes. A monitor can be one of the following types: HTTP, TCP, ICMP, or Browser. The required and default fields may vary based on the monitor type.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/api/synthetics/monitors'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_synthetic_monitors_request, 'body'),
    getZodLooseObjectFromProperty(post_synthetic_monitors_request, 'path'),
    getZodLooseObjectFromProperty(post_synthetic_monitors_request, 'query'),
  ]),
  outputSchema: post_synthetic_monitors_response,
};
const DELETE_SYNTHETIC_MONITORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_synthetic_monitors',
  connectorGroup: 'internal',
  summary: `Delete monitors`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors/_bulk_delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete multiple monitors by sending a list of config IDs.
`,
  methods: ['POST'],
  patterns: ['/api/synthetics/monitors/_bulk_delete'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['ids'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_synthetic_monitors_request, 'body'),
    getZodLooseObjectFromProperty(delete_synthetic_monitors_request, 'path'),
    getZodLooseObjectFromProperty(delete_synthetic_monitors_request, 'query'),
  ]),
  outputSchema: delete_synthetic_monitors_response,
};
const DELETE_SYNTHETIC_MONITOR_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_synthetic_monitor',
  connectorGroup: 'internal',
  summary: `Delete a monitor`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a monitor from the Synthetics app.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['DELETE'],
  patterns: ['/api/synthetics/monitors/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_synthetic_monitor_request, 'body'),
    getZodLooseObjectFromProperty(delete_synthetic_monitor_request, 'path'),
    getZodLooseObjectFromProperty(delete_synthetic_monitor_request, 'query'),
  ]),
  outputSchema: delete_synthetic_monitor_response,
};
const GET_SYNTHETIC_MONITOR_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_synthetic_monitor',
  connectorGroup: 'internal',
  summary: `Get a monitor`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/synthetics/monitors/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_synthetic_monitor_request, 'body'),
    getZodLooseObjectFromProperty(get_synthetic_monitor_request, 'path'),
    getZodLooseObjectFromProperty(get_synthetic_monitor_request, 'query'),
  ]),
  outputSchema: get_synthetic_monitor_response,
};
const PUT_SYNTHETIC_MONITOR_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_synthetic_monitor',
  connectorGroup: 'internal',
  summary: `Update a monitor`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a monitor with the specified attributes. The required and default fields may vary based on the monitor type.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
You can also partially update a monitor. This will only update the fields that are specified in the request body. All other fields are left unchanged. The specified fields should conform to the monitor type. For example, you can't update the \`inline_scipt\` field of a HTTP monitor.
`,
  methods: ['PUT'],
  patterns: ['/api/synthetics/monitors/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_synthetic_monitor_request, 'body'),
    getZodLooseObjectFromProperty(put_synthetic_monitor_request, 'path'),
    getZodLooseObjectFromProperty(put_synthetic_monitor_request, 'query'),
  ]),
  outputSchema: put_synthetic_monitor_response,
};
const GET_PARAMETERS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_parameters',
  connectorGroup: 'internal',
  summary: `Get parameters`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all parameters. You must have \`read\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/api/synthetics/params'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_parameters_request, 'body'),
    getZodLooseObjectFromProperty(get_parameters_request, 'path'),
    getZodLooseObjectFromProperty(get_parameters_request, 'query'),
  ]),
  outputSchema: get_parameters_response,
};
const POST_PARAMETERS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_parameters',
  connectorGroup: 'internal',
  summary: `Add parameters`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Add one or more parameters to the Synthetics app.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/api/synthetics/params'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_parameters_request, 'body'),
    getZodLooseObjectFromProperty(post_parameters_request, 'path'),
    getZodLooseObjectFromProperty(post_parameters_request, 'query'),
  ]),
  outputSchema: post_parameters_response,
};
const DELETE_PARAMETERS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_parameters',
  connectorGroup: 'internal',
  summary: `Delete parameters`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params/_bulk_delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete parameters from the Synthetics app.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['DELETE'],
  patterns: ['/api/synthetics/params/_bulk_delete'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['ids'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_parameters_request, 'body'),
    getZodLooseObjectFromProperty(delete_parameters_request, 'path'),
    getZodLooseObjectFromProperty(delete_parameters_request, 'query'),
  ]),
  outputSchema: delete_parameters_response,
};
const DELETE_PARAMETER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_parameter',
  connectorGroup: 'internal',
  summary: `Delete a parameter`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a parameter from the Synthetics app.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['DELETE'],
  patterns: ['/api/synthetics/params/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_parameter_request, 'body'),
    getZodLooseObjectFromProperty(delete_parameter_request, 'path'),
    getZodLooseObjectFromProperty(delete_parameter_request, 'query'),
  ]),
  outputSchema: delete_parameter_response,
};
const GET_PARAMETER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_parameter',
  connectorGroup: 'internal',
  summary: `Get a parameter`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a parameter from the Synthetics app.
You must have \`read\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/api/synthetics/params/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_parameter_request, 'body'),
    getZodLooseObjectFromProperty(get_parameter_request, 'path'),
    getZodLooseObjectFromProperty(get_parameter_request, 'query'),
  ]),
  outputSchema: get_parameter_response,
};
const PUT_PARAMETER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_parameter',
  connectorGroup: 'internal',
  summary: `Update a parameter`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a parameter in the Synthetics app.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['PUT'],
  patterns: ['/api/synthetics/params/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['description', 'key', 'tags', 'value'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_parameter_request, 'body'),
    getZodLooseObjectFromProperty(put_parameter_request, 'path'),
    getZodLooseObjectFromProperty(put_parameter_request, 'query'),
  ]),
  outputSchema: put_parameter_response,
};
const GET_PRIVATE_LOCATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_private_locations',
  connectorGroup: 'internal',
  summary: `Get private locations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/private_locations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of private locations.
You must have \`read\` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/api/synthetics/private_locations'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_private_locations_request, 'body'),
    getZodLooseObjectFromProperty(get_private_locations_request, 'path'),
    getZodLooseObjectFromProperty(get_private_locations_request, 'query'),
  ]),
  outputSchema: get_private_locations_response,
};
const POST_PRIVATE_LOCATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_private_location',
  connectorGroup: 'internal',
  summary: `Create a private location`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/private_locations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.`,
  methods: ['POST'],
  patterns: ['/api/synthetics/private_locations'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['agentPolicyId', 'geo', 'label', 'spaces', 'tags'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(post_private_location_request, 'body'),
    getZodLooseObjectFromProperty(post_private_location_request, 'path'),
    getZodLooseObjectFromProperty(post_private_location_request, 'query'),
  ]),
  outputSchema: post_private_location_response,
};
const DELETE_PRIVATE_LOCATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_private_location',
  connectorGroup: 'internal',
  summary: `Delete a private location`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/private_locations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.
The API does not return a response body for deletion, but it will return an appropriate status code upon successful deletion.
A location cannot be deleted if it has associated monitors in use. You must delete all monitors associated with the location before deleting the location.
`,
  methods: ['DELETE'],
  patterns: ['/api/synthetics/private_locations/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_private_location_request, 'body'),
    getZodLooseObjectFromProperty(delete_private_location_request, 'path'),
    getZodLooseObjectFromProperty(delete_private_location_request, 'query'),
  ]),
  outputSchema: delete_private_location_response,
};
const GET_PRIVATE_LOCATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_private_location',
  connectorGroup: 'internal',
  summary: `Get a private location`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/private_locations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/api/synthetics/private_locations/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_private_location_request, 'body'),
    getZodLooseObjectFromProperty(get_private_location_request, 'path'),
    getZodLooseObjectFromProperty(get_private_location_request, 'query'),
  ]),
  outputSchema: get_private_location_response,
};
const PUT_PRIVATE_LOCATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_private_location',
  connectorGroup: 'internal',
  summary: `Update a private location`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/private_locations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing private location's label.
You must have \`all\` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.
When a private location's label is updated, all monitors using this location will also be updated to maintain data consistency.
`,
  methods: ['PUT'],
  patterns: ['/api/synthetics/private_locations/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['label'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_private_location_request, 'body'),
    getZodLooseObjectFromProperty(put_private_location_request, 'path'),
    getZodLooseObjectFromProperty(put_private_location_request, 'query'),
  ]),
  outputSchema: put_private_location_response,
};
const TASK_MANAGER_HEALTH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.task_manager_health',
  connectorGroup: 'internal',
  summary: `Get the task manager health`,
  description: `Get the health status of the Kibana task manager.
`,
  methods: ['GET'],
  patterns: ['/api/task_manager/_health'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(task_manager_health_request, 'body'),
    getZodLooseObjectFromProperty(task_manager_health_request, 'path'),
    getZodLooseObjectFromProperty(task_manager_health_request, 'query'),
  ]),
  outputSchema: task_manager_health_response,
};
const DELETETIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteTimelines',
  connectorGroup: 'internal',
  summary: `Delete Timelines or Timeline templates`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete one or more Timelines or Timeline templates.`,
  methods: ['DELETE'],
  patterns: ['/api/timeline'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['savedObjectIds', 'searchIds'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_timelines_request, 'body'),
    getZodLooseObjectFromProperty(delete_timelines_request, 'path'),
    getZodLooseObjectFromProperty(delete_timelines_request, 'query'),
  ]),
  outputSchema: delete_timelines_response,
};
const GETTIMELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetTimeline',
  connectorGroup: 'internal',
  summary: `Get Timeline or Timeline template details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an existing saved Timeline or Timeline template.`,
  methods: ['GET'],
  patterns: ['/api/timeline'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['template_timeline_id', 'id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_timeline_request, 'body'),
    getZodLooseObjectFromProperty(get_timeline_request, 'path'),
    getZodLooseObjectFromProperty(get_timeline_request, 'query'),
  ]),
  outputSchema: get_timeline_response,
};
const PATCHTIMELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PatchTimeline',
  connectorGroup: 'internal',
  summary: `Update a Timeline`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing Timeline. You can update the title, description, date range, pinned events, pinned queries, and/or pinned saved queries of an existing Timeline.`,
  methods: ['PATCH'],
  patterns: ['/api/timeline'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['timeline', 'timelineId', 'version'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(patch_timeline_request, 'body'),
    getZodLooseObjectFromProperty(patch_timeline_request, 'path'),
    getZodLooseObjectFromProperty(patch_timeline_request, 'query'),
  ]),
  outputSchema: patch_timeline_response,
};
const CREATETIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateTimelines',
  connectorGroup: 'internal',
  summary: `Create a Timeline or Timeline template`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new Timeline or Timeline template.`,
  methods: ['POST'],
  patterns: ['/api/timeline'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'status',
      'templateTimelineId',
      'templateTimelineVersion',
      'timeline',
      'timelineId',
      'timelineType',
      'version',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_timelines_request, 'body'),
    getZodLooseObjectFromProperty(create_timelines_request, 'path'),
    getZodLooseObjectFromProperty(create_timelines_request, 'query'),
  ]),
  outputSchema: create_timelines_response,
};
const COPYTIMELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CopyTimeline',
  connectorGroup: 'internal',
  summary: `Copies timeline or timeline template`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_copy</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Copies and returns a timeline or timeline template.
`,
  methods: ['GET'],
  patterns: ['/api/timeline/_copy'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['timeline', 'timelineIdToCopy'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(copy_timeline_request, 'body'),
    getZodLooseObjectFromProperty(copy_timeline_request, 'path'),
    getZodLooseObjectFromProperty(copy_timeline_request, 'query'),
  ]),
  outputSchema: copy_timeline_response,
};
const GETDRAFTTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetDraftTimelines',
  connectorGroup: 'internal',
  summary: `Get draft Timeline or Timeline template details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_draft</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of the draft Timeline  or Timeline template for the current user. If the user doesn't have a draft Timeline, an empty Timeline is returned.`,
  methods: ['GET'],
  patterns: ['/api/timeline/_draft'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['timelineType'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_draft_timelines_request, 'body'),
    getZodLooseObjectFromProperty(get_draft_timelines_request, 'path'),
    getZodLooseObjectFromProperty(get_draft_timelines_request, 'query'),
  ]),
  outputSchema: get_draft_timelines_response,
};
const CLEANDRAFTTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CleanDraftTimelines',
  connectorGroup: 'internal',
  summary: `Create a clean draft Timeline or Timeline template`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_draft</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a clean draft Timeline or Timeline template for the current user.
> info
> If the user already has a draft Timeline, the existing draft Timeline is cleared and returned.
`,
  methods: ['POST'],
  patterns: ['/api/timeline/_draft'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['timelineType'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(clean_draft_timelines_request, 'body'),
    getZodLooseObjectFromProperty(clean_draft_timelines_request, 'path'),
    getZodLooseObjectFromProperty(clean_draft_timelines_request, 'query'),
  ]),
  outputSchema: clean_draft_timelines_response,
};
const EXPORTTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ExportTimelines',
  connectorGroup: 'internal',
  summary: `Export Timelines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Export Timelines as an NDJSON file.`,
  methods: ['POST'],
  patterns: ['/api/timeline/_export'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['file_name'],
    bodyParams: ['ids'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(export_timelines_request, 'body'),
    getZodLooseObjectFromProperty(export_timelines_request, 'path'),
    getZodLooseObjectFromProperty(export_timelines_request, 'query'),
  ]),
  outputSchema: export_timelines_response,
};
const PERSISTFAVORITEROUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PersistFavoriteRoute',
  connectorGroup: 'internal',
  summary: `Favorite a Timeline or Timeline template`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_favorite</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Favorite a Timeline or Timeline template for the current user.`,
  methods: ['PATCH'],
  patterns: ['/api/timeline/_favorite'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['templateTimelineId', 'templateTimelineVersion', 'timelineId', 'timelineType'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(persist_favorite_route_request, 'body'),
    getZodLooseObjectFromProperty(persist_favorite_route_request, 'path'),
    getZodLooseObjectFromProperty(persist_favorite_route_request, 'query'),
  ]),
  outputSchema: persist_favorite_route_response,
};
const IMPORTTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ImportTimelines',
  connectorGroup: 'internal',
  summary: `Import Timelines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Import Timelines.`,
  methods: ['POST'],
  patterns: ['/api/timeline/_import'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['file', 'isImmutable'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(import_timelines_request, 'body'),
    getZodLooseObjectFromProperty(import_timelines_request, 'path'),
    getZodLooseObjectFromProperty(import_timelines_request, 'query'),
  ]),
  outputSchema: import_timelines_response,
};
const INSTALLPREPACKEDTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InstallPrepackedTimelines',
  connectorGroup: 'internal',
  summary: `Install prepackaged Timelines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_prepackaged</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Install or update prepackaged Timelines.`,
  methods: ['POST'],
  patterns: ['/api/timeline/_prepackaged'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['prepackagedTimelines', 'timelinesToInstall', 'timelinesToUpdate'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(install_prepacked_timelines_request, 'body'),
    getZodLooseObjectFromProperty(install_prepacked_timelines_request, 'path'),
    getZodLooseObjectFromProperty(install_prepacked_timelines_request, 'query'),
  ]),
  outputSchema: install_prepacked_timelines_response,
};
const RESOLVETIMELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ResolveTimeline',
  connectorGroup: 'internal',
  summary: `Get an existing saved Timeline or Timeline template`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/resolve</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/timeline/resolve'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['template_timeline_id', 'id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(resolve_timeline_request, 'body'),
    getZodLooseObjectFromProperty(resolve_timeline_request, 'path'),
    getZodLooseObjectFromProperty(resolve_timeline_request, 'query'),
  ]),
  outputSchema: resolve_timeline_response,
};
const GETTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetTimelines',
  connectorGroup: 'internal',
  summary: `Get Timelines or Timeline templates`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timelines</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all saved Timelines or Timeline templates.`,
  methods: ['GET'],
  patterns: ['/api/timelines'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'only_user_favorite',
      'timeline_type',
      'sort_field',
      'sort_order',
      'page_size',
      'page_index',
      'search',
      'status',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_timelines_request, 'body'),
    getZodLooseObjectFromProperty(get_timelines_request, 'path'),
    getZodLooseObjectFromProperty(get_timelines_request, 'query'),
  ]),
  outputSchema: get_timelines_response,
};
const GET_UPGRADE_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_upgrade_status',
  connectorGroup: 'internal',
  summary: `Get the upgrade readiness status`,
  description: `Check the status of your cluster.`,
  methods: ['GET'],
  patterns: ['/api/upgrade_assistant/status'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_upgrade_status_request, 'body'),
    getZodLooseObjectFromProperty(get_upgrade_status_request, 'path'),
    getZodLooseObjectFromProperty(get_upgrade_status_request, 'query'),
  ]),
  outputSchema: get_upgrade_status_response,
};
const GET_UPTIME_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_uptime_settings',
  connectorGroup: 'internal',
  summary: `Get uptime settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/uptime/settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the uptime feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/api/uptime/settings'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_uptime_settings_request, 'body'),
    getZodLooseObjectFromProperty(get_uptime_settings_request, 'path'),
    getZodLooseObjectFromProperty(get_uptime_settings_request, 'query'),
  ]),
  outputSchema: get_uptime_settings_response,
};
const PUT_UPTIME_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_uptime_settings',
  connectorGroup: 'internal',
  summary: `Update uptime settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/uptime/settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update uptime setting attributes like \`heartbeatIndices\`, \`certExpirationThreshold\`, \`certAgeThreshold\`, \`defaultConnectors\`, or \`defaultEmail\`. You must have \`all\` privileges for the uptime feature in the Observability section of the Kibana feature privileges. A partial update is supported, provided settings keys will be merged with existing settings.
`,
  methods: ['PUT'],
  patterns: ['/api/uptime/settings'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'certAgeThreshold',
      'certExpirationThreshold',
      'defaultConnectors',
      'defaultEmail',
      'heartbeatIndices',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(put_uptime_settings_request, 'body'),
    getZodLooseObjectFromProperty(put_uptime_settings_request, 'path'),
    getZodLooseObjectFromProperty(put_uptime_settings_request, 'query'),
  ]),
  outputSchema: put_uptime_settings_response,
};
const FINDSLOSOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findSlosOp',
  connectorGroup: 'internal',
  summary: `Get a paginated list of SLOs`,
  description: `You must have the \`read\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/s/{spaceId}/api/observability/slos'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId'],
    urlParams: [
      'kqlQuery',
      'size',
      'searchAfter',
      'page',
      'perPage',
      'sortBy',
      'sortDirection',
      'hideStale',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(find_slos_op_request, 'body'),
    getZodLooseObjectFromProperty(find_slos_op_request, 'path'),
    getZodLooseObjectFromProperty(find_slos_op_request, 'query'),
  ]),
  outputSchema: find_slos_op_response,
};
const CREATESLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createSloOp',
  connectorGroup: 'internal',
  summary: `Create an SLO`,
  description: `You must have \`all\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId'],
    urlParams: [],
    bodyParams: [
      'artifacts',
      'budgetingMethod',
      'description',
      'groupBy',
      'id',
      'indicator',
      'name',
      'objective',
      'settings',
      'tags',
      'timeWindow',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(create_slo_op_request, 'body'),
    getZodLooseObjectFromProperty(create_slo_op_request, 'path'),
    getZodLooseObjectFromProperty(create_slo_op_request, 'query'),
  ]),
  outputSchema: create_slo_op_response,
};
const BULKDELETEOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkDeleteOp',
  connectorGroup: 'internal',
  summary: `Bulk delete SLO definitions and their associated summary and rollup data.`,
  description: `Bulk delete SLO definitions and their associated summary and rollup data.  This endpoint initiates a bulk deletion operation for SLOs, which may take some time to complete.  The status of the operation can be checked using the \`GET /api/slo/_bulk_delete/{taskId}\` endpoint.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos/_bulk_delete'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId'],
    urlParams: [],
    bodyParams: ['list'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(bulk_delete_op_request, 'body'),
    getZodLooseObjectFromProperty(bulk_delete_op_request, 'path'),
    getZodLooseObjectFromProperty(bulk_delete_op_request, 'query'),
  ]),
  outputSchema: bulk_delete_op_response,
};
const BULKDELETESTATUSOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkDeleteStatusOp',
  connectorGroup: 'internal',
  summary: `Retrieve the status of the bulk deletion`,
  description: `Retrieve the status of the bulk deletion operation for SLOs.  This endpoint returns the status of the bulk deletion operation, including whether it is completed and the results of the operation.
`,
  methods: ['GET'],
  patterns: ['/s/{spaceId}/api/observability/slos/_bulk_delete/{taskId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId', 'taskId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(bulk_delete_status_op_request, 'body'),
    getZodLooseObjectFromProperty(bulk_delete_status_op_request, 'path'),
    getZodLooseObjectFromProperty(bulk_delete_status_op_request, 'query'),
  ]),
  outputSchema: bulk_delete_status_op_response,
};
const DELETEROLLUPDATAOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteRollupDataOp',
  connectorGroup: 'internal',
  summary: `Batch delete rollup and summary data`,
  description: `The deletion occurs for the specified list of \`sloId\`. You must have \`all\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos/_bulk_purge_rollup'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId'],
    urlParams: [],
    bodyParams: ['list', 'purgePolicy'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_rollup_data_op_request, 'body'),
    getZodLooseObjectFromProperty(delete_rollup_data_op_request, 'path'),
    getZodLooseObjectFromProperty(delete_rollup_data_op_request, 'query'),
  ]),
  outputSchema: delete_rollup_data_op_response,
};
const DELETESLOINSTANCESOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteSloInstancesOp',
  connectorGroup: 'internal',
  summary: `Batch delete rollup and summary data`,
  description: `The deletion occurs for the specified list of \`sloId\` and \`instanceId\`. You must have \`all\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos/_delete_instances'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId'],
    urlParams: [],
    bodyParams: ['list'],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_slo_instances_op_request, 'body'),
    getZodLooseObjectFromProperty(delete_slo_instances_op_request, 'path'),
    getZodLooseObjectFromProperty(delete_slo_instances_op_request, 'query'),
  ]),
  outputSchema: delete_slo_instances_op_response,
};
const DELETESLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteSloOp',
  connectorGroup: 'internal',
  summary: `Delete an SLO`,
  description: `You must have the \`write\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['DELETE'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId', 'sloId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(delete_slo_op_request, 'body'),
    getZodLooseObjectFromProperty(delete_slo_op_request, 'path'),
    getZodLooseObjectFromProperty(delete_slo_op_request, 'query'),
  ]),
  outputSchema: delete_slo_op_response,
};
const GETSLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getSloOp',
  connectorGroup: 'internal',
  summary: `Get an SLO`,
  description: `You must have the \`read\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId', 'sloId'],
    urlParams: ['instanceId'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_slo_op_request, 'body'),
    getZodLooseObjectFromProperty(get_slo_op_request, 'path'),
    getZodLooseObjectFromProperty(get_slo_op_request, 'query'),
  ]),
  outputSchema: get_slo_op_response,
};
const UPDATESLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateSloOp',
  connectorGroup: 'internal',
  summary: `Update an SLO`,
  description: `You must have the \`write\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['PUT'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId', 'sloId'],
    urlParams: [],
    bodyParams: [
      'artifacts',
      'budgetingMethod',
      'description',
      'groupBy',
      'indicator',
      'name',
      'objective',
      'settings',
      'tags',
      'timeWindow',
    ],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(update_slo_op_request, 'body'),
    getZodLooseObjectFromProperty(update_slo_op_request, 'path'),
    getZodLooseObjectFromProperty(update_slo_op_request, 'query'),
  ]),
  outputSchema: update_slo_op_response,
};
const RESETSLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.resetSloOp',
  connectorGroup: 'internal',
  summary: `Reset an SLO`,
  description: `You must have the \`write\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}/_reset'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId', 'sloId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(reset_slo_op_request, 'body'),
    getZodLooseObjectFromProperty(reset_slo_op_request, 'path'),
    getZodLooseObjectFromProperty(reset_slo_op_request, 'query'),
  ]),
  outputSchema: reset_slo_op_response,
};
const DISABLESLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.disableSloOp',
  connectorGroup: 'internal',
  summary: `Disable an SLO`,
  description: `You must have the \`write\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}/disable'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId', 'sloId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(disable_slo_op_request, 'body'),
    getZodLooseObjectFromProperty(disable_slo_op_request, 'path'),
    getZodLooseObjectFromProperty(disable_slo_op_request, 'query'),
  ]),
  outputSchema: disable_slo_op_response,
};
const ENABLESLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.enableSloOp',
  connectorGroup: 'internal',
  summary: `Enable an SLO`,
  description: `You must have the \`write\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}/enable'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId', 'sloId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(enable_slo_op_request, 'body'),
    getZodLooseObjectFromProperty(enable_slo_op_request, 'path'),
    getZodLooseObjectFromProperty(enable_slo_op_request, 'query'),
  ]),
  outputSchema: enable_slo_op_response,
};
const GETDEFINITIONSOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getDefinitionsOp',
  connectorGroup: 'internal',
  summary: `Get the SLO definitions`,
  description: `You must have the \`read\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/s/{spaceId}/internal/observability/slos/_definitions'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId'],
    urlParams: ['includeOutdatedOnly', 'includeHealth', 'tags', 'search', 'page', 'perPage'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getZodLooseObjectFromProperty(get_definitions_op_request, 'body'),
    getZodLooseObjectFromProperty(get_definitions_op_request, 'path'),
    getZodLooseObjectFromProperty(get_definitions_op_request, 'query'),
  ]),
  outputSchema: get_definitions_op_response,
};

// export contracts
export const GENERATED_KIBANA_CONNECTORS: InternalConnectorContract[] = [
  GET_ACTIONS_CONNECTOR_TYPES_CONTRACT,
  DELETE_ACTIONS_CONNECTOR_ID_CONTRACT,
  GET_ACTIONS_CONNECTOR_ID_CONTRACT,
  POST_ACTIONS_CONNECTOR_ID_CONTRACT,
  PUT_ACTIONS_CONNECTOR_ID_CONTRACT,
  POST_ACTIONS_CONNECTOR_ID_EXECUTE_CONTRACT,
  GET_ACTIONS_CONNECTORS_CONTRACT,
  POST_AGENT_BUILDER_A2A_AGENTID_CONTRACT,
  GET_AGENT_BUILDER_A2A_AGENTID_JSON_CONTRACT,
  GET_AGENT_BUILDER_AGENTS_CONTRACT,
  POST_AGENT_BUILDER_AGENTS_CONTRACT,
  DELETE_AGENT_BUILDER_AGENTS_ID_CONTRACT,
  GET_AGENT_BUILDER_AGENTS_ID_CONTRACT,
  PUT_AGENT_BUILDER_AGENTS_ID_CONTRACT,
  GET_AGENT_BUILDER_CONVERSATIONS_CONTRACT,
  DELETE_AGENT_BUILDER_CONVERSATIONS_CONVERSATION_ID_CONTRACT,
  GET_AGENT_BUILDER_CONVERSATIONS_CONVERSATION_ID_CONTRACT,
  POST_AGENT_BUILDER_CONVERSE_CONTRACT,
  POST_AGENT_BUILDER_CONVERSE_ASYNC_CONTRACT,
  POST_AGENT_BUILDER_MCP_CONTRACT,
  GET_AGENT_BUILDER_TOOLS_CONTRACT,
  POST_AGENT_BUILDER_TOOLS_CONTRACT,
  POST_AGENT_BUILDER_TOOLS_EXECUTE_CONTRACT,
  DELETE_AGENT_BUILDER_TOOLS_TOOLID_CONTRACT,
  GET_AGENT_BUILDER_TOOLS_TOOLID_CONTRACT,
  PUT_AGENT_BUILDER_TOOLS_TOOLID_CONTRACT,
  GETALERTINGHEALTH_CONTRACT,
  GETRULETYPES_CONTRACT,
  DELETE_ALERTING_RULE_ID_CONTRACT,
  GET_ALERTING_RULE_ID_CONTRACT,
  POST_ALERTING_RULE_ID_CONTRACT,
  PUT_ALERTING_RULE_ID_CONTRACT,
  POST_ALERTING_RULE_ID_DISABLE_CONTRACT,
  POST_ALERTING_RULE_ID_ENABLE_CONTRACT,
  POST_ALERTING_RULE_ID_MUTE_ALL_CONTRACT,
  POST_ALERTING_RULE_ID_UNMUTE_ALL_CONTRACT,
  POST_ALERTING_RULE_ID_UPDATE_API_KEY_CONTRACT,
  POST_ALERTING_RULE_ID_SNOOZE_SCHEDULE_CONTRACT,
  POST_ALERTING_RULE_RULE_ID_ALERT_ALERT_ID_MUTE_CONTRACT,
  POST_ALERTING_RULE_RULE_ID_ALERT_ALERT_ID_UNMUTE_CONTRACT,
  DELETE_ALERTING_RULE_RULEID_SNOOZE_SCHEDULE_SCHEDULEID_CONTRACT,
  GET_ALERTING_RULES_FIND_CONTRACT,
  CREATEAGENTKEY_CONTRACT,
  SAVEAPMSERVERSCHEMA_CONTRACT,
  CREATEANNOTATION_CONTRACT,
  GETANNOTATION_CONTRACT,
  DELETEAGENTCONFIGURATION_CONTRACT,
  GETAGENTCONFIGURATIONS_CONTRACT,
  CREATEUPDATEAGENTCONFIGURATION_CONTRACT,
  GETAGENTNAMEFORSERVICE_CONTRACT,
  GETENVIRONMENTSFORSERVICE_CONTRACT,
  SEARCHSINGLECONFIGURATION_CONTRACT,
  GETSINGLEAGENTCONFIGURATION_CONTRACT,
  GETSOURCEMAPS_CONTRACT,
  UPLOADSOURCEMAP_CONTRACT,
  DELETESOURCEMAP_CONTRACT,
  DELETEASSETCRITICALITYRECORD_CONTRACT,
  GETASSETCRITICALITYRECORD_CONTRACT,
  CREATEASSETCRITICALITYRECORD_CONTRACT,
  BULKUPSERTASSETCRITICALITYRECORDS_CONTRACT,
  FINDASSETCRITICALITYRECORDS_CONTRACT,
  POSTATTACKDISCOVERYBULK_CONTRACT,
  ATTACKDISCOVERYFIND_CONTRACT,
  POSTATTACKDISCOVERYGENERATE_CONTRACT,
  GETATTACKDISCOVERYGENERATIONS_CONTRACT,
  GETATTACKDISCOVERYGENERATION_CONTRACT,
  POSTATTACKDISCOVERYGENERATIONSDISMISS_CONTRACT,
  CREATEATTACKDISCOVERYSCHEDULES_CONTRACT,
  FINDATTACKDISCOVERYSCHEDULES_CONTRACT,
  DELETEATTACKDISCOVERYSCHEDULES_CONTRACT,
  GETATTACKDISCOVERYSCHEDULES_CONTRACT,
  UPDATEATTACKDISCOVERYSCHEDULES_CONTRACT,
  DISABLEATTACKDISCOVERYSCHEDULES_CONTRACT,
  ENABLEATTACKDISCOVERYSCHEDULES_CONTRACT,
  DELETECASEDEFAULTSPACE_CONTRACT,
  UPDATECASEDEFAULTSPACE_CONTRACT,
  CREATECASEDEFAULTSPACE_CONTRACT,
  FINDCASESDEFAULTSPACE_CONTRACT,
  GETCASEDEFAULTSPACE_CONTRACT,
  GETCASEALERTSDEFAULTSPACE_CONTRACT,
  DELETECASECOMMENTSDEFAULTSPACE_CONTRACT,
  UPDATECASECOMMENTDEFAULTSPACE_CONTRACT,
  ADDCASECOMMENTDEFAULTSPACE_CONTRACT,
  FINDCASECOMMENTSDEFAULTSPACE_CONTRACT,
  DELETECASECOMMENTDEFAULTSPACE_CONTRACT,
  GETCASECOMMENTDEFAULTSPACE_CONTRACT,
  PUSHCASEDEFAULTSPACE_CONTRACT,
  ADDCASEFILEDEFAULTSPACE_CONTRACT,
  FINDCASEACTIVITYDEFAULTSPACE_CONTRACT,
  GETCASESBYALERTDEFAULTSPACE_CONTRACT,
  GETCASECONFIGURATIONDEFAULTSPACE_CONTRACT,
  SETCASECONFIGURATIONDEFAULTSPACE_CONTRACT,
  UPDATECASECONFIGURATIONDEFAULTSPACE_CONTRACT,
  FINDCASECONNECTORSDEFAULTSPACE_CONTRACT,
  GETCASEREPORTERSDEFAULTSPACE_CONTRACT,
  GETCASETAGSDEFAULTSPACE_CONTRACT,
  GETALLDATAVIEWSDEFAULT_CONTRACT,
  CREATEDATAVIEWDEFAULTW_CONTRACT,
  DELETEDATAVIEWDEFAULT_CONTRACT,
  GETDATAVIEWDEFAULT_CONTRACT,
  UPDATEDATAVIEWDEFAULT_CONTRACT,
  UPDATEFIELDSMETADATADEFAULT_CONTRACT,
  CREATERUNTIMEFIELDDEFAULT_CONTRACT,
  CREATEUPDATERUNTIMEFIELDDEFAULT_CONTRACT,
  DELETERUNTIMEFIELDDEFAULT_CONTRACT,
  GETRUNTIMEFIELDDEFAULT_CONTRACT,
  UPDATERUNTIMEFIELDDEFAULT_CONTRACT,
  GETDEFAULTDATAVIEWDEFAULT_CONTRACT,
  SETDEFAULTDATAILVIEWDEFAULT_CONTRACT,
  SWAPDATAVIEWSDEFAULT_CONTRACT,
  PREVIEWSWAPDATAVIEWSDEFAULT_CONTRACT,
  DELETEALERTSINDEX_CONTRACT,
  READALERTSINDEX_CONTRACT,
  CREATEALERTSINDEX_CONTRACT,
  READPRIVILEGES_CONTRACT,
  DELETERULE_CONTRACT,
  READRULE_CONTRACT,
  PATCHRULE_CONTRACT,
  CREATERULE_CONTRACT,
  UPDATERULE_CONTRACT,
  PERFORMRULESBULKACTION_CONTRACT,
  EXPORTRULES_CONTRACT,
  FINDRULES_CONTRACT,
  IMPORTRULES_CONTRACT,
  CREATERULEEXCEPTIONLISTITEMS_CONTRACT,
  INSTALLPREBUILTRULESANDTIMELINES_CONTRACT,
  READPREBUILTRULESANDTIMELINESSTATUS_CONTRACT,
  RULEPREVIEW_CONTRACT,
  SETALERTASSIGNEES_CONTRACT,
  FINALIZEALERTSMIGRATION_CONTRACT,
  ALERTSMIGRATIONCLEANUP_CONTRACT,
  CREATEALERTSMIGRATION_CONTRACT,
  READALERTSMIGRATIONSTATUS_CONTRACT,
  SEARCHALERTS_CONTRACT,
  SETALERTSSTATUS_CONTRACT,
  SETALERTTAGS_CONTRACT,
  READTAGS_CONTRACT,
  ROTATEENCRYPTIONKEY_CONTRACT,
  CREATEENDPOINTLIST_CONTRACT,
  DELETEENDPOINTLISTITEM_CONTRACT,
  READENDPOINTLISTITEM_CONTRACT,
  CREATEENDPOINTLISTITEM_CONTRACT,
  UPDATEENDPOINTLISTITEM_CONTRACT,
  FINDENDPOINTLISTITEMS_CONTRACT,
  ENDPOINTGETACTIONSLIST_CONTRACT,
  ENDPOINTGETACTIONSSTATUS_CONTRACT,
  ENDPOINTGETACTIONSDETAILS_CONTRACT,
  ENDPOINTFILEINFO_CONTRACT,
  ENDPOINTFILEDOWNLOAD_CONTRACT,
  CANCELACTION_CONTRACT,
  ENDPOINTEXECUTEACTION_CONTRACT,
  ENDPOINTGETFILEACTION_CONTRACT,
  ENDPOINTISOLATEACTION_CONTRACT,
  ENDPOINTKILLPROCESSACTION_CONTRACT,
  ENDPOINTGETPROCESSESACTION_CONTRACT,
  RUNSCRIPTACTION_CONTRACT,
  ENDPOINTSCANACTION_CONTRACT,
  ENDPOINTGETACTIONSSTATE_CONTRACT,
  ENDPOINTSUSPENDPROCESSACTION_CONTRACT,
  ENDPOINTUNISOLATEACTION_CONTRACT,
  ENDPOINTUPLOADACTION_CONTRACT,
  GETENDPOINTMETADATALIST_CONTRACT,
  GETENDPOINTMETADATA_CONTRACT,
  GETPOLICYRESPONSE_CONTRACT,
  GETPROTECTIONUPDATESNOTE_CONTRACT,
  CREATEUPDATEPROTECTIONUPDATESNOTE_CONTRACT,
  DELETEMONITORINGENGINE_CONTRACT,
  DISABLEMONITORINGENGINE_CONTRACT,
  INITMONITORINGENGINE_CONTRACT,
  SCHEDULEMONITORINGENGINE_CONTRACT,
  PRIVMONHEALTH_CONTRACT,
  PRIVMONPRIVILEGES_CONTRACT,
  CREATEPRIVMONUSER_CONTRACT,
  PRIVMONBULKUPLOADUSERSCSV_CONTRACT,
  DELETEPRIVMONUSER_CONTRACT,
  UPDATEPRIVMONUSER_CONTRACT,
  LISTPRIVMONUSERS_CONTRACT,
  INSTALLPRIVILEGEDACCESSDETECTIONPACKAGE_CONTRACT,
  GETPRIVILEGEDACCESSDETECTIONPACKAGESTATUS_CONTRACT,
  INITENTITYSTORE_CONTRACT,
  DELETEENTITYENGINES_CONTRACT,
  LISTENTITYENGINES_CONTRACT,
  DELETEENTITYENGINE_CONTRACT,
  GETENTITYENGINE_CONTRACT,
  INITENTITYENGINE_CONTRACT,
  STARTENTITYENGINE_CONTRACT,
  STOPENTITYENGINE_CONTRACT,
  APPLYENTITYENGINEDATAVIEWINDICES_CONTRACT,
  DELETESINGLEENTITY_CONTRACT,
  UPSERTENTITY_CONTRACT,
  UPSERTENTITIESBULK_CONTRACT,
  LISTENTITIES_CONTRACT,
  GETENTITYSTORESTATUS_CONTRACT,
  DELETEEXCEPTIONLIST_CONTRACT,
  READEXCEPTIONLIST_CONTRACT,
  CREATEEXCEPTIONLIST_CONTRACT,
  UPDATEEXCEPTIONLIST_CONTRACT,
  DUPLICATEEXCEPTIONLIST_CONTRACT,
  EXPORTEXCEPTIONLIST_CONTRACT,
  FINDEXCEPTIONLISTS_CONTRACT,
  IMPORTEXCEPTIONLIST_CONTRACT,
  DELETEEXCEPTIONLISTITEM_CONTRACT,
  READEXCEPTIONLISTITEM_CONTRACT,
  CREATEEXCEPTIONLISTITEM_CONTRACT,
  UPDATEEXCEPTIONLISTITEM_CONTRACT,
  FINDEXCEPTIONLISTITEMS_CONTRACT,
  READEXCEPTIONLISTSUMMARY_CONTRACT,
  CREATESHAREDEXCEPTIONLIST_CONTRACT,
  GET_FEATURES_CONTRACT,
  GET_FLEET_AGENT_DOWNLOAD_SOURCES_CONTRACT,
  POST_FLEET_AGENT_DOWNLOAD_SOURCES_CONTRACT,
  DELETE_FLEET_AGENT_DOWNLOAD_SOURCES_SOURCEID_CONTRACT,
  GET_FLEET_AGENT_DOWNLOAD_SOURCES_SOURCEID_CONTRACT,
  PUT_FLEET_AGENT_DOWNLOAD_SOURCES_SOURCEID_CONTRACT,
  GET_FLEET_AGENT_POLICIES_CONTRACT,
  POST_FLEET_AGENT_POLICIES_CONTRACT,
  POST_FLEET_AGENT_POLICIES_BULK_GET_CONTRACT,
  GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_CONTRACT,
  PUT_FLEET_AGENT_POLICIES_AGENTPOLICYID_CONTRACT,
  GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_AUTO_UPGRADE_AGENTS_STATUS_CONTRACT,
  POST_FLEET_AGENT_POLICIES_AGENTPOLICYID_COPY_CONTRACT,
  GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_DOWNLOAD_CONTRACT,
  GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_FULL_CONTRACT,
  GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_OUTPUTS_CONTRACT,
  POST_FLEET_AGENT_POLICIES_DELETE_CONTRACT,
  POST_FLEET_AGENT_POLICIES_OUTPUTS_CONTRACT,
  GET_FLEET_AGENT_STATUS_CONTRACT,
  GET_FLEET_AGENT_STATUS_DATA_CONTRACT,
  POST_FLEET_AGENTLESS_POLICIES_CONTRACT,
  DELETE_FLEET_AGENTLESS_POLICIES_POLICYID_CONTRACT,
  GET_FLEET_AGENTS_CONTRACT,
  POST_FLEET_AGENTS_CONTRACT,
  DELETE_FLEET_AGENTS_AGENTID_CONTRACT,
  GET_FLEET_AGENTS_AGENTID_CONTRACT,
  PUT_FLEET_AGENTS_AGENTID_CONTRACT,
  POST_FLEET_AGENTS_AGENTID_ACTIONS_CONTRACT,
  POST_FLEET_AGENTS_AGENTID_MIGRATE_CONTRACT,
  POST_FLEET_AGENTS_AGENTID_REASSIGN_CONTRACT,
  POST_FLEET_AGENTS_AGENTID_REQUEST_DIAGNOSTICS_CONTRACT,
  POST_FLEET_AGENTS_AGENTID_UNENROLL_CONTRACT,
  POST_FLEET_AGENTS_AGENTID_UPGRADE_CONTRACT,
  GET_FLEET_AGENTS_AGENTID_UPLOADS_CONTRACT,
  GET_FLEET_AGENTS_ACTION_STATUS_CONTRACT,
  POST_FLEET_AGENTS_ACTIONS_ACTIONID_CANCEL_CONTRACT,
  GET_FLEET_AGENTS_AVAILABLE_VERSIONS_CONTRACT,
  POST_FLEET_AGENTS_BULK_MIGRATE_CONTRACT,
  POST_FLEET_AGENTS_BULK_REASSIGN_CONTRACT,
  POST_FLEET_AGENTS_BULK_REQUEST_DIAGNOSTICS_CONTRACT,
  POST_FLEET_AGENTS_BULK_UNENROLL_CONTRACT,
  POST_FLEET_AGENTS_BULK_UPDATE_AGENT_TAGS_CONTRACT,
  POST_FLEET_AGENTS_BULK_UPGRADE_CONTRACT,
  DELETE_FLEET_AGENTS_FILES_FILEID_CONTRACT,
  GET_FLEET_AGENTS_FILES_FILEID_FILENAME_CONTRACT,
  GET_FLEET_AGENTS_SETUP_CONTRACT,
  POST_FLEET_AGENTS_SETUP_CONTRACT,
  GET_FLEET_AGENTS_TAGS_CONTRACT,
  GET_FLEET_CHECK_PERMISSIONS_CONTRACT,
  GET_FLEET_CLOUD_CONNECTORS_CONTRACT,
  POST_FLEET_CLOUD_CONNECTORS_CONTRACT,
  DELETE_FLEET_CLOUD_CONNECTORS_CLOUDCONNECTORID_CONTRACT,
  GET_FLEET_CLOUD_CONNECTORS_CLOUDCONNECTORID_CONTRACT,
  PUT_FLEET_CLOUD_CONNECTORS_CLOUDCONNECTORID_CONTRACT,
  GET_FLEET_DATA_STREAMS_CONTRACT,
  GET_FLEET_ENROLLMENT_API_KEYS_CONTRACT,
  POST_FLEET_ENROLLMENT_API_KEYS_CONTRACT,
  DELETE_FLEET_ENROLLMENT_API_KEYS_KEYID_CONTRACT,
  GET_FLEET_ENROLLMENT_API_KEYS_KEYID_CONTRACT,
  POST_FLEET_EPM_BULK_ASSETS_CONTRACT,
  GET_FLEET_EPM_CATEGORIES_CONTRACT,
  POST_FLEET_EPM_CUSTOM_INTEGRATIONS_CONTRACT,
  PUT_FLEET_EPM_CUSTOM_INTEGRATIONS_PKGNAME_CONTRACT,
  GET_FLEET_EPM_DATA_STREAMS_CONTRACT,
  GET_FLEET_EPM_PACKAGES_CONTRACT,
  POST_FLEET_EPM_PACKAGES_CONTRACT,
  POST_FLEET_EPM_PACKAGES_BULK_CONTRACT,
  POST_FLEET_EPM_PACKAGES_BULK_ROLLBACK_CONTRACT,
  GET_FLEET_EPM_PACKAGES_BULK_ROLLBACK_TASKID_CONTRACT,
  POST_FLEET_EPM_PACKAGES_BULK_UNINSTALL_CONTRACT,
  GET_FLEET_EPM_PACKAGES_BULK_UNINSTALL_TASKID_CONTRACT,
  POST_FLEET_EPM_PACKAGES_BULK_UPGRADE_CONTRACT,
  GET_FLEET_EPM_PACKAGES_BULK_UPGRADE_TASKID_CONTRACT,
  DELETE_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT,
  GET_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT,
  POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT,
  PUT_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT,
  GET_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_FILEPATH_CONTRACT,
  DELETE_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_DATASTREAM_ASSETS_CONTRACT,
  DELETE_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_KIBANA_ASSETS_CONTRACT,
  POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_KIBANA_ASSETS_CONTRACT,
  POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_RULE_ASSETS_CONTRACT,
  POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_TRANSFORMS_AUTHORIZE_CONTRACT,
  POST_FLEET_EPM_PACKAGES_PKGNAME_ROLLBACK_CONTRACT,
  GET_FLEET_EPM_PACKAGES_PKGNAME_STATS_CONTRACT,
  GET_FLEET_EPM_PACKAGES_INSTALLED_CONTRACT,
  GET_FLEET_EPM_PACKAGES_LIMITED_CONTRACT,
  GET_FLEET_EPM_TEMPLATES_PKGNAME_PKGVERSION_INPUTS_CONTRACT,
  GET_FLEET_EPM_VERIFICATION_KEY_ID_CONTRACT,
  GET_FLEET_FLEET_SERVER_HOSTS_CONTRACT,
  POST_FLEET_FLEET_SERVER_HOSTS_CONTRACT,
  DELETE_FLEET_FLEET_SERVER_HOSTS_ITEMID_CONTRACT,
  GET_FLEET_FLEET_SERVER_HOSTS_ITEMID_CONTRACT,
  PUT_FLEET_FLEET_SERVER_HOSTS_ITEMID_CONTRACT,
  POST_FLEET_HEALTH_CHECK_CONTRACT,
  GET_FLEET_KUBERNETES_CONTRACT,
  GET_FLEET_KUBERNETES_DOWNLOAD_CONTRACT,
  POST_FLEET_LOGSTASH_API_KEYS_CONTRACT,
  POST_FLEET_MESSAGE_SIGNING_SERVICE_ROTATE_KEY_PAIR_CONTRACT,
  GET_FLEET_OUTPUTS_CONTRACT,
  POST_FLEET_OUTPUTS_CONTRACT,
  DELETE_FLEET_OUTPUTS_OUTPUTID_CONTRACT,
  GET_FLEET_OUTPUTS_OUTPUTID_CONTRACT,
  PUT_FLEET_OUTPUTS_OUTPUTID_CONTRACT,
  GET_FLEET_OUTPUTS_OUTPUTID_HEALTH_CONTRACT,
  GET_FLEET_PACKAGE_POLICIES_CONTRACT,
  POST_FLEET_PACKAGE_POLICIES_CONTRACT,
  POST_FLEET_PACKAGE_POLICIES_BULK_GET_CONTRACT,
  DELETE_FLEET_PACKAGE_POLICIES_PACKAGEPOLICYID_CONTRACT,
  GET_FLEET_PACKAGE_POLICIES_PACKAGEPOLICYID_CONTRACT,
  PUT_FLEET_PACKAGE_POLICIES_PACKAGEPOLICYID_CONTRACT,
  POST_FLEET_PACKAGE_POLICIES_DELETE_CONTRACT,
  POST_FLEET_PACKAGE_POLICIES_UPGRADE_CONTRACT,
  POST_FLEET_PACKAGE_POLICIES_UPGRADE_DRYRUN_CONTRACT,
  GET_FLEET_PROXIES_CONTRACT,
  POST_FLEET_PROXIES_CONTRACT,
  DELETE_FLEET_PROXIES_ITEMID_CONTRACT,
  GET_FLEET_PROXIES_ITEMID_CONTRACT,
  PUT_FLEET_PROXIES_ITEMID_CONTRACT,
  GET_FLEET_REMOTE_SYNCED_INTEGRATIONS_OUTPUTID_REMOTE_STATUS_CONTRACT,
  GET_FLEET_REMOTE_SYNCED_INTEGRATIONS_STATUS_CONTRACT,
  POST_FLEET_SERVICE_TOKENS_CONTRACT,
  GET_FLEET_SETTINGS_CONTRACT,
  PUT_FLEET_SETTINGS_CONTRACT,
  POST_FLEET_SETUP_CONTRACT,
  GET_FLEET_SPACE_SETTINGS_CONTRACT,
  PUT_FLEET_SPACE_SETTINGS_CONTRACT,
  GET_FLEET_UNINSTALL_TOKENS_CONTRACT,
  GET_FLEET_UNINSTALL_TOKENS_UNINSTALLTOKENID_CONTRACT,
  DELETELIST_CONTRACT,
  READLIST_CONTRACT,
  PATCHLIST_CONTRACT,
  CREATELIST_CONTRACT,
  UPDATELIST_CONTRACT,
  FINDLISTS_CONTRACT,
  DELETELISTINDEX_CONTRACT,
  READLISTINDEX_CONTRACT,
  CREATELISTINDEX_CONTRACT,
  DELETELISTITEM_CONTRACT,
  READLISTITEM_CONTRACT,
  PATCHLISTITEM_CONTRACT,
  CREATELISTITEM_CONTRACT,
  UPDATELISTITEM_CONTRACT,
  EXPORTLISTITEMS_CONTRACT,
  FINDLISTITEMS_CONTRACT,
  IMPORTLISTITEMS_CONTRACT,
  READLISTPRIVILEGES_CONTRACT,
  DELETE_LOGSTASH_PIPELINE_CONTRACT,
  GET_LOGSTASH_PIPELINE_CONTRACT,
  PUT_LOGSTASH_PIPELINE_CONTRACT,
  GET_LOGSTASH_PIPELINES_CONTRACT,
  POST_MAINTENANCE_WINDOW_CONTRACT,
  GET_MAINTENANCE_WINDOW_FIND_CONTRACT,
  DELETE_MAINTENANCE_WINDOW_ID_CONTRACT,
  GET_MAINTENANCE_WINDOW_ID_CONTRACT,
  PATCH_MAINTENANCE_WINDOW_ID_CONTRACT,
  POST_MAINTENANCE_WINDOW_ID_ARCHIVE_CONTRACT,
  POST_MAINTENANCE_WINDOW_ID_UNARCHIVE_CONTRACT,
  MLSYNC_CONTRACT,
  DELETENOTE_CONTRACT,
  GETNOTES_CONTRACT,
  PERSISTNOTEROUTE_CONTRACT,
  OBSERVABILITY_AI_ASSISTANT_CHAT_COMPLETE_CONTRACT,
  OSQUERYFINDLIVEQUERIES_CONTRACT,
  OSQUERYCREATELIVEQUERY_CONTRACT,
  OSQUERYGETLIVEQUERYDETAILS_CONTRACT,
  OSQUERYGETLIVEQUERYRESULTS_CONTRACT,
  OSQUERYFINDPACKS_CONTRACT,
  OSQUERYCREATEPACKS_CONTRACT,
  OSQUERYDELETEPACKS_CONTRACT,
  OSQUERYGETPACKSDETAILS_CONTRACT,
  OSQUERYUPDATEPACKS_CONTRACT,
  OSQUERYFINDSAVEDQUERIES_CONTRACT,
  OSQUERYCREATESAVEDQUERY_CONTRACT,
  OSQUERYDELETESAVEDQUERY_CONTRACT,
  OSQUERYGETSAVEDQUERYDETAILS_CONTRACT,
  OSQUERYUPDATESAVEDQUERY_CONTRACT,
  PERSISTPINNEDEVENTROUTE_CONTRACT,
  CLEANUPRISKENGINE_CONTRACT,
  CONFIGURERISKENGINESAVEDOBJECT_CONTRACT,
  SCHEDULERISKENGINENOW_CONTRACT,
  BULKCREATESAVEDOBJECTS_CONTRACT,
  BULKDELETESAVEDOBJECTS_CONTRACT,
  BULKGETSAVEDOBJECTS_CONTRACT,
  BULKRESOLVESAVEDOBJECTS_CONTRACT,
  BULKUPDATESAVEDOBJECTS_CONTRACT,
  POST_SAVED_OBJECTS_EXPORT_CONTRACT,
  FINDSAVEDOBJECTS_CONTRACT,
  POST_SAVED_OBJECTS_IMPORT_CONTRACT,
  RESOLVEIMPORTERRORS_CONTRACT,
  CREATESAVEDOBJECT_CONTRACT,
  GETSAVEDOBJECT_CONTRACT,
  CREATESAVEDOBJECTID_CONTRACT,
  UPDATESAVEDOBJECT_CONTRACT,
  RESOLVESAVEDOBJECT_CONTRACT,
  PERFORMANONYMIZATIONFIELDSBULKACTION_CONTRACT,
  FINDANONYMIZATIONFIELDS_CONTRACT,
  CHATCOMPLETE_CONTRACT,
  DELETEALLCONVERSATIONS_CONTRACT,
  CREATECONVERSATION_CONTRACT,
  FINDCONVERSATIONS_CONTRACT,
  DELETECONVERSATION_CONTRACT,
  READCONVERSATION_CONTRACT,
  UPDATECONVERSATION_CONTRACT,
  GETKNOWLEDGEBASE_CONTRACT,
  POSTKNOWLEDGEBASE_CONTRACT,
  READKNOWLEDGEBASE_CONTRACT,
  CREATEKNOWLEDGEBASE_CONTRACT,
  CREATEKNOWLEDGEBASEENTRY_CONTRACT,
  PERFORMKNOWLEDGEBASEENTRYBULKACTION_CONTRACT,
  FINDKNOWLEDGEBASEENTRIES_CONTRACT,
  DELETEKNOWLEDGEBASEENTRY_CONTRACT,
  READKNOWLEDGEBASEENTRY_CONTRACT,
  UPDATEKNOWLEDGEBASEENTRY_CONTRACT,
  PERFORMPROMPTSBULKACTION_CONTRACT,
  FINDPROMPTS_CONTRACT,
  GET_SECURITY_ROLE_CONTRACT,
  POST_SECURITY_ROLE_QUERY_CONTRACT,
  DELETE_SECURITY_ROLE_NAME_CONTRACT,
  GET_SECURITY_ROLE_NAME_CONTRACT,
  PUT_SECURITY_ROLE_NAME_CONTRACT,
  POST_SECURITY_ROLES_CONTRACT,
  POST_SECURITY_SESSION_INVALIDATE_CONTRACT,
  POST_URL_CONTRACT,
  RESOLVE_URL_CONTRACT,
  DELETE_URL_CONTRACT,
  GET_URL_CONTRACT,
  POST_SPACES_COPY_SAVED_OBJECTS_CONTRACT,
  POST_SPACES_DISABLE_LEGACY_URL_ALIASES_CONTRACT,
  POST_SPACES_GET_SHAREABLE_REFERENCES_CONTRACT,
  POST_SPACES_RESOLVE_COPY_SAVED_OBJECTS_ERRORS_CONTRACT,
  POST_SPACES_UPDATE_OBJECTS_SPACES_CONTRACT,
  GET_SPACES_SPACE_CONTRACT,
  POST_SPACES_SPACE_CONTRACT,
  DELETE_SPACES_SPACE_ID_CONTRACT,
  GET_SPACES_SPACE_ID_CONTRACT,
  PUT_SPACES_SPACE_ID_CONTRACT,
  GET_STATUS_CONTRACT,
  GET_STREAMS_CONTRACT,
  POST_STREAMS_DISABLE_CONTRACT,
  POST_STREAMS_ENABLE_CONTRACT,
  POST_STREAMS_RESYNC_CONTRACT,
  DELETE_STREAMS_NAME_CONTRACT,
  GET_STREAMS_NAME_CONTRACT,
  PUT_STREAMS_NAME_CONTRACT,
  POST_STREAMS_NAME_FORK_CONTRACT,
  GET_STREAMS_NAME_GROUP_CONTRACT,
  PUT_STREAMS_NAME_GROUP_CONTRACT,
  GET_STREAMS_NAME_INGEST_CONTRACT,
  PUT_STREAMS_NAME_INGEST_CONTRACT,
  POST_STREAMS_NAME_CONTENT_EXPORT_CONTRACT,
  POST_STREAMS_NAME_CONTENT_IMPORT_CONTRACT,
  GET_STREAMS_NAME_DASHBOARDS_CONTRACT,
  POST_STREAMS_NAME_DASHBOARDS_BULK_CONTRACT,
  DELETE_STREAMS_NAME_DASHBOARDS_DASHBOARDID_CONTRACT,
  PUT_STREAMS_NAME_DASHBOARDS_DASHBOARDID_CONTRACT,
  GET_STREAMS_NAME_QUERIES_CONTRACT,
  POST_STREAMS_NAME_QUERIES_BULK_CONTRACT,
  DELETE_STREAMS_NAME_QUERIES_QUERYID_CONTRACT,
  PUT_STREAMS_NAME_QUERIES_QUERYID_CONTRACT,
  GET_STREAMS_NAME_RULES_CONTRACT,
  DELETE_STREAMS_NAME_RULES_RULEID_CONTRACT,
  PUT_STREAMS_NAME_RULES_RULEID_CONTRACT,
  GET_STREAMS_NAME_SIGNIFICANT_EVENTS_CONTRACT,
  POST_STREAMS_NAME_SIGNIFICANT_EVENTS_GENERATE_CONTRACT,
  POST_STREAMS_NAME_SIGNIFICANT_EVENTS_PREVIEW_CONTRACT,
  POST_SYNTHETICS_MONITOR_TEST_CONTRACT,
  GET_SYNTHETIC_MONITORS_CONTRACT,
  POST_SYNTHETIC_MONITORS_CONTRACT,
  DELETE_SYNTHETIC_MONITORS_CONTRACT,
  DELETE_SYNTHETIC_MONITOR_CONTRACT,
  GET_SYNTHETIC_MONITOR_CONTRACT,
  PUT_SYNTHETIC_MONITOR_CONTRACT,
  GET_PARAMETERS_CONTRACT,
  POST_PARAMETERS_CONTRACT,
  DELETE_PARAMETERS_CONTRACT,
  DELETE_PARAMETER_CONTRACT,
  GET_PARAMETER_CONTRACT,
  PUT_PARAMETER_CONTRACT,
  GET_PRIVATE_LOCATIONS_CONTRACT,
  POST_PRIVATE_LOCATION_CONTRACT,
  DELETE_PRIVATE_LOCATION_CONTRACT,
  GET_PRIVATE_LOCATION_CONTRACT,
  PUT_PRIVATE_LOCATION_CONTRACT,
  TASK_MANAGER_HEALTH_CONTRACT,
  DELETETIMELINES_CONTRACT,
  GETTIMELINE_CONTRACT,
  PATCHTIMELINE_CONTRACT,
  CREATETIMELINES_CONTRACT,
  COPYTIMELINE_CONTRACT,
  GETDRAFTTIMELINES_CONTRACT,
  CLEANDRAFTTIMELINES_CONTRACT,
  EXPORTTIMELINES_CONTRACT,
  PERSISTFAVORITEROUTE_CONTRACT,
  IMPORTTIMELINES_CONTRACT,
  INSTALLPREPACKEDTIMELINES_CONTRACT,
  RESOLVETIMELINE_CONTRACT,
  GETTIMELINES_CONTRACT,
  GET_UPGRADE_STATUS_CONTRACT,
  GET_UPTIME_SETTINGS_CONTRACT,
  PUT_UPTIME_SETTINGS_CONTRACT,
  FINDSLOSOP_CONTRACT,
  CREATESLOOP_CONTRACT,
  BULKDELETEOP_CONTRACT,
  BULKDELETESTATUSOP_CONTRACT,
  DELETEROLLUPDATAOP_CONTRACT,
  DELETESLOINSTANCESOP_CONTRACT,
  DELETESLOOP_CONTRACT,
  GETSLOOP_CONTRACT,
  UPDATESLOOP_CONTRACT,
  RESETSLOOP_CONTRACT,
  DISABLESLOOP_CONTRACT,
  ENABLESLOOP_CONTRACT,
  GETDEFINITIONSOP_CONTRACT,
];
