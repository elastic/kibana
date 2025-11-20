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
 * Generated at: 2025-11-20T18:52:56.337Z
 * Source: /oas_docs/output/kibana.yaml (undefined APIs)
 *
 * To regenerate: node scripts/generate_workflows_contracts.js
 */

import { z } from '@kbn/zod/v4';
import {
  _alerts_migration_cleanup_request,
  _alerts_migration_cleanup_response,
  _apply_entity_engine_dataview_indices_request,
  _apply_entity_engine_dataview_indices_response,
  _attack_discovery_find_request,
  _attack_discovery_find_response,
  _bulk_upsert_asset_criticality_records_request,
  _bulk_upsert_asset_criticality_records_response,
  _cancel_action_request,
  _cancel_action_response,
  _chat_complete_request,
  _chat_complete_response,
  _clean_draft_timelines_request,
  _clean_draft_timelines_response,
  _clean_up_risk_engine_request,
  _clean_up_risk_engine_response,
  _configure_risk_engine_saved_object_request,
  _configure_risk_engine_saved_object_response,
  _copy_timeline_request,
  _copy_timeline_response,
  _create_alerts_index_request,
  _create_alerts_index_response,
  _create_alerts_migration_request,
  _create_alerts_migration_response,
  _create_asset_criticality_record_request,
  _create_asset_criticality_record_response,
  _create_attack_discovery_schedules_request,
  _create_attack_discovery_schedules_response,
  _create_conversation_request,
  _create_conversation_response,
  _create_endpoint_list_item_request,
  _create_endpoint_list_item_response,
  _create_endpoint_list_request,
  _create_endpoint_list_response,
  _create_exception_list_item_request,
  _create_exception_list_item_response,
  _create_exception_list_request,
  _create_exception_list_response,
  _create_knowledge_base_entry_request,
  _create_knowledge_base_entry_response,
  _create_knowledge_base_request,
  _create_knowledge_base_response,
  _create_list_index_request,
  _create_list_index_response,
  _create_list_item_request,
  _create_list_item_response,
  _create_list_request,
  _create_list_response,
  _create_priv_mon_user_request,
  _create_priv_mon_user_response,
  _create_rule_exception_list_items_request,
  _create_rule_exception_list_items_response,
  _create_rule_request,
  _create_rule_response,
  _create_shared_exception_list_request,
  _create_shared_exception_list_response,
  _create_timelines_request,
  _create_timelines_response,
  _create_update_protection_updates_note_request,
  _create_update_protection_updates_note_response,
  _delete_alerts_index_request,
  _delete_alerts_index_response,
  _delete_all_conversations_request,
  _delete_all_conversations_response,
  _delete_asset_criticality_record_request,
  _delete_asset_criticality_record_response,
  _delete_attack_discovery_schedules_request,
  _delete_attack_discovery_schedules_response,
  _delete_conversation_request,
  _delete_conversation_response,
  _delete_endpoint_list_item_request,
  _delete_endpoint_list_item_response,
  _delete_entity_engine_request,
  _delete_entity_engine_response,
  _delete_entity_engines_request,
  _delete_entity_engines_response,
  _delete_exception_list_item_request,
  _delete_exception_list_item_response,
  _delete_exception_list_request,
  _delete_exception_list_response,
  _delete_knowledge_base_entry_request,
  _delete_knowledge_base_entry_response,
  _delete_list_index_request,
  _delete_list_index_response,
  _delete_list_item_request,
  _delete_list_item_response,
  _delete_list_request,
  _delete_list_response,
  _delete_monitoring_engine_request,
  _delete_monitoring_engine_response,
  _delete_note_request,
  _delete_note_response,
  _delete_priv_mon_user_request,
  _delete_priv_mon_user_response,
  _delete_rule_request,
  _delete_rule_response,
  _delete_single_entity_request,
  _delete_single_entity_response,
  _delete_timelines_request,
  _delete_timelines_response,
  _disable_attack_discovery_schedules_request,
  _disable_attack_discovery_schedules_response,
  _disable_monitoring_engine_request,
  _disable_monitoring_engine_response,
  _duplicate_exception_list_request,
  _duplicate_exception_list_response,
  _enable_attack_discovery_schedules_request,
  _enable_attack_discovery_schedules_response,
  _endpoint_execute_action_request,
  _endpoint_execute_action_response,
  _endpoint_file_download_request,
  _endpoint_file_download_response,
  _endpoint_file_info_request,
  _endpoint_file_info_response,
  _endpoint_get_actions_details_request,
  _endpoint_get_actions_details_response,
  _endpoint_get_actions_list_request,
  _endpoint_get_actions_list_response,
  _endpoint_get_actions_state_request,
  _endpoint_get_actions_state_response,
  _endpoint_get_actions_status_request,
  _endpoint_get_actions_status_response,
  _endpoint_get_file_action_request,
  _endpoint_get_file_action_response,
  _endpoint_get_processes_action_request,
  _endpoint_get_processes_action_response,
  _endpoint_isolate_action_request,
  _endpoint_isolate_action_response,
  _endpoint_kill_process_action_request,
  _endpoint_kill_process_action_response,
  _endpoint_scan_action_request,
  _endpoint_scan_action_response,
  _endpoint_suspend_process_action_request,
  _endpoint_suspend_process_action_response,
  _endpoint_unisolate_action_request,
  _endpoint_unisolate_action_response,
  _endpoint_upload_action_request,
  _endpoint_upload_action_response,
  _export_exception_list_request,
  _export_exception_list_response,
  _export_list_items_request,
  _export_list_items_response,
  _export_rules_request,
  _export_rules_response,
  _export_timelines_request,
  _export_timelines_response,
  _finalize_alerts_migration_request,
  _finalize_alerts_migration_response,
  _find_anonymization_fields_request,
  _find_anonymization_fields_response,
  _find_asset_criticality_records_request,
  _find_asset_criticality_records_response,
  _find_attack_discovery_schedules_request,
  _find_attack_discovery_schedules_response,
  _find_conversations_request,
  _find_conversations_response,
  _find_endpoint_list_items_request,
  _find_endpoint_list_items_response,
  _find_exception_list_items_request,
  _find_exception_list_items_response,
  _find_exception_lists_request,
  _find_exception_lists_response,
  _find_knowledge_base_entries_request,
  _find_knowledge_base_entries_response,
  _find_list_items_request,
  _find_list_items_response,
  _find_lists_request,
  _find_lists_response,
  _find_prompts_request,
  _find_prompts_response,
  _find_rules_request,
  _find_rules_response,
  _get_asset_criticality_record_request,
  _get_asset_criticality_record_response,
  _get_attack_discovery_generation_request,
  _get_attack_discovery_generation_response,
  _get_attack_discovery_generations_request,
  _get_attack_discovery_generations_response,
  _get_attack_discovery_schedules_request,
  _get_attack_discovery_schedules_response,
  _get_draft_timelines_request,
  _get_draft_timelines_response,
  _get_endpoint_metadata_list_request,
  _get_endpoint_metadata_list_response,
  _get_endpoint_metadata_request,
  _get_endpoint_metadata_response,
  _get_entity_engine_request,
  _get_entity_engine_response,
  _get_entity_store_status_request,
  _get_entity_store_status_response,
  _get_knowledge_base_request,
  _get_knowledge_base_response,
  _get_notes_request,
  _get_notes_response,
  _get_policy_response_request,
  _get_policy_response_response,
  _get_privileged_access_detection_package_status_request,
  _get_privileged_access_detection_package_status_response,
  _get_protection_updates_note_request,
  _get_protection_updates_note_response,
  _get_timeline_request,
  _get_timeline_response,
  _get_timelines_request,
  _get_timelines_response,
  _import_exception_list_request,
  _import_exception_list_response,
  _import_list_items_request,
  _import_list_items_response,
  _import_rules_request,
  _import_rules_response,
  _import_timelines_request,
  _import_timelines_response,
  _init_entity_engine_request,
  _init_entity_engine_response,
  _init_entity_store_request,
  _init_entity_store_response,
  _init_monitoring_engine_request,
  _init_monitoring_engine_response,
  _install_prebuilt_rules_and_timelines_request,
  _install_prebuilt_rules_and_timelines_response,
  _install_prepacked_timelines_request,
  _install_prepacked_timelines_response,
  _install_privileged_access_detection_package_request,
  _install_privileged_access_detection_package_response,
  _list_entities_request,
  _list_entities_response,
  _list_entity_engines_request,
  _list_entity_engines_response,
  _list_priv_mon_users_request,
  _list_priv_mon_users_response,
  _osquery_create_live_query_request,
  _osquery_create_live_query_response,
  _osquery_create_packs_request,
  _osquery_create_packs_response,
  _osquery_create_saved_query_request,
  _osquery_create_saved_query_response,
  _osquery_delete_packs_request,
  _osquery_delete_packs_response,
  _osquery_delete_saved_query_request,
  _osquery_delete_saved_query_response,
  _osquery_find_live_queries_request,
  _osquery_find_live_queries_response,
  _osquery_find_packs_request,
  _osquery_find_packs_response,
  _osquery_find_saved_queries_request,
  _osquery_find_saved_queries_response,
  _osquery_get_live_query_details_request,
  _osquery_get_live_query_details_response,
  _osquery_get_live_query_results_request,
  _osquery_get_live_query_results_response,
  _osquery_get_packs_details_request,
  _osquery_get_packs_details_response,
  _osquery_get_saved_query_details_request,
  _osquery_get_saved_query_details_response,
  _osquery_update_packs_request,
  _osquery_update_packs_response,
  _osquery_update_saved_query_request,
  _osquery_update_saved_query_response,
  _patch_list_item_request,
  _patch_list_item_response,
  _patch_list_request,
  _patch_list_response,
  _patch_rule_request,
  _patch_rule_response,
  _patch_timeline_request,
  _patch_timeline_response,
  _perform_anonymization_fields_bulk_action_request,
  _perform_anonymization_fields_bulk_action_response,
  _perform_knowledge_base_entry_bulk_action_request,
  _perform_knowledge_base_entry_bulk_action_response,
  _perform_prompts_bulk_action_request,
  _perform_prompts_bulk_action_response,
  _perform_rules_bulk_action_request,
  _perform_rules_bulk_action_response,
  _persist_favorite_route_request,
  _persist_favorite_route_response,
  _persist_note_route_request,
  _persist_note_route_response,
  _persist_pinned_event_route_request,
  _persist_pinned_event_route_response,
  _post_attack_discovery_bulk_request,
  _post_attack_discovery_bulk_response,
  _post_attack_discovery_generate_request,
  _post_attack_discovery_generate_response,
  _post_attack_discovery_generations_dismiss_request,
  _post_attack_discovery_generations_dismiss_response,
  _post_knowledge_base_request,
  _post_knowledge_base_response,
  _priv_mon_health_request,
  _priv_mon_health_response,
  _priv_mon_privileges_request,
  _priv_mon_privileges_response,
  _privmon_bulk_upload_users_c_s_v_request,
  _privmon_bulk_upload_users_c_s_v_response,
  _read_alerts_index_request,
  _read_alerts_index_response,
  _read_alerts_migration_status_request,
  _read_alerts_migration_status_response,
  _read_conversation_request,
  _read_conversation_response,
  _read_endpoint_list_item_request,
  _read_endpoint_list_item_response,
  _read_exception_list_item_request,
  _read_exception_list_item_response,
  _read_exception_list_request,
  _read_exception_list_response,
  _read_exception_list_summary_request,
  _read_exception_list_summary_response,
  _read_knowledge_base_entry_request,
  _read_knowledge_base_entry_response,
  _read_knowledge_base_request,
  _read_knowledge_base_response,
  _read_list_index_request,
  _read_list_index_response,
  _read_list_item_request,
  _read_list_item_response,
  _read_list_privileges_request,
  _read_list_privileges_response,
  _read_list_request,
  _read_list_response,
  _read_prebuilt_rules_and_timelines_status_request,
  _read_prebuilt_rules_and_timelines_status_response,
  _read_privileges_request,
  _read_privileges_response,
  _read_rule_request,
  _read_rule_response,
  _read_tags_request,
  _read_tags_response,
  _resolve_timeline_request,
  _resolve_timeline_response,
  _rule_preview_request,
  _rule_preview_response,
  _run_script_action_request,
  _run_script_action_response,
  _schedule_monitoring_engine_request,
  _schedule_monitoring_engine_response,
  _schedule_risk_engine_now_request,
  _schedule_risk_engine_now_response,
  _search_alerts_request,
  _search_alerts_response,
  _set_alert_assignees_request,
  _set_alert_assignees_response,
  _set_alert_tags_request,
  _set_alert_tags_response,
  _set_alerts_status_request,
  _set_alerts_status_response,
  _start_entity_engine_request,
  _start_entity_engine_response,
  _stop_entity_engine_request,
  _stop_entity_engine_response,
  _update_attack_discovery_schedules_request,
  _update_attack_discovery_schedules_response,
  _update_conversation_request,
  _update_conversation_response,
  _update_endpoint_list_item_request,
  _update_endpoint_list_item_response,
  _update_exception_list_item_request,
  _update_exception_list_item_response,
  _update_exception_list_request,
  _update_exception_list_response,
  _update_knowledge_base_entry_request,
  _update_knowledge_base_entry_response,
  _update_list_item_request,
  _update_list_item_response,
  _update_list_request,
  _update_list_response,
  _update_priv_mon_user_request,
  _update_priv_mon_user_response,
  _update_rule_request,
  _update_rule_response,
  _upsert_entities_bulk_request,
  _upsert_entities_bulk_response,
  _upsert_entity_request,
  _upsert_entity_response,
  add_case_comment_default_space_request,
  add_case_comment_default_space_response,
  add_case_file_default_space_request,
  add_case_file_default_space_response,
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
  create_agent_key_request,
  create_agent_key_response,
  create_annotation_request,
  create_annotation_response,
  create_case_default_space_request,
  create_case_default_space_response,
  create_data_view_defaultw_request,
  create_data_view_defaultw_response,
  create_runtime_field_default_request,
  create_runtime_field_default_response,
  create_saved_object_id_request,
  create_saved_object_id_response,
  create_saved_object_request,
  create_saved_object_response,
  create_slo_op_request,
  create_slo_op_response,
  create_update_agent_configuration_request,
  create_update_agent_configuration_response,
  create_update_runtime_field_default_request,
  create_update_runtime_field_default_response,
  delete_actions_connector_id_request,
  delete_actions_connector_id_response,
  delete_agent_builder_agents_id_request,
  delete_agent_builder_agents_id_response,
  delete_agent_builder_conversations_conversation_id_request,
  delete_agent_builder_conversations_conversation_id_response,
  delete_agent_builder_tools_id_request,
  delete_agent_builder_tools_id_response,
  delete_agent_configuration_request,
  delete_agent_configuration_response,
  delete_alerting_rule_id_request,
  delete_alerting_rule_id_response,
  delete_alerting_rule_ruleid_snooze_schedule_scheduleid_request,
  delete_alerting_rule_ruleid_snooze_schedule_scheduleid_response,
  delete_case_comment_default_space_request,
  delete_case_comment_default_space_response,
  delete_case_comments_default_space_request,
  delete_case_comments_default_space_response,
  delete_case_default_space_request,
  delete_case_default_space_response,
  delete_data_view_default_request,
  delete_data_view_default_response,
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
  delete_logstash_pipeline_request,
  delete_logstash_pipeline_response,
  delete_maintenance_window_id_request,
  delete_maintenance_window_id_response,
  delete_parameter_request,
  delete_parameter_response,
  delete_parameters_request,
  delete_parameters_response,
  delete_private_location_request,
  delete_private_location_response,
  delete_rollup_data_op_request,
  delete_rollup_data_op_response,
  delete_runtime_field_default_request,
  delete_runtime_field_default_response,
  delete_security_role_name_request,
  delete_security_role_name_response,
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
  delete_url_request,
  delete_url_response,
  disable_slo_op_request,
  disable_slo_op_response,
  enable_slo_op_request,
  enable_slo_op_response,
  find_case_activity_default_space_request,
  find_case_activity_default_space_response,
  find_case_comments_default_space_request,
  find_case_comments_default_space_response,
  find_case_connectors_default_space_request,
  find_case_connectors_default_space_response,
  find_cases_default_space_request,
  find_cases_default_space_response,
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
  get_agent_builder_tools_id_request,
  get_agent_builder_tools_id_response,
  get_agent_builder_tools_request,
  get_agent_builder_tools_response,
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
  get_logstash_pipeline_request,
  get_logstash_pipeline_response,
  get_logstash_pipelines_request,
  get_logstash_pipelines_response,
  get_maintenance_window_find_request,
  get_maintenance_window_find_response,
  get_maintenance_window_id_request,
  get_maintenance_window_id_response,
  get_parameter_request,
  get_parameter_response,
  get_parameters_request,
  get_parameters_response,
  get_private_location_request,
  get_private_location_response,
  get_private_locations_request,
  get_private_locations_response,
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
  get_upgrade_status_request,
  get_upgrade_status_response,
  get_uptime_settings_request,
  get_uptime_settings_response,
  get_url_request,
  get_url_response,
  ml_sync_request,
  ml_sync_response,
  observability_ai_assistant_chat_complete_request,
  observability_ai_assistant_chat_complete_response,
  patch_maintenance_window_id_request,
  patch_maintenance_window_id_response,
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
  reset_slo_op_request,
  reset_slo_op_response,
  resolve_import_errors_request,
  resolve_import_errors_response,
  resolve_saved_object_request,
  resolve_saved_object_response,
  resolve_url_request,
  resolve_url_response,
  rotate_encryption_key_request,
  rotate_encryption_key_response,
  save_apm_server_schema_request,
  save_apm_server_schema_response,
  search_single_configuration_request,
  search_single_configuration_response,
  set_case_configuration_default_space_request,
  set_case_configuration_default_space_response,
  set_default_datail_view_default_request,
  set_default_datail_view_default_response,
  swap_data_views_default_request,
  swap_data_views_default_response,
  task_manager_health_request,
  task_manager_health_response,
  update_case_comment_default_space_request,
  update_case_comment_default_space_response,
  update_case_configuration_default_space_request,
  update_case_configuration_default_space_response,
  update_case_default_space_request,
  update_case_default_space_response,
  update_data_view_default_request,
  update_data_view_default_response,
  update_fields_metadata_default_request,
  update_fields_metadata_default_response,
  update_runtime_field_default_request,
  update_runtime_field_default_response,
  update_saved_object_request,
  update_saved_object_response,
  update_slo_op_request,
  update_slo_op_response,
  upload_source_map_request,
  upload_source_map_response,
} from './schemas/kibana_openapi_zod.gen';
import type { InternalConnectorContract } from '../../types/latest';
import { getShape } from '../utils';

// import all needed request and response schemas generated from the OpenAPI spec

