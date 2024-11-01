/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import path from 'path';

const pluginsPath = path.resolve(
  REPO_ROOT,
  'x-pack',
  'test',
  'security_api_integration',
  'plugins'
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

export const TEST_PLUGIN_PATHS = {
  auditLog: path.resolve(pluginsPath, 'audit_log'),
  features: path.resolve(pluginsPath, 'features_provider'),
  oidc: path.resolve(pluginsPath, 'oidc_provider'),
  saml: path.resolve(pluginsPath, 'saml_provider'),
  userProfiles: path.resolve(pluginsPath, 'user_profiles_consumer'),
};

export const IDP_METADATA_PATHS = {
  default: path.resolve(TEST_PLUGIN_PATHS.saml, 'metadata.xml'),
  saml1: path.resolve(idPResourcesPath, 'idp_metadata.xml'),
  saml2: path.resolve(idPResourcesPath, 'idp_metadata_2.xml'),
  neverLogin: path.resolve(idPResourcesPath, 'idp_metadata_never_login.xml'),
  mockIdpPlugin: path.resolve(idPResourcesPath, 'idp_metadata_mock_idp.xml'),
};
