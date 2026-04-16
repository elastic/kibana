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
 * Generated at: 2026-04-16T07:50:16.509Z
 * Source: /oas_docs/output/kibana.yaml (102 APIs)
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */
/* eslint-disable import/order */

import type { InternalConnectorContract } from '../../../types/latest';

// import contracts from individual files
import { GET_ALERTING_HEALTH_CONTRACT } from './kibana.get_alerting_health.gen';
import { GET_RULE_TYPES_CONTRACT } from './kibana.get_rule_types.gen';
import { DELETE_ALERTING_RULE_ID_CONTRACT } from './kibana.delete_alerting_rule_id.gen';
import { GET_ALERTING_RULE_ID_CONTRACT } from './kibana.get_alerting_rule_id.gen';
import { POST_ALERTING_RULE_ID_CONTRACT } from './kibana.post_alerting_rule_id.gen';
import { PUT_ALERTING_RULE_ID_CONTRACT } from './kibana.put_alerting_rule_id.gen';
import { GET_ALERTING_RULES_FIND_CONTRACT } from './kibana.get_alerting_rules_find.gen';
import { DELETE_CASE_DEFAULT_SPACE_CONTRACT } from './kibana.delete_case_default_space.gen';
import { UPDATE_CASE_CONTRACT } from './kibana.update_case.gen';
import { CREATE_CASE_CONTRACT } from './kibana.create_case.gen';
import { FIND_CASES_DEFAULT_SPACE_CONTRACT } from './kibana.find_cases_default_space.gen';
import { GET_CASE_CONTRACT } from './kibana.get_case.gen';
import { GET_CASE_ALERTS_DEFAULT_SPACE_CONTRACT } from './kibana.get_case_alerts_default_space.gen';
import { DELETE_CASE_COMMENTS_DEFAULT_SPACE_CONTRACT } from './kibana.delete_case_comments_default_space.gen';
import { UPDATE_CASE_COMMENT_DEFAULT_SPACE_CONTRACT } from './kibana.update_case_comment_default_space.gen';
import { ADD_CASE_COMMENT_CONTRACT } from './kibana.add_case_comment.gen';
import { FIND_CASE_COMMENTS_DEFAULT_SPACE_CONTRACT } from './kibana.find_case_comments_default_space.gen';
import { DELETE_CASE_COMMENT_DEFAULT_SPACE_CONTRACT } from './kibana.delete_case_comment_default_space.gen';
import { GET_CASE_COMMENT_DEFAULT_SPACE_CONTRACT } from './kibana.get_case_comment_default_space.gen';
import { PUSH_CASE_DEFAULT_SPACE_CONTRACT } from './kibana.push_case_default_space.gen';
import { FIND_CASE_ACTIVITY_DEFAULT_SPACE_CONTRACT } from './kibana.find_case_activity_default_space.gen';
import { GET_CASES_BY_ALERT_DEFAULT_SPACE_CONTRACT } from './kibana.get_cases_by_alert_default_space.gen';
import { GET_CASE_CONFIGURATION_DEFAULT_SPACE_CONTRACT } from './kibana.get_case_configuration_default_space.gen';
import { SET_CASE_CONFIGURATION_DEFAULT_SPACE_CONTRACT } from './kibana.set_case_configuration_default_space.gen';
import { UPDATE_CASE_CONFIGURATION_DEFAULT_SPACE_CONTRACT } from './kibana.update_case_configuration_default_space.gen';
import { FIND_CASE_CONNECTORS_DEFAULT_SPACE_CONTRACT } from './kibana.find_case_connectors_default_space.gen';
import { GET_CASE_REPORTERS_DEFAULT_SPACE_CONTRACT } from './kibana.get_case_reporters_default_space.gen';
import { GET_CASE_TAGS_DEFAULT_SPACE_CONTRACT } from './kibana.get_case_tags_default_space.gen';
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
import { RULE_PREVIEW_CONTRACT } from './kibana.rule_preview.gen';
import { SET_ALERT_ASSIGNEES_CONTRACT } from './kibana.set_alert_assignees.gen';
import { SEARCH_ALERTS_CONTRACT } from './kibana.search_alerts.gen';
import { SET_ALERTS_STATUS_CONTRACT } from './kibana.set_alerts_status.gen';
import { SET_ALERT_TAGS_CONTRACT } from './kibana.set_alert_tags.gen';
import { READ_TAGS_CONTRACT } from './kibana.read_tags.gen';
import { CREATE_ENDPOINT_LIST_CONTRACT } from './kibana.create_endpoint_list.gen';
import { DELETE_ENDPOINT_LIST_ITEM_CONTRACT } from './kibana.delete_endpoint_list_item.gen';
import { READ_ENDPOINT_LIST_ITEM_CONTRACT } from './kibana.read_endpoint_list_item.gen';
import { CREATE_ENDPOINT_LIST_ITEM_CONTRACT } from './kibana.create_endpoint_list_item.gen';
import { UPDATE_ENDPOINT_LIST_ITEM_CONTRACT } from './kibana.update_endpoint_list_item.gen';
import { FIND_ENDPOINT_LIST_ITEMS_CONTRACT } from './kibana.find_endpoint_list_items.gen';
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
import { GET_FLEET_AGENT_POLICIES_CONTRACT } from './kibana.get_fleet_agent_policies.gen';
import { GET_FLEET_AGENTS_CONTRACT } from './kibana.get_fleet_agents.gen';
import { GET_FLEET_EPM_PACKAGES_CONTRACT } from './kibana.get_fleet_epm_packages.gen';
import { GET_FLEET_OUTPUTS_CONTRACT } from './kibana.get_fleet_outputs.gen';
import { GET_FLEET_PACKAGE_POLICIES_CONTRACT } from './kibana.get_fleet_package_policies.gen';
import { GET_FLEET_SETTINGS_CONTRACT } from './kibana.get_fleet_settings.gen';
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
import { STREAMS_LIST_CONTRACT } from './kibana.streams_list.gen';
import { DELETE_STREAMS_NAME_CONTRACT } from './kibana.delete_streams_name.gen';
import { STREAMS_GET_CONTRACT } from './kibana.streams_get.gen';
import { PUT_STREAMS_NAME_CONTRACT } from './kibana.put_streams_name.gen';
import { POST_STREAMS_NAME_FORK_CONTRACT } from './kibana.post_streams_name_fork.gen';
import { GET_STREAMS_NAME_INGEST_CONTRACT } from './kibana.get_streams_name_ingest.gen';
import { GET_STREAMS_NAME_QUERIES_CONTRACT } from './kibana.get_streams_name_queries.gen';
import { STREAMS_GET_SIGNIFICANT_EVENTS_CONTRACT } from './kibana.streams_get_significant_events.gen';
import { GET_STREAMS_STREAMNAME_ATTACHMENTS_CONTRACT } from './kibana.get_streams_streamname_attachments.gen';

