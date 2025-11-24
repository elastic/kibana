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
 * Generated at: 2025-11-24T08:15:43.075Z
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
import { getLooseObjectFromProperty } from '../utils';

// import all needed request and response schemas generated from the OpenAPI spec

// declare contracts
const GET_ACTIONS_CONNECTOR_TYPES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_actions_connector_types',
  summary: `Get connector types`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector_types</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You do not need any Kibana feature privileges to run this API.`,
  methods: ['GET'],
  patterns: ['/api/actions/connector_types'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['feature_id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_actions_connector_types_request, 'body'),
    getLooseObjectFromProperty(get_actions_connector_types_request, 'path'),
    getLooseObjectFromProperty(get_actions_connector_types_request, 'query'),
  ]),
  outputSchema: get_actions_connector_types_response,
};
const DELETE_ACTIONS_CONNECTOR_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_actions_connector_id',
  summary: `Delete a connector`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: When you delete a connector, it cannot be recovered.`,
  methods: ['DELETE'],
  patterns: ['/api/actions/connector/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_actions_connector_id_request, 'body'),
    getLooseObjectFromProperty(delete_actions_connector_id_request, 'path'),
    getLooseObjectFromProperty(delete_actions_connector_id_request, 'query'),
  ]),
  outputSchema: delete_actions_connector_id_response,
};
const GET_ACTIONS_CONNECTOR_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_actions_connector_id',
  summary: `Get connector information`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/actions/connector/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_actions_connector_id_request, 'body'),
    getLooseObjectFromProperty(get_actions_connector_id_request, 'path'),
    getLooseObjectFromProperty(get_actions_connector_id_request, 'query'),
  ]),
  outputSchema: get_actions_connector_id_response,
};
const POST_ACTIONS_CONNECTOR_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_actions_connector_id',
  summary: `Create a connector`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/actions/connector/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['connector_type_id', 'name', 'config', 'secrets'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_actions_connector_id_request, 'body'),
    getLooseObjectFromProperty(post_actions_connector_id_request, 'path'),
    getLooseObjectFromProperty(post_actions_connector_id_request, 'query'),
  ]),
  outputSchema: post_actions_connector_id_response,
};
const PUT_ACTIONS_CONNECTOR_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_actions_connector_id',
  summary: `Update a connector`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['PUT'],
  patterns: ['/api/actions/connector/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['name', 'config', 'secrets'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_actions_connector_id_request, 'body'),
    getLooseObjectFromProperty(put_actions_connector_id_request, 'path'),
    getLooseObjectFromProperty(put_actions_connector_id_request, 'query'),
  ]),
  outputSchema: put_actions_connector_id_response,
};
const POST_ACTIONS_CONNECTOR_ID_EXECUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_actions_connector_id_execute',
  summary: `Run a connector`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector/{id}/_execute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You can use this API to test an action that involves interaction with Kibana services or integrations with third-party systems.`,
  methods: ['POST'],
  patterns: ['/api/actions/connector/{id}/_execute'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['params'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_actions_connector_id_execute_request, 'body'),
    getLooseObjectFromProperty(post_actions_connector_id_execute_request, 'path'),
    getLooseObjectFromProperty(post_actions_connector_id_execute_request, 'query'),
  ]),
  outputSchema: post_actions_connector_id_execute_response,
};
const GET_ACTIONS_CONNECTORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_actions_connectors',
  summary: `Get all connectors`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connectors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/actions/connectors'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_actions_connectors_request, 'body'),
    getLooseObjectFromProperty(get_actions_connectors_request, 'path'),
    getLooseObjectFromProperty(get_actions_connectors_request, 'query'),
  ]),
  outputSchema: get_actions_connectors_response,
};
const POST_AGENT_BUILDER_A2A_AGENTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_a2a_agentid',
  summary: `Send A2A task`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/a2a/{agentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: This endpoint is designed for A2A protocol clients and should not be used directly via REST APIs. Use an A2A SDK or A2A Inspector instead.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['POST'],
  patterns: ['/api/agent_builder/a2a/{agentId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_agent_builder_a2a_agentid_request, 'body'),
    getLooseObjectFromProperty(post_agent_builder_a2a_agentid_request, 'path'),
    getLooseObjectFromProperty(post_agent_builder_a2a_agentid_request, 'query'),
  ]),
  outputSchema: post_agent_builder_a2a_agentid_response,
};
const GET_AGENT_BUILDER_A2A_AGENTID_JSON_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_a2a_agentid_json',
  summary: `Get A2A agent card`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/a2a/{agentId}.json</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get agent discovery metadata in JSON format. Use this endpoint to provide agent information for A2A protocol integration and discovery.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['GET'],
  patterns: ['/api/agent_builder/a2a/{agentId}.json'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_agent_builder_a2a_agentid_json_request, 'body'),
    getLooseObjectFromProperty(get_agent_builder_a2a_agentid_json_request, 'path'),
    getLooseObjectFromProperty(get_agent_builder_a2a_agentid_json_request, 'query'),
  ]),
  outputSchema: get_agent_builder_a2a_agentid_json_response,
};
const GET_AGENT_BUILDER_AGENTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_agents',
  summary: `List agents`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/agents</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List all available agents. Use this endpoint to retrieve complete agent information including their current configuration and assigned tools.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['GET'],
  patterns: ['/api/agent_builder/agents'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_agent_builder_agents_request, 'body'),
    getLooseObjectFromProperty(get_agent_builder_agents_request, 'path'),
    getLooseObjectFromProperty(get_agent_builder_agents_request, 'query'),
  ]),
  outputSchema: get_agent_builder_agents_response,
};
const POST_AGENT_BUILDER_AGENTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_agents',
  summary: `Create an agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/agents</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new agent. Use this endpoint to define the agent's behavior, appearance, and capabilities through comprehensive configuration options.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['POST'],
  patterns: ['/api/agent_builder/agents'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(post_agent_builder_agents_request, 'body'),
    getLooseObjectFromProperty(post_agent_builder_agents_request, 'path'),
    getLooseObjectFromProperty(post_agent_builder_agents_request, 'query'),
  ]),
  outputSchema: post_agent_builder_agents_response,
};
const DELETE_AGENT_BUILDER_AGENTS_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_agent_builder_agents_id',
  summary: `Delete an agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/agents/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an agent by ID. This action cannot be undone.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['DELETE'],
  patterns: ['/api/agent_builder/agents/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_agent_builder_agents_id_request, 'body'),
    getLooseObjectFromProperty(delete_agent_builder_agents_id_request, 'path'),
    getLooseObjectFromProperty(delete_agent_builder_agents_id_request, 'query'),
  ]),
  outputSchema: delete_agent_builder_agents_id_response,
};
const GET_AGENT_BUILDER_AGENTS_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_agents_id',
  summary: `Get an agent by ID`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/agents/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a specific agent by ID. Use this endpoint to retrieve the complete agent definition including all configuration details and tool assignments.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['GET'],
  patterns: ['/api/agent_builder/agents/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_agent_builder_agents_id_request, 'body'),
    getLooseObjectFromProperty(get_agent_builder_agents_id_request, 'path'),
    getLooseObjectFromProperty(get_agent_builder_agents_id_request, 'query'),
  ]),
  outputSchema: get_agent_builder_agents_id_response,
};
const PUT_AGENT_BUILDER_AGENTS_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_agent_builder_agents_id',
  summary: `Update an agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/agents/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing agent configuration. Use this endpoint to modify any aspect of the agent's behavior, appearance, or capabilities.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['PUT'],
  patterns: ['/api/agent_builder/agents/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['avatar_color', 'avatar_symbol', 'configuration', 'description', 'labels', 'name'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_agent_builder_agents_id_request, 'body'),
    getLooseObjectFromProperty(put_agent_builder_agents_id_request, 'path'),
    getLooseObjectFromProperty(put_agent_builder_agents_id_request, 'query'),
  ]),
  outputSchema: put_agent_builder_agents_id_response,
};
const GET_AGENT_BUILDER_CONVERSATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_conversations',
  summary: `List conversations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/conversations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List all conversations for a user. Use the optional agent ID to filter conversations by a specific agent.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['GET'],
  patterns: ['/api/agent_builder/conversations'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['agent_id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_agent_builder_conversations_request, 'body'),
    getLooseObjectFromProperty(get_agent_builder_conversations_request, 'path'),
    getLooseObjectFromProperty(get_agent_builder_conversations_request, 'query'),
  ]),
  outputSchema: get_agent_builder_conversations_response,
};
const DELETE_AGENT_BUILDER_CONVERSATIONS_CONVERSATION_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_agent_builder_conversations_conversation_id',
  summary: `Delete conversation by ID`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/conversations/{conversation_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a conversation by ID. This action cannot be undone.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['DELETE'],
  patterns: ['/api/agent_builder/conversations/{conversation_id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['conversation_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_agent_builder_conversations_conversation_id_request, 'body'),
    getLooseObjectFromProperty(delete_agent_builder_conversations_conversation_id_request, 'path'),
    getLooseObjectFromProperty(delete_agent_builder_conversations_conversation_id_request, 'query'),
  ]),
  outputSchema: delete_agent_builder_conversations_conversation_id_response,
};
const GET_AGENT_BUILDER_CONVERSATIONS_CONVERSATION_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_conversations_conversation_id',
  summary: `Get conversation by ID`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/conversations/{conversation_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a specific conversation by ID. Use this endpoint to retrieve the complete conversation history including all messages and metadata.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['GET'],
  patterns: ['/api/agent_builder/conversations/{conversation_id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['conversation_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_agent_builder_conversations_conversation_id_request, 'body'),
    getLooseObjectFromProperty(get_agent_builder_conversations_conversation_id_request, 'path'),
    getLooseObjectFromProperty(get_agent_builder_conversations_conversation_id_request, 'query'),
  ]),
  outputSchema: get_agent_builder_conversations_conversation_id_response,
};
const POST_AGENT_BUILDER_CONVERSE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_converse',
  summary: `Send chat message`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/converse</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Send a message to an agent and receive a complete response. This synchronous endpoint waits for the agent to fully process your request before returning the final result. Use this for simple chat interactions where you need the complete response.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['POST'],
  patterns: ['/api/agent_builder/converse'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(post_agent_builder_converse_request, 'body'),
    getLooseObjectFromProperty(post_agent_builder_converse_request, 'path'),
    getLooseObjectFromProperty(post_agent_builder_converse_request, 'query'),
  ]),
  outputSchema: post_agent_builder_converse_response,
};
const POST_AGENT_BUILDER_CONVERSE_ASYNC_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_converse_async',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(post_agent_builder_converse_async_request, 'body'),
    getLooseObjectFromProperty(post_agent_builder_converse_async_request, 'path'),
    getLooseObjectFromProperty(post_agent_builder_converse_async_request, 'query'),
  ]),
  outputSchema: post_agent_builder_converse_async_response,
};
const POST_AGENT_BUILDER_MCP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_mcp',
  summary: `MCP server`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/mcp</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: This endpoint is designed for MCP clients (Claude Desktop, Cursor, VS Code, etc.) and should not be used directly via REST APIs. Use MCP Inspector or native MCP clients instead.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['POST'],
  patterns: ['/api/agent_builder/mcp'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_agent_builder_mcp_request, 'body'),
    getLooseObjectFromProperty(post_agent_builder_mcp_request, 'path'),
    getLooseObjectFromProperty(post_agent_builder_mcp_request, 'query'),
  ]),
  outputSchema: post_agent_builder_mcp_response,
};
const GET_AGENT_BUILDER_TOOLS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_tools',
  summary: `List tools`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List all available tools. Use this endpoint to retrieve complete tool definitions including their schemas and configuration requirements.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['GET'],
  patterns: ['/api/agent_builder/tools'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_agent_builder_tools_request, 'body'),
    getLooseObjectFromProperty(get_agent_builder_tools_request, 'path'),
    getLooseObjectFromProperty(get_agent_builder_tools_request, 'query'),
  ]),
  outputSchema: get_agent_builder_tools_response,
};
const POST_AGENT_BUILDER_TOOLS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_tools',
  summary: `Create a tool`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new tool. Use this endpoint to define a custom tool with specific functionality and configuration for use by agents.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['POST'],
  patterns: ['/api/agent_builder/tools'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['configuration', 'description', 'id', 'tags', 'type'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_agent_builder_tools_request, 'body'),
    getLooseObjectFromProperty(post_agent_builder_tools_request, 'path'),
    getLooseObjectFromProperty(post_agent_builder_tools_request, 'query'),
  ]),
  outputSchema: post_agent_builder_tools_response,
};
const POST_AGENT_BUILDER_TOOLS_EXECUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_tools_execute',
  summary: `Execute a Tool`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools/_execute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Execute a tool with parameters. Use this endpoint to run a tool directly with specified inputs and optional external connector integration.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['POST'],
  patterns: ['/api/agent_builder/tools/_execute'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['connector_id', 'tool_id', 'tool_params'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_agent_builder_tools_execute_request, 'body'),
    getLooseObjectFromProperty(post_agent_builder_tools_execute_request, 'path'),
    getLooseObjectFromProperty(post_agent_builder_tools_execute_request, 'query'),
  ]),
  outputSchema: post_agent_builder_tools_execute_response,
};
const DELETE_AGENT_BUILDER_TOOLS_TOOLID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_agent_builder_tools_toolid',
  summary: `Delete a tool`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools/{toolId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a tool by ID. This action cannot be undone.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['DELETE'],
  patterns: ['/api/agent_builder/tools/{toolId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['toolId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_agent_builder_tools_toolid_request, 'body'),
    getLooseObjectFromProperty(delete_agent_builder_tools_toolid_request, 'path'),
    getLooseObjectFromProperty(delete_agent_builder_tools_toolid_request, 'query'),
  ]),
  outputSchema: delete_agent_builder_tools_toolid_response,
};
const GET_AGENT_BUILDER_TOOLS_TOOLID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_tools_toolid',
  summary: `Get a tool by id`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools/{toolId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a specific tool by ID. Use this endpoint to retrieve the complete tool definition including its schema and configuration requirements.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['GET'],
  patterns: ['/api/agent_builder/tools/{toolId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['toolId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_agent_builder_tools_toolid_request, 'body'),
    getLooseObjectFromProperty(get_agent_builder_tools_toolid_request, 'path'),
    getLooseObjectFromProperty(get_agent_builder_tools_toolid_request, 'query'),
  ]),
  outputSchema: get_agent_builder_tools_toolid_response,
};
const PUT_AGENT_BUILDER_TOOLS_TOOLID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_agent_builder_tools_toolid',
  summary: `Update a tool`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools/{toolId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing tool. Use this endpoint to modify any aspect of the tool's configuration or metadata.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['PUT'],
  patterns: ['/api/agent_builder/tools/{toolId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['toolId'],
    urlParams: [],
    bodyParams: ['configuration', 'description', 'tags'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_agent_builder_tools_toolid_request, 'body'),
    getLooseObjectFromProperty(put_agent_builder_tools_toolid_request, 'path'),
    getLooseObjectFromProperty(put_agent_builder_tools_toolid_request, 'query'),
  ]),
  outputSchema: put_agent_builder_tools_toolid_response,
};
const GETALERTINGHEALTH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getAlertingHealth',
  summary: `Get the alerting framework health`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/_health</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Management > Stack Rules** feature or for at least one of the **Analytics > Discover**, **Analytics > Machine Learning**, **Observability**, or **Security** features.
`,
  methods: ['GET'],
  patterns: ['/api/alerting/_health'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_alerting_health_request, 'body'),
    getLooseObjectFromProperty(get_alerting_health_request, 'path'),
    getLooseObjectFromProperty(get_alerting_health_request, 'query'),
  ]),
  outputSchema: get_alerting_health_response,
};
const GETRULETYPES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getRuleTypes',
  summary: `Get the rule types`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule_types</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

If you have \`read\` privileges for one or more Kibana features, the API response contains information about the appropriate rule types. For example, there are rule types associated with the **Management > Stack Rules** feature, **Analytics > Discover** and **Machine Learning** features, **Observability** features, and **Security** features. To get rule types associated with the **Stack Monitoring** feature, use the \`monitoring_user\` built-in role.
`,
  methods: ['GET'],
  patterns: ['/api/alerting/rule_types'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_rule_types_request, 'body'),
    getLooseObjectFromProperty(get_rule_types_request, 'path'),
    getLooseObjectFromProperty(get_rule_types_request, 'query'),
  ]),
  outputSchema: get_rule_types_response,
};
const DELETE_ALERTING_RULE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_alerting_rule_id',
  summary: `Delete a rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/alerting/rule/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_alerting_rule_id_request, 'body'),
    getLooseObjectFromProperty(delete_alerting_rule_id_request, 'path'),
    getLooseObjectFromProperty(delete_alerting_rule_id_request, 'query'),
  ]),
  outputSchema: delete_alerting_rule_id_response,
};
const GET_ALERTING_RULE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_alerting_rule_id',
  summary: `Get rule details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/alerting/rule/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_alerting_rule_id_request, 'body'),
    getLooseObjectFromProperty(get_alerting_rule_id_request, 'path'),
    getLooseObjectFromProperty(get_alerting_rule_id_request, 'query'),
  ]),
  outputSchema: get_alerting_rule_id_response,
};
const POST_ALERTING_RULE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id',
  summary: `Create a rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(post_alerting_rule_id_request, 'body'),
    getLooseObjectFromProperty(post_alerting_rule_id_request, 'path'),
    getLooseObjectFromProperty(post_alerting_rule_id_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_id_response,
};
const PUT_ALERTING_RULE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_alerting_rule_id',
  summary: `Update a rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['PUT'],
  patterns: ['/api/alerting/rule/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(put_alerting_rule_id_request, 'body'),
    getLooseObjectFromProperty(put_alerting_rule_id_request, 'path'),
    getLooseObjectFromProperty(put_alerting_rule_id_request, 'query'),
  ]),
  outputSchema: put_alerting_rule_id_response,
};
const POST_ALERTING_RULE_ID_DISABLE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_disable',
  summary: `Disable a rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/_disable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{id}/_disable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['untrack'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_alerting_rule_id_disable_request, 'body'),
    getLooseObjectFromProperty(post_alerting_rule_id_disable_request, 'path'),
    getLooseObjectFromProperty(post_alerting_rule_id_disable_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_id_disable_response,
};
const POST_ALERTING_RULE_ID_ENABLE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_enable',
  summary: `Enable a rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/_enable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{id}/_enable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_alerting_rule_id_enable_request, 'body'),
    getLooseObjectFromProperty(post_alerting_rule_id_enable_request, 'path'),
    getLooseObjectFromProperty(post_alerting_rule_id_enable_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_id_enable_response,
};
const POST_ALERTING_RULE_ID_MUTE_ALL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_mute_all',
  summary: `Mute all alerts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/_mute_all</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{id}/_mute_all'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_alerting_rule_id_mute_all_request, 'body'),
    getLooseObjectFromProperty(post_alerting_rule_id_mute_all_request, 'path'),
    getLooseObjectFromProperty(post_alerting_rule_id_mute_all_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_id_mute_all_response,
};
const POST_ALERTING_RULE_ID_UNMUTE_ALL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_unmute_all',
  summary: `Unmute all alerts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/_unmute_all</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{id}/_unmute_all'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_alerting_rule_id_unmute_all_request, 'body'),
    getLooseObjectFromProperty(post_alerting_rule_id_unmute_all_request, 'path'),
    getLooseObjectFromProperty(post_alerting_rule_id_unmute_all_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_id_unmute_all_response,
};
const POST_ALERTING_RULE_ID_UPDATE_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_update_api_key',
  summary: `Update the API key for a rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/_update_api_key</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{id}/_update_api_key'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_alerting_rule_id_update_api_key_request, 'body'),
    getLooseObjectFromProperty(post_alerting_rule_id_update_api_key_request, 'path'),
    getLooseObjectFromProperty(post_alerting_rule_id_update_api_key_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_id_update_api_key_response,
};
const POST_ALERTING_RULE_ID_SNOOZE_SCHEDULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_snooze_schedule',
  summary: `Schedule a snooze for the rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/snooze_schedule</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

When you snooze a rule, the rule checks continue to run but alerts will not generate actions. You can snooze for a specified period of time and schedule single or recurring downtimes.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{id}/snooze_schedule'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['schedule'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_alerting_rule_id_snooze_schedule_request, 'body'),
    getLooseObjectFromProperty(post_alerting_rule_id_snooze_schedule_request, 'path'),
    getLooseObjectFromProperty(post_alerting_rule_id_snooze_schedule_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_id_snooze_schedule_response,
};
const POST_ALERTING_RULE_RULE_ID_ALERT_ALERT_ID_MUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_rule_id_alert_alert_id_mute',
  summary: `Mute an alert`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{rule_id}/alert/{alert_id}/_mute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{rule_id}/alert/{alert_id}/_mute'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['rule_id', 'alert_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_alerting_rule_rule_id_alert_alert_id_mute_request, 'body'),
    getLooseObjectFromProperty(post_alerting_rule_rule_id_alert_alert_id_mute_request, 'path'),
    getLooseObjectFromProperty(post_alerting_rule_rule_id_alert_alert_id_mute_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_rule_id_alert_alert_id_mute_response,
};
const POST_ALERTING_RULE_RULE_ID_ALERT_ALERT_ID_UNMUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_rule_id_alert_alert_id_unmute',
  summary: `Unmute an alert`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{rule_id}/alert/{alert_id}/_unmute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/alerting/rule/{rule_id}/alert/{alert_id}/_unmute'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['rule_id', 'alert_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_alerting_rule_rule_id_alert_alert_id_unmute_request, 'body'),
    getLooseObjectFromProperty(post_alerting_rule_rule_id_alert_alert_id_unmute_request, 'path'),
    getLooseObjectFromProperty(post_alerting_rule_rule_id_alert_alert_id_unmute_request, 'query'),
  ]),
  outputSchema: post_alerting_rule_rule_id_alert_alert_id_unmute_response,
};
const DELETE_ALERTING_RULE_RULEID_SNOOZE_SCHEDULE_SCHEDULEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_alerting_rule_ruleid_snooze_schedule_scheduleid',
  summary: `Delete a snooze schedule for a rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{ruleId}/snooze_schedule/{scheduleId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/alerting/rule/{ruleId}/snooze_schedule/{scheduleId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['ruleId', 'scheduleId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(
      delete_alerting_rule_ruleid_snooze_schedule_scheduleid_request,
      'body'
    ),
    getLooseObjectFromProperty(
      delete_alerting_rule_ruleid_snooze_schedule_scheduleid_request,
      'path'
    ),
    getLooseObjectFromProperty(
      delete_alerting_rule_ruleid_snooze_schedule_scheduleid_request,
      'query'
    ),
  ]),
  outputSchema: delete_alerting_rule_ruleid_snooze_schedule_scheduleid_response,
};
const GET_ALERTING_RULES_FIND_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_alerting_rules_find',
  summary: `Get information about rules`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rules/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/alerting/rules/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(get_alerting_rules_find_request, 'body'),
    getLooseObjectFromProperty(get_alerting_rules_find_request, 'path'),
    getLooseObjectFromProperty(get_alerting_rules_find_request, 'query'),
  ]),
  outputSchema: get_alerting_rules_find_response,
};
const CREATEAGENTKEY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createAgentKey',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_agent_key_request, 'body'),
    getLooseObjectFromProperty(create_agent_key_request, 'path'),
    getLooseObjectFromProperty(create_agent_key_request, 'query'),
  ]),
  outputSchema: create_agent_key_response,
};
const SAVEAPMSERVERSCHEMA_CONTRACT: InternalConnectorContract = {
  type: 'kibana.saveApmServerSchema',
  summary: `Save APM server schema`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/fleet/apm_server_schema</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/apm/fleet/apm_server_schema'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['schema'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(save_apm_server_schema_request, 'body'),
    getLooseObjectFromProperty(save_apm_server_schema_request, 'path'),
    getLooseObjectFromProperty(save_apm_server_schema_request, 'query'),
  ]),
  outputSchema: save_apm_server_schema_response,
};
const CREATEANNOTATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createAnnotation',
  summary: `Create a service annotation`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/services/{serviceName}/annotation</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new annotation for a specific service.`,
  methods: ['POST'],
  patterns: ['/api/apm/services/{serviceName}/annotation'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['serviceName'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_annotation_request, 'body'),
    getLooseObjectFromProperty(create_annotation_request, 'path'),
    getLooseObjectFromProperty(create_annotation_request, 'query'),
  ]),
  outputSchema: create_annotation_response,
};
const GETANNOTATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getAnnotation',
  summary: `Search for annotations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/services/{serviceName}/annotation/search</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Search for annotations related to a specific service.`,
  methods: ['GET'],
  patterns: ['/api/apm/services/{serviceName}/annotation/search'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['serviceName'],
    urlParams: ['environment', 'start', 'end'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_annotation_request, 'body'),
    getLooseObjectFromProperty(get_annotation_request, 'path'),
    getLooseObjectFromProperty(get_annotation_request, 'query'),
  ]),
  outputSchema: get_annotation_response,
};
const DELETEAGENTCONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteAgentConfiguration',
  summary: `Delete agent configuration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/apm/settings/agent-configuration'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_agent_configuration_request, 'body'),
    getLooseObjectFromProperty(delete_agent_configuration_request, 'path'),
    getLooseObjectFromProperty(delete_agent_configuration_request, 'query'),
  ]),
  outputSchema: delete_agent_configuration_response,
};
const GETAGENTCONFIGURATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getAgentConfigurations',
  summary: `Get a list of agent configurations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/apm/settings/agent-configuration'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_agent_configurations_request, 'body'),
    getLooseObjectFromProperty(get_agent_configurations_request, 'path'),
    getLooseObjectFromProperty(get_agent_configurations_request, 'query'),
  ]),
  outputSchema: get_agent_configurations_response,
};
const CREATEUPDATEAGENTCONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createUpdateAgentConfiguration',
  summary: `Create or update agent configuration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['PUT'],
  patterns: ['/api/apm/settings/agent-configuration'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['overwrite'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_update_agent_configuration_request, 'body'),
    getLooseObjectFromProperty(create_update_agent_configuration_request, 'path'),
    getLooseObjectFromProperty(create_update_agent_configuration_request, 'query'),
  ]),
  outputSchema: create_update_agent_configuration_response,
};
const GETAGENTNAMEFORSERVICE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getAgentNameForService',
  summary: `Get agent name for service`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration/agent_name</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve \`agentName\` for a service.`,
  methods: ['GET'],
  patterns: ['/api/apm/settings/agent-configuration/agent_name'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['serviceName'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_agent_name_for_service_request, 'body'),
    getLooseObjectFromProperty(get_agent_name_for_service_request, 'path'),
    getLooseObjectFromProperty(get_agent_name_for_service_request, 'query'),
  ]),
  outputSchema: get_agent_name_for_service_response,
};
const GETENVIRONMENTSFORSERVICE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getEnvironmentsForService',
  summary: `Get environments for service`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration/environments</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/apm/settings/agent-configuration/environments'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['serviceName'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_environments_for_service_request, 'body'),
    getLooseObjectFromProperty(get_environments_for_service_request, 'path'),
    getLooseObjectFromProperty(get_environments_for_service_request, 'query'),
  ]),
  outputSchema: get_environments_for_service_response,
};
const SEARCHSINGLECONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.searchSingleConfiguration',
  summary: `Lookup single agent configuration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration/search</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

This endpoint enables you to search for a single agent configuration and update the 'applied_by_agent' field.
`,
  methods: ['POST'],
  patterns: ['/api/apm/settings/agent-configuration/search'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(search_single_configuration_request, 'body'),
    getLooseObjectFromProperty(search_single_configuration_request, 'path'),
    getLooseObjectFromProperty(search_single_configuration_request, 'query'),
  ]),
  outputSchema: search_single_configuration_response,
};
const GETSINGLEAGENTCONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getSingleAgentConfiguration',
  summary: `Get single agent configuration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration/view</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/apm/settings/agent-configuration/view'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['name', 'environment'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_single_agent_configuration_request, 'body'),
    getLooseObjectFromProperty(get_single_agent_configuration_request, 'path'),
    getLooseObjectFromProperty(get_single_agent_configuration_request, 'query'),
  ]),
  outputSchema: get_single_agent_configuration_response,
};
const GETSOURCEMAPS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getSourceMaps',
  summary: `Get source maps`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/sourcemaps</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get an array of Fleet artifacts, including source map uploads. You must have \`read\` or \`all\` Kibana privileges for the APM and User Experience feature.
`,
  methods: ['GET'],
  patterns: ['/api/apm/sourcemaps'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'perPage'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_source_maps_request, 'body'),
    getLooseObjectFromProperty(get_source_maps_request, 'path'),
    getLooseObjectFromProperty(get_source_maps_request, 'query'),
  ]),
  outputSchema: get_source_maps_response,
};
const UPLOADSOURCEMAP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.uploadSourceMap',
  summary: `Upload a source map`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/sourcemaps</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upload a source map for a specific service and version. You must have \`all\` Kibana privileges for the APM and User Experience feature.
The maximum payload size is \`1mb\`. If you attempt to upload a source map that exceeds the maximum payload size, you will get a 413 error. Before uploading source maps that exceed this default, change the maximum payload size allowed by Kibana with the \`server.maxPayload\` variable.
`,
  methods: ['POST'],
  patterns: ['/api/apm/sourcemaps'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(upload_source_map_request, 'body'),
    getLooseObjectFromProperty(upload_source_map_request, 'path'),
    getLooseObjectFromProperty(upload_source_map_request, 'query'),
  ]),
  outputSchema: upload_source_map_response,
};
const DELETESOURCEMAP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteSourceMap',
  summary: `Delete source map`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/sourcemaps/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a previously uploaded source map. You must have \`all\` Kibana privileges for the APM and User Experience feature.
`,
  methods: ['DELETE'],
  patterns: ['/api/apm/sourcemaps/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_source_map_request, 'body'),
    getLooseObjectFromProperty(delete_source_map_request, 'path'),
    getLooseObjectFromProperty(delete_source_map_request, 'query'),
  ]),
  outputSchema: delete_source_map_response,
};
const DELETEASSETCRITICALITYRECORD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteAssetCriticalityRecord',
  summary: `Delete an asset criticality record`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete the asset criticality record for a specific entity.`,
  methods: ['DELETE'],
  patterns: ['/api/asset_criticality'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id_value', 'id_field', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_asset_criticality_record_request, 'body'),
    getLooseObjectFromProperty(delete_asset_criticality_record_request, 'path'),
    getLooseObjectFromProperty(delete_asset_criticality_record_request, 'query'),
  ]),
  outputSchema: delete_asset_criticality_record_response,
};
const GETASSETCRITICALITYRECORD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetAssetCriticalityRecord',
  summary: `Get an asset criticality record`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the asset criticality record for a specific entity.`,
  methods: ['GET'],
  patterns: ['/api/asset_criticality'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id_value', 'id_field'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_asset_criticality_record_request, 'body'),
    getLooseObjectFromProperty(get_asset_criticality_record_request, 'path'),
    getLooseObjectFromProperty(get_asset_criticality_record_request, 'query'),
  ]),
  outputSchema: get_asset_criticality_record_response,
};
const CREATEASSETCRITICALITYRECORD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateAssetCriticalityRecord',
  summary: `Upsert an asset criticality record`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create or update an asset criticality record for a specific entity.

