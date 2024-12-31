/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

const SECURITY_TEST_PATH = resolve(REPO_ROOT, 'x-pack/test/security_api_integration');

export const SAML_IDP_PLUGIN_PATH = resolve(SECURITY_TEST_PATH, 'plugins/saml_provider');

export const STATEFUL_IDP_METADATA_PATH = resolve(
  SECURITY_TEST_PATH,
  'packages/helpers/saml/idp_metadata_mock_idp.xml'
);
export const SERVERLESS_IDP_METADATA_PATH = resolve(SAML_IDP_PLUGIN_PATH, 'metadata.xml');
export const JWKS_PATH = resolve(SECURITY_TEST_PATH, 'packages/helpers/oidc/jwks.json');
