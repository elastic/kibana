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
 * This file contains Kibana connector definitions generated from Kibana OpenAPI specification.
 * Generated at: 2025-12-02T17:55:14.379Z
 * Source: /oas_docs/output/kibana.yaml (521 APIs)
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */
/* eslint-disable import/order */

import type { InternalConnectorContract } from '../../../types/latest';

// import contracts from individual files
import { GET_ACTIONS_CONNECTOR_TYPES_CONTRACT } from './kibana.get_actions_connector_types.gen';
import { DELETE_ACTIONS_CONNECTOR_ID_CONTRACT } from './kibana.delete_actions_connector_id.gen';
import { GET_ACTIONS_CONNECTOR_ID_CONTRACT } from './kibana.get_actions_connector_id.gen';
import { POST_ACTIONS_CONNECTOR_ID_CONTRACT } from './kibana.post_actions_connector_id.gen';
import { PUT_ACTIONS_CONNECTOR_ID_CONTRACT } from './kibana.put_actions_connector_id.gen';
import { POST_ACTIONS_CONNECTOR_ID_EXECUTE_CONTRACT } from './kibana.post_actions_connector_id_execute.gen';
import { GET_ACTIONS_CONNECTORS_CONTRACT } from './kibana.get_actions_connectors.gen';
import { POST_AGENT_BUILDER_A2A_AGENTID_CONTRACT } from './kibana.post_agent_builder_a2a_agentid.gen';
import { GET_AGENT_BUILDER_A2A_AGENTID_JSON_CONTRACT } from './kibana.get_agent_builder_a2a_agentid_json.gen';
import { GET_AGENT_BUILDER_AGENTS_CONTRACT } from './kibana.get_agent_builder_agents.gen';
import { POST_AGENT_BUILDER_AGENTS_CONTRACT } from './kibana.post_agent_builder_agents.gen';
import { DELETE_AGENT_BUILDER_AGENTS_ID_CONTRACT } from './kibana.delete_agent_builder_agents_id.gen';
import { GET_AGENT_BUILDER_AGENTS_ID_CONTRACT } from './kibana.get_agent_builder_agents_id.gen';
import { PUT_AGENT_BUILDER_AGENTS_ID_CONTRACT } from './kibana.put_agent_builder_agents_id.gen';
import { GET_AGENT_BUILDER_CONVERSATIONS_CONTRACT } from './kibana.get_agent_builder_conversations.gen';
import { DELETE_AGENT_BUILDER_CONVERSATIONS_CONVERSATION_ID_CONTRACT } from './kibana.delete_agent_builder_conversations_conversation_id.gen';
import { GET_AGENT_BUILDER_CONVERSATIONS_CONVERSATION_ID_CONTRACT } from './kibana.get_agent_builder_conversations_conversation_id.gen';
import { POST_AGENT_BUILDER_CONVERSE_CONTRACT } from './kibana.post_agent_builder_converse.gen';
import { POST_AGENT_BUILDER_CONVERSE_ASYNC_CONTRACT } from './kibana.post_agent_builder_converse_async.gen';
import { POST_AGENT_BUILDER_MCP_CONTRACT } from './kibana.post_agent_builder_mcp.gen';
import { GET_AGENT_BUILDER_TOOLS_CONTRACT } from './kibana.get_agent_builder_tools.gen';
import { POST_AGENT_BUILDER_TOOLS_CONTRACT } from './kibana.post_agent_builder_tools.gen';
import { POST_AGENT_BUILDER_TOOLS_EXECUTE_CONTRACT } from './kibana.post_agent_builder_tools_execute.gen';
import { DELETE_AGENT_BUILDER_TOOLS_TOOLID_CONTRACT } from './kibana.delete_agent_builder_tools_toolid.gen';
import { GET_AGENT_BUILDER_TOOLS_TOOLID_CONTRACT } from './kibana.get_agent_builder_tools_toolid.gen';
import { PUT_AGENT_BUILDER_TOOLS_TOOLID_CONTRACT } from './kibana.put_agent_builder_tools_toolid.gen';
import { GET_ALERTING_HEALTH_CONTRACT } from './kibana.get_alerting_health.gen';
import { GET_RULE_TYPES_CONTRACT } from './kibana.get_rule_types.gen';
import { DELETE_ALERTING_RULE_ID_CONTRACT } from './kibana.delete_alerting_rule_id.gen';
import { GET_ALERTING_RULE_ID_CONTRACT } from './kibana.get_alerting_rule_id.gen';
import { POST_ALERTING_RULE_ID_CONTRACT } from './kibana.post_alerting_rule_id.gen';
import { PUT_ALERTING_RULE_ID_CONTRACT } from './kibana.put_alerting_rule_id.gen';
import { POST_ALERTING_RULE_ID_DISABLE_CONTRACT } from './kibana.post_alerting_rule_id_disable.gen';
import { POST_ALERTING_RULE_ID_ENABLE_CONTRACT } from './kibana.post_alerting_rule_id_enable.gen';
import { POST_ALERTING_RULE_ID_MUTE_ALL_CONTRACT } from './kibana.post_alerting_rule_id_mute_all.gen';
import { POST_ALERTING_RULE_ID_UNMUTE_ALL_CONTRACT } from './kibana.post_alerting_rule_id_unmute_all.gen';
import { POST_ALERTING_RULE_ID_UPDATE_API_KEY_CONTRACT } from './kibana.post_alerting_rule_id_update_api_key.gen';
import { POST_ALERTING_RULE_ID_SNOOZE_SCHEDULE_CONTRACT } from './kibana.post_alerting_rule_id_snooze_schedule.gen';
import { POST_ALERTING_RULE_RULE_ID_ALERT_ALERT_ID_MUTE_CONTRACT } from './kibana.post_alerting_rule_rule_id_alert_alert_id_mute.gen';
import { POST_ALERTING_RULE_RULE_ID_ALERT_ALERT_ID_UNMUTE_CONTRACT } from './kibana.post_alerting_rule_rule_id_alert_alert_id_unmute.gen';
import { DELETE_ALERTING_RULE_RULEID_SNOOZE_SCHEDULE_SCHEDULEID_CONTRACT } from './kibana.delete_alerting_rule_ruleid_snooze_schedule_scheduleid.gen';
import { GET_ALERTING_RULES_FIND_CONTRACT } from './kibana.get_alerting_rules_find.gen';
import { CREATE_AGENT_KEY_CONTRACT } from './kibana.create_agent_key.gen';
import { SAVE_APM_SERVER_SCHEMA_CONTRACT } from './kibana.save_apm_server_schema.gen';
import { CREATE_ANNOTATION_CONTRACT } from './kibana.create_annotation.gen';
import { GET_ANNOTATION_CONTRACT } from './kibana.get_annotation.gen';
import { DELETE_AGENT_CONFIGURATION_CONTRACT } from './kibana.delete_agent_configuration.gen';
import { GET_AGENT_CONFIGURATIONS_CONTRACT } from './kibana.get_agent_configurations.gen';
import { CREATE_UPDATE_AGENT_CONFIGURATION_CONTRACT } from './kibana.create_update_agent_configuration.gen';
import { GET_AGENT_NAME_FOR_SERVICE_CONTRACT } from './kibana.get_agent_name_for_service.gen';
import { GET_ENVIRONMENTS_FOR_SERVICE_CONTRACT } from './kibana.get_environments_for_service.gen';
import { SEARCH_SINGLE_CONFIGURATION_CONTRACT } from './kibana.search_single_configuration.gen';
import { GET_SINGLE_AGENT_CONFIGURATION_CONTRACT } from './kibana.get_single_agent_configuration.gen';
import { GET_SOURCE_MAPS_CONTRACT } from './kibana.get_source_maps.gen';
import { UPLOAD_SOURCE_MAP_CONTRACT } from './kibana.upload_source_map.gen';
import { DELETE_SOURCE_MAP_CONTRACT } from './kibana.delete_source_map.gen';
import { DELETE_ASSET_CRITICALITY_RECORD_CONTRACT } from './kibana.delete_asset_criticality_record.gen';
import { GET_ASSET_CRITICALITY_RECORD_CONTRACT } from './kibana.get_asset_criticality_record.gen';
import { CREATE_ASSET_CRITICALITY_RECORD_CONTRACT } from './kibana.create_asset_criticality_record.gen';
import { BULK_UPSERT_ASSET_CRITICALITY_RECORDS_CONTRACT } from './kibana.bulk_upsert_asset_criticality_records.gen';
import { FIND_ASSET_CRITICALITY_RECORDS_CONTRACT } from './kibana.find_asset_criticality_records.gen';
import { POST_ATTACK_DISCOVERY_BULK_CONTRACT } from './kibana.post_attack_discovery_bulk.gen';
import { ATTACK_DISCOVERY_FIND_CONTRACT } from './kibana.attack_discovery_find.gen';
import { POST_ATTACK_DISCOVERY_GENERATE_CONTRACT } from './kibana.post_attack_discovery_generate.gen';
import { GET_ATTACK_DISCOVERY_GENERATIONS_CONTRACT } from './kibana.get_attack_discovery_generations.gen';
import { GET_ATTACK_DISCOVERY_GENERATION_CONTRACT } from './kibana.get_attack_discovery_generation.gen';
import { POST_ATTACK_DISCOVERY_GENERATIONS_DISMISS_CONTRACT } from './kibana.post_attack_discovery_generations_dismiss.gen';
import { CREATE_ATTACK_DISCOVERY_SCHEDULES_CONTRACT } from './kibana.create_attack_discovery_schedules.gen';
import { FIND_ATTACK_DISCOVERY_SCHEDULES_CONTRACT } from './kibana.find_attack_discovery_schedules.gen';
import { DELETE_ATTACK_DISCOVERY_SCHEDULES_CONTRACT } from './kibana.delete_attack_discovery_schedules.gen';
import { GET_ATTACK_DISCOVERY_SCHEDULES_CONTRACT } from './kibana.get_attack_discovery_schedules.gen';
import { UPDATE_ATTACK_DISCOVERY_SCHEDULES_CONTRACT } from './kibana.update_attack_discovery_schedules.gen';
import { DISABLE_ATTACK_DISCOVERY_SCHEDULES_CONTRACT } from './kibana.disable_attack_discovery_schedules.gen';
import { ENABLE_ATTACK_DISCOVERY_SCHEDULES_CONTRACT } from './kibana.enable_attack_discovery_schedules.gen';
import { DELETE_CASE_DEFAULT_SPACE_CONTRACT } from './kibana.delete_case_default_space.gen';
import { UPDATE_CASE_DEFAULT_SPACE_CONTRACT } from './kibana.update_case_default_space.gen';
import { CREATE_CASE_DEFAULT_SPACE_CONTRACT } from './kibana.create_case_default_space.gen';
import { FIND_CASES_DEFAULT_SPACE_CONTRACT } from './kibana.find_cases_default_space.gen';
import { GET_CASE_DEFAULT_SPACE_CONTRACT } from './kibana.get_case_default_space.gen';
import { GET_CASE_ALERTS_DEFAULT_SPACE_CONTRACT } from './kibana.get_case_alerts_default_space.gen';
import { DELETE_CASE_COMMENTS_DEFAULT_SPACE_CONTRACT } from './kibana.delete_case_comments_default_space.gen';
import { UPDATE_CASE_COMMENT_DEFAULT_SPACE_CONTRACT } from './kibana.update_case_comment_default_space.gen';
import { ADD_CASE_COMMENT_DEFAULT_SPACE_CONTRACT } from './kibana.add_case_comment_default_space.gen';
import { FIND_CASE_COMMENTS_DEFAULT_SPACE_CONTRACT } from './kibana.find_case_comments_default_space.gen';
import { DELETE_CASE_COMMENT_DEFAULT_SPACE_CONTRACT } from './kibana.delete_case_comment_default_space.gen';
import { GET_CASE_COMMENT_DEFAULT_SPACE_CONTRACT } from './kibana.get_case_comment_default_space.gen';
import { PUSH_CASE_DEFAULT_SPACE_CONTRACT } from './kibana.push_case_default_space.gen';
import { ADD_CASE_FILE_DEFAULT_SPACE_CONTRACT } from './kibana.add_case_file_default_space.gen';
import { FIND_CASE_ACTIVITY_DEFAULT_SPACE_CONTRACT } from './kibana.find_case_activity_default_space.gen';
import { GET_CASES_BY_ALERT_DEFAULT_SPACE_CONTRACT } from './kibana.get_cases_by_alert_default_space.gen';
import { GET_CASE_CONFIGURATION_DEFAULT_SPACE_CONTRACT } from './kibana.get_case_configuration_default_space.gen';
import { SET_CASE_CONFIGURATION_DEFAULT_SPACE_CONTRACT } from './kibana.set_case_configuration_default_space.gen';
import { UPDATE_CASE_CONFIGURATION_DEFAULT_SPACE_CONTRACT } from './kibana.update_case_configuration_default_space.gen';
import { FIND_CASE_CONNECTORS_DEFAULT_SPACE_CONTRACT } from './kibana.find_case_connectors_default_space.gen';
import { GET_CASE_REPORTERS_DEFAULT_SPACE_CONTRACT } from './kibana.get_case_reporters_default_space.gen';
import { GET_CASE_TAGS_DEFAULT_SPACE_CONTRACT } from './kibana.get_case_tags_default_space.gen';
import { GET_ALL_DATA_VIEWS_DEFAULT_CONTRACT } from './kibana.get_all_data_views_default.gen';
import { CREATE_DATA_VIEW_DEFAULTW_CONTRACT } from './kibana.create_data_view_defaultw.gen';
import { DELETE_DATA_VIEW_DEFAULT_CONTRACT } from './kibana.delete_data_view_default.gen';
import { GET_DATA_VIEW_DEFAULT_CONTRACT } from './kibana.get_data_view_default.gen';
import { UPDATE_DATA_VIEW_DEFAULT_CONTRACT } from './kibana.update_data_view_default.gen';
import { UPDATE_FIELDS_METADATA_DEFAULT_CONTRACT } from './kibana.update_fields_metadata_default.gen';
import { CREATE_RUNTIME_FIELD_DEFAULT_CONTRACT } from './kibana.create_runtime_field_default.gen';
import { CREATE_UPDATE_RUNTIME_FIELD_DEFAULT_CONTRACT } from './kibana.create_update_runtime_field_default.gen';
import { DELETE_RUNTIME_FIELD_DEFAULT_CONTRACT } from './kibana.delete_runtime_field_default.gen';
import { GET_RUNTIME_FIELD_DEFAULT_CONTRACT } from './kibana.get_runtime_field_default.gen';
import { UPDATE_RUNTIME_FIELD_DEFAULT_CONTRACT } from './kibana.update_runtime_field_default.gen';
import { GET_DEFAULT_DATA_VIEW_DEFAULT_CONTRACT } from './kibana.get_default_data_view_default.gen';
import { SET_DEFAULT_DATAIL_VIEW_DEFAULT_CONTRACT } from './kibana.set_default_datail_view_default.gen';
import { SWAP_DATA_VIEWS_DEFAULT_CONTRACT } from './kibana.swap_data_views_default.gen';
import { PREVIEW_SWAP_DATA_VIEWS_DEFAULT_CONTRACT } from './kibana.preview_swap_data_views_default.gen';
import { DELETE_ALERTS_INDEX_CONTRACT } from './kibana.delete_alerts_index.gen';
import { READ_ALERTS_INDEX_CONTRACT } from './kibana.read_alerts_index.gen';
import { CREATE_ALERTS_INDEX_CONTRACT } from './kibana.create_alerts_index.gen';
import { READ_PRIVILEGES_CONTRACT } from './kibana.read_privileges.gen';
import { DELETE_RULE_CONTRACT } from './kibana.delete_rule.gen';
import { READ_RULE_CONTRACT } from './kibana.read_rule.gen';
import { PATCH_RULE_CONTRACT } from './kibana.patch_rule.gen';
import { CREATE_RULE_CONTRACT } from './kibana.create_rule.gen';
import { UPDATE_RULE_CONTRACT } from './kibana.update_rule.gen';
import { PERFORM_RULES_BULK_ACTION_CONTRACT } from './kibana.perform_rules_bulk_action.gen';
import { EXPORT_RULES_CONTRACT } from './kibana.export_rules.gen';
import { FIND_RULES_CONTRACT } from './kibana.find_rules.gen';
import { IMPORT_RULES_CONTRACT } from './kibana.import_rules.gen';
import { CREATE_RULE_EXCEPTION_LIST_ITEMS_CONTRACT } from './kibana.create_rule_exception_list_items.gen';
import { INSTALL_PREBUILT_RULES_AND_TIMELINES_CONTRACT } from './kibana.install_prebuilt_rules_and_timelines.gen';
import { READ_PREBUILT_RULES_AND_TIMELINES_STATUS_CONTRACT } from './kibana.read_prebuilt_rules_and_timelines_status.gen';
import { RULE_PREVIEW_CONTRACT } from './kibana.rule_preview.gen';
import { SET_ALERT_ASSIGNEES_CONTRACT } from './kibana.set_alert_assignees.gen';
import { FINALIZE_ALERTS_MIGRATION_CONTRACT } from './kibana.finalize_alerts_migration.gen';
import { ALERTS_MIGRATION_CLEANUP_CONTRACT } from './kibana.alerts_migration_cleanup.gen';
import { CREATE_ALERTS_MIGRATION_CONTRACT } from './kibana.create_alerts_migration.gen';
import { READ_ALERTS_MIGRATION_STATUS_CONTRACT } from './kibana.read_alerts_migration_status.gen';
import { SEARCH_ALERTS_CONTRACT } from './kibana.search_alerts.gen';
import { SET_ALERTS_STATUS_CONTRACT } from './kibana.set_alerts_status.gen';
import { SET_ALERT_TAGS_CONTRACT } from './kibana.set_alert_tags.gen';
import { READ_TAGS_CONTRACT } from './kibana.read_tags.gen';
import { ROTATE_ENCRYPTION_KEY_CONTRACT } from './kibana.rotate_encryption_key.gen';
import { CREATE_ENDPOINT_LIST_CONTRACT } from './kibana.create_endpoint_list.gen';
import { DELETE_ENDPOINT_LIST_ITEM_CONTRACT } from './kibana.delete_endpoint_list_item.gen';
import { READ_ENDPOINT_LIST_ITEM_CONTRACT } from './kibana.read_endpoint_list_item.gen';
import { CREATE_ENDPOINT_LIST_ITEM_CONTRACT } from './kibana.create_endpoint_list_item.gen';
import { UPDATE_ENDPOINT_LIST_ITEM_CONTRACT } from './kibana.update_endpoint_list_item.gen';
import { FIND_ENDPOINT_LIST_ITEMS_CONTRACT } from './kibana.find_endpoint_list_items.gen';
import { ENDPOINT_GET_ACTIONS_LIST_CONTRACT } from './kibana.endpoint_get_actions_list.gen';
import { ENDPOINT_GET_ACTIONS_STATUS_CONTRACT } from './kibana.endpoint_get_actions_status.gen';
import { ENDPOINT_GET_ACTIONS_DETAILS_CONTRACT } from './kibana.endpoint_get_actions_details.gen';
import { ENDPOINT_FILE_INFO_CONTRACT } from './kibana.endpoint_file_info.gen';
import { ENDPOINT_FILE_DOWNLOAD_CONTRACT } from './kibana.endpoint_file_download.gen';
import { CANCEL_ACTION_CONTRACT } from './kibana.cancel_action.gen';
import { ENDPOINT_EXECUTE_ACTION_CONTRACT } from './kibana.endpoint_execute_action.gen';
import { ENDPOINT_GET_FILE_ACTION_CONTRACT } from './kibana.endpoint_get_file_action.gen';
import { ENDPOINT_ISOLATE_ACTION_CONTRACT } from './kibana.endpoint_isolate_action.gen';
import { ENDPOINT_KILL_PROCESS_ACTION_CONTRACT } from './kibana.endpoint_kill_process_action.gen';
import { ENDPOINT_GET_PROCESSES_ACTION_CONTRACT } from './kibana.endpoint_get_processes_action.gen';
import { RUN_SCRIPT_ACTION_CONTRACT } from './kibana.run_script_action.gen';
import { ENDPOINT_SCAN_ACTION_CONTRACT } from './kibana.endpoint_scan_action.gen';
import { ENDPOINT_GET_ACTIONS_STATE_CONTRACT } from './kibana.endpoint_get_actions_state.gen';
import { ENDPOINT_SUSPEND_PROCESS_ACTION_CONTRACT } from './kibana.endpoint_suspend_process_action.gen';
import { ENDPOINT_UNISOLATE_ACTION_CONTRACT } from './kibana.endpoint_unisolate_action.gen';
import { ENDPOINT_UPLOAD_ACTION_CONTRACT } from './kibana.endpoint_upload_action.gen';
import { GET_ENDPOINT_METADATA_LIST_CONTRACT } from './kibana.get_endpoint_metadata_list.gen';
import { GET_ENDPOINT_METADATA_CONTRACT } from './kibana.get_endpoint_metadata.gen';
import { GET_POLICY_RESPONSE_CONTRACT } from './kibana.get_policy_response.gen';
import { GET_PROTECTION_UPDATES_NOTE_CONTRACT } from './kibana.get_protection_updates_note.gen';
import { CREATE_UPDATE_PROTECTION_UPDATES_NOTE_CONTRACT } from './kibana.create_update_protection_updates_note.gen';
import { DELETE_MONITORING_ENGINE_CONTRACT } from './kibana.delete_monitoring_engine.gen';
import { DISABLE_MONITORING_ENGINE_CONTRACT } from './kibana.disable_monitoring_engine.gen';
import { INIT_MONITORING_ENGINE_CONTRACT } from './kibana.init_monitoring_engine.gen';
import { SCHEDULE_MONITORING_ENGINE_CONTRACT } from './kibana.schedule_monitoring_engine.gen';
import { PRIV_MON_HEALTH_CONTRACT } from './kibana.priv_mon_health.gen';
import { PRIV_MON_PRIVILEGES_CONTRACT } from './kibana.priv_mon_privileges.gen';
import { CREATE_PRIV_MON_USER_CONTRACT } from './kibana.create_priv_mon_user.gen';
import { PRIVMON_BULK_UPLOAD_USERS_CSV_CONTRACT } from './kibana.privmon_bulk_upload_users_csv.gen';
import { DELETE_PRIV_MON_USER_CONTRACT } from './kibana.delete_priv_mon_user.gen';
import { UPDATE_PRIV_MON_USER_CONTRACT } from './kibana.update_priv_mon_user.gen';
import { LIST_PRIV_MON_USERS_CONTRACT } from './kibana.list_priv_mon_users.gen';
import { INSTALL_PRIVILEGED_ACCESS_DETECTION_PACKAGE_CONTRACT } from './kibana.install_privileged_access_detection_package.gen';
import { GET_PRIVILEGED_ACCESS_DETECTION_PACKAGE_STATUS_CONTRACT } from './kibana.get_privileged_access_detection_package_status.gen';
import { INIT_ENTITY_STORE_CONTRACT } from './kibana.init_entity_store.gen';
import { DELETE_ENTITY_ENGINES_CONTRACT } from './kibana.delete_entity_engines.gen';
import { LIST_ENTITY_ENGINES_CONTRACT } from './kibana.list_entity_engines.gen';
import { DELETE_ENTITY_ENGINE_CONTRACT } from './kibana.delete_entity_engine.gen';
import { GET_ENTITY_ENGINE_CONTRACT } from './kibana.get_entity_engine.gen';
import { INIT_ENTITY_ENGINE_CONTRACT } from './kibana.init_entity_engine.gen';
import { START_ENTITY_ENGINE_CONTRACT } from './kibana.start_entity_engine.gen';
import { STOP_ENTITY_ENGINE_CONTRACT } from './kibana.stop_entity_engine.gen';
import { APPLY_ENTITY_ENGINE_DATAVIEW_INDICES_CONTRACT } from './kibana.apply_entity_engine_dataview_indices.gen';
import { DELETE_SINGLE_ENTITY_CONTRACT } from './kibana.delete_single_entity.gen';
import { UPSERT_ENTITY_CONTRACT } from './kibana.upsert_entity.gen';
import { UPSERT_ENTITIES_BULK_CONTRACT } from './kibana.upsert_entities_bulk.gen';
import { LIST_ENTITIES_CONTRACT } from './kibana.list_entities.gen';
import { GET_ENTITY_STORE_STATUS_CONTRACT } from './kibana.get_entity_store_status.gen';
import { DELETE_EXCEPTION_LIST_CONTRACT } from './kibana.delete_exception_list.gen';
import { READ_EXCEPTION_LIST_CONTRACT } from './kibana.read_exception_list.gen';
import { CREATE_EXCEPTION_LIST_CONTRACT } from './kibana.create_exception_list.gen';
import { UPDATE_EXCEPTION_LIST_CONTRACT } from './kibana.update_exception_list.gen';
import { DUPLICATE_EXCEPTION_LIST_CONTRACT } from './kibana.duplicate_exception_list.gen';
import { EXPORT_EXCEPTION_LIST_CONTRACT } from './kibana.export_exception_list.gen';
import { FIND_EXCEPTION_LISTS_CONTRACT } from './kibana.find_exception_lists.gen';
import { IMPORT_EXCEPTION_LIST_CONTRACT } from './kibana.import_exception_list.gen';
import { DELETE_EXCEPTION_LIST_ITEM_CONTRACT } from './kibana.delete_exception_list_item.gen';
import { READ_EXCEPTION_LIST_ITEM_CONTRACT } from './kibana.read_exception_list_item.gen';
import { CREATE_EXCEPTION_LIST_ITEM_CONTRACT } from './kibana.create_exception_list_item.gen';
import { UPDATE_EXCEPTION_LIST_ITEM_CONTRACT } from './kibana.update_exception_list_item.gen';
import { FIND_EXCEPTION_LIST_ITEMS_CONTRACT } from './kibana.find_exception_list_items.gen';
import { READ_EXCEPTION_LIST_SUMMARY_CONTRACT } from './kibana.read_exception_list_summary.gen';
import { CREATE_SHARED_EXCEPTION_LIST_CONTRACT } from './kibana.create_shared_exception_list.gen';
import { GET_FEATURES_CONTRACT } from './kibana.get_features.gen';
import { GET_FLEET_AGENT_DOWNLOAD_SOURCES_CONTRACT } from './kibana.get_fleet_agent_download_sources.gen';
import { POST_FLEET_AGENT_DOWNLOAD_SOURCES_CONTRACT } from './kibana.post_fleet_agent_download_sources.gen';
import { DELETE_FLEET_AGENT_DOWNLOAD_SOURCES_SOURCEID_CONTRACT } from './kibana.delete_fleet_agent_download_sources_sourceid.gen';
import { GET_FLEET_AGENT_DOWNLOAD_SOURCES_SOURCEID_CONTRACT } from './kibana.get_fleet_agent_download_sources_sourceid.gen';
import { PUT_FLEET_AGENT_DOWNLOAD_SOURCES_SOURCEID_CONTRACT } from './kibana.put_fleet_agent_download_sources_sourceid.gen';
import { GET_FLEET_AGENT_POLICIES_CONTRACT } from './kibana.get_fleet_agent_policies.gen';
import { POST_FLEET_AGENT_POLICIES_CONTRACT } from './kibana.post_fleet_agent_policies.gen';
import { POST_FLEET_AGENT_POLICIES_BULK_GET_CONTRACT } from './kibana.post_fleet_agent_policies_bulk_get.gen';
import { GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_CONTRACT } from './kibana.get_fleet_agent_policies_agentpolicyid.gen';
import { PUT_FLEET_AGENT_POLICIES_AGENTPOLICYID_CONTRACT } from './kibana.put_fleet_agent_policies_agentpolicyid.gen';
import { GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_AUTO_UPGRADE_AGENTS_STATUS_CONTRACT } from './kibana.get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status.gen';
import { POST_FLEET_AGENT_POLICIES_AGENTPOLICYID_COPY_CONTRACT } from './kibana.post_fleet_agent_policies_agentpolicyid_copy.gen';
import { GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_DOWNLOAD_CONTRACT } from './kibana.get_fleet_agent_policies_agentpolicyid_download.gen';
import { GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_FULL_CONTRACT } from './kibana.get_fleet_agent_policies_agentpolicyid_full.gen';
import { GET_FLEET_AGENT_POLICIES_AGENTPOLICYID_OUTPUTS_CONTRACT } from './kibana.get_fleet_agent_policies_agentpolicyid_outputs.gen';
import { POST_FLEET_AGENT_POLICIES_DELETE_CONTRACT } from './kibana.post_fleet_agent_policies_delete.gen';
import { POST_FLEET_AGENT_POLICIES_OUTPUTS_CONTRACT } from './kibana.post_fleet_agent_policies_outputs.gen';
import { GET_FLEET_AGENT_STATUS_CONTRACT } from './kibana.get_fleet_agent_status.gen';
import { GET_FLEET_AGENT_STATUS_DATA_CONTRACT } from './kibana.get_fleet_agent_status_data.gen';
import { POST_FLEET_AGENTLESS_POLICIES_CONTRACT } from './kibana.post_fleet_agentless_policies.gen';
import { DELETE_FLEET_AGENTLESS_POLICIES_POLICYID_CONTRACT } from './kibana.delete_fleet_agentless_policies_policyid.gen';
import { GET_FLEET_AGENTS_CONTRACT } from './kibana.get_fleet_agents.gen';
import { POST_FLEET_AGENTS_CONTRACT } from './kibana.post_fleet_agents.gen';
import { DELETE_FLEET_AGENTS_AGENTID_CONTRACT } from './kibana.delete_fleet_agents_agentid.gen';
import { GET_FLEET_AGENTS_AGENTID_CONTRACT } from './kibana.get_fleet_agents_agentid.gen';
import { PUT_FLEET_AGENTS_AGENTID_CONTRACT } from './kibana.put_fleet_agents_agentid.gen';
import { POST_FLEET_AGENTS_AGENTID_ACTIONS_CONTRACT } from './kibana.post_fleet_agents_agentid_actions.gen';
import { POST_FLEET_AGENTS_AGENTID_MIGRATE_CONTRACT } from './kibana.post_fleet_agents_agentid_migrate.gen';
import { POST_FLEET_AGENTS_AGENTID_REASSIGN_CONTRACT } from './kibana.post_fleet_agents_agentid_reassign.gen';
import { POST_FLEET_AGENTS_AGENTID_REQUEST_DIAGNOSTICS_CONTRACT } from './kibana.post_fleet_agents_agentid_request_diagnostics.gen';
import { POST_FLEET_AGENTS_AGENTID_UNENROLL_CONTRACT } from './kibana.post_fleet_agents_agentid_unenroll.gen';
import { POST_FLEET_AGENTS_AGENTID_UPGRADE_CONTRACT } from './kibana.post_fleet_agents_agentid_upgrade.gen';
import { GET_FLEET_AGENTS_AGENTID_UPLOADS_CONTRACT } from './kibana.get_fleet_agents_agentid_uploads.gen';
import { GET_FLEET_AGENTS_ACTION_STATUS_CONTRACT } from './kibana.get_fleet_agents_action_status.gen';
import { POST_FLEET_AGENTS_ACTIONS_ACTIONID_CANCEL_CONTRACT } from './kibana.post_fleet_agents_actions_actionid_cancel.gen';
import { GET_FLEET_AGENTS_AVAILABLE_VERSIONS_CONTRACT } from './kibana.get_fleet_agents_available_versions.gen';
import { POST_FLEET_AGENTS_BULK_MIGRATE_CONTRACT } from './kibana.post_fleet_agents_bulk_migrate.gen';
import { POST_FLEET_AGENTS_BULK_REASSIGN_CONTRACT } from './kibana.post_fleet_agents_bulk_reassign.gen';
import { POST_FLEET_AGENTS_BULK_REQUEST_DIAGNOSTICS_CONTRACT } from './kibana.post_fleet_agents_bulk_request_diagnostics.gen';
import { POST_FLEET_AGENTS_BULK_UNENROLL_CONTRACT } from './kibana.post_fleet_agents_bulk_unenroll.gen';
import { POST_FLEET_AGENTS_BULK_UPDATE_AGENT_TAGS_CONTRACT } from './kibana.post_fleet_agents_bulk_update_agent_tags.gen';
import { POST_FLEET_AGENTS_BULK_UPGRADE_CONTRACT } from './kibana.post_fleet_agents_bulk_upgrade.gen';
import { DELETE_FLEET_AGENTS_FILES_FILEID_CONTRACT } from './kibana.delete_fleet_agents_files_fileid.gen';
import { GET_FLEET_AGENTS_FILES_FILEID_FILENAME_CONTRACT } from './kibana.get_fleet_agents_files_fileid_filename.gen';
import { GET_FLEET_AGENTS_SETUP_CONTRACT } from './kibana.get_fleet_agents_setup.gen';
import { POST_FLEET_AGENTS_SETUP_CONTRACT } from './kibana.post_fleet_agents_setup.gen';
import { GET_FLEET_AGENTS_TAGS_CONTRACT } from './kibana.get_fleet_agents_tags.gen';
import { GET_FLEET_CHECK_PERMISSIONS_CONTRACT } from './kibana.get_fleet_check_permissions.gen';
import { GET_FLEET_CLOUD_CONNECTORS_CONTRACT } from './kibana.get_fleet_cloud_connectors.gen';
import { POST_FLEET_CLOUD_CONNECTORS_CONTRACT } from './kibana.post_fleet_cloud_connectors.gen';
import { DELETE_FLEET_CLOUD_CONNECTORS_CLOUDCONNECTORID_CONTRACT } from './kibana.delete_fleet_cloud_connectors_cloudconnectorid.gen';
import { GET_FLEET_CLOUD_CONNECTORS_CLOUDCONNECTORID_CONTRACT } from './kibana.get_fleet_cloud_connectors_cloudconnectorid.gen';
import { PUT_FLEET_CLOUD_CONNECTORS_CLOUDCONNECTORID_CONTRACT } from './kibana.put_fleet_cloud_connectors_cloudconnectorid.gen';
import { GET_FLEET_DATA_STREAMS_CONTRACT } from './kibana.get_fleet_data_streams.gen';
import { GET_FLEET_ENROLLMENT_API_KEYS_CONTRACT } from './kibana.get_fleet_enrollment_api_keys.gen';
import { POST_FLEET_ENROLLMENT_API_KEYS_CONTRACT } from './kibana.post_fleet_enrollment_api_keys.gen';
import { DELETE_FLEET_ENROLLMENT_API_KEYS_KEYID_CONTRACT } from './kibana.delete_fleet_enrollment_api_keys_keyid.gen';
import { GET_FLEET_ENROLLMENT_API_KEYS_KEYID_CONTRACT } from './kibana.get_fleet_enrollment_api_keys_keyid.gen';
import { POST_FLEET_EPM_BULK_ASSETS_CONTRACT } from './kibana.post_fleet_epm_bulk_assets.gen';
import { GET_FLEET_EPM_CATEGORIES_CONTRACT } from './kibana.get_fleet_epm_categories.gen';
import { POST_FLEET_EPM_CUSTOM_INTEGRATIONS_CONTRACT } from './kibana.post_fleet_epm_custom_integrations.gen';
import { PUT_FLEET_EPM_CUSTOM_INTEGRATIONS_PKGNAME_CONTRACT } from './kibana.put_fleet_epm_custom_integrations_pkgname.gen';
import { GET_FLEET_EPM_DATA_STREAMS_CONTRACT } from './kibana.get_fleet_epm_data_streams.gen';
import { GET_FLEET_EPM_PACKAGES_CONTRACT } from './kibana.get_fleet_epm_packages.gen';
import { POST_FLEET_EPM_PACKAGES_CONTRACT } from './kibana.post_fleet_epm_packages.gen';
import { POST_FLEET_EPM_PACKAGES_BULK_CONTRACT } from './kibana.post_fleet_epm_packages_bulk.gen';
import { POST_FLEET_EPM_PACKAGES_BULK_ROLLBACK_CONTRACT } from './kibana.post_fleet_epm_packages_bulk_rollback.gen';
import { GET_FLEET_EPM_PACKAGES_BULK_ROLLBACK_TASKID_CONTRACT } from './kibana.get_fleet_epm_packages_bulk_rollback_taskid.gen';
import { POST_FLEET_EPM_PACKAGES_BULK_UNINSTALL_CONTRACT } from './kibana.post_fleet_epm_packages_bulk_uninstall.gen';
import { GET_FLEET_EPM_PACKAGES_BULK_UNINSTALL_TASKID_CONTRACT } from './kibana.get_fleet_epm_packages_bulk_uninstall_taskid.gen';
import { POST_FLEET_EPM_PACKAGES_BULK_UPGRADE_CONTRACT } from './kibana.post_fleet_epm_packages_bulk_upgrade.gen';
import { GET_FLEET_EPM_PACKAGES_BULK_UPGRADE_TASKID_CONTRACT } from './kibana.get_fleet_epm_packages_bulk_upgrade_taskid.gen';
import { DELETE_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT } from './kibana.delete_fleet_epm_packages_pkgname_pkgversion.gen';
import { GET_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT } from './kibana.get_fleet_epm_packages_pkgname_pkgversion.gen';
import { POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT } from './kibana.post_fleet_epm_packages_pkgname_pkgversion.gen';
import { PUT_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_CONTRACT } from './kibana.put_fleet_epm_packages_pkgname_pkgversion.gen';
import { GET_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_FILEPATH_CONTRACT } from './kibana.get_fleet_epm_packages_pkgname_pkgversion_filepath.gen';
import { DELETE_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_DATASTREAM_ASSETS_CONTRACT } from './kibana.delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets.gen';
import { DELETE_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_KIBANA_ASSETS_CONTRACT } from './kibana.delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets.gen';
import { POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_KIBANA_ASSETS_CONTRACT } from './kibana.post_fleet_epm_packages_pkgname_pkgversion_kibana_assets.gen';
import { POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_RULE_ASSETS_CONTRACT } from './kibana.post_fleet_epm_packages_pkgname_pkgversion_rule_assets.gen';
import { POST_FLEET_EPM_PACKAGES_PKGNAME_PKGVERSION_TRANSFORMS_AUTHORIZE_CONTRACT } from './kibana.post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize.gen';
import { POST_FLEET_EPM_PACKAGES_PKGNAME_ROLLBACK_CONTRACT } from './kibana.post_fleet_epm_packages_pkgname_rollback.gen';
import { GET_FLEET_EPM_PACKAGES_PKGNAME_STATS_CONTRACT } from './kibana.get_fleet_epm_packages_pkgname_stats.gen';
import { GET_FLEET_EPM_PACKAGES_INSTALLED_CONTRACT } from './kibana.get_fleet_epm_packages_installed.gen';
import { GET_FLEET_EPM_PACKAGES_LIMITED_CONTRACT } from './kibana.get_fleet_epm_packages_limited.gen';
import { GET_FLEET_EPM_TEMPLATES_PKGNAME_PKGVERSION_INPUTS_CONTRACT } from './kibana.get_fleet_epm_templates_pkgname_pkgversion_inputs.gen';
import { GET_FLEET_EPM_VERIFICATION_KEY_ID_CONTRACT } from './kibana.get_fleet_epm_verification_key_id.gen';
import { GET_FLEET_FLEET_SERVER_HOSTS_CONTRACT } from './kibana.get_fleet_fleet_server_hosts.gen';
import { POST_FLEET_FLEET_SERVER_HOSTS_CONTRACT } from './kibana.post_fleet_fleet_server_hosts.gen';
import { DELETE_FLEET_FLEET_SERVER_HOSTS_ITEMID_CONTRACT } from './kibana.delete_fleet_fleet_server_hosts_itemid.gen';
import { GET_FLEET_FLEET_SERVER_HOSTS_ITEMID_CONTRACT } from './kibana.get_fleet_fleet_server_hosts_itemid.gen';
import { PUT_FLEET_FLEET_SERVER_HOSTS_ITEMID_CONTRACT } from './kibana.put_fleet_fleet_server_hosts_itemid.gen';
import { POST_FLEET_HEALTH_CHECK_CONTRACT } from './kibana.post_fleet_health_check.gen';
import { GET_FLEET_KUBERNETES_CONTRACT } from './kibana.get_fleet_kubernetes.gen';
import { GET_FLEET_KUBERNETES_DOWNLOAD_CONTRACT } from './kibana.get_fleet_kubernetes_download.gen';
import { POST_FLEET_LOGSTASH_API_KEYS_CONTRACT } from './kibana.post_fleet_logstash_api_keys.gen';
import { POST_FLEET_MESSAGE_SIGNING_SERVICE_ROTATE_KEY_PAIR_CONTRACT } from './kibana.post_fleet_message_signing_service_rotate_key_pair.gen';
import { GET_FLEET_OUTPUTS_CONTRACT } from './kibana.get_fleet_outputs.gen';
import { POST_FLEET_OUTPUTS_CONTRACT } from './kibana.post_fleet_outputs.gen';
import { DELETE_FLEET_OUTPUTS_OUTPUTID_CONTRACT } from './kibana.delete_fleet_outputs_outputid.gen';
import { GET_FLEET_OUTPUTS_OUTPUTID_CONTRACT } from './kibana.get_fleet_outputs_outputid.gen';
import { PUT_FLEET_OUTPUTS_OUTPUTID_CONTRACT } from './kibana.put_fleet_outputs_outputid.gen';
import { GET_FLEET_OUTPUTS_OUTPUTID_HEALTH_CONTRACT } from './kibana.get_fleet_outputs_outputid_health.gen';
import { GET_FLEET_PACKAGE_POLICIES_CONTRACT } from './kibana.get_fleet_package_policies.gen';
import { POST_FLEET_PACKAGE_POLICIES_CONTRACT } from './kibana.post_fleet_package_policies.gen';
import { POST_FLEET_PACKAGE_POLICIES_BULK_GET_CONTRACT } from './kibana.post_fleet_package_policies_bulk_get.gen';
import { DELETE_FLEET_PACKAGE_POLICIES_PACKAGEPOLICYID_CONTRACT } from './kibana.delete_fleet_package_policies_packagepolicyid.gen';
import { GET_FLEET_PACKAGE_POLICIES_PACKAGEPOLICYID_CONTRACT } from './kibana.get_fleet_package_policies_packagepolicyid.gen';
import { PUT_FLEET_PACKAGE_POLICIES_PACKAGEPOLICYID_CONTRACT } from './kibana.put_fleet_package_policies_packagepolicyid.gen';
import { POST_FLEET_PACKAGE_POLICIES_DELETE_CONTRACT } from './kibana.post_fleet_package_policies_delete.gen';
import { POST_FLEET_PACKAGE_POLICIES_UPGRADE_CONTRACT } from './kibana.post_fleet_package_policies_upgrade.gen';
import { POST_FLEET_PACKAGE_POLICIES_UPGRADE_DRYRUN_CONTRACT } from './kibana.post_fleet_package_policies_upgrade_dryrun.gen';
import { GET_FLEET_PROXIES_CONTRACT } from './kibana.get_fleet_proxies.gen';
import { POST_FLEET_PROXIES_CONTRACT } from './kibana.post_fleet_proxies.gen';
import { DELETE_FLEET_PROXIES_ITEMID_CONTRACT } from './kibana.delete_fleet_proxies_itemid.gen';
import { GET_FLEET_PROXIES_ITEMID_CONTRACT } from './kibana.get_fleet_proxies_itemid.gen';
import { PUT_FLEET_PROXIES_ITEMID_CONTRACT } from './kibana.put_fleet_proxies_itemid.gen';
import { GET_FLEET_REMOTE_SYNCED_INTEGRATIONS_OUTPUTID_REMOTE_STATUS_CONTRACT } from './kibana.get_fleet_remote_synced_integrations_outputid_remote_status.gen';
import { GET_FLEET_REMOTE_SYNCED_INTEGRATIONS_STATUS_CONTRACT } from './kibana.get_fleet_remote_synced_integrations_status.gen';
import { POST_FLEET_SERVICE_TOKENS_CONTRACT } from './kibana.post_fleet_service_tokens.gen';
import { GET_FLEET_SETTINGS_CONTRACT } from './kibana.get_fleet_settings.gen';
import { PUT_FLEET_SETTINGS_CONTRACT } from './kibana.put_fleet_settings.gen';
import { POST_FLEET_SETUP_CONTRACT } from './kibana.post_fleet_setup.gen';
import { GET_FLEET_SPACE_SETTINGS_CONTRACT } from './kibana.get_fleet_space_settings.gen';
import { PUT_FLEET_SPACE_SETTINGS_CONTRACT } from './kibana.put_fleet_space_settings.gen';
import { GET_FLEET_UNINSTALL_TOKENS_CONTRACT } from './kibana.get_fleet_uninstall_tokens.gen';
import { GET_FLEET_UNINSTALL_TOKENS_UNINSTALLTOKENID_CONTRACT } from './kibana.get_fleet_uninstall_tokens_uninstalltokenid.gen';
import { DELETE_LIST_CONTRACT } from './kibana.delete_list.gen';
import { READ_LIST_CONTRACT } from './kibana.read_list.gen';
import { PATCH_LIST_CONTRACT } from './kibana.patch_list.gen';
import { CREATE_LIST_CONTRACT } from './kibana.create_list.gen';
import { UPDATE_LIST_CONTRACT } from './kibana.update_list.gen';
import { FIND_LISTS_CONTRACT } from './kibana.find_lists.gen';
import { DELETE_LIST_INDEX_CONTRACT } from './kibana.delete_list_index.gen';
import { READ_LIST_INDEX_CONTRACT } from './kibana.read_list_index.gen';
import { CREATE_LIST_INDEX_CONTRACT } from './kibana.create_list_index.gen';
import { DELETE_LIST_ITEM_CONTRACT } from './kibana.delete_list_item.gen';
import { READ_LIST_ITEM_CONTRACT } from './kibana.read_list_item.gen';
import { PATCH_LIST_ITEM_CONTRACT } from './kibana.patch_list_item.gen';
import { CREATE_LIST_ITEM_CONTRACT } from './kibana.create_list_item.gen';
import { UPDATE_LIST_ITEM_CONTRACT } from './kibana.update_list_item.gen';
import { EXPORT_LIST_ITEMS_CONTRACT } from './kibana.export_list_items.gen';
import { FIND_LIST_ITEMS_CONTRACT } from './kibana.find_list_items.gen';
import { IMPORT_LIST_ITEMS_CONTRACT } from './kibana.import_list_items.gen';
import { READ_LIST_PRIVILEGES_CONTRACT } from './kibana.read_list_privileges.gen';
import { DELETE_LOGSTASH_PIPELINE_CONTRACT } from './kibana.delete_logstash_pipeline.gen';
import { GET_LOGSTASH_PIPELINE_CONTRACT } from './kibana.get_logstash_pipeline.gen';
import { PUT_LOGSTASH_PIPELINE_CONTRACT } from './kibana.put_logstash_pipeline.gen';
import { GET_LOGSTASH_PIPELINES_CONTRACT } from './kibana.get_logstash_pipelines.gen';
import { POST_MAINTENANCE_WINDOW_CONTRACT } from './kibana.post_maintenance_window.gen';
import { GET_MAINTENANCE_WINDOW_FIND_CONTRACT } from './kibana.get_maintenance_window_find.gen';
import { DELETE_MAINTENANCE_WINDOW_ID_CONTRACT } from './kibana.delete_maintenance_window_id.gen';
import { GET_MAINTENANCE_WINDOW_ID_CONTRACT } from './kibana.get_maintenance_window_id.gen';
import { PATCH_MAINTENANCE_WINDOW_ID_CONTRACT } from './kibana.patch_maintenance_window_id.gen';
import { POST_MAINTENANCE_WINDOW_ID_ARCHIVE_CONTRACT } from './kibana.post_maintenance_window_id_archive.gen';
import { POST_MAINTENANCE_WINDOW_ID_UNARCHIVE_CONTRACT } from './kibana.post_maintenance_window_id_unarchive.gen';
import { ML_SYNC_CONTRACT } from './kibana.ml_sync.gen';
import { ML_UPDATE_JOBS_SPACES_CONTRACT } from './kibana.ml_update_jobs_spaces.gen';
import { ML_UPDATE_TRAINED_MODELS_SPACES_CONTRACT } from './kibana.ml_update_trained_models_spaces.gen';
import { DELETE_NOTE_CONTRACT } from './kibana.delete_note.gen';
import { GET_NOTES_CONTRACT } from './kibana.get_notes.gen';
import { PERSIST_NOTE_ROUTE_CONTRACT } from './kibana.persist_note_route.gen';
import { OBSERVABILITY_AI_ASSISTANT_CHAT_COMPLETE_CONTRACT } from './kibana.observability_ai_assistant_chat_complete.gen';
import { OSQUERY_FIND_LIVE_QUERIES_CONTRACT } from './kibana.osquery_find_live_queries.gen';
import { OSQUERY_CREATE_LIVE_QUERY_CONTRACT } from './kibana.osquery_create_live_query.gen';
import { OSQUERY_GET_LIVE_QUERY_DETAILS_CONTRACT } from './kibana.osquery_get_live_query_details.gen';
import { OSQUERY_GET_LIVE_QUERY_RESULTS_CONTRACT } from './kibana.osquery_get_live_query_results.gen';
import { OSQUERY_FIND_PACKS_CONTRACT } from './kibana.osquery_find_packs.gen';
import { OSQUERY_CREATE_PACKS_CONTRACT } from './kibana.osquery_create_packs.gen';
import { OSQUERY_DELETE_PACKS_CONTRACT } from './kibana.osquery_delete_packs.gen';
import { OSQUERY_GET_PACKS_DETAILS_CONTRACT } from './kibana.osquery_get_packs_details.gen';
import { OSQUERY_UPDATE_PACKS_CONTRACT } from './kibana.osquery_update_packs.gen';
import { OSQUERY_FIND_SAVED_QUERIES_CONTRACT } from './kibana.osquery_find_saved_queries.gen';
import { OSQUERY_CREATE_SAVED_QUERY_CONTRACT } from './kibana.osquery_create_saved_query.gen';
import { OSQUERY_DELETE_SAVED_QUERY_CONTRACT } from './kibana.osquery_delete_saved_query.gen';
import { OSQUERY_GET_SAVED_QUERY_DETAILS_CONTRACT } from './kibana.osquery_get_saved_query_details.gen';
import { OSQUERY_UPDATE_SAVED_QUERY_CONTRACT } from './kibana.osquery_update_saved_query.gen';
import { PERSIST_PINNED_EVENT_ROUTE_CONTRACT } from './kibana.persist_pinned_event_route.gen';
import { CLEAN_UP_RISK_ENGINE_CONTRACT } from './kibana.clean_up_risk_engine.gen';
import { CONFIGURE_RISK_ENGINE_SAVED_OBJECT_CONTRACT } from './kibana.configure_risk_engine_saved_object.gen';
import { SCHEDULE_RISK_ENGINE_NOW_CONTRACT } from './kibana.schedule_risk_engine_now.gen';
import { BULK_CREATE_SAVED_OBJECTS_CONTRACT } from './kibana.bulk_create_saved_objects.gen';
import { BULK_DELETE_SAVED_OBJECTS_CONTRACT } from './kibana.bulk_delete_saved_objects.gen';
import { BULK_GET_SAVED_OBJECTS_CONTRACT } from './kibana.bulk_get_saved_objects.gen';
import { BULK_RESOLVE_SAVED_OBJECTS_CONTRACT } from './kibana.bulk_resolve_saved_objects.gen';
import { BULK_UPDATE_SAVED_OBJECTS_CONTRACT } from './kibana.bulk_update_saved_objects.gen';
import { POST_SAVED_OBJECTS_EXPORT_CONTRACT } from './kibana.post_saved_objects_export.gen';
import { FIND_SAVED_OBJECTS_CONTRACT } from './kibana.find_saved_objects.gen';
import { POST_SAVED_OBJECTS_IMPORT_CONTRACT } from './kibana.post_saved_objects_import.gen';
import { RESOLVE_IMPORT_ERRORS_CONTRACT } from './kibana.resolve_import_errors.gen';
import { CREATE_SAVED_OBJECT_CONTRACT } from './kibana.create_saved_object.gen';
import { GET_SAVED_OBJECT_CONTRACT } from './kibana.get_saved_object.gen';
import { CREATE_SAVED_OBJECT_ID_CONTRACT } from './kibana.create_saved_object_id.gen';
import { UPDATE_SAVED_OBJECT_CONTRACT } from './kibana.update_saved_object.gen';
import { RESOLVE_SAVED_OBJECT_CONTRACT } from './kibana.resolve_saved_object.gen';
import { PERFORM_ANONYMIZATION_FIELDS_BULK_ACTION_CONTRACT } from './kibana.perform_anonymization_fields_bulk_action.gen';
import { FIND_ANONYMIZATION_FIELDS_CONTRACT } from './kibana.find_anonymization_fields.gen';
import { CHAT_COMPLETE_CONTRACT } from './kibana.chat_complete.gen';
import { DELETE_ALL_CONVERSATIONS_CONTRACT } from './kibana.delete_all_conversations.gen';
import { CREATE_CONVERSATION_CONTRACT } from './kibana.create_conversation.gen';
import { FIND_CONVERSATIONS_CONTRACT } from './kibana.find_conversations.gen';
import { DELETE_CONVERSATION_CONTRACT } from './kibana.delete_conversation.gen';
import { READ_CONVERSATION_CONTRACT } from './kibana.read_conversation.gen';
import { UPDATE_CONVERSATION_CONTRACT } from './kibana.update_conversation.gen';
import { GET_KNOWLEDGE_BASE_CONTRACT } from './kibana.get_knowledge_base.gen';
import { POST_KNOWLEDGE_BASE_CONTRACT } from './kibana.post_knowledge_base.gen';
import { READ_KNOWLEDGE_BASE_CONTRACT } from './kibana.read_knowledge_base.gen';
import { CREATE_KNOWLEDGE_BASE_CONTRACT } from './kibana.create_knowledge_base.gen';
import { CREATE_KNOWLEDGE_BASE_ENTRY_CONTRACT } from './kibana.create_knowledge_base_entry.gen';
import { PERFORM_KNOWLEDGE_BASE_ENTRY_BULK_ACTION_CONTRACT } from './kibana.perform_knowledge_base_entry_bulk_action.gen';
import { FIND_KNOWLEDGE_BASE_ENTRIES_CONTRACT } from './kibana.find_knowledge_base_entries.gen';
import { DELETE_KNOWLEDGE_BASE_ENTRY_CONTRACT } from './kibana.delete_knowledge_base_entry.gen';
import { READ_KNOWLEDGE_BASE_ENTRY_CONTRACT } from './kibana.read_knowledge_base_entry.gen';
import { UPDATE_KNOWLEDGE_BASE_ENTRY_CONTRACT } from './kibana.update_knowledge_base_entry.gen';
import { PERFORM_PROMPTS_BULK_ACTION_CONTRACT } from './kibana.perform_prompts_bulk_action.gen';
import { FIND_PROMPTS_CONTRACT } from './kibana.find_prompts.gen';
import { GET_SECURITY_ROLE_CONTRACT } from './kibana.get_security_role.gen';
import { POST_SECURITY_ROLE_QUERY_CONTRACT } from './kibana.post_security_role_query.gen';
import { DELETE_SECURITY_ROLE_NAME_CONTRACT } from './kibana.delete_security_role_name.gen';
import { GET_SECURITY_ROLE_NAME_CONTRACT } from './kibana.get_security_role_name.gen';
import { PUT_SECURITY_ROLE_NAME_CONTRACT } from './kibana.put_security_role_name.gen';
import { POST_SECURITY_ROLES_CONTRACT } from './kibana.post_security_roles.gen';
import { POST_SECURITY_SESSION_INVALIDATE_CONTRACT } from './kibana.post_security_session_invalidate.gen';
import { POST_URL_CONTRACT } from './kibana.post_url.gen';
import { RESOLVE_URL_CONTRACT } from './kibana.resolve_url.gen';
import { DELETE_URL_CONTRACT } from './kibana.delete_url.gen';
import { GET_URL_CONTRACT } from './kibana.get_url.gen';
import { POST_SPACES_COPY_SAVED_OBJECTS_CONTRACT } from './kibana.post_spaces_copy_saved_objects.gen';
import { POST_SPACES_DISABLE_LEGACY_URL_ALIASES_CONTRACT } from './kibana.post_spaces_disable_legacy_url_aliases.gen';
import { POST_SPACES_GET_SHAREABLE_REFERENCES_CONTRACT } from './kibana.post_spaces_get_shareable_references.gen';
import { POST_SPACES_RESOLVE_COPY_SAVED_OBJECTS_ERRORS_CONTRACT } from './kibana.post_spaces_resolve_copy_saved_objects_errors.gen';
import { POST_SPACES_UPDATE_OBJECTS_SPACES_CONTRACT } from './kibana.post_spaces_update_objects_spaces.gen';
import { GET_SPACES_SPACE_CONTRACT } from './kibana.get_spaces_space.gen';
import { POST_SPACES_SPACE_CONTRACT } from './kibana.post_spaces_space.gen';
import { DELETE_SPACES_SPACE_ID_CONTRACT } from './kibana.delete_spaces_space_id.gen';
import { GET_SPACES_SPACE_ID_CONTRACT } from './kibana.get_spaces_space_id.gen';
import { PUT_SPACES_SPACE_ID_CONTRACT } from './kibana.put_spaces_space_id.gen';
import { GET_STATUS_CONTRACT } from './kibana.get_status.gen';
import { GET_STREAMS_CONTRACT } from './kibana.get_streams.gen';
import { POST_STREAMS_DISABLE_CONTRACT } from './kibana.post_streams_disable.gen';
import { POST_STREAMS_ENABLE_CONTRACT } from './kibana.post_streams_enable.gen';
import { POST_STREAMS_RESYNC_CONTRACT } from './kibana.post_streams_resync.gen';
import { DELETE_STREAMS_NAME_CONTRACT } from './kibana.delete_streams_name.gen';
import { GET_STREAMS_NAME_CONTRACT } from './kibana.get_streams_name.gen';
import { PUT_STREAMS_NAME_CONTRACT } from './kibana.put_streams_name.gen';
import { POST_STREAMS_NAME_FORK_CONTRACT } from './kibana.post_streams_name_fork.gen';
import { GET_STREAMS_NAME_GROUP_CONTRACT } from './kibana.get_streams_name_group.gen';
import { PUT_STREAMS_NAME_GROUP_CONTRACT } from './kibana.put_streams_name_group.gen';
import { GET_STREAMS_NAME_INGEST_CONTRACT } from './kibana.get_streams_name_ingest.gen';
import { PUT_STREAMS_NAME_INGEST_CONTRACT } from './kibana.put_streams_name_ingest.gen';
import { POST_STREAMS_NAME_CONTENT_EXPORT_CONTRACT } from './kibana.post_streams_name_content_export.gen';
import { POST_STREAMS_NAME_CONTENT_IMPORT_CONTRACT } from './kibana.post_streams_name_content_import.gen';
import { GET_STREAMS_NAME_QUERIES_CONTRACT } from './kibana.get_streams_name_queries.gen';
import { POST_STREAMS_NAME_QUERIES_BULK_CONTRACT } from './kibana.post_streams_name_queries_bulk.gen';
import { DELETE_STREAMS_NAME_QUERIES_QUERYID_CONTRACT } from './kibana.delete_streams_name_queries_queryid.gen';
import { PUT_STREAMS_NAME_QUERIES_QUERYID_CONTRACT } from './kibana.put_streams_name_queries_queryid.gen';
import { GET_STREAMS_NAME_SIGNIFICANT_EVENTS_CONTRACT } from './kibana.get_streams_name_significant_events.gen';
import { POST_STREAMS_NAME_SIGNIFICANT_EVENTS_GENERATE_CONTRACT } from './kibana.post_streams_name_significant_events_generate.gen';
import { POST_STREAMS_NAME_SIGNIFICANT_EVENTS_PREVIEW_CONTRACT } from './kibana.post_streams_name_significant_events_preview.gen';
import { GET_STREAMS_STREAMNAME_ATTACHMENTS_CONTRACT } from './kibana.get_streams_streamname_attachments.gen';
import { POST_STREAMS_STREAMNAME_ATTACHMENTS_BULK_CONTRACT } from './kibana.post_streams_streamname_attachments_bulk.gen';
import { DELETE_STREAMS_STREAMNAME_ATTACHMENTS_ATTACHMENTTYPE_ATTACHMENTID_CONTRACT } from './kibana.delete_streams_streamname_attachments_attachmenttype_attachmentid.gen';
import { PUT_STREAMS_STREAMNAME_ATTACHMENTS_ATTACHMENTTYPE_ATTACHMENTID_CONTRACT } from './kibana.put_streams_streamname_attachments_attachmenttype_attachmentid.gen';
import { POST_SYNTHETICS_MONITOR_TEST_CONTRACT } from './kibana.post_synthetics_monitor_test.gen';
import { GET_SYNTHETIC_MONITORS_CONTRACT } from './kibana.get_synthetic_monitors.gen';
import { POST_SYNTHETIC_MONITORS_CONTRACT } from './kibana.post_synthetic_monitors.gen';
import { DELETE_SYNTHETIC_MONITORS_CONTRACT } from './kibana.delete_synthetic_monitors.gen';
import { DELETE_SYNTHETIC_MONITOR_CONTRACT } from './kibana.delete_synthetic_monitor.gen';
import { GET_SYNTHETIC_MONITOR_CONTRACT } from './kibana.get_synthetic_monitor.gen';
import { PUT_SYNTHETIC_MONITOR_CONTRACT } from './kibana.put_synthetic_monitor.gen';
import { GET_PARAMETERS_CONTRACT } from './kibana.get_parameters.gen';
import { POST_PARAMETERS_CONTRACT } from './kibana.post_parameters.gen';
import { DELETE_PARAMETERS_CONTRACT } from './kibana.delete_parameters.gen';
import { DELETE_PARAMETER_CONTRACT } from './kibana.delete_parameter.gen';
import { GET_PARAMETER_CONTRACT } from './kibana.get_parameter.gen';
import { PUT_PARAMETER_CONTRACT } from './kibana.put_parameter.gen';
import { GET_PRIVATE_LOCATIONS_CONTRACT } from './kibana.get_private_locations.gen';
import { POST_PRIVATE_LOCATION_CONTRACT } from './kibana.post_private_location.gen';
import { DELETE_PRIVATE_LOCATION_CONTRACT } from './kibana.delete_private_location.gen';
import { GET_PRIVATE_LOCATION_CONTRACT } from './kibana.get_private_location.gen';
import { PUT_PRIVATE_LOCATION_CONTRACT } from './kibana.put_private_location.gen';
import { TASK_MANAGER_HEALTH_CONTRACT } from './kibana.task_manager_health.gen';
import { DELETE_TIMELINES_CONTRACT } from './kibana.delete_timelines.gen';
import { GET_TIMELINE_CONTRACT } from './kibana.get_timeline.gen';
import { PATCH_TIMELINE_CONTRACT } from './kibana.patch_timeline.gen';
import { CREATE_TIMELINES_CONTRACT } from './kibana.create_timelines.gen';
import { COPY_TIMELINE_CONTRACT } from './kibana.copy_timeline.gen';
import { GET_DRAFT_TIMELINES_CONTRACT } from './kibana.get_draft_timelines.gen';
import { CLEAN_DRAFT_TIMELINES_CONTRACT } from './kibana.clean_draft_timelines.gen';
import { EXPORT_TIMELINES_CONTRACT } from './kibana.export_timelines.gen';
import { PERSIST_FAVORITE_ROUTE_CONTRACT } from './kibana.persist_favorite_route.gen';
import { IMPORT_TIMELINES_CONTRACT } from './kibana.import_timelines.gen';
import { INSTALL_PREPACKED_TIMELINES_CONTRACT } from './kibana.install_prepacked_timelines.gen';
import { RESOLVE_TIMELINE_CONTRACT } from './kibana.resolve_timeline.gen';
import { GET_TIMELINES_CONTRACT } from './kibana.get_timelines.gen';
import { GET_UPGRADE_STATUS_CONTRACT } from './kibana.get_upgrade_status.gen';
import { GET_UPTIME_SETTINGS_CONTRACT } from './kibana.get_uptime_settings.gen';
import { PUT_UPTIME_SETTINGS_CONTRACT } from './kibana.put_uptime_settings.gen';
import { FIND_SLOS_OP_CONTRACT } from './kibana.find_slos_op.gen';
import { CREATE_SLO_OP_CONTRACT } from './kibana.create_slo_op.gen';
import { BULK_DELETE_OP_CONTRACT } from './kibana.bulk_delete_op.gen';
import { BULK_DELETE_STATUS_OP_CONTRACT } from './kibana.bulk_delete_status_op.gen';
import { DELETE_ROLLUP_DATA_OP_CONTRACT } from './kibana.delete_rollup_data_op.gen';
import { DELETE_SLO_INSTANCES_OP_CONTRACT } from './kibana.delete_slo_instances_op.gen';
import { DELETE_SLO_OP_CONTRACT } from './kibana.delete_slo_op.gen';
import { GET_SLO_OP_CONTRACT } from './kibana.get_slo_op.gen';
import { UPDATE_SLO_OP_CONTRACT } from './kibana.update_slo_op.gen';
import { RESET_SLO_OP_CONTRACT } from './kibana.reset_slo_op.gen';
import { DISABLE_SLO_OP_CONTRACT } from './kibana.disable_slo_op.gen';
import { ENABLE_SLO_OP_CONTRACT } from './kibana.enable_slo_op.gen';
import { GET_DEFINITIONS_OP_CONTRACT } from './kibana.get_definitions_op.gen';

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
  GET_ALERTING_HEALTH_CONTRACT,
  GET_RULE_TYPES_CONTRACT,
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
  CREATE_AGENT_KEY_CONTRACT,
  SAVE_APM_SERVER_SCHEMA_CONTRACT,
  CREATE_ANNOTATION_CONTRACT,
  GET_ANNOTATION_CONTRACT,
  DELETE_AGENT_CONFIGURATION_CONTRACT,
  GET_AGENT_CONFIGURATIONS_CONTRACT,
  CREATE_UPDATE_AGENT_CONFIGURATION_CONTRACT,
  GET_AGENT_NAME_FOR_SERVICE_CONTRACT,
  GET_ENVIRONMENTS_FOR_SERVICE_CONTRACT,
  SEARCH_SINGLE_CONFIGURATION_CONTRACT,
  GET_SINGLE_AGENT_CONFIGURATION_CONTRACT,
  GET_SOURCE_MAPS_CONTRACT,
  UPLOAD_SOURCE_MAP_CONTRACT,
  DELETE_SOURCE_MAP_CONTRACT,
  DELETE_ASSET_CRITICALITY_RECORD_CONTRACT,
  GET_ASSET_CRITICALITY_RECORD_CONTRACT,
  CREATE_ASSET_CRITICALITY_RECORD_CONTRACT,
  BULK_UPSERT_ASSET_CRITICALITY_RECORDS_CONTRACT,
  FIND_ASSET_CRITICALITY_RECORDS_CONTRACT,
  POST_ATTACK_DISCOVERY_BULK_CONTRACT,
  ATTACK_DISCOVERY_FIND_CONTRACT,
  POST_ATTACK_DISCOVERY_GENERATE_CONTRACT,
  GET_ATTACK_DISCOVERY_GENERATIONS_CONTRACT,
  GET_ATTACK_DISCOVERY_GENERATION_CONTRACT,
  POST_ATTACK_DISCOVERY_GENERATIONS_DISMISS_CONTRACT,
  CREATE_ATTACK_DISCOVERY_SCHEDULES_CONTRACT,
  FIND_ATTACK_DISCOVERY_SCHEDULES_CONTRACT,
  DELETE_ATTACK_DISCOVERY_SCHEDULES_CONTRACT,
  GET_ATTACK_DISCOVERY_SCHEDULES_CONTRACT,
  UPDATE_ATTACK_DISCOVERY_SCHEDULES_CONTRACT,
  DISABLE_ATTACK_DISCOVERY_SCHEDULES_CONTRACT,
  ENABLE_ATTACK_DISCOVERY_SCHEDULES_CONTRACT,
  DELETE_CASE_DEFAULT_SPACE_CONTRACT,
  UPDATE_CASE_DEFAULT_SPACE_CONTRACT,
  CREATE_CASE_DEFAULT_SPACE_CONTRACT,
  FIND_CASES_DEFAULT_SPACE_CONTRACT,
  GET_CASE_DEFAULT_SPACE_CONTRACT,
  GET_CASE_ALERTS_DEFAULT_SPACE_CONTRACT,
  DELETE_CASE_COMMENTS_DEFAULT_SPACE_CONTRACT,
  UPDATE_CASE_COMMENT_DEFAULT_SPACE_CONTRACT,
  ADD_CASE_COMMENT_DEFAULT_SPACE_CONTRACT,
  FIND_CASE_COMMENTS_DEFAULT_SPACE_CONTRACT,
  DELETE_CASE_COMMENT_DEFAULT_SPACE_CONTRACT,
  GET_CASE_COMMENT_DEFAULT_SPACE_CONTRACT,
  PUSH_CASE_DEFAULT_SPACE_CONTRACT,
  ADD_CASE_FILE_DEFAULT_SPACE_CONTRACT,
  FIND_CASE_ACTIVITY_DEFAULT_SPACE_CONTRACT,
  GET_CASES_BY_ALERT_DEFAULT_SPACE_CONTRACT,
  GET_CASE_CONFIGURATION_DEFAULT_SPACE_CONTRACT,
  SET_CASE_CONFIGURATION_DEFAULT_SPACE_CONTRACT,
  UPDATE_CASE_CONFIGURATION_DEFAULT_SPACE_CONTRACT,
  FIND_CASE_CONNECTORS_DEFAULT_SPACE_CONTRACT,
  GET_CASE_REPORTERS_DEFAULT_SPACE_CONTRACT,
  GET_CASE_TAGS_DEFAULT_SPACE_CONTRACT,
  GET_ALL_DATA_VIEWS_DEFAULT_CONTRACT,
  CREATE_DATA_VIEW_DEFAULTW_CONTRACT,
  DELETE_DATA_VIEW_DEFAULT_CONTRACT,
  GET_DATA_VIEW_DEFAULT_CONTRACT,
  UPDATE_DATA_VIEW_DEFAULT_CONTRACT,
  UPDATE_FIELDS_METADATA_DEFAULT_CONTRACT,
  CREATE_RUNTIME_FIELD_DEFAULT_CONTRACT,
  CREATE_UPDATE_RUNTIME_FIELD_DEFAULT_CONTRACT,
  DELETE_RUNTIME_FIELD_DEFAULT_CONTRACT,
  GET_RUNTIME_FIELD_DEFAULT_CONTRACT,
  UPDATE_RUNTIME_FIELD_DEFAULT_CONTRACT,
  GET_DEFAULT_DATA_VIEW_DEFAULT_CONTRACT,
  SET_DEFAULT_DATAIL_VIEW_DEFAULT_CONTRACT,
  SWAP_DATA_VIEWS_DEFAULT_CONTRACT,
  PREVIEW_SWAP_DATA_VIEWS_DEFAULT_CONTRACT,
  DELETE_ALERTS_INDEX_CONTRACT,
  READ_ALERTS_INDEX_CONTRACT,
  CREATE_ALERTS_INDEX_CONTRACT,
  READ_PRIVILEGES_CONTRACT,
  DELETE_RULE_CONTRACT,
  READ_RULE_CONTRACT,
  PATCH_RULE_CONTRACT,
  CREATE_RULE_CONTRACT,
  UPDATE_RULE_CONTRACT,
  PERFORM_RULES_BULK_ACTION_CONTRACT,
  EXPORT_RULES_CONTRACT,
  FIND_RULES_CONTRACT,
  IMPORT_RULES_CONTRACT,
  CREATE_RULE_EXCEPTION_LIST_ITEMS_CONTRACT,
  INSTALL_PREBUILT_RULES_AND_TIMELINES_CONTRACT,
  READ_PREBUILT_RULES_AND_TIMELINES_STATUS_CONTRACT,
  RULE_PREVIEW_CONTRACT,
  SET_ALERT_ASSIGNEES_CONTRACT,
  FINALIZE_ALERTS_MIGRATION_CONTRACT,
  ALERTS_MIGRATION_CLEANUP_CONTRACT,
  CREATE_ALERTS_MIGRATION_CONTRACT,
  READ_ALERTS_MIGRATION_STATUS_CONTRACT,
  SEARCH_ALERTS_CONTRACT,
  SET_ALERTS_STATUS_CONTRACT,
  SET_ALERT_TAGS_CONTRACT,
  READ_TAGS_CONTRACT,
  ROTATE_ENCRYPTION_KEY_CONTRACT,
  CREATE_ENDPOINT_LIST_CONTRACT,
  DELETE_ENDPOINT_LIST_ITEM_CONTRACT,
  READ_ENDPOINT_LIST_ITEM_CONTRACT,
  CREATE_ENDPOINT_LIST_ITEM_CONTRACT,
  UPDATE_ENDPOINT_LIST_ITEM_CONTRACT,
  FIND_ENDPOINT_LIST_ITEMS_CONTRACT,
  ENDPOINT_GET_ACTIONS_LIST_CONTRACT,
  ENDPOINT_GET_ACTIONS_STATUS_CONTRACT,
  ENDPOINT_GET_ACTIONS_DETAILS_CONTRACT,
  ENDPOINT_FILE_INFO_CONTRACT,
  ENDPOINT_FILE_DOWNLOAD_CONTRACT,
  CANCEL_ACTION_CONTRACT,
  ENDPOINT_EXECUTE_ACTION_CONTRACT,
  ENDPOINT_GET_FILE_ACTION_CONTRACT,
  ENDPOINT_ISOLATE_ACTION_CONTRACT,
  ENDPOINT_KILL_PROCESS_ACTION_CONTRACT,
  ENDPOINT_GET_PROCESSES_ACTION_CONTRACT,
  RUN_SCRIPT_ACTION_CONTRACT,
  ENDPOINT_SCAN_ACTION_CONTRACT,
  ENDPOINT_GET_ACTIONS_STATE_CONTRACT,
  ENDPOINT_SUSPEND_PROCESS_ACTION_CONTRACT,
  ENDPOINT_UNISOLATE_ACTION_CONTRACT,
  ENDPOINT_UPLOAD_ACTION_CONTRACT,
  GET_ENDPOINT_METADATA_LIST_CONTRACT,
  GET_ENDPOINT_METADATA_CONTRACT,
  GET_POLICY_RESPONSE_CONTRACT,
  GET_PROTECTION_UPDATES_NOTE_CONTRACT,
  CREATE_UPDATE_PROTECTION_UPDATES_NOTE_CONTRACT,
  DELETE_MONITORING_ENGINE_CONTRACT,
  DISABLE_MONITORING_ENGINE_CONTRACT,
  INIT_MONITORING_ENGINE_CONTRACT,
  SCHEDULE_MONITORING_ENGINE_CONTRACT,
  PRIV_MON_HEALTH_CONTRACT,
  PRIV_MON_PRIVILEGES_CONTRACT,
  CREATE_PRIV_MON_USER_CONTRACT,
  PRIVMON_BULK_UPLOAD_USERS_CSV_CONTRACT,
  DELETE_PRIV_MON_USER_CONTRACT,
  UPDATE_PRIV_MON_USER_CONTRACT,
  LIST_PRIV_MON_USERS_CONTRACT,
  INSTALL_PRIVILEGED_ACCESS_DETECTION_PACKAGE_CONTRACT,
  GET_PRIVILEGED_ACCESS_DETECTION_PACKAGE_STATUS_CONTRACT,
  INIT_ENTITY_STORE_CONTRACT,
  DELETE_ENTITY_ENGINES_CONTRACT,
  LIST_ENTITY_ENGINES_CONTRACT,
  DELETE_ENTITY_ENGINE_CONTRACT,
  GET_ENTITY_ENGINE_CONTRACT,
  INIT_ENTITY_ENGINE_CONTRACT,
  START_ENTITY_ENGINE_CONTRACT,
  STOP_ENTITY_ENGINE_CONTRACT,
  APPLY_ENTITY_ENGINE_DATAVIEW_INDICES_CONTRACT,
  DELETE_SINGLE_ENTITY_CONTRACT,
  UPSERT_ENTITY_CONTRACT,
  UPSERT_ENTITIES_BULK_CONTRACT,
  LIST_ENTITIES_CONTRACT,
  GET_ENTITY_STORE_STATUS_CONTRACT,
  DELETE_EXCEPTION_LIST_CONTRACT,
  READ_EXCEPTION_LIST_CONTRACT,
  CREATE_EXCEPTION_LIST_CONTRACT,
  UPDATE_EXCEPTION_LIST_CONTRACT,
  DUPLICATE_EXCEPTION_LIST_CONTRACT,
  EXPORT_EXCEPTION_LIST_CONTRACT,
  FIND_EXCEPTION_LISTS_CONTRACT,
  IMPORT_EXCEPTION_LIST_CONTRACT,
  DELETE_EXCEPTION_LIST_ITEM_CONTRACT,
  READ_EXCEPTION_LIST_ITEM_CONTRACT,
  CREATE_EXCEPTION_LIST_ITEM_CONTRACT,
  UPDATE_EXCEPTION_LIST_ITEM_CONTRACT,
  FIND_EXCEPTION_LIST_ITEMS_CONTRACT,
  READ_EXCEPTION_LIST_SUMMARY_CONTRACT,
  CREATE_SHARED_EXCEPTION_LIST_CONTRACT,
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
  DELETE_LIST_CONTRACT,
  READ_LIST_CONTRACT,
  PATCH_LIST_CONTRACT,
  CREATE_LIST_CONTRACT,
  UPDATE_LIST_CONTRACT,
  FIND_LISTS_CONTRACT,
  DELETE_LIST_INDEX_CONTRACT,
  READ_LIST_INDEX_CONTRACT,
  CREATE_LIST_INDEX_CONTRACT,
  DELETE_LIST_ITEM_CONTRACT,
  READ_LIST_ITEM_CONTRACT,
  PATCH_LIST_ITEM_CONTRACT,
  CREATE_LIST_ITEM_CONTRACT,
  UPDATE_LIST_ITEM_CONTRACT,
  EXPORT_LIST_ITEMS_CONTRACT,
  FIND_LIST_ITEMS_CONTRACT,
  IMPORT_LIST_ITEMS_CONTRACT,
  READ_LIST_PRIVILEGES_CONTRACT,
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
  ML_SYNC_CONTRACT,
  ML_UPDATE_JOBS_SPACES_CONTRACT,
  ML_UPDATE_TRAINED_MODELS_SPACES_CONTRACT,
  DELETE_NOTE_CONTRACT,
  GET_NOTES_CONTRACT,
  PERSIST_NOTE_ROUTE_CONTRACT,
  OBSERVABILITY_AI_ASSISTANT_CHAT_COMPLETE_CONTRACT,
  OSQUERY_FIND_LIVE_QUERIES_CONTRACT,
  OSQUERY_CREATE_LIVE_QUERY_CONTRACT,
  OSQUERY_GET_LIVE_QUERY_DETAILS_CONTRACT,
  OSQUERY_GET_LIVE_QUERY_RESULTS_CONTRACT,
  OSQUERY_FIND_PACKS_CONTRACT,
  OSQUERY_CREATE_PACKS_CONTRACT,
  OSQUERY_DELETE_PACKS_CONTRACT,
  OSQUERY_GET_PACKS_DETAILS_CONTRACT,
  OSQUERY_UPDATE_PACKS_CONTRACT,
  OSQUERY_FIND_SAVED_QUERIES_CONTRACT,
  OSQUERY_CREATE_SAVED_QUERY_CONTRACT,
  OSQUERY_DELETE_SAVED_QUERY_CONTRACT,
  OSQUERY_GET_SAVED_QUERY_DETAILS_CONTRACT,
  OSQUERY_UPDATE_SAVED_QUERY_CONTRACT,
  PERSIST_PINNED_EVENT_ROUTE_CONTRACT,
  CLEAN_UP_RISK_ENGINE_CONTRACT,
  CONFIGURE_RISK_ENGINE_SAVED_OBJECT_CONTRACT,
  SCHEDULE_RISK_ENGINE_NOW_CONTRACT,
  BULK_CREATE_SAVED_OBJECTS_CONTRACT,
  BULK_DELETE_SAVED_OBJECTS_CONTRACT,
  BULK_GET_SAVED_OBJECTS_CONTRACT,
  BULK_RESOLVE_SAVED_OBJECTS_CONTRACT,
  BULK_UPDATE_SAVED_OBJECTS_CONTRACT,
  POST_SAVED_OBJECTS_EXPORT_CONTRACT,
  FIND_SAVED_OBJECTS_CONTRACT,
  POST_SAVED_OBJECTS_IMPORT_CONTRACT,
  RESOLVE_IMPORT_ERRORS_CONTRACT,
  CREATE_SAVED_OBJECT_CONTRACT,
  GET_SAVED_OBJECT_CONTRACT,
  CREATE_SAVED_OBJECT_ID_CONTRACT,
  UPDATE_SAVED_OBJECT_CONTRACT,
  RESOLVE_SAVED_OBJECT_CONTRACT,
  PERFORM_ANONYMIZATION_FIELDS_BULK_ACTION_CONTRACT,
  FIND_ANONYMIZATION_FIELDS_CONTRACT,
  CHAT_COMPLETE_CONTRACT,
  DELETE_ALL_CONVERSATIONS_CONTRACT,
  CREATE_CONVERSATION_CONTRACT,
  FIND_CONVERSATIONS_CONTRACT,
  DELETE_CONVERSATION_CONTRACT,
  READ_CONVERSATION_CONTRACT,
  UPDATE_CONVERSATION_CONTRACT,
  GET_KNOWLEDGE_BASE_CONTRACT,
  POST_KNOWLEDGE_BASE_CONTRACT,
  READ_KNOWLEDGE_BASE_CONTRACT,
  CREATE_KNOWLEDGE_BASE_CONTRACT,
  CREATE_KNOWLEDGE_BASE_ENTRY_CONTRACT,
  PERFORM_KNOWLEDGE_BASE_ENTRY_BULK_ACTION_CONTRACT,
  FIND_KNOWLEDGE_BASE_ENTRIES_CONTRACT,
  DELETE_KNOWLEDGE_BASE_ENTRY_CONTRACT,
  READ_KNOWLEDGE_BASE_ENTRY_CONTRACT,
  UPDATE_KNOWLEDGE_BASE_ENTRY_CONTRACT,
  PERFORM_PROMPTS_BULK_ACTION_CONTRACT,
  FIND_PROMPTS_CONTRACT,
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
  GET_STREAMS_NAME_QUERIES_CONTRACT,
  POST_STREAMS_NAME_QUERIES_BULK_CONTRACT,
  DELETE_STREAMS_NAME_QUERIES_QUERYID_CONTRACT,
  PUT_STREAMS_NAME_QUERIES_QUERYID_CONTRACT,
  GET_STREAMS_NAME_SIGNIFICANT_EVENTS_CONTRACT,
  POST_STREAMS_NAME_SIGNIFICANT_EVENTS_GENERATE_CONTRACT,
  POST_STREAMS_NAME_SIGNIFICANT_EVENTS_PREVIEW_CONTRACT,
  GET_STREAMS_STREAMNAME_ATTACHMENTS_CONTRACT,
  POST_STREAMS_STREAMNAME_ATTACHMENTS_BULK_CONTRACT,
  DELETE_STREAMS_STREAMNAME_ATTACHMENTS_ATTACHMENTTYPE_ATTACHMENTID_CONTRACT,
  PUT_STREAMS_STREAMNAME_ATTACHMENTS_ATTACHMENTTYPE_ATTACHMENTID_CONTRACT,
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
  DELETE_TIMELINES_CONTRACT,
  GET_TIMELINE_CONTRACT,
  PATCH_TIMELINE_CONTRACT,
  CREATE_TIMELINES_CONTRACT,
  COPY_TIMELINE_CONTRACT,
  GET_DRAFT_TIMELINES_CONTRACT,
  CLEAN_DRAFT_TIMELINES_CONTRACT,
  EXPORT_TIMELINES_CONTRACT,
  PERSIST_FAVORITE_ROUTE_CONTRACT,
  IMPORT_TIMELINES_CONTRACT,
  INSTALL_PREPACKED_TIMELINES_CONTRACT,
  RESOLVE_TIMELINE_CONTRACT,
  GET_TIMELINES_CONTRACT,
  GET_UPGRADE_STATUS_CONTRACT,
  GET_UPTIME_SETTINGS_CONTRACT,
  PUT_UPTIME_SETTINGS_CONTRACT,
  FIND_SLOS_OP_CONTRACT,
  CREATE_SLO_OP_CONTRACT,
  BULK_DELETE_OP_CONTRACT,
  BULK_DELETE_STATUS_OP_CONTRACT,
  DELETE_ROLLUP_DATA_OP_CONTRACT,
  DELETE_SLO_INSTANCES_OP_CONTRACT,
  DELETE_SLO_OP_CONTRACT,
  GET_SLO_OP_CONTRACT,
  UPDATE_SLO_OP_CONTRACT,
  RESET_SLO_OP_CONTRACT,
  DISABLE_SLO_OP_CONTRACT,
  ENABLE_SLO_OP_CONTRACT,
  GET_DEFINITIONS_OP_CONTRACT,
];