If a record already exists for the specified entity, that record is overwritten with the specified value. If a record doesn't exist for the specified entity, a new record is created.
`,
  methods: ['POST'],
  patterns: ['/api/asset_criticality'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_asset_criticality_record_request, 'body'),
    getLooseObjectFromProperty(create_asset_criticality_record_request, 'path'),
    getLooseObjectFromProperty(create_asset_criticality_record_request, 'query'),
  ]),
  outputSchema: create_asset_criticality_record_response,
};
const BULKUPSERTASSETCRITICALITYRECORDS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.BulkUpsertAssetCriticalityRecords',
  summary: `Bulk upsert asset criticality records`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality/bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Bulk upsert up to 1000 asset criticality records.

If asset criticality records already exist for the specified entities, those records are overwritten with the specified values. If asset criticality records don't exist for the specified entities, new records are created.
`,
  methods: ['POST'],
  patterns: ['/api/asset_criticality/bulk'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['records'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(bulk_upsert_asset_criticality_records_request, 'body'),
    getLooseObjectFromProperty(bulk_upsert_asset_criticality_records_request, 'path'),
    getLooseObjectFromProperty(bulk_upsert_asset_criticality_records_request, 'query'),
  ]),
  outputSchema: bulk_upsert_asset_criticality_records_response,
};
const FINDASSETCRITICALITYRECORDS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindAssetCriticalityRecords',
  summary: `List asset criticality records`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality/list</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List asset criticality records, paging, sorting and filtering as needed.`,
  methods: ['GET'],
  patterns: ['/api/asset_criticality/list'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['sort_field', 'sort_direction', 'page', 'per_page', 'kuery'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(find_asset_criticality_records_request, 'body'),
    getLooseObjectFromProperty(find_asset_criticality_records_request, 'path'),
    getLooseObjectFromProperty(find_asset_criticality_records_request, 'query'),
  ]),
  outputSchema: find_asset_criticality_records_response,
};
const POSTATTACKDISCOVERYBULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PostAttackDiscoveryBulk',
  summary: `Bulk update Attack discoveries`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/_bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Performs bulk updates on multiple Attack discoveries, including workflow status changes and visibility settings. This endpoint allows efficient batch processing of alert modifications without requiring individual API calls for each alert. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/_bulk'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['update'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_attack_discovery_bulk_request, 'body'),
    getLooseObjectFromProperty(post_attack_discovery_bulk_request, 'path'),
    getLooseObjectFromProperty(post_attack_discovery_bulk_request, 'query'),
  ]),
  outputSchema: post_attack_discovery_bulk_response,
};
const ATTACKDISCOVERYFIND_CONTRACT: InternalConnectorContract = {
  type: 'kibana.AttackDiscoveryFind',
  summary: `Find Attack discoveries that match the search criteria`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Find Attack discoveries that match the search criteria. Supports free text search, filtering, pagination, and sorting. \`Technical preview\``,
  methods: ['GET'],
  patterns: ['/api/attack_discovery/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(attack_discovery_find_request, 'body'),
    getLooseObjectFromProperty(attack_discovery_find_request, 'path'),
    getLooseObjectFromProperty(attack_discovery_find_request, 'query'),
  ]),
  outputSchema: attack_discovery_find_response,
};
const POSTATTACKDISCOVERYGENERATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PostAttackDiscoveryGenerate',
  summary: `Generate attack discoveries from alerts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/_generate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Initiates the generation of attack discoveries by analyzing security alerts using AI. Returns an execution UUID that can be used to track the generation progress and retrieve results. Results may also be retrieved via the find endpoint. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/_generate'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_attack_discovery_generate_request, 'body'),
    getLooseObjectFromProperty(post_attack_discovery_generate_request, 'path'),
    getLooseObjectFromProperty(post_attack_discovery_generate_request, 'query'),
  ]),
  outputSchema: post_attack_discovery_generate_response,
};
const GETATTACKDISCOVERYGENERATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetAttackDiscoveryGenerations',
  summary: `Get the latest attack discovery generations metadata for the current user`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/generations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the latest attack discovery generations metadata (that are not dismissed) for the current user. This endpoint retrieves generation metadata including execution status and statistics for Attack discovery generations. \`Technical preview\``,
  methods: ['GET'],
  patterns: ['/api/attack_discovery/generations'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['end', 'size', 'start'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_attack_discovery_generations_request, 'body'),
    getLooseObjectFromProperty(get_attack_discovery_generations_request, 'path'),
    getLooseObjectFromProperty(get_attack_discovery_generations_request, 'query'),
  ]),
  outputSchema: get_attack_discovery_generations_response,
};
const GETATTACKDISCOVERYGENERATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetAttackDiscoveryGeneration',
  summary: `Get a single Attack discovery generation, including its discoveries and (optional) generation metadata`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/generations/{execution_uuid}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Returns a specific Attack discovery generation, including all generated Attack discoveries and associated metadata, including execution status and statistics. \`Technical preview\``,
  methods: ['GET'],
  patterns: ['/api/attack_discovery/generations/{execution_uuid}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['execution_uuid'],
    urlParams: ['enable_field_rendering', 'with_replacements'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_attack_discovery_generation_request, 'body'),
    getLooseObjectFromProperty(get_attack_discovery_generation_request, 'path'),
    getLooseObjectFromProperty(get_attack_discovery_generation_request, 'query'),
  ]),
  outputSchema: get_attack_discovery_generation_response,
};
const POSTATTACKDISCOVERYGENERATIONSDISMISS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PostAttackDiscoveryGenerationsDismiss',
  summary: `Dismiss an attack discovery generation`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/generations/{execution_uuid}/_dismiss</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Dismisses an attack discovery generation for the current user, indicating that it's status should not be reported in the UI. This sets the generation's status to "dismissed" and affects how the generation appears in subsequent queries. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/generations/{execution_uuid}/_dismiss'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['execution_uuid'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_attack_discovery_generations_dismiss_request, 'body'),
    getLooseObjectFromProperty(post_attack_discovery_generations_dismiss_request, 'path'),
    getLooseObjectFromProperty(post_attack_discovery_generations_dismiss_request, 'query'),
  ]),
  outputSchema: post_attack_discovery_generations_dismiss_response,
};
const CREATEATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateAttackDiscoverySchedules',
  summary: `Create Attack discovery schedule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Creates a new Attack discovery schedule that analyzes security alerts at specified intervals. The schedule defines when and how Attack discovery analysis should run, including which alerts to analyze, which AI connector to use, and what actions to take when discoveries are found. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/schedules'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_attack_discovery_schedules_request, 'body'),
    getLooseObjectFromProperty(create_attack_discovery_schedules_request, 'path'),
    getLooseObjectFromProperty(create_attack_discovery_schedules_request, 'query'),
  ]),
  outputSchema: create_attack_discovery_schedules_response,
};
const FINDATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindAttackDiscoverySchedules',
  summary: `Finds Attack discovery schedules that match the search criteria`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Finds Attack discovery schedules that match the search criteria. Supports pagination and sorting by various fields. \`Technical preview\``,
  methods: ['GET'],
  patterns: ['/api/attack_discovery/schedules/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'per_page', 'sort_field', 'sort_direction'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(find_attack_discovery_schedules_request, 'body'),
    getLooseObjectFromProperty(find_attack_discovery_schedules_request, 'path'),
    getLooseObjectFromProperty(find_attack_discovery_schedules_request, 'query'),
  ]),
  outputSchema: find_attack_discovery_schedules_response,
};
const DELETEATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteAttackDiscoverySchedules',
  summary: `Delete Attack discovery schedule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Permanently deletes an Attack discovery schedule and all associated configuration. \`Technical preview\``,
  methods: ['DELETE'],
  patterns: ['/api/attack_discovery/schedules/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_attack_discovery_schedules_request, 'body'),
    getLooseObjectFromProperty(delete_attack_discovery_schedules_request, 'path'),
    getLooseObjectFromProperty(delete_attack_discovery_schedules_request, 'query'),
  ]),
  outputSchema: delete_attack_discovery_schedules_response,
};
const GETATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetAttackDiscoverySchedules',
  summary: `Get Attack discovery schedule by ID`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieves a specific Attack discovery schedule by its unique identifier. Returns complete schedule configuration including parameters, interval settings, associated actions, and execution history. \`Technical preview\``,
  methods: ['GET'],
  patterns: ['/api/attack_discovery/schedules/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_attack_discovery_schedules_request, 'body'),
    getLooseObjectFromProperty(get_attack_discovery_schedules_request, 'path'),
    getLooseObjectFromProperty(get_attack_discovery_schedules_request, 'query'),
  ]),
  outputSchema: get_attack_discovery_schedules_response,
};
const UPDATEATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateAttackDiscoverySchedules',
  summary: `Update Attack discovery schedule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Updates an existing Attack discovery schedule with new configuration. All schedule properties can be modified including name, parameters, interval, and actions. The update operation replaces the entire schedule configuration with the provided values. \`Technical preview\``,
  methods: ['PUT'],
  patterns: ['/api/attack_discovery/schedules/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_attack_discovery_schedules_request, 'body'),
    getLooseObjectFromProperty(update_attack_discovery_schedules_request, 'path'),
    getLooseObjectFromProperty(update_attack_discovery_schedules_request, 'query'),
  ]),
  outputSchema: update_attack_discovery_schedules_response,
};
const DISABLEATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DisableAttackDiscoverySchedules',
  summary: `Disable Attack discovery schedule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}/_disable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Disables an Attack discovery schedule, preventing it from running according to its configured interval. The schedule configuration is preserved and can be re-enabled later. Any currently running executions will complete, but no new executions will be started. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/schedules/{id}/_disable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(disable_attack_discovery_schedules_request, 'body'),
    getLooseObjectFromProperty(disable_attack_discovery_schedules_request, 'path'),
    getLooseObjectFromProperty(disable_attack_discovery_schedules_request, 'query'),
  ]),
  outputSchema: disable_attack_discovery_schedules_response,
};
const ENABLEATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EnableAttackDiscoverySchedules',
  summary: `Enable Attack discovery schedule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}/_enable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Enables a previously disabled Attack discovery schedule, allowing it to run according to its configured interval. Once enabled, the schedule will begin executing at the next scheduled time based on its interval configuration. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/schedules/{id}/_enable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(enable_attack_discovery_schedules_request, 'body'),
    getLooseObjectFromProperty(enable_attack_discovery_schedules_request, 'path'),
    getLooseObjectFromProperty(enable_attack_discovery_schedules_request, 'query'),
  ]),
  outputSchema: enable_attack_discovery_schedules_response,
};
const DELETECASEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteCaseDefaultSpace',
  summary: `Delete cases`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` or \`all\` privileges and the \`delete\` sub-feature privilege for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're deleting.
`,
  methods: ['DELETE'],
  patterns: ['/api/cases'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['ids'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_case_default_space_request, 'body'),
    getLooseObjectFromProperty(delete_case_default_space_request, 'path'),
    getLooseObjectFromProperty(delete_case_default_space_request, 'query'),
  ]),
  outputSchema: delete_case_default_space_response,
};
const UPDATECASEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateCaseDefaultSpace',
  summary: `Update cases`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the  **Management**, **Observability**, or **Security** section of the Kibana  feature privileges, depending on the owner of the case you're updating.
`,
  methods: ['PATCH'],
  patterns: ['/api/cases'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_case_default_space_request, 'body'),
    getLooseObjectFromProperty(update_case_default_space_request, 'path'),
    getLooseObjectFromProperty(update_case_default_space_request, 'query'),
  ]),
  outputSchema: update_case_default_space_response,
};
const CREATECASEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createCaseDefaultSpace',
  summary: `Create a case`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana  feature privileges, depending on the owner of the case you're creating.
`,
  methods: ['POST'],
  patterns: ['/api/cases'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_case_default_space_request, 'body'),
    getLooseObjectFromProperty(create_case_default_space_request, 'path'),
    getLooseObjectFromProperty(create_case_default_space_request, 'query'),
  ]),
  outputSchema: create_case_default_space_response,
};
const FINDCASESDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findCasesDefaultSpace',
  summary: `Search cases`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(find_cases_default_space_request, 'body'),
    getLooseObjectFromProperty(find_cases_default_space_request, 'path'),
    getLooseObjectFromProperty(find_cases_default_space_request, 'query'),
  ]),
  outputSchema: find_cases_default_space_response,
};
const GETCASEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseDefaultSpace',
  summary: `Get case information`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/{caseId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['caseId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_case_default_space_request, 'body'),
    getLooseObjectFromProperty(get_case_default_space_request, 'path'),
    getLooseObjectFromProperty(get_case_default_space_request, 'query'),
  ]),
  outputSchema: get_case_default_space_response,
};
const GETCASEALERTSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseAlertsDefaultSpace',
  summary: `Get all alerts for a case`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/alerts</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/{caseId}/alerts'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['caseId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_case_alerts_default_space_request, 'body'),
    getLooseObjectFromProperty(get_case_alerts_default_space_request, 'path'),
    getLooseObjectFromProperty(get_case_alerts_default_space_request, 'query'),
  ]),
  outputSchema: get_case_alerts_default_space_response,
};
const DELETECASECOMMENTSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteCaseCommentsDefaultSpace',
  summary: `Delete all case comments and alerts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Deletes all comments and alerts from a case. You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're deleting.
`,
  methods: ['DELETE'],
  patterns: ['/api/cases/{caseId}/comments'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['caseId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_case_comments_default_space_request, 'body'),
    getLooseObjectFromProperty(delete_case_comments_default_space_request, 'path'),
    getLooseObjectFromProperty(delete_case_comments_default_space_request, 'query'),
  ]),
  outputSchema: delete_case_comments_default_space_response,
};
const UPDATECASECOMMENTDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateCaseCommentDefaultSpace',
  summary: `Update a case comment or alert`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're updating. NOTE: You cannot change the comment type or the owner of a comment.
`,
  methods: ['PATCH'],
  patterns: ['/api/cases/{caseId}/comments'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['caseId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_case_comment_default_space_request, 'body'),
    getLooseObjectFromProperty(update_case_comment_default_space_request, 'path'),
    getLooseObjectFromProperty(update_case_comment_default_space_request, 'query'),
  ]),
  outputSchema: update_case_comment_default_space_response,
};
const ADDCASECOMMENTDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.addCaseCommentDefaultSpace',
  summary: `Add a case comment or alert`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're creating. NOTE: Each case can have a maximum of 1,000 alerts.
`,
  methods: ['POST'],
  patterns: ['/api/cases/{caseId}/comments'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['caseId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(add_case_comment_default_space_request, 'body'),
    getLooseObjectFromProperty(add_case_comment_default_space_request, 'path'),
    getLooseObjectFromProperty(add_case_comment_default_space_request, 'query'),
  ]),
  outputSchema: add_case_comment_default_space_response,
};
const FINDCASECOMMENTSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findCaseCommentsDefaultSpace',
  summary: `Find case comments and alerts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieves a paginated list of comments for a case. You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases with the comments you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/{caseId}/comments/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['caseId'],
    urlParams: ['page', 'perPage', 'sortOrder'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(find_case_comments_default_space_request, 'body'),
    getLooseObjectFromProperty(find_case_comments_default_space_request, 'path'),
    getLooseObjectFromProperty(find_case_comments_default_space_request, 'query'),
  ]),
  outputSchema: find_case_comments_default_space_response,
};
const DELETECASECOMMENTDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteCaseCommentDefaultSpace',
  summary: `Delete a case comment or alert`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments/{commentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're deleting.
`,
  methods: ['DELETE'],
  patterns: ['/api/cases/{caseId}/comments/{commentId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['caseId', 'commentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_case_comment_default_space_request, 'body'),
    getLooseObjectFromProperty(delete_case_comment_default_space_request, 'path'),
    getLooseObjectFromProperty(delete_case_comment_default_space_request, 'query'),
  ]),
  outputSchema: delete_case_comment_default_space_response,
};
const GETCASECOMMENTDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseCommentDefaultSpace',
  summary: `Get a case comment or alert`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments/{commentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases with the comments you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/{caseId}/comments/{commentId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['caseId', 'commentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_case_comment_default_space_request, 'body'),
    getLooseObjectFromProperty(get_case_comment_default_space_request, 'path'),
    getLooseObjectFromProperty(get_case_comment_default_space_request, 'query'),
  ]),
  outputSchema: get_case_comment_default_space_response,
};
const PUSHCASEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.pushCaseDefaultSpace',
  summary: `Push a case to an external service`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/connector/{connectorId}/_push</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Actions and Connectors** feature in the **Management** section of the Kibana feature privileges. You must also have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're pushing.
`,
  methods: ['POST'],
  patterns: ['/api/cases/{caseId}/connector/{connectorId}/_push'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['caseId', 'connectorId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(push_case_default_space_request, 'body'),
    getLooseObjectFromProperty(push_case_default_space_request, 'path'),
    getLooseObjectFromProperty(push_case_default_space_request, 'query'),
  ]),
  outputSchema: push_case_default_space_response,
};
const ADDCASEFILEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.addCaseFileDefaultSpace',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['caseId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(add_case_file_default_space_request, 'body'),
    getLooseObjectFromProperty(add_case_file_default_space_request, 'path'),
    getLooseObjectFromProperty(add_case_file_default_space_request, 'query'),
  ]),
  outputSchema: add_case_file_default_space_response,
};
const FINDCASEACTIVITYDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findCaseActivityDefaultSpace',
  summary: `Find case activity`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/user_actions/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrives a paginated list of user activity for a case. You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/{caseId}/user_actions/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['caseId'],
    urlParams: ['page', 'perPage', 'sortOrder', 'types'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(find_case_activity_default_space_request, 'body'),
    getLooseObjectFromProperty(find_case_activity_default_space_request, 'path'),
    getLooseObjectFromProperty(find_case_activity_default_space_request, 'query'),
  ]),
  outputSchema: find_case_activity_default_space_response,
};
const GETCASESBYALERTDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCasesByAlertDefaultSpace',
  summary: `Get cases for an alert`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/alerts/{alertId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/alerts/{alertId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['alertId'],
    urlParams: ['owner'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_cases_by_alert_default_space_request, 'body'),
    getLooseObjectFromProperty(get_cases_by_alert_default_space_request, 'path'),
    getLooseObjectFromProperty(get_cases_by_alert_default_space_request, 'query'),
  ]),
  outputSchema: get_cases_by_alert_default_space_response,
};
const GETCASECONFIGURATIONDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseConfigurationDefaultSpace',
  summary: `Get case settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/configure</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get setting details such as the closure type, custom fields, templatse, and the default connector for cases. You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on where the cases were created.
`,
  methods: ['GET'],
  patterns: ['/api/cases/configure'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['owner'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_case_configuration_default_space_request, 'body'),
    getLooseObjectFromProperty(get_case_configuration_default_space_request, 'path'),
    getLooseObjectFromProperty(get_case_configuration_default_space_request, 'query'),
  ]),
  outputSchema: get_case_configuration_default_space_response,
};
const SETCASECONFIGURATIONDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.setCaseConfigurationDefaultSpace',
  summary: `Add case settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/configure</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Case settings include external connection details, custom fields, and templates. Connectors are used to interface with external systems. You must create a connector before you can use it in your cases. If you set a default connector, it is automatically selected when you create cases in Kibana. If you use the create case API, however, you must still specify all of the connector details. You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on where you are creating cases.
`,
  methods: ['POST'],
  patterns: ['/api/cases/configure'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(set_case_configuration_default_space_request, 'body'),
    getLooseObjectFromProperty(set_case_configuration_default_space_request, 'path'),
    getLooseObjectFromProperty(set_case_configuration_default_space_request, 'query'),
  ]),
  outputSchema: set_case_configuration_default_space_response,
};
const UPDATECASECONFIGURATIONDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateCaseConfigurationDefaultSpace',
  summary: `Update case settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/configure/{configurationId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Updates setting details such as the closure type, custom fields, templates, and the default connector for cases. Connectors are used to interface with external systems. You must create a connector before you can use it in your cases. You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on where the case was created.
`,
  methods: ['PATCH'],
  patterns: ['/api/cases/configure/{configurationId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['configurationId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_case_configuration_default_space_request, 'body'),
    getLooseObjectFromProperty(update_case_configuration_default_space_request, 'path'),
    getLooseObjectFromProperty(update_case_configuration_default_space_request, 'query'),
  ]),
  outputSchema: update_case_configuration_default_space_response,
};
const FINDCASECONNECTORSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findCaseConnectorsDefaultSpace',
  summary: `Get case connectors`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/configure/connectors/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get information about connectors that are supported for use in cases. You must have \`read\` privileges for the **Actions and Connectors** feature in the **Management** section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/api/cases/configure/connectors/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(find_case_connectors_default_space_request, 'body'),
    getLooseObjectFromProperty(find_case_connectors_default_space_request, 'path'),
    getLooseObjectFromProperty(find_case_connectors_default_space_request, 'query'),
  ]),
  outputSchema: find_case_connectors_default_space_response,
};
const GETCASEREPORTERSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseReportersDefaultSpace',
  summary: `Get case creators`,
  description: `Returns information about the users who opened cases. You must have read privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases. The API returns information about the users as they existed at the time of the case creation, including their name, full name, and email address. If any of those details change thereafter or if a user is deleted, the information returned by this API is unchanged.
`,
  methods: ['GET'],
  patterns: ['/api/cases/reporters'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['owner'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_case_reporters_default_space_request, 'body'),
    getLooseObjectFromProperty(get_case_reporters_default_space_request, 'path'),
    getLooseObjectFromProperty(get_case_reporters_default_space_request, 'query'),
  ]),
  outputSchema: get_case_reporters_default_space_response,
};
const GETCASETAGSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseTagsDefaultSpace',
  summary: `Get case tags`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/tags</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Aggregates and returns a list of case tags. You must have read privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/tags'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['owner'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_case_tags_default_space_request, 'body'),
    getLooseObjectFromProperty(get_case_tags_default_space_request, 'path'),
    getLooseObjectFromProperty(get_case_tags_default_space_request, 'query'),
  ]),
  outputSchema: get_case_tags_default_space_response,
};
const GETALLDATAVIEWSDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getAllDataViewsDefault',
  summary: `Get all data views`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/data_views'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_all_data_views_default_request, 'body'),
    getLooseObjectFromProperty(get_all_data_views_default_request, 'path'),
    getLooseObjectFromProperty(get_all_data_views_default_request, 'query'),
  ]),
  outputSchema: get_all_data_views_default_response,
};
const CREATEDATAVIEWDEFAULTW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createDataViewDefaultw',
  summary: `Create a data view`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/data_views/data_view'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_data_view_defaultw_request, 'body'),
    getLooseObjectFromProperty(create_data_view_defaultw_request, 'path'),
    getLooseObjectFromProperty(create_data_view_defaultw_request, 'query'),
  ]),
  outputSchema: create_data_view_defaultw_response,
};
const DELETEDATAVIEWDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteDataViewDefault',
  summary: `Delete a data view`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: When you delete a data view, it cannot be recovered.
`,
  methods: ['DELETE'],
  patterns: ['/api/data_views/data_view/{viewId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['viewId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_data_view_default_request, 'body'),
    getLooseObjectFromProperty(delete_data_view_default_request, 'path'),
    getLooseObjectFromProperty(delete_data_view_default_request, 'query'),
  ]),
  outputSchema: delete_data_view_default_response,
};
const GETDATAVIEWDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getDataViewDefault',
  summary: `Get a data view`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/data_views/data_view/{viewId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['viewId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_data_view_default_request, 'body'),
    getLooseObjectFromProperty(get_data_view_default_request, 'path'),
    getLooseObjectFromProperty(get_data_view_default_request, 'query'),
  ]),
  outputSchema: get_data_view_default_response,
};
const UPDATEDATAVIEWDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateDataViewDefault',
  summary: `Update a data view`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/data_views/data_view/{viewId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['viewId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_data_view_default_request, 'body'),
    getLooseObjectFromProperty(update_data_view_default_request, 'path'),
    getLooseObjectFromProperty(update_data_view_default_request, 'query'),
  ]),
  outputSchema: update_data_view_default_response,
};
const UPDATEFIELDSMETADATADEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateFieldsMetadataDefault',
  summary: `Update data view fields metadata`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/fields</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update fields presentation metadata such as count, customLabel, customDescription, and format.
`,
  methods: ['POST'],
  patterns: ['/api/data_views/data_view/{viewId}/fields'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['viewId'],
    urlParams: [],
    bodyParams: ['fields'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_fields_metadata_default_request, 'body'),
    getLooseObjectFromProperty(update_fields_metadata_default_request, 'path'),
    getLooseObjectFromProperty(update_fields_metadata_default_request, 'query'),
  ]),
  outputSchema: update_fields_metadata_default_response,
};
const CREATERUNTIMEFIELDDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createRuntimeFieldDefault',
  summary: `Create a runtime field`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/runtime_field</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/data_views/data_view/{viewId}/runtime_field'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['viewId'],
    urlParams: [],
    bodyParams: ['name', 'runtimeField'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_runtime_field_default_request, 'body'),
    getLooseObjectFromProperty(create_runtime_field_default_request, 'path'),
    getLooseObjectFromProperty(create_runtime_field_default_request, 'query'),
  ]),
  outputSchema: create_runtime_field_default_response,
};
const CREATEUPDATERUNTIMEFIELDDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createUpdateRuntimeFieldDefault',
  summary: `Create or update a runtime field`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/runtime_field</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['PUT'],
  patterns: ['/api/data_views/data_view/{viewId}/runtime_field'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['viewId'],
    urlParams: [],
    bodyParams: ['name', 'runtimeField'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_update_runtime_field_default_request, 'body'),
    getLooseObjectFromProperty(create_update_runtime_field_default_request, 'path'),
    getLooseObjectFromProperty(create_update_runtime_field_default_request, 'query'),
  ]),
  outputSchema: create_update_runtime_field_default_response,
};
const DELETERUNTIMEFIELDDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteRuntimeFieldDefault',
  summary: `Delete a runtime field from a data view`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/runtime_field/{fieldName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/data_views/data_view/{viewId}/runtime_field/{fieldName}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['fieldName', 'viewId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_runtime_field_default_request, 'body'),
    getLooseObjectFromProperty(delete_runtime_field_default_request, 'path'),
    getLooseObjectFromProperty(delete_runtime_field_default_request, 'query'),
  ]),
  outputSchema: delete_runtime_field_default_response,
};
const GETRUNTIMEFIELDDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getRuntimeFieldDefault',
  summary: `Get a runtime field`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/runtime_field/{fieldName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/data_views/data_view/{viewId}/runtime_field/{fieldName}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['fieldName', 'viewId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_runtime_field_default_request, 'body'),
    getLooseObjectFromProperty(get_runtime_field_default_request, 'path'),
    getLooseObjectFromProperty(get_runtime_field_default_request, 'query'),
  ]),
  outputSchema: get_runtime_field_default_response,
};
const UPDATERUNTIMEFIELDDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateRuntimeFieldDefault',
  summary: `Update a runtime field`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/runtime_field/{fieldName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/data_views/data_view/{viewId}/runtime_field/{fieldName}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['fieldName', 'viewId'],
    urlParams: [],
    bodyParams: ['runtimeField'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_runtime_field_default_request, 'body'),
    getLooseObjectFromProperty(update_runtime_field_default_request, 'path'),
    getLooseObjectFromProperty(update_runtime_field_default_request, 'query'),
  ]),
  outputSchema: update_runtime_field_default_response,
};
const GETDEFAULTDATAVIEWDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getDefaultDataViewDefault',
  summary: `Get the default data view`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/default</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/data_views/default'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_default_data_view_default_request, 'body'),
    getLooseObjectFromProperty(get_default_data_view_default_request, 'path'),
    getLooseObjectFromProperty(get_default_data_view_default_request, 'query'),
  ]),
  outputSchema: get_default_data_view_default_response,
};
const SETDEFAULTDATAILVIEWDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.setDefaultDatailViewDefault',
  summary: `Set the default data view`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/default</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/data_views/default'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['data_view_id', 'force'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(set_default_datail_view_default_request, 'body'),
    getLooseObjectFromProperty(set_default_datail_view_default_request, 'path'),
    getLooseObjectFromProperty(set_default_datail_view_default_request, 'query'),
  ]),
  outputSchema: set_default_datail_view_default_response,
};
const SWAPDATAVIEWSDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.swapDataViewsDefault',
  summary: `Swap saved object references`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/swap_references</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Changes saved object references from one data view identifier to another. WARNING: Misuse can break large numbers of saved objects! Practicing with a backup is recommended.
`,
  methods: ['POST'],
  patterns: ['/api/data_views/swap_references'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(swap_data_views_default_request, 'body'),
    getLooseObjectFromProperty(swap_data_views_default_request, 'path'),
    getLooseObjectFromProperty(swap_data_views_default_request, 'query'),
  ]),
  outputSchema: swap_data_views_default_response,
};
const PREVIEWSWAPDATAVIEWSDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.previewSwapDataViewsDefault',
  summary: `Preview a saved object reference swap`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/swap_references/_preview</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Preview the impact of swapping saved object references from one data view identifier to another.
`,
  methods: ['POST'],
  patterns: ['/api/data_views/swap_references/_preview'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(preview_swap_data_views_default_request, 'body'),
    getLooseObjectFromProperty(preview_swap_data_views_default_request, 'path'),
    getLooseObjectFromProperty(preview_swap_data_views_default_request, 'query'),
  ]),
  outputSchema: preview_swap_data_views_default_response,
};
const DELETEALERTSINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteAlertsIndex',
  summary: `Delete an alerts index`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/detection_engine/index'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_alerts_index_request, 'body'),
    getLooseObjectFromProperty(delete_alerts_index_request, 'path'),
    getLooseObjectFromProperty(delete_alerts_index_request, 'query'),
  ]),
  outputSchema: delete_alerts_index_response,
};
const READALERTSINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadAlertsIndex',
  summary: `Reads the alert index name if it exists`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/detection_engine/index'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_alerts_index_request, 'body'),
    getLooseObjectFromProperty(read_alerts_index_request, 'path'),
    getLooseObjectFromProperty(read_alerts_index_request, 'query'),
  ]),
  outputSchema: read_alerts_index_response,
};
const CREATEALERTSINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateAlertsIndex',
  summary: `Create an alerts index`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/index'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_alerts_index_request, 'body'),
    getLooseObjectFromProperty(create_alerts_index_request, 'path'),
    getLooseObjectFromProperty(create_alerts_index_request, 'query'),
  ]),
  outputSchema: create_alerts_index_response,
};
const READPRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadPrivileges',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_privileges_request, 'body'),
    getLooseObjectFromProperty(read_privileges_request, 'path'),
    getLooseObjectFromProperty(read_privileges_request, 'query'),
  ]),
  outputSchema: read_privileges_response,
};
const DELETERULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteRule',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'rule_id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_rule_request, 'body'),
    getLooseObjectFromProperty(delete_rule_request, 'path'),
    getLooseObjectFromProperty(delete_rule_request, 'query'),
  ]),
  outputSchema: delete_rule_response,
};
const READRULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadRule',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'rule_id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_rule_request, 'body'),
    getLooseObjectFromProperty(read_rule_request, 'path'),
    getLooseObjectFromProperty(read_rule_request, 'query'),
  ]),
  outputSchema: read_rule_response,
};
const PATCHRULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PatchRule',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(patch_rule_request, 'body'),
    getLooseObjectFromProperty(patch_rule_request, 'path'),
    getLooseObjectFromProperty(patch_rule_request, 'query'),
  ]),
  outputSchema: patch_rule_response,
};
const CREATERULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateRule',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_rule_request, 'body'),
    getLooseObjectFromProperty(create_rule_request, 'path'),
    getLooseObjectFromProperty(create_rule_request, 'query'),
  ]),
  outputSchema: create_rule_response,
};
const UPDATERULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateRule',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_rule_request, 'body'),
    getLooseObjectFromProperty(update_rule_request, 'path'),
    getLooseObjectFromProperty(update_rule_request, 'query'),
  ]),
  outputSchema: update_rule_response,
};
const PERFORMRULESBULKACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PerformRulesBulkAction',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['dry_run'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(perform_rules_bulk_action_request, 'body'),
    getLooseObjectFromProperty(perform_rules_bulk_action_request, 'path'),
    getLooseObjectFromProperty(perform_rules_bulk_action_request, 'query'),
  ]),
  outputSchema: perform_rules_bulk_action_response,
};
const EXPORTRULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ExportRules',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['exclude_export_details', 'file_name'],
    bodyParams: ['objects'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(export_rules_request, 'body'),
    getLooseObjectFromProperty(export_rules_request, 'path'),
    getLooseObjectFromProperty(export_rules_request, 'query'),
  ]),
  outputSchema: export_rules_response,
};
const FINDRULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindRules',
  summary: `List all detection rules`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a paginated list of detection rules. By default, the first page is returned, with 20 results per page.`,
  methods: ['GET'],
  patterns: ['/api/detection_engine/rules/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(find_rules_request, 'body'),
    getLooseObjectFromProperty(find_rules_request, 'path'),
    getLooseObjectFromProperty(find_rules_request, 'query'),
  ]),
  outputSchema: find_rules_response,
};
const IMPORTRULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ImportRules',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['overwrite', 'overwrite_exceptions', 'overwrite_action_connectors', 'as_new_list'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(import_rules_request, 'body'),
    getLooseObjectFromProperty(import_rules_request, 'path'),
    getLooseObjectFromProperty(import_rules_request, 'query'),
  ]),
  outputSchema: import_rules_response,
};
const CREATERULEEXCEPTIONLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateRuleExceptionListItems',
  summary: `Create rule exception items`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/{id}/exceptions</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create exception items that apply to a single detection rule.`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/rules/{id}/exceptions'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['items'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_rule_exception_list_items_request, 'body'),
    getLooseObjectFromProperty(create_rule_exception_list_items_request, 'path'),
    getLooseObjectFromProperty(create_rule_exception_list_items_request, 'query'),
  ]),
  outputSchema: create_rule_exception_list_items_response,
};
const INSTALLPREBUILTRULESANDTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InstallPrebuiltRulesAndTimelines',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(install_prebuilt_rules_and_timelines_request, 'body'),
    getLooseObjectFromProperty(install_prebuilt_rules_and_timelines_request, 'path'),
    getLooseObjectFromProperty(install_prebuilt_rules_and_timelines_request, 'query'),
  ]),
  outputSchema: install_prebuilt_rules_and_timelines_response,
};
const READPREBUILTRULESANDTIMELINESSTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadPrebuiltRulesAndTimelinesStatus',
  summary: `Retrieve the status of prebuilt detection rules and Timelines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/prepackaged/_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve the status of all Elastic prebuilt detection rules and Timelines. 