// declare contracts
const GET_ACTIONS_CONNECTOR_TYPES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_actions_connector_types',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector_types</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You do not need any Kibana feature privileges to run this API.`,
  methods: ['get'],
  patterns: ['/api/actions/connector_types'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['feature_id'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_actions_connector_types_request).body),
      ...getShape(getShape(get_actions_connector_types_request).path),
      ...getShape(getShape(get_actions_connector_types_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_actions_connector_types_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_ACTIONS_CONNECTOR_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_actions_connector_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: When you delete a connector, it cannot be recovered.`,
  methods: ['delete'],
  patterns: ['/api/actions/connector/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_actions_connector_id_request).body),
      ...getShape(getShape(delete_actions_connector_id_request).path),
      ...getShape(getShape(delete_actions_connector_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_actions_connector_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_ACTIONS_CONNECTOR_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_actions_connector_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/actions/connector/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_actions_connector_id_request).body),
      ...getShape(getShape(get_actions_connector_id_request).path),
      ...getShape(getShape(get_actions_connector_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_actions_connector_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_ACTIONS_CONNECTOR_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_actions_connector_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/actions/connector/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_actions_connector_id_request).body),
      ...getShape(getShape(post_actions_connector_id_request).path),
      ...getShape(getShape(post_actions_connector_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_actions_connector_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_ACTIONS_CONNECTOR_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_actions_connector_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['put'],
  patterns: ['/api/actions/connector/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_actions_connector_id_request).body),
      ...getShape(getShape(put_actions_connector_id_request).path),
      ...getShape(getShape(put_actions_connector_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_actions_connector_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_ACTIONS_CONNECTOR_ID_EXECUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_actions_connector_id_execute',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector/{id}/_execute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You can use this API to test an action that involves interaction with Kibana services or integrations with third-party systems.`,
  methods: ['post'],
  patterns: ['/api/actions/connector/{id}/_execute'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_actions_connector_id_execute_request).body),
      ...getShape(getShape(post_actions_connector_id_execute_request).path),
      ...getShape(getShape(post_actions_connector_id_execute_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_actions_connector_id_execute_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_ACTIONS_CONNECTORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_actions_connectors',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connectors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/actions/connectors'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_actions_connectors_request).body),
      ...getShape(getShape(get_actions_connectors_request).path),
      ...getShape(getShape(get_actions_connectors_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_actions_connectors_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_AGENT_BUILDER_A2A_AGENTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_a2a_agentid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/a2a/{agentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: This endpoint is designed for A2A protocol clients and should not be used directly via REST APIs. Use an A2A SDK or A2A Inspector instead.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['post'],
  patterns: ['/api/agent_builder/a2a/{agentId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_agent_builder_a2a_agentid_request).body),
      ...getShape(getShape(post_agent_builder_a2a_agentid_request).path),
      ...getShape(getShape(post_agent_builder_a2a_agentid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_agent_builder_a2a_agentid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_AGENT_BUILDER_A2A_AGENTID_JSON_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_a2a_agentid_json',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/a2a/{agentId}.json</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get agent discovery metadata in JSON format. Use this endpoint to provide agent information for A2A protocol integration and discovery.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['get'],
  patterns: ['/api/agent_builder/a2a/{agentId}.json'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_agent_builder_a2a_agentid_json_request).body),
      ...getShape(getShape(get_agent_builder_a2a_agentid_json_request).path),
      ...getShape(getShape(get_agent_builder_a2a_agentid_json_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_agent_builder_a2a_agentid_json_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_AGENT_BUILDER_AGENTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_agents',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/agents</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List all available agents. Use this endpoint to retrieve complete agent information including their current configuration and assigned tools.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['get'],
  patterns: ['/api/agent_builder/agents'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_agent_builder_agents_request).body),
      ...getShape(getShape(get_agent_builder_agents_request).path),
      ...getShape(getShape(get_agent_builder_agents_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_agent_builder_agents_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_AGENT_BUILDER_AGENTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_agents',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/agents</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new agent. Use this endpoint to define the agent's behavior, appearance, and capabilities through comprehensive configuration options.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['post'],
  patterns: ['/api/agent_builder/agents'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_agent_builder_agents_request).body),
      ...getShape(getShape(post_agent_builder_agents_request).path),
      ...getShape(getShape(post_agent_builder_agents_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_agent_builder_agents_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_AGENT_BUILDER_AGENTS_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_agent_builder_agents_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/agents/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an agent by ID. This action cannot be undone.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['delete'],
  patterns: ['/api/agent_builder/agents/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_agent_builder_agents_id_request).body),
      ...getShape(getShape(delete_agent_builder_agents_id_request).path),
      ...getShape(getShape(delete_agent_builder_agents_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_agent_builder_agents_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_AGENT_BUILDER_AGENTS_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_agents_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/agents/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a specific agent by ID. Use this endpoint to retrieve the complete agent definition including all configuration details and tool assignments.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['get'],
  patterns: ['/api/agent_builder/agents/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_agent_builder_agents_id_request).body),
      ...getShape(getShape(get_agent_builder_agents_id_request).path),
      ...getShape(getShape(get_agent_builder_agents_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_agent_builder_agents_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_AGENT_BUILDER_AGENTS_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_agent_builder_agents_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/agents/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing agent configuration. Use this endpoint to modify any aspect of the agent's behavior, appearance, or capabilities.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['put'],
  patterns: ['/api/agent_builder/agents/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_agent_builder_agents_id_request).body),
      ...getShape(getShape(put_agent_builder_agents_id_request).path),
      ...getShape(getShape(put_agent_builder_agents_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_agent_builder_agents_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_AGENT_BUILDER_CONVERSATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_conversations',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/conversations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List all conversations for a user. Use the optional agent ID to filter conversations by a specific agent.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['get'],
  patterns: ['/api/agent_builder/conversations'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['agent_id'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_agent_builder_conversations_request).body),
      ...getShape(getShape(get_agent_builder_conversations_request).path),
      ...getShape(getShape(get_agent_builder_conversations_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_agent_builder_conversations_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_AGENT_BUILDER_CONVERSATIONS_CONVERSATION_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_agent_builder_conversations_conversation_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/conversations/{conversation_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a conversation by ID. This action cannot be undone.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['delete'],
  patterns: ['/api/agent_builder/conversations/{conversation_id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['conversation_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_agent_builder_conversations_conversation_id_request).body),
      ...getShape(getShape(delete_agent_builder_conversations_conversation_id_request).path),
      ...getShape(getShape(delete_agent_builder_conversations_conversation_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_agent_builder_conversations_conversation_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_AGENT_BUILDER_CONVERSATIONS_CONVERSATION_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_conversations_conversation_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/conversations/{conversation_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a specific conversation by ID. Use this endpoint to retrieve the complete conversation history including all messages and metadata.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['get'],
  patterns: ['/api/agent_builder/conversations/{conversation_id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['conversation_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_agent_builder_conversations_conversation_id_request).body),
      ...getShape(getShape(get_agent_builder_conversations_conversation_id_request).path),
      ...getShape(getShape(get_agent_builder_conversations_conversation_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_agent_builder_conversations_conversation_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_AGENT_BUILDER_CONVERSE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_converse',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/converse</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Send a message to an agent and receive a complete response. This synchronous endpoint waits for the agent to fully process your request before returning the final result. Use this for simple chat interactions where you need the complete response.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['post'],
  patterns: ['/api/agent_builder/converse'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_agent_builder_converse_request).body),
      ...getShape(getShape(post_agent_builder_converse_request).path),
      ...getShape(getShape(post_agent_builder_converse_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_agent_builder_converse_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_AGENT_BUILDER_CONVERSE_ASYNC_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_converse_async',
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
  methods: ['post'],
  patterns: ['/api/agent_builder/converse/async'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_agent_builder_converse_async_request).body),
      ...getShape(getShape(post_agent_builder_converse_async_request).path),
      ...getShape(getShape(post_agent_builder_converse_async_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_agent_builder_converse_async_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_AGENT_BUILDER_MCP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_mcp',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/mcp</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: This endpoint is designed for MCP clients (Claude Desktop, Cursor, VS Code, etc.) and should not be used directly via REST APIs. Use MCP Inspector or native MCP clients instead.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['post'],
  patterns: ['/api/agent_builder/mcp'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_agent_builder_mcp_request).body),
      ...getShape(getShape(post_agent_builder_mcp_request).path),
      ...getShape(getShape(post_agent_builder_mcp_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_agent_builder_mcp_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_AGENT_BUILDER_TOOLS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_tools',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List all available tools. Use this endpoint to retrieve complete tool definitions including their schemas and configuration requirements.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['get'],
  patterns: ['/api/agent_builder/tools'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_agent_builder_tools_request).body),
      ...getShape(getShape(get_agent_builder_tools_request).path),
      ...getShape(getShape(get_agent_builder_tools_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_agent_builder_tools_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_AGENT_BUILDER_TOOLS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_tools',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new tool. Use this endpoint to define a custom tool with specific functionality and configuration for use by agents.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['post'],
  patterns: ['/api/agent_builder/tools'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_agent_builder_tools_request).body),
      ...getShape(getShape(post_agent_builder_tools_request).path),
      ...getShape(getShape(post_agent_builder_tools_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_agent_builder_tools_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_AGENT_BUILDER_TOOLS_EXECUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_tools_execute',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools/_execute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Execute a tool with parameters. Use this endpoint to run a tool directly with specified inputs and optional external connector integration.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['post'],
  patterns: ['/api/agent_builder/tools/_execute'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_agent_builder_tools_execute_request).body),
      ...getShape(getShape(post_agent_builder_tools_execute_request).path),
      ...getShape(getShape(post_agent_builder_tools_execute_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_agent_builder_tools_execute_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_AGENT_BUILDER_TOOLS_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_agent_builder_tools_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a tool by ID. This action cannot be undone.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['delete'],
  patterns: ['/api/agent_builder/tools/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_agent_builder_tools_id_request).body),
      ...getShape(getShape(delete_agent_builder_tools_id_request).path),
      ...getShape(getShape(delete_agent_builder_tools_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_agent_builder_tools_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_AGENT_BUILDER_TOOLS_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_tools_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a specific tool by ID. Use this endpoint to retrieve the complete tool definition including its schema and configuration requirements.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['get'],
  patterns: ['/api/agent_builder/tools/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_agent_builder_tools_id_request).body),
      ...getShape(getShape(get_agent_builder_tools_id_request).path),
      ...getShape(getShape(get_agent_builder_tools_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_agent_builder_tools_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_AGENT_BUILDER_TOOLS_TOOLID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_agent_builder_tools_toolid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools/{toolId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing tool. Use this endpoint to modify any aspect of the tool's configuration or metadata.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['put'],
  patterns: ['/api/agent_builder/tools/{toolId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['toolId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_agent_builder_tools_toolid_request).body),
      ...getShape(getShape(put_agent_builder_tools_toolid_request).path),
      ...getShape(getShape(put_agent_builder_tools_toolid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_agent_builder_tools_toolid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETALERTINGHEALTH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getAlertingHealth',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/_health</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Management > Stack Rules** feature or for at least one of the **Analytics > Discover**, **Analytics > Machine Learning**, **Observability**, or **Security** features.
`,
  methods: ['get'],
  patterns: ['/api/alerting/_health'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_alerting_health_request).body),
      ...getShape(getShape(get_alerting_health_request).path),
      ...getShape(getShape(get_alerting_health_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_alerting_health_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETRULETYPES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getRuleTypes',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule_types</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

If you have \`read\` privileges for one or more Kibana features, the API response contains information about the appropriate rule types. For example, there are rule types associated with the **Management > Stack Rules** feature, **Analytics > Discover** and **Machine Learning** features, **Observability** features, and **Security** features. To get rule types associated with the **Stack Monitoring** feature, use the \`monitoring_user\` built-in role.
`,
  methods: ['get'],
  patterns: ['/api/alerting/rule_types'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_rule_types_request).body),
      ...getShape(getShape(get_rule_types_request).path),
      ...getShape(getShape(get_rule_types_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_rule_types_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_ALERTING_RULE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_alerting_rule_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['delete'],
  patterns: ['/api/alerting/rule/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_alerting_rule_id_request).body),
      ...getShape(getShape(delete_alerting_rule_id_request).path),
      ...getShape(getShape(delete_alerting_rule_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_alerting_rule_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_ALERTING_RULE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_alerting_rule_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/alerting/rule/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_alerting_rule_id_request).body),
      ...getShape(getShape(get_alerting_rule_id_request).path),
      ...getShape(getShape(get_alerting_rule_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_alerting_rule_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_ALERTING_RULE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/alerting/rule/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_alerting_rule_id_request).body),
      ...getShape(getShape(post_alerting_rule_id_request).path),
      ...getShape(getShape(post_alerting_rule_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_alerting_rule_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_ALERTING_RULE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_alerting_rule_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['put'],
  patterns: ['/api/alerting/rule/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_alerting_rule_id_request).body),
      ...getShape(getShape(put_alerting_rule_id_request).path),
      ...getShape(getShape(put_alerting_rule_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_alerting_rule_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_ALERTING_RULE_ID_DISABLE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_disable',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/_disable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/alerting/rule/{id}/_disable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_alerting_rule_id_disable_request).body),
      ...getShape(getShape(post_alerting_rule_id_disable_request).path),
      ...getShape(getShape(post_alerting_rule_id_disable_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_alerting_rule_id_disable_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_ALERTING_RULE_ID_ENABLE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_enable',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/_enable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/alerting/rule/{id}/_enable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_alerting_rule_id_enable_request).body),
      ...getShape(getShape(post_alerting_rule_id_enable_request).path),
      ...getShape(getShape(post_alerting_rule_id_enable_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_alerting_rule_id_enable_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_ALERTING_RULE_ID_MUTE_ALL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_mute_all',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/_mute_all</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/alerting/rule/{id}/_mute_all'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_alerting_rule_id_mute_all_request).body),
      ...getShape(getShape(post_alerting_rule_id_mute_all_request).path),
      ...getShape(getShape(post_alerting_rule_id_mute_all_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_alerting_rule_id_mute_all_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_ALERTING_RULE_ID_UNMUTE_ALL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_unmute_all',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/_unmute_all</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/alerting/rule/{id}/_unmute_all'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_alerting_rule_id_unmute_all_request).body),
      ...getShape(getShape(post_alerting_rule_id_unmute_all_request).path),
      ...getShape(getShape(post_alerting_rule_id_unmute_all_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_alerting_rule_id_unmute_all_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_ALERTING_RULE_ID_UPDATE_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_update_api_key',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/_update_api_key</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/alerting/rule/{id}/_update_api_key'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_alerting_rule_id_update_api_key_request).body),
      ...getShape(getShape(post_alerting_rule_id_update_api_key_request).path),
      ...getShape(getShape(post_alerting_rule_id_update_api_key_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_alerting_rule_id_update_api_key_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_ALERTING_RULE_ID_SNOOZE_SCHEDULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_id_snooze_schedule',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{id}/snooze_schedule</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

When you snooze a rule, the rule checks continue to run but alerts will not generate actions. You can snooze for a specified period of time and schedule single or recurring downtimes.`,
  methods: ['post'],
  patterns: ['/api/alerting/rule/{id}/snooze_schedule'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_alerting_rule_id_snooze_schedule_request).body),
      ...getShape(getShape(post_alerting_rule_id_snooze_schedule_request).path),
      ...getShape(getShape(post_alerting_rule_id_snooze_schedule_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_alerting_rule_id_snooze_schedule_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_ALERTING_RULE_RULE_ID_ALERT_ALERT_ID_MUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_rule_id_alert_alert_id_mute',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{rule_id}/alert/{alert_id}/_mute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/alerting/rule/{rule_id}/alert/{alert_id}/_mute'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['rule_id', 'alert_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_alerting_rule_rule_id_alert_alert_id_mute_request).body),
      ...getShape(getShape(post_alerting_rule_rule_id_alert_alert_id_mute_request).path),
      ...getShape(getShape(post_alerting_rule_rule_id_alert_alert_id_mute_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_alerting_rule_rule_id_alert_alert_id_mute_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_ALERTING_RULE_RULE_ID_ALERT_ALERT_ID_UNMUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_alerting_rule_rule_id_alert_alert_id_unmute',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{rule_id}/alert/{alert_id}/_unmute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/alerting/rule/{rule_id}/alert/{alert_id}/_unmute'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['rule_id', 'alert_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_alerting_rule_rule_id_alert_alert_id_unmute_request).body),
      ...getShape(getShape(post_alerting_rule_rule_id_alert_alert_id_unmute_request).path),
      ...getShape(getShape(post_alerting_rule_rule_id_alert_alert_id_unmute_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_alerting_rule_rule_id_alert_alert_id_unmute_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_ALERTING_RULE_RULEID_SNOOZE_SCHEDULE_SCHEDULEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_alerting_rule_ruleid_snooze_schedule_scheduleid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{ruleId}/snooze_schedule/{scheduleId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['delete'],
  patterns: ['/api/alerting/rule/{ruleId}/snooze_schedule/{scheduleId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['ruleId', 'scheduleId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_alerting_rule_ruleid_snooze_schedule_scheduleid_request).body),
      ...getShape(getShape(delete_alerting_rule_ruleid_snooze_schedule_scheduleid_request).path),
      ...getShape(getShape(delete_alerting_rule_ruleid_snooze_schedule_scheduleid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_alerting_rule_ruleid_snooze_schedule_scheduleid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_ALERTING_RULES_FIND_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_alerting_rules_find',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rules/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
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
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_alerting_rules_find_request).body),
      ...getShape(getShape(get_alerting_rules_find_request).path),
      ...getShape(getShape(get_alerting_rules_find_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_alerting_rules_find_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEAGENTKEY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createAgentKey',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/agent_keys</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new agent key for APM.
The user creating an APM agent API key must have at least the \`manage_own_api_key\` cluster privilege and the APM application-level privileges that it wishes to grant.
After it is created, you can copy the API key (Base64 encoded) and use it to to authorize requests from APM agents to the APM Server.
`,
  methods: ['post'],
  patterns: ['/api/apm/agent_keys'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(create_agent_key_request).body),
      ...getShape(getShape(create_agent_key_request).path),
      ...getShape(getShape(create_agent_key_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(create_agent_key_response)),
    }),
    error: z.any().optional(),
  }),
};
const SAVEAPMSERVERSCHEMA_CONTRACT: InternalConnectorContract = {
  type: 'kibana.saveApmServerSchema',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/fleet/apm_server_schema</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/apm/fleet/apm_server_schema'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(save_apm_server_schema_request).body),
      ...getShape(getShape(save_apm_server_schema_request).path),
      ...getShape(getShape(save_apm_server_schema_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(save_apm_server_schema_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEANNOTATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createAnnotation',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/services/{serviceName}/annotation</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new annotation for a specific service.`,
  methods: ['post'],
  patterns: ['/api/apm/services/{serviceName}/annotation'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['serviceName'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(create_annotation_request).body),
      ...getShape(getShape(create_annotation_request).path),
      ...getShape(getShape(create_annotation_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(create_annotation_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETANNOTATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getAnnotation',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/services/{serviceName}/annotation/search</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Search for annotations related to a specific service.`,
  methods: ['get'],
  patterns: ['/api/apm/services/{serviceName}/annotation/search'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['serviceName'],
    urlParams: ['environment', 'start', 'end'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_annotation_request).body),
      ...getShape(getShape(get_annotation_request).path),
      ...getShape(getShape(get_annotation_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_annotation_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETEAGENTCONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteAgentConfiguration',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['delete'],
  patterns: ['/api/apm/settings/agent-configuration'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_agent_configuration_request).body),
      ...getShape(getShape(delete_agent_configuration_request).path),
      ...getShape(getShape(delete_agent_configuration_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_agent_configuration_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETAGENTCONFIGURATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getAgentConfigurations',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/apm/settings/agent-configuration'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_agent_configurations_request).body),
      ...getShape(getShape(get_agent_configurations_request).path),
      ...getShape(getShape(get_agent_configurations_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_agent_configurations_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEUPDATEAGENTCONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createUpdateAgentConfiguration',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['put'],
  patterns: ['/api/apm/settings/agent-configuration'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['overwrite'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(create_update_agent_configuration_request).body),
      ...getShape(getShape(create_update_agent_configuration_request).path),
      ...getShape(getShape(create_update_agent_configuration_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(create_update_agent_configuration_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETAGENTNAMEFORSERVICE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getAgentNameForService',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration/agent_name</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve \`agentName\` for a service.`,
  methods: ['get'],
  patterns: ['/api/apm/settings/agent-configuration/agent_name'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['serviceName'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_agent_name_for_service_request).body),
      ...getShape(getShape(get_agent_name_for_service_request).path),
      ...getShape(getShape(get_agent_name_for_service_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_agent_name_for_service_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETENVIRONMENTSFORSERVICE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getEnvironmentsForService',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration/environments</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/apm/settings/agent-configuration/environments'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['serviceName'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_environments_for_service_request).body),
      ...getShape(getShape(get_environments_for_service_request).path),
      ...getShape(getShape(get_environments_for_service_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_environments_for_service_response)),
    }),
    error: z.any().optional(),
  }),
};
const SEARCHSINGLECONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.searchSingleConfiguration',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration/search</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

This endpoint enables you to search for a single agent configuration and update the 'applied_by_agent' field.
`,
  methods: ['post'],
  patterns: ['/api/apm/settings/agent-configuration/search'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(search_single_configuration_request).body),
      ...getShape(getShape(search_single_configuration_request).path),
      ...getShape(getShape(search_single_configuration_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(search_single_configuration_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETSINGLEAGENTCONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getSingleAgentConfiguration',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration/view</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/apm/settings/agent-configuration/view'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['name', 'environment'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_single_agent_configuration_request).body),
      ...getShape(getShape(get_single_agent_configuration_request).path),
      ...getShape(getShape(get_single_agent_configuration_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_single_agent_configuration_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETSOURCEMAPS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getSourceMaps',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/sourcemaps</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get an array of Fleet artifacts, including source map uploads. You must have \`read\` or \`all\` Kibana privileges for the APM and User Experience feature.
`,
  methods: ['get'],
  patterns: ['/api/apm/sourcemaps'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'perPage'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_source_maps_request).body),
      ...getShape(getShape(get_source_maps_request).path),
      ...getShape(getShape(get_source_maps_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_source_maps_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPLOADSOURCEMAP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.uploadSourceMap',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/sourcemaps</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upload a source map for a specific service and version. You must have \`all\` Kibana privileges for the APM and User Experience feature.
The maximum payload size is \`1mb\`. If you attempt to upload a source map that exceeds the maximum payload size, you will get a 413 error. Before uploading source maps that exceed this default, change the maximum payload size allowed by Kibana with the \`server.maxPayload\` variable.
`,
  methods: ['post'],
  patterns: ['/api/apm/sourcemaps'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(upload_source_map_request).body),
      ...getShape(getShape(upload_source_map_request).path),
      ...getShape(getShape(upload_source_map_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(upload_source_map_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETESOURCEMAP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteSourceMap',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/sourcemaps/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a previously uploaded source map. You must have \`all\` Kibana privileges for the APM and User Experience feature.
`,
  methods: ['delete'],
  patterns: ['/api/apm/sourcemaps/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_source_map_request).body),
      ...getShape(getShape(delete_source_map_request).path),
      ...getShape(getShape(delete_source_map_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_source_map_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETEASSETCRITICALITYRECORD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteAssetCriticalityRecord',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete the asset criticality record for a specific entity.`,
  methods: ['delete'],
  patterns: ['/api/asset_criticality'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id_value', 'id_field', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_asset_criticality_record_request).body),
      ...getShape(getShape(_delete_asset_criticality_record_request).path),
      ...getShape(getShape(_delete_asset_criticality_record_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_asset_criticality_record_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETASSETCRITICALITYRECORD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetAssetCriticalityRecord',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the asset criticality record for a specific entity.`,
  methods: ['get'],
  patterns: ['/api/asset_criticality'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id_value', 'id_field'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_get_asset_criticality_record_request).body),
      ...getShape(getShape(_get_asset_criticality_record_request).path),
      ...getShape(getShape(_get_asset_criticality_record_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_get_asset_criticality_record_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEASSETCRITICALITYRECORD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateAssetCriticalityRecord',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create or update an asset criticality record for a specific entity.

If a record already exists for the specified entity, that record is overwritten with the specified value. If a record doesn't exist for the specified entity, a new record is created.
`,
  methods: ['post'],
  patterns: ['/api/asset_criticality'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_asset_criticality_record_request).body),
      ...getShape(getShape(_create_asset_criticality_record_request).path),
      ...getShape(getShape(_create_asset_criticality_record_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_asset_criticality_record_response)),
    }),
    error: z.any().optional(),
  }),
};
const BULKUPSERTASSETCRITICALITYRECORDS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.BulkUpsertAssetCriticalityRecords',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality/bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Bulk upsert up to 1000 asset criticality records.

If asset criticality records already exist for the specified entities, those records are overwritten with the specified values. If asset criticality records don't exist for the specified entities, new records are created.
`,
  methods: ['post'],
  patterns: ['/api/asset_criticality/bulk'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_bulk_upsert_asset_criticality_records_request).body),
      ...getShape(getShape(_bulk_upsert_asset_criticality_records_request).path),
      ...getShape(getShape(_bulk_upsert_asset_criticality_records_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_bulk_upsert_asset_criticality_records_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDASSETCRITICALITYRECORDS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindAssetCriticalityRecords',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality/list</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List asset criticality records, paging, sorting and filtering as needed.`,
  methods: ['get'],
  patterns: ['/api/asset_criticality/list'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['sort_field', 'sort_direction', 'page', 'per_page', 'kuery'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_find_asset_criticality_records_request).body),
      ...getShape(getShape(_find_asset_criticality_records_request).path),
      ...getShape(getShape(_find_asset_criticality_records_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_find_asset_criticality_records_response)),
    }),
    error: z.any().optional(),
  }),
};
const POSTATTACKDISCOVERYBULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PostAttackDiscoveryBulk',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/_bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Performs bulk updates on multiple Attack discoveries, including workflow status changes and visibility settings. This endpoint allows efficient batch processing of alert modifications without requiring individual API calls for each alert. \`Technical preview\``,
  methods: ['post'],
  patterns: ['/api/attack_discovery/_bulk'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_post_attack_discovery_bulk_request).body),
      ...getShape(getShape(_post_attack_discovery_bulk_request).path),
      ...getShape(getShape(_post_attack_discovery_bulk_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_post_attack_discovery_bulk_response)),
    }),
    error: z.any().optional(),
  }),
};
const ATTACKDISCOVERYFIND_CONTRACT: InternalConnectorContract = {
  type: 'kibana.AttackDiscoveryFind',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Find Attack discoveries that match the search criteria. Supports free text search, filtering, pagination, and sorting. \`Technical preview\``,
  methods: ['get'],
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
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_attack_discovery_find_request).body),
      ...getShape(getShape(_attack_discovery_find_request).path),
      ...getShape(getShape(_attack_discovery_find_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_attack_discovery_find_response)),
    }),
    error: z.any().optional(),
  }),
};
const POSTATTACKDISCOVERYGENERATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PostAttackDiscoveryGenerate',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/_generate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Initiates the generation of attack discoveries by analyzing security alerts using AI. Returns an execution UUID that can be used to track the generation progress and retrieve results. Results may also be retrieved via the find endpoint. \`Technical preview\``,
  methods: ['post'],
  patterns: ['/api/attack_discovery/_generate'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_post_attack_discovery_generate_request).body),
      ...getShape(getShape(_post_attack_discovery_generate_request).path),
      ...getShape(getShape(_post_attack_discovery_generate_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_post_attack_discovery_generate_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETATTACKDISCOVERYGENERATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetAttackDiscoveryGenerations',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/generations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the latest attack discovery generations metadata (that are not dismissed) for the current user. This endpoint retrieves generation metadata including execution status and statistics for Attack discovery generations. \`Technical preview\``,
  methods: ['get'],
  patterns: ['/api/attack_discovery/generations'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['end', 'size', 'start'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_get_attack_discovery_generations_request).body),
      ...getShape(getShape(_get_attack_discovery_generations_request).path),
      ...getShape(getShape(_get_attack_discovery_generations_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_get_attack_discovery_generations_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETATTACKDISCOVERYGENERATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetAttackDiscoveryGeneration',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/generations/{execution_uuid}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Returns a specific Attack discovery generation, including all generated Attack discoveries and associated metadata, including execution status and statistics. \`Technical preview\``,
  methods: ['get'],
  patterns: ['/api/attack_discovery/generations/{execution_uuid}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['execution_uuid'],
    urlParams: ['enable_field_rendering', 'with_replacements'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_get_attack_discovery_generation_request).body),
      ...getShape(getShape(_get_attack_discovery_generation_request).path),
      ...getShape(getShape(_get_attack_discovery_generation_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_get_attack_discovery_generation_response)),
    }),
    error: z.any().optional(),
  }),
};
const POSTATTACKDISCOVERYGENERATIONSDISMISS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PostAttackDiscoveryGenerationsDismiss',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/generations/{execution_uuid}/_dismiss</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Dismisses an attack discovery generation for the current user, indicating that it's status should not be reported in the UI. This sets the generation's status to "dismissed" and affects how the generation appears in subsequent queries. \`Technical preview\``,
  methods: ['post'],
  patterns: ['/api/attack_discovery/generations/{execution_uuid}/_dismiss'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['execution_uuid'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_post_attack_discovery_generations_dismiss_request).body),
      ...getShape(getShape(_post_attack_discovery_generations_dismiss_request).path),
      ...getShape(getShape(_post_attack_discovery_generations_dismiss_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_post_attack_discovery_generations_dismiss_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateAttackDiscoverySchedules',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Creates a new Attack discovery schedule that analyzes security alerts at specified intervals. The schedule defines when and how Attack discovery analysis should run, including which alerts to analyze, which AI connector to use, and what actions to take when discoveries are found. \`Technical preview\``,
  methods: ['post'],
  patterns: ['/api/attack_discovery/schedules'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_attack_discovery_schedules_request).body),
      ...getShape(getShape(_create_attack_discovery_schedules_request).path),
      ...getShape(getShape(_create_attack_discovery_schedules_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_attack_discovery_schedules_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindAttackDiscoverySchedules',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Finds Attack discovery schedules that match the search criteria. Supports pagination and sorting by various fields. \`Technical preview\``,
  methods: ['get'],
  patterns: ['/api/attack_discovery/schedules/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'per_page', 'sort_field', 'sort_direction'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_find_attack_discovery_schedules_request).body),
      ...getShape(getShape(_find_attack_discovery_schedules_request).path),
      ...getShape(getShape(_find_attack_discovery_schedules_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_find_attack_discovery_schedules_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETEATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteAttackDiscoverySchedules',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Permanently deletes an Attack discovery schedule and all associated configuration. \`Technical preview\``,
  methods: ['delete'],
  patterns: ['/api/attack_discovery/schedules/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_attack_discovery_schedules_request).body),
      ...getShape(getShape(_delete_attack_discovery_schedules_request).path),
      ...getShape(getShape(_delete_attack_discovery_schedules_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_attack_discovery_schedules_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetAttackDiscoverySchedules',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieves a specific Attack discovery schedule by its unique identifier. Returns complete schedule configuration including parameters, interval settings, associated actions, and execution history. \`Technical preview\``,
  methods: ['get'],
  patterns: ['/api/attack_discovery/schedules/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_get_attack_discovery_schedules_request).body),
      ...getShape(getShape(_get_attack_discovery_schedules_request).path),
      ...getShape(getShape(_get_attack_discovery_schedules_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_get_attack_discovery_schedules_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATEATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateAttackDiscoverySchedules',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Updates an existing Attack discovery schedule with new configuration. All schedule properties can be modified including name, parameters, interval, and actions. The update operation replaces the entire schedule configuration with the provided values. \`Technical preview\``,
  methods: ['put'],
  patterns: ['/api/attack_discovery/schedules/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_update_attack_discovery_schedules_request).body),
      ...getShape(getShape(_update_attack_discovery_schedules_request).path),
      ...getShape(getShape(_update_attack_discovery_schedules_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_update_attack_discovery_schedules_response)),
    }),
    error: z.any().optional(),
  }),
};
const DISABLEATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DisableAttackDiscoverySchedules',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}/_disable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Disables an Attack discovery schedule, preventing it from running according to its configured interval. The schedule configuration is preserved and can be re-enabled later. Any currently running executions will complete, but no new executions will be started. \`Technical preview\``,
  methods: ['post'],
  patterns: ['/api/attack_discovery/schedules/{id}/_disable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_disable_attack_discovery_schedules_request).body),
      ...getShape(getShape(_disable_attack_discovery_schedules_request).path),
      ...getShape(getShape(_disable_attack_discovery_schedules_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_disable_attack_discovery_schedules_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENABLEATTACKDISCOVERYSCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EnableAttackDiscoverySchedules',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}/_enable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Enables a previously disabled Attack discovery schedule, allowing it to run according to its configured interval. Once enabled, the schedule will begin executing at the next scheduled time based on its interval configuration. \`Technical preview\``,
  methods: ['post'],
  patterns: ['/api/attack_discovery/schedules/{id}/_enable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_enable_attack_discovery_schedules_request).body),
      ...getShape(getShape(_enable_attack_discovery_schedules_request).path),
      ...getShape(getShape(_enable_attack_discovery_schedules_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_enable_attack_discovery_schedules_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETECASEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteCaseDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` or \`all\` privileges and the \`delete\` sub-feature privilege for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're deleting.
`,
  methods: ['delete'],
  patterns: ['/api/cases'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_case_default_space_request).body),
      ...getShape(getShape(delete_case_default_space_request).path),
      ...getShape(getShape(delete_case_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_case_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATECASEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateCaseDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the  **Management**, **Observability**, or **Security** section of the Kibana  feature privileges, depending on the owner of the case you're updating.
`,
  methods: ['patch'],
  patterns: ['/api/cases'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(update_case_default_space_request).body),
      ...getShape(getShape(update_case_default_space_request).path),
      ...getShape(getShape(update_case_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(update_case_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATECASEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createCaseDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana  feature privileges, depending on the owner of the case you're creating.
`,
  methods: ['post'],
  patterns: ['/api/cases'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(create_case_default_space_request).body),
      ...getShape(getShape(create_case_default_space_request).path),
      ...getShape(getShape(create_case_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(create_case_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDCASESDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findCasesDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're seeking.
`,
  methods: ['get'],
  patterns: ['/api/cases/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(find_cases_default_space_request).body),
      ...getShape(getShape(find_cases_default_space_request).path),
      ...getShape(getShape(find_cases_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(find_cases_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETCASEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're seeking.
`,
  methods: ['get'],
  patterns: ['/api/cases/{caseId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_case_default_space_request).body),
      ...getShape(getShape(get_case_default_space_request).path),
      ...getShape(getShape(get_case_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_case_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETCASEALERTSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseAlertsDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/alerts</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're seeking.
`,
  methods: ['get'],
  patterns: ['/api/cases/{caseId}/alerts'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_case_alerts_default_space_request).body),
      ...getShape(getShape(get_case_alerts_default_space_request).path),
      ...getShape(getShape(get_case_alerts_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_case_alerts_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETECASECOMMENTSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteCaseCommentsDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Deletes all comments and alerts from a case. You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're deleting.
`,
  methods: ['delete'],
  patterns: ['/api/cases/{caseId}/comments'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_case_comments_default_space_request).body),
      ...getShape(getShape(delete_case_comments_default_space_request).path),
      ...getShape(getShape(delete_case_comments_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_case_comments_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATECASECOMMENTDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateCaseCommentDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're updating. NOTE: You cannot change the comment type or the owner of a comment.
`,
  methods: ['patch'],
  patterns: ['/api/cases/{caseId}/comments'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(update_case_comment_default_space_request).body),
      ...getShape(getShape(update_case_comment_default_space_request).path),
      ...getShape(getShape(update_case_comment_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(update_case_comment_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const ADDCASECOMMENTDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.addCaseCommentDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're creating. NOTE: Each case can have a maximum of 1,000 alerts.
`,
  methods: ['post'],
  patterns: ['/api/cases/{caseId}/comments'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(add_case_comment_default_space_request).body),
      ...getShape(getShape(add_case_comment_default_space_request).path),
      ...getShape(getShape(add_case_comment_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(add_case_comment_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDCASECOMMENTSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findCaseCommentsDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieves a paginated list of comments for a case. You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases with the comments you're seeking.
`,
  methods: ['get'],
  patterns: ['/api/cases/{caseId}/comments/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(find_case_comments_default_space_request).body),
      ...getShape(getShape(find_case_comments_default_space_request).path),
      ...getShape(getShape(find_case_comments_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(find_case_comments_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETECASECOMMENTDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteCaseCommentDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments/{commentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're deleting.
`,
  methods: ['delete'],
  patterns: ['/api/cases/{caseId}/comments/{commentId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_case_comment_default_space_request).body),
      ...getShape(getShape(delete_case_comment_default_space_request).path),
      ...getShape(getShape(delete_case_comment_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_case_comment_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETCASECOMMENTDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseCommentDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments/{commentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases with the comments you're seeking.
`,
  methods: ['get'],
  patterns: ['/api/cases/{caseId}/comments/{commentId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_case_comment_default_space_request).body),
      ...getShape(getShape(get_case_comment_default_space_request).path),
      ...getShape(getShape(get_case_comment_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_case_comment_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUSHCASEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.pushCaseDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/connector/{connectorId}/_push</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Actions and Connectors** feature in the **Management** section of the Kibana feature privileges. You must also have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're pushing.
`,
  methods: ['post'],
  patterns: ['/api/cases/{caseId}/connector/{connectorId}/_push'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(push_case_default_space_request).body),
      ...getShape(getShape(push_case_default_space_request).path),
      ...getShape(getShape(push_case_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(push_case_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const ADDCASEFILEDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.addCaseFileDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/files</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Attach a file to a case. You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're updating. The request must include:
- The \`Content-Type: multipart/form-data\` HTTP header.
- The location of the file that is being uploaded.
`,
  methods: ['post'],
  patterns: ['/api/cases/{caseId}/files'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(add_case_file_default_space_request).body),
      ...getShape(getShape(add_case_file_default_space_request).path),
      ...getShape(getShape(add_case_file_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(add_case_file_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDCASEACTIVITYDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findCaseActivityDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/user_actions/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrives a paginated list of user activity for a case. You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're seeking.
`,
  methods: ['get'],
  patterns: ['/api/cases/{caseId}/user_actions/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(find_case_activity_default_space_request).body),
      ...getShape(getShape(find_case_activity_default_space_request).path),
      ...getShape(getShape(find_case_activity_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(find_case_activity_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETCASESBYALERTDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCasesByAlertDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/alerts/{alertId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're seeking.
`,
  methods: ['get'],
  patterns: ['/api/cases/alerts/{alertId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_cases_by_alert_default_space_request).body),
      ...getShape(getShape(get_cases_by_alert_default_space_request).path),
      ...getShape(getShape(get_cases_by_alert_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_cases_by_alert_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETCASECONFIGURATIONDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseConfigurationDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/configure</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get setting details such as the closure type, custom fields, templatse, and the default connector for cases. You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on where the cases were created.
`,
  methods: ['get'],
  patterns: ['/api/cases/configure'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_case_configuration_default_space_request).body),
      ...getShape(getShape(get_case_configuration_default_space_request).path),
      ...getShape(getShape(get_case_configuration_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_case_configuration_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const SETCASECONFIGURATIONDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.setCaseConfigurationDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/configure</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Case settings include external connection details, custom fields, and templates. Connectors are used to interface with external systems. You must create a connector before you can use it in your cases. If you set a default connector, it is automatically selected when you create cases in Kibana. If you use the create case API, however, you must still specify all of the connector details. You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on where you are creating cases.
`,
  methods: ['post'],
  patterns: ['/api/cases/configure'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(set_case_configuration_default_space_request).body),
      ...getShape(getShape(set_case_configuration_default_space_request).path),
      ...getShape(getShape(set_case_configuration_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(set_case_configuration_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATECASECONFIGURATIONDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateCaseConfigurationDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/configure/{configurationId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Updates setting details such as the closure type, custom fields, templates, and the default connector for cases. Connectors are used to interface with external systems. You must create a connector before you can use it in your cases. You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on where the case was created.
`,
  methods: ['patch'],
  patterns: ['/api/cases/configure/{configurationId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(update_case_configuration_default_space_request).body),
      ...getShape(getShape(update_case_configuration_default_space_request).path),
      ...getShape(getShape(update_case_configuration_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(update_case_configuration_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDCASECONNECTORSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findCaseConnectorsDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/configure/connectors/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get information about connectors that are supported for use in cases. You must have \`read\` privileges for the **Actions and Connectors** feature in the **Management** section of the Kibana feature privileges.
`,
  methods: ['get'],
  patterns: ['/api/cases/configure/connectors/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(find_case_connectors_default_space_request).body),
      ...getShape(getShape(find_case_connectors_default_space_request).path),
      ...getShape(getShape(find_case_connectors_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(find_case_connectors_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETCASEREPORTERSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseReportersDefaultSpace',
  description: `Returns information about the users who opened cases. You must have read privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases. The API returns information about the users as they existed at the time of the case creation, including their name, full name, and email address. If any of those details change thereafter or if a user is deleted, the information returned by this API is unchanged.
`,
  methods: ['get'],
  patterns: ['/api/cases/reporters'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_case_reporters_default_space_request).body),
      ...getShape(getShape(get_case_reporters_default_space_request).path),
      ...getShape(getShape(get_case_reporters_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_case_reporters_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETCASETAGSDEFAULTSPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseTagsDefaultSpace',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/tags</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Aggregates and returns a list of case tags. You must have read privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're seeking.
`,
  methods: ['get'],
  patterns: ['/api/cases/tags'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_case_tags_default_space_request).body),
      ...getShape(getShape(get_case_tags_default_space_request).path),
      ...getShape(getShape(get_case_tags_default_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_case_tags_default_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETALLDATAVIEWSDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getAllDataViewsDefault',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/data_views'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_all_data_views_default_request).body),
      ...getShape(getShape(get_all_data_views_default_request).path),
      ...getShape(getShape(get_all_data_views_default_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_all_data_views_default_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEDATAVIEWDEFAULTW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createDataViewDefaultw',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/data_views/data_view'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(create_data_view_defaultw_request).body),
      ...getShape(getShape(create_data_view_defaultw_request).path),
      ...getShape(getShape(create_data_view_defaultw_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(create_data_view_defaultw_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETEDATAVIEWDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteDataViewDefault',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: When you delete a data view, it cannot be recovered.
`,
  methods: ['delete'],
  patterns: ['/api/data_views/data_view/{viewId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_data_view_default_request).body),
      ...getShape(getShape(delete_data_view_default_request).path),
      ...getShape(getShape(delete_data_view_default_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_data_view_default_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETDATAVIEWDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getDataViewDefault',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/data_views/data_view/{viewId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_data_view_default_request).body),
      ...getShape(getShape(get_data_view_default_request).path),
      ...getShape(getShape(get_data_view_default_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_data_view_default_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATEDATAVIEWDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateDataViewDefault',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/data_views/data_view/{viewId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(update_data_view_default_request).body),
      ...getShape(getShape(update_data_view_default_request).path),
      ...getShape(getShape(update_data_view_default_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(update_data_view_default_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATEFIELDSMETADATADEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateFieldsMetadataDefault',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/fields</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update fields presentation metadata such as count, customLabel, customDescription, and format.
`,
  methods: ['post'],
  patterns: ['/api/data_views/data_view/{viewId}/fields'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(update_fields_metadata_default_request).body),
      ...getShape(getShape(update_fields_metadata_default_request).path),
      ...getShape(getShape(update_fields_metadata_default_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(update_fields_metadata_default_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATERUNTIMEFIELDDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createRuntimeFieldDefault',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/runtime_field</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/data_views/data_view/{viewId}/runtime_field'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(create_runtime_field_default_request).body),
      ...getShape(getShape(create_runtime_field_default_request).path),
      ...getShape(getShape(create_runtime_field_default_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(create_runtime_field_default_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEUPDATERUNTIMEFIELDDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createUpdateRuntimeFieldDefault',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/runtime_field</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['put'],
  patterns: ['/api/data_views/data_view/{viewId}/runtime_field'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['viewId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(create_update_runtime_field_default_request).body),
      ...getShape(getShape(create_update_runtime_field_default_request).path),
      ...getShape(getShape(create_update_runtime_field_default_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(create_update_runtime_field_default_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETERUNTIMEFIELDDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteRuntimeFieldDefault',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/runtime_field/{fieldName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['delete'],
  patterns: ['/api/data_views/data_view/{viewId}/runtime_field/{fieldName}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_runtime_field_default_request).body),
      ...getShape(getShape(delete_runtime_field_default_request).path),
      ...getShape(getShape(delete_runtime_field_default_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_runtime_field_default_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETRUNTIMEFIELDDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getRuntimeFieldDefault',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/runtime_field/{fieldName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/data_views/data_view/{viewId}/runtime_field/{fieldName}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_runtime_field_default_request).body),
      ...getShape(getShape(get_runtime_field_default_request).path),
      ...getShape(getShape(get_runtime_field_default_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_runtime_field_default_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATERUNTIMEFIELDDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateRuntimeFieldDefault',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/runtime_field/{fieldName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/data_views/data_view/{viewId}/runtime_field/{fieldName}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(update_runtime_field_default_request).body),
      ...getShape(getShape(update_runtime_field_default_request).path),
      ...getShape(getShape(update_runtime_field_default_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(update_runtime_field_default_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETDEFAULTDATAVIEWDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getDefaultDataViewDefault',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/default</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/data_views/default'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_default_data_view_default_request).body),
      ...getShape(getShape(get_default_data_view_default_request).path),
      ...getShape(getShape(get_default_data_view_default_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_default_data_view_default_response)),
    }),
    error: z.any().optional(),
  }),
};
const SETDEFAULTDATAILVIEWDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.setDefaultDatailViewDefault',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/default</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/data_views/default'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(set_default_datail_view_default_request).body),
      ...getShape(getShape(set_default_datail_view_default_request).path),
      ...getShape(getShape(set_default_datail_view_default_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(set_default_datail_view_default_response)),
    }),
    error: z.any().optional(),
  }),
};
const SWAPDATAVIEWSDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.swapDataViewsDefault',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/swap_references</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Changes saved object references from one data view identifier to another. WARNING: Misuse can break large numbers of saved objects! Practicing with a backup is recommended.
`,
  methods: ['post'],
  patterns: ['/api/data_views/swap_references'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(swap_data_views_default_request).body),
      ...getShape(getShape(swap_data_views_default_request).path),
      ...getShape(getShape(swap_data_views_default_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(swap_data_views_default_response)),
    }),
    error: z.any().optional(),
  }),
};
const PREVIEWSWAPDATAVIEWSDEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.previewSwapDataViewsDefault',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/swap_references/_preview</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Preview the impact of swapping saved object references from one data view identifier to another.
`,
  methods: ['post'],
  patterns: ['/api/data_views/swap_references/_preview'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(preview_swap_data_views_default_request).body),
      ...getShape(getShape(preview_swap_data_views_default_request).path),
      ...getShape(getShape(preview_swap_data_views_default_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(preview_swap_data_views_default_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETEALERTSINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteAlertsIndex',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['delete'],
  patterns: ['/api/detection_engine/index'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_alerts_index_request).body),
      ...getShape(getShape(_delete_alerts_index_request).path),
      ...getShape(getShape(_delete_alerts_index_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_alerts_index_response)),
    }),
    error: z.any().optional(),
  }),
};
const READALERTSINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadAlertsIndex',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/detection_engine/index'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_alerts_index_request).body),
      ...getShape(getShape(_read_alerts_index_request).path),
      ...getShape(getShape(_read_alerts_index_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_alerts_index_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEALERTSINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateAlertsIndex',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/detection_engine/index'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_alerts_index_request).body),
      ...getShape(getShape(_create_alerts_index_request).path),
      ...getShape(getShape(_create_alerts_index_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_alerts_index_response)),
    }),
    error: z.any().optional(),
  }),
};
const READPRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadPrivileges',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/privileges</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieves whether or not the user is authenticated, and the user's Kibana
space and index privileges, which determine if the user can create an
index for the Elastic Security alerts generated by
detection engine rules.
`,
  methods: ['get'],
  patterns: ['/api/detection_engine/privileges'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_privileges_request).body),
      ...getShape(getShape(_read_privileges_request).path),
      ...getShape(getShape(_read_privileges_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_privileges_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETERULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteRule',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a detection rule using the \`rule_id\` or \`id\` field.

The URL query must include one of the following:

* \`id\` - \`DELETE /api/detection_engine/rules?id=<id>\`
* \`rule_id\`- \`DELETE /api/detection_engine/rules?rule_id=<rule_id>\`

The difference between the \`id\` and \`rule_id\` is that the \`id\` is a unique rule identifier that is randomly generated when a rule is created and cannot be set, whereas \`rule_id\` is a stable rule identifier that can be assigned during rule creation.
`,
  methods: ['delete'],
  patterns: ['/api/detection_engine/rules'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'rule_id'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_rule_request).body),
      ...getShape(getShape(_delete_rule_request).path),
      ...getShape(getShape(_delete_rule_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_rule_response)),
    }),
    error: z.any().optional(),
  }),
};
const READRULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadRule',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a detection rule using the \`rule_id\` or \`id\` field.

The URL query must include one of the following:

* \`id\` - \`GET /api/detection_engine/rules?id=<id>\`
* \`rule_id\` - \`GET /api/detection_engine/rules?rule_id=<rule_id>\`

The difference between the \`id\` and \`rule_id\` is that the \`id\` is a unique rule identifier that is randomly generated when a rule is created and cannot be set, whereas \`rule_id\` is a stable rule identifier that can be assigned during rule creation.
`,
  methods: ['get'],
  patterns: ['/api/detection_engine/rules'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'rule_id'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_rule_request).body),
      ...getShape(getShape(_read_rule_request).path),
      ...getShape(getShape(_read_rule_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_rule_response)),
    }),
    error: z.any().optional(),
  }),
};
const PATCHRULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PatchRule',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update specific fields of an existing detection rule using the \`rule_id\` or \`id\` field.

The difference between the \`id\` and \`rule_id\` is that the \`id\` is a unique rule identifier that is randomly generated when a rule is created and cannot be set, whereas \`rule_id\` is a stable rule identifier that can be assigned during rule creation.
> warn
> When used with [API key](https://www.elastic.co/docs/deploy-manage/api-keys) authentication, the user's key gets assigned to the affected rules. If the user's key gets deleted or the user becomes inactive, the rules will stop running.

> If the API key that is used for authorization has different privileges than the key that created or most recently updated the rule, the rule behavior might change.
`,
  methods: ['patch'],
  patterns: ['/api/detection_engine/rules'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_patch_rule_request).body),
      ...getShape(getShape(_patch_rule_request).path),
      ...getShape(getShape(_patch_rule_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_patch_rule_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATERULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateRule',
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
  methods: ['post'],
  patterns: ['/api/detection_engine/rules'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_rule_request).body),
      ...getShape(getShape(_create_rule_request).path),
      ...getShape(getShape(_create_rule_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_rule_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATERULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateRule',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a detection rule using the \`rule_id\` or \`id\` field. The original rule is replaced, and all unspecified fields are deleted.

The difference between the \`id\` and \`rule_id\` is that the \`id\` is a unique rule identifier that is randomly generated when a rule is created and cannot be set, whereas \`rule_id\` is a stable rule identifier that can be assigned during rule creation.
> warn
> When used with [API key](https://www.elastic.co/docs/deploy-manage/api-keys) authentication, the user's key gets assigned to the affected rules. If the user's key gets deleted or the user becomes inactive, the rules will stop running.

> If the API key that is used for authorization has different privileges than the key that created or most recently updated the rule, the rule behavior might change.
`,
  methods: ['put'],
  patterns: ['/api/detection_engine/rules'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_update_rule_request).body),
      ...getShape(getShape(_update_rule_request).path),
      ...getShape(getShape(_update_rule_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_update_rule_response)),
    }),
    error: z.any().optional(),
  }),
};
const PERFORMRULESBULKACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PerformRulesBulkAction',
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
  methods: ['post'],
  patterns: ['/api/detection_engine/rules/_bulk_action'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['dry_run'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_perform_rules_bulk_action_request).body),
      ...getShape(getShape(_perform_rules_bulk_action_request).path),
      ...getShape(getShape(_perform_rules_bulk_action_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_perform_rules_bulk_action_response)),
    }),
    error: z.any().optional(),
  }),
};
const EXPORTRULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ExportRules',
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
  methods: ['post'],
  patterns: ['/api/detection_engine/rules/_export'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['exclude_export_details', 'file_name'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_export_rules_request).body),
      ...getShape(getShape(_export_rules_request).path),
      ...getShape(getShape(_export_rules_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_export_rules_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDRULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindRules',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a paginated list of detection rules. By default, the first page is returned, with 20 results per page.`,
  methods: ['get'],
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
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_find_rules_request).body),
      ...getShape(getShape(_find_rules_request).path),
      ...getShape(getShape(_find_rules_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_find_rules_response)),
    }),
    error: z.any().optional(),
  }),
};
const IMPORTRULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ImportRules',
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
  methods: ['post'],
  patterns: ['/api/detection_engine/rules/_import'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['overwrite', 'overwrite_exceptions', 'overwrite_action_connectors', 'as_new_list'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_import_rules_request).body),
      ...getShape(getShape(_import_rules_request).path),
      ...getShape(getShape(_import_rules_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_import_rules_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATERULEEXCEPTIONLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateRuleExceptionListItems',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/{id}/exceptions</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create exception items that apply to a single detection rule.`,
  methods: ['post'],
  patterns: ['/api/detection_engine/rules/{id}/exceptions'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_rule_exception_list_items_request).body),
      ...getShape(getShape(_create_rule_exception_list_items_request).path),
      ...getShape(getShape(_create_rule_exception_list_items_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_rule_exception_list_items_response)),
    }),
    error: z.any().optional(),
  }),
};
const INSTALLPREBUILTRULESANDTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InstallPrebuiltRulesAndTimelines',
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
  methods: ['put'],
  patterns: ['/api/detection_engine/rules/prepackaged'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_install_prebuilt_rules_and_timelines_request).body),
      ...getShape(getShape(_install_prebuilt_rules_and_timelines_request).path),
      ...getShape(getShape(_install_prebuilt_rules_and_timelines_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_install_prebuilt_rules_and_timelines_response)),
    }),
    error: z.any().optional(),
  }),
};
const READPREBUILTRULESANDTIMELINESSTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadPrebuiltRulesAndTimelinesStatus',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/prepackaged/_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve the status of all Elastic prebuilt detection rules and Timelines. 

This endpoint provides detailed information about the number of custom rules, installed prebuilt rules, available prebuilt rules that are not installed, outdated prebuilt rules, installed prebuilt timelines, available prebuilt timelines that are not installed, and outdated prebuilt timelines.
`,
  methods: ['get'],
  patterns: ['/api/detection_engine/rules/prepackaged/_status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_prebuilt_rules_and_timelines_status_request).body),
      ...getShape(getShape(_read_prebuilt_rules_and_timelines_status_request).path),
      ...getShape(getShape(_read_prebuilt_rules_and_timelines_status_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_prebuilt_rules_and_timelines_status_response)),
    }),
    error: z.any().optional(),
  }),
};
const RULEPREVIEW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.RulePreview',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/preview</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/detection_engine/rules/preview'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['enable_logged_requests'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_rule_preview_request).body),
      ...getShape(getShape(_rule_preview_request).path),
      ...getShape(getShape(_rule_preview_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_rule_preview_response)),
    }),
    error: z.any().optional(),
  }),
};
const SETALERTASSIGNEES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.SetAlertAssignees',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/assignees</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Assign users to detection alerts, and unassign them from alerts.
> info
> You cannot add and remove the same assignee in the same request.
`,
  methods: ['post'],
  patterns: ['/api/detection_engine/signals/assignees'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_set_alert_assignees_request).body),
      ...getShape(getShape(_set_alert_assignees_request).path),
      ...getShape(getShape(_set_alert_assignees_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_set_alert_assignees_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINALIZEALERTSMIGRATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FinalizeAlertsMigration',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/finalize_migration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Finalize successful migrations of detection alerts. This replaces the original index's alias with the successfully migrated index's alias.
The endpoint is idempotent; therefore, it can safely be used to poll a given migration and, upon completion,
finalize it.
`,
  methods: ['post'],
  patterns: ['/api/detection_engine/signals/finalize_migration'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_finalize_alerts_migration_request).body),
      ...getShape(getShape(_finalize_alerts_migration_request).path),
      ...getShape(getShape(_finalize_alerts_migration_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_finalize_alerts_migration_response)),
    }),
    error: z.any().optional(),
  }),
};
const ALERTSMIGRATIONCLEANUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.AlertsMigrationCleanup',
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
  methods: ['delete'],
  patterns: ['/api/detection_engine/signals/migration'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_alerts_migration_cleanup_request).body),
      ...getShape(getShape(_alerts_migration_cleanup_request).path),
      ...getShape(getShape(_alerts_migration_cleanup_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_alerts_migration_cleanup_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEALERTSMIGRATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateAlertsMigration',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/migration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Initiate a migration of detection alerts.
Migrations are initiated per index. While the process is neither destructive nor interferes with existing data, it may be resource-intensive. As such, it is recommended that you plan your migrations accordingly.
`,
  methods: ['post'],
  patterns: ['/api/detection_engine/signals/migration'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_alerts_migration_request).body),
      ...getShape(getShape(_create_alerts_migration_request).path),
      ...getShape(getShape(_create_alerts_migration_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_alerts_migration_response)),
    }),
    error: z.any().optional(),
  }),
};
const READALERTSMIGRATIONSTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadAlertsMigrationStatus',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/migration_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve indices that contain detection alerts of a particular age, along with migration information for each of those indices.`,
  methods: ['get'],
  patterns: ['/api/detection_engine/signals/migration_status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['from'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_alerts_migration_status_request).body),
      ...getShape(getShape(_read_alerts_migration_status_request).path),
      ...getShape(getShape(_read_alerts_migration_status_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_alerts_migration_status_response)),
    }),
    error: z.any().optional(),
  }),
};
const SEARCHALERTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.SearchAlerts',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/search</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Find and/or aggregate detection alerts that match the given query.`,
  methods: ['post'],
  patterns: ['/api/detection_engine/signals/search'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_search_alerts_request).body),
      ...getShape(getShape(_search_alerts_request).path),
      ...getShape(getShape(_search_alerts_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_search_alerts_response)),
    }),
    error: z.any().optional(),
  }),
};
const SETALERTSSTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.SetAlertsStatus',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Set the status of one or more detection alerts.`,
  methods: ['post'],
  patterns: ['/api/detection_engine/signals/status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_set_alerts_status_request).body),
      ...getShape(getShape(_set_alerts_status_request).path),
      ...getShape(getShape(_set_alerts_status_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_set_alerts_status_response)),
    }),
    error: z.any().optional(),
  }),
};
const SETALERTTAGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.SetAlertTags',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/tags</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

And tags to detection alerts, and remove them from alerts.
> info
> You cannot add and remove the same alert tag in the same request.
`,
  methods: ['post'],
  patterns: ['/api/detection_engine/signals/tags'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_set_alert_tags_request).body),
      ...getShape(getShape(_set_alert_tags_request).path),
      ...getShape(getShape(_set_alert_tags_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_set_alert_tags_response)),
    }),
    error: z.any().optional(),
  }),
};
const READTAGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadTags',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/tags</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List all unique tags from all detection rules.`,
  methods: ['get'],
  patterns: ['/api/detection_engine/tags'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_tags_request).body),
      ...getShape(getShape(_read_tags_request).path),
      ...getShape(getShape(_read_tags_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_tags_response)),
    }),
    error: z.any().optional(),
  }),
};
const ROTATEENCRYPTIONKEY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.rotateEncryptionKey',
  description: `Superuser role required.

If a saved object cannot be decrypted using the primary encryption key, then Kibana will attempt to decrypt it using the specified decryption-only keys. In most of the cases this overhead is negligible, but if you're dealing with a large number of saved objects and experiencing performance issues, you may want to rotate the encryption key.

This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.
`,
  methods: ['post'],
  patterns: ['/api/encrypted_saved_objects/_rotate_key'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['batch_size', 'type'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(rotate_encryption_key_request).body),
      ...getShape(getShape(rotate_encryption_key_request).path),
      ...getShape(getShape(rotate_encryption_key_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(rotate_encryption_key_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEENDPOINTLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateEndpointList',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create the exception list for Elastic Endpoint rule exceptions. When you create the exception list, it will have a \`list_id\` of \`endpoint_list\`. If the Elastic Endpoint exception list already exists, your request will return an empty response.`,
  methods: ['post'],
  patterns: ['/api/endpoint_list'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_endpoint_list_request).body),
      ...getShape(getShape(_create_endpoint_list_request).path),
      ...getShape(getShape(_create_endpoint_list_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_endpoint_list_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETEENDPOINTLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteEndpointListItem',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an Elastic Endpoint exception list item, specified by the \`id\` or \`item_id\` field.`,
  methods: ['delete'],
  patterns: ['/api/endpoint_list/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'item_id'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_endpoint_list_item_request).body),
      ...getShape(getShape(_delete_endpoint_list_item_request).path),
      ...getShape(getShape(_delete_endpoint_list_item_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_endpoint_list_item_response)),
    }),
    error: z.any().optional(),
  }),
};
const READENDPOINTLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadEndpointListItem',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an Elastic Endpoint exception list item, specified by the \`id\` or \`item_id\` field.`,
  methods: ['get'],
  patterns: ['/api/endpoint_list/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'item_id'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_endpoint_list_item_request).body),
      ...getShape(getShape(_read_endpoint_list_item_request).path),
      ...getShape(getShape(_read_endpoint_list_item_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_endpoint_list_item_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEENDPOINTLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateEndpointListItem',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create an Elastic Endpoint exception list item, and associate it with the Elastic Endpoint exception list.`,
  methods: ['post'],
  patterns: ['/api/endpoint_list/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_endpoint_list_item_request).body),
      ...getShape(getShape(_create_endpoint_list_item_request).path),
      ...getShape(getShape(_create_endpoint_list_item_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_endpoint_list_item_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATEENDPOINTLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateEndpointListItem',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an Elastic Endpoint exception list item, specified by the \`id\` or \`item_id\` field.`,
  methods: ['put'],
  patterns: ['/api/endpoint_list/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_update_endpoint_list_item_request).body),
      ...getShape(getShape(_update_endpoint_list_item_request).path),
      ...getShape(getShape(_update_endpoint_list_item_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_update_endpoint_list_item_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDENDPOINTLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindEndpointListItems',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all Elastic Endpoint exception list items.`,
  methods: ['get'],
  patterns: ['/api/endpoint_list/items/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['filter', 'page', 'per_page', 'sort_field', 'sort_order'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_find_endpoint_list_items_request).body),
      ...getShape(getShape(_find_endpoint_list_items_request).path),
      ...getShape(getShape(_find_endpoint_list_items_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_find_endpoint_list_items_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENDPOINTGETACTIONSLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetActionsList',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all response actions.`,
  methods: ['get'],
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
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_endpoint_get_actions_list_request).body),
      ...getShape(getShape(_endpoint_get_actions_list_request).path),
      ...getShape(getShape(_endpoint_get_actions_list_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_endpoint_get_actions_list_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENDPOINTGETACTIONSSTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetActionsStatus',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the status of response actions for the specified agent IDs.`,
  methods: ['get'],
  patterns: ['/api/endpoint/action_status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['query'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_endpoint_get_actions_status_request).body),
      ...getShape(getShape(_endpoint_get_actions_status_request).path),
      ...getShape(getShape(_endpoint_get_actions_status_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_endpoint_get_actions_status_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENDPOINTGETACTIONSDETAILS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetActionsDetails',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/{action_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a response action using the action ID.`,
  methods: ['get'],
  patterns: ['/api/endpoint/action/{action_id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['action_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_endpoint_get_actions_details_request).body),
      ...getShape(getShape(_endpoint_get_actions_details_request).path),
      ...getShape(getShape(_endpoint_get_actions_details_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_endpoint_get_actions_details_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENDPOINTFILEINFO_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointFileInfo',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/{action_id}/file/{file_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get information for the specified response action file download.
`,
  methods: ['get'],
  patterns: ['/api/endpoint/action/{action_id}/file/{file_id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['action_id', 'file_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_endpoint_file_info_request).body),
      ...getShape(getShape(_endpoint_file_info_request).path),
      ...getShape(getShape(_endpoint_file_info_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_endpoint_file_info_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENDPOINTFILEDOWNLOAD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointFileDownload',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/{action_id}/file/{file_id}/download</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Download a file associated with a response action.
`,
  methods: ['get'],
  patterns: ['/api/endpoint/action/{action_id}/file/{file_id}/download'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['action_id', 'file_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_endpoint_file_download_request).body),
      ...getShape(getShape(_endpoint_file_download_request).path),
      ...getShape(getShape(_endpoint_file_download_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_endpoint_file_download_response)),
    }),
    error: z.any().optional(),
  }),
};
const CANCELACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CancelAction',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/cancel</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Cancel a running or pending response action (Applies only to some agent types).`,
  methods: ['post'],
  patterns: ['/api/endpoint/action/cancel'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_cancel_action_request).body),
      ...getShape(getShape(_cancel_action_request).path),
      ...getShape(getShape(_cancel_action_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_cancel_action_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENDPOINTEXECUTEACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointExecuteAction',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/execute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Run a shell command on an endpoint.`,
  methods: ['post'],
  patterns: ['/api/endpoint/action/execute'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_endpoint_execute_action_request).body),
      ...getShape(getShape(_endpoint_execute_action_request).path),
      ...getShape(getShape(_endpoint_execute_action_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_endpoint_execute_action_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENDPOINTGETFILEACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetFileAction',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/get_file</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a file from an endpoint.`,
  methods: ['post'],
  patterns: ['/api/endpoint/action/get_file'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_endpoint_get_file_action_request).body),
      ...getShape(getShape(_endpoint_get_file_action_request).path),
      ...getShape(getShape(_endpoint_get_file_action_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_endpoint_get_file_action_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENDPOINTISOLATEACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointIsolateAction',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/isolate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Isolate an endpoint from the network. The endpoint remains isolated until it's released.`,
  methods: ['post'],
  patterns: ['/api/endpoint/action/isolate'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_endpoint_isolate_action_request).body),
      ...getShape(getShape(_endpoint_isolate_action_request).path),
      ...getShape(getShape(_endpoint_isolate_action_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_endpoint_isolate_action_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENDPOINTKILLPROCESSACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointKillProcessAction',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/kill_process</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Terminate a running process on an endpoint.`,
  methods: ['post'],
  patterns: ['/api/endpoint/action/kill_process'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_endpoint_kill_process_action_request).body),
      ...getShape(getShape(_endpoint_kill_process_action_request).path),
      ...getShape(getShape(_endpoint_kill_process_action_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_endpoint_kill_process_action_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENDPOINTGETPROCESSESACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetProcessesAction',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/running_procs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all processes running on an endpoint.`,
  methods: ['post'],
  patterns: ['/api/endpoint/action/running_procs'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_endpoint_get_processes_action_request).body),
      ...getShape(getShape(_endpoint_get_processes_action_request).path),
      ...getShape(getShape(_endpoint_get_processes_action_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_endpoint_get_processes_action_response)),
    }),
    error: z.any().optional(),
  }),
};
const RUNSCRIPTACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.RunScriptAction',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/runscript</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Run a script on a host. Currently supported only for some agent types.`,
  methods: ['post'],
  patterns: ['/api/endpoint/action/runscript'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_run_script_action_request).body),
      ...getShape(getShape(_run_script_action_request).path),
      ...getShape(getShape(_run_script_action_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_run_script_action_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENDPOINTSCANACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointScanAction',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/scan</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Scan a specific file or directory on an endpoint for malware.`,
  methods: ['post'],
  patterns: ['/api/endpoint/action/scan'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_endpoint_scan_action_request).body),
      ...getShape(getShape(_endpoint_scan_action_request).path),
      ...getShape(getShape(_endpoint_scan_action_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_endpoint_scan_action_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENDPOINTGETACTIONSSTATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetActionsState',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/state</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a response actions state, which reports whether encryption is enabled.`,
  methods: ['get'],
  patterns: ['/api/endpoint/action/state'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_endpoint_get_actions_state_request).body),
      ...getShape(getShape(_endpoint_get_actions_state_request).path),
      ...getShape(getShape(_endpoint_get_actions_state_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_endpoint_get_actions_state_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENDPOINTSUSPENDPROCESSACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointSuspendProcessAction',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/suspend_process</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Suspend a running process on an endpoint.`,
  methods: ['post'],
  patterns: ['/api/endpoint/action/suspend_process'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_endpoint_suspend_process_action_request).body),
      ...getShape(getShape(_endpoint_suspend_process_action_request).path),
      ...getShape(getShape(_endpoint_suspend_process_action_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_endpoint_suspend_process_action_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENDPOINTUNISOLATEACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointUnisolateAction',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/unisolate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Release an isolated endpoint, allowing it to rejoin a network.`,
  methods: ['post'],
  patterns: ['/api/endpoint/action/unisolate'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_endpoint_unisolate_action_request).body),
      ...getShape(getShape(_endpoint_unisolate_action_request).path),
      ...getShape(getShape(_endpoint_unisolate_action_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_endpoint_unisolate_action_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENDPOINTUPLOADACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointUploadAction',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/upload</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upload a file to an endpoint.`,
  methods: ['post'],
  patterns: ['/api/endpoint/action/upload'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_endpoint_upload_action_request).body),
      ...getShape(getShape(_endpoint_upload_action_request).path),
      ...getShape(getShape(_endpoint_upload_action_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_endpoint_upload_action_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETENDPOINTMETADATALIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetEndpointMetadataList',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/metadata</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/endpoint/metadata'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'pageSize', 'kuery', 'hostStatuses', 'sortField', 'sortDirection'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_get_endpoint_metadata_list_request).body),
      ...getShape(getShape(_get_endpoint_metadata_list_request).path),
      ...getShape(getShape(_get_endpoint_metadata_list_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_get_endpoint_metadata_list_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETENDPOINTMETADATA_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetEndpointMetadata',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/metadata/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/endpoint/metadata/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_get_endpoint_metadata_request).body),
      ...getShape(getShape(_get_endpoint_metadata_request).path),
      ...getShape(getShape(_get_endpoint_metadata_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_get_endpoint_metadata_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETPOLICYRESPONSE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetPolicyResponse',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/policy_response</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/endpoint/policy_response'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['query'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_get_policy_response_request).body),
      ...getShape(getShape(_get_policy_response_request).path),
      ...getShape(getShape(_get_policy_response_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_get_policy_response_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETPROTECTIONUPDATESNOTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetProtectionUpdatesNote',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/protection_updates_note/{package_policy_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/endpoint/protection_updates_note/{package_policy_id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['package_policy_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_get_protection_updates_note_request).body),
      ...getShape(getShape(_get_protection_updates_note_request).path),
      ...getShape(getShape(_get_protection_updates_note_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_get_protection_updates_note_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEUPDATEPROTECTIONUPDATESNOTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateUpdateProtectionUpdatesNote',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/protection_updates_note/{package_policy_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/endpoint/protection_updates_note/{package_policy_id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['package_policy_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_update_protection_updates_note_request).body),
      ...getShape(getShape(_create_update_protection_updates_note_request).path),
      ...getShape(getShape(_create_update_protection_updates_note_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_update_protection_updates_note_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETEMONITORINGENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteMonitoringEngine',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/engine/delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['delete'],
  patterns: ['/api/entity_analytics/monitoring/engine/delete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['data'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_monitoring_engine_request).body),
      ...getShape(getShape(_delete_monitoring_engine_request).path),
      ...getShape(getShape(_delete_monitoring_engine_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_monitoring_engine_response)),
    }),
    error: z.any().optional(),
  }),
};
const DISABLEMONITORINGENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DisableMonitoringEngine',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/engine/disable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/entity_analytics/monitoring/engine/disable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_disable_monitoring_engine_request).body),
      ...getShape(getShape(_disable_monitoring_engine_request).path),
      ...getShape(getShape(_disable_monitoring_engine_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_disable_monitoring_engine_response)),
    }),
    error: z.any().optional(),
  }),
};
const INITMONITORINGENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InitMonitoringEngine',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/engine/init</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/entity_analytics/monitoring/engine/init'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_init_monitoring_engine_request).body),
      ...getShape(getShape(_init_monitoring_engine_request).path),
      ...getShape(getShape(_init_monitoring_engine_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_init_monitoring_engine_response)),
    }),
    error: z.any().optional(),
  }),
};
const SCHEDULEMONITORINGENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ScheduleMonitoringEngine',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/engine/schedule_now</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/entity_analytics/monitoring/engine/schedule_now'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_schedule_monitoring_engine_request).body),
      ...getShape(getShape(_schedule_monitoring_engine_request).path),
      ...getShape(getShape(_schedule_monitoring_engine_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_schedule_monitoring_engine_response)),
    }),
    error: z.any().optional(),
  }),
};
const PRIVMONHEALTH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PrivMonHealth',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/privileges/health</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/entity_analytics/monitoring/privileges/health'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_priv_mon_health_request).body),
      ...getShape(getShape(_priv_mon_health_request).path),
      ...getShape(getShape(_priv_mon_health_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_priv_mon_health_response)),
    }),
    error: z.any().optional(),
  }),
};
const PRIVMONPRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PrivMonPrivileges',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/privileges/privileges</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Check if the current user has all required permissions for Privilege Monitoring`,
  methods: ['get'],
  patterns: ['/api/entity_analytics/monitoring/privileges/privileges'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_priv_mon_privileges_request).body),
      ...getShape(getShape(_priv_mon_privileges_request).path),
      ...getShape(getShape(_priv_mon_privileges_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_priv_mon_privileges_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEPRIVMONUSER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreatePrivMonUser',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/entity_analytics/monitoring/users'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_priv_mon_user_request).body),
      ...getShape(getShape(_create_priv_mon_user_request).path),
      ...getShape(getShape(_create_priv_mon_user_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_priv_mon_user_response)),
    }),
    error: z.any().optional(),
  }),
};
const PRIVMONBULKUPLOADUSERSCSV_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PrivmonBulkUploadUsersCSV',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users/_csv</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/entity_analytics/monitoring/users/_csv'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_privmon_bulk_upload_users_c_s_v_request).body),
      ...getShape(getShape(_privmon_bulk_upload_users_c_s_v_request).path),
      ...getShape(getShape(_privmon_bulk_upload_users_c_s_v_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_privmon_bulk_upload_users_c_s_v_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETEPRIVMONUSER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeletePrivMonUser',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['delete'],
  patterns: ['/api/entity_analytics/monitoring/users/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_priv_mon_user_request).body),
      ...getShape(getShape(_delete_priv_mon_user_request).path),
      ...getShape(getShape(_delete_priv_mon_user_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_priv_mon_user_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATEPRIVMONUSER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdatePrivMonUser',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['put'],
  patterns: ['/api/entity_analytics/monitoring/users/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_update_priv_mon_user_request).body),
      ...getShape(getShape(_update_priv_mon_user_request).path),
      ...getShape(getShape(_update_priv_mon_user_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_update_priv_mon_user_response)),
    }),
    error: z.any().optional(),
  }),
};
const LISTPRIVMONUSERS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ListPrivMonUsers',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users/list</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/entity_analytics/monitoring/users/list'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['kql'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_list_priv_mon_users_request).body),
      ...getShape(getShape(_list_priv_mon_users_request).path),
      ...getShape(getShape(_list_priv_mon_users_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_list_priv_mon_users_response)),
    }),
    error: z.any().optional(),
  }),
};
const INSTALLPRIVILEGEDACCESSDETECTIONPACKAGE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InstallPrivilegedAccessDetectionPackage',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/privileged_user_monitoring/pad/install</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/entity_analytics/privileged_user_monitoring/pad/install'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_install_privileged_access_detection_package_request).body),
      ...getShape(getShape(_install_privileged_access_detection_package_request).path),
      ...getShape(getShape(_install_privileged_access_detection_package_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_install_privileged_access_detection_package_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETPRIVILEGEDACCESSDETECTIONPACKAGESTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetPrivilegedAccessDetectionPackageStatus',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/privileged_user_monitoring/pad/status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/entity_analytics/privileged_user_monitoring/pad/status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_get_privileged_access_detection_package_status_request).body),
      ...getShape(getShape(_get_privileged_access_detection_package_status_request).path),
      ...getShape(getShape(_get_privileged_access_detection_package_status_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_get_privileged_access_detection_package_status_response)),
    }),
    error: z.any().optional(),
  }),
};
const INITENTITYSTORE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InitEntityStore',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/enable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/entity_store/enable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_init_entity_store_request).body),
      ...getShape(getShape(_init_entity_store_request).path),
      ...getShape(getShape(_init_entity_store_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_init_entity_store_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETEENTITYENGINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteEntityEngines',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['delete'],
  patterns: ['/api/entity_store/engines'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['entityTypes', 'delete_data'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_entity_engines_request).body),
      ...getShape(getShape(_delete_entity_engines_request).path),
      ...getShape(getShape(_delete_entity_engines_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_entity_engines_response)),
    }),
    error: z.any().optional(),
  }),
};
const LISTENTITYENGINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ListEntityEngines',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/entity_store/engines'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_list_entity_engines_request).body),
      ...getShape(getShape(_list_entity_engines_request).path),
      ...getShape(getShape(_list_entity_engines_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_list_entity_engines_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETEENTITYENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteEntityEngine',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/{entityType}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['delete'],
  patterns: ['/api/entity_store/engines/{entityType}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['entityType'],
    urlParams: ['delete_data', 'data'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_entity_engine_request).body),
      ...getShape(getShape(_delete_entity_engine_request).path),
      ...getShape(getShape(_delete_entity_engine_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_entity_engine_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETENTITYENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetEntityEngine',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/{entityType}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/entity_store/engines/{entityType}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['entityType'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_get_entity_engine_request).body),
      ...getShape(getShape(_get_entity_engine_request).path),
      ...getShape(getShape(_get_entity_engine_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_get_entity_engine_response)),
    }),
    error: z.any().optional(),
  }),
};
const INITENTITYENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InitEntityEngine',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/{entityType}/init</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/entity_store/engines/{entityType}/init'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['entityType'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_init_entity_engine_request).body),
      ...getShape(getShape(_init_entity_engine_request).path),
      ...getShape(getShape(_init_entity_engine_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_init_entity_engine_response)),
    }),
    error: z.any().optional(),
  }),
};
const STARTENTITYENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.StartEntityEngine',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/{entityType}/start</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/entity_store/engines/{entityType}/start'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['entityType'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_start_entity_engine_request).body),
      ...getShape(getShape(_start_entity_engine_request).path),
      ...getShape(getShape(_start_entity_engine_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_start_entity_engine_response)),
    }),
    error: z.any().optional(),
  }),
};
const STOPENTITYENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.StopEntityEngine',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/{entityType}/stop</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/entity_store/engines/{entityType}/stop'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['entityType'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_stop_entity_engine_request).body),
      ...getShape(getShape(_stop_entity_engine_request).path),
      ...getShape(getShape(_stop_entity_engine_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_stop_entity_engine_response)),
    }),
    error: z.any().optional(),
  }),
};
const APPLYENTITYENGINEDATAVIEWINDICES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ApplyEntityEngineDataviewIndices',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/apply_dataview_indices</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/entity_store/engines/apply_dataview_indices'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_apply_entity_engine_dataview_indices_request).body),
      ...getShape(getShape(_apply_entity_engine_dataview_indices_request).path),
      ...getShape(getShape(_apply_entity_engine_dataview_indices_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_apply_entity_engine_dataview_indices_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETESINGLEENTITY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteSingleEntity',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/entities/{entityType}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a single entity in Entity Store.
The entity will be immediately deleted from the latest index.  It will remain available in historical snapshots if it has been snapshotted.  The delete operation does not prevent the entity from being recreated if it is observed again in the future. 
`,
  methods: ['delete'],
  patterns: ['/api/entity_store/entities/{entityType}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['entityType'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_single_entity_request).body),
      ...getShape(getShape(_delete_single_entity_request).path),
      ...getShape(getShape(_delete_single_entity_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_single_entity_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPSERTENTITY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpsertEntity',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/entities/{entityType}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update or create an entity in Entity Store.
If the specified entity already exists, it is updated with the provided values.  If the entity does not exist, a new one is created. By default, only the following fields can be updated: * \`entity.attributes.*\` * \`entity.lifecycle.*\` * \`entity.behavior.*\` To update other fields, set the \`force\` query parameter to \`true\`. > info > Some fields always retain the first observed value. Updates to these fields will not appear in the final index.
> Due to technical limitations, not all updates are guaranteed to appear in the final list of observed values.
> Due to technical limitations, create is an async operation. The time for a document to be present in the  > final index depends on the entity store transform and usually takes more than 1 minute.
`,
  methods: ['put'],
  patterns: ['/api/entity_store/entities/{entityType}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['entityType'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_upsert_entity_request).body),
      ...getShape(getShape(_upsert_entity_request).path),
      ...getShape(getShape(_upsert_entity_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_upsert_entity_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPSERTENTITIESBULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpsertEntitiesBulk',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/entities/bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update or create many entities in Entity Store.
If the specified entity already exists, it is updated with the provided values.  If the entity does not exist, a new one is created.
The creation is asynchronous. The time for a document to be present in the  final index depends on the entity store transform and usually takes more than 1 minute.
`,
  methods: ['put'],
  patterns: ['/api/entity_store/entities/bulk'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_upsert_entities_bulk_request).body),
      ...getShape(getShape(_upsert_entities_bulk_request).path),
      ...getShape(getShape(_upsert_entities_bulk_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_upsert_entities_bulk_response)),
    }),
    error: z.any().optional(),
  }),
};
const LISTENTITIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ListEntities',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/entities/list</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List entities records, paging, sorting and filtering as needed.`,
  methods: ['get'],
  patterns: ['/api/entity_store/entities/list'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['sort_field', 'sort_order', 'page', 'per_page', 'filterQuery', 'entity_types'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_list_entities_request).body),
      ...getShape(getShape(_list_entities_request).path),
      ...getShape(getShape(_list_entities_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_list_entities_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETENTITYSTORESTATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetEntityStoreStatus',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/entity_store/status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['include_components'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_get_entity_store_status_request).body),
      ...getShape(getShape(_get_entity_store_status_request).path),
      ...getShape(getShape(_get_entity_store_status_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_get_entity_store_status_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETEEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteExceptionList',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an exception list using the \`id\` or \`list_id\` field.`,
  methods: ['delete'],
  patterns: ['/api/exception_lists'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'list_id', 'namespace_type'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_exception_list_request).body),
      ...getShape(getShape(_delete_exception_list_request).path),
      ...getShape(getShape(_delete_exception_list_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_exception_list_response)),
    }),
    error: z.any().optional(),
  }),
};
const READEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadExceptionList',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an exception list using the \`id\` or \`list_id\` field.`,
  methods: ['get'],
  patterns: ['/api/exception_lists'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'list_id', 'namespace_type'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_exception_list_request).body),
      ...getShape(getShape(_read_exception_list_request).path),
      ...getShape(getShape(_read_exception_list_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_exception_list_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateExceptionList',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

An exception list groups exception items and can be associated with detection rules. You can assign exception lists to multiple detection rules.
> info
> All exception items added to the same list are evaluated using \`OR\` logic. That is, if any of the items in a list evaluate to \`true\`, the exception prevents the rule from generating an alert. Likewise, \`OR\` logic is used for evaluating exceptions when more than one exception list is assigned to a rule. To use the \`AND\` operator, you can define multiple clauses (\`entries\`) in a single exception item.
`,
  methods: ['post'],
  patterns: ['/api/exception_lists'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_exception_list_request).body),
      ...getShape(getShape(_create_exception_list_request).path),
      ...getShape(getShape(_create_exception_list_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_exception_list_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATEEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateExceptionList',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an exception list using the \`id\` or \`list_id\` field.`,
  methods: ['put'],
  patterns: ['/api/exception_lists'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_update_exception_list_request).body),
      ...getShape(getShape(_update_exception_list_request).path),
      ...getShape(getShape(_update_exception_list_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_update_exception_list_response)),
    }),
    error: z.any().optional(),
  }),
};
const DUPLICATEEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DuplicateExceptionList',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/_duplicate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Duplicate an existing exception list.`,
  methods: ['post'],
  patterns: ['/api/exception_lists/_duplicate'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['list_id', 'namespace_type', 'include_expired_exceptions'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_duplicate_exception_list_request).body),
      ...getShape(getShape(_duplicate_exception_list_request).path),
      ...getShape(getShape(_duplicate_exception_list_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_duplicate_exception_list_response)),
    }),
    error: z.any().optional(),
  }),
};
const EXPORTEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ExportExceptionList',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/_export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Export an exception list and its associated items to an NDJSON file.`,
  methods: ['post'],
  patterns: ['/api/exception_lists/_export'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'list_id', 'namespace_type', 'include_expired_exceptions'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_export_exception_list_request).body),
      ...getShape(getShape(_export_exception_list_request).path),
      ...getShape(getShape(_export_exception_list_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_export_exception_list_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDEXCEPTIONLISTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindExceptionLists',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all exception list containers.`,
  methods: ['get'],
  patterns: ['/api/exception_lists/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['filter', 'namespace_type', 'page', 'per_page', 'sort_field', 'sort_order'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_find_exception_lists_request).body),
      ...getShape(getShape(_find_exception_lists_request).path),
      ...getShape(getShape(_find_exception_lists_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_find_exception_lists_response)),
    }),
    error: z.any().optional(),
  }),
};
const IMPORTEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ImportExceptionList',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/_import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Import an exception list and its associated items from an NDJSON file.`,
  methods: ['post'],
  patterns: ['/api/exception_lists/_import'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['overwrite', 'as_new_list'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_import_exception_list_request).body),
      ...getShape(getShape(_import_exception_list_request).path),
      ...getShape(getShape(_import_exception_list_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_import_exception_list_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETEEXCEPTIONLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteExceptionListItem',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an exception list item using the \`id\` or \`item_id\` field.`,
  methods: ['delete'],
  patterns: ['/api/exception_lists/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'item_id', 'namespace_type'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_exception_list_item_request).body),
      ...getShape(getShape(_delete_exception_list_item_request).path),
      ...getShape(getShape(_delete_exception_list_item_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_exception_list_item_response)),
    }),
    error: z.any().optional(),
  }),
};
const READEXCEPTIONLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadExceptionListItem',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an exception list item using the \`id\` or \`item_id\` field.`,
  methods: ['get'],
  patterns: ['/api/exception_lists/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'item_id', 'namespace_type'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_exception_list_item_request).body),
      ...getShape(getShape(_read_exception_list_item_request).path),
      ...getShape(getShape(_read_exception_list_item_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_exception_list_item_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEEXCEPTIONLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateExceptionListItem',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create an exception item and associate it with the specified exception list.
> info
> Before creating exception items, you must create an exception list.
`,
  methods: ['post'],
  patterns: ['/api/exception_lists/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_exception_list_item_request).body),
      ...getShape(getShape(_create_exception_list_item_request).path),
      ...getShape(getShape(_create_exception_list_item_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_exception_list_item_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATEEXCEPTIONLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateExceptionListItem',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an exception list item using the \`id\` or \`item_id\` field.`,
  methods: ['put'],
  patterns: ['/api/exception_lists/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_update_exception_list_item_request).body),
      ...getShape(getShape(_update_exception_list_item_request).path),
      ...getShape(getShape(_update_exception_list_item_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_update_exception_list_item_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDEXCEPTIONLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindExceptionListItems',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/items/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all exception list items in the specified list.`,
  methods: ['get'],
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
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_find_exception_list_items_request).body),
      ...getShape(getShape(_find_exception_list_items_request).path),
      ...getShape(getShape(_find_exception_list_items_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_find_exception_list_items_response)),
    }),
    error: z.any().optional(),
  }),
};
const READEXCEPTIONLISTSUMMARY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadExceptionListSummary',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/summary</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a summary of the specified exception list.`,
  methods: ['get'],
  patterns: ['/api/exception_lists/summary'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'list_id', 'namespace_type', 'filter'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_exception_list_summary_request).body),
      ...getShape(getShape(_read_exception_list_summary_request).path),
      ...getShape(getShape(_read_exception_list_summary_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_exception_list_summary_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATESHAREDEXCEPTIONLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateSharedExceptionList',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exceptions/shared</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

An exception list groups exception items and can be associated with detection rules. A shared exception list can apply to multiple detection rules.
> info
> All exception items added to the same list are evaluated using \`OR\` logic. That is, if any of the items in a list evaluate to \`true\`, the exception prevents the rule from generating an alert. Likewise, \`OR\` logic is used for evaluating exceptions when more than one exception list is assigned to a rule. To use the \`AND\` operator, you can define multiple clauses (\`entries\`) in a single exception item.
`,
  methods: ['post'],
  patterns: ['/api/exceptions/shared'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_shared_exception_list_request).body),
      ...getShape(getShape(_create_shared_exception_list_request).path),
      ...getShape(getShape(_create_shared_exception_list_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_shared_exception_list_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FEATURES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_features',
  description: `Get information about all Kibana features. Features are used by spaces and security to refine and secure access to Kibana.
`,
  methods: ['get'],
  patterns: ['/api/features'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_features_request).body),
      ...getShape(getShape(get_features_request).path),
      ...getShape(getShape(get_features_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_features_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENT_DOWNLOAD_SOURCES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_download_sources',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_download_sources</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-settings-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/agent_download_sources'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agent_download_sources_request).body),
      ...getShape(getShape(get_fleet_agent_download_sources_request).path),
      ...getShape(getShape(get_fleet_agent_download_sources_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agent_download_sources_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENT_DOWNLOAD_SOURCES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_download_sources',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_download_sources</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/agent_download_sources'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agent_download_sources_request).body),
      ...getShape(getShape(post_fleet_agent_download_sources_request).path),
      ...getShape(getShape(post_fleet_agent_download_sources_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agent_download_sources_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_FLEET_AGENT_DOWNLOAD_SOURCES_SOURCEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_agent_download_sources_sourceid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_download_sources/{sourceId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an agent binary download source by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['delete'],
  patterns: ['/api/fleet/agent_download_sources/{sourceId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['sourceId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_fleet_agent_download_sources_sourceid_request).body),
      ...getShape(getShape(delete_fleet_agent_download_sources_sourceid_request).path),
      ...getShape(getShape(delete_fleet_agent_download_sources_sourceid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_fleet_agent_download_sources_sourceid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENT_DOWNLOAD_SOURCES_SOURCEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_download_sources_sourceid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_download_sources/{sourceId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get an agent binary download source by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-settings-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/agent_download_sources/{sourceId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['sourceId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agent_download_sources_sourceid_request).body),
      ...getShape(getShape(get_fleet_agent_download_sources_sourceid_request).path),
      ...getShape(getShape(get_fleet_agent_download_sources_sourceid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agent_download_sources_sourceid_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_FLEET_AGENT_DOWNLOAD_SOURCES_SOURCEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_agent_download_sources_sourceid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_download_sources/{sourceId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an agent binary download source by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['put'],
  patterns: ['/api/fleet/agent_download_sources/{sourceId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['sourceId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_fleet_agent_download_sources_sourceid_request).body),
      ...getShape(getShape(put_fleet_agent_download_sources_sourceid_request).path),
      ...getShape(getShape(put_fleet_agent_download_sources_sourceid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_fleet_agent_download_sources_sourceid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENT_POLICIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_policies',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-agents-read OR fleet-setup.`,
  methods: ['get'],
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
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agent_policies_request).body),
      ...getShape(getShape(get_fleet_agent_policies_request).path),
      ...getShape(getShape(get_fleet_agent_policies_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agent_policies_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENT_POLICIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/agent_policies'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['sys_monitoring'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agent_policies_request).body),
      ...getShape(getShape(post_fleet_agent_policies_request).path),
      ...getShape(getShape(post_fleet_agent_policies_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agent_policies_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENT_POLICIES_BULK_GET_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies_bulk_get',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/_bulk_get</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-agents-read OR fleet-setup.`,
  methods: ['post'],
  patterns: ['/api/fleet/agent_policies/_bulk_get'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agent_policies_bulk_get_request).body),
      ...getShape(getShape(post_fleet_agent_policies_bulk_get_request).path),
      ...getShape(getShape(post_fleet_agent_policies_bulk_get_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agent_policies_bulk_get_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_policies_agentpolicyid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get an agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-agents-read OR fleet-setup.`,
  methods: ['get'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentPolicyId'],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agent_policies_agentpolicyid_request).body),
      ...getShape(getShape(get_fleet_agent_policies_agentpolicyid_request).path),
      ...getShape(getShape(get_fleet_agent_policies_agentpolicyid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agent_policies_agentpolicyid_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_FLEET_AGENT_POLICIES_AGENTPOLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_agent_policies_agentpolicyid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-all.`,
  methods: ['put'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentPolicyId'],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_fleet_agent_policies_agentpolicyid_request).body),
      ...getShape(getShape(put_fleet_agent_policies_agentpolicyid_request).path),
      ...getShape(getShape(put_fleet_agent_policies_agentpolicyid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_fleet_agent_policies_agentpolicyid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_AUTO_UPGRADE_AGENTS_STATUS_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status',
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}/auto_upgrade_agents_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get auto upgrade agent status<br/><br/>[Required authorization] Route required privileges: fleet-agents-read.`,
    methods: ['get'],
    patterns: ['/api/fleet/agent_policies/{agentPolicyId}/auto_upgrade_agents_status'],
    isInternal: true,
    documentation: 'URL_NOT_IMPLEMENTED',
    parameterTypes: {
      pathParams: ['agentPolicyId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z
      .looseObject({
        ...getShape(
          getShape(get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status_request).body
        ),
        ...getShape(
          getShape(get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status_request).path
        ),
        ...getShape(
          getShape(get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status_request).query
        ),
      })
      .partial(),
    outputSchema: z.object({
      output: z.looseObject({
        ...getShape(
          getShape(get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status_response)
        ),
      }),
      error: z.any().optional(),
    }),
  };
const POST_FLEET_AGENT_POLICIES_AGENTPOLICYID_COPY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies_agentpolicyid_copy',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}/copy</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Copy an agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}/copy'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentPolicyId'],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agent_policies_agentpolicyid_copy_request).body),
      ...getShape(getShape(post_fleet_agent_policies_agentpolicyid_copy_request).path),
      ...getShape(getShape(post_fleet_agent_policies_agentpolicyid_copy_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agent_policies_agentpolicyid_copy_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_DOWNLOAD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_policies_agentpolicyid_download',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}/download</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Download an agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-setup.`,
  methods: ['get'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}/download'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentPolicyId'],
    urlParams: ['download', 'standalone', 'kubernetes'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agent_policies_agentpolicyid_download_request).body),
      ...getShape(getShape(get_fleet_agent_policies_agentpolicyid_download_request).path),
      ...getShape(getShape(get_fleet_agent_policies_agentpolicyid_download_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agent_policies_agentpolicyid_download_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_FULL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_policies_agentpolicyid_full',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}/full</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a full agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}/full'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentPolicyId'],
    urlParams: ['download', 'standalone', 'kubernetes'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agent_policies_agentpolicyid_full_request).body),
      ...getShape(getShape(get_fleet_agent_policies_agentpolicyid_full_request).path),
      ...getShape(getShape(get_fleet_agent_policies_agentpolicyid_full_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agent_policies_agentpolicyid_full_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_OUTPUTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_policies_agentpolicyid_outputs',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}/outputs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of outputs associated with agent policy by policy id.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read AND fleet-settings-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}/outputs'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentPolicyId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agent_policies_agentpolicyid_outputs_request).body),
      ...getShape(getShape(get_fleet_agent_policies_agentpolicyid_outputs_request).path),
      ...getShape(getShape(get_fleet_agent_policies_agentpolicyid_outputs_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agent_policies_agentpolicyid_outputs_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENT_POLICIES_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies_delete',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/agent_policies/delete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agent_policies_delete_request).body),
      ...getShape(getShape(post_fleet_agent_policies_delete_request).path),
      ...getShape(getShape(post_fleet_agent_policies_delete_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agent_policies_delete_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENT_POLICIES_OUTPUTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies_outputs',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/outputs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of outputs associated with agent policies.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-read AND fleet-settings-read.`,
  methods: ['post'],
  patterns: ['/api/fleet/agent_policies/outputs'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agent_policies_outputs_request).body),
      ...getShape(getShape(post_fleet_agent_policies_outputs_request).path),
      ...getShape(getShape(post_fleet_agent_policies_outputs_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agent_policies_outputs_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENT_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_status',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/fleet/agent_status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['policyId', 'policyIds', 'kuery'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agent_status_request).body),
      ...getShape(getShape(get_fleet_agent_status_request).path),
      ...getShape(getShape(get_fleet_agent_status_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agent_status_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENT_STATUS_DATA_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agent_status_data',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_status/data</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/agent_status/data'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['agentsIds', 'pkgName', 'pkgVersion', 'previewData'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agent_status_data_request).body),
      ...getShape(getShape(get_fleet_agent_status_data_request).path),
      ...getShape(getShape(get_fleet_agent_status_data_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agent_status_data_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENTLESS_POLICIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agentless_policies',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agentless_policies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create an agentless policy`,
  methods: ['post'],
  patterns: ['/api/fleet/agentless_policies'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agentless_policies_request).body),
      ...getShape(getShape(post_fleet_agentless_policies_request).path),
      ...getShape(getShape(post_fleet_agentless_policies_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agentless_policies_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_FLEET_AGENTLESS_POLICIES_POLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_agentless_policies_policyid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agentless_policies/{policyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an agentless policy`,
  methods: ['delete'],
  patterns: ['/api/fleet/agentless_policies/{policyId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['policyId'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_fleet_agentless_policies_policyid_request).body),
      ...getShape(getShape(delete_fleet_agentless_policies_policyid_request).path),
      ...getShape(getShape(delete_fleet_agentless_policies_policyid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_fleet_agentless_policies_policyid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['get'],
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
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agents_request).body),
      ...getShape(getShape(get_fleet_agents_request).path),
      ...getShape(getShape(get_fleet_agents_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agents_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['post'],
  patterns: ['/api/fleet/agents'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agents_request).body),
      ...getShape(getShape(post_fleet_agents_request).path),
      ...getShape(getShape(post_fleet_agents_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agents_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_FLEET_AGENTS_AGENTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_agents_agentid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an agent by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['delete'],
  patterns: ['/api/fleet/agents/{agentId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_fleet_agents_agentid_request).body),
      ...getShape(getShape(delete_fleet_agents_agentid_request).path),
      ...getShape(getShape(delete_fleet_agents_agentid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_fleet_agents_agentid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENTS_AGENTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_agentid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get an agent by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/agents/{agentId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: ['withMetrics'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agents_agentid_request).body),
      ...getShape(getShape(get_fleet_agents_agentid_request).path),
      ...getShape(getShape(get_fleet_agents_agentid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agents_agentid_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_FLEET_AGENTS_AGENTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_agents_agentid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an agent by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['put'],
  patterns: ['/api/fleet/agents/{agentId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_fleet_agents_agentid_request).body),
      ...getShape(getShape(put_fleet_agents_agentid_request).path),
      ...getShape(getShape(put_fleet_agents_agentid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_fleet_agents_agentid_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENTS_AGENTID_ACTIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_actions',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/actions</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/agents/{agentId}/actions'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agents_agentid_actions_request).body),
      ...getShape(getShape(post_fleet_agents_agentid_actions_request).path),
      ...getShape(getShape(post_fleet_agents_agentid_actions_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agents_agentid_actions_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENTS_AGENTID_MIGRATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_migrate',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/migrate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Migrate a single agent to another cluster.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/agents/{agentId}/migrate'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agents_agentid_migrate_request).body),
      ...getShape(getShape(post_fleet_agents_agentid_migrate_request).path),
      ...getShape(getShape(post_fleet_agents_agentid_migrate_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agents_agentid_migrate_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENTS_AGENTID_REASSIGN_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_reassign',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/reassign</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/agents/{agentId}/reassign'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agents_agentid_reassign_request).body),
      ...getShape(getShape(post_fleet_agents_agentid_reassign_request).path),
      ...getShape(getShape(post_fleet_agents_agentid_reassign_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agents_agentid_reassign_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENTS_AGENTID_REQUEST_DIAGNOSTICS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_request_diagnostics',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/request_diagnostics</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['post'],
  patterns: ['/api/fleet/agents/{agentId}/request_diagnostics'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agents_agentid_request_diagnostics_request).body),
      ...getShape(getShape(post_fleet_agents_agentid_request_diagnostics_request).path),
      ...getShape(getShape(post_fleet_agents_agentid_request_diagnostics_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agents_agentid_request_diagnostics_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENTS_AGENTID_UNENROLL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_unenroll',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/unenroll</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/agents/{agentId}/unenroll'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agents_agentid_unenroll_request).body),
      ...getShape(getShape(post_fleet_agents_agentid_unenroll_request).path),
      ...getShape(getShape(post_fleet_agents_agentid_unenroll_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agents_agentid_unenroll_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENTS_AGENTID_UPGRADE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_agentid_upgrade',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/upgrade</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/agents/{agentId}/upgrade'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agents_agentid_upgrade_request).body),
      ...getShape(getShape(post_fleet_agents_agentid_upgrade_request).path),
      ...getShape(getShape(post_fleet_agents_agentid_upgrade_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agents_agentid_upgrade_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENTS_AGENTID_UPLOADS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_agentid_uploads',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/{agentId}/uploads</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/agents/{agentId}/uploads'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agents_agentid_uploads_request).body),
      ...getShape(getShape(get_fleet_agents_agentid_uploads_request).path),
      ...getShape(getShape(get_fleet_agents_agentid_uploads_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agents_agentid_uploads_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENTS_ACTION_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_action_status',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/action_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/agents/action_status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'perPage', 'date', 'latest', 'errorSize'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agents_action_status_request).body),
      ...getShape(getShape(get_fleet_agents_action_status_request).path),
      ...getShape(getShape(get_fleet_agents_action_status_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agents_action_status_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENTS_ACTIONS_ACTIONID_CANCEL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_actions_actionid_cancel',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/actions/{actionId}/cancel</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/agents/actions/{actionId}/cancel'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['actionId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agents_actions_actionid_cancel_request).body),
      ...getShape(getShape(post_fleet_agents_actions_actionid_cancel_request).path),
      ...getShape(getShape(post_fleet_agents_actions_actionid_cancel_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agents_actions_actionid_cancel_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENTS_AVAILABLE_VERSIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_available_versions',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/available_versions</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/agents/available_versions'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agents_available_versions_request).body),
      ...getShape(getShape(get_fleet_agents_available_versions_request).path),
      ...getShape(getShape(get_fleet_agents_available_versions_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agents_available_versions_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENTS_BULK_MIGRATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_migrate',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_migrate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Bulk migrate agents to another cluster.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/agents/bulk_migrate'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agents_bulk_migrate_request).body),
      ...getShape(getShape(post_fleet_agents_bulk_migrate_request).path),
      ...getShape(getShape(post_fleet_agents_bulk_migrate_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agents_bulk_migrate_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENTS_BULK_REASSIGN_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_reassign',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_reassign</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/agents/bulk_reassign'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agents_bulk_reassign_request).body),
      ...getShape(getShape(post_fleet_agents_bulk_reassign_request).path),
      ...getShape(getShape(post_fleet_agents_bulk_reassign_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agents_bulk_reassign_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENTS_BULK_REQUEST_DIAGNOSTICS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_request_diagnostics',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_request_diagnostics</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['post'],
  patterns: ['/api/fleet/agents/bulk_request_diagnostics'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agents_bulk_request_diagnostics_request).body),
      ...getShape(getShape(post_fleet_agents_bulk_request_diagnostics_request).path),
      ...getShape(getShape(post_fleet_agents_bulk_request_diagnostics_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agents_bulk_request_diagnostics_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENTS_BULK_UNENROLL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_unenroll',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_unenroll</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/agents/bulk_unenroll'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agents_bulk_unenroll_request).body),
      ...getShape(getShape(post_fleet_agents_bulk_unenroll_request).path),
      ...getShape(getShape(post_fleet_agents_bulk_unenroll_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agents_bulk_unenroll_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENTS_BULK_UPDATE_AGENT_TAGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_update_agent_tags',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_update_agent_tags</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/agents/bulk_update_agent_tags'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agents_bulk_update_agent_tags_request).body),
      ...getShape(getShape(post_fleet_agents_bulk_update_agent_tags_request).path),
      ...getShape(getShape(post_fleet_agents_bulk_update_agent_tags_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agents_bulk_update_agent_tags_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENTS_BULK_UPGRADE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_bulk_upgrade',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/bulk_upgrade</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/agents/bulk_upgrade'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agents_bulk_upgrade_request).body),
      ...getShape(getShape(post_fleet_agents_bulk_upgrade_request).path),
      ...getShape(getShape(post_fleet_agents_bulk_upgrade_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agents_bulk_upgrade_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_FLEET_AGENTS_FILES_FILEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_agents_files_fileid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/files/{fileId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a file uploaded by an agent.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['delete'],
  patterns: ['/api/fleet/agents/files/{fileId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['fileId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_fleet_agents_files_fileid_request).body),
      ...getShape(getShape(delete_fleet_agents_files_fileid_request).path),
      ...getShape(getShape(delete_fleet_agents_files_fileid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_fleet_agents_files_fileid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENTS_FILES_FILEID_FILENAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_files_fileid_filename',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/files/{fileId}/{fileName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a file uploaded by an agent.<br/><br/>[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/agents/files/{fileId}/{fileName}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['fileId', 'fileName'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agents_files_fileid_filename_request).body),
      ...getShape(getShape(get_fleet_agents_files_fileid_filename_request).path),
      ...getShape(getShape(get_fleet_agents_files_fileid_filename_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agents_files_fileid_filename_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENTS_SETUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_setup',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/setup</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read OR fleet-agent-policies-read OR fleet-settings-read OR fleet-setup.`,
  methods: ['get'],
  patterns: ['/api/fleet/agents/setup'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agents_setup_request).body),
      ...getShape(getShape(get_fleet_agents_setup_request).path),
      ...getShape(getShape(get_fleet_agents_setup_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agents_setup_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_AGENTS_SETUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agents_setup',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/setup</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read OR fleet-agent-policies-read OR fleet-settings-read OR fleet-setup.`,
  methods: ['post'],
  patterns: ['/api/fleet/agents/setup'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_agents_setup_request).body),
      ...getShape(getShape(post_fleet_agents_setup_request).path),
      ...getShape(getShape(post_fleet_agents_setup_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_agents_setup_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_AGENTS_TAGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_agents_tags',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/tags</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/agents/tags'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['kuery', 'showInactive'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_agents_tags_request).body),
      ...getShape(getShape(get_fleet_agents_tags_request).path),
      ...getShape(getShape(get_fleet_agents_tags_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_agents_tags_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_CHECK_PERMISSIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_check_permissions',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/check-permissions</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/fleet/check-permissions'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['fleetServerSetup'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_check_permissions_request).body),
      ...getShape(getShape(get_fleet_check_permissions_request).path),
      ...getShape(getShape(get_fleet_check_permissions_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_check_permissions_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_CLOUD_CONNECTORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_cloud_connectors',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/cloud_connectors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR integrations-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/cloud_connectors'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'perPage', 'kuery'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_cloud_connectors_request).body),
      ...getShape(getShape(get_fleet_cloud_connectors_request).path),
      ...getShape(getShape(get_fleet_cloud_connectors_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_cloud_connectors_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_CLOUD_CONNECTORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_cloud_connectors',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/cloud_connectors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-all OR integrations-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/cloud_connectors'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_cloud_connectors_request).body),
      ...getShape(getShape(post_fleet_cloud_connectors_request).path),
      ...getShape(getShape(post_fleet_cloud_connectors_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_cloud_connectors_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_FLEET_CLOUD_CONNECTORS_CLOUDCONNECTORID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_cloud_connectors_cloudconnectorid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/cloud_connectors/{cloudConnectorId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-all OR integrations-all.`,
  methods: ['delete'],
  patterns: ['/api/fleet/cloud_connectors/{cloudConnectorId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['cloudConnectorId'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_fleet_cloud_connectors_cloudconnectorid_request).body),
      ...getShape(getShape(delete_fleet_cloud_connectors_cloudconnectorid_request).path),
      ...getShape(getShape(delete_fleet_cloud_connectors_cloudconnectorid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_fleet_cloud_connectors_cloudconnectorid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_CLOUD_CONNECTORS_CLOUDCONNECTORID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_cloud_connectors_cloudconnectorid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/cloud_connectors/{cloudConnectorId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR integrations-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/cloud_connectors/{cloudConnectorId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['cloudConnectorId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_cloud_connectors_cloudconnectorid_request).body),
      ...getShape(getShape(get_fleet_cloud_connectors_cloudconnectorid_request).path),
      ...getShape(getShape(get_fleet_cloud_connectors_cloudconnectorid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_cloud_connectors_cloudconnectorid_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_FLEET_CLOUD_CONNECTORS_CLOUDCONNECTORID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_cloud_connectors_cloudconnectorid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/cloud_connectors/{cloudConnectorId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-all OR integrations-all.`,
  methods: ['put'],
  patterns: ['/api/fleet/cloud_connectors/{cloudConnectorId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['cloudConnectorId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_fleet_cloud_connectors_cloudconnectorid_request).body),
      ...getShape(getShape(put_fleet_cloud_connectors_cloudconnectorid_request).path),
      ...getShape(getShape(put_fleet_cloud_connectors_cloudconnectorid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_fleet_cloud_connectors_cloudconnectorid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_DATA_STREAMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_data_streams',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/data_streams</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all AND fleet-agent-policies-all AND fleet-settings-all.`,
  methods: ['get'],
  patterns: ['/api/fleet/data_streams'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_data_streams_request).body),
      ...getShape(getShape(get_fleet_data_streams_request).path),
      ...getShape(getShape(get_fleet_data_streams_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_data_streams_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_ENROLLMENT_API_KEYS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_enrollment_api_keys',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/enrollment_api_keys</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all OR fleet-setup.`,
  methods: ['get'],
  patterns: ['/api/fleet/enrollment_api_keys'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'perPage', 'kuery'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_enrollment_api_keys_request).body),
      ...getShape(getShape(get_fleet_enrollment_api_keys_request).path),
      ...getShape(getShape(get_fleet_enrollment_api_keys_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_enrollment_api_keys_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_ENROLLMENT_API_KEYS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_enrollment_api_keys',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/enrollment_api_keys</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/enrollment_api_keys'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_enrollment_api_keys_request).body),
      ...getShape(getShape(post_fleet_enrollment_api_keys_request).path),
      ...getShape(getShape(post_fleet_enrollment_api_keys_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_enrollment_api_keys_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_FLEET_ENROLLMENT_API_KEYS_KEYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_enrollment_api_keys_keyid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/enrollment_api_keys/{keyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Revoke an enrollment API key by ID by marking it as inactive.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['delete'],
  patterns: ['/api/fleet/enrollment_api_keys/{keyId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['keyId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_fleet_enrollment_api_keys_keyid_request).body),
      ...getShape(getShape(delete_fleet_enrollment_api_keys_keyid_request).path),
      ...getShape(getShape(delete_fleet_enrollment_api_keys_keyid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_fleet_enrollment_api_keys_keyid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_ENROLLMENT_API_KEYS_KEYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_enrollment_api_keys_keyid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/enrollment_api_keys/{keyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get an enrollment API key by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all OR fleet-setup.`,
  methods: ['get'],
  patterns: ['/api/fleet/enrollment_api_keys/{keyId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['keyId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_enrollment_api_keys_keyid_request).body),
      ...getShape(getShape(get_fleet_enrollment_api_keys_keyid_request).path),
      ...getShape(getShape(get_fleet_enrollment_api_keys_keyid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_enrollment_api_keys_keyid_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_EPM_BULK_ASSETS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_bulk_assets',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/bulk_assets</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/epm/bulk_assets'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_epm_bulk_assets_request).body),
      ...getShape(getShape(post_fleet_epm_bulk_assets_request).path),
      ...getShape(getShape(post_fleet_epm_bulk_assets_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_epm_bulk_assets_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_EPM_CATEGORIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_categories',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/categories</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['get'],
  patterns: ['/api/fleet/epm/categories'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['prerelease', 'include_policy_templates'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_epm_categories_request).body),
      ...getShape(getShape(get_fleet_epm_categories_request).path),
      ...getShape(getShape(get_fleet_epm_categories_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_epm_categories_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_EPM_CUSTOM_INTEGRATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_custom_integrations',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/custom_integrations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/epm/custom_integrations'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_epm_custom_integrations_request).body),
      ...getShape(getShape(post_fleet_epm_custom_integrations_request).path),
      ...getShape(getShape(post_fleet_epm_custom_integrations_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_epm_custom_integrations_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_FLEET_EPM_CUSTOM_INTEGRATIONS_PKGNAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_epm_custom_integrations_pkgname',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/custom_integrations/{pkgName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all AND integrations-all.`,
  methods: ['put'],
  patterns: ['/api/fleet/epm/custom_integrations/{pkgName}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_fleet_epm_custom_integrations_pkgname_request).body),
      ...getShape(getShape(put_fleet_epm_custom_integrations_pkgname_request).path),
      ...getShape(getShape(put_fleet_epm_custom_integrations_pkgname_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_fleet_epm_custom_integrations_pkgname_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_EPM_DATA_STREAMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_data_streams',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/data_streams</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['get'],
  patterns: ['/api/fleet/epm/data_streams'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['type', 'datasetQuery', 'sortOrder', 'uncategorisedOnly'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_epm_data_streams_request).body),
      ...getShape(getShape(get_fleet_epm_data_streams_request).path),
      ...getShape(getShape(get_fleet_epm_data_streams_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_epm_data_streams_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_EPM_PACKAGES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['get'],
  patterns: ['/api/fleet/epm/packages'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['category', 'prerelease', 'excludeInstallStatus', 'withPackagePoliciesCount'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_epm_packages_request).body),
      ...getShape(getShape(get_fleet_epm_packages_request).path),
      ...getShape(getShape(get_fleet_epm_packages_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_epm_packages_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_EPM_PACKAGES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/epm/packages'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['ignoreMappingUpdateErrors', 'skipDataStreamRollover'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_epm_packages_request).body),
      ...getShape(getShape(post_fleet_epm_packages_request).path),
      ...getShape(getShape(post_fleet_epm_packages_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_epm_packages_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_EPM_PACKAGES_BULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_bulk',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/epm/packages/_bulk'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['prerelease'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_epm_packages_bulk_request).body),
      ...getShape(getShape(post_fleet_epm_packages_bulk_request).path),
      ...getShape(getShape(post_fleet_epm_packages_bulk_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_epm_packages_bulk_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_EPM_PACKAGES_BULK_ROLLBACK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_bulk_rollback',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_rollback</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/epm/packages/_bulk_rollback'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_epm_packages_bulk_rollback_request).body),
      ...getShape(getShape(post_fleet_epm_packages_bulk_rollback_request).path),
      ...getShape(getShape(post_fleet_epm_packages_bulk_rollback_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_epm_packages_bulk_rollback_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_EPM_PACKAGES_BULK_ROLLBACK_TASKID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_bulk_rollback_taskid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_rollback/{taskId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['get'],
  patterns: ['/api/fleet/epm/packages/_bulk_rollback/{taskId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['taskId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_epm_packages_bulk_rollback_taskid_request).body),
      ...getShape(getShape(get_fleet_epm_packages_bulk_rollback_taskid_request).path),
      ...getShape(getShape(get_fleet_epm_packages_bulk_rollback_taskid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_epm_packages_bulk_rollback_taskid_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_EPM_PACKAGES_BULK_UNINSTALL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_bulk_uninstall',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_uninstall</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/epm/packages/_bulk_uninstall'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_epm_packages_bulk_uninstall_request).body),
      ...getShape(getShape(post_fleet_epm_packages_bulk_uninstall_request).path),
      ...getShape(getShape(post_fleet_epm_packages_bulk_uninstall_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_epm_packages_bulk_uninstall_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_EPM_PACKAGES_BULK_UNINSTALL_TASKID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_bulk_uninstall_taskid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_uninstall/{taskId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['get'],
  patterns: ['/api/fleet/epm/packages/_bulk_uninstall/{taskId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['taskId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_epm_packages_bulk_uninstall_taskid_request).body),
      ...getShape(getShape(get_fleet_epm_packages_bulk_uninstall_taskid_request).path),
      ...getShape(getShape(get_fleet_epm_packages_bulk_uninstall_taskid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_epm_packages_bulk_uninstall_taskid_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_EPM_PACKAGES_BULK_UPGRADE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_bulk_upgrade',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_upgrade</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/epm/packages/_bulk_upgrade'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_epm_packages_bulk_upgrade_request).body),
      ...getShape(getShape(post_fleet_epm_packages_bulk_upgrade_request).path),
      ...getShape(getShape(post_fleet_epm_packages_bulk_upgrade_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_epm_packages_bulk_upgrade_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_EPM_PACKAGES_BULK_UPGRADE_TASKID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_bulk_upgrade_taskid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_upgrade/{taskId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['get'],
  patterns: ['/api/fleet/epm/packages/_bulk_upgrade/{taskId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['taskId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_epm_packages_bulk_upgrade_taskid_request).body),
      ...getShape(getShape(get_fleet_epm_packages_bulk_upgrade_taskid_request).path),
      ...getShape(getShape(get_fleet_epm_packages_bulk_upgrade_taskid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_epm_packages_bulk_upgrade_taskid_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_epm_packages_pkgname_pkgversion',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['delete'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_fleet_epm_packages_pkgname_pkgversion_request).body),
      ...getShape(getShape(delete_fleet_epm_packages_pkgname_pkgversion_request).path),
      ...getShape(getShape(delete_fleet_epm_packages_pkgname_pkgversion_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_fleet_epm_packages_pkgname_pkgversion_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_pkgname_pkgversion',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: ['ignoreUnverified', 'prerelease', 'full', 'withMetadata'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_epm_packages_pkgname_pkgversion_request).body),
      ...getShape(getShape(get_fleet_epm_packages_pkgname_pkgversion_request).path),
      ...getShape(getShape(get_fleet_epm_packages_pkgname_pkgversion_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_epm_packages_pkgname_pkgversion_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_pkgname_pkgversion',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: ['prerelease', 'ignoreMappingUpdateErrors', 'skipDataStreamRollover'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_epm_packages_pkgname_pkgversion_request).body),
      ...getShape(getShape(post_fleet_epm_packages_pkgname_pkgversion_request).path),
      ...getShape(getShape(post_fleet_epm_packages_pkgname_pkgversion_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_epm_packages_pkgname_pkgversion_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_epm_packages_pkgname_pkgversion',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['put'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_fleet_epm_packages_pkgname_pkgversion_request).body),
      ...getShape(getShape(put_fleet_epm_packages_pkgname_pkgversion_request).path),
      ...getShape(getShape(put_fleet_epm_packages_pkgname_pkgversion_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_fleet_epm_packages_pkgname_pkgversion_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_FILEPATH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_pkgname_pkgversion_filepath',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/{filePath}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['get'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/{filePath}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName', 'pkgVersion', 'filePath'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_epm_packages_pkgname_pkgversion_filepath_request).body),
      ...getShape(getShape(get_fleet_epm_packages_pkgname_pkgversion_filepath_request).path),
      ...getShape(getShape(get_fleet_epm_packages_pkgname_pkgversion_filepath_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_epm_packages_pkgname_pkgversion_filepath_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_DATASTREAM_ASSETS_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets',
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/datastream_assets</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
    methods: ['delete'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/datastream_assets'],
    isInternal: true,
    documentation: 'URL_NOT_IMPLEMENTED',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: ['packagePolicyId'],
      bodyParams: [],
    },
    paramsSchema: z
      .looseObject({
        ...getShape(
          getShape(delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets_request).body
        ),
        ...getShape(
          getShape(delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets_request).path
        ),
        ...getShape(
          getShape(delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets_request).query
        ),
      })
      .partial(),
    outputSchema: z.object({
      output: z.looseObject({
        ...getShape(
          getShape(delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets_response)
        ),
      }),
      error: z.any().optional(),
    }),
  };
const DELETE_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_KIBANA_ASSETS_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets',
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/kibana_assets</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
    methods: ['delete'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/kibana_assets'],
    isInternal: true,
    documentation: 'URL_NOT_IMPLEMENTED',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z
      .looseObject({
        ...getShape(
          getShape(delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request).body
        ),
        ...getShape(
          getShape(delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request).path
        ),
        ...getShape(
          getShape(delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request).query
        ),
      })
      .partial(),
    outputSchema: z.object({
      output: z.looseObject({
        ...getShape(getShape(delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets_response)),
      }),
      error: z.any().optional(),
    }),
  };
const POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_KIBANA_ASSETS_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.post_fleet_epm_packages_pkgname_pkgversion_kibana_assets',
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/kibana_assets</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
    methods: ['post'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/kibana_assets'],
    isInternal: true,
    documentation: 'URL_NOT_IMPLEMENTED',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z
      .looseObject({
        ...getShape(
          getShape(post_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request).body
        ),
        ...getShape(
          getShape(post_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request).path
        ),
        ...getShape(
          getShape(post_fleet_epm_packages_pkgname_pkgversion_kibana_assets_request).query
        ),
      })
      .partial(),
    outputSchema: z.object({
      output: z.looseObject({
        ...getShape(getShape(post_fleet_epm_packages_pkgname_pkgversion_kibana_assets_response)),
      }),
      error: z.any().optional(),
    }),
  };
const POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_RULE_ASSETS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_pkgname_pkgversion_rule_assets',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/rule_assets</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/rule_assets'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_epm_packages_pkgname_pkgversion_rule_assets_request).body),
      ...getShape(getShape(post_fleet_epm_packages_pkgname_pkgversion_rule_assets_request).path),
      ...getShape(getShape(post_fleet_epm_packages_pkgname_pkgversion_rule_assets_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_epm_packages_pkgname_pkgversion_rule_assets_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_TRANSFORMS_AUTHORIZE_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize',
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/{pkgVersion}/transforms/authorize</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
    methods: ['post'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/transforms/authorize'],
    isInternal: true,
    documentation: 'URL_NOT_IMPLEMENTED',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: ['prerelease'],
      bodyParams: [],
    },
    paramsSchema: z
      .looseObject({
        ...getShape(
          getShape(post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_request).body
        ),
        ...getShape(
          getShape(post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_request).path
        ),
        ...getShape(
          getShape(post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_request).query
        ),
      })
      .partial(),
    outputSchema: z.object({
      output: z.looseObject({
        ...getShape(
          getShape(post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_response)
        ),
      }),
      error: z.any().optional(),
    }),
  };
const POST_FLEET_EPM_PACKAGES_PKGNAME_ROLLBACK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_epm_packages_pkgname_rollback',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/rollback</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/rollback'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_epm_packages_pkgname_rollback_request).body),
      ...getShape(getShape(post_fleet_epm_packages_pkgname_rollback_request).path),
      ...getShape(getShape(post_fleet_epm_packages_pkgname_rollback_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_epm_packages_pkgname_rollback_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_EPM_PACKAGES_PKGNAME_STATS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_pkgname_stats',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/{pkgName}/stats</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['get'],
  patterns: ['/api/fleet/epm/packages/{pkgName}/stats'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_epm_packages_pkgname_stats_request).body),
      ...getShape(getShape(get_fleet_epm_packages_pkgname_stats_request).path),
      ...getShape(getShape(get_fleet_epm_packages_pkgname_stats_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_epm_packages_pkgname_stats_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_EPM_PACKAGES_INSTALLED_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_installed',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/installed</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['get'],
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
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_epm_packages_installed_request).body),
      ...getShape(getShape(get_fleet_epm_packages_installed_request).path),
      ...getShape(getShape(get_fleet_epm_packages_installed_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_epm_packages_installed_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_EPM_PACKAGES_LIMITED_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_limited',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/limited</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['get'],
  patterns: ['/api/fleet/epm/packages/limited'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_epm_packages_limited_request).body),
      ...getShape(getShape(get_fleet_epm_packages_limited_request).path),
      ...getShape(getShape(get_fleet_epm_packages_limited_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_epm_packages_limited_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_EPM_TEMPLATES_PKGNAME_PKGVERSION_INPUTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_templates_pkgname_pkgversion_inputs',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/templates/{pkgName}/{pkgVersion}/inputs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['get'],
  patterns: ['/api/fleet/epm/templates/{pkgName}/{pkgVersion}/inputs'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['pkgName', 'pkgVersion'],
    urlParams: ['format', 'prerelease', 'ignoreUnverified'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_epm_templates_pkgname_pkgversion_inputs_request).body),
      ...getShape(getShape(get_fleet_epm_templates_pkgname_pkgversion_inputs_request).path),
      ...getShape(getShape(get_fleet_epm_templates_pkgname_pkgversion_inputs_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_epm_templates_pkgname_pkgversion_inputs_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_EPM_VERIFICATION_KEY_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_verification_key_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/verification_key_id</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-read OR fleet-setup OR fleet-all.`,
  methods: ['get'],
  patterns: ['/api/fleet/epm/verification_key_id'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_epm_verification_key_id_request).body),
      ...getShape(getShape(get_fleet_epm_verification_key_id_request).path),
      ...getShape(getShape(get_fleet_epm_verification_key_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_epm_verification_key_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_FLEET_SERVER_HOSTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_fleet_server_hosts',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/fleet_server_hosts</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all OR fleet-settings-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/fleet_server_hosts'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_fleet_server_hosts_request).body),
      ...getShape(getShape(get_fleet_fleet_server_hosts_request).path),
      ...getShape(getShape(get_fleet_fleet_server_hosts_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_fleet_server_hosts_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_FLEET_SERVER_HOSTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_fleet_server_hosts',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/fleet_server_hosts</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/fleet_server_hosts'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_fleet_server_hosts_request).body),
      ...getShape(getShape(post_fleet_fleet_server_hosts_request).path),
      ...getShape(getShape(post_fleet_fleet_server_hosts_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_fleet_server_hosts_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_FLEET_FLEET_SERVER_HOSTS_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_fleet_server_hosts_itemid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/fleet_server_hosts/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a Fleet Server host by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['delete'],
  patterns: ['/api/fleet/fleet_server_hosts/{itemId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_fleet_fleet_server_hosts_itemid_request).body),
      ...getShape(getShape(delete_fleet_fleet_server_hosts_itemid_request).path),
      ...getShape(getShape(delete_fleet_fleet_server_hosts_itemid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_fleet_fleet_server_hosts_itemid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_FLEET_SERVER_HOSTS_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_fleet_server_hosts_itemid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/fleet_server_hosts/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a Fleet Server host by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/fleet_server_hosts/{itemId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_fleet_server_hosts_itemid_request).body),
      ...getShape(getShape(get_fleet_fleet_server_hosts_itemid_request).path),
      ...getShape(getShape(get_fleet_fleet_server_hosts_itemid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_fleet_server_hosts_itemid_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_FLEET_FLEET_SERVER_HOSTS_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_fleet_server_hosts_itemid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/fleet_server_hosts/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a Fleet Server host by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['put'],
  patterns: ['/api/fleet/fleet_server_hosts/{itemId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_fleet_fleet_server_hosts_itemid_request).body),
      ...getShape(getShape(put_fleet_fleet_server_hosts_itemid_request).path),
      ...getShape(getShape(put_fleet_fleet_server_hosts_itemid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_fleet_fleet_server_hosts_itemid_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_HEALTH_CHECK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_health_check',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/health_check</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/health_check'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_health_check_request).body),
      ...getShape(getShape(post_fleet_health_check_request).path),
      ...getShape(getShape(post_fleet_health_check_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_health_check_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_KUBERNETES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_kubernetes',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/kubernetes</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-setup.`,
  methods: ['get'],
  patterns: ['/api/fleet/kubernetes'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['download', 'fleetServer', 'enrolToken'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_kubernetes_request).body),
      ...getShape(getShape(get_fleet_kubernetes_request).path),
      ...getShape(getShape(get_fleet_kubernetes_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_kubernetes_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_KUBERNETES_DOWNLOAD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_kubernetes_download',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/kubernetes/download</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-setup.`,
  methods: ['get'],
  patterns: ['/api/fleet/kubernetes/download'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['download', 'fleetServer', 'enrolToken'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_kubernetes_download_request).body),
      ...getShape(getShape(get_fleet_kubernetes_download_request).path),
      ...getShape(getShape(get_fleet_kubernetes_download_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_kubernetes_download_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_LOGSTASH_API_KEYS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_logstash_api_keys',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/logstash_api_keys</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/logstash_api_keys'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_logstash_api_keys_request).body),
      ...getShape(getShape(post_fleet_logstash_api_keys_request).path),
      ...getShape(getShape(post_fleet_logstash_api_keys_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_logstash_api_keys_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_MESSAGE_SIGNING_SERVICE_ROTATE_KEY_PAIR_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_message_signing_service_rotate_key_pair',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/message_signing_service/rotate_key_pair</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all AND fleet-agent-policies-all AND fleet-settings-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/message_signing_service/rotate_key_pair'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['acknowledge'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_message_signing_service_rotate_key_pair_request).body),
      ...getShape(getShape(post_fleet_message_signing_service_rotate_key_pair_request).path),
      ...getShape(getShape(post_fleet_message_signing_service_rotate_key_pair_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_message_signing_service_rotate_key_pair_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_OUTPUTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_outputs',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read OR fleet-agent-policies-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/outputs'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_outputs_request).body),
      ...getShape(getShape(get_fleet_outputs_request).path),
      ...getShape(getShape(get_fleet_outputs_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_outputs_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_OUTPUTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_outputs',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/outputs'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_outputs_request).body),
      ...getShape(getShape(post_fleet_outputs_request).path),
      ...getShape(getShape(post_fleet_outputs_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_outputs_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_FLEET_OUTPUTS_OUTPUTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_outputs_outputid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs/{outputId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete output by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['delete'],
  patterns: ['/api/fleet/outputs/{outputId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['outputId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_fleet_outputs_outputid_request).body),
      ...getShape(getShape(delete_fleet_outputs_outputid_request).path),
      ...getShape(getShape(delete_fleet_outputs_outputid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_fleet_outputs_outputid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_OUTPUTS_OUTPUTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_outputs_outputid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs/{outputId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get output by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-read OR fleet-agent-policies-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/outputs/{outputId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['outputId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_outputs_outputid_request).body),
      ...getShape(getShape(get_fleet_outputs_outputid_request).path),
      ...getShape(getShape(get_fleet_outputs_outputid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_outputs_outputid_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_FLEET_OUTPUTS_OUTPUTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_outputs_outputid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs/{outputId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update output by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all OR fleet-agent-policies-all.`,
  methods: ['put'],
  patterns: ['/api/fleet/outputs/{outputId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['outputId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_fleet_outputs_outputid_request).body),
      ...getShape(getShape(put_fleet_outputs_outputid_request).path),
      ...getShape(getShape(put_fleet_outputs_outputid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_fleet_outputs_outputid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_OUTPUTS_OUTPUTID_HEALTH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_outputs_outputid_health',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs/{outputId}/health</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/outputs/{outputId}/health'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['outputId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_outputs_outputid_health_request).body),
      ...getShape(getShape(get_fleet_outputs_outputid_health_request).path),
      ...getShape(getShape(get_fleet_outputs_outputid_health_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_outputs_outputid_health_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_PACKAGE_POLICIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_package_policies',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
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
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_package_policies_request).body),
      ...getShape(getShape(get_fleet_package_policies_request).path),
      ...getShape(getShape(get_fleet_package_policies_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_package_policies_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_PACKAGE_POLICIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_package_policies',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/fleet/package_policies'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_package_policies_request).body),
      ...getShape(getShape(post_fleet_package_policies_request).path),
      ...getShape(getShape(post_fleet_package_policies_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_package_policies_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_PACKAGE_POLICIES_BULK_GET_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_package_policies_bulk_get',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/_bulk_get</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/fleet/package_policies/_bulk_get'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_package_policies_bulk_get_request).body),
      ...getShape(getShape(post_fleet_package_policies_bulk_get_request).path),
      ...getShape(getShape(post_fleet_package_policies_bulk_get_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_package_policies_bulk_get_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_FLEET_PACKAGE_POLICIES_PACKAGEPOLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_package_policies_packagepolicyid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/{packagePolicyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a package policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-all AND integrations-all.`,
  methods: ['delete'],
  patterns: ['/api/fleet/package_policies/{packagePolicyId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['packagePolicyId'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_fleet_package_policies_packagepolicyid_request).body),
      ...getShape(getShape(delete_fleet_package_policies_packagepolicyid_request).path),
      ...getShape(getShape(delete_fleet_package_policies_packagepolicyid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_fleet_package_policies_packagepolicyid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_PACKAGE_POLICIES_PACKAGEPOLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_package_policies_packagepolicyid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/{packagePolicyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a package policy by ID.`,
  methods: ['get'],
  patterns: ['/api/fleet/package_policies/{packagePolicyId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['packagePolicyId'],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_package_policies_packagepolicyid_request).body),
      ...getShape(getShape(get_fleet_package_policies_packagepolicyid_request).path),
      ...getShape(getShape(get_fleet_package_policies_packagepolicyid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_package_policies_packagepolicyid_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_FLEET_PACKAGE_POLICIES_PACKAGEPOLICYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_package_policies_packagepolicyid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/{packagePolicyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a package policy by ID.`,
  methods: ['put'],
  patterns: ['/api/fleet/package_policies/{packagePolicyId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['packagePolicyId'],
    urlParams: ['format'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_fleet_package_policies_packagepolicyid_request).body),
      ...getShape(getShape(put_fleet_package_policies_packagepolicyid_request).path),
      ...getShape(getShape(put_fleet_package_policies_packagepolicyid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_fleet_package_policies_packagepolicyid_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_PACKAGE_POLICIES_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_package_policies_delete',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-all AND integrations-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/package_policies/delete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_package_policies_delete_request).body),
      ...getShape(getShape(post_fleet_package_policies_delete_request).path),
      ...getShape(getShape(post_fleet_package_policies_delete_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_package_policies_delete_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_PACKAGE_POLICIES_UPGRADE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_package_policies_upgrade',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/upgrade</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upgrade a package policy to a newer package version.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-all AND integrations-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/package_policies/upgrade'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_package_policies_upgrade_request).body),
      ...getShape(getShape(post_fleet_package_policies_upgrade_request).path),
      ...getShape(getShape(post_fleet_package_policies_upgrade_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_package_policies_upgrade_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_PACKAGE_POLICIES_UPGRADE_DRYRUN_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_package_policies_upgrade_dryrun',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/package_policies/upgrade/dryrun</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read AND integrations-read.`,
  methods: ['post'],
  patterns: ['/api/fleet/package_policies/upgrade/dryrun'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_package_policies_upgrade_dryrun_request).body),
      ...getShape(getShape(post_fleet_package_policies_upgrade_dryrun_request).path),
      ...getShape(getShape(post_fleet_package_policies_upgrade_dryrun_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_package_policies_upgrade_dryrun_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_PROXIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_proxies',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/proxies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/proxies'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_proxies_request).body),
      ...getShape(getShape(get_fleet_proxies_request).path),
      ...getShape(getShape(get_fleet_proxies_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_proxies_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_PROXIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_proxies',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/proxies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/proxies'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_proxies_request).body),
      ...getShape(getShape(post_fleet_proxies_request).path),
      ...getShape(getShape(post_fleet_proxies_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_proxies_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_FLEET_PROXIES_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_proxies_itemid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/proxies/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a proxy by ID<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['delete'],
  patterns: ['/api/fleet/proxies/{itemId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_fleet_proxies_itemid_request).body),
      ...getShape(getShape(delete_fleet_proxies_itemid_request).path),
      ...getShape(getShape(delete_fleet_proxies_itemid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_fleet_proxies_itemid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_PROXIES_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_proxies_itemid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/proxies/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a proxy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/proxies/{itemId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_proxies_itemid_request).body),
      ...getShape(getShape(get_fleet_proxies_itemid_request).path),
      ...getShape(getShape(get_fleet_proxies_itemid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_proxies_itemid_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_FLEET_PROXIES_ITEMID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_proxies_itemid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/proxies/{itemId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a proxy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['put'],
  patterns: ['/api/fleet/proxies/{itemId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['itemId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_fleet_proxies_itemid_request).body),
      ...getShape(getShape(put_fleet_proxies_itemid_request).path),
      ...getShape(getShape(put_fleet_proxies_itemid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_fleet_proxies_itemid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_REMOTE_SYNCED_INTEGRATIONS_OUTPUTID_REMOTE_STATUS_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.get_fleet_remote_synced_integrations_outputid_remote_status',
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/remote_synced_integrations/{outputId}/remote_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read AND integrations-read.`,
    methods: ['get'],
    patterns: ['/api/fleet/remote_synced_integrations/{outputId}/remote_status'],
    isInternal: true,
    documentation: 'URL_NOT_IMPLEMENTED',
    parameterTypes: {
      pathParams: ['outputId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z
      .looseObject({
        ...getShape(
          getShape(get_fleet_remote_synced_integrations_outputid_remote_status_request).body
        ),
        ...getShape(
          getShape(get_fleet_remote_synced_integrations_outputid_remote_status_request).path
        ),
        ...getShape(
          getShape(get_fleet_remote_synced_integrations_outputid_remote_status_request).query
        ),
      })
      .partial(),
    outputSchema: z.object({
      output: z.looseObject({
        ...getShape(getShape(get_fleet_remote_synced_integrations_outputid_remote_status_response)),
      }),
      error: z.any().optional(),
    }),
  };
const GET_FLEET_REMOTE_SYNCED_INTEGRATIONS_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_remote_synced_integrations_status',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/remote_synced_integrations/status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read AND integrations-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/remote_synced_integrations/status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_remote_synced_integrations_status_request).body),
      ...getShape(getShape(get_fleet_remote_synced_integrations_status_request).path),
      ...getShape(getShape(get_fleet_remote_synced_integrations_status_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_remote_synced_integrations_status_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_SERVICE_TOKENS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_service_tokens',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/service_tokens</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['post'],
  patterns: ['/api/fleet/service_tokens'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_service_tokens_request).body),
      ...getShape(getShape(post_fleet_service_tokens_request).path),
      ...getShape(getShape(post_fleet_service_tokens_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_service_tokens_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_settings',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-read.`,
  methods: ['get'],
  patterns: ['/api/fleet/settings'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_settings_request).body),
      ...getShape(getShape(get_fleet_settings_request).path),
      ...getShape(getShape(get_fleet_settings_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_settings_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_FLEET_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_settings',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['put'],
  patterns: ['/api/fleet/settings'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_fleet_settings_request).body),
      ...getShape(getShape(put_fleet_settings_request).path),
      ...getShape(getShape(put_fleet_settings_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_fleet_settings_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_FLEET_SETUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_setup',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/setup</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agents-read OR fleet-agent-policies-read OR fleet-settings-read OR fleet-setup.`,
  methods: ['post'],
  patterns: ['/api/fleet/setup'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_fleet_setup_request).body),
      ...getShape(getShape(post_fleet_setup_request).path),
      ...getShape(getShape(post_fleet_setup_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_fleet_setup_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_SPACE_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_space_settings',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/space_settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/fleet/space_settings'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_space_settings_request).body),
      ...getShape(getShape(get_fleet_space_settings_request).path),
      ...getShape(getShape(get_fleet_space_settings_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_space_settings_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_FLEET_SPACE_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_space_settings',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/space_settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['put'],
  patterns: ['/api/fleet/space_settings'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_fleet_space_settings_request).body),
      ...getShape(getShape(put_fleet_space_settings_request).path),
      ...getShape(getShape(put_fleet_space_settings_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_fleet_space_settings_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_UNINSTALL_TOKENS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_uninstall_tokens',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/uninstall_tokens</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List the metadata for the latest uninstall tokens per agent policy.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['get'],
  patterns: ['/api/fleet/uninstall_tokens'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['policyId', 'search', 'perPage', 'page'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_uninstall_tokens_request).body),
      ...getShape(getShape(get_fleet_uninstall_tokens_request).path),
      ...getShape(getShape(get_fleet_uninstall_tokens_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_uninstall_tokens_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_FLEET_UNINSTALL_TOKENS_UNINSTALLTOKENID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_uninstall_tokens_uninstalltokenid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/uninstall_tokens/{uninstallTokenId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get one decrypted uninstall token by its ID.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['get'],
  patterns: ['/api/fleet/uninstall_tokens/{uninstallTokenId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['uninstallTokenId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_fleet_uninstall_tokens_uninstalltokenid_request).body),
      ...getShape(getShape(get_fleet_uninstall_tokens_uninstalltokenid_request).path),
      ...getShape(getShape(get_fleet_uninstall_tokens_uninstalltokenid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_fleet_uninstall_tokens_uninstalltokenid_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETELIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteList',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a value list using the list ID.
> info
> When you delete a list, all of its list items are also deleted.
`,
  methods: ['delete'],
  patterns: ['/api/lists'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'deleteReferences', 'ignoreReferences'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_list_request).body),
      ...getShape(getShape(_delete_list_request).path),
      ...getShape(getShape(_delete_list_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_list_response)),
    }),
    error: z.any().optional(),
  }),
};
const READLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadList',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a value list using the list ID.`,
  methods: ['get'],
  patterns: ['/api/lists'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_list_request).body),
      ...getShape(getShape(_read_list_request).path),
      ...getShape(getShape(_read_list_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_list_response)),
    }),
    error: z.any().optional(),
  }),
};
const PATCHLIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PatchList',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update specific fields of an existing list using the list \`id\`.`,
  methods: ['patch'],
  patterns: ['/api/lists'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_patch_list_request).body),
      ...getShape(getShape(_patch_list_request).path),
      ...getShape(getShape(_patch_list_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_patch_list_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATELIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateList',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new value list.`,
  methods: ['post'],
  patterns: ['/api/lists'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_list_request).body),
      ...getShape(getShape(_create_list_request).path),
      ...getShape(getShape(_create_list_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_list_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATELIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateList',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a value list using the list \`id\`. The original list is replaced, and all unspecified fields are deleted.
> info
> You cannot modify the \`id\` value.
`,
  methods: ['put'],
  patterns: ['/api/lists'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_update_list_request).body),
      ...getShape(getShape(_update_list_request).path),
      ...getShape(getShape(_update_list_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_update_list_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDLISTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindLists',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a paginated subset of value lists. By default, the first page is returned, with 20 results per page.`,
  methods: ['get'],
  patterns: ['/api/lists/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'per_page', 'sort_field', 'sort_order', 'cursor', 'filter'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_find_lists_request).body),
      ...getShape(getShape(_find_lists_request).path),
      ...getShape(getShape(_find_lists_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_find_lists_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETELISTINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteListIndex',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete the \`.lists\` and \`.items\` data streams.`,
  methods: ['delete'],
  patterns: ['/api/lists/index'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_list_index_request).body),
      ...getShape(getShape(_delete_list_index_request).path),
      ...getShape(getShape(_delete_list_index_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_list_index_response)),
    }),
    error: z.any().optional(),
  }),
};
const READLISTINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadListIndex',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Verify that \`.lists\` and \`.items\` data streams exist.`,
  methods: ['get'],
  patterns: ['/api/lists/index'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_list_index_request).body),
      ...getShape(getShape(_read_list_index_request).path),
      ...getShape(getShape(_read_list_index_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_list_index_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATELISTINDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateListIndex',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create \`.lists\` and \`.items\` data streams in the relevant space.`,
  methods: ['post'],
  patterns: ['/api/lists/index'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_list_index_request).body),
      ...getShape(getShape(_create_list_index_request).path),
      ...getShape(getShape(_create_list_index_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_list_index_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETELISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteListItem',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a value list item using its \`id\`, or its \`list_id\` and \`value\` fields.`,
  methods: ['delete'],
  patterns: ['/api/lists/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'list_id', 'value', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_list_item_request).body),
      ...getShape(getShape(_delete_list_item_request).path),
      ...getShape(getShape(_delete_list_item_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_list_item_response)),
    }),
    error: z.any().optional(),
  }),
};
const READLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadListItem',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a value list item.`,
  methods: ['get'],
  patterns: ['/api/lists/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['id', 'list_id', 'value'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_list_item_request).body),
      ...getShape(getShape(_read_list_item_request).path),
      ...getShape(getShape(_read_list_item_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_list_item_response)),
    }),
    error: z.any().optional(),
  }),
};
const PATCHLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PatchListItem',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update specific fields of an existing value list item using the item \`id\`.`,
  methods: ['patch'],
  patterns: ['/api/lists/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_patch_list_item_request).body),
      ...getShape(getShape(_patch_list_item_request).path),
      ...getShape(getShape(_patch_list_item_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_patch_list_item_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATELISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateListItem',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a value list item and associate it with the specified value list.

All value list items in the same list must be the same type. For example, each list item in an \`ip\` list must define a specific IP address.
> info
> Before creating a list item, you must create a list.
`,
  methods: ['post'],
  patterns: ['/api/lists/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_list_item_request).body),
      ...getShape(getShape(_create_list_item_request).path),
      ...getShape(getShape(_create_list_item_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_list_item_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATELISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateListItem',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a value list item using the list item ID. The original list item is replaced, and all unspecified fields are deleted.
> info
> You cannot modify the \`id\` value.
`,
  methods: ['put'],
  patterns: ['/api/lists/items'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_update_list_item_request).body),
      ...getShape(getShape(_update_list_item_request).path),
      ...getShape(getShape(_update_list_item_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_update_list_item_response)),
    }),
    error: z.any().optional(),
  }),
};
const EXPORTLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ExportListItems',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items/_export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Export list item values from the specified value list.`,
  methods: ['post'],
  patterns: ['/api/lists/items/_export'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['list_id'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_export_list_items_request).body),
      ...getShape(getShape(_export_list_items_request).path),
      ...getShape(getShape(_export_list_items_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_export_list_items_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindListItems',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get all value list items in the specified list.`,
  methods: ['get'],
  patterns: ['/api/lists/items/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['list_id', 'page', 'per_page', 'sort_field', 'sort_order', 'cursor', 'filter'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_find_list_items_request).body),
      ...getShape(getShape(_find_list_items_request).path),
      ...getShape(getShape(_find_list_items_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_find_list_items_response)),
    }),
    error: z.any().optional(),
  }),
};
const IMPORTLISTITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ImportListItems',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items/_import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Import value list items from a TXT or CSV file. The maximum file size is 9 million bytes.

You can import items to a new or existing list.
`,
  methods: ['post'],
  patterns: ['/api/lists/items/_import'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['list_id', 'type', 'serializer', 'deserializer', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_import_list_items_request).body),
      ...getShape(getShape(_import_list_items_request).path),
      ...getShape(getShape(_import_list_items_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_import_list_items_response)),
    }),
    error: z.any().optional(),
  }),
};
const READLISTPRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadListPrivileges',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/privileges</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/lists/privileges'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_list_privileges_request).body),
      ...getShape(getShape(_read_list_privileges_request).path),
      ...getShape(getShape(_read_list_privileges_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_list_privileges_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_LOGSTASH_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_logstash_pipeline',
  description: `Delete a centrally-managed Logstash pipeline.
If your Elasticsearch cluster is protected with basic authentication, you must have either the \`logstash_admin\` built-in role or a customized Logstash writer role.
`,
  methods: ['delete'],
  patterns: ['/api/logstash/pipeline/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_logstash_pipeline_request).body),
      ...getShape(getShape(delete_logstash_pipeline_request).path),
      ...getShape(getShape(delete_logstash_pipeline_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_logstash_pipeline_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_LOGSTASH_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_logstash_pipeline',
  description: `Get information for a centrally-managed Logstash pipeline.
To use this API, you must have either the \`logstash_admin\` built-in role or a customized Logstash reader role.
`,
  methods: ['get'],
  patterns: ['/api/logstash/pipeline/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_logstash_pipeline_request).body),
      ...getShape(getShape(get_logstash_pipeline_request).path),
      ...getShape(getShape(get_logstash_pipeline_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_logstash_pipeline_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_LOGSTASH_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_logstash_pipeline',
  description: `Create a centrally-managed Logstash pipeline or update a pipeline.
To use this API, you must have either the \`logstash_admin\` built-in role or a customized Logstash writer role.
`,
  methods: ['put'],
  patterns: ['/api/logstash/pipeline/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_logstash_pipeline_request).body),
      ...getShape(getShape(put_logstash_pipeline_request).path),
      ...getShape(getShape(put_logstash_pipeline_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_logstash_pipeline_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_LOGSTASH_PIPELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_logstash_pipelines',
  description: `Get a list of all centrally-managed Logstash pipelines.

To use this API, you must have either the \`logstash_admin\` built-in role or a customized Logstash reader role.
> info
> Limit the number of pipelines to 10,000 or fewer. As the number of pipelines nears and surpasses 10,000, you may see performance issues on Kibana.

The \`username\` property appears in the response when security is enabled and depends on when the pipeline was created or last updated.
`,
  methods: ['get'],
  patterns: ['/api/logstash/pipelines'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_logstash_pipelines_request).body),
      ...getShape(getShape(get_logstash_pipelines_request).path),
      ...getShape(getShape(get_logstash_pipelines_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_logstash_pipelines_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_MAINTENANCE_WINDOW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_maintenance_window',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['post'],
  patterns: ['/api/maintenance_window'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_maintenance_window_request).body),
      ...getShape(getShape(post_maintenance_window_request).path),
      ...getShape(getShape(post_maintenance_window_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_maintenance_window_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_MAINTENANCE_WINDOW_FIND_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_maintenance_window_find',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: read-maintenance-window.`,
  methods: ['get'],
  patterns: ['/api/maintenance_window/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['title', 'created_by', 'status', 'page', 'per_page'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_maintenance_window_find_request).body),
      ...getShape(getShape(get_maintenance_window_find_request).path),
      ...getShape(getShape(get_maintenance_window_find_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_maintenance_window_find_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_MAINTENANCE_WINDOW_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_maintenance_window_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['delete'],
  patterns: ['/api/maintenance_window/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_maintenance_window_id_request).body),
      ...getShape(getShape(delete_maintenance_window_id_request).path),
      ...getShape(getShape(delete_maintenance_window_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_maintenance_window_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_MAINTENANCE_WINDOW_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_maintenance_window_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: read-maintenance-window.`,
  methods: ['get'],
  patterns: ['/api/maintenance_window/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_maintenance_window_id_request).body),
      ...getShape(getShape(get_maintenance_window_id_request).path),
      ...getShape(getShape(get_maintenance_window_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_maintenance_window_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const PATCH_MAINTENANCE_WINDOW_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.patch_maintenance_window_id',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['patch'],
  patterns: ['/api/maintenance_window/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(patch_maintenance_window_id_request).body),
      ...getShape(getShape(patch_maintenance_window_id_request).path),
      ...getShape(getShape(patch_maintenance_window_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(patch_maintenance_window_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_MAINTENANCE_WINDOW_ID_ARCHIVE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_maintenance_window_id_archive',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}/_archive</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['post'],
  patterns: ['/api/maintenance_window/{id}/_archive'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_maintenance_window_id_archive_request).body),
      ...getShape(getShape(post_maintenance_window_id_archive_request).path),
      ...getShape(getShape(post_maintenance_window_id_archive_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_maintenance_window_id_archive_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_MAINTENANCE_WINDOW_ID_UNARCHIVE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_maintenance_window_id_unarchive',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}/_unarchive</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['post'],
  patterns: ['/api/maintenance_window/{id}/_unarchive'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_maintenance_window_id_unarchive_request).body),
      ...getShape(getShape(post_maintenance_window_id_unarchive_request).path),
      ...getShape(getShape(post_maintenance_window_id_unarchive_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_maintenance_window_id_unarchive_response)),
    }),
    error: z.any().optional(),
  }),
};
const MLSYNC_CONTRACT: InternalConnectorContract = {
  type: 'kibana.mlSync',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/ml/saved_objects/sync</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Synchronizes Kibana saved objects for machine learning jobs and trained models in the default space. You must have \`all\` privileges for the **Machine Learning** feature in the **Analytics** section of the Kibana feature privileges. This API runs automatically when you start Kibana and periodically thereafter.
`,
  methods: ['get'],
  patterns: ['/api/ml/saved_objects/sync'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(ml_sync_request).body),
      ...getShape(getShape(ml_sync_request).path),
      ...getShape(getShape(ml_sync_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(ml_sync_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETENOTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteNote',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/note</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a note from a Timeline using the note ID.`,
  methods: ['delete'],
  patterns: ['/api/note'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_note_request).body),
      ...getShape(getShape(_delete_note_request).path),
      ...getShape(getShape(_delete_note_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_note_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETNOTES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetNotes',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/note</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get all notes for a given document.`,
  methods: ['get'],
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
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_get_notes_request).body),
      ...getShape(getShape(_get_notes_request).path),
      ...getShape(getShape(_get_notes_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_get_notes_response)),
    }),
    error: z.any().optional(),
  }),
};
const PERSISTNOTEROUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PersistNoteRoute',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/note</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Add a note to a Timeline or update an existing note.`,
  methods: ['patch'],
  patterns: ['/api/note'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_persist_note_route_request).body),
      ...getShape(getShape(_persist_note_route_request).path),
      ...getShape(getShape(_persist_note_route_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_persist_note_route_response)),
    }),
    error: z.any().optional(),
  }),
};
const OBSERVABILITY_AI_ASSISTANT_CHAT_COMPLETE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.observability_ai_assistant_chat_complete',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/observability_ai_assistant/chat/complete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new chat completion by using the Observability AI Assistant. 

The API returns the model's response based on the current conversation context. 

It also handles any tool requests within the conversation, which may trigger multiple calls to the underlying large language model (LLM). 

This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.
`,
  methods: ['post'],
  patterns: ['/api/observability_ai_assistant/chat/complete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(observability_ai_assistant_chat_complete_request).body),
      ...getShape(getShape(observability_ai_assistant_chat_complete_request).path),
      ...getShape(getShape(observability_ai_assistant_chat_complete_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(observability_ai_assistant_chat_complete_response)),
    }),
    error: z.any().optional(),
  }),
};
const OSQUERYFINDLIVEQUERIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryFindLiveQueries',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/live_queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all live queries.`,
  methods: ['get'],
  patterns: ['/api/osquery/live_queries'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['kuery', 'page', 'pageSize', 'sort', 'sortOrder'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_osquery_find_live_queries_request).body),
      ...getShape(getShape(_osquery_find_live_queries_request).path),
      ...getShape(getShape(_osquery_find_live_queries_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_osquery_find_live_queries_response)),
    }),
    error: z.any().optional(),
  }),
};
const OSQUERYCREATELIVEQUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryCreateLiveQuery',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/live_queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create and run a live query.`,
  methods: ['post'],
  patterns: ['/api/osquery/live_queries'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_osquery_create_live_query_request).body),
      ...getShape(getShape(_osquery_create_live_query_request).path),
      ...getShape(getShape(_osquery_create_live_query_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_osquery_create_live_query_response)),
    }),
    error: z.any().optional(),
  }),
};
const OSQUERYGETLIVEQUERYDETAILS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryGetLiveQueryDetails',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/live_queries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a live query using the query ID.`,
  methods: ['get'],
  patterns: ['/api/osquery/live_queries/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_osquery_get_live_query_details_request).body),
      ...getShape(getShape(_osquery_get_live_query_details_request).path),
      ...getShape(getShape(_osquery_get_live_query_details_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_osquery_get_live_query_details_response)),
    }),
    error: z.any().optional(),
  }),
};
const OSQUERYGETLIVEQUERYRESULTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryGetLiveQueryResults',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/live_queries/{id}/results/{actionId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the results of a live query using the query action ID.`,
  methods: ['get'],
  patterns: ['/api/osquery/live_queries/{id}/results/{actionId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id', 'actionId'],
    urlParams: ['kuery', 'page', 'pageSize', 'sort', 'sortOrder'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_osquery_get_live_query_results_request).body),
      ...getShape(getShape(_osquery_get_live_query_results_request).path),
      ...getShape(getShape(_osquery_get_live_query_results_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_osquery_get_live_query_results_response)),
    }),
    error: z.any().optional(),
  }),
};
const OSQUERYFINDPACKS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryFindPacks',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/packs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all query packs.`,
  methods: ['get'],
  patterns: ['/api/osquery/packs'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'pageSize', 'sort', 'sortOrder'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_osquery_find_packs_request).body),
      ...getShape(getShape(_osquery_find_packs_request).path),
      ...getShape(getShape(_osquery_find_packs_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_osquery_find_packs_response)),
    }),
    error: z.any().optional(),
  }),
};
const OSQUERYCREATEPACKS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryCreatePacks',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/packs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a query pack.`,
  methods: ['post'],
  patterns: ['/api/osquery/packs'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_osquery_create_packs_request).body),
      ...getShape(getShape(_osquery_create_packs_request).path),
      ...getShape(getShape(_osquery_create_packs_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_osquery_create_packs_response)),
    }),
    error: z.any().optional(),
  }),
};
const OSQUERYDELETEPACKS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryDeletePacks',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/packs/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a query pack using the pack ID.`,
  methods: ['delete'],
  patterns: ['/api/osquery/packs/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_osquery_delete_packs_request).body),
      ...getShape(getShape(_osquery_delete_packs_request).path),
      ...getShape(getShape(_osquery_delete_packs_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_osquery_delete_packs_response)),
    }),
    error: z.any().optional(),
  }),
};
const OSQUERYGETPACKSDETAILS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryGetPacksDetails',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/packs/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a query pack using the pack ID.`,
  methods: ['get'],
  patterns: ['/api/osquery/packs/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_osquery_get_packs_details_request).body),
      ...getShape(getShape(_osquery_get_packs_details_request).path),
      ...getShape(getShape(_osquery_get_packs_details_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_osquery_get_packs_details_response)),
    }),
    error: z.any().optional(),
  }),
};
const OSQUERYUPDATEPACKS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryUpdatePacks',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/packs/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a query pack using the pack ID.
> info
> You cannot update a prebuilt pack.
`,
  methods: ['put'],
  patterns: ['/api/osquery/packs/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_osquery_update_packs_request).body),
      ...getShape(getShape(_osquery_update_packs_request).path),
      ...getShape(getShape(_osquery_update_packs_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_osquery_update_packs_response)),
    }),
    error: z.any().optional(),
  }),
};
const OSQUERYFINDSAVEDQUERIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryFindSavedQueries',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/saved_queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all saved queries.`,
  methods: ['get'],
  patterns: ['/api/osquery/saved_queries'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['page', 'pageSize', 'sort', 'sortOrder'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_osquery_find_saved_queries_request).body),
      ...getShape(getShape(_osquery_find_saved_queries_request).path),
      ...getShape(getShape(_osquery_find_saved_queries_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_osquery_find_saved_queries_response)),
    }),
    error: z.any().optional(),
  }),
};
const OSQUERYCREATESAVEDQUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryCreateSavedQuery',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/saved_queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create and run a saved query.`,
  methods: ['post'],
  patterns: ['/api/osquery/saved_queries'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_osquery_create_saved_query_request).body),
      ...getShape(getShape(_osquery_create_saved_query_request).path),
      ...getShape(getShape(_osquery_create_saved_query_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_osquery_create_saved_query_response)),
    }),
    error: z.any().optional(),
  }),
};
const OSQUERYDELETESAVEDQUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryDeleteSavedQuery',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/saved_queries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a saved query using the query ID.`,
  methods: ['delete'],
  patterns: ['/api/osquery/saved_queries/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_osquery_delete_saved_query_request).body),
      ...getShape(getShape(_osquery_delete_saved_query_request).path),
      ...getShape(getShape(_osquery_delete_saved_query_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_osquery_delete_saved_query_response)),
    }),
    error: z.any().optional(),
  }),
};
const OSQUERYGETSAVEDQUERYDETAILS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryGetSavedQueryDetails',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/saved_queries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of a saved query using the query ID.`,
  methods: ['get'],
  patterns: ['/api/osquery/saved_queries/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_osquery_get_saved_query_details_request).body),
      ...getShape(getShape(_osquery_get_saved_query_details_request).path),
      ...getShape(getShape(_osquery_get_saved_query_details_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_osquery_get_saved_query_details_response)),
    }),
    error: z.any().optional(),
  }),
};
const OSQUERYUPDATESAVEDQUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryUpdateSavedQuery',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/saved_queries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a saved query using the query ID.
> info
> You cannot update a prebuilt saved query.
`,
  methods: ['put'],
  patterns: ['/api/osquery/saved_queries/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_osquery_update_saved_query_request).body),
      ...getShape(getShape(_osquery_update_saved_query_request).path),
      ...getShape(getShape(_osquery_update_saved_query_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_osquery_update_saved_query_response)),
    }),
    error: z.any().optional(),
  }),
};
const PERSISTPINNEDEVENTROUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PersistPinnedEventRoute',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/pinned_event</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Pin/unpin an event to/from an existing Timeline.`,
  methods: ['patch'],
  patterns: ['/api/pinned_event'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_persist_pinned_event_route_request).body),
      ...getShape(getShape(_persist_pinned_event_route_request).path),
      ...getShape(getShape(_persist_pinned_event_route_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_persist_pinned_event_route_response)),
    }),
    error: z.any().optional(),
  }),
};
const CLEANUPRISKENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CleanUpRiskEngine',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/risk_score/engine/dangerously_delete_data</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Cleaning up the the Risk Engine by removing the indices, mapping and transforms`,
  methods: ['delete'],
  patterns: ['/api/risk_score/engine/dangerously_delete_data'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_clean_up_risk_engine_request).body),
      ...getShape(getShape(_clean_up_risk_engine_request).path),
      ...getShape(getShape(_clean_up_risk_engine_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_clean_up_risk_engine_response)),
    }),
    error: z.any().optional(),
  }),
};
const CONFIGURERISKENGINESAVEDOBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ConfigureRiskEngineSavedObject',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/risk_score/engine/saved_object/configure</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Configuring the Risk Engine Saved Object`,
  methods: ['patch'],
  patterns: ['/api/risk_score/engine/saved_object/configure'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_configure_risk_engine_saved_object_request).body),
      ...getShape(getShape(_configure_risk_engine_saved_object_request).path),
      ...getShape(getShape(_configure_risk_engine_saved_object_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_configure_risk_engine_saved_object_response)),
    }),
    error: z.any().optional(),
  }),
};
const SCHEDULERISKENGINENOW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ScheduleRiskEngineNow',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/risk_score/engine/schedule_now</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Schedule the risk scoring engine to run as soon as possible. You can use this to recalculate entity risk scores after updating their asset criticality.`,
  methods: ['post'],
  patterns: ['/api/risk_score/engine/schedule_now'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_schedule_risk_engine_now_request).body),
      ...getShape(getShape(_schedule_risk_engine_now_request).path),
      ...getShape(getShape(_schedule_risk_engine_now_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_schedule_risk_engine_now_response)),
    }),
    error: z.any().optional(),
  }),
};
const BULKCREATESAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkCreateSavedObjects',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_create</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/saved_objects/_bulk_create'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['overwrite'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(bulk_create_saved_objects_request).body),
      ...getShape(getShape(bulk_create_saved_objects_request).path),
      ...getShape(getShape(bulk_create_saved_objects_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(bulk_create_saved_objects_response)),
    }),
    error: z.any().optional(),
  }),
};
const BULKDELETESAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkDeleteSavedObjects',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: When you delete a saved object, it cannot be recovered.
`,
  methods: ['post'],
  patterns: ['/api/saved_objects/_bulk_delete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(bulk_delete_saved_objects_request).body),
      ...getShape(getShape(bulk_delete_saved_objects_request).path),
      ...getShape(getShape(bulk_delete_saved_objects_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(bulk_delete_saved_objects_response)),
    }),
    error: z.any().optional(),
  }),
};
const BULKGETSAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkGetSavedObjects',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_get</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/saved_objects/_bulk_get'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(bulk_get_saved_objects_request).body),
      ...getShape(getShape(bulk_get_saved_objects_request).path),
      ...getShape(getShape(bulk_get_saved_objects_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(bulk_get_saved_objects_response)),
    }),
    error: z.any().optional(),
  }),
};
const BULKRESOLVESAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkResolveSavedObjects',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_resolve</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve multiple Kibana saved objects by identifier using any legacy URL aliases if they exist. Under certain circumstances when Kibana is upgraded, saved object migrations may necessitate regenerating some object IDs to enable new features. When an object's ID is regenerated, a legacy URL alias is created for that object, preserving its old ID. In such a scenario, that object can be retrieved by the bulk resolve API using either its new ID or its old ID.
`,
  methods: ['post'],
  patterns: ['/api/saved_objects/_bulk_resolve'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(bulk_resolve_saved_objects_request).body),
      ...getShape(getShape(bulk_resolve_saved_objects_request).path),
      ...getShape(getShape(bulk_resolve_saved_objects_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(bulk_resolve_saved_objects_response)),
    }),
    error: z.any().optional(),
  }),
};
const BULKUPDATESAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkUpdateSavedObjects',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_update</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update the attributes for multiple Kibana saved objects.`,
  methods: ['post'],
  patterns: ['/api/saved_objects/_bulk_update'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(bulk_update_saved_objects_request).body),
      ...getShape(getShape(bulk_update_saved_objects_request).path),
      ...getShape(getShape(bulk_update_saved_objects_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(bulk_update_saved_objects_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_SAVED_OBJECTS_EXPORT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_saved_objects_export',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve sets of saved objects that you want to import into Kibana. You must include \`type\` or \`objects\` in the request body. The output of exporting saved objects must be treated as opaque. Tampering with exported data risks introducing unspecified errors and data loss.

Exported saved objects are not backwards compatible and cannot be imported into an older version of Kibana.

NOTE: The \`savedObjects.maxImportExportSize\` configuration setting limits the number of saved objects which may be exported.`,
  methods: ['post'],
  patterns: ['/api/saved_objects/_export'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_saved_objects_export_request).body),
      ...getShape(getShape(post_saved_objects_export_request).path),
      ...getShape(getShape(post_saved_objects_export_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_saved_objects_export_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDSAVEDOBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findSavedObjects',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a paginated set of Kibana saved objects.`,
  methods: ['get'],
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
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(find_saved_objects_request).body),
      ...getShape(getShape(find_saved_objects_request).path),
      ...getShape(getShape(find_saved_objects_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(find_saved_objects_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_SAVED_OBJECTS_IMPORT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_saved_objects_import',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create sets of Kibana saved objects from a file created by the export API. Saved objects can only be imported into the same version, a newer minor on the same major, or the next major. Tampering with exported data risks introducing unspecified errors and data loss.

Exported saved objects are not backwards compatible and cannot be imported into an older version of Kibana.`,
  methods: ['post'],
  patterns: ['/api/saved_objects/_import'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['overwrite', 'createNewCopies', 'compatibilityMode'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_saved_objects_import_request).body),
      ...getShape(getShape(post_saved_objects_import_request).path),
      ...getShape(getShape(post_saved_objects_import_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_saved_objects_import_response)),
    }),
    error: z.any().optional(),
  }),
};
const RESOLVEIMPORTERRORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.resolveImportErrors',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_resolve_import_errors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

To resolve errors from the Import objects API, you can:

* Retry certain saved objects
* Overwrite specific saved objects
* Change references to different saved objects
`,
  methods: ['post'],
  patterns: ['/api/saved_objects/_resolve_import_errors'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['compatibilityMode', 'createNewCopies'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(resolve_import_errors_request).body),
      ...getShape(getShape(resolve_import_errors_request).path),
      ...getShape(getShape(resolve_import_errors_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(resolve_import_errors_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATESAVEDOBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createSavedObject',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/{type}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a Kibana saved object with a randomly generated identifier.`,
  methods: ['post'],
  patterns: ['/api/saved_objects/{type}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['overwrite'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(create_saved_object_request).body),
      ...getShape(getShape(create_saved_object_request).path),
      ...getShape(getShape(create_saved_object_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(create_saved_object_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETSAVEDOBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getSavedObject',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/{type}/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a single Kibana saved object by identifier.`,
  methods: ['get'],
  patterns: ['/api/saved_objects/{type}/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_saved_object_request).body),
      ...getShape(getShape(get_saved_object_request).path),
      ...getShape(getShape(get_saved_object_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_saved_object_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATESAVEDOBJECTID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createSavedObjectId',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/{type}/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a Kibana saved object and specify its identifier instead of using a randomly generated ID.`,
  methods: ['post'],
  patterns: ['/api/saved_objects/{type}/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['overwrite'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(create_saved_object_id_request).body),
      ...getShape(getShape(create_saved_object_id_request).path),
      ...getShape(getShape(create_saved_object_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(create_saved_object_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATESAVEDOBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateSavedObject',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/{type}/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update the attributes for Kibana saved objects.`,
  methods: ['put'],
  patterns: ['/api/saved_objects/{type}/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(update_saved_object_request).body),
      ...getShape(getShape(update_saved_object_request).path),
      ...getShape(getShape(update_saved_object_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(update_saved_object_response)),
    }),
    error: z.any().optional(),
  }),
};
const RESOLVESAVEDOBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.resolveSavedObject',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/resolve/{type}/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a single Kibana saved object by identifier using any legacy URL alias if it exists. Under certain circumstances, when Kibana is upgraded, saved object migrations may necessitate regenerating some object IDs to enable new features. When an object's ID is regenerated, a legacy URL alias is created for that object, preserving its old ID. In such a scenario, that object can be retrieved using either its new ID or its old ID.
`,
  methods: ['get'],
  patterns: ['/api/saved_objects/resolve/{type}/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(resolve_saved_object_request).body),
      ...getShape(getShape(resolve_saved_object_request).path),
      ...getShape(getShape(resolve_saved_object_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(resolve_saved_object_response)),
    }),
    error: z.any().optional(),
  }),
};
const PERFORMANONYMIZATIONFIELDSBULKACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PerformAnonymizationFieldsBulkAction',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/anonymization_fields/_bulk_action</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Apply a bulk action to multiple anonymization fields. The bulk action is applied to all anonymization fields that match the filter or to the list of anonymization fields by their IDs.`,
  methods: ['post'],
  patterns: ['/api/security_ai_assistant/anonymization_fields/_bulk_action'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_perform_anonymization_fields_bulk_action_request).body),
      ...getShape(getShape(_perform_anonymization_fields_bulk_action_request).path),
      ...getShape(getShape(_perform_anonymization_fields_bulk_action_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_perform_anonymization_fields_bulk_action_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDANONYMIZATIONFIELDS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindAnonymizationFields',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/anonymization_fields/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all anonymization fields.`,
  methods: ['get'],
  patterns: ['/api/security_ai_assistant/anonymization_fields/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['fields', 'filter', 'sort_field', 'sort_order', 'page', 'per_page', 'all_data'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_find_anonymization_fields_request).body),
      ...getShape(getShape(_find_anonymization_fields_request).path),
      ...getShape(getShape(_find_anonymization_fields_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_find_anonymization_fields_response)),
    }),
    error: z.any().optional(),
  }),
};
const CHATCOMPLETE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ChatComplete',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/chat/complete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a model response for the given chat conversation.`,
  methods: ['post'],
  patterns: ['/api/security_ai_assistant/chat/complete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['content_references_disabled'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_chat_complete_request).body),
      ...getShape(getShape(_chat_complete_request).path),
      ...getShape(getShape(_chat_complete_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_chat_complete_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETEALLCONVERSATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteAllConversations',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

This endpoint allows users to permanently delete all conversations.`,
  methods: ['delete'],
  patterns: ['/api/security_ai_assistant/current_user/conversations'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_all_conversations_request).body),
      ...getShape(getShape(_delete_all_conversations_request).path),
      ...getShape(getShape(_delete_all_conversations_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_all_conversations_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATECONVERSATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateConversation',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new Security AI Assistant conversation. This endpoint allows the user to initiate a conversation with the Security AI Assistant by providing the required parameters.`,
  methods: ['post'],
  patterns: ['/api/security_ai_assistant/current_user/conversations'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_conversation_request).body),
      ...getShape(getShape(_create_conversation_request).path),
      ...getShape(getShape(_create_conversation_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_conversation_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDCONVERSATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindConversations',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all conversations for the current user. This endpoint allows users to search, filter, sort, and paginate through their conversations.`,
  methods: ['get'],
  patterns: ['/api/security_ai_assistant/current_user/conversations/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['fields', 'filter', 'sort_field', 'sort_order', 'page', 'per_page', 'is_owner'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_find_conversations_request).body),
      ...getShape(getShape(_find_conversations_request).path),
      ...getShape(getShape(_find_conversations_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_find_conversations_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETECONVERSATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteConversation',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete an existing conversation using the conversation ID. This endpoint allows users to permanently delete a conversation.`,
  methods: ['delete'],
  patterns: ['/api/security_ai_assistant/current_user/conversations/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_conversation_request).body),
      ...getShape(getShape(_delete_conversation_request).path),
      ...getShape(getShape(_delete_conversation_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_conversation_response)),
    }),
    error: z.any().optional(),
  }),
};
const READCONVERSATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadConversation',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an existing conversation using the conversation ID. This allows users to fetch the specific conversation data by its unique ID.`,
  methods: ['get'],
  patterns: ['/api/security_ai_assistant/current_user/conversations/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_conversation_request).body),
      ...getShape(getShape(_read_conversation_request).path),
      ...getShape(getShape(_read_conversation_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_conversation_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATECONVERSATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateConversation',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing conversation using the conversation ID. This endpoint allows users to modify the details of an existing conversation.`,
  methods: ['put'],
  patterns: ['/api/security_ai_assistant/current_user/conversations/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_update_conversation_request).body),
      ...getShape(getShape(_update_conversation_request).path),
      ...getShape(getShape(_update_conversation_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_update_conversation_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETKNOWLEDGEBASE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetKnowledgeBase',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Read a single KB`,
  methods: ['get'],
  patterns: ['/api/security_ai_assistant/knowledge_base'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_get_knowledge_base_request).body),
      ...getShape(getShape(_get_knowledge_base_request).path),
      ...getShape(getShape(_get_knowledge_base_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_get_knowledge_base_response)),
    }),
    error: z.any().optional(),
  }),
};
const POSTKNOWLEDGEBASE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PostKnowledgeBase',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['post'],
  patterns: ['/api/security_ai_assistant/knowledge_base'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['modelId', 'ignoreSecurityLabs'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_post_knowledge_base_request).body),
      ...getShape(getShape(_post_knowledge_base_request).path),
      ...getShape(getShape(_post_knowledge_base_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_post_knowledge_base_response)),
    }),
    error: z.any().optional(),
  }),
};
const READKNOWLEDGEBASE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadKnowledgeBase',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/{resource}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Read a knowledge base with a specific resource identifier.`,
  methods: ['get'],
  patterns: ['/api/security_ai_assistant/knowledge_base/{resource}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['resource'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_knowledge_base_request).body),
      ...getShape(getShape(_read_knowledge_base_request).path),
      ...getShape(getShape(_read_knowledge_base_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_knowledge_base_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEKNOWLEDGEBASE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateKnowledgeBase',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/{resource}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a knowledge base with a specific resource identifier.`,
  methods: ['post'],
  patterns: ['/api/security_ai_assistant/knowledge_base/{resource}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['resource'],
    urlParams: ['modelId', 'ignoreSecurityLabs'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_knowledge_base_request).body),
      ...getShape(getShape(_create_knowledge_base_request).path),
      ...getShape(getShape(_create_knowledge_base_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_knowledge_base_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATEKNOWLEDGEBASEENTRY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateKnowledgeBaseEntry',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a Knowledge Base Entry`,
  methods: ['post'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_knowledge_base_entry_request).body),
      ...getShape(getShape(_create_knowledge_base_entry_request).path),
      ...getShape(getShape(_create_knowledge_base_entry_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_knowledge_base_entry_response)),
    }),
    error: z.any().optional(),
  }),
};
const PERFORMKNOWLEDGEBASEENTRYBULKACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PerformKnowledgeBaseEntryBulkAction',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/_bulk_action</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

The bulk action is applied to all Knowledge Base Entries that match the filter or to the list of Knowledge Base Entries by their IDs.`,
  methods: ['post'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/_bulk_action'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_perform_knowledge_base_entry_bulk_action_request).body),
      ...getShape(getShape(_perform_knowledge_base_entry_bulk_action_request).path),
      ...getShape(getShape(_perform_knowledge_base_entry_bulk_action_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_perform_knowledge_base_entry_bulk_action_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDKNOWLEDGEBASEENTRIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindKnowledgeBaseEntries',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Finds Knowledge Base Entries that match the given query.`,
  methods: ['get'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['fields', 'filter', 'sort_field', 'sort_order', 'page', 'per_page'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_find_knowledge_base_entries_request).body),
      ...getShape(getShape(_find_knowledge_base_entries_request).path),
      ...getShape(getShape(_find_knowledge_base_entries_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_find_knowledge_base_entries_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETEKNOWLEDGEBASEENTRY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteKnowledgeBaseEntry',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a Knowledge Base Entry by its unique \`id\`.`,
  methods: ['delete'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_knowledge_base_entry_request).body),
      ...getShape(getShape(_delete_knowledge_base_entry_request).path),
      ...getShape(getShape(_delete_knowledge_base_entry_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_knowledge_base_entry_response)),
    }),
    error: z.any().optional(),
  }),
};
const READKNOWLEDGEBASEENTRY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadKnowledgeBaseEntry',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a Knowledge Base Entry by its unique \`id\`.`,
  methods: ['get'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_read_knowledge_base_entry_request).body),
      ...getShape(getShape(_read_knowledge_base_entry_request).path),
      ...getShape(getShape(_read_knowledge_base_entry_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_read_knowledge_base_entry_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATEKNOWLEDGEBASEENTRY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateKnowledgeBaseEntry',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing Knowledge Base Entry by its unique \`id\`.`,
  methods: ['put'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_update_knowledge_base_entry_request).body),
      ...getShape(getShape(_update_knowledge_base_entry_request).path),
      ...getShape(getShape(_update_knowledge_base_entry_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_update_knowledge_base_entry_response)),
    }),
    error: z.any().optional(),
  }),
};
const PERFORMPROMPTSBULKACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PerformPromptsBulkAction',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/prompts/_bulk_action</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Apply a bulk action to multiple prompts. The bulk action is applied to all prompts that match the filter or to the list of prompts by their IDs. This action allows for bulk create, update, or delete operations.`,
  methods: ['post'],
  patterns: ['/api/security_ai_assistant/prompts/_bulk_action'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_perform_prompts_bulk_action_request).body),
      ...getShape(getShape(_perform_prompts_bulk_action_request).path),
      ...getShape(getShape(_perform_prompts_bulk_action_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_perform_prompts_bulk_action_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDPROMPTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindPrompts',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/prompts/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all prompts based on optional filters, sorting, and pagination.`,
  methods: ['get'],
  patterns: ['/api/security_ai_assistant/prompts/_find'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['fields', 'filter', 'sort_field', 'sort_order', 'page', 'per_page'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_find_prompts_request).body),
      ...getShape(getShape(_find_prompts_request).path),
      ...getShape(getShape(_find_prompts_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_find_prompts_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_SECURITY_ROLE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_security_role',
  description: ``,
  methods: ['get'],
  patterns: ['/api/security/role'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['replaceDeprecatedPrivileges'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_security_role_request).body),
      ...getShape(getShape(get_security_role_request).path),
      ...getShape(getShape(get_security_role_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_security_role_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_SECURITY_ROLE_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_security_role_query',
  description: ``,
  methods: ['post'],
  patterns: ['/api/security/role/_query'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_security_role_query_request).body),
      ...getShape(getShape(post_security_role_query_request).path),
      ...getShape(getShape(post_security_role_query_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_security_role_query_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_SECURITY_ROLE_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_security_role_name',
  description: ``,
  methods: ['delete'],
  patterns: ['/api/security/role/{name}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_security_role_name_request).body),
      ...getShape(getShape(delete_security_role_name_request).path),
      ...getShape(getShape(delete_security_role_name_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_security_role_name_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_SECURITY_ROLE_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_security_role_name',
  description: ``,
  methods: ['get'],
  patterns: ['/api/security/role/{name}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['replaceDeprecatedPrivileges'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_security_role_name_request).body),
      ...getShape(getShape(get_security_role_name_request).path),
      ...getShape(getShape(get_security_role_name_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_security_role_name_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_SECURITY_ROLE_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_security_role_name',
  description: `Create a new Kibana role or update the attributes of an existing role. Kibana roles are stored in the Elasticsearch native realm.`,
  methods: ['put'],
  patterns: ['/api/security/role/{name}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['createOnly'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_security_role_name_request).body),
      ...getShape(getShape(put_security_role_name_request).path),
      ...getShape(getShape(put_security_role_name_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_security_role_name_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_SECURITY_ROLES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_security_roles',
  description: ``,
  methods: ['post'],
  patterns: ['/api/security/roles'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_security_roles_request).body),
      ...getShape(getShape(post_security_roles_request).path),
      ...getShape(getShape(post_security_roles_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_security_roles_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_SECURITY_SESSION_INVALIDATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_security_session_invalidate',
  description: `Invalidate user sessions that match a query. To use this API, you must be a superuser.
`,
  methods: ['post'],
  patterns: ['/api/security/session/_invalidate'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_security_session_invalidate_request).body),
      ...getShape(getShape(post_security_session_invalidate_request).path),
      ...getShape(getShape(post_security_session_invalidate_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_security_session_invalidate_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_URL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_url',
  description: `Kibana URLs may be long and cumbersome, short URLs are much easier to remember and share.
Short URLs are created by specifying the locator ID and locator parameters. When a short URL is resolved, the locator ID and locator parameters are used to redirect user to the right Kibana page.
`,
  methods: ['post'],
  patterns: ['/api/short_url'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_url_request).body),
      ...getShape(getShape(post_url_request).path),
      ...getShape(getShape(post_url_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_url_response)),
    }),
    error: z.any().optional(),
  }),
};
const RESOLVE_URL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.resolve_url',
  description: `Resolve a Kibana short URL by its slug.
`,
  methods: ['get'],
  patterns: ['/api/short_url/_slug/{slug}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['slug'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(resolve_url_request).body),
      ...getShape(getShape(resolve_url_request).path),
      ...getShape(getShape(resolve_url_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(resolve_url_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_URL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_url',
  description: `Delete a Kibana short URL.
`,
  methods: ['delete'],
  patterns: ['/api/short_url/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_url_request).body),
      ...getShape(getShape(delete_url_request).path),
      ...getShape(getShape(delete_url_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_url_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_URL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_url',
  description: `Get a single Kibana short URL.
`,
  methods: ['get'],
  patterns: ['/api/short_url/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_url_request).body),
      ...getShape(getShape(get_url_request).path),
      ...getShape(getShape(get_url_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_url_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_SPACES_COPY_SAVED_OBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_copy_saved_objects',
  description: `It also allows you to automatically copy related objects, so when you copy a dashboard, this can automatically copy over the associated visualizations, data views, and saved Discover sessions, as required. You can request to overwrite any objects that already exist in the target space if they share an identifier or you can use the resolve copy saved objects conflicts API to do this on a per-object basis.<br/><br/>[Required authorization] Route required privileges: copySavedObjectsToSpaces.`,
  methods: ['post'],
  patterns: ['/api/spaces/_copy_saved_objects'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_spaces_copy_saved_objects_request).body),
      ...getShape(getShape(post_spaces_copy_saved_objects_request).path),
      ...getShape(getShape(post_spaces_copy_saved_objects_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_spaces_copy_saved_objects_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_SPACES_DISABLE_LEGACY_URL_ALIASES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_disable_legacy_url_aliases',
  description: ``,
  methods: ['post'],
  patterns: ['/api/spaces/_disable_legacy_url_aliases'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_spaces_disable_legacy_url_aliases_request).body),
      ...getShape(getShape(post_spaces_disable_legacy_url_aliases_request).path),
      ...getShape(getShape(post_spaces_disable_legacy_url_aliases_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_spaces_disable_legacy_url_aliases_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_SPACES_GET_SHAREABLE_REFERENCES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_get_shareable_references',
  description: `Collect references and space contexts for saved objects.`,
  methods: ['post'],
  patterns: ['/api/spaces/_get_shareable_references'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_spaces_get_shareable_references_request).body),
      ...getShape(getShape(post_spaces_get_shareable_references_request).path),
      ...getShape(getShape(post_spaces_get_shareable_references_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_spaces_get_shareable_references_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_SPACES_RESOLVE_COPY_SAVED_OBJECTS_ERRORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_resolve_copy_saved_objects_errors',
  description: `Overwrite saved objects that are returned as errors from the copy saved objects to space API.<br/><br/>[Required authorization] Route required privileges: copySavedObjectsToSpaces.`,
  methods: ['post'],
  patterns: ['/api/spaces/_resolve_copy_saved_objects_errors'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_spaces_resolve_copy_saved_objects_errors_request).body),
      ...getShape(getShape(post_spaces_resolve_copy_saved_objects_errors_request).path),
      ...getShape(getShape(post_spaces_resolve_copy_saved_objects_errors_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_spaces_resolve_copy_saved_objects_errors_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_SPACES_UPDATE_OBJECTS_SPACES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_update_objects_spaces',
  description: `Update one or more saved objects to add or remove them from some spaces.`,
  methods: ['post'],
  patterns: ['/api/spaces/_update_objects_spaces'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_spaces_update_objects_spaces_request).body),
      ...getShape(getShape(post_spaces_update_objects_spaces_request).path),
      ...getShape(getShape(post_spaces_update_objects_spaces_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_spaces_update_objects_spaces_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_SPACES_SPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_spaces_space',
  description: ``,
  methods: ['get'],
  patterns: ['/api/spaces/space'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['purpose', 'include_authorized_purposes'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_spaces_space_request).body),
      ...getShape(getShape(get_spaces_space_request).path),
      ...getShape(getShape(get_spaces_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_spaces_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_SPACES_SPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_space',
  description: ``,
  methods: ['post'],
  patterns: ['/api/spaces/space'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_spaces_space_request).body),
      ...getShape(getShape(post_spaces_space_request).path),
      ...getShape(getShape(post_spaces_space_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_spaces_space_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_SPACES_SPACE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_spaces_space_id',
  description: `When you delete a space, all saved objects that belong to the space are automatically deleted, which is permanent and cannot be undone.`,
  methods: ['delete'],
  patterns: ['/api/spaces/space/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_spaces_space_id_request).body),
      ...getShape(getShape(delete_spaces_space_id_request).path),
      ...getShape(getShape(delete_spaces_space_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_spaces_space_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_SPACES_SPACE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_spaces_space_id',
  description: ``,
  methods: ['get'],
  patterns: ['/api/spaces/space/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_spaces_space_id_request).body),
      ...getShape(getShape(get_spaces_space_id_request).path),
      ...getShape(getShape(get_spaces_space_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_spaces_space_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_SPACES_SPACE_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_spaces_space_id',
  description: ``,
  methods: ['put'],
  patterns: ['/api/spaces/space/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_spaces_space_id_request).body),
      ...getShape(getShape(put_spaces_space_id_request).path),
      ...getShape(getShape(put_spaces_space_id_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_spaces_space_id_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_status',
  description: ``,
  methods: ['get'],
  patterns: ['/api/status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['v7format', 'v8format'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_status_request).body),
      ...getShape(getShape(get_status_request).path),
      ...getShape(getShape(get_status_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_status_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_STREAMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches list of all streams<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['get'],
  patterns: ['/api/streams'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_streams_request).body),
      ...getShape(getShape(get_streams_request).path),
      ...getShape(getShape(get_streams_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_streams_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_STREAMS_DISABLE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_disable',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/_disable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Disables wired streams and deletes all existing stream definitions. The data of wired streams is deleted, but the data of classic streams is preserved.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['post'],
  patterns: ['/api/streams/_disable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_streams_disable_request).body),
      ...getShape(getShape(post_streams_disable_request).path),
      ...getShape(getShape(post_streams_disable_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_streams_disable_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_STREAMS_ENABLE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_enable',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/_enable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Enables wired streams<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['post'],
  patterns: ['/api/streams/_enable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_streams_enable_request).body),
      ...getShape(getShape(post_streams_enable_request).path),
      ...getShape(getShape(post_streams_enable_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_streams_enable_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_STREAMS_RESYNC_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_resync',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/_resync</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Resyncs all streams, making sure that Elasticsearch assets are up to date<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['post'],
  patterns: ['/api/streams/_resync'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_streams_resync_request).body),
      ...getShape(getShape(post_streams_resync_request).path),
      ...getShape(getShape(post_streams_resync_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_streams_resync_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_STREAMS_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_streams_name',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Deletes a stream definition and the underlying data stream<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['delete'],
  patterns: ['/api/streams/{name}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_streams_name_request).body),
      ...getShape(getShape(delete_streams_name_request).path),
      ...getShape(getShape(delete_streams_name_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_streams_name_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_STREAMS_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches a stream definition and associated dashboards<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['get'],
  patterns: ['/api/streams/{name}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_streams_name_request).body),
      ...getShape(getShape(get_streams_name_request).path),
      ...getShape(getShape(get_streams_name_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_streams_name_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_STREAMS_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Creates or updates a stream definition. Classic streams can not be created through this API, only updated<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['put'],
  patterns: ['/api/streams/{name}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_streams_name_request).body),
      ...getShape(getShape(put_streams_name_request).path),
      ...getShape(getShape(put_streams_name_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_streams_name_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_STREAMS_NAME_FORK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_fork',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/_fork</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Forks a wired stream and creates a child stream<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['post'],
  patterns: ['/api/streams/{name}/_fork'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_streams_name_fork_request).body),
      ...getShape(getShape(post_streams_name_fork_request).path),
      ...getShape(getShape(post_streams_name_fork_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_streams_name_fork_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_STREAMS_NAME_GROUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_group',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/_group</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches the group settings of a group stream definition<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['get'],
  patterns: ['/api/streams/{name}/_group'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_streams_name_group_request).body),
      ...getShape(getShape(get_streams_name_group_request).path),
      ...getShape(getShape(get_streams_name_group_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_streams_name_group_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_STREAMS_NAME_GROUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_group',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/_group</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upserts the group settings of a group stream definition<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['put'],
  patterns: ['/api/streams/{name}/_group'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_streams_name_group_request).body),
      ...getShape(getShape(put_streams_name_group_request).path),
      ...getShape(getShape(put_streams_name_group_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_streams_name_group_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_STREAMS_NAME_INGEST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_ingest',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/_ingest</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches the ingest settings of an ingest stream definition<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['get'],
  patterns: ['/api/streams/{name}/_ingest'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_streams_name_ingest_request).body),
      ...getShape(getShape(get_streams_name_ingest_request).path),
      ...getShape(getShape(get_streams_name_ingest_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_streams_name_ingest_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_STREAMS_NAME_INGEST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_ingest',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/_ingest</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upserts the ingest settings of an ingest stream definition<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['put'],
  patterns: ['/api/streams/{name}/_ingest'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_streams_name_ingest_request).body),
      ...getShape(getShape(put_streams_name_ingest_request).path),
      ...getShape(getShape(put_streams_name_ingest_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_streams_name_ingest_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_STREAMS_NAME_CONTENT_EXPORT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_content_export',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/content/export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Exports the content associated to a stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['post'],
  patterns: ['/api/streams/{name}/content/export'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_streams_name_content_export_request).body),
      ...getShape(getShape(post_streams_name_content_export_request).path),
      ...getShape(getShape(post_streams_name_content_export_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_streams_name_content_export_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_STREAMS_NAME_CONTENT_IMPORT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_content_import',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/content/import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Links content objects to a stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['post'],
  patterns: ['/api/streams/{name}/content/import'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_streams_name_content_import_request).body),
      ...getShape(getShape(post_streams_name_content_import_request).path),
      ...getShape(getShape(post_streams_name_content_import_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_streams_name_content_import_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_STREAMS_NAME_DASHBOARDS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_dashboards',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/dashboards</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches all dashboards linked to a stream that are visible to the current user in the current space.<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['get'],
  patterns: ['/api/streams/{name}/dashboards'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_streams_name_dashboards_request).body),
      ...getShape(getShape(get_streams_name_dashboards_request).path),
      ...getShape(getShape(get_streams_name_dashboards_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_streams_name_dashboards_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_STREAMS_NAME_DASHBOARDS_BULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_dashboards_bulk',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/dashboards/_bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Bulk update dashboards linked to a stream. Can link new dashboards and delete existing ones.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['post'],
  patterns: ['/api/streams/{name}/dashboards/_bulk'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_streams_name_dashboards_bulk_request).body),
      ...getShape(getShape(post_streams_name_dashboards_bulk_request).path),
      ...getShape(getShape(post_streams_name_dashboards_bulk_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_streams_name_dashboards_bulk_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_STREAMS_NAME_DASHBOARDS_DASHBOARDID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_streams_name_dashboards_dashboardid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/dashboards/{dashboardId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Unlinks a dashboard from a stream. Noop if the dashboard is not linked to the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['delete'],
  patterns: ['/api/streams/{name}/dashboards/{dashboardId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name', 'dashboardId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_streams_name_dashboards_dashboardid_request).body),
      ...getShape(getShape(delete_streams_name_dashboards_dashboardid_request).path),
      ...getShape(getShape(delete_streams_name_dashboards_dashboardid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_streams_name_dashboards_dashboardid_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_STREAMS_NAME_DASHBOARDS_DASHBOARDID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_dashboards_dashboardid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/dashboards/{dashboardId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Links a dashboard to a stream. Noop if the dashboard is already linked to the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['put'],
  patterns: ['/api/streams/{name}/dashboards/{dashboardId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name', 'dashboardId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_streams_name_dashboards_dashboardid_request).body),
      ...getShape(getShape(put_streams_name_dashboards_dashboardid_request).path),
      ...getShape(getShape(put_streams_name_dashboards_dashboardid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_streams_name_dashboards_dashboardid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_STREAMS_NAME_QUERIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_queries',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches all queries linked to a stream that are visible to the current user in the current space.<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['get'],
  patterns: ['/api/streams/{name}/queries'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_streams_name_queries_request).body),
      ...getShape(getShape(get_streams_name_queries_request).path),
      ...getShape(getShape(get_streams_name_queries_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_streams_name_queries_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_STREAMS_NAME_QUERIES_BULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_queries_bulk',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/queries/_bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Bulk update queries of a stream. Can add new queries and delete existing ones.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['post'],
  patterns: ['/api/streams/{name}/queries/_bulk'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_streams_name_queries_bulk_request).body),
      ...getShape(getShape(post_streams_name_queries_bulk_request).path),
      ...getShape(getShape(post_streams_name_queries_bulk_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_streams_name_queries_bulk_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_STREAMS_NAME_QUERIES_QUERYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_streams_name_queries_queryid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/queries/{queryId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Remove a query from a stream. Noop if the query is not found on the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['delete'],
  patterns: ['/api/streams/{name}/queries/{queryId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name', 'queryId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_streams_name_queries_queryid_request).body),
      ...getShape(getShape(delete_streams_name_queries_queryid_request).path),
      ...getShape(getShape(delete_streams_name_queries_queryid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_streams_name_queries_queryid_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_STREAMS_NAME_QUERIES_QUERYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_queries_queryid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/queries/{queryId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Adds a query to a stream. Noop if the query is already present on the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['put'],
  patterns: ['/api/streams/{name}/queries/{queryId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name', 'queryId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_streams_name_queries_queryid_request).body),
      ...getShape(getShape(put_streams_name_queries_queryid_request).path),
      ...getShape(getShape(put_streams_name_queries_queryid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_streams_name_queries_queryid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_STREAMS_NAME_RULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_rules',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/rules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Fetches all rules linked to a stream that are visible to the current user in the current space.<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['get'],
  patterns: ['/api/streams/{name}/rules'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_streams_name_rules_request).body),
      ...getShape(getShape(get_streams_name_rules_request).path),
      ...getShape(getShape(get_streams_name_rules_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_streams_name_rules_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_STREAMS_NAME_RULES_RULEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_streams_name_rules_ruleid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/rules/{ruleId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Unlinks a rule from a stream. Noop if the rule is not linked to the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['delete'],
  patterns: ['/api/streams/{name}/rules/{ruleId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name', 'ruleId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_streams_name_rules_ruleid_request).body),
      ...getShape(getShape(delete_streams_name_rules_ruleid_request).path),
      ...getShape(getShape(delete_streams_name_rules_ruleid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_streams_name_rules_ruleid_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_STREAMS_NAME_RULES_RULEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_rules_ruleid',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/rules/{ruleId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Links a rule to a stream. Noop if the rule is already linked to the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['put'],
  patterns: ['/api/streams/{name}/rules/{ruleId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name', 'ruleId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_streams_name_rules_ruleid_request).body),
      ...getShape(getShape(put_streams_name_rules_ruleid_request).path),
      ...getShape(getShape(put_streams_name_rules_ruleid_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_streams_name_rules_ruleid_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_STREAMS_NAME_SIGNIFICANT_EVENTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_streams_name_significant_events',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/significant_events</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Read the significant events<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['get'],
  patterns: ['/api/streams/{name}/significant_events'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['from', 'to', 'bucketSize'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_streams_name_significant_events_request).body),
      ...getShape(getShape(get_streams_name_significant_events_request).path),
      ...getShape(getShape(get_streams_name_significant_events_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_streams_name_significant_events_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_STREAMS_NAME_SIGNIFICANT_EVENTS_GENERATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_significant_events_generate',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/significant_events/_generate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Generate significant events queries based on the stream data<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['post'],
  patterns: ['/api/streams/{name}/significant_events/_generate'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['connectorId', 'currentDate', 'from', 'to'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_streams_name_significant_events_generate_request).body),
      ...getShape(getShape(post_streams_name_significant_events_generate_request).path),
      ...getShape(getShape(post_streams_name_significant_events_generate_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_streams_name_significant_events_generate_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_STREAMS_NAME_SIGNIFICANT_EVENTS_PREVIEW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_significant_events_preview',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/significant_events/_preview</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Preview significant event results based on a given query<br/><br/>[Required authorization] Route required privileges: read_stream.`,
  methods: ['post'],
  patterns: ['/api/streams/{name}/significant_events/_preview'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['name'],
    urlParams: ['from', 'to', 'bucketSize'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_streams_name_significant_events_preview_request).body),
      ...getShape(getShape(post_streams_name_significant_events_preview_request).path),
      ...getShape(getShape(post_streams_name_significant_events_preview_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_streams_name_significant_events_preview_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_SYNTHETICS_MONITOR_TEST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_synthetics_monitor_test',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitor/test/{monitorId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Trigger an immediate test execution for the specified monitor. The response includes the generated \`testRunId\`. If the test encounters issues in one or more service locations, an \`errors\` array is also returned with details about the failures.
`,
  methods: ['post'],
  patterns: ['/api/synthetics/monitor/test/{monitorId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['monitorId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_synthetics_monitor_test_request).body),
      ...getShape(getShape(post_synthetics_monitor_test_request).path),
      ...getShape(getShape(post_synthetics_monitor_test_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_synthetics_monitor_test_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_SYNTHETIC_MONITORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_synthetic_monitors',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of monitors.
You must have \`read\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['get'],
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
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_synthetic_monitors_request).body),
      ...getShape(getShape(get_synthetic_monitors_request).path),
      ...getShape(getShape(get_synthetic_monitors_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_synthetic_monitors_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_SYNTHETIC_MONITORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_synthetic_monitors',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new monitor with the specified attributes. A monitor can be one of the following types: HTTP, TCP, ICMP, or Browser. The required and default fields may vary based on the monitor type.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['post'],
  patterns: ['/api/synthetics/monitors'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_synthetic_monitors_request).body),
      ...getShape(getShape(post_synthetic_monitors_request).path),
      ...getShape(getShape(post_synthetic_monitors_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_synthetic_monitors_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_SYNTHETIC_MONITORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_synthetic_monitors',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors/_bulk_delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete multiple monitors by sending a list of config IDs.
`,
  methods: ['post'],
  patterns: ['/api/synthetics/monitors/_bulk_delete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_synthetic_monitors_request).body),
      ...getShape(getShape(delete_synthetic_monitors_request).path),
      ...getShape(getShape(delete_synthetic_monitors_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_synthetic_monitors_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_SYNTHETIC_MONITOR_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_synthetic_monitor',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a monitor from the Synthetics app.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['delete'],
  patterns: ['/api/synthetics/monitors/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_synthetic_monitor_request).body),
      ...getShape(getShape(delete_synthetic_monitor_request).path),
      ...getShape(getShape(delete_synthetic_monitor_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_synthetic_monitor_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_SYNTHETIC_MONITOR_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_synthetic_monitor',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/synthetics/monitors/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_synthetic_monitor_request).body),
      ...getShape(getShape(get_synthetic_monitor_request).path),
      ...getShape(getShape(get_synthetic_monitor_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_synthetic_monitor_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_SYNTHETIC_MONITOR_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_synthetic_monitor',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a monitor with the specified attributes. The required and default fields may vary based on the monitor type.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
You can also partially update a monitor. This will only update the fields that are specified in the request body. All other fields are left unchanged. The specified fields should conform to the monitor type. For example, you can't update the \`inline_scipt\` field of a HTTP monitor.
`,
  methods: ['put'],
  patterns: ['/api/synthetics/monitors/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_synthetic_monitor_request).body),
      ...getShape(getShape(put_synthetic_monitor_request).path),
      ...getShape(getShape(put_synthetic_monitor_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_synthetic_monitor_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_PARAMETERS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_parameters',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all parameters. You must have \`read\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['get'],
  patterns: ['/api/synthetics/params'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_parameters_request).body),
      ...getShape(getShape(get_parameters_request).path),
      ...getShape(getShape(get_parameters_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_parameters_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_PARAMETERS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_parameters',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Add one or more parameters to the Synthetics app.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['post'],
  patterns: ['/api/synthetics/params'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_parameters_request).body),
      ...getShape(getShape(post_parameters_request).path),
      ...getShape(getShape(post_parameters_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_parameters_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_PARAMETERS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_parameters',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params/_bulk_delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete parameters from the Synthetics app.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['delete'],
  patterns: ['/api/synthetics/params/_bulk_delete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_parameters_request).body),
      ...getShape(getShape(delete_parameters_request).path),
      ...getShape(getShape(delete_parameters_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_parameters_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_PARAMETER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_parameter',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a parameter from the Synthetics app.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['delete'],
  patterns: ['/api/synthetics/params/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_parameter_request).body),
      ...getShape(getShape(delete_parameter_request).path),
      ...getShape(getShape(delete_parameter_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_parameter_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_PARAMETER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_parameter',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a parameter from the Synthetics app.
You must have \`read\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['get'],
  patterns: ['/api/synthetics/params/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_parameter_request).body),
      ...getShape(getShape(get_parameter_request).path),
      ...getShape(getShape(get_parameter_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_parameter_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_PARAMETER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_parameter',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a parameter in the Synthetics app.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['put'],
  patterns: ['/api/synthetics/params/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_parameter_request).body),
      ...getShape(getShape(put_parameter_request).path),
      ...getShape(getShape(put_parameter_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_parameter_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_PRIVATE_LOCATIONS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_private_locations',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/private_locations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of private locations.
You must have \`read\` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['get'],
  patterns: ['/api/synthetics/private_locations'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_private_locations_request).body),
      ...getShape(getShape(get_private_locations_request).path),
      ...getShape(getShape(get_private_locations_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_private_locations_response)),
    }),
    error: z.any().optional(),
  }),
};
const POST_PRIVATE_LOCATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_private_location',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/private_locations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.`,
  methods: ['post'],
  patterns: ['/api/synthetics/private_locations'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(post_private_location_request).body),
      ...getShape(getShape(post_private_location_request).path),
      ...getShape(getShape(post_private_location_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(post_private_location_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETE_PRIVATE_LOCATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_private_location',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/private_locations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.
The API does not return a response body for deletion, but it will return an appropriate status code upon successful deletion.
A location cannot be deleted if it has associated monitors in use. You must delete all monitors associated with the location before deleting the location.
`,
  methods: ['delete'],
  patterns: ['/api/synthetics/private_locations/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_private_location_request).body),
      ...getShape(getShape(delete_private_location_request).path),
      ...getShape(getShape(delete_private_location_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_private_location_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_PRIVATE_LOCATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_private_location',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/private_locations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['get'],
  patterns: ['/api/synthetics/private_locations/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_private_location_request).body),
      ...getShape(getShape(get_private_location_request).path),
      ...getShape(getShape(get_private_location_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_private_location_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_PRIVATE_LOCATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_private_location',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/private_locations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing private location's label.
You must have \`all\` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.
When a private location's label is updated, all monitors using this location will also be updated to maintain data consistency.
`,
  methods: ['put'],
  patterns: ['/api/synthetics/private_locations/{id}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_private_location_request).body),
      ...getShape(getShape(put_private_location_request).path),
      ...getShape(getShape(put_private_location_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_private_location_response)),
    }),
    error: z.any().optional(),
  }),
};
const TASK_MANAGER_HEALTH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.task_manager_health',
  description: `Get the health status of the Kibana task manager.
`,
  methods: ['get'],
  patterns: ['/api/task_manager/_health'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(task_manager_health_request).body),
      ...getShape(getShape(task_manager_health_request).path),
      ...getShape(getShape(task_manager_health_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(task_manager_health_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETETIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteTimelines',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete one or more Timelines or Timeline templates.`,
  methods: ['delete'],
  patterns: ['/api/timeline'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_delete_timelines_request).body),
      ...getShape(getShape(_delete_timelines_request).path),
      ...getShape(getShape(_delete_timelines_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_delete_timelines_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETTIMELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetTimeline',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an existing saved Timeline or Timeline template.`,
  methods: ['get'],
  patterns: ['/api/timeline'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['template_timeline_id', 'id'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_get_timeline_request).body),
      ...getShape(getShape(_get_timeline_request).path),
      ...getShape(getShape(_get_timeline_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_get_timeline_response)),
    }),
    error: z.any().optional(),
  }),
};
const PATCHTIMELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PatchTimeline',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing Timeline. You can update the title, description, date range, pinned events, pinned queries, and/or pinned saved queries of an existing Timeline.`,
  methods: ['patch'],
  patterns: ['/api/timeline'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_patch_timeline_request).body),
      ...getShape(getShape(_patch_timeline_request).path),
      ...getShape(getShape(_patch_timeline_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_patch_timeline_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATETIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateTimelines',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new Timeline or Timeline template.`,
  methods: ['post'],
  patterns: ['/api/timeline'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_create_timelines_request).body),
      ...getShape(getShape(_create_timelines_request).path),
      ...getShape(getShape(_create_timelines_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_create_timelines_response)),
    }),
    error: z.any().optional(),
  }),
};
const COPYTIMELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CopyTimeline',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_copy</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Copies and returns a timeline or timeline template.
`,
  methods: ['get'],
  patterns: ['/api/timeline/_copy'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_copy_timeline_request).body),
      ...getShape(getShape(_copy_timeline_request).path),
      ...getShape(getShape(_copy_timeline_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_copy_timeline_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETDRAFTTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetDraftTimelines',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_draft</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of the draft Timeline  or Timeline template for the current user. If the user doesn't have a draft Timeline, an empty Timeline is returned.`,
  methods: ['get'],
  patterns: ['/api/timeline/_draft'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['timelineType'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_get_draft_timelines_request).body),
      ...getShape(getShape(_get_draft_timelines_request).path),
      ...getShape(getShape(_get_draft_timelines_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_get_draft_timelines_response)),
    }),
    error: z.any().optional(),
  }),
};
const CLEANDRAFTTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CleanDraftTimelines',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_draft</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a clean draft Timeline or Timeline template for the current user.
> info
> If the user already has a draft Timeline, the existing draft Timeline is cleared and returned.
`,
  methods: ['post'],
  patterns: ['/api/timeline/_draft'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_clean_draft_timelines_request).body),
      ...getShape(getShape(_clean_draft_timelines_request).path),
      ...getShape(getShape(_clean_draft_timelines_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_clean_draft_timelines_response)),
    }),
    error: z.any().optional(),
  }),
};
const EXPORTTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ExportTimelines',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Export Timelines as an NDJSON file.`,
  methods: ['post'],
  patterns: ['/api/timeline/_export'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['file_name'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_export_timelines_request).body),
      ...getShape(getShape(_export_timelines_request).path),
      ...getShape(getShape(_export_timelines_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_export_timelines_response)),
    }),
    error: z.any().optional(),
  }),
};
const PERSISTFAVORITEROUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PersistFavoriteRoute',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_favorite</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Favorite a Timeline or Timeline template for the current user.`,
  methods: ['patch'],
  patterns: ['/api/timeline/_favorite'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_persist_favorite_route_request).body),
      ...getShape(getShape(_persist_favorite_route_request).path),
      ...getShape(getShape(_persist_favorite_route_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_persist_favorite_route_response)),
    }),
    error: z.any().optional(),
  }),
};
const IMPORTTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ImportTimelines',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Import Timelines.`,
  methods: ['post'],
  patterns: ['/api/timeline/_import'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_import_timelines_request).body),
      ...getShape(getShape(_import_timelines_request).path),
      ...getShape(getShape(_import_timelines_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_import_timelines_response)),
    }),
    error: z.any().optional(),
  }),
};
const INSTALLPREPACKEDTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InstallPrepackedTimelines',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_prepackaged</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Install or update prepackaged Timelines.`,
  methods: ['post'],
  patterns: ['/api/timeline/_prepackaged'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_install_prepacked_timelines_request).body),
      ...getShape(getShape(_install_prepacked_timelines_request).path),
      ...getShape(getShape(_install_prepacked_timelines_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_install_prepacked_timelines_response)),
    }),
    error: z.any().optional(),
  }),
};
const RESOLVETIMELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ResolveTimeline',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/resolve</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['get'],
  patterns: ['/api/timeline/resolve'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['template_timeline_id', 'id'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_resolve_timeline_request).body),
      ...getShape(getShape(_resolve_timeline_request).path),
      ...getShape(getShape(_resolve_timeline_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_resolve_timeline_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETTIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetTimelines',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timelines</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all saved Timelines or Timeline templates.`,
  methods: ['get'],
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
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(_get_timelines_request).body),
      ...getShape(getShape(_get_timelines_request).path),
      ...getShape(getShape(_get_timelines_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(_get_timelines_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_UPGRADE_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_upgrade_status',
  description: `Check the status of your cluster.`,
  methods: ['get'],
  patterns: ['/api/upgrade_assistant/status'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_upgrade_status_request).body),
      ...getShape(getShape(get_upgrade_status_request).path),
      ...getShape(getShape(get_upgrade_status_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_upgrade_status_response)),
    }),
    error: z.any().optional(),
  }),
};
const GET_UPTIME_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_uptime_settings',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/uptime/settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the uptime feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['get'],
  patterns: ['/api/uptime/settings'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_uptime_settings_request).body),
      ...getShape(getShape(get_uptime_settings_request).path),
      ...getShape(getShape(get_uptime_settings_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_uptime_settings_response)),
    }),
    error: z.any().optional(),
  }),
};
const PUT_UPTIME_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_uptime_settings',
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/uptime/settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update uptime setting attributes like \`heartbeatIndices\`, \`certExpirationThreshold\`, \`certAgeThreshold\`, \`defaultConnectors\`, or \`defaultEmail\`. You must have \`all\` privileges for the uptime feature in the Observability section of the Kibana feature privileges. A partial update is supported, provided settings keys will be merged with existing settings.
`,
  methods: ['put'],
  patterns: ['/api/uptime/settings'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(put_uptime_settings_request).body),
      ...getShape(getShape(put_uptime_settings_request).path),
      ...getShape(getShape(put_uptime_settings_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(put_uptime_settings_response)),
    }),
    error: z.any().optional(),
  }),
};
const FINDSLOSOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findSlosOp',
  description: `You must have the \`read\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['get'],
  patterns: ['/s/{spaceId}/api/observability/slos'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
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
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(find_slos_op_request).body),
      ...getShape(getShape(find_slos_op_request).path),
      ...getShape(getShape(find_slos_op_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(find_slos_op_response)),
    }),
    error: z.any().optional(),
  }),
};
const CREATESLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createSloOp',
  description: `You must have \`all\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['post'],
  patterns: ['/s/{spaceId}/api/observability/slos'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(create_slo_op_request).body),
      ...getShape(getShape(create_slo_op_request).path),
      ...getShape(getShape(create_slo_op_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(create_slo_op_response)),
    }),
    error: z.any().optional(),
  }),
};
const BULKDELETEOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkDeleteOp',
  description: `Bulk delete SLO definitions and their associated summary and rollup data.  This endpoint initiates a bulk deletion operation for SLOs, which may take some time to complete.  The status of the operation can be checked using the \`GET /api/slo/_bulk_delete/{taskId}\` endpoint.
`,
  methods: ['post'],
  patterns: ['/s/{spaceId}/api/observability/slos/_bulk_delete'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(bulk_delete_op_request).body),
      ...getShape(getShape(bulk_delete_op_request).path),
      ...getShape(getShape(bulk_delete_op_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(bulk_delete_op_response)),
    }),
    error: z.any().optional(),
  }),
};
const BULKDELETESTATUSOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkDeleteStatusOp',
  description: `Retrieve the status of the bulk deletion operation for SLOs.  This endpoint returns the status of the bulk deletion operation, including whether it is completed and the results of the operation.
`,
  methods: ['get'],
  patterns: ['/s/{spaceId}/api/observability/slos/_bulk_delete/{taskId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: ['taskId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(bulk_delete_status_op_request).body),
      ...getShape(getShape(bulk_delete_status_op_request).path),
      ...getShape(getShape(bulk_delete_status_op_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(bulk_delete_status_op_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETEROLLUPDATAOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteRollupDataOp',
  description: `The deletion occurs for the specified list of \`sloId\`. You must have \`all\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['post'],
  patterns: ['/s/{spaceId}/api/observability/slos/_bulk_purge_rollup'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_rollup_data_op_request).body),
      ...getShape(getShape(delete_rollup_data_op_request).path),
      ...getShape(getShape(delete_rollup_data_op_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_rollup_data_op_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETESLOINSTANCESOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteSloInstancesOp',
  description: `The deletion occurs for the specified list of \`sloId\` and \`instanceId\`. You must have \`all\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['post'],
  patterns: ['/s/{spaceId}/api/observability/slos/_delete_instances'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_slo_instances_op_request).body),
      ...getShape(getShape(delete_slo_instances_op_request).path),
      ...getShape(getShape(delete_slo_instances_op_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_slo_instances_op_response)),
    }),
    error: z.any().optional(),
  }),
};
const DELETESLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteSloOp',
  description: `You must have the \`write\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['delete'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(delete_slo_op_request).body),
      ...getShape(getShape(delete_slo_op_request).path),
      ...getShape(getShape(delete_slo_op_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(delete_slo_op_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETSLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getSloOp',
  description: `You must have the \`read\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['get'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['instanceId'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_slo_op_request).body),
      ...getShape(getShape(get_slo_op_request).path),
      ...getShape(getShape(get_slo_op_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_slo_op_response)),
    }),
    error: z.any().optional(),
  }),
};
const UPDATESLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateSloOp',
  description: `You must have the \`write\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['put'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(update_slo_op_request).body),
      ...getShape(getShape(update_slo_op_request).path),
      ...getShape(getShape(update_slo_op_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(update_slo_op_response)),
    }),
    error: z.any().optional(),
  }),
};
const RESETSLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.resetSloOp',
  description: `You must have the \`write\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['post'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}/_reset'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(reset_slo_op_request).body),
      ...getShape(getShape(reset_slo_op_request).path),
      ...getShape(getShape(reset_slo_op_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(reset_slo_op_response)),
    }),
    error: z.any().optional(),
  }),
};
const DISABLESLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.disableSloOp',
  description: `You must have the \`write\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['post'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}/disable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(disable_slo_op_request).body),
      ...getShape(getShape(disable_slo_op_request).path),
      ...getShape(getShape(disable_slo_op_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(disable_slo_op_response)),
    }),
    error: z.any().optional(),
  }),
};
const ENABLESLOOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.enableSloOp',
  description: `You must have the \`write\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['post'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}/enable'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(enable_slo_op_request).body),
      ...getShape(getShape(enable_slo_op_request).path),
      ...getShape(getShape(enable_slo_op_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(enable_slo_op_response)),
    }),
    error: z.any().optional(),
  }),
};
const GETDEFINITIONSOP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getDefinitionsOp',
  description: `You must have the \`read\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['get'],
  patterns: ['/s/{spaceId}/internal/observability/slos/_definitions'],
  isInternal: true,
  documentation: 'URL_NOT_IMPLEMENTED',
  parameterTypes: {
    pathParams: [],
    urlParams: ['includeOutdatedOnly', 'includeHealth', 'tags', 'search', 'page', 'perPage'],
    bodyParams: [],
  },
  paramsSchema: z
    .looseObject({
      ...getShape(getShape(get_definitions_op_request).body),
      ...getShape(getShape(get_definitions_op_request).path),
      ...getShape(getShape(get_definitions_op_request).query),
    })
    .partial(),
  outputSchema: z.object({
    output: z.looseObject({
      ...getShape(getShape(get_definitions_op_response)),
    }),
    error: z.any().optional(),
  }),
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
  DELETE_AGENT_BUILDER_TOOLS_ID_CONTRACT,
  GET_AGENT_BUILDER_TOOLS_ID_CONTRACT,
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
