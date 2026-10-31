/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import DIAGNOSE_YAML from './diagnose.yaml';
import FIND_ARTIFACTS_YAML from './find_artifacts.yaml';
import KNOWLEDGE_SEARCH_YAML from './knowledge_search.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const ENDPOINT_CONFIGURATION_TROUBLESHOOTING_DIAGNOSE_WORKFLOW_ID =
  'system-security-endpoint-configuration-troubleshooting-diagnose';
export const ENDPOINT_CONFIGURATION_TROUBLESHOOTING_KNOWLEDGE_SEARCH_WORKFLOW_ID =
  'system-security-endpoint-configuration-troubleshooting-knowledge-search';
export const ENDPOINT_CONFIGURATION_TROUBLESHOOTING_FIND_ARTIFACTS_WORKFLOW_ID =
  'system-security-endpoint-configuration-troubleshooting-find-artifacts';

const MANAGEMENT = {
  enablement: 'restorable',
  lifecycle: 'static',
  versionStrategy: 'auto',
} as const;

const PLUGIN_ID = 'securitySolution';

export const ENDPOINT_CONFIGURATION_TROUBLESHOOTING_DIAGNOSE_WORKFLOW = {
  billable: false,
  id: ENDPOINT_CONFIGURATION_TROUBLESHOOTING_DIAGNOSE_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 1,
  yaml: DIAGNOSE_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const ENDPOINT_CONFIGURATION_TROUBLESHOOTING_KNOWLEDGE_SEARCH_WORKFLOW = {
  billable: false,
  id: ENDPOINT_CONFIGURATION_TROUBLESHOOTING_KNOWLEDGE_SEARCH_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 1,
  yaml: KNOWLEDGE_SEARCH_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const ENDPOINT_CONFIGURATION_TROUBLESHOOTING_FIND_ARTIFACTS_WORKFLOW = {
  billable: false,
  id: ENDPOINT_CONFIGURATION_TROUBLESHOOTING_FIND_ARTIFACTS_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 1,
  yaml: FIND_ARTIFACTS_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const ENDPOINT_CONFIGURATION_TROUBLESHOOTING_WORKFLOW_IDS = [
  ENDPOINT_CONFIGURATION_TROUBLESHOOTING_DIAGNOSE_WORKFLOW_ID,
  ENDPOINT_CONFIGURATION_TROUBLESHOOTING_KNOWLEDGE_SEARCH_WORKFLOW_ID,
  ENDPOINT_CONFIGURATION_TROUBLESHOOTING_FIND_ARTIFACTS_WORKFLOW_ID,
] as const;
