/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const MOCK_IDP_LOGIN_PATH = '/mock_idp/login';
export const MOCK_IDP_LOGOUT_PATH = '/mock_idp/logout';

// These are the values that dev UIAM service is configured with (openssl rand 32 | base64).
export const MOCK_IDP_UIAM_SIGNING_SECRET = 'MnpT2a582F/LiRbocLHLnSF2SYElqTUdmQvBpVn+51Q=';
export const MOCK_IDP_UIAM_SHARED_SECRET = 'Dw7eRt5yU2iO9pL3aS4dF6gH8jK0lZ1xC2vB3nM4qW5=';

export const MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_API_KEYS = 'api-keys';
export const MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_USERS = 'users';
export const MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_TOKEN_INVALIDATION = 'token-invalidation';
export const MOCK_IDP_UIAM_COSMOS_DB_NAME = 'uiam-db';
// Cosmos DB emulator uses a fixed key. For production, this should be retrieved from configuration.
export const MOCK_IDP_UIAM_COSMOS_DB_ACCESS_KEY =
  'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==';

// Sometimes it is useful or required to point local CosmosDB service clients, or clients operating within the same
// Docker network (i.e., UIAM), to a different CosmosDB  URL. For example, http://host.docker.internal:8080 can be
// used to route requests through the host network, making it easier to capture traffic with a network analyzer running
// on the host.
export const MOCK_IDP_UIAM_COSMOS_DB_INTERNAL_URL =
  process.env.MOCK_IDP_UIAM_COSMOS_DB_INTERNAL_URL || 'https://uiam-cosmosdb:8081';
export const MOCK_IDP_UIAM_COSMOS_DB_URL =
  process.env.MOCK_IDP_UIAM_COSMOS_DB_URL || 'https://localhost:8081';

export const MOCK_IDP_UIAM_ORGANIZATION_ID = 'org1234567890';
export const MOCK_IDP_UIAM_PROJECT_ID = 'abcde1234567890';

// Sometimes it is useful or required to point local UIAM service clients, or clients operating within the same Docker
// network (i.e., Elasticsearch), to a different UIAM service URL. For example, http://host.docker.internal:8080 can be
// used to route requests through the host network, making it easier to capture traffic with a network analyzer running
// on the host.
export const MOCK_IDP_UIAM_SERVICE_INTERNAL_URL =
  process.env.MOCK_IDP_UIAM_SERVICE_INTERNAL_URL || 'http://uiam:8080';
export const MOCK_IDP_UIAM_SERVICE_URL =
  process.env.MOCK_IDP_UIAM_SERVICE_URL || 'http://localhost:8080';

export const MOCK_IDP_REALM_NAME = 'cloud-saml-kibana';
export const MOCK_IDP_REALM_TYPE = 'saml';
export const MOCK_IDP_ENTITY_ID = 'urn:mock-idp'; // Must match `entityID` in `metadata.xml`
export const MOCK_IDP_ROLE_MAPPING_NAME = 'mock-idp-mapping';

export const MOCK_IDP_ATTRIBUTE_PRINCIPAL = 'http://saml.elastic-cloud.com/attributes/principal';
export const MOCK_IDP_ATTRIBUTE_ROLES = 'http://saml.elastic-cloud.com/attributes/roles';
export const MOCK_IDP_ATTRIBUTE_EMAIL = 'http://saml.elastic-cloud.com/attributes/email';
export const MOCK_IDP_ATTRIBUTE_NAME = 'http://saml.elastic-cloud.com/attributes/name';

// The set of additional attributes included into the SAML response when UIAM is enabled.
export const MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN =
  'http://saml.elastic-cloud.com/attributes/uiam/authentication/access_token';
export const MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN_EXPIRES_AT =
  'http://saml.elastic-cloud.com/attributes/uiam/authentication/access_token_expires_at';
export const MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN =
  'http://saml.elastic-cloud.com/attributes/uiam/authentication/refresh_token';
export const MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN_EXPIRES_AT =
  'http://saml.elastic-cloud.com/attributes/uiam/authentication/refresh_token_expires_at';