This endpoint provides detailed information about the number of custom rules, installed prebuilt rules, available prebuilt rules that are not installed, outdated prebuilt rules, installed prebuilt timelines, available prebuilt timelines that are not installed, and outdated prebuilt timelines.
`,
  methods: ['GET'],
  patterns: ['/api/detection_engine/rules/prepackaged/_status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_prebuilt_rules_and_timelines_status_request, 'body'),
    getLooseObjectFromProperty(read_prebuilt_rules_and_timelines_status_request, 'path'),
    getLooseObjectFromProperty(read_prebuilt_rules_and_timelines_status_request, 'query'),
  ]),
  outputSchema: read_prebuilt_rules_and_timelines_status_response,
};
const RULEPREVIEW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.RulePreview',
  summary: `Preview rule alerts generated on specified time range`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/preview</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/rules/preview'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['enable_logged_requests'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(rule_preview_request, 'body'),
    getLooseObjectFromProperty(rule_preview_request, 'path'),
    getLooseObjectFromProperty(rule_preview_request, 'query'),
  ]),
  outputSchema: rule_preview_response,
};
const SETALERTASSIGNEES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.SetAlertAssignees',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['assignees', 'ids'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(set_alert_assignees_request, 'body'),
    getLooseObjectFromProperty(set_alert_assignees_request, 'path'),
    getLooseObjectFromProperty(set_alert_assignees_request, 'query'),
  ]),
  outputSchema: set_alert_assignees_response,
};
const FINALIZEALERTSMIGRATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FinalizeAlertsMigration',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['migration_ids'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(finalize_alerts_migration_request, 'body'),
    getLooseObjectFromProperty(finalize_alerts_migration_request, 'path'),
    getLooseObjectFromProperty(finalize_alerts_migration_request, 'query'),
  ]),
  outputSchema: finalize_alerts_migration_response,
};
const ALERTSMIGRATIONCLEANUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.AlertsMigrationCleanup',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['migration_ids'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(alerts_migration_cleanup_request, 'body'),
    getLooseObjectFromProperty(alerts_migration_cleanup_request, 'path'),
    getLooseObjectFromProperty(alerts_migration_cleanup_request, 'query'),
  ]),
  outputSchema: alerts_migration_cleanup_response,
};
const CREATEALERTSMIGRATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateAlertsMigration',
  summary: `Initiate a detection alert migration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/migration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Initiate a migration of detection alerts.
Migrations are initiated per index. While the process is neither destructive nor interferes with existing data, it may be resource-intensive. As such, it is recommended that you plan your migrations accordingly.
`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/signals/migration'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_alerts_migration_request, 'body'),
    getLooseObjectFromProperty(create_alerts_migration_request, 'path'),
    getLooseObjectFromProperty(create_alerts_migration_request, 'query'),
  ]),
  outputSchema: create_alerts_migration_response,
};
const READALERTSMIGRATIONSTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadAlertsMigrationStatus',
  summary: `Retrieve the status of detection alert migrations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/migration_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve indices that contain detection alerts of a particular age, along with migration information for each of those indices.`,
  methods: ['GET'],
  patterns: ['/api/detection_engine/signals/migration_status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['from'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_alerts_migration_status_request, 'body'),
    getLooseObjectFromProperty(read_alerts_migration_status_request, 'path'),
    getLooseObjectFromProperty(read_alerts_migration_status_request, 'query'),
  ]),
  outputSchema: read_alerts_migration_status_response,
};
const SEARCHALERTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.SearchAlerts',
  summary: `Find and/or aggregate detection alerts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/search</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Find and/or aggregate detection alerts that match the given query.`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/signals/search'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(search_alerts_request, 'body'),
    getLooseObjectFromProperty(search_alerts_request, 'path'),
    getLooseObjectFromProperty(search_alerts_request, 'query'),
  ]),
  outputSchema: search_alerts_response,
};
const SETALERTSSTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.SetAlertsStatus',
  summary: `Set a detection alert status`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Set the status of one or more detection alerts.`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/signals/status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(set_alerts_status_request, 'body'),
    getLooseObjectFromProperty(set_alerts_status_request, 'path'),
    getLooseObjectFromProperty(set_alerts_status_request, 'query'),
  ]),
  outputSchema: set_alerts_status_response,
};
const SETALERTTAGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.SetAlertTags',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['ids', 'tags'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(set_alert_tags_request, 'body'),
    getLooseObjectFromProperty(set_alert_tags_request, 'path'),
    getLooseObjectFromProperty(set_alert_tags_request, 'query'),
  ]),
  outputSchema: set_alert_tags_response,
};
const READTAGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadTags',
  summary: `List all detection rule tags`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/tags</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List all unique tags from all detection rules.`,
  methods: ['GET'],
  patterns: ['/api/detection_engine/tags'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_tags_request, 'body'),
    getLooseObjectFromProperty(read_tags_request, 'path'),
    getLooseObjectFromProperty(read_tags_request, 'query'),
  ]),
  outputSchema: read_tags_response,
};
const ROTATEENCRYPTIONKEY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.rotateEncryptionKey',
  summary: `Rotate a key for encrypted saved objects`,
  description: `Superuser role required.

If a saved object cannot be decrypted using the primary encryption key, then Kibana will attempt to decrypt it using the specified decryption-only keys. In most of the cases this overhead is negligible, but if you're dealing with a large number of saved objects and experiencing performance issues, you may want to rotate the encryption key.

This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.
`,
  methods: ['POST'],
  patterns: ['/api/encrypted_saved_objects/_rotate_key'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['batch_size', 'type'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(rotate_encryption_key_request, 'body'),
    getLooseObjectFromProperty(rotate_encryption_key_request, 'path'),
    getLooseObjectFromProperty(rotate_encryption_key_request, 'query'),
  ]),
  outputSchema: rotate_encryption_key_response,
};
const CREATEENDPOINTLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateEndpointList',
  summary: `Create an Elastic Endpoint rule exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create the exception list for Elastic Endpoint rule exceptions. When you create the exception list, it will have a \`list_id\` of \`endpoint_list\`. If the Elastic Endpoint exception list already exists, your request will return an empty response.`,
  methods: ['POST'],
  patterns: ['/api/endpoint_list'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_endpoint_list_request, 'body'),
    getLooseObjectFromProperty(create_endpoint_list_request, 'path'),
    getLooseObjectFromProperty(create_endpoint_list_request, 'query'),
  ]),
  outputSchema: create_endpoint_list_response,
};
const DELETEENDPOINTLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteEndpointListItem',
  summary: `Delete an Elastic Endpoint exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an Elastic Endpoint exception list item, specified by the \`id\` or \`item_id\` field.`,
  methods: ['DELETE'],
  patterns: ['/api/endpoint_list/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'item_id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_endpoint_list_item_request, 'body'),
    getLooseObjectFromProperty(delete_endpoint_list_item_request, 'path'),
    getLooseObjectFromProperty(delete_endpoint_list_item_request, 'query'),
  ]),
  outputSchema: delete_endpoint_list_item_response,
};
const READENDPOINTLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadEndpointListItem',
  summary: `Get an Elastic Endpoint rule exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an Elastic Endpoint exception list item, specified by the \`id\` or \`item_id\` field.`,
  methods: ['GET'],
  patterns: ['/api/endpoint_list/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'item_id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_endpoint_list_item_request, 'body'),
    getLooseObjectFromProperty(read_endpoint_list_item_request, 'path'),
    getLooseObjectFromProperty(read_endpoint_list_item_request, 'query'),
  ]),
  outputSchema: read_endpoint_list_item_response,
};
const CREATEENDPOINTLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateEndpointListItem',
  summary: `Create an Elastic Endpoint rule exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create an Elastic Endpoint exception list item, and associate it with the Elastic Endpoint exception list.`,
  methods: ['POST'],
  patterns: ['/api/endpoint_list/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(create_endpoint_list_item_request, 'body'),
    getLooseObjectFromProperty(create_endpoint_list_item_request, 'path'),
    getLooseObjectFromProperty(create_endpoint_list_item_request, 'query'),
  ]),
  outputSchema: create_endpoint_list_item_response,
};
const UPDATEENDPOINTLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateEndpointListItem',
  summary: `Update an Elastic Endpoint rule exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an Elastic Endpoint exception list item, specified by the \`id\` or \`item_id\` field.`,
  methods: ['PUT'],
  patterns: ['/api/endpoint_list/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(update_endpoint_list_item_request, 'body'),
    getLooseObjectFromProperty(update_endpoint_list_item_request, 'path'),
    getLooseObjectFromProperty(update_endpoint_list_item_request, 'query'),
  ]),
  outputSchema: update_endpoint_list_item_response,
};
const FINDENDPOINTLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindEndpointListItems',
  summary: `Get Elastic Endpoint exception list items`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all Elastic Endpoint exception list items.`,
  methods: ['GET'],
  patterns: ['/api/endpoint_list/items/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['filter', 'page', 'per_page', 'sort_field', 'sort_order'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(find_endpoint_list_items_request, 'body'),
    getLooseObjectFromProperty(find_endpoint_list_items_request, 'path'),
    getLooseObjectFromProperty(find_endpoint_list_items_request, 'query'),
  ]),
  outputSchema: find_endpoint_list_items_response,
};
const ENDPOINTGETACTIONSLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetActionsList',
  summary: `Get response actions`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all response actions.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/action'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(endpoint_get_actions_list_request, 'body'),
    getLooseObjectFromProperty(endpoint_get_actions_list_request, 'path'),
    getLooseObjectFromProperty(endpoint_get_actions_list_request, 'query'),
  ]),
  outputSchema: endpoint_get_actions_list_response,
};
const ENDPOINTGETACTIONSSTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetActionsStatus',
  summary: `Get response actions status`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the status of response actions for the specified agent IDs.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/action_status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['query'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(endpoint_get_actions_status_request, 'body'),
    getLooseObjectFromProperty(endpoint_get_actions_status_request, 'path'),
    getLooseObjectFromProperty(endpoint_get_actions_status_request, 'query'),
  ]),
  outputSchema: endpoint_get_actions_status_response,
};
const ENDPOINTGETACTIONSDETAILS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetActionsDetails',
  summary: `Get action details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/{action_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a response action using the action ID.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/action/{action_id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['action_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(endpoint_get_actions_details_request, 'body'),
    getLooseObjectFromProperty(endpoint_get_actions_details_request, 'path'),
    getLooseObjectFromProperty(endpoint_get_actions_details_request, 'query'),
  ]),
  outputSchema: endpoint_get_actions_details_response,
};
const ENDPOINTFILEINFO_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointFileInfo',
  summary: `Get file information`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/{action_id}/file/{file_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get information for the specified response action file download.
`,
  methods: ['GET'],
  patterns: ['/api/endpoint/action/{action_id}/file/{file_id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['action_id', 'file_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(endpoint_file_info_request, 'body'),
    getLooseObjectFromProperty(endpoint_file_info_request, 'path'),
    getLooseObjectFromProperty(endpoint_file_info_request, 'query'),
  ]),
  outputSchema: endpoint_file_info_response,
};
const ENDPOINTFILEDOWNLOAD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointFileDownload',
  summary: `Download a file`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/{action_id}/file/{file_id}/download</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Download a file associated with a response action.
`,
  methods: ['GET'],
  patterns: ['/api/endpoint/action/{action_id}/file/{file_id}/download'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['action_id', 'file_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(endpoint_file_download_request, 'body'),
    getLooseObjectFromProperty(endpoint_file_download_request, 'path'),
    getLooseObjectFromProperty(endpoint_file_download_request, 'query'),
  ]),
  outputSchema: endpoint_file_download_response,
};
const CANCELACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CancelAction',
  summary: `Cancel a response action`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/cancel</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Cancel a running or pending response action (Applies only to some agent types).`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/cancel'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(cancel_action_request, 'body'),
    getLooseObjectFromProperty(cancel_action_request, 'path'),
    getLooseObjectFromProperty(cancel_action_request, 'query'),
  ]),
  outputSchema: cancel_action_response,
};
const ENDPOINTEXECUTEACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointExecuteAction',
  summary: `Run a command`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/execute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Run a shell command on an endpoint.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/execute'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(endpoint_execute_action_request, 'body'),
    getLooseObjectFromProperty(endpoint_execute_action_request, 'path'),
    getLooseObjectFromProperty(endpoint_execute_action_request, 'query'),
  ]),
  outputSchema: endpoint_execute_action_response,
};
const ENDPOINTGETFILEACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetFileAction',
  summary: `Get a file`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/get_file</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a file from an endpoint.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/get_file'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(endpoint_get_file_action_request, 'body'),
    getLooseObjectFromProperty(endpoint_get_file_action_request, 'path'),
    getLooseObjectFromProperty(endpoint_get_file_action_request, 'query'),
  ]),
  outputSchema: endpoint_get_file_action_response,
};
const ENDPOINTISOLATEACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointIsolateAction',
  summary: `Isolate an endpoint`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/isolate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Isolate an endpoint from the network. The endpoint remains isolated until it's released.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/isolate'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(endpoint_isolate_action_request, 'body'),
    getLooseObjectFromProperty(endpoint_isolate_action_request, 'path'),
    getLooseObjectFromProperty(endpoint_isolate_action_request, 'query'),
  ]),
  outputSchema: endpoint_isolate_action_response,
};
const ENDPOINTKILLPROCESSACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointKillProcessAction',
  summary: `Terminate a process`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/kill_process</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Terminate a running process on an endpoint.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/kill_process'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(endpoint_kill_process_action_request, 'body'),
    getLooseObjectFromProperty(endpoint_kill_process_action_request, 'path'),
    getLooseObjectFromProperty(endpoint_kill_process_action_request, 'query'),
  ]),
  outputSchema: endpoint_kill_process_action_response,
};
const ENDPOINTGETPROCESSESACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetProcessesAction',
  summary: `Get running processes`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/running_procs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all processes running on an endpoint.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/running_procs'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(endpoint_get_processes_action_request, 'body'),
    getLooseObjectFromProperty(endpoint_get_processes_action_request, 'path'),
    getLooseObjectFromProperty(endpoint_get_processes_action_request, 'query'),
  ]),
  outputSchema: endpoint_get_processes_action_response,
};
const RUNSCRIPTACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.RunScriptAction',
  summary: `Run a script`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/runscript</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Run a script on a host. Currently supported only for some agent types.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/runscript'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(run_script_action_request, 'body'),
    getLooseObjectFromProperty(run_script_action_request, 'path'),
    getLooseObjectFromProperty(run_script_action_request, 'query'),
  ]),
  outputSchema: run_script_action_response,
};
const ENDPOINTSCANACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointScanAction',
  summary: `Scan a file or directory`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/scan</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Scan a specific file or directory on an endpoint for malware.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/scan'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(endpoint_scan_action_request, 'body'),
    getLooseObjectFromProperty(endpoint_scan_action_request, 'path'),
    getLooseObjectFromProperty(endpoint_scan_action_request, 'query'),
  ]),
  outputSchema: endpoint_scan_action_response,
};
const ENDPOINTGETACTIONSSTATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetActionsState',
  summary: `Get actions state`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/state</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a response actions state, which reports whether encryption is enabled.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/action/state'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(endpoint_get_actions_state_request, 'body'),
    getLooseObjectFromProperty(endpoint_get_actions_state_request, 'path'),
    getLooseObjectFromProperty(endpoint_get_actions_state_request, 'query'),
  ]),
  outputSchema: endpoint_get_actions_state_response,
};
const ENDPOINTSUSPENDPROCESSACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointSuspendProcessAction',
  summary: `Suspend a process`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/suspend_process</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Suspend a running process on an endpoint.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/suspend_process'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(endpoint_suspend_process_action_request, 'body'),
    getLooseObjectFromProperty(endpoint_suspend_process_action_request, 'path'),
    getLooseObjectFromProperty(endpoint_suspend_process_action_request, 'query'),
  ]),
  outputSchema: endpoint_suspend_process_action_response,
};
const ENDPOINTUNISOLATEACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointUnisolateAction',
  summary: `Release an isolated endpoint`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/unisolate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Release an isolated endpoint, allowing it to rejoin a network.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/unisolate'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(endpoint_unisolate_action_request, 'body'),
    getLooseObjectFromProperty(endpoint_unisolate_action_request, 'path'),
    getLooseObjectFromProperty(endpoint_unisolate_action_request, 'query'),
  ]),
  outputSchema: endpoint_unisolate_action_response,
};
const ENDPOINTUPLOADACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointUploadAction',
  summary: `Upload a file`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/upload</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upload a file to an endpoint.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/upload'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(endpoint_upload_action_request, 'body'),
    getLooseObjectFromProperty(endpoint_upload_action_request, 'path'),
    getLooseObjectFromProperty(endpoint_upload_action_request, 'query'),
  ]),
  outputSchema: endpoint_upload_action_response,
};
const GETENDPOINTMETADATALIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetEndpointMetadataList',
  summary: `Get a metadata list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/metadata</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/metadata'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'pageSize', 'kuery', 'hostStatuses', 'sortField', 'sortDirection'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_endpoint_metadata_list_request, 'body'),
    getLooseObjectFromProperty(get_endpoint_metadata_list_request, 'path'),
    getLooseObjectFromProperty(get_endpoint_metadata_list_request, 'query'),
  ]),
  outputSchema: get_endpoint_metadata_list_response,
};
const GETENDPOINTMETADATA_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetEndpointMetadata',
  summary: `Get metadata`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/metadata/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/metadata/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_endpoint_metadata_request, 'body'),
    getLooseObjectFromProperty(get_endpoint_metadata_request, 'path'),
    getLooseObjectFromProperty(get_endpoint_metadata_request, 'query'),
  ]),
  outputSchema: get_endpoint_metadata_response,
};
const GETPOLICYRESPONSE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetPolicyResponse',
  summary: `Get a policy response`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/policy_response</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/policy_response'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['query'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_policy_response_request, 'body'),
    getLooseObjectFromProperty(get_policy_response_request, 'path'),
    getLooseObjectFromProperty(get_policy_response_request, 'query'),
  ]),
  outputSchema: get_policy_response_response,
};
const GETPROTECTIONUPDATESNOTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetProtectionUpdatesNote',
  summary: `Get a protection updates note`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/protection_updates_note/{package_policy_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/protection_updates_note/{package_policy_id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['package_policy_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_protection_updates_note_request, 'body'),
    getLooseObjectFromProperty(get_protection_updates_note_request, 'path'),
    getLooseObjectFromProperty(get_protection_updates_note_request, 'query'),
  ]),
  outputSchema: get_protection_updates_note_response,
};
const CREATEUPDATEPROTECTIONUPDATESNOTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateUpdateProtectionUpdatesNote',
  summary: `Create or update a protection updates note`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/protection_updates_note/{package_policy_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/protection_updates_note/{package_policy_id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['package_policy_id'],
    urlParams: [],
    bodyParams: ['note'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_update_protection_updates_note_request, 'body'),
    getLooseObjectFromProperty(create_update_protection_updates_note_request, 'path'),
    getLooseObjectFromProperty(create_update_protection_updates_note_request, 'query'),
  ]),
  outputSchema: create_update_protection_updates_note_response,
};
const DELETEMONITORINGENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteMonitoringEngine',
  summary: `Delete the Privilege Monitoring Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/engine/delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/entity_analytics/monitoring/engine/delete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['data'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_monitoring_engine_request, 'body'),
    getLooseObjectFromProperty(delete_monitoring_engine_request, 'path'),
    getLooseObjectFromProperty(delete_monitoring_engine_request, 'query'),
  ]),
  outputSchema: delete_monitoring_engine_response,
};
const DISABLEMONITORINGENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DisableMonitoringEngine',
  summary: `Disable the Privilege Monitoring Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/engine/disable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_analytics/monitoring/engine/disable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(disable_monitoring_engine_request, 'body'),
    getLooseObjectFromProperty(disable_monitoring_engine_request, 'path'),
    getLooseObjectFromProperty(disable_monitoring_engine_request, 'query'),
  ]),
  outputSchema: disable_monitoring_engine_response,
};
const INITMONITORINGENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InitMonitoringEngine',
  summary: `Initialize the Privilege Monitoring Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/engine/init</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_analytics/monitoring/engine/init'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(init_monitoring_engine_request, 'body'),
    getLooseObjectFromProperty(init_monitoring_engine_request, 'path'),
    getLooseObjectFromProperty(init_monitoring_engine_request, 'query'),
  ]),
  outputSchema: init_monitoring_engine_response,
};
const SCHEDULEMONITORINGENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ScheduleMonitoringEngine',
  summary: `Schedule the Privilege Monitoring Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/engine/schedule_now</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_analytics/monitoring/engine/schedule_now'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(schedule_monitoring_engine_request, 'body'),
    getLooseObjectFromProperty(schedule_monitoring_engine_request, 'path'),
    getLooseObjectFromProperty(schedule_monitoring_engine_request, 'query'),
  ]),
  outputSchema: schedule_monitoring_engine_response,
};
const PRIVMONHEALTH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PrivMonHealth',
  summary: `Health check on Privilege Monitoring`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/privileges/health</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/entity_analytics/monitoring/privileges/health'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(priv_mon_health_request, 'body'),
    getLooseObjectFromProperty(priv_mon_health_request, 'path'),
    getLooseObjectFromProperty(priv_mon_health_request, 'query'),
  ]),
  outputSchema: priv_mon_health_response,
};
const PRIVMONPRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PrivMonPrivileges',
  summary: `Run a privileges check on Privilege Monitoring`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/privileges/privileges</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Check if the current user has all required permissions for Privilege Monitoring`,
  methods: ['GET'],
  patterns: ['/api/entity_analytics/monitoring/privileges/privileges'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(priv_mon_privileges_request, 'body'),
    getLooseObjectFromProperty(priv_mon_privileges_request, 'path'),
    getLooseObjectFromProperty(priv_mon_privileges_request, 'query'),
  ]),
  outputSchema: priv_mon_privileges_response,
};
const CREATEPRIVMONUSER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreatePrivMonUser',
  summary: `Create a new monitored user`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_analytics/monitoring/users'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_priv_mon_user_request, 'body'),
    getLooseObjectFromProperty(create_priv_mon_user_request, 'path'),
    getLooseObjectFromProperty(create_priv_mon_user_request, 'query'),
  ]),
  outputSchema: create_priv_mon_user_response,
};
const PRIVMONBULKUPLOADUSERSCSV_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PrivmonBulkUploadUsersCSV',
  summary: `Upsert multiple monitored users via CSV upload`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users/_csv</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_analytics/monitoring/users/_csv'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(privmon_bulk_upload_users_c_s_v_request, 'body'),
    getLooseObjectFromProperty(privmon_bulk_upload_users_c_s_v_request, 'path'),
    getLooseObjectFromProperty(privmon_bulk_upload_users_c_s_v_request, 'query'),
  ]),
  outputSchema: privmon_bulk_upload_users_c_s_v_response,
};
const DELETEPRIVMONUSER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeletePrivMonUser',
  summary: `Delete a monitored user`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/entity_analytics/monitoring/users/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_priv_mon_user_request, 'body'),
    getLooseObjectFromProperty(delete_priv_mon_user_request, 'path'),
    getLooseObjectFromProperty(delete_priv_mon_user_request, 'query'),
  ]),
  outputSchema: delete_priv_mon_user_response,
};
const UPDATEPRIVMONUSER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdatePrivMonUser',
  summary: `Update a monitored user`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['PUT'],
  patterns: ['/api/entity_analytics/monitoring/users/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_priv_mon_user_request, 'body'),
    getLooseObjectFromProperty(update_priv_mon_user_request, 'path'),
    getLooseObjectFromProperty(update_priv_mon_user_request, 'query'),
  ]),
  outputSchema: update_priv_mon_user_response,
};
const LISTPRIVMONUSERS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ListPrivMonUsers',
  summary: `List all monitored users`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users/list</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/entity_analytics/monitoring/users/list'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['kql'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(list_priv_mon_users_request, 'body'),
    getLooseObjectFromProperty(list_priv_mon_users_request, 'path'),
    getLooseObjectFromProperty(list_priv_mon_users_request, 'query'),
  ]),
  outputSchema: list_priv_mon_users_response,
};
const INSTALLPRIVILEGEDACCESSDETECTIONPACKAGE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InstallPrivilegedAccessDetectionPackage',
  summary: `Installs the privileged access detection package for the Entity Analytics privileged user monitoring experience`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/privileged_user_monitoring/pad/install</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_analytics/privileged_user_monitoring/pad/install'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(install_privileged_access_detection_package_request, 'body'),
    getLooseObjectFromProperty(install_privileged_access_detection_package_request, 'path'),
    getLooseObjectFromProperty(install_privileged_access_detection_package_request, 'query'),
  ]),
  outputSchema: install_privileged_access_detection_package_response,
};
const GETPRIVILEGEDACCESSDETECTIONPACKAGESTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetPrivilegedAccessDetectionPackageStatus',
  summary: `Gets the status of the privileged access detection package for the Entity Analytics privileged user monitoring experience`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/privileged_user_monitoring/pad/status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/entity_analytics/privileged_user_monitoring/pad/status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_privileged_access_detection_package_status_request, 'body'),
    getLooseObjectFromProperty(get_privileged_access_detection_package_status_request, 'path'),
    getLooseObjectFromProperty(get_privileged_access_detection_package_status_request, 'query'),
  ]),
  outputSchema: get_privileged_access_detection_package_status_response,
};
const INITENTITYSTORE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InitEntityStore',
  summary: `Initialize the Entity Store`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/enable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_store/enable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(init_entity_store_request, 'body'),
    getLooseObjectFromProperty(init_entity_store_request, 'path'),
    getLooseObjectFromProperty(init_entity_store_request, 'query'),
  ]),
  outputSchema: init_entity_store_response,
};
const DELETEENTITYENGINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteEntityEngines',
  summary: `Delete Entity Engines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/entity_store/engines'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['entityTypes', 'delete_data'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_entity_engines_request, 'body'),
    getLooseObjectFromProperty(delete_entity_engines_request, 'path'),
    getLooseObjectFromProperty(delete_entity_engines_request, 'query'),
  ]),
  outputSchema: delete_entity_engines_response,
};
const LISTENTITYENGINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ListEntityEngines',
  summary: `List the Entity Engines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/entity_store/engines'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(list_entity_engines_request, 'body'),
    getLooseObjectFromProperty(list_entity_engines_request, 'path'),
    getLooseObjectFromProperty(list_entity_engines_request, 'query'),
  ]),
  outputSchema: list_entity_engines_response,
};
const DELETEENTITYENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteEntityEngine',
  summary: `Delete the Entity Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/{entityType}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/entity_store/engines/{entityType}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['entityType'],
    urlParams: ['delete_data', 'data'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_entity_engine_request, 'body'),
    getLooseObjectFromProperty(delete_entity_engine_request, 'path'),
    getLooseObjectFromProperty(delete_entity_engine_request, 'query'),
  ]),
  outputSchema: delete_entity_engine_response,
};
const GETENTITYENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetEntityEngine',
  summary: `Get an Entity Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/{entityType}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/entity_store/engines/{entityType}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['entityType'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_entity_engine_request, 'body'),
    getLooseObjectFromProperty(get_entity_engine_request, 'path'),
    getLooseObjectFromProperty(get_entity_engine_request, 'query'),
  ]),
  outputSchema: get_entity_engine_response,
};
const INITENTITYENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InitEntityEngine',
  summary: `Initialize an Entity Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/{entityType}/init</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_store/engines/{entityType}/init'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(init_entity_engine_request, 'body'),
    getLooseObjectFromProperty(init_entity_engine_request, 'path'),
    getLooseObjectFromProperty(init_entity_engine_request, 'query'),
  ]),
  outputSchema: init_entity_engine_response,
};
const STARTENTITYENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.StartEntityEngine',
  summary: `Start an Entity Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/{entityType}/start</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_store/engines/{entityType}/start'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['entityType'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(start_entity_engine_request, 'body'),
    getLooseObjectFromProperty(start_entity_engine_request, 'path'),
    getLooseObjectFromProperty(start_entity_engine_request, 'query'),
  ]),
  outputSchema: start_entity_engine_response,
};
const STOPENTITYENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.StopEntityEngine',
  summary: `Stop an Entity Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/{entityType}/stop</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_store/engines/{entityType}/stop'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['entityType'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(stop_entity_engine_request, 'body'),
    getLooseObjectFromProperty(stop_entity_engine_request, 'path'),
    getLooseObjectFromProperty(stop_entity_engine_request, 'query'),
  ]),
  outputSchema: stop_entity_engine_response,
};
const APPLYENTITYENGINEDATAVIEWINDICES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ApplyEntityEngineDataviewIndices',
  summary: `Apply DataView indices to all installed engines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/apply_dataview_indices</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_store/engines/apply_dataview_indices'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(apply_entity_engine_dataview_indices_request, 'body'),
    getLooseObjectFromProperty(apply_entity_engine_dataview_indices_request, 'path'),
    getLooseObjectFromProperty(apply_entity_engine_dataview_indices_request, 'query'),
  ]),
  outputSchema: apply_entity_engine_dataview_indices_response,
};
const DELETESINGLEENTITY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteSingleEntity',
  summary: `Delete an entity in Entity Store`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/entities/{entityType}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a single entity in Entity Store.
The entity will be immediately deleted from the latest index.  It will remain available in historical snapshots if it has been snapshotted.  The delete operation does not prevent the entity from being recreated if it is observed again in the future. 
`,
  methods: ['DELETE'],
  patterns: ['/api/entity_store/entities/{entityType}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['entityType'],
    urlParams: [],
    bodyParams: ['id'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_single_entity_request, 'body'),
    getLooseObjectFromProperty(delete_single_entity_request, 'path'),
    getLooseObjectFromProperty(delete_single_entity_request, 'query'),
  ]),
  outputSchema: delete_single_entity_response,
};
const UPSERTENTITY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpsertEntity',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['entityType'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(upsert_entity_request, 'body'),
    getLooseObjectFromProperty(upsert_entity_request, 'path'),
    getLooseObjectFromProperty(upsert_entity_request, 'query'),
  ]),
  outputSchema: upsert_entity_response,
};
const UPSERTENTITIESBULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpsertEntitiesBulk',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(upsert_entities_bulk_request, 'body'),
    getLooseObjectFromProperty(upsert_entities_bulk_request, 'path'),
    getLooseObjectFromProperty(upsert_entities_bulk_request, 'query'),
  ]),
  outputSchema: upsert_entities_bulk_response,
};
const LISTENTITIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ListEntities',
  summary: `List Entity Store Entities`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/entities/list</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List entities records, paging, sorting and filtering as needed.`,
  methods: ['GET'],
  patterns: ['/api/entity_store/entities/list'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['sort_field', 'sort_order', 'page', 'per_page', 'filterQuery', 'entity_types'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(list_entities_request, 'body'),
    getLooseObjectFromProperty(list_entities_request, 'path'),
    getLooseObjectFromProperty(list_entities_request, 'query'),
  ]),
  outputSchema: list_entities_response,
};
const GETENTITYSTORESTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetEntityStoreStatus',
  summary: `Get the status of the Entity Store`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/entity_store/status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['include_components'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_entity_store_status_request, 'body'),
    getLooseObjectFromProperty(get_entity_store_status_request, 'path'),
    getLooseObjectFromProperty(get_entity_store_status_request, 'query'),
  ]),
  outputSchema: get_entity_store_status_response,
};
const DELETEEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteExceptionList',
  summary: `Delete an exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an exception list using the \`id\` or \`list_id\` field.`,
  methods: ['DELETE'],
  patterns: ['/api/exception_lists'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'list_id', 'namespace_type'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_exception_list_request, 'body'),
    getLooseObjectFromProperty(delete_exception_list_request, 'path'),
    getLooseObjectFromProperty(delete_exception_list_request, 'query'),
  ]),
  outputSchema: delete_exception_list_response,
};
const READEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadExceptionList',
  summary: `Get exception list details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an exception list using the \`id\` or \`list_id\` field.`,
  methods: ['GET'],
  patterns: ['/api/exception_lists'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'list_id', 'namespace_type'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_exception_list_request, 'body'),
    getLooseObjectFromProperty(read_exception_list_request, 'path'),
    getLooseObjectFromProperty(read_exception_list_request, 'query'),
  ]),
  outputSchema: read_exception_list_response,
};
const CREATEEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateExceptionList',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(create_exception_list_request, 'body'),
    getLooseObjectFromProperty(create_exception_list_request, 'path'),
    getLooseObjectFromProperty(create_exception_list_request, 'query'),
  ]),
  outputSchema: create_exception_list_response,
};
const UPDATEEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateExceptionList',
  summary: `Update an exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an exception list using the \`id\` or \`list_id\` field.`,
  methods: ['PUT'],
  patterns: ['/api/exception_lists'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(update_exception_list_request, 'body'),
    getLooseObjectFromProperty(update_exception_list_request, 'path'),
    getLooseObjectFromProperty(update_exception_list_request, 'query'),
  ]),
  outputSchema: update_exception_list_response,
};
const DUPLICATEEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DuplicateExceptionList',
  summary: `Duplicate an exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/_duplicate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Duplicate an existing exception list.`,
  methods: ['POST'],
  patterns: ['/api/exception_lists/_duplicate'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['list_id', 'namespace_type', 'include_expired_exceptions'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(duplicate_exception_list_request, 'body'),
    getLooseObjectFromProperty(duplicate_exception_list_request, 'path'),
    getLooseObjectFromProperty(duplicate_exception_list_request, 'query'),
  ]),
  outputSchema: duplicate_exception_list_response,
};
const EXPORTEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ExportExceptionList',
  summary: `Export an exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/_export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Export an exception list and its associated items to an NDJSON file.`,
  methods: ['POST'],
  patterns: ['/api/exception_lists/_export'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'list_id', 'namespace_type', 'include_expired_exceptions'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(export_exception_list_request, 'body'),
    getLooseObjectFromProperty(export_exception_list_request, 'path'),
    getLooseObjectFromProperty(export_exception_list_request, 'query'),
  ]),
  outputSchema: export_exception_list_response,
};
const FINDEXCEPTIONLISTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindExceptionLists',
  summary: `Get exception lists`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all exception list containers.`,
  methods: ['GET'],
  patterns: ['/api/exception_lists/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['filter', 'namespace_type', 'page', 'per_page', 'sort_field', 'sort_order'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(find_exception_lists_request, 'body'),
    getLooseObjectFromProperty(find_exception_lists_request, 'path'),
    getLooseObjectFromProperty(find_exception_lists_request, 'query'),
  ]),
  outputSchema: find_exception_lists_response,
};
const IMPORTEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ImportExceptionList',
  summary: `Import an exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/_import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Import an exception list and its associated items from an NDJSON file.`,
  methods: ['POST'],
  patterns: ['/api/exception_lists/_import'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['overwrite', 'as_new_list'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(import_exception_list_request, 'body'),
    getLooseObjectFromProperty(import_exception_list_request, 'path'),
    getLooseObjectFromProperty(import_exception_list_request, 'query'),
  ]),
  outputSchema: import_exception_list_response,
};
const DELETEEXCEPTIONLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteExceptionListItem',
  summary: `Delete an exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an exception list item using the \`id\` or \`item_id\` field.`,
  methods: ['DELETE'],
  patterns: ['/api/exception_lists/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'item_id', 'namespace_type'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_exception_list_item_request, 'body'),
    getLooseObjectFromProperty(delete_exception_list_item_request, 'path'),
    getLooseObjectFromProperty(delete_exception_list_item_request, 'query'),
  ]),
  outputSchema: delete_exception_list_item_response,
};
const READEXCEPTIONLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadExceptionListItem',
  summary: `Get an exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an exception list item using the \`id\` or \`item_id\` field.`,
  methods: ['GET'],
  patterns: ['/api/exception_lists/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'item_id', 'namespace_type'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_exception_list_item_request, 'body'),
    getLooseObjectFromProperty(read_exception_list_item_request, 'path'),
    getLooseObjectFromProperty(read_exception_list_item_request, 'query'),
  ]),
  outputSchema: read_exception_list_item_response,
};
const CREATEEXCEPTIONLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateExceptionListItem',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(create_exception_list_item_request, 'body'),
    getLooseObjectFromProperty(create_exception_list_item_request, 'path'),
    getLooseObjectFromProperty(create_exception_list_item_request, 'query'),
  ]),
  outputSchema: create_exception_list_item_response,
};
const UPDATEEXCEPTIONLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateExceptionListItem',
  summary: `Update an exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an exception list item using the \`id\` or \`item_id\` field.`,
  methods: ['PUT'],
  patterns: ['/api/exception_lists/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(update_exception_list_item_request, 'body'),
    getLooseObjectFromProperty(update_exception_list_item_request, 'path'),
    getLooseObjectFromProperty(update_exception_list_item_request, 'query'),
  ]),
  outputSchema: update_exception_list_item_response,
};
const FINDEXCEPTIONLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindExceptionListItems',
  summary: `Get exception list items`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/items/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all exception list items in the specified list.`,
  methods: ['GET'],
  patterns: ['/api/exception_lists/items/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(find_exception_list_items_request, 'body'),
    getLooseObjectFromProperty(find_exception_list_items_request, 'path'),
    getLooseObjectFromProperty(find_exception_list_items_request, 'query'),
  ]),
  outputSchema: find_exception_list_items_response,
};
const READEXCEPTIONLISTSUMMARY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadExceptionListSummary',
  summary: `Get an exception list summary`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/summary</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a summary of the specified exception list.`,
  methods: ['GET'],
  patterns: ['/api/exception_lists/summary'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'list_id', 'namespace_type', 'filter'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_exception_list_summary_request, 'body'),
    getLooseObjectFromProperty(read_exception_list_summary_request, 'path'),
    getLooseObjectFromProperty(read_exception_list_summary_request, 'query'),
  ]),
  outputSchema: read_exception_list_summary_response,
};
const CREATESHAREDEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateSharedExceptionList',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['description', 'name'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_shared_exception_list_request, 'body'),
    getLooseObjectFromProperty(create_shared_exception_list_request, 'path'),
    getLooseObjectFromProperty(create_shared_exception_list_request, 'query'),
  ]),
  outputSchema: create_shared_exception_list_response,
};
const GET_FEATURES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_features',
  summary: `Get features`,
  description: `Get information about all Kibana features. Features are used by spaces and security to refine and secure access to Kibana.
`,
  methods: ['GET'],
  patterns: ['/api/features'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_features_request, 'body'),
    getLooseObjectFromProperty(get_features_request, 'path'),
    getLooseObjectFromProperty(get_features_request, 'query'),
  ]),
  outputSchema: get_features_response,
};
const GET_FLEET_AGENT_DOWNLOAD_SOURCES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_download_sources',
  summary: `Get agent binary download sources`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_download_sources</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_download_sources'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_agent_download_sources_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agent_download_sources_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agent_download_sources_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_download_sources_response,
};
const POST_FLEET_AGENT_DOWNLOAD_SOURCES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_download_sources',
  summary: `Create an agent binary download source`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_download_sources</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agent_download_sources'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['host', 'id', 'is_default', 'name', 'proxy_id', 'secrets', 'ssl'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agent_download_sources_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agent_download_sources_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agent_download_sources_request, 'query'),
  ]),
  outputSchema: post_fleet_agent_download_sources_response,
};
const DELETE_FLEET_AGENT_DOWNLOAD_SOURCES_SOURCEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_agent_download_sources_sourceid',
  summary: `Delete an agent binary download source`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_download_sources/{sourceId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an agent binary download source by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/agent_download_sources/{sourceId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['sourceId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_fleet_agent_download_sources_sourceid_request, 'body'),
    getLooseObjectFromProperty(delete_fleet_agent_download_sources_sourceid_request, 'path'),
    getLooseObjectFromProperty(delete_fleet_agent_download_sources_sourceid_request, 'query'),
  ]),
  outputSchema: delete_fleet_agent_download_sources_sourceid_response,
};
const GET_FLEET_AGENT_DOWNLOAD_SOURCES_SOURCEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_download_sources_sourceid',
  summary: `Get an agent binary download source`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_download_sources/{sourceId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get an agent binary download source by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_download_sources/{sourceId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['sourceId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_agent_download_sources_sourceid_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agent_download_sources_sourceid_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agent_download_sources_sourceid_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_download_sources_sourceid_response,
};
const PUT_FLEET_AGENT_DOWNLOAD_SOURCES_SOURCEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_agent_download_sources_sourceid',
  summary: `Update an agent binary download source`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_download_sources/{sourceId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an agent binary download source by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/agent_download_sources/{sourceId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['sourceId'],
    urlParams: [],
    bodyParams: ['host', 'id', 'is_default', 'name', 'proxy_id', 'secrets', 'ssl'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_fleet_agent_download_sources_sourceid_request, 'body'),
    getLooseObjectFromProperty(put_fleet_agent_download_sources_sourceid_request, 'path'),
    getLooseObjectFromProperty(put_fleet_agent_download_sources_sourceid_request, 'query'),
  ]),
  outputSchema: put_fleet_agent_download_sources_sourceid_response,
};
const GET_FLEET_AGENT_POLICIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_policies',
  summary: `Get agent policies`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-agents-read OR fleet-setup.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_policies'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(get_fleet_agent_policies_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agent_policies_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agent_policies_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_policies_response,
};
const POST_FLEET_AGENT_POLICIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies',
  summary: `Create an agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agent_policies'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(post_fleet_agent_policies_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agent_policies_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agent_policies_request, 'query'),
  ]),
  outputSchema: post_fleet_agent_policies_response,
};
const POST_FLEET_AGENT_POLICIES_BULK_GET_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies_bulk_get',
  summary: `Bulk get agent policies`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/_bulk_get</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-agents-read OR fleet-setup.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agent_policies/_bulk_get'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['format'],
    bodyParams: ['full', 'ids', 'ignoreMissing'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agent_policies_bulk_get_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agent_policies_bulk_get_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agent_policies_bulk_get_request, 'query'),
  ]),
  outputSchema: post_fleet_agent_policies_bulk_get_response,
};
const GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_policies_agentpolicyid',
  summary: `Get an agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get an agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-agents-read OR fleet-setup.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentPolicyId'],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_policies_agentpolicyid_response,
};
const PUT_FLEET_AGENT_POLICIES_AGENTPOLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_agent_policies_agentpolicyid',
  summary: `Update an agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(put_fleet_agent_policies_agentpolicyid_request, 'body'),
    getLooseObjectFromProperty(put_fleet_agent_policies_agentpolicyid_request, 'path'),
    getLooseObjectFromProperty(put_fleet_agent_policies_agentpolicyid_request, 'query'),
  ]),
  outputSchema: put_fleet_agent_policies_agentpolicyid_response,
};
const GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_AUTO_UPGRADE_AGENTS_STATUS_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status',
    summary: `Get auto upgrade agent status`,
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}/auto_upgrade_agents_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get auto upgrade agent status<br/><br/>[Required authorization] Route required privileges: fleet-agents-read.`,
    methods: ['GET'],
    patterns: ['/api/fleet/agent_policies/{agentPolicyId}/auto_upgrade_agents_status'],
    isInternal: true,
    documentation: 'URL_NOT_IMPLEMENTED',
    parameterTypes: {
      pathParams: ['agentPolicyId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.union([
      getLooseObjectFromProperty(
        get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status_request,
        'body'
      ),
      getLooseObjectFromProperty(
        get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status_request,
        'path'
      ),
      getLooseObjectFromProperty(
        get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status_request,
        'query'
      ),
    ]),
    outputSchema: get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status_response,
  };
