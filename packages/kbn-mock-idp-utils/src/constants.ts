/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const MOCK_IDP_LOGIN_PATH = '/mock_idp/login';
export const MOCK_IDP_LOGOUT_PATH = '/mock_idp/logout';

export const MOCK_IDP_REALM_NAME = 'mock-idp';
export const MOCK_IDP_REALM_TYPE = 'saml';
export const MOCK_IDP_ENTITY_ID = 'urn:mock-idp'; // Must match `entityID` in `metadata.xml`
export const MOCK_IDP_ROLE_MAPPING_NAME = 'mock-idp-mapping';

export const MOCK_IDP_ATTRIBUTE_PRINCIPAL = 'http://saml.elastic-cloud.com/attributes/principal';
export const MOCK_IDP_ATTRIBUTE_ROLES = 'http://saml.elastic-cloud.com/attributes/roles';
export const MOCK_IDP_ATTRIBUTE_EMAIL = 'http://saml.elastic-cloud.com/attributes/email';
export const MOCK_IDP_ATTRIBUTE_NAME = 'http://saml.elastic-cloud.com/attributes/name';

/** List of roles from `packages/kbn-es/src/serverless_resources/roles.yml`  */
export const MOCK_IDP_SEARCH_ROLE_NAMES = ['viewer', 'editor', 'system_indices_superuser'];
export const MOCK_IDP_OBSERVABILITY_ROLE_NAMES = ['viewer', 'editor', 'system_indices_superuser'];
export const MOCK_IDP_SECURITY_ROLE_NAMES = [
  't1_analyst',
  't2_analyst',
  't3_analyst',
  'threat_intelligence_analyst',
  'rule_author',
  'soc_manager',
  'detections_admin',
  'platform_engineer',
  'endpoint_operations_analyst',
  'endpoint_policy_manager',
  'system_indices_superuser',
];
