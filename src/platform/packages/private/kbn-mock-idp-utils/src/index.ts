/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  MOCK_IDP_LOGIN_PATH,
  MOCK_IDP_LOGOUT_PATH,
  MOCK_IDP_REALM_NAME,
  MOCK_IDP_REALM_TYPE,
  MOCK_IDP_ENTITY_ID,
  MOCK_IDP_ROLE_MAPPING_NAME,
  MOCK_IDP_ATTRIBUTE_PRINCIPAL,
  MOCK_IDP_ATTRIBUTE_ROLES,
  MOCK_IDP_ATTRIBUTE_EMAIL,
  MOCK_IDP_ATTRIBUTE_NAME,
  MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN,
  MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN_EXPIRES_AT,
  MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN,
  MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN_EXPIRES_AT,
  MOCK_IDP_UIAM_COSMOS_DB_ACCESS_KEY,
  MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_API_KEYS,
  MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_TOKEN_INVALIDATION,
  MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_USERS,
  MOCK_IDP_UIAM_COSMOS_DB_INTERNAL_URL,
  MOCK_IDP_UIAM_COSMOS_DB_NAME,
  MOCK_IDP_UIAM_COSMOS_DB_URL,
  MOCK_IDP_UIAM_SERVICE_INTERNAL_URL,
  MOCK_IDP_UIAM_SERVICE_URL,
  MOCK_IDP_UIAM_SIGNING_SECRET,
  MOCK_IDP_UIAM_SHARED_SECRET,
  MOCK_IDP_UIAM_ORGANIZATION_ID,
  MOCK_IDP_UIAM_PROJECT_ID,
} from './constants';

export {
  createMockIdpMetadata,
  createSAMLResponse,
  ensureSAMLRoleMapping,
  generateCosmosDBApiRequestHeaders,
  getSAMLRequestId,
} from './utils';