const POST_FLEET_AGENT_POLICIES_AGENTPOLICYID_COPY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies_agentpolicyid_copy',
  summary: `Copy an agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}/copy</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Copy an agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}/copy'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentPolicyId'],
    urlParams: ['format'],
    bodyParams: ['description', 'name'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agent_policies_agentpolicyid_copy_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agent_policies_agentpolicyid_copy_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agent_policies_agentpolicyid_copy_request, 'query'),
  ]),
  outputSchema: post_fleet_agent_policies_agentpolicyid_copy_response,
};
const GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_DOWNLOAD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_policies_agentpolicyid_download',
  summary: `Download an agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}/download</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Download an agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-setup.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}/download'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentPolicyId'],
    urlParams: ['download', 'standalone', 'kubernetes'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_download_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_download_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_download_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_policies_agentpolicyid_download_response,
};
const GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_FULL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_policies_agentpolicyid_full',
  summary: `Get a full agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}/full</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a full agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}/full'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentPolicyId'],
    urlParams: ['download', 'standalone', 'kubernetes'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_full_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_full_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_full_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_policies_agentpolicyid_full_response,
};
const GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_OUTPUTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_policies_agentpolicyid_outputs',
  summary: `Get outputs for an agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}/outputs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of outputs associated with agent policy by policy id.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read AND fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}/outputs'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentPolicyId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_outputs_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_outputs_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agent_policies_agentpolicyid_outputs_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_policies_agentpolicyid_outputs_response,
};
const POST_FLEET_AGENT_POLICIES_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies_delete',
  summary: `Delete an agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agent_policies/delete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['agentPolicyId', 'force'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agent_policies_delete_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agent_policies_delete_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agent_policies_delete_request, 'query'),
  ]),
  outputSchema: post_fleet_agent_policies_delete_response,
};
const POST_FLEET_AGENT_POLICIES_OUTPUTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies_outputs',
  summary: `Get outputs for agent policies`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/outputs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of outputs associated with agent policies.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read AND fleet-settings-read.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agent_policies/outputs'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['ids'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agent_policies_outputs_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agent_policies_outputs_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agent_policies_outputs_request, 'query'),
  ]),
  outputSchema: post_fleet_agent_policies_outputs_response,
};
const GET_FLEET_AGENT_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_status',
  summary: `Get an agent status summary`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['policyId', 'policyIds', 'kuery'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_agent_status_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agent_status_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agent_status_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_status_response,
};
const GET_FLEET_AGENT_STATUS_DATA_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_status_data',
  summary: `Get incoming agent data`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_status/data</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agent_status/data'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['agentsIds', 'pkgName', 'pkgVersion', 'previewData'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_agent_status_data_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agent_status_data_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agent_status_data_request, 'query'),
  ]),
  outputSchema: get_fleet_agent_status_data_response,
};
const POST_FLEET_AGENTLESS_POLICIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agentless_policies',
  summary: `Create an agentless policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agentless_policies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create an agentless policy`,
  methods: ['POST'],
  patterns: ['/api/fleet/agentless_policies'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(post_fleet_agentless_policies_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agentless_policies_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agentless_policies_request, 'query'),
  ]),
  outputSchema: post_fleet_agentless_policies_response,
};
const DELETE_FLEET_AGENTLESS_POLICIES_POLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_agentless_policies_policyid',
  summary: `Delete an agentless policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agentless_policies/{policyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an agentless policy`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/agentless_policies/{policyId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['policyId'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_fleet_agentless_policies_policyid_request, 'body'),
    getLooseObjectFromProperty(delete_fleet_agentless_policies_policyid_request, 'path'),
    getLooseObjectFromProperty(delete_fleet_agentless_policies_policyid_request, 'query'),
  ]),
  outputSchema: delete_fleet_agentless_policies_policyid_response,
};
const GET_FLEET_AGENTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents',
  summary: `Get agents`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agents'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(get_fleet_agents_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agents_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agents_request, 'query'),
  ]),
  outputSchema: get_fleet_agents_response,
};
const POST_FLEET_AGENTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents',
  summary: `Get agents by action ids`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['actionIds'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agents_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agents_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agents_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_response,
};
const DELETE_FLEET_AGENTS_AGENTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_agents_agentid',
  summary: `Delete an agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an agent by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/agents/{agentId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_fleet_agents_agentid_request, 'body'),
    getLooseObjectFromProperty(delete_fleet_agents_agentid_request, 'path'),
    getLooseObjectFromProperty(delete_fleet_agents_agentid_request, 'query'),
  ]),
  outputSchema: delete_fleet_agents_agentid_response,
};
const GET_FLEET_AGENTS_AGENTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_agentid',
  summary: `Get an agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get an agent by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agents/{agentId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: ['withMetrics'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_agents_agentid_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agents_agentid_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agents_agentid_request, 'query'),
  ]),
  outputSchema: get_fleet_agents_agentid_response,
};
const PUT_FLEET_AGENTS_AGENTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_agents_agentid',
  summary: `Update an agent by ID`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an agent by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/agents/{agentId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: ['tags', 'user_provided_metadata'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_fleet_agents_agentid_request, 'body'),
    getLooseObjectFromProperty(put_fleet_agents_agentid_request, 'path'),
    getLooseObjectFromProperty(put_fleet_agents_agentid_request, 'query'),
  ]),
  outputSchema: put_fleet_agents_agentid_response,
};
const POST_FLEET_AGENTS_AGENTID_ACTIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_actions',
  summary: `Create an agent action`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/actions</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/{agentId}/actions'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: ['action'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agents_agentid_actions_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agents_agentid_actions_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agents_agentid_actions_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_agentid_actions_response,
};
const POST_FLEET_AGENTS_AGENTID_MIGRATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_migrate',
  summary: `Migrate a single agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/migrate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Migrate a single agent to another cluster.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/{agentId}/migrate'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: ['enrollment_token', 'settings', 'uri'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agents_agentid_migrate_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agents_agentid_migrate_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agents_agentid_migrate_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_agentid_migrate_response,
};
const POST_FLEET_AGENTS_AGENTID_REASSIGN_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_reassign',
  summary: `Reassign an agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/reassign</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/{agentId}/reassign'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: ['policy_id'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agents_agentid_reassign_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agents_agentid_reassign_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agents_agentid_reassign_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_agentid_reassign_response,
};
const POST_FLEET_AGENTS_AGENTID_REQUEST_DIAGNOSTICS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_request_diagnostics',
  summary: `Request agent diagnostics`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/request_diagnostics</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/{agentId}/request_diagnostics'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: ['additional_metrics'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agents_agentid_request_diagnostics_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agents_agentid_request_diagnostics_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agents_agentid_request_diagnostics_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_agentid_request_diagnostics_response,
};
const POST_FLEET_AGENTS_AGENTID_UNENROLL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_unenroll',
  summary: `Unenroll an agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/unenroll</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/{agentId}/unenroll'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: ['force', 'revoke'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agents_agentid_unenroll_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agents_agentid_unenroll_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agents_agentid_unenroll_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_agentid_unenroll_response,
};
const POST_FLEET_AGENTS_AGENTID_UPGRADE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_upgrade',
  summary: `Upgrade an agent`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/upgrade</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/{agentId}/upgrade'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: ['force', 'skipRateLimitCheck', 'source_uri', 'version'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agents_agentid_upgrade_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agents_agentid_upgrade_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agents_agentid_upgrade_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_agentid_upgrade_response,
};
const GET_FLEET_AGENTS_AGENTID_UPLOADS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_agentid_uploads',
  summary: `Get agent uploads`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/uploads</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agents/{agentId}/uploads'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_agents_agentid_uploads_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agents_agentid_uploads_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agents_agentid_uploads_request, 'query'),
  ]),
  outputSchema: get_fleet_agents_agentid_uploads_response,
};
const GET_FLEET_AGENTS_ACTION_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_action_status',
  summary: `Get an agent action status`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/action_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agents/action_status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'perPage', 'date', 'latest', 'errorSize'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_agents_action_status_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agents_action_status_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agents_action_status_request, 'query'),
  ]),
  outputSchema: get_fleet_agents_action_status_response,
};
const POST_FLEET_AGENTS_ACTIONS_ACTIONID_CANCEL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_actions_actionid_cancel',
  summary: `Cancel an agent action`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/actions/{actionId}/cancel</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/actions/{actionId}/cancel'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['actionId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agents_actions_actionid_cancel_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agents_actions_actionid_cancel_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agents_actions_actionid_cancel_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_actions_actionid_cancel_response,
};
const GET_FLEET_AGENTS_AVAILABLE_VERSIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_available_versions',
  summary: `Get available agent versions`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/available_versions</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agents/available_versions'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_agents_available_versions_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agents_available_versions_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agents_available_versions_request, 'query'),
  ]),
  outputSchema: get_fleet_agents_available_versions_response,
};
const POST_FLEET_AGENTS_BULK_MIGRATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_migrate',
  summary: `Migrate multiple agents`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_migrate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Bulk migrate agents to another cluster.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/bulk_migrate'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['agents', 'batchSize', 'enrollment_token', 'settings', 'uri'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agents_bulk_migrate_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agents_bulk_migrate_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agents_bulk_migrate_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_bulk_migrate_response,
};
const POST_FLEET_AGENTS_BULK_REASSIGN_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_reassign',
  summary: `Bulk reassign agents`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_reassign</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/bulk_reassign'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['agents', 'batchSize', 'includeInactive', 'policy_id'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agents_bulk_reassign_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agents_bulk_reassign_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agents_bulk_reassign_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_bulk_reassign_response,
};
const POST_FLEET_AGENTS_BULK_REQUEST_DIAGNOSTICS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_request_diagnostics',
  summary: `Bulk request diagnostics from agents`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_request_diagnostics</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/bulk_request_diagnostics'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['additional_metrics', 'agents', 'batchSize'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agents_bulk_request_diagnostics_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agents_bulk_request_diagnostics_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agents_bulk_request_diagnostics_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_bulk_request_diagnostics_response,
};
const POST_FLEET_AGENTS_BULK_UNENROLL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_unenroll',
  summary: `Bulk unenroll agents`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_unenroll</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/bulk_unenroll'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['agents', 'batchSize', 'force', 'includeInactive', 'revoke'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agents_bulk_unenroll_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agents_bulk_unenroll_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agents_bulk_unenroll_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_bulk_unenroll_response,
};
const POST_FLEET_AGENTS_BULK_UPDATE_AGENT_TAGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_update_agent_tags',
  summary: `Bulk update agent tags`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_update_agent_tags</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/bulk_update_agent_tags'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['agents', 'batchSize', 'includeInactive', 'tagsToAdd', 'tagsToRemove'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agents_bulk_update_agent_tags_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agents_bulk_update_agent_tags_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agents_bulk_update_agent_tags_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_bulk_update_agent_tags_response,
};
const POST_FLEET_AGENTS_BULK_UPGRADE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_upgrade',
  summary: `Bulk upgrade agents`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_upgrade</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/bulk_upgrade'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(post_fleet_agents_bulk_upgrade_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agents_bulk_upgrade_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agents_bulk_upgrade_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_bulk_upgrade_response,
};
const DELETE_FLEET_AGENTS_FILES_FILEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_agents_files_fileid',
  summary: `Delete an uploaded file`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/files/{fileId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a file uploaded by an agent.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/agents/files/{fileId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['fileId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_fleet_agents_files_fileid_request, 'body'),
    getLooseObjectFromProperty(delete_fleet_agents_files_fileid_request, 'path'),
    getLooseObjectFromProperty(delete_fleet_agents_files_fileid_request, 'query'),
  ]),
  outputSchema: delete_fleet_agents_files_fileid_response,
};
const GET_FLEET_AGENTS_FILES_FILEID_FILENAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_files_fileid_filename',
  summary: `Get an uploaded file`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/files/{fileId}/{fileName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a file uploaded by an agent.<br/><br/>[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agents/files/{fileId}/{fileName}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['fileId', 'fileName'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_agents_files_fileid_filename_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agents_files_fileid_filename_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agents_files_fileid_filename_request, 'query'),
  ]),
  outputSchema: get_fleet_agents_files_fileid_filename_response,
};
const GET_FLEET_AGENTS_SETUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_setup',
  summary: `Get agent setup info`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/setup</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read OR fleet-agent-policies-read OR fleet-settings-read OR fleet-setup.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agents/setup'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_agents_setup_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agents_setup_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agents_setup_request, 'query'),
  ]),
  outputSchema: get_fleet_agents_setup_response,
};
const POST_FLEET_AGENTS_SETUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_setup',
  summary: `Initiate agent setup`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/setup</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read OR fleet-agent-policies-read OR fleet-settings-read OR fleet-setup.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agents/setup'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_agents_setup_request, 'body'),
    getLooseObjectFromProperty(post_fleet_agents_setup_request, 'path'),
    getLooseObjectFromProperty(post_fleet_agents_setup_request, 'query'),
  ]),
  outputSchema: post_fleet_agents_setup_response,
};
const GET_FLEET_AGENTS_TAGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_tags',
  summary: `Get agent tags`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/tags</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/agents/tags'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['kuery', 'showInactive'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_agents_tags_request, 'body'),
    getLooseObjectFromProperty(get_fleet_agents_tags_request, 'path'),
    getLooseObjectFromProperty(get_fleet_agents_tags_request, 'query'),
  ]),
  outputSchema: get_fleet_agents_tags_response,
};
const GET_FLEET_CHECK_PERMISSIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_check_permissions',
  summary: `Check permissions`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/check-permissions</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/fleet/check-permissions'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['fleetServerSetup'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_check_permissions_request, 'body'),
    getLooseObjectFromProperty(get_fleet_check_permissions_request, 'path'),
    getLooseObjectFromProperty(get_fleet_check_permissions_request, 'query'),
  ]),
  outputSchema: get_fleet_check_permissions_response,
};
const GET_FLEET_CLOUD_CONNECTORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_cloud_connectors',
  summary: `Get cloud connectors`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/cloud_connectors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR integrations-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/cloud_connectors'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'perPage', 'kuery'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_cloud_connectors_request, 'body'),
    getLooseObjectFromProperty(get_fleet_cloud_connectors_request, 'path'),
    getLooseObjectFromProperty(get_fleet_cloud_connectors_request, 'query'),
  ]),
  outputSchema: get_fleet_cloud_connectors_response,
};
const POST_FLEET_CLOUD_CONNECTORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_cloud_connectors',
  summary: `Create cloud connector`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/cloud_connectors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-all OR integrations-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/cloud_connectors'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['cloudProvider', 'name', 'vars'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_cloud_connectors_request, 'body'),
    getLooseObjectFromProperty(post_fleet_cloud_connectors_request, 'path'),
    getLooseObjectFromProperty(post_fleet_cloud_connectors_request, 'query'),
  ]),
  outputSchema: post_fleet_cloud_connectors_response,
};
const DELETE_FLEET_CLOUD_CONNECTORS_CLOUDCONNECTORID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_cloud_connectors_cloudconnectorid',
  summary: `Delete cloud connector (supports force deletion)`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/cloud_connectors/{cloudConnectorId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-all OR integrations-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/cloud_connectors/{cloudConnectorId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['cloudConnectorId'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_fleet_cloud_connectors_cloudconnectorid_request, 'body'),
    getLooseObjectFromProperty(delete_fleet_cloud_connectors_cloudconnectorid_request, 'path'),
    getLooseObjectFromProperty(delete_fleet_cloud_connectors_cloudconnectorid_request, 'query'),
  ]),
  outputSchema: delete_fleet_cloud_connectors_cloudconnectorid_response,
};
const GET_FLEET_CLOUD_CONNECTORS_CLOUDCONNECTORID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_cloud_connectors_cloudconnectorid',
  summary: `Get cloud connector`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/cloud_connectors/{cloudConnectorId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR integrations-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/cloud_connectors/{cloudConnectorId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['cloudConnectorId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_cloud_connectors_cloudconnectorid_request, 'body'),
    getLooseObjectFromProperty(get_fleet_cloud_connectors_cloudconnectorid_request, 'path'),
    getLooseObjectFromProperty(get_fleet_cloud_connectors_cloudconnectorid_request, 'query'),
  ]),
  outputSchema: get_fleet_cloud_connectors_cloudconnectorid_response,
};
const PUT_FLEET_CLOUD_CONNECTORS_CLOUDCONNECTORID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_cloud_connectors_cloudconnectorid',
  summary: `Update cloud connector`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/cloud_connectors/{cloudConnectorId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-all OR integrations-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/cloud_connectors/{cloudConnectorId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['cloudConnectorId'],
    urlParams: [],
    bodyParams: ['name', 'vars'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_fleet_cloud_connectors_cloudconnectorid_request, 'body'),
    getLooseObjectFromProperty(put_fleet_cloud_connectors_cloudconnectorid_request, 'path'),
    getLooseObjectFromProperty(put_fleet_cloud_connectors_cloudconnectorid_request, 'query'),
  ]),
  outputSchema: put_fleet_cloud_connectors_cloudconnectorid_response,
};
const GET_FLEET_DATA_STREAMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_data_streams',
  summary: `Get data streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/data_streams</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all AND fleet-agent-policies-all AND fleet-settings-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/data_streams'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_data_streams_request, 'body'),
    getLooseObjectFromProperty(get_fleet_data_streams_request, 'path'),
    getLooseObjectFromProperty(get_fleet_data_streams_request, 'query'),
  ]),
  outputSchema: get_fleet_data_streams_response,
};
const GET_FLEET_ENROLLMENT_API_KEYS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_enrollment_api_keys',
  summary: `Get enrollment API keys`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/enrollment_api_keys</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all OR fleet-setup.`,
  methods: ['GET'],
  patterns: ['/api/fleet/enrollment_api_keys'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'perPage', 'kuery'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_enrollment_api_keys_request, 'body'),
    getLooseObjectFromProperty(get_fleet_enrollment_api_keys_request, 'path'),
    getLooseObjectFromProperty(get_fleet_enrollment_api_keys_request, 'query'),
  ]),
  outputSchema: get_fleet_enrollment_api_keys_response,
};
const POST_FLEET_ENROLLMENT_API_KEYS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_enrollment_api_keys',
  summary: `Create an enrollment API key`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/enrollment_api_keys</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/enrollment_api_keys'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['expiration', 'name', 'policy_id'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_enrollment_api_keys_request, 'body'),
    getLooseObjectFromProperty(post_fleet_enrollment_api_keys_request, 'path'),
    getLooseObjectFromProperty(post_fleet_enrollment_api_keys_request, 'query'),
  ]),
  outputSchema: post_fleet_enrollment_api_keys_response,
};
const DELETE_FLEET_ENROLLMENT_API_KEYS_KEYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_enrollment_api_keys_keyid',
  summary: `Revoke an enrollment API key`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/enrollment_api_keys/{keyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Revoke an enrollment API key by ID by marking it as inactive.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/enrollment_api_keys/{keyId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['keyId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_fleet_enrollment_api_keys_keyid_request, 'body'),
    getLooseObjectFromProperty(delete_fleet_enrollment_api_keys_keyid_request, 'path'),
    getLooseObjectFromProperty(delete_fleet_enrollment_api_keys_keyid_request, 'query'),
  ]),
  outputSchema: delete_fleet_enrollment_api_keys_keyid_response,
};
const GET_FLEET_ENROLLMENT_API_KEYS_KEYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_enrollment_api_keys_keyid',
  summary: `Get an enrollment API key`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/enrollment_api_keys/{keyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get an enrollment API key by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all OR fleet-setup.`,
  methods: ['GET'],
  patterns: ['/api/fleet/enrollment_api_keys/{keyId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['keyId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_enrollment_api_keys_keyid_request, 'body'),
    getLooseObjectFromProperty(get_fleet_enrollment_api_keys_keyid_request, 'path'),
    getLooseObjectFromProperty(get_fleet_enrollment_api_keys_keyid_request, 'query'),
  ]),
  outputSchema: get_fleet_enrollment_api_keys_keyid_response,
};
const POST_FLEET_EPM_BULK_ASSETS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_bulk_assets',
  summary: `Bulk get assets`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/bulk_assets</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/bulk_assets'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['assetIds'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_epm_bulk_assets_request, 'body'),
    getLooseObjectFromProperty(post_fleet_epm_bulk_assets_request, 'path'),
    getLooseObjectFromProperty(post_fleet_epm_bulk_assets_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_bulk_assets_response,
};
const GET_FLEET_EPM_CATEGORIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_categories',
  summary: `Get package categories`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/categories</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/categories'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['prerelease', 'include_policy_templates'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_epm_categories_request, 'body'),
    getLooseObjectFromProperty(get_fleet_epm_categories_request, 'path'),
    getLooseObjectFromProperty(get_fleet_epm_categories_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_categories_response,
};
const POST_FLEET_EPM_CUSTOM_INTEGRATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_custom_integrations',
  summary: `Create a custom integration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/custom_integrations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/custom_integrations'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['datasets', 'force', 'integrationName'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_epm_custom_integrations_request, 'body'),
    getLooseObjectFromProperty(post_fleet_epm_custom_integrations_request, 'path'),
    getLooseObjectFromProperty(post_fleet_epm_custom_integrations_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_custom_integrations_response,
};
const PUT_FLEET_EPM_CUSTOM_INTEGRATIONS_PKGNAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_epm_custom_integrations_pkgname',
  summary: `Update a custom integration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/custom_integrations/{pkgName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all AND integrations-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/epm/custom_integrations/{pkgName}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName'],
    urlParams: [],
    bodyParams: ['categories', 'readMeData'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_fleet_epm_custom_integrations_pkgname_request, 'body'),
    getLooseObjectFromProperty(put_fleet_epm_custom_integrations_pkgname_request, 'path'),
    getLooseObjectFromProperty(put_fleet_epm_custom_integrations_pkgname_request, 'query'),
  ]),
  outputSchema: put_fleet_epm_custom_integrations_pkgname_response,
};
const GET_FLEET_EPM_DATA_STREAMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_data_streams',
  summary: `Get data streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/data_streams</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/data_streams'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['type', 'datasetQuery', 'sortOrder', 'uncategorisedOnly'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_epm_data_streams_request, 'body'),
    getLooseObjectFromProperty(get_fleet_epm_data_streams_request, 'path'),
    getLooseObjectFromProperty(get_fleet_epm_data_streams_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_data_streams_response,
};
const GET_FLEET_EPM_PACKAGES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages',
  summary: `Get packages`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['category', 'prerelease', 'excludeInstallStatus', 'withPackagePoliciesCount'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_epm_packages_request, 'body'),
    getLooseObjectFromProperty(get_fleet_epm_packages_request, 'path'),
    getLooseObjectFromProperty(get_fleet_epm_packages_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_response,
};
const POST_FLEET_EPM_PACKAGES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages',
  summary: `Install a package by upload`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/packages'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['ignoreMappingUpdateErrors', 'skipDataStreamRollover'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_epm_packages_request, 'body'),
    getLooseObjectFromProperty(post_fleet_epm_packages_request, 'path'),
    getLooseObjectFromProperty(post_fleet_epm_packages_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_packages_response,
};
const POST_FLEET_EPM_PACKAGES_BULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_bulk',
  summary: `Bulk install packages`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/packages/_bulk'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['prerelease'],
    bodyParams: ['force', 'packages'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_epm_packages_bulk_request, 'body'),
    getLooseObjectFromProperty(post_fleet_epm_packages_bulk_request, 'path'),
    getLooseObjectFromProperty(post_fleet_epm_packages_bulk_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_packages_bulk_response,
};
const POST_FLEET_EPM_PACKAGES_BULK_ROLLBACK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_bulk_rollback',
  summary: `Bulk rollback packages`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_rollback</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/packages/_bulk_rollback'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['packages'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_epm_packages_bulk_rollback_request, 'body'),
    getLooseObjectFromProperty(post_fleet_epm_packages_bulk_rollback_request, 'path'),
    getLooseObjectFromProperty(post_fleet_epm_packages_bulk_rollback_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_packages_bulk_rollback_response,
};
const GET_FLEET_EPM_PACKAGES_BULK_ROLLBACK_TASKID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_bulk_rollback_taskid',
  summary: `Get Bulk rollback packages details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_rollback/{taskId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/_bulk_rollback/{taskId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['taskId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_epm_packages_bulk_rollback_taskid_request, 'body'),
    getLooseObjectFromProperty(get_fleet_epm_packages_bulk_rollback_taskid_request, 'path'),
    getLooseObjectFromProperty(get_fleet_epm_packages_bulk_rollback_taskid_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_bulk_rollback_taskid_response,
};
const POST_FLEET_EPM_PACKAGES_BULK_UNINSTALL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_bulk_uninstall',
  summary: `Bulk uninstall packages`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_uninstall</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/packages/_bulk_uninstall'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['force', 'packages'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_epm_packages_bulk_uninstall_request, 'body'),
    getLooseObjectFromProperty(post_fleet_epm_packages_bulk_uninstall_request, 'path'),
    getLooseObjectFromProperty(post_fleet_epm_packages_bulk_uninstall_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_packages_bulk_uninstall_response,
};
const GET_FLEET_EPM_PACKAGES_BULK_UNINSTALL_TASKID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_bulk_uninstall_taskid',
  summary: `Get Bulk uninstall packages details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_uninstall/{taskId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/_bulk_uninstall/{taskId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['taskId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_epm_packages_bulk_uninstall_taskid_request, 'body'),
    getLooseObjectFromProperty(get_fleet_epm_packages_bulk_uninstall_taskid_request, 'path'),
    getLooseObjectFromProperty(get_fleet_epm_packages_bulk_uninstall_taskid_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_bulk_uninstall_taskid_response,
};
const POST_FLEET_EPM_PACKAGES_BULK_UPGRADE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_bulk_upgrade',
  summary: `Bulk upgrade packages`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_upgrade</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/packages/_bulk_upgrade'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['force', 'packages', 'prerelease', 'upgrade_package_policies'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_epm_packages_bulk_upgrade_request, 'body'),
    getLooseObjectFromProperty(post_fleet_epm_packages_bulk_upgrade_request, 'path'),
    getLooseObjectFromProperty(post_fleet_epm_packages_bulk_upgrade_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_packages_bulk_upgrade_response,
};
const GET_FLEET_EPM_PACKAGES_BULK_UPGRADE_TASKID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_bulk_upgrade_taskid',
  summary: `Get Bulk upgrade packages details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_upgrade/{taskId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/_bulk_upgrade/{taskId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['taskId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_epm_packages_bulk_upgrade_taskid_request, 'body'),
    getLooseObjectFromProperty(get_fleet_epm_packages_bulk_upgrade_taskid_request, 'path'),
    getLooseObjectFromProperty(get_fleet_epm_packages_bulk_upgrade_taskid_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_bulk_upgrade_taskid_response,
};
const DELETE_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_epm_packages_pkgname_pkgversion',
  summary: `Delete a package`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_fleet_epm_packages_pkgname_pkgversion_request, 'body'),
    getLooseObjectFromProperty(delete_fleet_epm_packages_pkgname_pkgversion_request, 'path'),
    getLooseObjectFromProperty(delete_fleet_epm_packages_pkgname_pkgversion_request, 'query'),
  ]),
  outputSchema: delete_fleet_epm_packages_pkgname_pkgversion_response,
};
const GET_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_pkgname_pkgversion',
  summary: `Get a package`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: ['ignoreUnverified', 'prerelease', 'full', 'withMetadata'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_epm_packages_pkgname_pkgversion_request, 'body'),
    getLooseObjectFromProperty(get_fleet_epm_packages_pkgname_pkgversion_request, 'path'),
    getLooseObjectFromProperty(get_fleet_epm_packages_pkgname_pkgversion_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_pkgname_pkgversion_response,
};
const POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_pkgname_pkgversion',
  summary: `Install a package from the registry`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: ['prerelease', 'ignoreMappingUpdateErrors', 'skipDataStreamRollover'],
    bodyParams: ['force', 'ignore_constraints'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_epm_packages_pkgname_pkgversion_request, 'body'),
    getLooseObjectFromProperty(post_fleet_epm_packages_pkgname_pkgversion_request, 'path'),
    getLooseObjectFromProperty(post_fleet_epm_packages_pkgname_pkgversion_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_packages_pkgname_pkgversion_response,
};
const PUT_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_epm_packages_pkgname_pkgversion',
  summary: `Update package settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: [],
    bodyParams: ['keepPoliciesUpToDate'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_fleet_epm_packages_pkgname_pkgversion_request, 'body'),
    getLooseObjectFromProperty(put_fleet_epm_packages_pkgname_pkgversion_request, 'path'),
    getLooseObjectFromProperty(put_fleet_epm_packages_pkgname_pkgversion_request, 'query'),
  ]),
  outputSchema: put_fleet_epm_packages_pkgname_pkgversion_response,
};
const GET_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_FILEPATH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_pkgname_pkgversion_filepath',
  summary: `Get a package file`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/{filePath}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/{filePath}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName', 'pkgVersion', 'filePath'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_epm_packages_pkgname_pkgversion_filepath_request, 'body'),
    getLooseObjectFromProperty(get_fleet_epm_packages_pkgname_pkgversion_filepath_request, 'path'),
    getLooseObjectFromProperty(get_fleet_epm_packages_pkgname_pkgversion_filepath_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_pkgname_pkgversion_filepath_response,
};
const DELETE_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_DATASTREAM_ASSETS_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets',
    summary: `Delete assets for an input package`,
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/datastream_assets</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
    methods: ['DELETE'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/datastream_assets'],
    isInternal: true,
    documentation: 'URL_NOT_IMPLEMENTED',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: ['packagePolicyId'],
      bodyParams: [],
    },
    paramsSchema: z.union([
      getLooseObjectFromProperty(
        delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets_request,
        'body'
      ),
      getLooseObjectFromProperty(
        delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets_request,
        'path'
      ),
      getLooseObjectFromProperty(
        delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets_request,
        'query'
      ),
    ]),
    outputSchema: delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets_response,
  };
