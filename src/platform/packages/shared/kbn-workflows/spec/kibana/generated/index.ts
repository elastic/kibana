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
 * Generated at: 2025-11-27T08:51:18.973Z
 * Source: /oas_docs/output/kibana.yaml (526 APIs)
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
import { GETALERTINGHEALTH_CONTRACT } from './kibana.get_alerting_health.gen';
import { GETRULETYPES_CONTRACT } from './kibana.get_rule_types.gen';
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
import { CREATEAGENTKEY_CONTRACT } from './kibana.create_agent_key.gen';
import { SAVEAPMSERVERSCHEMA_CONTRACT } from './kibana.save_apm_server_schema.gen';
import { CREATEANNOTATION_CONTRACT } from './kibana.create_annotation.gen';
import { GETANNOTATION_CONTRACT } from './kibana.get_annotation.gen';
import { DELETEAGENTCONFIGURATION_CONTRACT } from './kibana.delete_agent_configuration.gen';
import { GETAGENTCONFIGURATIONS_CONTRACT } from './kibana.get_agent_configurations.gen';
import { CREATEUPDATEAGENTCONFIGURATION_CONTRACT } from './kibana.create_update_agent_configuration.gen';
import { GETAGENTNAMEFORSERVICE_CONTRACT } from './kibana.get_agent_name_for_service.gen';
import { GETENVIRONMENTSFORSERVICE_CONTRACT } from './kibana.get_environments_for_service.gen';
import { SEARCHSINGLECONFIGURATION_CONTRACT } from './kibana.search_single_configuration.gen';
import { GETSINGLEAGENTCONFIGURATION_CONTRACT } from './kibana.get_single_agent_configuration.gen';
import { GETSOURCEMAPS_CONTRACT } from './kibana.get_source_maps.gen';
import { UPLOADSOURCEMAP_CONTRACT } from './kibana.upload_source_map.gen';
import { DELETESOURCEMAP_CONTRACT } from './kibana.delete_source_map.gen';
import { DELETEASSETCRITICALITYRECORD_CONTRACT } from './kibana.delete_asset_criticality_record.gen';
import { GETASSETCRITICALITYRECORD_CONTRACT } from './kibana.get_asset_criticality_record.gen';
import { CREATEASSETCRITICALITYRECORD_CONTRACT } from './kibana.create_asset_criticality_record.gen';
import { BULKUPSERTASSETCRITICALITYRECORDS_CONTRACT } from './kibana.bulk_upsert_asset_criticality_records.gen';
import { FINDASSETCRITICALITYRECORDS_CONTRACT } from './kibana.find_asset_criticality_records.gen';
import { POSTATTACKDISCOVERYBULK_CONTRACT } from './kibana.post_attack_discovery_bulk.gen';
import { ATTACKDISCOVERYFIND_CONTRACT } from './kibana.attack_discovery_find.gen';
import { POSTATTACKDISCOVERYGENERATE_CONTRACT } from './kibana.post_attack_discovery_generate.gen';
import { GETATTACKDISCOVERYGENERATIONS_CONTRACT } from './kibana.get_attack_discovery_generations.gen';
import { GETATTACKDISCOVERYGENERATION_CONTRACT } from './kibana.get_attack_discovery_generation.gen';
import { POSTATTACKDISCOVERYGENERATIONSDISMISS_CONTRACT } from './kibana.post_attack_discovery_generations_dismiss.gen';
import { CREATEATTACKDISCOVERYSCHEDULES_CONTRACT } from './kibana.create_attack_discovery_schedules.gen';
import { FINDATTACKDISCOVERYSCHEDULES_CONTRACT } from './kibana.find_attack_discovery_schedules.gen';
import { DELETEATTACKDISCOVERYSCHEDULES_CONTRACT } from './kibana.delete_attack_discovery_schedules.gen';
import { GETATTACKDISCOVERYSCHEDULES_CONTRACT } from './kibana.get_attack_discovery_schedules.gen';
import { UPDATEATTACKDISCOVERYSCHEDULES_CONTRACT } from './kibana.update_attack_discovery_schedules.gen';
import { DISABLEATTACKDISCOVERYSCHEDULES_CONTRACT } from './kibana.disable_attack_discovery_schedules.gen';
import { ENABLEATTACKDISCOVERYSCHEDULES_CONTRACT } from './kibana.enable_attack_discovery_schedules.gen';
import { DELETECASEDEFAULTSPACE_CONTRACT } from './kibana.delete_case_default_space.gen';
import { UPDATECASEDEFAULTSPACE_CONTRACT } from './kibana.update_case_default_space.gen';
import { CREATECASEDEFAULTSPACE_CONTRACT } from './kibana.create_case_default_space.gen';
import { FINDCASESDEFAULTSPACE_CONTRACT } from './kibana.find_cases_default_space.gen';
import { GETCASEDEFAULTSPACE_CONTRACT } from './kibana.get_case_default_space.gen';
import { GETCASEALERTSDEFAULTSPACE_CONTRACT } from './kibana.get_case_alerts_default_space.gen';
import { DELETECASECOMMENTSDEFAULTSPACE_CONTRACT } from './kibana.delete_case_comments_default_space.gen';
import { UPDATECASECOMMENTDEFAULTSPACE_CONTRACT } from './kibana.update_case_comment_default_space.gen';
import { ADDCASECOMMENTDEFAULTSPACE_CONTRACT } from './kibana.add_case_comment_default_space.gen';
import { FINDCASECOMMENTSDEFAULTSPACE_CONTRACT } from './kibana.find_case_comments_default_space.gen';
import { DELETECASECOMMENTDEFAULTSPACE_CONTRACT } from './kibana.delete_case_comment_default_space.gen';
import { GETCASECOMMENTDEFAULTSPACE_CONTRACT } from './kibana.get_case_comment_default_space.gen';
import { PUSHCASEDEFAULTSPACE_CONTRACT } from './kibana.push_case_default_space.gen';
import { ADDCASEFILEDEFAULTSPACE_CONTRACT } from './kibana.add_case_file_default_space.gen';
import { FINDCASEACTIVITYDEFAULTSPACE_CONTRACT } from './kibana.find_case_activity_default_space.gen';
import { GETCASESBYALERTDEFAULTSPACE_CONTRACT } from './kibana.get_cases_by_alert_default_space.gen';
import { GETCASECONFIGURATIONDEFAULTSPACE_CONTRACT } from './kibana.get_case_configuration_default_space.gen';
import { SETCASECONFIGURATIONDEFAULTSPACE_CONTRACT } from './kibana.set_case_configuration_default_space.gen';
import { UPDATECASECONFIGURATIONDEFAULTSPACE_CONTRACT } from './kibana.update_case_configuration_default_space.gen';
import { FINDCASECONNECTORSDEFAULTSPACE_CONTRACT } from './kibana.find_case_connectors_default_space.gen';
import { GETCASEREPORTERSDEFAULTSPACE_CONTRACT } from './kibana.get_case_reporters_default_space.gen';
import { GETCASETAGSDEFAULTSPACE_CONTRACT } from './kibana.get_case_tags_default_space.gen';
import { GETALLDATAVIEWSDEFAULT_CONTRACT } from './kibana.get_all_data_views_default.gen';
import { CREATEDATAVIEWDEFAULTW_CONTRACT } from './kibana.create_data_view_defaultw.gen';
import { DELETEDATAVIEWDEFAULT_CONTRACT } from './kibana.delete_data_view_default.gen';
import { GETDATAVIEWDEFAULT_CONTRACT } from './kibana.get_data_view_default.gen';
import { UPDATEDATAVIEWDEFAULT_CONTRACT } from './kibana.update_data_view_default.gen';
import { UPDATEFIELDSMETADATADEFAULT_CONTRACT } from './kibana.update_fields_metadata_default.gen';
import { CREATERUNTIMEFIELDDEFAULT_CONTRACT } from './kibana.create_runtime_field_default.gen';
import { CREATEUPDATERUNTIMEFIELDDEFAULT_CONTRACT } from './kibana.create_update_runtime_field_default.gen';
import { DELETERUNTIMEFIELDDEFAULT_CONTRACT } from './kibana.delete_runtime_field_default.gen';
import { GETRUNTIMEFIELDDEFAULT_CONTRACT } from './kibana.get_runtime_field_default.gen';
import { UPDATERUNTIMEFIELDDEFAULT_CONTRACT } from './kibana.update_runtime_field_default.gen';
import { GETDEFAULTDATAVIEWDEFAULT_CONTRACT } from './kibana.get_default_data_view_default.gen';
import { SETDEFAULTDATAILVIEWDEFAULT_CONTRACT } from './kibana.set_default_datail_view_default.gen';
import { SWAPDATAVIEWSDEFAULT_CONTRACT } from './kibana.swap_data_views_default.gen';
import { PREVIEWSWAPDATAVIEWSDEFAULT_CONTRACT } from './kibana.preview_swap_data_views_default.gen';
import { DELETEALERTSINDEX_CONTRACT } from './kibana.delete_alerts_index.gen';
import { READALERTSINDEX_CONTRACT } from './kibana.read_alerts_index.gen';
import { CREATEALERTSINDEX_CONTRACT } from './kibana.create_alerts_index.gen';
import { READPRIVILEGES_CONTRACT } from './kibana.read_privileges.gen';
import { DELETERULE_CONTRACT } from './kibana.delete_rule.gen';
import { READRULE_CONTRACT } from './kibana.read_rule.gen';
import { PATCHRULE_CONTRACT } from './kibana.patch_rule.gen';
import { CREATERULE_CONTRACT } from './kibana.create_rule.gen';
import { UPDATERULE_CONTRACT } from './kibana.update_rule.gen';
import { PERFORMRULESBULKACTION_CONTRACT } from './kibana.perform_rules_bulk_action.gen';
import { EXPORTRULES_CONTRACT } from './kibana.export_rules.gen';
import { FINDRULES_CONTRACT } from './kibana.find_rules.gen';
import { IMPORTRULES_CONTRACT } from './kibana.import_rules.gen';
import { CREATERULEEXCEPTIONLISTITEMS_CONTRACT } from './kibana.create_rule_exception_list_items.gen';
import { INSTALLPREBUILTRULESANDTIMELINES_CONTRACT } from './kibana.install_prebuilt_rules_and_timelines.gen';
import { READPREBUILTRULESANDTIMELINESSTATUS_CONTRACT } from './kibana.read_prebuilt_rules_and_timelines_status.gen';
import { RULEPREVIEW_CONTRACT } from './kibana.rule_preview.gen';
import { SETALERTASSIGNEES_CONTRACT } from './kibana.set_alert_assignees.gen';
import { FINALIZEALERTSMIGRATION_CONTRACT } from './kibana.finalize_alerts_migration.gen';
import { ALERTSMIGRATIONCLEANUP_CONTRACT } from './kibana.alerts_migration_cleanup.gen';
import { CREATEALERTSMIGRATION_CONTRACT } from './kibana.create_alerts_migration.gen';
import { READALERTSMIGRATIONSTATUS_CONTRACT } from './kibana.read_alerts_migration_status.gen';
import { SEARCHALERTS_CONTRACT } from './kibana.search_alerts.gen';
import { SETALERTSSTATUS_CONTRACT } from './kibana.set_alerts_status.gen';
import { SETALERTTAGS_CONTRACT } from './kibana.set_alert_tags.gen';
import { READTAGS_CONTRACT } from './kibana.read_tags.gen';
import { ROTATEENCRYPTIONKEY_CONTRACT } from './kibana.rotate_encryption_key.gen';
import { CREATEENDPOINTLIST_CONTRACT } from './kibana.create_endpoint_list.gen';
import { DELETEENDPOINTLISTITEM_CONTRACT } from './kibana.delete_endpoint_list_item.gen';
import { READENDPOINTLISTITEM_CONTRACT } from './kibana.read_endpoint_list_item.gen';
import { CREATEENDPOINTLISTITEM_CONTRACT } from './kibana.create_endpoint_list_item.gen';
import { UPDATEENDPOINTLISTITEM_CONTRACT } from './kibana.update_endpoint_list_item.gen';
import { FINDENDPOINTLISTITEMS_CONTRACT } from './kibana.find_endpoint_list_items.gen';
import { ENDPOINTGETACTIONSLIST_CONTRACT } from './kibana.endpoint_get_actions_list.gen';
import { ENDPOINTGETACTIONSSTATUS_CONTRACT } from './kibana.endpoint_get_actions_status.gen';
import { ENDPOINTGETACTIONSDETAILS_CONTRACT } from './kibana.endpoint_get_actions_details.gen';
import { ENDPOINTFILEINFO_CONTRACT } from './kibana.endpoint_file_info.gen';
import { ENDPOINTFILEDOWNLOAD_CONTRACT } from './kibana.endpoint_file_download.gen';
import { CANCELACTION_CONTRACT } from './kibana.cancel_action.gen';
import { ENDPOINTEXECUTEACTION_CONTRACT } from './kibana.endpoint_execute_action.gen';
import { ENDPOINTGETFILEACTION_CONTRACT } from './kibana.endpoint_get_file_action.gen';
import { ENDPOINTISOLATEACTION_CONTRACT } from './kibana.endpoint_isolate_action.gen';
import { ENDPOINTKILLPROCESSACTION_CONTRACT } from './kibana.endpoint_kill_process_action.gen';
import { ENDPOINTGETPROCESSESACTION_CONTRACT } from './kibana.endpoint_get_processes_action.gen';
import { RUNSCRIPTACTION_CONTRACT } from './kibana.run_script_action.gen';
import { ENDPOINTSCANACTION_CONTRACT } from './kibana.endpoint_scan_action.gen';
import { ENDPOINTGETACTIONSSTATE_CONTRACT } from './kibana.endpoint_get_actions_state.gen';
import { ENDPOINTSUSPENDPROCESSACTION_CONTRACT } from './kibana.endpoint_suspend_process_action.gen';
import { ENDPOINTUNISOLATEACTION_CONTRACT } from './kibana.endpoint_unisolate_action.gen';
import { ENDPOINTUPLOADACTION_CONTRACT } from './kibana.endpoint_upload_action.gen';
import { GETENDPOINTMETADATALIST_CONTRACT } from './kibana.get_endpoint_metadata_list.gen';
import { GETENDPOINTMETADATA_CONTRACT } from './kibana.get_endpoint_metadata.gen';
import { GETPOLICYRESPONSE_CONTRACT } from './kibana.get_policy_response.gen';
import { GETPROTECTIONUPDATESNOTE_CONTRACT } from './kibana.get_protection_updates_note.gen';
import { CREATEUPDATEPROTECTIONUPDATESNOTE_CONTRACT } from './kibana.create_update_protection_updates_note.gen';
import { DELETEMONITORINGENGINE_CONTRACT } from './kibana.delete_monitoring_engine.gen';
import { DISABLEMONITORINGENGINE_CONTRACT } from './kibana.disable_monitoring_engine.gen';
import { INITMONITORINGENGINE_CONTRACT } from './kibana.init_monitoring_engine.gen';
import { SCHEDULEMONITORINGENGINE_CONTRACT } from './kibana.schedule_monitoring_engine.gen';
import { PRIVMONHEALTH_CONTRACT } from './kibana.priv_mon_health.gen';
import { PRIVMONPRIVILEGES_CONTRACT } from './kibana.priv_mon_privileges.gen';
import { CREATEPRIVMONUSER_CONTRACT } from './kibana.create_priv_mon_user.gen';
import { PRIVMONBULKUPLOADUSERSCSV_CONTRACT } from './kibana.privmon_bulk_upload_users_csv.gen';
import { DELETEPRIVMONUSER_CONTRACT } from './kibana.delete_priv_mon_user.gen';
import { UPDATEPRIVMONUSER_CONTRACT } from './kibana.update_priv_mon_user.gen';
import { LISTPRIVMONUSERS_CONTRACT } from './kibana.list_priv_mon_users.gen';
import { INSTALLPRIVILEGEDACCESSDETECTIONPACKAGE_CONTRACT } from './kibana.install_privileged_access_detection_package.gen';
import { GETPRIVILEGEDACCESSDETECTIONPACKAGESTATUS_CONTRACT } from './kibana.get_privileged_access_detection_package_status.gen';
import { INITENTITYSTORE_CONTRACT } from './kibana.init_entity_store.gen';
import { DELETEENTITYENGINES_CONTRACT } from './kibana.delete_entity_engines.gen';
import { LISTENTITYENGINES_CONTRACT } from './kibana.list_entity_engines.gen';
import { DELETEENTITYENGINE_CONTRACT } from './kibana.delete_entity_engine.gen';
import { GETENTITYENGINE_CONTRACT } from './kibana.get_entity_engine.gen';
import { INITENTITYENGINE_CONTRACT } from './kibana.init_entity_engine.gen';
import { STARTENTITYENGINE_CONTRACT } from './kibana.start_entity_engine.gen';
import { STOPENTITYENGINE_CONTRACT } from './kibana.stop_entity_engine.gen';
import { APPLYENTITYENGINEDATAVIEWINDICES_CONTRACT } from './kibana.apply_entity_engine_dataview_indices.gen';
import { DELETESINGLEENTITY_CONTRACT } from './kibana.delete_single_entity.gen';
import { UPSERTENTITY_CONTRACT } from './kibana.upsert_entity.gen';
import { UPSERTENTITIESBULK_CONTRACT } from './kibana.upsert_entities_bulk.gen';
import { LISTENTITIES_CONTRACT } from './kibana.list_entities.gen';
import { GETENTITYSTORESTATUS_CONTRACT } from './kibana.get_entity_store_status.gen';
import { DELETEEXCEPTIONLIST_CONTRACT } from './kibana.delete_exception_list.gen';
import { READEXCEPTIONLIST_CONTRACT } from './kibana.read_exception_list.gen';
import { CREATEEXCEPTIONLIST_CONTRACT } from './kibana.create_exception_list.gen';
import { UPDATEEXCEPTIONLIST_CONTRACT } from './kibana.update_exception_list.gen';
import { DUPLICATEEXCEPTIONLIST_CONTRACT } from './kibana.duplicate_exception_list.gen';
import { EXPORTEXCEPTIONLIST_CONTRACT } from './kibana.export_exception_list.gen';
import { FINDEXCEPTIONLISTS_CONTRACT } from './kibana.find_exception_lists.gen';
import { IMPORTEXCEPTIONLIST_CONTRACT } from './kibana.import_exception_list.gen';
import { DELETEEXCEPTIONLISTITEM_CONTRACT } from './kibana.delete_exception_list_item.gen';
import { READEXCEPTIONLISTITEM_CONTRACT } from './kibana.read_exception_list_item.gen';
import { CREATEEXCEPTIONLISTITEM_CONTRACT } from './kibana.create_exception_list_item.gen';
import { UPDATEEXCEPTIONLISTITEM_CONTRACT } from './kibana.update_exception_list_item.gen';
import { FINDEXCEPTIONLISTITEMS_CONTRACT } from './kibana.find_exception_list_items.gen';
import { READEXCEPTIONLISTSUMMARY_CONTRACT } from './kibana.read_exception_list_summary.gen';
import { CREATESHAREDEXCEPTIONLIST_CONTRACT } from './kibana.create_shared_exception_list.gen';
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
import { DELETELIST_CONTRACT } from './kibana.delete_list.gen';
import { READLIST_CONTRACT } from './kibana.read_list.gen';
import { PATCHLIST_CONTRACT } from './kibana.patch_list.gen';
import { CREATELIST_CONTRACT } from './kibana.create_list.gen';
import { UPDATELIST_CONTRACT } from './kibana.update_list.gen';
import { FINDLISTS_CONTRACT } from './kibana.find_lists.gen';
import { DELETELISTINDEX_CONTRACT } from './kibana.delete_list_index.gen';
import { READLISTINDEX_CONTRACT } from './kibana.read_list_index.gen';
import { CREATELISTINDEX_CONTRACT } from './kibana.create_list_index.gen';
import { DELETELISTITEM_CONTRACT } from './kibana.delete_list_item.gen';
import { READLISTITEM_CONTRACT } from './kibana.read_list_item.gen';
import { PATCHLISTITEM_CONTRACT } from './kibana.patch_list_item.gen';
import { CREATELISTITEM_CONTRACT } from './kibana.create_list_item.gen';
import { UPDATELISTITEM_CONTRACT } from './kibana.update_list_item.gen';
import { EXPORTLISTITEMS_CONTRACT } from './kibana.export_list_items.gen';
import { FINDLISTITEMS_CONTRACT } from './kibana.find_list_items.gen';
import { IMPORTLISTITEMS_CONTRACT } from './kibana.import_list_items.gen';
import { READLISTPRIVILEGES_CONTRACT } from './kibana.read_list_privileges.gen';
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
import { MLSYNC_CONTRACT } from './kibana.ml_sync.gen';
import { DELETENOTE_CONTRACT } from './kibana.delete_note.gen';
import { GETNOTES_CONTRACT } from './kibana.get_notes.gen';
import { PERSISTNOTEROUTE_CONTRACT } from './kibana.persist_note_route.gen';
import { OBSERVABILITY_AI_ASSISTANT_CHAT_COMPLETE_CONTRACT } from './kibana.observability_ai_assistant_chat_complete.gen';
import { OSQUERYFINDLIVEQUERIES_CONTRACT } from './kibana.osquery_find_live_queries.gen';
import { OSQUERYCREATELIVEQUERY_CONTRACT } from './kibana.osquery_create_live_query.gen';
import { OSQUERYGETLIVEQUERYDETAILS_CONTRACT } from './kibana.osquery_get_live_query_details.gen';
import { OSQUERYGETLIVEQUERYRESULTS_CONTRACT } from './kibana.osquery_get_live_query_results.gen';
import { OSQUERYFINDPACKS_CONTRACT } from './kibana.osquery_find_packs.gen';
import { OSQUERYCREATEPACKS_CONTRACT } from './kibana.osquery_create_packs.gen';
import { OSQUERYDELETEPACKS_CONTRACT } from './kibana.osquery_delete_packs.gen';
import { OSQUERYGETPACKSDETAILS_CONTRACT } from './kibana.osquery_get_packs_details.gen';
import { OSQUERYUPDATEPACKS_CONTRACT } from './kibana.osquery_update_packs.gen';
import { OSQUERYFINDSAVEDQUERIES_CONTRACT } from './kibana.osquery_find_saved_queries.gen';
import { OSQUERYCREATESAVEDQUERY_CONTRACT } from './kibana.osquery_create_saved_query.gen';
import { OSQUERYDELETESAVEDQUERY_CONTRACT } from './kibana.osquery_delete_saved_query.gen';
import { OSQUERYGETSAVEDQUERYDETAILS_CONTRACT } from './kibana.osquery_get_saved_query_details.gen';
import { OSQUERYUPDATESAVEDQUERY_CONTRACT } from './kibana.osquery_update_saved_query.gen';
import { PERSISTPINNEDEVENTROUTE_CONTRACT } from './kibana.persist_pinned_event_route.gen';
import { CLEANUPRISKENGINE_CONTRACT } from './kibana.clean_up_risk_engine.gen';
import { CONFIGURERISKENGINESAVEDOBJECT_CONTRACT } from './kibana.configure_risk_engine_saved_object.gen';
import { SCHEDULERISKENGINENOW_CONTRACT } from './kibana.schedule_risk_engine_now.gen';
import { BULKCREATESAVEDOBJECTS_CONTRACT } from './kibana.bulk_create_saved_objects.gen';
import { BULKDELETESAVEDOBJECTS_CONTRACT } from './kibana.bulk_delete_saved_objects.gen';
import { BULKGETSAVEDOBJECTS_CONTRACT } from './kibana.bulk_get_saved_objects.gen';
import { BULKRESOLVESAVEDOBJECTS_CONTRACT } from './kibana.bulk_resolve_saved_objects.gen';
import { BULKUPDATESAVEDOBJECTS_CONTRACT } from './kibana.bulk_update_saved_objects.gen';
import { POST_SAVED_OBJECTS_EXPORT_CONTRACT } from './kibana.post_saved_objects_export.gen';
import { FINDSAVEDOBJECTS_CONTRACT } from './kibana.find_saved_objects.gen';
import { POST_SAVED_OBJECTS_IMPORT_CONTRACT } from './kibana.post_saved_objects_import.gen';
import { RESOLVEIMPORTERRORS_CONTRACT } from './kibana.resolve_import_errors.gen';
import { CREATESAVEDOBJECT_CONTRACT } from './kibana.create_saved_object.gen';
import { GETSAVEDOBJECT_CONTRACT } from './kibana.get_saved_object.gen';
import { CREATESAVEDOBJECTID_CONTRACT } from './kibana.create_saved_object_id.gen';
import { UPDATESAVEDOBJECT_CONTRACT } from './kibana.update_saved_object.gen';
import { RESOLVESAVEDOBJECT_CONTRACT } from './kibana.resolve_saved_object.gen';
import { PERFORMANONYMIZATIONFIELDSBULKACTION_CONTRACT } from './kibana.perform_anonymization_fields_bulk_action.gen';
import { FINDANONYMIZATIONFIELDS_CONTRACT } from './kibana.find_anonymization_fields.gen';
import { CHATCOMPLETE_CONTRACT } from './kibana.chat_complete.gen';
import { DELETEALLCONVERSATIONS_CONTRACT } from './kibana.delete_all_conversations.gen';
import { CREATECONVERSATION_CONTRACT } from './kibana.create_conversation.gen';
import { FINDCONVERSATIONS_CONTRACT } from './kibana.find_conversations.gen';
import { DELETECONVERSATION_CONTRACT } from './kibana.delete_conversation.gen';
import { READCONVERSATION_CONTRACT } from './kibana.read_conversation.gen';
import { UPDATECONVERSATION_CONTRACT } from './kibana.update_conversation.gen';
import { GETKNOWLEDGEBASE_CONTRACT } from './kibana.get_knowledge_base.gen';
import { POSTKNOWLEDGEBASE_CONTRACT } from './kibana.post_knowledge_base.gen';
import { READKNOWLEDGEBASE_CONTRACT } from './kibana.read_knowledge_base.gen';
import { CREATEKNOWLEDGEBASE_CONTRACT } from './kibana.create_knowledge_base.gen';
import { CREATEKNOWLEDGEBASEENTRY_CONTRACT } from './kibana.create_knowledge_base_entry.gen';
import { PERFORMKNOWLEDGEBASEENTRYBULKACTION_CONTRACT } from './kibana.perform_knowledge_base_entry_bulk_action.gen';
import { FINDKNOWLEDGEBASEENTRIES_CONTRACT } from './kibana.find_knowledge_base_entries.gen';
import { DELETEKNOWLEDGEBASEENTRY_CONTRACT } from './kibana.delete_knowledge_base_entry.gen';
import { READKNOWLEDGEBASEENTRY_CONTRACT } from './kibana.read_knowledge_base_entry.gen';
import { UPDATEKNOWLEDGEBASEENTRY_CONTRACT } from './kibana.update_knowledge_base_entry.gen';
import { PERFORMPROMPTSBULKACTION_CONTRACT } from './kibana.perform_prompts_bulk_action.gen';
import { FINDPROMPTS_CONTRACT } from './kibana.find_prompts.gen';
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
import { GET_STREAMS_NAME_DASHBOARDS_CONTRACT } from './kibana.get_streams_name_dashboards.gen';
import { POST_STREAMS_NAME_DASHBOARDS_BULK_CONTRACT } from './kibana.post_streams_name_dashboards_bulk.gen';
import { DELETE_STREAMS_NAME_DASHBOARDS_DASHBOARDID_CONTRACT } from './kibana.delete_streams_name_dashboards_dashboardid.gen';
import { PUT_STREAMS_NAME_DASHBOARDS_DASHBOARDID_CONTRACT } from './kibana.put_streams_name_dashboards_dashboardid.gen';
import { GET_STREAMS_NAME_QUERIES_CONTRACT } from './kibana.get_streams_name_queries.gen';
import { POST_STREAMS_NAME_QUERIES_BULK_CONTRACT } from './kibana.post_streams_name_queries_bulk.gen';
import { DELETE_STREAMS_NAME_QUERIES_QUERYID_CONTRACT } from './kibana.delete_streams_name_queries_queryid.gen';
import { PUT_STREAMS_NAME_QUERIES_QUERYID_CONTRACT } from './kibana.put_streams_name_queries_queryid.gen';
import { GET_STREAMS_NAME_RULES_CONTRACT } from './kibana.get_streams_name_rules.gen';
import { DELETE_STREAMS_NAME_RULES_RULEID_CONTRACT } from './kibana.delete_streams_name_rules_ruleid.gen';
import { PUT_STREAMS_NAME_RULES_RULEID_CONTRACT } from './kibana.put_streams_name_rules_ruleid.gen';
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
import { DELETETIMELINES_CONTRACT } from './kibana.delete_timelines.gen';
import { GETTIMELINE_CONTRACT } from './kibana.get_timeline.gen';
import { PATCHTIMELINE_CONTRACT } from './kibana.patch_timeline.gen';
import { CREATETIMELINES_CONTRACT } from './kibana.create_timelines.gen';
import { COPYTIMELINE_CONTRACT } from './kibana.copy_timeline.gen';
import { GETDRAFTTIMELINES_CONTRACT } from './kibana.get_draft_timelines.gen';
import { CLEANDRAFTTIMELINES_CONTRACT } from './kibana.clean_draft_timelines.gen';
import { EXPORTTIMELINES_CONTRACT } from './kibana.export_timelines.gen';
import { PERSISTFAVORITEROUTE_CONTRACT } from './kibana.persist_favorite_route.gen';
import { IMPORTTIMELINES_CONTRACT } from './kibana.import_timelines.gen';
import { INSTALLPREPACKEDTIMELINES_CONTRACT } from './kibana.install_prepacked_timelines.gen';
import { RESOLVETIMELINE_CONTRACT } from './kibana.resolve_timeline.gen';
import { GETTIMELINES_CONTRACT } from './kibana.get_timelines.gen';
import { GET_UPGRADE_STATUS_CONTRACT } from './kibana.get_upgrade_status.gen';
import { GET_UPTIME_SETTINGS_CONTRACT } from './kibana.get_uptime_settings.gen';
import { PUT_UPTIME_SETTINGS_CONTRACT } from './kibana.put_uptime_settings.gen';
import { FINDSLOSOP_CONTRACT } from './kibana.find_slos_op.gen';
import { CREATESLOOP_CONTRACT } from './kibana.create_slo_op.gen';
import { BULKDELETEOP_CONTRACT } from './kibana.bulk_delete_op.gen';
import { BULKDELETESTATUSOP_CONTRACT } from './kibana.bulk_delete_status_op.gen';
import { DELETEROLLUPDATAOP_CONTRACT } from './kibana.delete_rollup_data_op.gen';
import { DELETESLOINSTANCESOP_CONTRACT } from './kibana.delete_slo_instances_op.gen';
import { DELETESLOOP_CONTRACT } from './kibana.delete_slo_op.gen';
import { GETSLOOP_CONTRACT } from './kibana.get_slo_op.gen';
import { UPDATESLOOP_CONTRACT } from './kibana.update_slo_op.gen';
import { RESETSLOOP_CONTRACT } from './kibana.reset_slo_op.gen';
import { DISABLESLOOP_CONTRACT } from './kibana.disable_slo_op.gen';
import { ENABLESLOOP_CONTRACT } from './kibana.enable_slo_op.gen';
import { GETDEFINITIONSOP_CONTRACT } from './kibana.get_definitions_op.gen';

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