// export contracts
export const GENERATED_KIBANA_CONNECTORS: InternalConnectorContract[] = [
  GET_ALERTING_HEALTH_CONTRACT,
  GET_RULE_TYPES_CONTRACT,
  DELETE_ALERTING_RULE_ID_CONTRACT,
  GET_ALERTING_RULE_ID_CONTRACT,
  POST_ALERTING_RULE_ID_CONTRACT,
  PUT_ALERTING_RULE_ID_CONTRACT,
  GET_ALERTING_RULES_FIND_CONTRACT,
  DELETE_CASE_DEFAULT_SPACE_CONTRACT,
  UPDATE_CASE_CONTRACT,
  CREATE_CASE_CONTRACT,
  FIND_CASES_DEFAULT_SPACE_CONTRACT,
  GET_CASE_CONTRACT,
  GET_CASE_ALERTS_DEFAULT_SPACE_CONTRACT,
  DELETE_CASE_COMMENTS_DEFAULT_SPACE_CONTRACT,
  UPDATE_CASE_COMMENT_DEFAULT_SPACE_CONTRACT,
  ADD_CASE_COMMENT_CONTRACT,
  FIND_CASE_COMMENTS_DEFAULT_SPACE_CONTRACT,
  DELETE_CASE_COMMENT_DEFAULT_SPACE_CONTRACT,
  GET_CASE_COMMENT_DEFAULT_SPACE_CONTRACT,
  PUSH_CASE_DEFAULT_SPACE_CONTRACT,
  FIND_CASE_ACTIVITY_DEFAULT_SPACE_CONTRACT,
  GET_CASES_BY_ALERT_DEFAULT_SPACE_CONTRACT,
  GET_CASE_CONFIGURATION_DEFAULT_SPACE_CONTRACT,
  SET_CASE_CONFIGURATION_DEFAULT_SPACE_CONTRACT,
  UPDATE_CASE_CONFIGURATION_DEFAULT_SPACE_CONTRACT,
  FIND_CASE_CONNECTORS_DEFAULT_SPACE_CONTRACT,
  GET_CASE_REPORTERS_DEFAULT_SPACE_CONTRACT,
  GET_CASE_TAGS_DEFAULT_SPACE_CONTRACT,
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
  RULE_PREVIEW_CONTRACT,
  SET_ALERT_ASSIGNEES_CONTRACT,
  SEARCH_ALERTS_CONTRACT,
  SET_ALERTS_STATUS_CONTRACT,
  SET_ALERT_TAGS_CONTRACT,
  READ_TAGS_CONTRACT,
  CREATE_ENDPOINT_LIST_CONTRACT,
  DELETE_ENDPOINT_LIST_ITEM_CONTRACT,
  READ_ENDPOINT_LIST_ITEM_CONTRACT,
  CREATE_ENDPOINT_LIST_ITEM_CONTRACT,
  UPDATE_ENDPOINT_LIST_ITEM_CONTRACT,
  FIND_ENDPOINT_LIST_ITEMS_CONTRACT,
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
  GET_FLEET_AGENT_POLICIES_CONTRACT,
  GET_FLEET_AGENTS_CONTRACT,
  GET_FLEET_EPM_PACKAGES_CONTRACT,
  GET_FLEET_OUTPUTS_CONTRACT,
  GET_FLEET_PACKAGE_POLICIES_CONTRACT,
  GET_FLEET_SETTINGS_CONTRACT,
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
  STREAMS_LIST_CONTRACT,
  DELETE_STREAMS_NAME_CONTRACT,
  STREAMS_GET_CONTRACT,
  PUT_STREAMS_NAME_CONTRACT,
  POST_STREAMS_NAME_FORK_CONTRACT,
  GET_STREAMS_NAME_INGEST_CONTRACT,
  GET_STREAMS_NAME_QUERIES_CONTRACT,
  STREAMS_GET_SIGNIFICANT_EVENTS_CONTRACT,
  GET_STREAMS_STREAMNAME_ATTACHMENTS_CONTRACT,
];