const DELETE_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_KIBANA_ASSETS_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets',
    summary: `Delete Kibana assets for a package`,
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/kibana_assets</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
    methods: ['DELETE'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/kibana_assets'],
    isInternal: true,
    documentation: 'URL_NOT_IMPLEMENTED',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.union([
      getLooseObjectFromProperty(
        delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request,
        'body'
      ),
      getLooseObjectFromProperty(
        delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request,
        'path'
      ),
      getLooseObjectFromProperty(
        delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request,
        'query'
      ),
    ]),
    outputSchema: delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets_response,
  };
const POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_KIBANA_ASSETS_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.post_fleet_epm_packages_pkgname_pkgversion_kibana_assets',
    summary: `Install Kibana assets for a package`,
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/kibana_assets</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
    methods: ['POST'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/kibana_assets'],
    isInternal: true,
    documentation: 'URL_NOT_IMPLEMENTED',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: [],
      bodyParams: ['force', 'space_ids'],
    },
    paramsSchema: z.union([
      getLooseObjectFromProperty(
        post_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request,
        'body'
      ),
      getLooseObjectFromProperty(
        post_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request,
        'path'
      ),
      getLooseObjectFromProperty(
        post_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request,
        'query'
      ),
    ]),
    outputSchema: post_fleet_epm_packages_pkgname_pkgversion_kibana_assets_response,
  };
const POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_RULE_ASSETS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_pkgname_pkgversion_rule_assets',
  summary: `Install Kibana alert rule for a package`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/rule_assets</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/rule_assets'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: [],
    bodyParams: ['force'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(
      post_fleet_epm_packages_pkgname_pkgversion_rule_assets_request,
      'body'
    ),
    getLooseObjectFromProperty(
      post_fleet_epm_packages_pkgname_pkgversion_rule_assets_request,
      'path'
    ),
    getLooseObjectFromProperty(
      post_fleet_epm_packages_pkgname_pkgversion_rule_assets_request,
      'query'
    ),
  ]),
  outputSchema: post_fleet_epm_packages_pkgname_pkgversion_rule_assets_response,
};
const POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_TRANSFORMS_AUTHORIZE_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize',
    summary: `Authorize transforms`,
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/transforms/authorize</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
    methods: ['POST'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/transforms/authorize'],
    isInternal: true,
    documentation: 'URL_NOT_IMPLEMENTED',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: ['prerelease'],
      bodyParams: ['transforms'],
    },
    paramsSchema: z.union([
      getLooseObjectFromProperty(
        post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_request,
        'body'
      ),
      getLooseObjectFromProperty(
        post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_request,
        'path'
      ),
      getLooseObjectFromProperty(
        post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_request,
        'query'
      ),
    ]),
    outputSchema: post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_response,
  };
const POST_FLEET_EPM_PACKAGES_PKGNAME_ROLLBACK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_pkgname_rollback',
  summary: `Rollback a package to previous version`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/rollback</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/rollback'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_epm_packages_pkgname_rollback_request, 'body'),
    getLooseObjectFromProperty(post_fleet_epm_packages_pkgname_rollback_request, 'path'),
    getLooseObjectFromProperty(post_fleet_epm_packages_pkgname_rollback_request, 'query'),
  ]),
  outputSchema: post_fleet_epm_packages_pkgname_rollback_response,
};
const GET_FLEET_EPM_PACKAGES_PKGNAME_STATS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_pkgname_stats',
  summary: `Get package stats`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/stats</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/stats'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_epm_packages_pkgname_stats_request, 'body'),
    getLooseObjectFromProperty(get_fleet_epm_packages_pkgname_stats_request, 'path'),
    getLooseObjectFromProperty(get_fleet_epm_packages_pkgname_stats_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_pkgname_stats_response,
};
const GET_FLEET_EPM_PACKAGES_INSTALLED_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_installed',
  summary: `Get installed packages`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/installed</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/installed'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(get_fleet_epm_packages_installed_request, 'body'),
    getLooseObjectFromProperty(get_fleet_epm_packages_installed_request, 'path'),
    getLooseObjectFromProperty(get_fleet_epm_packages_installed_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_installed_response,
};
const GET_FLEET_EPM_PACKAGES_LIMITED_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_limited',
  summary: `Get a limited package list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/limited</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/limited'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_epm_packages_limited_request, 'body'),
    getLooseObjectFromProperty(get_fleet_epm_packages_limited_request, 'path'),
    getLooseObjectFromProperty(get_fleet_epm_packages_limited_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_packages_limited_response,
};
const GET_FLEET_EPM_TEMPLATES_PKGNAME_PKGVERSION_INPUTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_templates_pkgname_pkgversion_inputs',
  summary: `Get an inputs template`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/templates/{pkgName}/{pkgVersion}/inputs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/templates/{pkgName}/{pkgVersion}/inputs'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: ['format', 'prerelease', 'ignoreUnverified'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_epm_templates_pkgname_pkgversion_inputs_request, 'body'),
    getLooseObjectFromProperty(get_fleet_epm_templates_pkgname_pkgversion_inputs_request, 'path'),
    getLooseObjectFromProperty(get_fleet_epm_templates_pkgname_pkgversion_inputs_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_templates_pkgname_pkgversion_inputs_response,
};
const GET_FLEET_EPM_VERIFICATION_KEY_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_verification_key_id',
  summary: `Get a package signature verification key ID`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/verification_key_id</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/verification_key_id'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_epm_verification_key_id_request, 'body'),
    getLooseObjectFromProperty(get_fleet_epm_verification_key_id_request, 'path'),
    getLooseObjectFromProperty(get_fleet_epm_verification_key_id_request, 'query'),
  ]),
  outputSchema: get_fleet_epm_verification_key_id_response,
};
const GET_FLEET_FLEET_SERVER_HOSTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_fleet_server_hosts',
  summary: `Get Fleet Server hosts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/fleet_server_hosts</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all OR fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/fleet_server_hosts'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_fleet_server_hosts_request, 'body'),
    getLooseObjectFromProperty(get_fleet_fleet_server_hosts_request, 'path'),
    getLooseObjectFromProperty(get_fleet_fleet_server_hosts_request, 'query'),
  ]),
  outputSchema: get_fleet_fleet_server_hosts_response,
};
const POST_FLEET_FLEET_SERVER_HOSTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_fleet_server_hosts',
  summary: `Create a Fleet Server host`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/fleet_server_hosts</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/fleet_server_hosts'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(post_fleet_fleet_server_hosts_request, 'body'),
    getLooseObjectFromProperty(post_fleet_fleet_server_hosts_request, 'path'),
    getLooseObjectFromProperty(post_fleet_fleet_server_hosts_request, 'query'),
  ]),
  outputSchema: post_fleet_fleet_server_hosts_response,
};
const DELETE_FLEET_FLEET_SERVER_HOSTS_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_fleet_server_hosts_itemid',
  summary: `Delete a Fleet Server host`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/fleet_server_hosts/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a Fleet Server host by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/fleet_server_hosts/{itemId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_fleet_fleet_server_hosts_itemid_request, 'body'),
    getLooseObjectFromProperty(delete_fleet_fleet_server_hosts_itemid_request, 'path'),
    getLooseObjectFromProperty(delete_fleet_fleet_server_hosts_itemid_request, 'query'),
  ]),
  outputSchema: delete_fleet_fleet_server_hosts_itemid_response,
};
const GET_FLEET_FLEET_SERVER_HOSTS_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_fleet_server_hosts_itemid',
  summary: `Get a Fleet Server host`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/fleet_server_hosts/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a Fleet Server host by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/fleet_server_hosts/{itemId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_fleet_server_hosts_itemid_request, 'body'),
    getLooseObjectFromProperty(get_fleet_fleet_server_hosts_itemid_request, 'path'),
    getLooseObjectFromProperty(get_fleet_fleet_server_hosts_itemid_request, 'query'),
  ]),
  outputSchema: get_fleet_fleet_server_hosts_itemid_response,
};
const PUT_FLEET_FLEET_SERVER_HOSTS_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_fleet_server_hosts_itemid',
  summary: `Update a Fleet Server host`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/fleet_server_hosts/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a Fleet Server host by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/fleet_server_hosts/{itemId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: ['host_urls', 'is_default', 'is_internal', 'name', 'proxy_id', 'secrets', 'ssl'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_fleet_fleet_server_hosts_itemid_request, 'body'),
    getLooseObjectFromProperty(put_fleet_fleet_server_hosts_itemid_request, 'path'),
    getLooseObjectFromProperty(put_fleet_fleet_server_hosts_itemid_request, 'query'),
  ]),
  outputSchema: put_fleet_fleet_server_hosts_itemid_response,
};
const POST_FLEET_HEALTH_CHECK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_health_check',
  summary: `Check Fleet Server health`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/health_check</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/health_check'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['id'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_health_check_request, 'body'),
    getLooseObjectFromProperty(post_fleet_health_check_request, 'path'),
    getLooseObjectFromProperty(post_fleet_health_check_request, 'query'),
  ]),
  outputSchema: post_fleet_health_check_response,
};
const GET_FLEET_KUBERNETES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_kubernetes',
  summary: `Get a full K8s agent manifest`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/kubernetes</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-setup.`,
  methods: ['GET'],
  patterns: ['/api/fleet/kubernetes'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['download', 'fleetServer', 'enrolToken'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_kubernetes_request, 'body'),
    getLooseObjectFromProperty(get_fleet_kubernetes_request, 'path'),
    getLooseObjectFromProperty(get_fleet_kubernetes_request, 'query'),
  ]),
  outputSchema: get_fleet_kubernetes_response,
};
const GET_FLEET_KUBERNETES_DOWNLOAD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_kubernetes_download',
  summary: `Download an agent manifest`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/kubernetes/download</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-setup.`,
  methods: ['GET'],
  patterns: ['/api/fleet/kubernetes/download'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['download', 'fleetServer', 'enrolToken'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_kubernetes_download_request, 'body'),
    getLooseObjectFromProperty(get_fleet_kubernetes_download_request, 'path'),
    getLooseObjectFromProperty(get_fleet_kubernetes_download_request, 'query'),
  ]),
  outputSchema: get_fleet_kubernetes_download_response,
};
const POST_FLEET_LOGSTASH_API_KEYS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_logstash_api_keys',
  summary: `Generate a Logstash API key`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/logstash_api_keys</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/logstash_api_keys'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_logstash_api_keys_request, 'body'),
    getLooseObjectFromProperty(post_fleet_logstash_api_keys_request, 'path'),
    getLooseObjectFromProperty(post_fleet_logstash_api_keys_request, 'query'),
  ]),
  outputSchema: post_fleet_logstash_api_keys_response,
};
const POST_FLEET_MESSAGE_SIGNING_SERVICE_ROTATE_KEY_PAIR_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_message_signing_service_rotate_key_pair',
  summary: `Rotate a Fleet message signing key pair`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/message_signing_service/rotate_key_pair</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all AND fleet-agent-policies-all AND fleet-settings-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/message_signing_service/rotate_key_pair'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['acknowledge'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_message_signing_service_rotate_key_pair_request, 'body'),
    getLooseObjectFromProperty(post_fleet_message_signing_service_rotate_key_pair_request, 'path'),
    getLooseObjectFromProperty(post_fleet_message_signing_service_rotate_key_pair_request, 'query'),
  ]),
  outputSchema: post_fleet_message_signing_service_rotate_key_pair_response,
};
const GET_FLEET_OUTPUTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_outputs',
  summary: `Get outputs`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read OR fleet-agent-policies-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/outputs'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_outputs_request, 'body'),
    getLooseObjectFromProperty(get_fleet_outputs_request, 'path'),
    getLooseObjectFromProperty(get_fleet_outputs_request, 'query'),
  ]),
  outputSchema: get_fleet_outputs_response,
};
const POST_FLEET_OUTPUTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_outputs',
  summary: `Create output`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/outputs'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_outputs_request, 'body'),
    getLooseObjectFromProperty(post_fleet_outputs_request, 'path'),
    getLooseObjectFromProperty(post_fleet_outputs_request, 'query'),
  ]),
  outputSchema: post_fleet_outputs_response,
};
const DELETE_FLEET_OUTPUTS_OUTPUTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_outputs_outputid',
  summary: `Delete output`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs/{outputId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete output by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/outputs/{outputId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['outputId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_fleet_outputs_outputid_request, 'body'),
    getLooseObjectFromProperty(delete_fleet_outputs_outputid_request, 'path'),
    getLooseObjectFromProperty(delete_fleet_outputs_outputid_request, 'query'),
  ]),
  outputSchema: delete_fleet_outputs_outputid_response,
};
const GET_FLEET_OUTPUTS_OUTPUTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_outputs_outputid',
  summary: `Get output`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs/{outputId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get output by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-read OR fleet-agent-policies-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/outputs/{outputId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['outputId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_outputs_outputid_request, 'body'),
    getLooseObjectFromProperty(get_fleet_outputs_outputid_request, 'path'),
    getLooseObjectFromProperty(get_fleet_outputs_outputid_request, 'query'),
  ]),
  outputSchema: get_fleet_outputs_outputid_response,
};
const PUT_FLEET_OUTPUTS_OUTPUTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_outputs_outputid',
  summary: `Update output`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs/{outputId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update output by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all OR fleet-agent-policies-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/outputs/{outputId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['outputId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_fleet_outputs_outputid_request, 'body'),
    getLooseObjectFromProperty(put_fleet_outputs_outputid_request, 'path'),
    getLooseObjectFromProperty(put_fleet_outputs_outputid_request, 'query'),
  ]),
  outputSchema: put_fleet_outputs_outputid_response,
};
const GET_FLEET_OUTPUTS_OUTPUTID_HEALTH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_outputs_outputid_health',
  summary: `Get the latest output health`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs/{outputId}/health</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/outputs/{outputId}/health'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['outputId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_outputs_outputid_health_request, 'body'),
    getLooseObjectFromProperty(get_fleet_outputs_outputid_health_request, 'path'),
    getLooseObjectFromProperty(get_fleet_outputs_outputid_health_request, 'query'),
  ]),
  outputSchema: get_fleet_outputs_outputid_health_response,
};
const GET_FLEET_PACKAGE_POLICIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_package_policies',
  summary: `Get package policies`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/fleet/package_policies'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(get_fleet_package_policies_request, 'body'),
    getLooseObjectFromProperty(get_fleet_package_policies_request, 'path'),
    getLooseObjectFromProperty(get_fleet_package_policies_request, 'query'),
  ]),
  outputSchema: get_fleet_package_policies_response,
};
const POST_FLEET_PACKAGE_POLICIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_package_policies',
  summary: `Create a package policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/fleet/package_policies'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_package_policies_request, 'body'),
    getLooseObjectFromProperty(post_fleet_package_policies_request, 'path'),
    getLooseObjectFromProperty(post_fleet_package_policies_request, 'query'),
  ]),
  outputSchema: post_fleet_package_policies_response,
};
const POST_FLEET_PACKAGE_POLICIES_BULK_GET_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_package_policies_bulk_get',
  summary: `Bulk get package policies`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/_bulk_get</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/fleet/package_policies/_bulk_get'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['format'],
    bodyParams: ['ids', 'ignoreMissing'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_package_policies_bulk_get_request, 'body'),
    getLooseObjectFromProperty(post_fleet_package_policies_bulk_get_request, 'path'),
    getLooseObjectFromProperty(post_fleet_package_policies_bulk_get_request, 'query'),
  ]),
  outputSchema: post_fleet_package_policies_bulk_get_response,
};
const DELETE_FLEET_PACKAGE_POLICIES_PACKAGEPOLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_package_policies_packagepolicyid',
  summary: `Delete a package policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/{packagePolicyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a package policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-all AND integrations-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/package_policies/{packagePolicyId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['packagePolicyId'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_fleet_package_policies_packagepolicyid_request, 'body'),
    getLooseObjectFromProperty(delete_fleet_package_policies_packagepolicyid_request, 'path'),
    getLooseObjectFromProperty(delete_fleet_package_policies_packagepolicyid_request, 'query'),
  ]),
  outputSchema: delete_fleet_package_policies_packagepolicyid_response,
};
const GET_FLEET_PACKAGE_POLICIES_PACKAGEPOLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_package_policies_packagepolicyid',
  summary: `Get a package policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/{packagePolicyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a package policy by ID.`,
  methods: ['GET'],
  patterns: ['/api/fleet/package_policies/{packagePolicyId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['packagePolicyId'],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_package_policies_packagepolicyid_request, 'body'),
    getLooseObjectFromProperty(get_fleet_package_policies_packagepolicyid_request, 'path'),
    getLooseObjectFromProperty(get_fleet_package_policies_packagepolicyid_request, 'query'),
  ]),
  outputSchema: get_fleet_package_policies_packagepolicyid_response,
};
const PUT_FLEET_PACKAGE_POLICIES_PACKAGEPOLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_package_policies_packagepolicyid',
  summary: `Update a package policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/{packagePolicyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a package policy by ID.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/package_policies/{packagePolicyId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['packagePolicyId'],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_fleet_package_policies_packagepolicyid_request, 'body'),
    getLooseObjectFromProperty(put_fleet_package_policies_packagepolicyid_request, 'path'),
    getLooseObjectFromProperty(put_fleet_package_policies_packagepolicyid_request, 'query'),
  ]),
  outputSchema: put_fleet_package_policies_packagepolicyid_response,
};
const POST_FLEET_PACKAGE_POLICIES_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_package_policies_delete',
  summary: `Bulk delete package policies`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-all AND integrations-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/package_policies/delete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['force', 'packagePolicyIds'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_package_policies_delete_request, 'body'),
    getLooseObjectFromProperty(post_fleet_package_policies_delete_request, 'path'),
    getLooseObjectFromProperty(post_fleet_package_policies_delete_request, 'query'),
  ]),
  outputSchema: post_fleet_package_policies_delete_response,
};
const POST_FLEET_PACKAGE_POLICIES_UPGRADE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_package_policies_upgrade',
  summary: `Upgrade a package policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/upgrade</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upgrade a package policy to a newer package version.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-all AND integrations-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/package_policies/upgrade'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['packagePolicyIds'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_package_policies_upgrade_request, 'body'),
    getLooseObjectFromProperty(post_fleet_package_policies_upgrade_request, 'path'),
    getLooseObjectFromProperty(post_fleet_package_policies_upgrade_request, 'query'),
  ]),
  outputSchema: post_fleet_package_policies_upgrade_response,
};
const POST_FLEET_PACKAGE_POLICIES_UPGRADE_DRYRUN_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_package_policies_upgrade_dryrun',
  summary: `Dry run a package policy upgrade`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/upgrade/dryrun</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read AND integrations-read.`,
  methods: ['POST'],
  patterns: ['/api/fleet/package_policies/upgrade/dryrun'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['packagePolicyIds', 'packageVersion'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_package_policies_upgrade_dryrun_request, 'body'),
    getLooseObjectFromProperty(post_fleet_package_policies_upgrade_dryrun_request, 'path'),
    getLooseObjectFromProperty(post_fleet_package_policies_upgrade_dryrun_request, 'query'),
  ]),
  outputSchema: post_fleet_package_policies_upgrade_dryrun_response,
};
const GET_FLEET_PROXIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_proxies',
  summary: `Get proxies`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/proxies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/proxies'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_proxies_request, 'body'),
    getLooseObjectFromProperty(get_fleet_proxies_request, 'path'),
    getLooseObjectFromProperty(get_fleet_proxies_request, 'query'),
  ]),
  outputSchema: get_fleet_proxies_response,
};
const POST_FLEET_PROXIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_proxies',
  summary: `Create a proxy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/proxies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/proxies'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(post_fleet_proxies_request, 'body'),
    getLooseObjectFromProperty(post_fleet_proxies_request, 'path'),
    getLooseObjectFromProperty(post_fleet_proxies_request, 'query'),
  ]),
  outputSchema: post_fleet_proxies_response,
};
const DELETE_FLEET_PROXIES_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_proxies_itemid',
  summary: `Delete a proxy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/proxies/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a proxy by ID<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/proxies/{itemId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_fleet_proxies_itemid_request, 'body'),
    getLooseObjectFromProperty(delete_fleet_proxies_itemid_request, 'path'),
    getLooseObjectFromProperty(delete_fleet_proxies_itemid_request, 'query'),
  ]),
  outputSchema: delete_fleet_proxies_itemid_response,
};
const GET_FLEET_PROXIES_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_proxies_itemid',
  summary: `Get a proxy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/proxies/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a proxy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/proxies/{itemId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_proxies_itemid_request, 'body'),
    getLooseObjectFromProperty(get_fleet_proxies_itemid_request, 'path'),
    getLooseObjectFromProperty(get_fleet_proxies_itemid_request, 'query'),
  ]),
  outputSchema: get_fleet_proxies_itemid_response,
};
const PUT_FLEET_PROXIES_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_proxies_itemid',
  summary: `Update a proxy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/proxies/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a proxy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/proxies/{itemId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(put_fleet_proxies_itemid_request, 'body'),
    getLooseObjectFromProperty(put_fleet_proxies_itemid_request, 'path'),
    getLooseObjectFromProperty(put_fleet_proxies_itemid_request, 'query'),
  ]),
  outputSchema: put_fleet_proxies_itemid_response,
};
const GET_FLEET_REMOTE_SYNCED_INTEGRATIONS_OUTPUTID_REMOTE_STATUS_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.get_fleet_remote_synced_integrations_outputid_remote_status',
    summary: `Get remote synced integrations status by outputId`,
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/remote_synced_integrations/{outputId}/remote_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read AND integrations-read.`,
    methods: ['GET'],
    patterns: ['/api/fleet/remote_synced_integrations/{outputId}/remote_status'],
    isInternal: true,
    documentation: 'URL_NOT_IMPLEMENTED',
    parameterTypes: {
      pathParams: ['outputId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.union([
      getLooseObjectFromProperty(
        get_fleet_remote_synced_integrations_outputid_remote_status_request,
        'body'
      ),
      getLooseObjectFromProperty(
        get_fleet_remote_synced_integrations_outputid_remote_status_request,
        'path'
      ),
      getLooseObjectFromProperty(
        get_fleet_remote_synced_integrations_outputid_remote_status_request,
        'query'
      ),
    ]),
    outputSchema: get_fleet_remote_synced_integrations_outputid_remote_status_response,
  };
