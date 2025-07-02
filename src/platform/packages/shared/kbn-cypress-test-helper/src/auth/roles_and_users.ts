/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Role } from '@kbn/security-plugin/common';

export type EndpointSecurityRoleNames = keyof typeof ENDPOINT_SECURITY_ROLE_NAMES;

export type EndpointSecurityRoleDefinitions = Record<EndpointSecurityRoleNames, Role>;

/**
 * Security Solution set of roles that are loaded and used in serverless deployments.
 * The source of these role definitions is under `project-controller` at:
 *
 * @see https://github.com/elastic/project-controller/blob/main/internal/project/security/config/roles.yml
 *
 * The role definition spreadsheet can be found here:
 *
 * @see https://docs.google.com/spreadsheets/d/16aGow187AunLCBFZLlbVyS81iQNuMpNxd96LOerWj4c/edit#gid=1936689222
 */
export const SECURITY_SERVERLESS_ROLE_NAMES = Object.freeze({
  t1_analyst: 't1_analyst',
  t2_analyst: 't2_analyst',
  t3_analyst: 't3_analyst',
  threat_intelligence_analyst: 'threat_intelligence_analyst',
  rule_author: 'rule_author',
  soc_manager: 'soc_manager',
  detections_admin: 'detections_admin',
  platform_engineer: 'platform_engineer',
  endpoint_operations_analyst: 'endpoint_operations_analyst',
  endpoint_policy_manager: 'endpoint_policy_manager',
});

export const ENDPOINT_SECURITY_ROLE_NAMES = Object.freeze({
  // --------------------------------------
  // Set of roles used in serverless
  ...SECURITY_SERVERLESS_ROLE_NAMES,

  // --------------------------------------
  // Other roles used for testing
  hunter: 'hunter',
  endpoint_response_actions_access: 'endpoint_response_actions_access',
  endpoint_response_actions_no_access: 'endpoint_response_actions_no_access',
  endpoint_security_policy_management_read: 'endpoint_security_policy_management_read',
  artifact_read_privileges: 'artifact_read_privileges',
});

export type KibanaKnownUserAccounts = keyof typeof KIBANA_KNOWN_DEFAULT_ACCOUNTS;

export type SecurityTestUser = EndpointSecurityRoleNames | KibanaKnownUserAccounts;

/**
 * List of kibana system accounts
 */
export const KIBANA_KNOWN_DEFAULT_ACCOUNTS = {
  elastic: 'elastic',
  elastic_serverless: 'elastic_serverless',
  system_indices_superuser: 'system_indices_superuser',
  admin: 'admin',
} as const;
