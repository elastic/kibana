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
export const MOCK_IDP_UIAM_SIGNING_SECRET = 'vLJb9lkGSmVVPsvYdgoRCcsGDzeaFxpBV10Pr3SPEYU=';
export const MOCK_IDP_UIAM_SHARED_SECRET = 'XmLutyDzrWDcz9i+xXRXzSMJEfulI+Q9yIaibncLRyA=';

export const MOCK_IDP_UIAM_ORGANIZATION_ID = '1234567890';
export const MOCK_IDP_UIAM_PROJECT_ID = 'abcde1234567890';

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