const GET_FLEET_REMOTE_SYNCED_INTEGRATIONS_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_remote_synced_integrations_status',
  summary: `Get remote synced integrations status`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/remote_synced_integrations/status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read AND integrations-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/remote_synced_integrations/status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_remote_synced_integrations_status_request, 'body'),
    getLooseObjectFromProperty(get_fleet_remote_synced_integrations_status_request, 'path'),
    getLooseObjectFromProperty(get_fleet_remote_synced_integrations_status_request, 'query'),
  ]),
  outputSchema: get_fleet_remote_synced_integrations_status_response,
};
const POST_FLEET_SERVICE_TOKENS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_service_tokens',
  summary: `Create a service token`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/service_tokens</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/service_tokens'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['remote'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_service_tokens_request, 'body'),
    getLooseObjectFromProperty(post_fleet_service_tokens_request, 'path'),
    getLooseObjectFromProperty(post_fleet_service_tokens_request, 'query'),
  ]),
  outputSchema: post_fleet_service_tokens_response,
};
const GET_FLEET_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_settings',
  summary: `Get settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read.`,
  methods: ['GET'],
  patterns: ['/api/fleet/settings'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_settings_request, 'body'),
    getLooseObjectFromProperty(get_fleet_settings_request, 'path'),
    getLooseObjectFromProperty(get_fleet_settings_request, 'query'),
  ]),
  outputSchema: get_fleet_settings_response,
};
const PUT_FLEET_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_settings',
  summary: `Update settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/settings'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(put_fleet_settings_request, 'body'),
    getLooseObjectFromProperty(put_fleet_settings_request, 'path'),
    getLooseObjectFromProperty(put_fleet_settings_request, 'query'),
  ]),
  outputSchema: put_fleet_settings_response,
};
const POST_FLEET_SETUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_setup',
  summary: `Initiate Fleet setup`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/setup</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read OR fleet-agent-policies-read OR fleet-settings-read OR fleet-setup.`,
  methods: ['POST'],
  patterns: ['/api/fleet/setup'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_fleet_setup_request, 'body'),
    getLooseObjectFromProperty(post_fleet_setup_request, 'path'),
    getLooseObjectFromProperty(post_fleet_setup_request, 'query'),
  ]),
  outputSchema: post_fleet_setup_response,
};
const GET_FLEET_SPACE_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_space_settings',
  summary: `Get space settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/space_settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/fleet/space_settings'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_space_settings_request, 'body'),
    getLooseObjectFromProperty(get_fleet_space_settings_request, 'path'),
    getLooseObjectFromProperty(get_fleet_space_settings_request, 'query'),
  ]),
  outputSchema: get_fleet_space_settings_response,
};
const PUT_FLEET_SPACE_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_space_settings',
  summary: `Create space settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/space_settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/space_settings'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['allowed_namespace_prefixes'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_fleet_space_settings_request, 'body'),
    getLooseObjectFromProperty(put_fleet_space_settings_request, 'path'),
    getLooseObjectFromProperty(put_fleet_space_settings_request, 'query'),
  ]),
  outputSchema: put_fleet_space_settings_response,
};
const GET_FLEET_UNINSTALL_TOKENS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_uninstall_tokens',
  summary: `Get metadata for latest uninstall tokens`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/uninstall_tokens</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List the metadata for the latest uninstall tokens per agent policy.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/uninstall_tokens'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['policyId', 'search', 'perPage', 'page'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_uninstall_tokens_request, 'body'),
    getLooseObjectFromProperty(get_fleet_uninstall_tokens_request, 'path'),
    getLooseObjectFromProperty(get_fleet_uninstall_tokens_request, 'query'),
  ]),
  outputSchema: get_fleet_uninstall_tokens_response,
};
const GET_FLEET_UNINSTALL_TOKENS_UNINSTALLTOKENID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_uninstall_tokens_uninstalltokenid',
  summary: `Get a decrypted uninstall token`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/uninstall_tokens/{uninstallTokenId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get one decrypted uninstall token by its ID.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/uninstall_tokens/{uninstallTokenId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['uninstallTokenId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_fleet_uninstall_tokens_uninstalltokenid_request, 'body'),
    getLooseObjectFromProperty(get_fleet_uninstall_tokens_uninstalltokenid_request, 'path'),
    getLooseObjectFromProperty(get_fleet_uninstall_tokens_uninstalltokenid_request, 'query'),
  ]),
  outputSchema: get_fleet_uninstall_tokens_uninstalltokenid_response,
};
const DELETELIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteList',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'deleteReferences', 'ignoreReferences'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_list_request, 'body'),
    getLooseObjectFromProperty(delete_list_request, 'path'),
    getLooseObjectFromProperty(delete_list_request, 'query'),
  ]),
  outputSchema: delete_list_response,
};
const READLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadList',
  summary: `Get value list details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a value list using the list ID.`,
  methods: ['GET'],
  patterns: ['/api/lists'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_list_request, 'body'),
    getLooseObjectFromProperty(read_list_request, 'path'),
    getLooseObjectFromProperty(read_list_request, 'query'),
  ]),
  outputSchema: read_list_response,
};
const PATCHLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PatchList',
  summary: `Patch a value list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update specific fields of an existing list using the list \`id\`.`,
  methods: ['PATCH'],
  patterns: ['/api/lists'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['_version', 'description', 'id', 'meta', 'name', 'version'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(patch_list_request, 'body'),
    getLooseObjectFromProperty(patch_list_request, 'path'),
    getLooseObjectFromProperty(patch_list_request, 'query'),
  ]),
  outputSchema: patch_list_response,
};
const CREATELIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateList',
  summary: `Create a value list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new value list.`,
  methods: ['POST'],
  patterns: ['/api/lists'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(create_list_request, 'body'),
    getLooseObjectFromProperty(create_list_request, 'path'),
    getLooseObjectFromProperty(create_list_request, 'query'),
  ]),
  outputSchema: create_list_response,
};
const UPDATELIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateList',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['_version', 'description', 'id', 'meta', 'name', 'version'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_list_request, 'body'),
    getLooseObjectFromProperty(update_list_request, 'path'),
    getLooseObjectFromProperty(update_list_request, 'query'),
  ]),
  outputSchema: update_list_response,
};
const FINDLISTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindLists',
  summary: `Get value lists`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a paginated subset of value lists. By default, the first page is returned, with 20 results per page.`,
  methods: ['GET'],
  patterns: ['/api/lists/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'per_page', 'sort_field', 'sort_order', 'cursor', 'filter'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(find_lists_request, 'body'),
    getLooseObjectFromProperty(find_lists_request, 'path'),
    getLooseObjectFromProperty(find_lists_request, 'query'),
  ]),
  outputSchema: find_lists_response,
};
const DELETELISTINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteListIndex',
  summary: `Delete value list data streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete the \`.lists\` and \`.items\` data streams.`,
  methods: ['DELETE'],
  patterns: ['/api/lists/index'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_list_index_request, 'body'),
    getLooseObjectFromProperty(delete_list_index_request, 'path'),
    getLooseObjectFromProperty(delete_list_index_request, 'query'),
  ]),
  outputSchema: delete_list_index_response,
};
const READLISTINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadListIndex',
  summary: `Get status of value list data streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Verify that \`.lists\` and \`.items\` data streams exist.`,
  methods: ['GET'],
  patterns: ['/api/lists/index'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_list_index_request, 'body'),
    getLooseObjectFromProperty(read_list_index_request, 'path'),
    getLooseObjectFromProperty(read_list_index_request, 'query'),
  ]),
  outputSchema: read_list_index_response,
};
const CREATELISTINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateListIndex',
  summary: `Create list data streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create \`.lists\` and \`.items\` data streams in the relevant space.`,
  methods: ['POST'],
  patterns: ['/api/lists/index'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_list_index_request, 'body'),
    getLooseObjectFromProperty(create_list_index_request, 'path'),
    getLooseObjectFromProperty(create_list_index_request, 'query'),
  ]),
  outputSchema: create_list_index_response,
};
const DELETELISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteListItem',
  summary: `Delete a value list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a value list item using its \`id\`, or its \`list_id\` and \`value\` fields.`,
  methods: ['DELETE'],
  patterns: ['/api/lists/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'list_id', 'value', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_list_item_request, 'body'),
    getLooseObjectFromProperty(delete_list_item_request, 'path'),
    getLooseObjectFromProperty(delete_list_item_request, 'query'),
  ]),
  outputSchema: delete_list_item_response,
};
const READLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadListItem',
  summary: `Get a value list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a value list item.`,
  methods: ['GET'],
  patterns: ['/api/lists/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'list_id', 'value'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_list_item_request, 'body'),
    getLooseObjectFromProperty(read_list_item_request, 'path'),
    getLooseObjectFromProperty(read_list_item_request, 'query'),
  ]),
  outputSchema: read_list_item_response,
};
const PATCHLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PatchListItem',
  summary: `Patch a value list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update specific fields of an existing value list item using the item \`id\`.`,
  methods: ['PATCH'],
  patterns: ['/api/lists/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['_version', 'id', 'meta', 'refresh', 'value'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(patch_list_item_request, 'body'),
    getLooseObjectFromProperty(patch_list_item_request, 'path'),
    getLooseObjectFromProperty(patch_list_item_request, 'query'),
  ]),
  outputSchema: patch_list_item_response,
};
const CREATELISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateListItem',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['id', 'list_id', 'meta', 'refresh', 'value'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_list_item_request, 'body'),
    getLooseObjectFromProperty(create_list_item_request, 'path'),
    getLooseObjectFromProperty(create_list_item_request, 'query'),
  ]),
  outputSchema: create_list_item_response,
};
const UPDATELISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateListItem',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['_version', 'id', 'meta', 'value'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_list_item_request, 'body'),
    getLooseObjectFromProperty(update_list_item_request, 'path'),
    getLooseObjectFromProperty(update_list_item_request, 'query'),
  ]),
  outputSchema: update_list_item_response,
};
const EXPORTLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ExportListItems',
  summary: `Export value list items`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items/_export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Export list item values from the specified value list.`,
  methods: ['POST'],
  patterns: ['/api/lists/items/_export'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['list_id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(export_list_items_request, 'body'),
    getLooseObjectFromProperty(export_list_items_request, 'path'),
    getLooseObjectFromProperty(export_list_items_request, 'query'),
  ]),
  outputSchema: export_list_items_response,
};
const FINDLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindListItems',
  summary: `Get value list items`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get all value list items in the specified list.`,
  methods: ['GET'],
  patterns: ['/api/lists/items/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['list_id', 'page', 'per_page', 'sort_field', 'sort_order', 'cursor', 'filter'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(find_list_items_request, 'body'),
    getLooseObjectFromProperty(find_list_items_request, 'path'),
    getLooseObjectFromProperty(find_list_items_request, 'query'),
  ]),
  outputSchema: find_list_items_response,
};
const IMPORTLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ImportListItems',
  summary: `Import value list items`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items/_import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Import value list items from a TXT or CSV file. The maximum file size is 9 million bytes.

You can import items to a new or existing list.
`,
  methods: ['POST'],
  patterns: ['/api/lists/items/_import'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['list_id', 'type', 'serializer', 'deserializer', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(import_list_items_request, 'body'),
    getLooseObjectFromProperty(import_list_items_request, 'path'),
    getLooseObjectFromProperty(import_list_items_request, 'query'),
  ]),
  outputSchema: import_list_items_response,
};
const READLISTPRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadListPrivileges',
  summary: `Get value list privileges`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/privileges</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/lists/privileges'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_list_privileges_request, 'body'),
    getLooseObjectFromProperty(read_list_privileges_request, 'path'),
    getLooseObjectFromProperty(read_list_privileges_request, 'query'),
  ]),
  outputSchema: read_list_privileges_response,
};
const DELETE_LOGSTASH_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_logstash_pipeline',
  summary: `Delete a Logstash pipeline`,
  description: `Delete a centrally-managed Logstash pipeline.
If your Elasticsearch cluster is protected with basic authentication, you must have either the \`logstash_admin\` built-in role or a customized Logstash writer role.
`,
  methods: ['DELETE'],
  patterns: ['/api/logstash/pipeline/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_logstash_pipeline_request, 'body'),
    getLooseObjectFromProperty(delete_logstash_pipeline_request, 'path'),
    getLooseObjectFromProperty(delete_logstash_pipeline_request, 'query'),
  ]),
  outputSchema: delete_logstash_pipeline_response,
};
const GET_LOGSTASH_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_logstash_pipeline',
  summary: `Get a Logstash pipeline`,
  description: `Get information for a centrally-managed Logstash pipeline.
To use this API, you must have either the \`logstash_admin\` built-in role or a customized Logstash reader role.
`,
  methods: ['GET'],
  patterns: ['/api/logstash/pipeline/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_logstash_pipeline_request, 'body'),
    getLooseObjectFromProperty(get_logstash_pipeline_request, 'path'),
    getLooseObjectFromProperty(get_logstash_pipeline_request, 'query'),
  ]),
  outputSchema: get_logstash_pipeline_response,
};
const PUT_LOGSTASH_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_logstash_pipeline',
  summary: `Create or update a Logstash pipeline`,
  description: `Create a centrally-managed Logstash pipeline or update a pipeline.
To use this API, you must have either the \`logstash_admin\` built-in role or a customized Logstash writer role.
`,
  methods: ['PUT'],
  patterns: ['/api/logstash/pipeline/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['description', 'pipeline', 'settings'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_logstash_pipeline_request, 'body'),
    getLooseObjectFromProperty(put_logstash_pipeline_request, 'path'),
    getLooseObjectFromProperty(put_logstash_pipeline_request, 'query'),
  ]),
  outputSchema: put_logstash_pipeline_response,
};
const GET_LOGSTASH_PIPELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_logstash_pipelines',
  summary: `Get all Logstash pipelines`,
  description: `Get a list of all centrally-managed Logstash pipelines.

To use this API, you must have either the \`logstash_admin\` built-in role or a customized Logstash reader role.
> info
> Limit the number of pipelines to 10,000 or fewer. As the number of pipelines nears and surpasses 10,000, you may see performance issues on Kibana.

The \`username\` property appears in the response when security is enabled and depends on when the pipeline was created or last updated.
`,
  methods: ['GET'],
  patterns: ['/api/logstash/pipelines'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_logstash_pipelines_request, 'body'),
    getLooseObjectFromProperty(get_logstash_pipelines_request, 'path'),
    getLooseObjectFromProperty(get_logstash_pipelines_request, 'query'),
  ]),
  outputSchema: get_logstash_pipelines_response,
};
const POST_MAINTENANCE_WINDOW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_maintenance_window',
  summary: `Create a maintenance window.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['POST'],
  patterns: ['/api/maintenance_window'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['enabled', 'schedule', 'scope', 'title'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_maintenance_window_request, 'body'),
    getLooseObjectFromProperty(post_maintenance_window_request, 'path'),
    getLooseObjectFromProperty(post_maintenance_window_request, 'query'),
  ]),
  outputSchema: post_maintenance_window_response,
};
const GET_MAINTENANCE_WINDOW_FIND_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_maintenance_window_find',
  summary: `Search for a maintenance window.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: read-maintenance-window.`,
  methods: ['GET'],
  patterns: ['/api/maintenance_window/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['title', 'created_by', 'status', 'page', 'per_page'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_maintenance_window_find_request, 'body'),
    getLooseObjectFromProperty(get_maintenance_window_find_request, 'path'),
    getLooseObjectFromProperty(get_maintenance_window_find_request, 'query'),
  ]),
  outputSchema: get_maintenance_window_find_response,
};
const DELETE_MAINTENANCE_WINDOW_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_maintenance_window_id',
  summary: `Delete a maintenance window.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['DELETE'],
  patterns: ['/api/maintenance_window/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_maintenance_window_id_request, 'body'),
    getLooseObjectFromProperty(delete_maintenance_window_id_request, 'path'),
    getLooseObjectFromProperty(delete_maintenance_window_id_request, 'query'),
  ]),
  outputSchema: delete_maintenance_window_id_response,
};
const GET_MAINTENANCE_WINDOW_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_maintenance_window_id',
  summary: `Get maintenance window details.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: read-maintenance-window.`,
  methods: ['GET'],
  patterns: ['/api/maintenance_window/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_maintenance_window_id_request, 'body'),
    getLooseObjectFromProperty(get_maintenance_window_id_request, 'path'),
    getLooseObjectFromProperty(get_maintenance_window_id_request, 'query'),
  ]),
  outputSchema: get_maintenance_window_id_response,
};
const PATCH_MAINTENANCE_WINDOW_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.patch_maintenance_window_id',
  summary: `Update a maintenance window.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['PATCH'],
  patterns: ['/api/maintenance_window/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['enabled', 'schedule', 'scope', 'title'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(patch_maintenance_window_id_request, 'body'),
    getLooseObjectFromProperty(patch_maintenance_window_id_request, 'path'),
    getLooseObjectFromProperty(patch_maintenance_window_id_request, 'query'),
  ]),
  outputSchema: patch_maintenance_window_id_response,
};
const POST_MAINTENANCE_WINDOW_ID_ARCHIVE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_maintenance_window_id_archive',
  summary: `Archive a maintenance window.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}/_archive</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['POST'],
  patterns: ['/api/maintenance_window/{id}/_archive'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_maintenance_window_id_archive_request, 'body'),
    getLooseObjectFromProperty(post_maintenance_window_id_archive_request, 'path'),
    getLooseObjectFromProperty(post_maintenance_window_id_archive_request, 'query'),
  ]),
  outputSchema: post_maintenance_window_id_archive_response,
};
const POST_MAINTENANCE_WINDOW_ID_UNARCHIVE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_maintenance_window_id_unarchive',
  summary: `Unarchive a maintenance window.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}/_unarchive</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['POST'],
  patterns: ['/api/maintenance_window/{id}/_unarchive'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_maintenance_window_id_unarchive_request, 'body'),
    getLooseObjectFromProperty(post_maintenance_window_id_unarchive_request, 'path'),
    getLooseObjectFromProperty(post_maintenance_window_id_unarchive_request, 'query'),
  ]),
  outputSchema: post_maintenance_window_id_unarchive_response,
};
const MLSYNC_CONTRACT: InternalConnectorContract = {
  type: 'kibana.mlSync',
  summary: `Sync saved objects in the default space`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/ml/saved_objects/sync</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Synchronizes Kibana saved objects for machine learning jobs and trained models in the default space. You must have \`all\` privileges for the **Machine Learning** feature in the **Analytics** section of the Kibana feature privileges. This API runs automatically when you start Kibana and periodically thereafter.
`,
  methods: ['GET'],
  patterns: ['/api/ml/saved_objects/sync'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['simulate'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(ml_sync_request, 'body'),
    getLooseObjectFromProperty(ml_sync_request, 'path'),
    getLooseObjectFromProperty(ml_sync_request, 'query'),
  ]),
  outputSchema: ml_sync_response,
};
const DELETENOTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteNote',
  summary: `Delete a note`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/note</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a note from a Timeline using the note ID.`,
  methods: ['DELETE'],
  patterns: ['/api/note'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_note_request, 'body'),
    getLooseObjectFromProperty(delete_note_request, 'path'),
    getLooseObjectFromProperty(delete_note_request, 'query'),
  ]),
  outputSchema: delete_note_response,
};
const GETNOTES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetNotes',
  summary: `Get notes`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/note</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get all notes for a given document.`,
  methods: ['GET'],
  patterns: ['/api/note'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(get_notes_request, 'body'),
    getLooseObjectFromProperty(get_notes_request, 'path'),
    getLooseObjectFromProperty(get_notes_request, 'query'),
  ]),
  outputSchema: get_notes_response,
};
const PERSISTNOTEROUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PersistNoteRoute',
  summary: `Add or update a note`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/note</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Add a note to a Timeline or update an existing note.`,
  methods: ['PATCH'],
  patterns: ['/api/note'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['note', 'noteId', 'version'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(persist_note_route_request, 'body'),
    getLooseObjectFromProperty(persist_note_route_request, 'path'),
    getLooseObjectFromProperty(persist_note_route_request, 'query'),
  ]),
  outputSchema: persist_note_route_response,
};
const OBSERVABILITY_AI_ASSISTANT_CHAT_COMPLETE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.observability_ai_assistant_chat_complete',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(observability_ai_assistant_chat_complete_request, 'body'),
    getLooseObjectFromProperty(observability_ai_assistant_chat_complete_request, 'path'),
    getLooseObjectFromProperty(observability_ai_assistant_chat_complete_request, 'query'),
  ]),
  outputSchema: observability_ai_assistant_chat_complete_response,
};
const OSQUERYFINDLIVEQUERIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryFindLiveQueries',
  summary: `Get live queries`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/live_queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all live queries.`,
  methods: ['GET'],
  patterns: ['/api/osquery/live_queries'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['kuery', 'page', 'pageSize', 'sort', 'sortOrder'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(osquery_find_live_queries_request, 'body'),
    getLooseObjectFromProperty(osquery_find_live_queries_request, 'path'),
    getLooseObjectFromProperty(osquery_find_live_queries_request, 'query'),
  ]),
  outputSchema: osquery_find_live_queries_response,
};
const OSQUERYCREATELIVEQUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryCreateLiveQuery',
  summary: `Create a live query`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/live_queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create and run a live query.`,
  methods: ['POST'],
  patterns: ['/api/osquery/live_queries'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(osquery_create_live_query_request, 'body'),
    getLooseObjectFromProperty(osquery_create_live_query_request, 'path'),
    getLooseObjectFromProperty(osquery_create_live_query_request, 'query'),
  ]),
  outputSchema: osquery_create_live_query_response,
};
const OSQUERYGETLIVEQUERYDETAILS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryGetLiveQueryDetails',
  summary: `Get live query details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/live_queries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a live query using the query ID.`,
  methods: ['GET'],
  patterns: ['/api/osquery/live_queries/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(osquery_get_live_query_details_request, 'body'),
    getLooseObjectFromProperty(osquery_get_live_query_details_request, 'path'),
    getLooseObjectFromProperty(osquery_get_live_query_details_request, 'query'),
  ]),
  outputSchema: osquery_get_live_query_details_response,
};
const OSQUERYGETLIVEQUERYRESULTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryGetLiveQueryResults',
  summary: `Get live query results`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/live_queries/{id}/results/{actionId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the results of a live query using the query action ID.`,
  methods: ['GET'],
  patterns: ['/api/osquery/live_queries/{id}/results/{actionId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id', 'actionId'],
    urlParams: ['kuery', 'page', 'pageSize', 'sort', 'sortOrder'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(osquery_get_live_query_results_request, 'body'),
    getLooseObjectFromProperty(osquery_get_live_query_results_request, 'path'),
    getLooseObjectFromProperty(osquery_get_live_query_results_request, 'query'),
  ]),
  outputSchema: osquery_get_live_query_results_response,
};
const OSQUERYFINDPACKS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryFindPacks',
  summary: `Get packs`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/packs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all query packs.`,
  methods: ['GET'],
  patterns: ['/api/osquery/packs'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'pageSize', 'sort', 'sortOrder'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(osquery_find_packs_request, 'body'),
    getLooseObjectFromProperty(osquery_find_packs_request, 'path'),
    getLooseObjectFromProperty(osquery_find_packs_request, 'query'),
  ]),
  outputSchema: osquery_find_packs_response,
};
const OSQUERYCREATEPACKS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryCreatePacks',
  summary: `Create a pack`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/packs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a query pack.`,
  methods: ['POST'],
  patterns: ['/api/osquery/packs'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(osquery_create_packs_request, 'body'),
    getLooseObjectFromProperty(osquery_create_packs_request, 'path'),
    getLooseObjectFromProperty(osquery_create_packs_request, 'query'),
  ]),
  outputSchema: osquery_create_packs_response,
};
const OSQUERYDELETEPACKS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryDeletePacks',
  summary: `Delete a pack`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/packs/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a query pack using the pack ID.`,
  methods: ['DELETE'],
  patterns: ['/api/osquery/packs/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(osquery_delete_packs_request, 'body'),
    getLooseObjectFromProperty(osquery_delete_packs_request, 'path'),
    getLooseObjectFromProperty(osquery_delete_packs_request, 'query'),
  ]),
  outputSchema: osquery_delete_packs_response,
};
const OSQUERYGETPACKSDETAILS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryGetPacksDetails',
  summary: `Get pack details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/packs/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a query pack using the pack ID.`,
  methods: ['GET'],
  patterns: ['/api/osquery/packs/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(osquery_get_packs_details_request, 'body'),
    getLooseObjectFromProperty(osquery_get_packs_details_request, 'path'),
    getLooseObjectFromProperty(osquery_get_packs_details_request, 'query'),
  ]),
  outputSchema: osquery_get_packs_details_response,
};
const OSQUERYUPDATEPACKS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryUpdatePacks',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(osquery_update_packs_request, 'body'),
    getLooseObjectFromProperty(osquery_update_packs_request, 'path'),
    getLooseObjectFromProperty(osquery_update_packs_request, 'query'),
  ]),
  outputSchema: osquery_update_packs_response,
};
const OSQUERYFINDSAVEDQUERIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryFindSavedQueries',
  summary: `Get saved queries`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/saved_queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all saved queries.`,
  methods: ['GET'],
  patterns: ['/api/osquery/saved_queries'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'pageSize', 'sort', 'sortOrder'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(osquery_find_saved_queries_request, 'body'),
    getLooseObjectFromProperty(osquery_find_saved_queries_request, 'path'),
    getLooseObjectFromProperty(osquery_find_saved_queries_request, 'query'),
  ]),
  outputSchema: osquery_find_saved_queries_response,
};
const OSQUERYCREATESAVEDQUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryCreateSavedQuery',
  summary: `Create a saved query`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/saved_queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create and run a saved query.`,
  methods: ['POST'],
  patterns: ['/api/osquery/saved_queries'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(osquery_create_saved_query_request, 'body'),
    getLooseObjectFromProperty(osquery_create_saved_query_request, 'path'),
    getLooseObjectFromProperty(osquery_create_saved_query_request, 'query'),
  ]),
  outputSchema: osquery_create_saved_query_response,
};
const OSQUERYDELETESAVEDQUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryDeleteSavedQuery',
  summary: `Delete a saved query`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/saved_queries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a saved query using the query ID.`,
  methods: ['DELETE'],
  patterns: ['/api/osquery/saved_queries/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(osquery_delete_saved_query_request, 'body'),
    getLooseObjectFromProperty(osquery_delete_saved_query_request, 'path'),
    getLooseObjectFromProperty(osquery_delete_saved_query_request, 'query'),
  ]),
  outputSchema: osquery_delete_saved_query_response,
};
const OSQUERYGETSAVEDQUERYDETAILS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryGetSavedQueryDetails',
  summary: `Get saved query details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/saved_queries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a saved query using the query ID.`,
  methods: ['GET'],
  patterns: ['/api/osquery/saved_queries/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(osquery_get_saved_query_details_request, 'body'),
    getLooseObjectFromProperty(osquery_get_saved_query_details_request, 'path'),
    getLooseObjectFromProperty(osquery_get_saved_query_details_request, 'query'),
  ]),
  outputSchema: osquery_get_saved_query_details_response,
};
const OSQUERYUPDATESAVEDQUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryUpdateSavedQuery',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(osquery_update_saved_query_request, 'body'),
    getLooseObjectFromProperty(osquery_update_saved_query_request, 'path'),
    getLooseObjectFromProperty(osquery_update_saved_query_request, 'query'),
  ]),
  outputSchema: osquery_update_saved_query_response,
};
const PERSISTPINNEDEVENTROUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PersistPinnedEventRoute',
  summary: `Pin/unpin an event`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/pinned_event</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Pin/unpin an event to/from an existing Timeline.`,
  methods: ['PATCH'],
  patterns: ['/api/pinned_event'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['eventId', 'pinnedEventId', 'timelineId'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(persist_pinned_event_route_request, 'body'),
    getLooseObjectFromProperty(persist_pinned_event_route_request, 'path'),
    getLooseObjectFromProperty(persist_pinned_event_route_request, 'query'),
  ]),
  outputSchema: persist_pinned_event_route_response,
};
const CLEANUPRISKENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CleanUpRiskEngine',
  summary: `Cleanup the Risk Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/risk_score/engine/dangerously_delete_data</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Cleaning up the the Risk Engine by removing the indices, mapping and transforms`,
  methods: ['DELETE'],
  patterns: ['/api/risk_score/engine/dangerously_delete_data'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(clean_up_risk_engine_request, 'body'),
    getLooseObjectFromProperty(clean_up_risk_engine_request, 'path'),
    getLooseObjectFromProperty(clean_up_risk_engine_request, 'query'),
  ]),
  outputSchema: clean_up_risk_engine_response,
};
const CONFIGURERISKENGINESAVEDOBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ConfigureRiskEngineSavedObject',
  summary: `Configure the Risk Engine Saved Object`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/risk_score/engine/saved_object/configure</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Configuring the Risk Engine Saved Object`,
  methods: ['PATCH'],
  patterns: ['/api/risk_score/engine/saved_object/configure'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(configure_risk_engine_saved_object_request, 'body'),
    getLooseObjectFromProperty(configure_risk_engine_saved_object_request, 'path'),
    getLooseObjectFromProperty(configure_risk_engine_saved_object_request, 'query'),
  ]),
  outputSchema: configure_risk_engine_saved_object_response,
};
const SCHEDULERISKENGINENOW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ScheduleRiskEngineNow',
  summary: `Run the risk scoring engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/risk_score/engine/schedule_now</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Schedule the risk scoring engine to run as soon as possible. You can use this to recalculate entity risk scores after updating their asset criticality.`,
  methods: ['POST'],
  patterns: ['/api/risk_score/engine/schedule_now'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(schedule_risk_engine_now_request, 'body'),
    getLooseObjectFromProperty(schedule_risk_engine_now_request, 'path'),
    getLooseObjectFromProperty(schedule_risk_engine_now_request, 'query'),
  ]),
  outputSchema: schedule_risk_engine_now_response,
};
const BULKCREATESAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkCreateSavedObjects',
  summary: `Create saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_create</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_bulk_create'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['overwrite'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(bulk_create_saved_objects_request, 'body'),
    getLooseObjectFromProperty(bulk_create_saved_objects_request, 'path'),
    getLooseObjectFromProperty(bulk_create_saved_objects_request, 'query'),
  ]),
  outputSchema: bulk_create_saved_objects_response,
};
const BULKDELETESAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkDeleteSavedObjects',
  summary: `Delete saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: When you delete a saved object, it cannot be recovered.
`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_bulk_delete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(bulk_delete_saved_objects_request, 'body'),
    getLooseObjectFromProperty(bulk_delete_saved_objects_request, 'path'),
    getLooseObjectFromProperty(bulk_delete_saved_objects_request, 'query'),
  ]),
  outputSchema: bulk_delete_saved_objects_response,
};
const BULKGETSAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkGetSavedObjects',
  summary: `Get saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_get</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_bulk_get'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(bulk_get_saved_objects_request, 'body'),
    getLooseObjectFromProperty(bulk_get_saved_objects_request, 'path'),
    getLooseObjectFromProperty(bulk_get_saved_objects_request, 'query'),
  ]),
  outputSchema: bulk_get_saved_objects_response,
};
const BULKRESOLVESAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkResolveSavedObjects',
  summary: `Resolve saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_resolve</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve multiple Kibana saved objects by identifier using any legacy URL aliases if they exist. Under certain circumstances when Kibana is upgraded, saved object migrations may necessitate regenerating some object IDs to enable new features. When an object's ID is regenerated, a legacy URL alias is created for that object, preserving its old ID. In such a scenario, that object can be retrieved by the bulk resolve API using either its new ID or its old ID.
`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_bulk_resolve'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(bulk_resolve_saved_objects_request, 'body'),
    getLooseObjectFromProperty(bulk_resolve_saved_objects_request, 'path'),
    getLooseObjectFromProperty(bulk_resolve_saved_objects_request, 'query'),
  ]),
  outputSchema: bulk_resolve_saved_objects_response,
};
const BULKUPDATESAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkUpdateSavedObjects',
  summary: `Update saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_update</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update the attributes for multiple Kibana saved objects.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_bulk_update'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(bulk_update_saved_objects_request, 'body'),
    getLooseObjectFromProperty(bulk_update_saved_objects_request, 'path'),
    getLooseObjectFromProperty(bulk_update_saved_objects_request, 'query'),
  ]),
  outputSchema: bulk_update_saved_objects_response,
};
const POST_SAVED_OBJECTS_EXPORT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_saved_objects_export',
  summary: `Export saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve sets of saved objects that you want to import into Kibana. You must include \`type\` or \`objects\` in the request body. The output of exporting saved objects must be treated as opaque. Tampering with exported data risks introducing unspecified errors and data loss.

Exported saved objects are not backwards compatible and cannot be imported into an older version of Kibana.

NOTE: The \`savedObjects.maxImportExportSize\` configuration setting limits the number of saved objects which may be exported.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_export'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(post_saved_objects_export_request, 'body'),
    getLooseObjectFromProperty(post_saved_objects_export_request, 'path'),
    getLooseObjectFromProperty(post_saved_objects_export_request, 'query'),
  ]),
  outputSchema: post_saved_objects_export_response,
};
const FINDSAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findSavedObjects',
  summary: `Search for saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a paginated set of Kibana saved objects.`,
  methods: ['GET'],
  patterns: ['/api/saved_objects/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(find_saved_objects_request, 'body'),
    getLooseObjectFromProperty(find_saved_objects_request, 'path'),
    getLooseObjectFromProperty(find_saved_objects_request, 'query'),
  ]),
  outputSchema: find_saved_objects_response,
};
const POST_SAVED_OBJECTS_IMPORT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_saved_objects_import',
  summary: `Import saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create sets of Kibana saved objects from a file created by the export API. Saved objects can only be imported into the same version, a newer minor on the same major, or the next major. Tampering with exported data risks introducing unspecified errors and data loss.

