/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';

export const MOCK_IDP_PLUGIN_PATH = resolve(__dirname, '..');
export const MOCK_IDP_METADATA_PATH = resolve(MOCK_IDP_PLUGIN_PATH, 'metadata.xml');

export const MOCK_IDP_LOGIN_PATH = '/mock_idp/login';
export const MOCK_IDP_LOGOUT_PATH = '/mock_idp/logout';

export const MOCK_IDP_REALM_NAME = 'mock-idp';
export const MOCK_IDP_ENTITY_ID = 'urn:mock-idp'; // Must match `entityID` in `metadata.xml`
export const MOCK_IDP_ROLE_MAPPING_NAME = 'mock-idp-mapping';

export const MOCK_IDP_ATTRIBUTE_PRINCIPAL = 'http://saml.elastic-cloud.com/attributes/principal';
export const MOCK_IDP_ATTRIBUTE_ROLES = 'http://saml.elastic-cloud.com/attributes/roles';
export const MOCK_IDP_ATTRIBUTE_EMAIL = 'http://saml.elastic-cloud.com/attributes/email';
export const MOCK_IDP_ATTRIBUTE_NAME = 'http://saml.elastic-cloud.com/attributes/name';
