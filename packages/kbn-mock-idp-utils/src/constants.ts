/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';

export const MOCK_IDP_LOGIN_PATH = '/mock_idp/login';
export const MOCK_IDP_LOGOUT_PATH = '/mock_idp/logout';

export const MOCK_IDP_REALM_NAME = 'cloud-saml-kibana';
export const MOCK_IDP_REALM_TYPE = 'saml';
export const MOCK_IDP_ENTITY_ID = 'urn:mock-idp'; // Must match `entityID` in `metadata.xml`
export const MOCK_IDP_ROLE_MAPPING_NAME = 'mock-idp-mapping';

export const MOCK_IDP_ATTRIBUTE_PRINCIPAL = 'http://saml.elastic-cloud.com/attributes/principal';
export const MOCK_IDP_ATTRIBUTE_ROLES = 'http://saml.elastic-cloud.com/attributes/roles';
export const MOCK_IDP_ATTRIBUTE_EMAIL = 'http://saml.elastic-cloud.com/attributes/email';
export const MOCK_IDP_ATTRIBUTE_NAME = 'http://saml.elastic-cloud.com/attributes/name';

export const MOCK_IDP_TEST_PLUGIN_PATH = path.resolve(
  REPO_ROOT,
  'x-pack',
  'test',
  'security_api_integration',
  'plugins',
  'saml_provider'
);

const idPResourcesPath = path.resolve(
  REPO_ROOT,
  'x-pack',
  'test',
  'security_api_integration',
  'packages',
  'helpers',
  'saml'
);

export const IDP_METADATA_PATHS = {
  default: path.resolve(MOCK_IDP_TEST_PLUGIN_PATH, 'metadata.xml'),
  saml1: path.resolve(idPResourcesPath, 'idp_metadata.xml'),
  saml2: path.resolve(idPResourcesPath, 'idp_metadata_2.xml'),
  neverLogin: path.resolve(idPResourcesPath, 'idp_metadata_never_login.xml'),
  mockIdpPlugin: path.resolve(idPResourcesPath, 'idp_metadata_mock_idp.xml'),
};