Exported saved objects are not backwards compatible and cannot be imported into an older version of Kibana.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_import'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['overwrite', 'createNewCopies', 'compatibilityMode'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_saved_objects_import_request, 'body'),
    getLooseObjectFromProperty(post_saved_objects_import_request, 'path'),
    getLooseObjectFromProperty(post_saved_objects_import_request, 'query'),
  ]),
  outputSchema: post_saved_objects_import_response,
};
const RESOLVEIMPORTERRORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.resolveImportErrors',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['compatibilityMode', 'createNewCopies'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(resolve_import_errors_request, 'body'),
    getLooseObjectFromProperty(resolve_import_errors_request, 'path'),
    getLooseObjectFromProperty(resolve_import_errors_request, 'query'),
  ]),
  outputSchema: resolve_import_errors_response,
};
const CREATESAVEDOBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createSavedObject',
  summary: `Create a saved object`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/{type}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a Kibana saved object with a randomly generated identifier.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/{type}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['type'],
    urlParams: ['overwrite'],
    bodyParams: ['attributes', 'initialNamespaces', 'references'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_saved_object_request, 'body'),
    getLooseObjectFromProperty(create_saved_object_request, 'path'),
    getLooseObjectFromProperty(create_saved_object_request, 'query'),
  ]),
  outputSchema: create_saved_object_response,
};
const GETSAVEDOBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getSavedObject',
  summary: `Get a saved object`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/{type}/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a single Kibana saved object by identifier.`,
  methods: ['GET'],
  patterns: ['/api/saved_objects/{type}/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id', 'type'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_saved_object_request, 'body'),
    getLooseObjectFromProperty(get_saved_object_request, 'path'),
    getLooseObjectFromProperty(get_saved_object_request, 'query'),
  ]),
  outputSchema: get_saved_object_response,
};
const CREATESAVEDOBJECTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createSavedObjectId',
  summary: `Create a saved object`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/{type}/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a Kibana saved object and specify its identifier instead of using a randomly generated ID.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/{type}/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id', 'type'],
    urlParams: ['overwrite'],
    bodyParams: ['attributes', 'initialNamespaces', 'references'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_saved_object_id_request, 'body'),
    getLooseObjectFromProperty(create_saved_object_id_request, 'path'),
    getLooseObjectFromProperty(create_saved_object_id_request, 'query'),
  ]),
  outputSchema: create_saved_object_id_response,
};
const UPDATESAVEDOBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateSavedObject',
  summary: `Update a saved object`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/{type}/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update the attributes for Kibana saved objects.`,
  methods: ['PUT'],
  patterns: ['/api/saved_objects/{type}/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id', 'type'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_saved_object_request, 'body'),
    getLooseObjectFromProperty(update_saved_object_request, 'path'),
    getLooseObjectFromProperty(update_saved_object_request, 'query'),
  ]),
  outputSchema: update_saved_object_response,
};
const RESOLVESAVEDOBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.resolveSavedObject',
  summary: `Resolve a saved object`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/resolve/{type}/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a single Kibana saved object by identifier using any legacy URL alias if it exists. Under certain circumstances, when Kibana is upgraded, saved object migrations may necessitate regenerating some object IDs to enable new features. When an object's ID is regenerated, a legacy URL alias is created for that object, preserving its old ID. In such a scenario, that object can be retrieved using either its new ID or its old ID.
`,
  methods: ['GET'],
  patterns: ['/api/saved_objects/resolve/{type}/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id', 'type'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(resolve_saved_object_request, 'body'),
    getLooseObjectFromProperty(resolve_saved_object_request, 'path'),
    getLooseObjectFromProperty(resolve_saved_object_request, 'query'),
  ]),
  outputSchema: resolve_saved_object_response,
};
const PERFORMANONYMIZATIONFIELDSBULKACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PerformAnonymizationFieldsBulkAction',
  summary: `Apply a bulk action to anonymization fields`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/anonymization_fields/_bulk_action</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Apply a bulk action to multiple anonymization fields. The bulk action is applied to all anonymization fields that match the filter or to the list of anonymization fields by their IDs.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/anonymization_fields/_bulk_action'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['create', 'delete', 'update'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(perform_anonymization_fields_bulk_action_request, 'body'),
    getLooseObjectFromProperty(perform_anonymization_fields_bulk_action_request, 'path'),
    getLooseObjectFromProperty(perform_anonymization_fields_bulk_action_request, 'query'),
  ]),
  outputSchema: perform_anonymization_fields_bulk_action_response,
};
const FINDANONYMIZATIONFIELDS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindAnonymizationFields',
  summary: `Get anonymization fields`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/anonymization_fields/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all anonymization fields.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/anonymization_fields/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['fields', 'filter', 'sort_field', 'sort_order', 'page', 'per_page', 'all_data'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(find_anonymization_fields_request, 'body'),
    getLooseObjectFromProperty(find_anonymization_fields_request, 'path'),
    getLooseObjectFromProperty(find_anonymization_fields_request, 'query'),
  ]),
  outputSchema: find_anonymization_fields_response,
};
const CHATCOMPLETE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ChatComplete',
  summary: `Create a model response`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/chat/complete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a model response for the given chat conversation.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/chat/complete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['content_references_disabled'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(chat_complete_request, 'body'),
    getLooseObjectFromProperty(chat_complete_request, 'path'),
    getLooseObjectFromProperty(chat_complete_request, 'query'),
  ]),
  outputSchema: chat_complete_response,
};
const DELETEALLCONVERSATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteAllConversations',
  summary: `Delete conversations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

This endpoint allows users to permanently delete all conversations.`,
  methods: ['DELETE'],
  patterns: ['/api/security_ai_assistant/current_user/conversations'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['excludedIds'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_all_conversations_request, 'body'),
    getLooseObjectFromProperty(delete_all_conversations_request, 'path'),
    getLooseObjectFromProperty(delete_all_conversations_request, 'query'),
  ]),
  outputSchema: delete_all_conversations_response,
};
const CREATECONVERSATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateConversation',
  summary: `Create a conversation`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new Security AI Assistant conversation. This endpoint allows the user to initiate a conversation with the Security AI Assistant by providing the required parameters.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/current_user/conversations'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_conversation_request, 'body'),
    getLooseObjectFromProperty(create_conversation_request, 'path'),
    getLooseObjectFromProperty(create_conversation_request, 'query'),
  ]),
  outputSchema: create_conversation_response,
};
const FINDCONVERSATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindConversations',
  summary: `Get conversations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all conversations for the current user. This endpoint allows users to search, filter, sort, and paginate through their conversations.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/current_user/conversations/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['fields', 'filter', 'sort_field', 'sort_order', 'page', 'per_page', 'is_owner'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(find_conversations_request, 'body'),
    getLooseObjectFromProperty(find_conversations_request, 'path'),
    getLooseObjectFromProperty(find_conversations_request, 'query'),
  ]),
  outputSchema: find_conversations_response,
};
const DELETECONVERSATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteConversation',
  summary: `Delete a conversation`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an existing conversation using the conversation ID. This endpoint allows users to permanently delete a conversation.`,
  methods: ['DELETE'],
  patterns: ['/api/security_ai_assistant/current_user/conversations/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_conversation_request, 'body'),
    getLooseObjectFromProperty(delete_conversation_request, 'path'),
    getLooseObjectFromProperty(delete_conversation_request, 'query'),
  ]),
  outputSchema: delete_conversation_response,
};
const READCONVERSATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadConversation',
  summary: `Get a conversation`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an existing conversation using the conversation ID. This allows users to fetch the specific conversation data by its unique ID.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/current_user/conversations/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_conversation_request, 'body'),
    getLooseObjectFromProperty(read_conversation_request, 'path'),
    getLooseObjectFromProperty(read_conversation_request, 'query'),
  ]),
  outputSchema: read_conversation_response,
};
const UPDATECONVERSATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateConversation',
  summary: `Update a conversation`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing conversation using the conversation ID. This endpoint allows users to modify the details of an existing conversation.`,
  methods: ['PUT'],
  patterns: ['/api/security_ai_assistant/current_user/conversations/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_conversation_request, 'body'),
    getLooseObjectFromProperty(update_conversation_request, 'path'),
    getLooseObjectFromProperty(update_conversation_request, 'query'),
  ]),
  outputSchema: update_conversation_response,
};
const GETKNOWLEDGEBASE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetKnowledgeBase',
  summary: `Read a KnowledgeBase`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Read a single KB`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/knowledge_base'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_knowledge_base_request, 'body'),
    getLooseObjectFromProperty(get_knowledge_base_request, 'path'),
    getLooseObjectFromProperty(get_knowledge_base_request, 'query'),
  ]),
  outputSchema: get_knowledge_base_response,
};
const POSTKNOWLEDGEBASE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PostKnowledgeBase',
  summary: `Create a KnowledgeBase`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/knowledge_base'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['modelId', 'ignoreSecurityLabs'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_knowledge_base_request, 'body'),
    getLooseObjectFromProperty(post_knowledge_base_request, 'path'),
    getLooseObjectFromProperty(post_knowledge_base_request, 'query'),
  ]),
  outputSchema: post_knowledge_base_response,
};
const READKNOWLEDGEBASE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadKnowledgeBase',
  summary: `Read a KnowledgeBase for a resource`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/{resource}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Read a knowledge base with a specific resource identifier.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/knowledge_base/{resource}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['resource'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_knowledge_base_request, 'body'),
    getLooseObjectFromProperty(read_knowledge_base_request, 'path'),
    getLooseObjectFromProperty(read_knowledge_base_request, 'query'),
  ]),
  outputSchema: read_knowledge_base_response,
};
const CREATEKNOWLEDGEBASE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateKnowledgeBase',
  summary: `Create a KnowledgeBase for a resource`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/{resource}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a knowledge base with a specific resource identifier.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/knowledge_base/{resource}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['resource'],
    urlParams: ['modelId', 'ignoreSecurityLabs'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_knowledge_base_request, 'body'),
    getLooseObjectFromProperty(create_knowledge_base_request, 'path'),
    getLooseObjectFromProperty(create_knowledge_base_request, 'query'),
  ]),
  outputSchema: create_knowledge_base_response,
};
const CREATEKNOWLEDGEBASEENTRY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateKnowledgeBaseEntry',
  summary: `Create a Knowledge Base Entry`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a Knowledge Base Entry`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_knowledge_base_entry_request, 'body'),
    getLooseObjectFromProperty(create_knowledge_base_entry_request, 'path'),
    getLooseObjectFromProperty(create_knowledge_base_entry_request, 'query'),
  ]),
  outputSchema: create_knowledge_base_entry_response,
};
const PERFORMKNOWLEDGEBASEENTRYBULKACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PerformKnowledgeBaseEntryBulkAction',
  summary: `Applies a bulk action to multiple Knowledge Base Entries`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/_bulk_action</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

The bulk action is applied to all Knowledge Base Entries that match the filter or to the list of Knowledge Base Entries by their IDs.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/_bulk_action'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['create', 'delete', 'update'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(perform_knowledge_base_entry_bulk_action_request, 'body'),
    getLooseObjectFromProperty(perform_knowledge_base_entry_bulk_action_request, 'path'),
    getLooseObjectFromProperty(perform_knowledge_base_entry_bulk_action_request, 'query'),
  ]),
  outputSchema: perform_knowledge_base_entry_bulk_action_response,
};
const FINDKNOWLEDGEBASEENTRIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindKnowledgeBaseEntries',
  summary: `Finds Knowledge Base Entries that match the given query.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Finds Knowledge Base Entries that match the given query.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['fields', 'filter', 'sort_field', 'sort_order', 'page', 'per_page'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(find_knowledge_base_entries_request, 'body'),
    getLooseObjectFromProperty(find_knowledge_base_entries_request, 'path'),
    getLooseObjectFromProperty(find_knowledge_base_entries_request, 'query'),
  ]),
  outputSchema: find_knowledge_base_entries_response,
};
const DELETEKNOWLEDGEBASEENTRY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteKnowledgeBaseEntry',
  summary: `Deletes a single Knowledge Base Entry using the \`id\` field`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a Knowledge Base Entry by its unique \`id\`.`,
  methods: ['DELETE'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_knowledge_base_entry_request, 'body'),
    getLooseObjectFromProperty(delete_knowledge_base_entry_request, 'path'),
    getLooseObjectFromProperty(delete_knowledge_base_entry_request, 'query'),
  ]),
  outputSchema: delete_knowledge_base_entry_response,
};
const READKNOWLEDGEBASEENTRY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadKnowledgeBaseEntry',
  summary: `Read a Knowledge Base Entry`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a Knowledge Base Entry by its unique \`id\`.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(read_knowledge_base_entry_request, 'body'),
    getLooseObjectFromProperty(read_knowledge_base_entry_request, 'path'),
    getLooseObjectFromProperty(read_knowledge_base_entry_request, 'query'),
  ]),
  outputSchema: read_knowledge_base_entry_response,
};
const UPDATEKNOWLEDGEBASEENTRY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateKnowledgeBaseEntry',
  summary: `Update a Knowledge Base Entry`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing Knowledge Base Entry by its unique \`id\`.`,
  methods: ['PUT'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_knowledge_base_entry_request, 'body'),
    getLooseObjectFromProperty(update_knowledge_base_entry_request, 'path'),
    getLooseObjectFromProperty(update_knowledge_base_entry_request, 'query'),
  ]),
  outputSchema: update_knowledge_base_entry_response,
};
const PERFORMPROMPTSBULKACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PerformPromptsBulkAction',
  summary: `Apply a bulk action to prompts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/prompts/_bulk_action</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Apply a bulk action to multiple prompts. The bulk action is applied to all prompts that match the filter or to the list of prompts by their IDs. This action allows for bulk create, update, or delete operations.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/prompts/_bulk_action'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['create', 'delete', 'update'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(perform_prompts_bulk_action_request, 'body'),
    getLooseObjectFromProperty(perform_prompts_bulk_action_request, 'path'),
    getLooseObjectFromProperty(perform_prompts_bulk_action_request, 'query'),
  ]),
  outputSchema: perform_prompts_bulk_action_response,
};
const FINDPROMPTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindPrompts',
  summary: `Get prompts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/prompts/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all prompts based on optional filters, sorting, and pagination.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/prompts/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['fields', 'filter', 'sort_field', 'sort_order', 'page', 'per_page'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(find_prompts_request, 'body'),
    getLooseObjectFromProperty(find_prompts_request, 'path'),
    getLooseObjectFromProperty(find_prompts_request, 'query'),
  ]),
  outputSchema: find_prompts_response,
};
const GET_SECURITY_ROLE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_security_role',
  summary: `Get all roles`,
  description: ``,
  methods: ['GET'],
  patterns: ['/api/security/role'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['replaceDeprecatedPrivileges'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_security_role_request, 'body'),
    getLooseObjectFromProperty(get_security_role_request, 'path'),
    getLooseObjectFromProperty(get_security_role_request, 'query'),
  ]),
  outputSchema: get_security_role_response,
};
const POST_SECURITY_ROLE_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_security_role_query',
  summary: `Query roles`,
  description: ``,
  methods: ['POST'],
  patterns: ['/api/security/role/_query'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['filters', 'from', 'query', 'size', 'sort'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_security_role_query_request, 'body'),
    getLooseObjectFromProperty(post_security_role_query_request, 'path'),
    getLooseObjectFromProperty(post_security_role_query_request, 'query'),
  ]),
  outputSchema: post_security_role_query_response,
};
const DELETE_SECURITY_ROLE_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_security_role_name',
  summary: `Delete a role`,
  description: ``,
  methods: ['DELETE'],
  patterns: ['/api/security/role/{name}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_security_role_name_request, 'body'),
    getLooseObjectFromProperty(delete_security_role_name_request, 'path'),
    getLooseObjectFromProperty(delete_security_role_name_request, 'query'),
  ]),
  outputSchema: delete_security_role_name_response,
};
const GET_SECURITY_ROLE_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_security_role_name',
  summary: `Get a role`,
  description: ``,
  methods: ['GET'],
  patterns: ['/api/security/role/{name}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['replaceDeprecatedPrivileges'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_security_role_name_request, 'body'),
    getLooseObjectFromProperty(get_security_role_name_request, 'path'),
    getLooseObjectFromProperty(get_security_role_name_request, 'query'),
  ]),
  outputSchema: get_security_role_name_response,
};
const PUT_SECURITY_ROLE_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_security_role_name',
  summary: `Create or update a role`,
  description: `Create a new Kibana role or update the attributes of an existing role. Kibana roles are stored in the Elasticsearch native realm.`,
  methods: ['PUT'],
  patterns: ['/api/security/role/{name}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['createOnly'],
    bodyParams: ['description', 'elasticsearch', 'kibana', 'metadata'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_security_role_name_request, 'body'),
    getLooseObjectFromProperty(put_security_role_name_request, 'path'),
    getLooseObjectFromProperty(put_security_role_name_request, 'query'),
  ]),
  outputSchema: put_security_role_name_response,
};
const POST_SECURITY_ROLES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_security_roles',
  summary: `Create or update roles`,
  description: ``,
  methods: ['POST'],
  patterns: ['/api/security/roles'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['roles'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_security_roles_request, 'body'),
    getLooseObjectFromProperty(post_security_roles_request, 'path'),
    getLooseObjectFromProperty(post_security_roles_request, 'query'),
  ]),
  outputSchema: post_security_roles_response,
};
const POST_SECURITY_SESSION_INVALIDATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_security_session_invalidate',
  summary: `Invalidate user sessions`,
  description: `Invalidate user sessions that match a query. To use this API, you must be a superuser.
`,
  methods: ['POST'],
  patterns: ['/api/security/session/_invalidate'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['match', 'query'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_security_session_invalidate_request, 'body'),
    getLooseObjectFromProperty(post_security_session_invalidate_request, 'path'),
    getLooseObjectFromProperty(post_security_session_invalidate_request, 'query'),
  ]),
  outputSchema: post_security_session_invalidate_response,
};
const POST_URL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_url',
  summary: `Create a short URL`,
  description: `Kibana URLs may be long and cumbersome, short URLs are much easier to remember and share.
Short URLs are created by specifying the locator ID and locator parameters. When a short URL is resolved, the locator ID and locator parameters are used to redirect user to the right Kibana page.
`,
  methods: ['POST'],
  patterns: ['/api/short_url'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['humanReadableSlug', 'locatorId', 'params', 'slug'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_url_request, 'body'),
    getLooseObjectFromProperty(post_url_request, 'path'),
    getLooseObjectFromProperty(post_url_request, 'query'),
  ]),
  outputSchema: post_url_response,
};
const RESOLVE_URL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.resolve_url',
  summary: `Resolve a short URL`,
  description: `Resolve a Kibana short URL by its slug.
`,
  methods: ['GET'],
  patterns: ['/api/short_url/_slug/{slug}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['slug'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(resolve_url_request, 'body'),
    getLooseObjectFromProperty(resolve_url_request, 'path'),
    getLooseObjectFromProperty(resolve_url_request, 'query'),
  ]),
  outputSchema: resolve_url_response,
};
const DELETE_URL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_url',
  summary: `Delete a short URL`,
  description: `Delete a Kibana short URL.
`,
  methods: ['DELETE'],
  patterns: ['/api/short_url/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_url_request, 'body'),
    getLooseObjectFromProperty(delete_url_request, 'path'),
    getLooseObjectFromProperty(delete_url_request, 'query'),
  ]),
  outputSchema: delete_url_response,
};
const GET_URL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_url',
  summary: `Get a short URL`,
  description: `Get a single Kibana short URL.
`,
  methods: ['GET'],
  patterns: ['/api/short_url/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_url_request, 'body'),
    getLooseObjectFromProperty(get_url_request, 'path'),
    getLooseObjectFromProperty(get_url_request, 'query'),
  ]),
  outputSchema: get_url_response,
};
const POST_SPACES_COPY_SAVED_OBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_copy_saved_objects',
  summary: `Copy saved objects between spaces`,
  description: `It also allows you to automatically copy related objects, so when you copy a dashboard, this can automatically copy over the associated visualizations, data views, and saved Discover sessions, as required. You can request to overwrite any objects that already exist in the target space if they share an identifier or you can use the resolve copy saved objects conflicts API to do this on a per-object basis.<br/><br/>[Required authorization] Route required privileges: copySavedObjectsToSpaces.`,
  methods: ['POST'],
  patterns: ['/api/spaces/_copy_saved_objects'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(post_spaces_copy_saved_objects_request, 'body'),
    getLooseObjectFromProperty(post_spaces_copy_saved_objects_request, 'path'),
    getLooseObjectFromProperty(post_spaces_copy_saved_objects_request, 'query'),
  ]),
  outputSchema: post_spaces_copy_saved_objects_response,
};
const POST_SPACES_DISABLE_LEGACY_URL_ALIASES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_disable_legacy_url_aliases',
  summary: `Disable legacy URL aliases`,
  description: ``,
  methods: ['POST'],
  patterns: ['/api/spaces/_disable_legacy_url_aliases'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['aliases'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_spaces_disable_legacy_url_aliases_request, 'body'),
    getLooseObjectFromProperty(post_spaces_disable_legacy_url_aliases_request, 'path'),
    getLooseObjectFromProperty(post_spaces_disable_legacy_url_aliases_request, 'query'),
  ]),
  outputSchema: post_spaces_disable_legacy_url_aliases_response,
};
const POST_SPACES_GET_SHAREABLE_REFERENCES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_get_shareable_references',
  summary: `Get shareable references`,
  description: `Collect references and space contexts for saved objects.`,
  methods: ['POST'],
  patterns: ['/api/spaces/_get_shareable_references'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['objects'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_spaces_get_shareable_references_request, 'body'),
    getLooseObjectFromProperty(post_spaces_get_shareable_references_request, 'path'),
    getLooseObjectFromProperty(post_spaces_get_shareable_references_request, 'query'),
  ]),
  outputSchema: post_spaces_get_shareable_references_response,
};
const POST_SPACES_RESOLVE_COPY_SAVED_OBJECTS_ERRORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_resolve_copy_saved_objects_errors',
  summary: `Resolve conflicts copying saved objects`,
  description: `Overwrite saved objects that are returned as errors from the copy saved objects to space API.<br/><br/>[Required authorization] Route required privileges: copySavedObjectsToSpaces.`,
  methods: ['POST'],
  patterns: ['/api/spaces/_resolve_copy_saved_objects_errors'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['compatibilityMode', 'createNewCopies', 'includeReferences', 'objects', 'retries'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_spaces_resolve_copy_saved_objects_errors_request, 'body'),
    getLooseObjectFromProperty(post_spaces_resolve_copy_saved_objects_errors_request, 'path'),
    getLooseObjectFromProperty(post_spaces_resolve_copy_saved_objects_errors_request, 'query'),
  ]),
  outputSchema: post_spaces_resolve_copy_saved_objects_errors_response,
};
const POST_SPACES_UPDATE_OBJECTS_SPACES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_update_objects_spaces',
  summary: `Update saved objects in spaces`,
  description: `Update one or more saved objects to add or remove them from some spaces.`,
  methods: ['POST'],
  patterns: ['/api/spaces/_update_objects_spaces'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['objects', 'spacesToAdd', 'spacesToRemove'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_spaces_update_objects_spaces_request, 'body'),
    getLooseObjectFromProperty(post_spaces_update_objects_spaces_request, 'path'),
    getLooseObjectFromProperty(post_spaces_update_objects_spaces_request, 'query'),
  ]),
  outputSchema: post_spaces_update_objects_spaces_response,
};
const GET_SPACES_SPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_spaces_space',
  summary: `Get all spaces`,
  description: ``,
  methods: ['GET'],
  patterns: ['/api/spaces/space'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['purpose', 'include_authorized_purposes'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_spaces_space_request, 'body'),
    getLooseObjectFromProperty(get_spaces_space_request, 'path'),
    getLooseObjectFromProperty(get_spaces_space_request, 'query'),
  ]),
  outputSchema: get_spaces_space_response,
};
const POST_SPACES_SPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_space',
  summary: `Create a space`,
  description: ``,
  methods: ['POST'],
  patterns: ['/api/spaces/space'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(post_spaces_space_request, 'body'),
    getLooseObjectFromProperty(post_spaces_space_request, 'path'),
    getLooseObjectFromProperty(post_spaces_space_request, 'query'),
  ]),
  outputSchema: post_spaces_space_response,
};
const DELETE_SPACES_SPACE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_spaces_space_id',
  summary: `Delete a space`,
  description: `When you delete a space, all saved objects that belong to the space are automatically deleted, which is permanent and cannot be undone.`,
  methods: ['DELETE'],
  patterns: ['/api/spaces/space/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_spaces_space_id_request, 'body'),
    getLooseObjectFromProperty(delete_spaces_space_id_request, 'path'),
    getLooseObjectFromProperty(delete_spaces_space_id_request, 'query'),
  ]),
  outputSchema: delete_spaces_space_id_response,
};
const GET_SPACES_SPACE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_spaces_space_id',
  summary: `Get a space`,
  description: ``,
  methods: ['GET'],
  patterns: ['/api/spaces/space/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_spaces_space_id_request, 'body'),
    getLooseObjectFromProperty(get_spaces_space_id_request, 'path'),
    getLooseObjectFromProperty(get_spaces_space_id_request, 'query'),
  ]),
  outputSchema: get_spaces_space_id_response,
};
const PUT_SPACES_SPACE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_spaces_space_id',
  summary: `Update a space`,
  description: ``,
  methods: ['PUT'],
  patterns: ['/api/spaces/space/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(put_spaces_space_id_request, 'body'),
    getLooseObjectFromProperty(put_spaces_space_id_request, 'path'),
    getLooseObjectFromProperty(put_spaces_space_id_request, 'query'),
  ]),
  outputSchema: put_spaces_space_id_response,
};
const GET_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_status',
  summary: `Get Kibana's current status`,
  description: ``,
  methods: ['GET'],
  patterns: ['/api/status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['v7format', 'v8format'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_status_request, 'body'),
    getLooseObjectFromProperty(get_status_request, 'path'),
    getLooseObjectFromProperty(get_status_request, 'query'),
  ]),
  outputSchema: get_status_response,
};
const GET_STREAMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams',
  summary: `Get stream list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches list of all streams<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['GET'],
  patterns: ['/api/streams'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_streams_request, 'body'),
    getLooseObjectFromProperty(get_streams_request, 'path'),
    getLooseObjectFromProperty(get_streams_request, 'query'),
  ]),
  outputSchema: get_streams_response,
};
const POST_STREAMS_DISABLE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_disable',
  summary: `Disable streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/_disable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Disables wired streams and deletes all existing stream definitions. The data of wired streams is deleted, but the data of classic streams is preserved.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/_disable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_streams_disable_request, 'body'),
    getLooseObjectFromProperty(post_streams_disable_request, 'path'),
    getLooseObjectFromProperty(post_streams_disable_request, 'query'),
  ]),
  outputSchema: post_streams_disable_response,
};
const POST_STREAMS_ENABLE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_enable',
  summary: `Enable streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/_enable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Enables wired streams<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/_enable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_streams_enable_request, 'body'),
    getLooseObjectFromProperty(post_streams_enable_request, 'path'),
    getLooseObjectFromProperty(post_streams_enable_request, 'query'),
  ]),
  outputSchema: post_streams_enable_response,
};
const POST_STREAMS_RESYNC_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_resync',
  summary: `Resync streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/_resync</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Resyncs all streams, making sure that Elasticsearch assets are up to date<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/_resync'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_streams_resync_request, 'body'),
    getLooseObjectFromProperty(post_streams_resync_request, 'path'),
    getLooseObjectFromProperty(post_streams_resync_request, 'query'),
  ]),
  outputSchema: post_streams_resync_response,
};
const DELETE_STREAMS_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_streams_name',
  summary: `Delete a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Deletes a stream definition and the underlying data stream<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['DELETE'],
  patterns: ['/api/streams/{name}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_streams_name_request, 'body'),
    getLooseObjectFromProperty(delete_streams_name_request, 'path'),
    getLooseObjectFromProperty(delete_streams_name_request, 'query'),
  ]),
  outputSchema: delete_streams_name_response,
};
const GET_STREAMS_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name',
  summary: `Get a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches a stream definition and associated dashboards<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['GET'],
  patterns: ['/api/streams/{name}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_streams_name_request, 'body'),
    getLooseObjectFromProperty(get_streams_name_request, 'path'),
    getLooseObjectFromProperty(get_streams_name_request, 'query'),
  ]),
  outputSchema: get_streams_name_response,
};
const PUT_STREAMS_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name',
  summary: `Create or update a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Creates or updates a stream definition. Classic streams can not be created through this API, only updated<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['PUT'],
  patterns: ['/api/streams/{name}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_streams_name_request, 'body'),
    getLooseObjectFromProperty(put_streams_name_request, 'path'),
    getLooseObjectFromProperty(put_streams_name_request, 'query'),
  ]),
  outputSchema: put_streams_name_response,
};
const POST_STREAMS_NAME_FORK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_fork',
  summary: `Fork a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/_fork</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Forks a wired stream and creates a child stream<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/{name}/_fork'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: ['status', 'stream', 'where'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_streams_name_fork_request, 'body'),
    getLooseObjectFromProperty(post_streams_name_fork_request, 'path'),
    getLooseObjectFromProperty(post_streams_name_fork_request, 'query'),
  ]),
  outputSchema: post_streams_name_fork_response,
};
const GET_STREAMS_NAME_GROUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_group',
  summary: `Get group stream settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/_group</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches the group settings of a group stream definition<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['GET'],
  patterns: ['/api/streams/{name}/_group'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_streams_name_group_request, 'body'),
    getLooseObjectFromProperty(get_streams_name_group_request, 'path'),
    getLooseObjectFromProperty(get_streams_name_group_request, 'query'),
  ]),
  outputSchema: get_streams_name_group_response,
};
const PUT_STREAMS_NAME_GROUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_group',
  summary: `Upsert group stream settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/_group</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upserts the group settings of a group stream definition<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['PUT'],
  patterns: ['/api/streams/{name}/_group'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: ['group'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_streams_name_group_request, 'body'),
    getLooseObjectFromProperty(put_streams_name_group_request, 'path'),
    getLooseObjectFromProperty(put_streams_name_group_request, 'query'),
  ]),
  outputSchema: put_streams_name_group_response,
};
const GET_STREAMS_NAME_INGEST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_ingest',
  summary: `Get ingest stream settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/_ingest</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches the ingest settings of an ingest stream definition<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['GET'],
  patterns: ['/api/streams/{name}/_ingest'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_streams_name_ingest_request, 'body'),
    getLooseObjectFromProperty(get_streams_name_ingest_request, 'path'),
    getLooseObjectFromProperty(get_streams_name_ingest_request, 'query'),
  ]),
  outputSchema: get_streams_name_ingest_response,
};
const PUT_STREAMS_NAME_INGEST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_ingest',
  summary: `Update ingest stream settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/_ingest</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upserts the ingest settings of an ingest stream definition<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['PUT'],
  patterns: ['/api/streams/{name}/_ingest'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: ['ingest'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_streams_name_ingest_request, 'body'),
    getLooseObjectFromProperty(put_streams_name_ingest_request, 'path'),
    getLooseObjectFromProperty(put_streams_name_ingest_request, 'query'),
  ]),
  outputSchema: put_streams_name_ingest_response,
};
const POST_STREAMS_NAME_CONTENT_EXPORT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_content_export',
  summary: `Export stream content`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/content/export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Exports the content associated to a stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/{name}/content/export'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: ['description', 'include', 'name', 'version'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_streams_name_content_export_request, 'body'),
    getLooseObjectFromProperty(post_streams_name_content_export_request, 'path'),
    getLooseObjectFromProperty(post_streams_name_content_export_request, 'query'),
  ]),
  outputSchema: post_streams_name_content_export_response,
};
const POST_STREAMS_NAME_CONTENT_IMPORT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_content_import',
  summary: `Import content into a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/content/import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Links content objects to a stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/{name}/content/import'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_streams_name_content_import_request, 'body'),
    getLooseObjectFromProperty(post_streams_name_content_import_request, 'path'),
    getLooseObjectFromProperty(post_streams_name_content_import_request, 'query'),
  ]),
  outputSchema: post_streams_name_content_import_response,
};
const GET_STREAMS_NAME_DASHBOARDS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_dashboards',
  summary: `Get stream dashboards`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/dashboards</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches all dashboards linked to a stream that are visible to the current user in the current space.<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['GET'],
  patterns: ['/api/streams/{name}/dashboards'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_streams_name_dashboards_request, 'body'),
    getLooseObjectFromProperty(get_streams_name_dashboards_request, 'path'),
    getLooseObjectFromProperty(get_streams_name_dashboards_request, 'query'),
  ]),
  outputSchema: get_streams_name_dashboards_response,
};
const POST_STREAMS_NAME_DASHBOARDS_BULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_dashboards_bulk',
  summary: `Bulk update dashboards`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/dashboards/_bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Bulk update dashboards linked to a stream. Can link new dashboards and delete existing ones.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/{name}/dashboards/_bulk'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: ['operations'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_streams_name_dashboards_bulk_request, 'body'),
    getLooseObjectFromProperty(post_streams_name_dashboards_bulk_request, 'path'),
    getLooseObjectFromProperty(post_streams_name_dashboards_bulk_request, 'query'),
  ]),
  outputSchema: post_streams_name_dashboards_bulk_response,
};
const DELETE_STREAMS_NAME_DASHBOARDS_DASHBOARDID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_streams_name_dashboards_dashboardid',
  summary: `Unlink a dashboard from a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/dashboards/{dashboardId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Unlinks a dashboard from a stream. Noop if the dashboard is not linked to the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['DELETE'],
  patterns: ['/api/streams/{name}/dashboards/{dashboardId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name', 'dashboardId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_streams_name_dashboards_dashboardid_request, 'body'),
    getLooseObjectFromProperty(delete_streams_name_dashboards_dashboardid_request, 'path'),
    getLooseObjectFromProperty(delete_streams_name_dashboards_dashboardid_request, 'query'),
  ]),
  outputSchema: delete_streams_name_dashboards_dashboardid_response,
};
const PUT_STREAMS_NAME_DASHBOARDS_DASHBOARDID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_dashboards_dashboardid',
  summary: `Link a dashboard to a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/dashboards/{dashboardId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Links a dashboard to a stream. Noop if the dashboard is already linked to the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['PUT'],
  patterns: ['/api/streams/{name}/dashboards/{dashboardId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name', 'dashboardId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_streams_name_dashboards_dashboardid_request, 'body'),
    getLooseObjectFromProperty(put_streams_name_dashboards_dashboardid_request, 'path'),
    getLooseObjectFromProperty(put_streams_name_dashboards_dashboardid_request, 'query'),
  ]),
  outputSchema: put_streams_name_dashboards_dashboardid_response,
};
const GET_STREAMS_NAME_QUERIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_queries',
  summary: `Get stream queries`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches all queries linked to a stream that are visible to the current user in the current space.<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['GET'],
  patterns: ['/api/streams/{name}/queries'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_streams_name_queries_request, 'body'),
    getLooseObjectFromProperty(get_streams_name_queries_request, 'path'),
    getLooseObjectFromProperty(get_streams_name_queries_request, 'query'),
  ]),
  outputSchema: get_streams_name_queries_response,
};
const POST_STREAMS_NAME_QUERIES_BULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_queries_bulk',
  summary: `Bulk update queries`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/queries/_bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Bulk update queries of a stream. Can add new queries and delete existing ones.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/{name}/queries/_bulk'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: ['operations'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_streams_name_queries_bulk_request, 'body'),
    getLooseObjectFromProperty(post_streams_name_queries_bulk_request, 'path'),
    getLooseObjectFromProperty(post_streams_name_queries_bulk_request, 'query'),
  ]),
  outputSchema: post_streams_name_queries_bulk_response,
};
const DELETE_STREAMS_NAME_QUERIES_QUERYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_streams_name_queries_queryid',
  summary: `Remove a query from a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/queries/{queryId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Remove a query from a stream. Noop if the query is not found on the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['DELETE'],
  patterns: ['/api/streams/{name}/queries/{queryId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name', 'queryId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_streams_name_queries_queryid_request, 'body'),
    getLooseObjectFromProperty(delete_streams_name_queries_queryid_request, 'path'),
    getLooseObjectFromProperty(delete_streams_name_queries_queryid_request, 'query'),
  ]),
  outputSchema: delete_streams_name_queries_queryid_response,
};
const PUT_STREAMS_NAME_QUERIES_QUERYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_queries_queryid',
  summary: `Upsert a query to a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/queries/{queryId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Adds a query to a stream. Noop if the query is already present on the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['PUT'],
  patterns: ['/api/streams/{name}/queries/{queryId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name', 'queryId'],
    urlParams: [],
    bodyParams: ['feature', 'kql', 'title'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_streams_name_queries_queryid_request, 'body'),
    getLooseObjectFromProperty(put_streams_name_queries_queryid_request, 'path'),
    getLooseObjectFromProperty(put_streams_name_queries_queryid_request, 'query'),
  ]),
  outputSchema: put_streams_name_queries_queryid_response,
};
const GET_STREAMS_NAME_RULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_rules',
  summary: `Get stream rules`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/rules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches all rules linked to a stream that are visible to the current user in the current space.<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['GET'],
  patterns: ['/api/streams/{name}/rules'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_streams_name_rules_request, 'body'),
    getLooseObjectFromProperty(get_streams_name_rules_request, 'path'),
    getLooseObjectFromProperty(get_streams_name_rules_request, 'query'),
  ]),
  outputSchema: get_streams_name_rules_response,
};
const DELETE_STREAMS_NAME_RULES_RULEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_streams_name_rules_ruleid',
  summary: `Unlink a rule from a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/rules/{ruleId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Unlinks a rule from a stream. Noop if the rule is not linked to the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['DELETE'],
  patterns: ['/api/streams/{name}/rules/{ruleId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name', 'ruleId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_streams_name_rules_ruleid_request, 'body'),
    getLooseObjectFromProperty(delete_streams_name_rules_ruleid_request, 'path'),
    getLooseObjectFromProperty(delete_streams_name_rules_ruleid_request, 'query'),
  ]),
  outputSchema: delete_streams_name_rules_ruleid_response,
};
const PUT_STREAMS_NAME_RULES_RULEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_rules_ruleid',
  summary: `Link a rule to a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/rules/{ruleId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Links a rule to a stream. Noop if the rule is already linked to the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['PUT'],
  patterns: ['/api/streams/{name}/rules/{ruleId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name', 'ruleId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_streams_name_rules_ruleid_request, 'body'),
    getLooseObjectFromProperty(put_streams_name_rules_ruleid_request, 'path'),
    getLooseObjectFromProperty(put_streams_name_rules_ruleid_request, 'query'),
  ]),
  outputSchema: put_streams_name_rules_ruleid_response,
};
const GET_STREAMS_NAME_SIGNIFICANT_EVENTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_significant_events',
  summary: `Read the significant events`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/significant_events</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Read the significant events<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['GET'],
  patterns: ['/api/streams/{name}/significant_events'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['from', 'to', 'bucketSize'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_streams_name_significant_events_request, 'body'),
    getLooseObjectFromProperty(get_streams_name_significant_events_request, 'path'),
    getLooseObjectFromProperty(get_streams_name_significant_events_request, 'query'),
  ]),
  outputSchema: get_streams_name_significant_events_response,
};
const POST_STREAMS_NAME_SIGNIFICANT_EVENTS_GENERATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_significant_events_generate',
  summary: `Generate significant events`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/significant_events/_generate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Generate significant events queries based on the stream data<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/{name}/significant_events/_generate'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['connectorId', 'currentDate', 'from', 'to'],
    bodyParams: ['feature'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_streams_name_significant_events_generate_request, 'body'),
    getLooseObjectFromProperty(post_streams_name_significant_events_generate_request, 'path'),
    getLooseObjectFromProperty(post_streams_name_significant_events_generate_request, 'query'),
  ]),
  outputSchema: post_streams_name_significant_events_generate_response,
};
const POST_STREAMS_NAME_SIGNIFICANT_EVENTS_PREVIEW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_significant_events_preview',
  summary: `Preview significant events`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/significant_events/_preview</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Preview significant event results based on a given query<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/{name}/significant_events/_preview'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['from', 'to', 'bucketSize'],
    bodyParams: ['query'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_streams_name_significant_events_preview_request, 'body'),
    getLooseObjectFromProperty(post_streams_name_significant_events_preview_request, 'path'),
    getLooseObjectFromProperty(post_streams_name_significant_events_preview_request, 'query'),
  ]),
  outputSchema: post_streams_name_significant_events_preview_response,
};
const POST_SYNTHETICS_MONITOR_TEST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_synthetics_monitor_test',
  summary: `Trigger an on-demand test run for a monitor`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitor/test/{monitorId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Trigger an immediate test execution for the specified monitor. The response includes the generated \`testRunId\`. If the test encounters issues in one or more service locations, an \`errors\` array is also returned with details about the failures.
`,
  methods: ['POST'],
  patterns: ['/api/synthetics/monitor/test/{monitorId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['monitorId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_synthetics_monitor_test_request, 'body'),
    getLooseObjectFromProperty(post_synthetics_monitor_test_request, 'path'),
    getLooseObjectFromProperty(post_synthetics_monitor_test_request, 'query'),
  ]),
  outputSchema: post_synthetics_monitor_test_response,
};
const GET_SYNTHETIC_MONITORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_synthetic_monitors',
  summary: `Get monitors`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of monitors.
You must have \`read\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/api/synthetics/monitors'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(get_synthetic_monitors_request, 'body'),
    getLooseObjectFromProperty(get_synthetic_monitors_request, 'path'),
    getLooseObjectFromProperty(get_synthetic_monitors_request, 'query'),
  ]),
  outputSchema: get_synthetic_monitors_response,
};
const POST_SYNTHETIC_MONITORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_synthetic_monitors',
  summary: `Create a monitor`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new monitor with the specified attributes. A monitor can be one of the following types: HTTP, TCP, ICMP, or Browser. The required and default fields may vary based on the monitor type.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/api/synthetics/monitors'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_synthetic_monitors_request, 'body'),
    getLooseObjectFromProperty(post_synthetic_monitors_request, 'path'),
    getLooseObjectFromProperty(post_synthetic_monitors_request, 'query'),
  ]),
  outputSchema: post_synthetic_monitors_response,
};
const DELETE_SYNTHETIC_MONITORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_synthetic_monitors',
  summary: `Delete monitors`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors/_bulk_delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete multiple monitors by sending a list of config IDs.
`,
  methods: ['POST'],
  patterns: ['/api/synthetics/monitors/_bulk_delete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['ids'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_synthetic_monitors_request, 'body'),
    getLooseObjectFromProperty(delete_synthetic_monitors_request, 'path'),
    getLooseObjectFromProperty(delete_synthetic_monitors_request, 'query'),
  ]),
  outputSchema: delete_synthetic_monitors_response,
};
const DELETE_SYNTHETIC_MONITOR_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_synthetic_monitor',
  summary: `Delete a monitor`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a monitor from the Synthetics app.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['DELETE'],
  patterns: ['/api/synthetics/monitors/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_synthetic_monitor_request, 'body'),
    getLooseObjectFromProperty(delete_synthetic_monitor_request, 'path'),
    getLooseObjectFromProperty(delete_synthetic_monitor_request, 'query'),
  ]),
  outputSchema: delete_synthetic_monitor_response,
};
const GET_SYNTHETIC_MONITOR_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_synthetic_monitor',
  summary: `Get a monitor`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/synthetics/monitors/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_synthetic_monitor_request, 'body'),
    getLooseObjectFromProperty(get_synthetic_monitor_request, 'path'),
    getLooseObjectFromProperty(get_synthetic_monitor_request, 'query'),
  ]),
  outputSchema: get_synthetic_monitor_response,
};
const PUT_SYNTHETIC_MONITOR_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_synthetic_monitor',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_synthetic_monitor_request, 'body'),
    getLooseObjectFromProperty(put_synthetic_monitor_request, 'path'),
    getLooseObjectFromProperty(put_synthetic_monitor_request, 'query'),
  ]),
  outputSchema: put_synthetic_monitor_response,
};
const GET_PARAMETERS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_parameters',
  summary: `Get parameters`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all parameters. You must have \`read\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/api/synthetics/params'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_parameters_request, 'body'),
    getLooseObjectFromProperty(get_parameters_request, 'path'),
    getLooseObjectFromProperty(get_parameters_request, 'query'),
  ]),
  outputSchema: get_parameters_response,
};
const POST_PARAMETERS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_parameters',
  summary: `Add parameters`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Add one or more parameters to the Synthetics app.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/api/synthetics/params'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_parameters_request, 'body'),
    getLooseObjectFromProperty(post_parameters_request, 'path'),
    getLooseObjectFromProperty(post_parameters_request, 'query'),
  ]),
  outputSchema: post_parameters_response,
};
const DELETE_PARAMETERS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_parameters',
  summary: `Delete parameters`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params/_bulk_delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete parameters from the Synthetics app.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['DELETE'],
  patterns: ['/api/synthetics/params/_bulk_delete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['ids'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_parameters_request, 'body'),
    getLooseObjectFromProperty(delete_parameters_request, 'path'),
    getLooseObjectFromProperty(delete_parameters_request, 'query'),
  ]),
  outputSchema: delete_parameters_response,
};
const DELETE_PARAMETER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_parameter',
  summary: `Delete a parameter`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a parameter from the Synthetics app.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['DELETE'],
  patterns: ['/api/synthetics/params/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_parameter_request, 'body'),
    getLooseObjectFromProperty(delete_parameter_request, 'path'),
    getLooseObjectFromProperty(delete_parameter_request, 'query'),
  ]),
  outputSchema: delete_parameter_response,
};
const GET_PARAMETER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_parameter',
  summary: `Get a parameter`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a parameter from the Synthetics app.
You must have \`read\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/api/synthetics/params/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_parameter_request, 'body'),
    getLooseObjectFromProperty(get_parameter_request, 'path'),
    getLooseObjectFromProperty(get_parameter_request, 'query'),
  ]),
  outputSchema: get_parameter_response,
};
const PUT_PARAMETER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_parameter',
  summary: `Update a parameter`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a parameter in the Synthetics app.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['PUT'],
  patterns: ['/api/synthetics/params/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['description', 'key', 'tags', 'value'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_parameter_request, 'body'),
    getLooseObjectFromProperty(put_parameter_request, 'path'),
    getLooseObjectFromProperty(put_parameter_request, 'query'),
  ]),
  outputSchema: put_parameter_response,
};
const GET_PRIVATE_LOCATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_private_locations',
  summary: `Get private locations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/private_locations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of private locations.
You must have \`read\` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/api/synthetics/private_locations'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_private_locations_request, 'body'),
    getLooseObjectFromProperty(get_private_locations_request, 'path'),
    getLooseObjectFromProperty(get_private_locations_request, 'query'),
  ]),
  outputSchema: get_private_locations_response,
};
const POST_PRIVATE_LOCATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_private_location',
  summary: `Create a private location`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/private_locations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.`,
  methods: ['POST'],
  patterns: ['/api/synthetics/private_locations'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['agentPolicyId', 'geo', 'label', 'spaces', 'tags'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(post_private_location_request, 'body'),
    getLooseObjectFromProperty(post_private_location_request, 'path'),
    getLooseObjectFromProperty(post_private_location_request, 'query'),
  ]),
  outputSchema: post_private_location_response,
};
const DELETE_PRIVATE_LOCATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_private_location',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_private_location_request, 'body'),
    getLooseObjectFromProperty(delete_private_location_request, 'path'),
    getLooseObjectFromProperty(delete_private_location_request, 'query'),
  ]),
  outputSchema: delete_private_location_response,
};
const GET_PRIVATE_LOCATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_private_location',
  summary: `Get a private location`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/private_locations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/api/synthetics/private_locations/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_private_location_request, 'body'),
    getLooseObjectFromProperty(get_private_location_request, 'path'),
    getLooseObjectFromProperty(get_private_location_request, 'query'),
  ]),
  outputSchema: get_private_location_response,
};
const PUT_PRIVATE_LOCATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_private_location',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['label'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(put_private_location_request, 'body'),
    getLooseObjectFromProperty(put_private_location_request, 'path'),
    getLooseObjectFromProperty(put_private_location_request, 'query'),
  ]),
  outputSchema: put_private_location_response,
};
const TASK_MANAGER_HEALTH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.task_manager_health',
  summary: `Get the task manager health`,
  description: `Get the health status of the Kibana task manager.
`,
  methods: ['GET'],
  patterns: ['/api/task_manager/_health'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(task_manager_health_request, 'body'),
    getLooseObjectFromProperty(task_manager_health_request, 'path'),
    getLooseObjectFromProperty(task_manager_health_request, 'query'),
  ]),
  outputSchema: task_manager_health_response,
};
const DELETETIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteTimelines',
  summary: `Delete Timelines or Timeline templates`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete one or more Timelines or Timeline templates.`,
  methods: ['DELETE'],
  patterns: ['/api/timeline'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['savedObjectIds', 'searchIds'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_timelines_request, 'body'),
    getLooseObjectFromProperty(delete_timelines_request, 'path'),
    getLooseObjectFromProperty(delete_timelines_request, 'query'),
  ]),
  outputSchema: delete_timelines_response,
};
const GETTIMELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetTimeline',
  summary: `Get Timeline or Timeline template details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an existing saved Timeline or Timeline template.`,
  methods: ['GET'],
  patterns: ['/api/timeline'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['template_timeline_id', 'id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_timeline_request, 'body'),
    getLooseObjectFromProperty(get_timeline_request, 'path'),
    getLooseObjectFromProperty(get_timeline_request, 'query'),
  ]),
  outputSchema: get_timeline_response,
};
const PATCHTIMELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PatchTimeline',
  summary: `Update a Timeline`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing Timeline. You can update the title, description, date range, pinned events, pinned queries, and/or pinned saved queries of an existing Timeline.`,
  methods: ['PATCH'],
  patterns: ['/api/timeline'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['timeline', 'timelineId', 'version'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(patch_timeline_request, 'body'),
    getLooseObjectFromProperty(patch_timeline_request, 'path'),
    getLooseObjectFromProperty(patch_timeline_request, 'query'),
  ]),
  outputSchema: patch_timeline_response,
};
const CREATETIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateTimelines',
  summary: `Create a Timeline or Timeline template`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new Timeline or Timeline template.`,
  methods: ['POST'],
  patterns: ['/api/timeline'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(create_timelines_request, 'body'),
    getLooseObjectFromProperty(create_timelines_request, 'path'),
    getLooseObjectFromProperty(create_timelines_request, 'query'),
  ]),
  outputSchema: create_timelines_response,
};
const COPYTIMELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CopyTimeline',
  summary: `Copies timeline or timeline template`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_copy</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Copies and returns a timeline or timeline template.
`,
  methods: ['GET'],
  patterns: ['/api/timeline/_copy'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['timeline', 'timelineIdToCopy'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(copy_timeline_request, 'body'),
    getLooseObjectFromProperty(copy_timeline_request, 'path'),
    getLooseObjectFromProperty(copy_timeline_request, 'query'),
  ]),
  outputSchema: copy_timeline_response,
};
const GETDRAFTTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetDraftTimelines',
  summary: `Get draft Timeline or Timeline template details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_draft</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of the draft Timeline  or Timeline template for the current user. If the user doesn't have a draft Timeline, an empty Timeline is returned.`,
  methods: ['GET'],
  patterns: ['/api/timeline/_draft'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['timelineType'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_draft_timelines_request, 'body'),
    getLooseObjectFromProperty(get_draft_timelines_request, 'path'),
    getLooseObjectFromProperty(get_draft_timelines_request, 'query'),
  ]),
  outputSchema: get_draft_timelines_response,
};
const CLEANDRAFTTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CleanDraftTimelines',
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
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['timelineType'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(clean_draft_timelines_request, 'body'),
    getLooseObjectFromProperty(clean_draft_timelines_request, 'path'),
    getLooseObjectFromProperty(clean_draft_timelines_request, 'query'),
  ]),
  outputSchema: clean_draft_timelines_response,
};
const EXPORTTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ExportTimelines',
  summary: `Export Timelines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Export Timelines as an NDJSON file.`,
  methods: ['POST'],
  patterns: ['/api/timeline/_export'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['file_name'],
    bodyParams: ['ids'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(export_timelines_request, 'body'),
    getLooseObjectFromProperty(export_timelines_request, 'path'),
    getLooseObjectFromProperty(export_timelines_request, 'query'),
  ]),
  outputSchema: export_timelines_response,
};
const PERSISTFAVORITEROUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PersistFavoriteRoute',
  summary: `Favorite a Timeline or Timeline template`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_favorite</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Favorite a Timeline or Timeline template for the current user.`,
  methods: ['PATCH'],
  patterns: ['/api/timeline/_favorite'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['templateTimelineId', 'templateTimelineVersion', 'timelineId', 'timelineType'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(persist_favorite_route_request, 'body'),
    getLooseObjectFromProperty(persist_favorite_route_request, 'path'),
    getLooseObjectFromProperty(persist_favorite_route_request, 'query'),
  ]),
  outputSchema: persist_favorite_route_response,
};
const IMPORTTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ImportTimelines',
  summary: `Import Timelines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Import Timelines.`,
  methods: ['POST'],
  patterns: ['/api/timeline/_import'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['file', 'isImmutable'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(import_timelines_request, 'body'),
    getLooseObjectFromProperty(import_timelines_request, 'path'),
    getLooseObjectFromProperty(import_timelines_request, 'query'),
  ]),
  outputSchema: import_timelines_response,
};
const INSTALLPREPACKEDTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InstallPrepackedTimelines',
  summary: `Install prepackaged Timelines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_prepackaged</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Install or update prepackaged Timelines.`,
  methods: ['POST'],
  patterns: ['/api/timeline/_prepackaged'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: ['prepackagedTimelines', 'timelinesToInstall', 'timelinesToUpdate'],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(install_prepacked_timelines_request, 'body'),
    getLooseObjectFromProperty(install_prepacked_timelines_request, 'path'),
    getLooseObjectFromProperty(install_prepacked_timelines_request, 'query'),
  ]),
  outputSchema: install_prepacked_timelines_response,
};
const RESOLVETIMELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ResolveTimeline',
  summary: `Get an existing saved Timeline or Timeline template`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/resolve</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/timeline/resolve'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['template_timeline_id', 'id'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(resolve_timeline_request, 'body'),
    getLooseObjectFromProperty(resolve_timeline_request, 'path'),
    getLooseObjectFromProperty(resolve_timeline_request, 'query'),
  ]),
  outputSchema: resolve_timeline_response,
};
const GETTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetTimelines',
  summary: `Get Timelines or Timeline templates`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timelines</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all saved Timelines or Timeline templates.`,
  methods: ['GET'],
  patterns: ['/api/timelines'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(get_timelines_request, 'body'),
    getLooseObjectFromProperty(get_timelines_request, 'path'),
    getLooseObjectFromProperty(get_timelines_request, 'query'),
  ]),
  outputSchema: get_timelines_response,
};
const GET_UPGRADE_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_upgrade_status',
  summary: `Get the upgrade readiness status`,
  description: `Check the status of your cluster.`,
  methods: ['GET'],
  patterns: ['/api/upgrade_assistant/status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_upgrade_status_request, 'body'),
    getLooseObjectFromProperty(get_upgrade_status_request, 'path'),
    getLooseObjectFromProperty(get_upgrade_status_request, 'query'),
  ]),
  outputSchema: get_upgrade_status_response,
};
const GET_UPTIME_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_uptime_settings',
  summary: `Get uptime settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/uptime/settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the uptime feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/api/uptime/settings'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_uptime_settings_request, 'body'),
    getLooseObjectFromProperty(get_uptime_settings_request, 'path'),
    getLooseObjectFromProperty(get_uptime_settings_request, 'query'),
  ]),
  outputSchema: get_uptime_settings_response,
};
const PUT_UPTIME_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_uptime_settings',
  summary: `Update uptime settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/uptime/settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update uptime setting attributes like \`heartbeatIndices\`, \`certExpirationThreshold\`, \`certAgeThreshold\`, \`defaultConnectors\`, or \`defaultEmail\`. You must have \`all\` privileges for the uptime feature in the Observability section of the Kibana feature privileges. A partial update is supported, provided settings keys will be merged with existing settings.
`,
  methods: ['PUT'],
  patterns: ['/api/uptime/settings'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(put_uptime_settings_request, 'body'),
    getLooseObjectFromProperty(put_uptime_settings_request, 'path'),
    getLooseObjectFromProperty(put_uptime_settings_request, 'query'),
  ]),
  outputSchema: put_uptime_settings_response,
};
const FINDSLOSOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findSlosOp',
  summary: `Get a paginated list of SLOs`,
  description: `You must have the \`read\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/s/{spaceId}/api/observability/slos'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
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
    getLooseObjectFromProperty(find_slos_op_request, 'body'),
    getLooseObjectFromProperty(find_slos_op_request, 'path'),
    getLooseObjectFromProperty(find_slos_op_request, 'query'),
  ]),
  outputSchema: find_slos_op_response,
};
const CREATESLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createSloOp',
  summary: `Create an SLO`,
  description: `You must have \`all\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['spaceId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(create_slo_op_request, 'body'),
    getLooseObjectFromProperty(create_slo_op_request, 'path'),
    getLooseObjectFromProperty(create_slo_op_request, 'query'),
  ]),
  outputSchema: create_slo_op_response,
};
const BULKDELETEOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkDeleteOp',
  summary: `Bulk delete SLO definitions and their associated summary and rollup data.`,
  description: `Bulk delete SLO definitions and their associated summary and rollup data.  This endpoint initiates a bulk deletion operation for SLOs, which may take some time to complete.  The status of the operation can be checked using the \`GET /api/slo/_bulk_delete/{taskId}\` endpoint.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos/_bulk_delete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['spaceId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(bulk_delete_op_request, 'body'),
    getLooseObjectFromProperty(bulk_delete_op_request, 'path'),
    getLooseObjectFromProperty(bulk_delete_op_request, 'query'),
  ]),
  outputSchema: bulk_delete_op_response,
};
const BULKDELETESTATUSOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkDeleteStatusOp',
  summary: `Retrieve the status of the bulk deletion`,
  description: `Retrieve the status of the bulk deletion operation for SLOs.  This endpoint returns the status of the bulk deletion operation, including whether it is completed and the results of the operation.
`,
  methods: ['GET'],
  patterns: ['/s/{spaceId}/api/observability/slos/_bulk_delete/{taskId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['spaceId', 'taskId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(bulk_delete_status_op_request, 'body'),
    getLooseObjectFromProperty(bulk_delete_status_op_request, 'path'),
    getLooseObjectFromProperty(bulk_delete_status_op_request, 'query'),
  ]),
  outputSchema: bulk_delete_status_op_response,
};
const DELETEROLLUPDATAOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteRollupDataOp',
  summary: `Batch delete rollup and summary data`,
  description: `The deletion occurs for the specified list of \`sloId\`. You must have \`all\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos/_bulk_purge_rollup'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['spaceId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_rollup_data_op_request, 'body'),
    getLooseObjectFromProperty(delete_rollup_data_op_request, 'path'),
    getLooseObjectFromProperty(delete_rollup_data_op_request, 'query'),
  ]),
  outputSchema: delete_rollup_data_op_response,
};
const DELETESLOINSTANCESOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteSloInstancesOp',
  summary: `Batch delete rollup and summary data`,
  description: `The deletion occurs for the specified list of \`sloId\` and \`instanceId\`. You must have \`all\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos/_delete_instances'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['spaceId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_slo_instances_op_request, 'body'),
    getLooseObjectFromProperty(delete_slo_instances_op_request, 'path'),
    getLooseObjectFromProperty(delete_slo_instances_op_request, 'query'),
  ]),
  outputSchema: delete_slo_instances_op_response,
};
const DELETESLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteSloOp',
  summary: `Delete an SLO`,
  description: `You must have the \`write\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['DELETE'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['spaceId', 'sloId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(delete_slo_op_request, 'body'),
    getLooseObjectFromProperty(delete_slo_op_request, 'path'),
    getLooseObjectFromProperty(delete_slo_op_request, 'query'),
  ]),
  outputSchema: delete_slo_op_response,
};
const GETSLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getSloOp',
  summary: `Get an SLO`,
  description: `You must have the \`read\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['spaceId', 'sloId'],
    urlParams: ['instanceId'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_slo_op_request, 'body'),
    getLooseObjectFromProperty(get_slo_op_request, 'path'),
    getLooseObjectFromProperty(get_slo_op_request, 'query'),
  ]),
  outputSchema: get_slo_op_response,
};
const UPDATESLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateSloOp',
  summary: `Update an SLO`,
  description: `You must have the \`write\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['PUT'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['spaceId', 'sloId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(update_slo_op_request, 'body'),
    getLooseObjectFromProperty(update_slo_op_request, 'path'),
    getLooseObjectFromProperty(update_slo_op_request, 'query'),
  ]),
  outputSchema: update_slo_op_response,
};
const RESETSLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.resetSloOp',
  summary: `Reset an SLO`,
  description: `You must have the \`write\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}/_reset'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['spaceId', 'sloId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(reset_slo_op_request, 'body'),
    getLooseObjectFromProperty(reset_slo_op_request, 'path'),
    getLooseObjectFromProperty(reset_slo_op_request, 'query'),
  ]),
  outputSchema: reset_slo_op_response,
};
const DISABLESLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.disableSloOp',
  summary: `Disable an SLO`,
  description: `You must have the \`write\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}/disable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['spaceId', 'sloId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(disable_slo_op_request, 'body'),
    getLooseObjectFromProperty(disable_slo_op_request, 'path'),
    getLooseObjectFromProperty(disable_slo_op_request, 'query'),
  ]),
  outputSchema: disable_slo_op_response,
};
const ENABLESLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.enableSloOp',
  summary: `Enable an SLO`,
  description: `You must have the \`write\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}/enable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['spaceId', 'sloId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(enable_slo_op_request, 'body'),
    getLooseObjectFromProperty(enable_slo_op_request, 'path'),
    getLooseObjectFromProperty(enable_slo_op_request, 'query'),
  ]),
  outputSchema: enable_slo_op_response,
};
const GETDEFINITIONSOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getDefinitionsOp',
  summary: `Get the SLO definitions`,
  description: `You must have the \`read\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/s/{spaceId}/internal/observability/slos/_definitions'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['spaceId'],
    urlParams: ['includeOutdatedOnly', 'includeHealth', 'tags', 'search', 'page', 'perPage'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    getLooseObjectFromProperty(get_definitions_op_request, 'body'),
    getLooseObjectFromProperty(get_definitions_op_request, 'path'),
    getLooseObjectFromProperty(get_definitions_op_request, 'query'),
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
