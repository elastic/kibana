/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'fs';
import {
  JWKS_PATH,
  SAML_IDP_PLUGIN_PATH,
  SERVERLESS_IDP_METADATA_PATH,
  STATEFUL_IDP_METADATA_PATH,
} from './constants';

describe('Scout security test fixtures', () => {
  it.each([
    ['SAML IDP plugin', SAML_IDP_PLUGIN_PATH],
    ['stateful SAML metadata', STATEFUL_IDP_METADATA_PATH],
    ['serverless SAML metadata', SERVERLESS_IDP_METADATA_PATH],
    ['OIDC JWKS', JWKS_PATH],
  ])('%s exists at %s', (_description, fixturePath) => {
    expect(existsSync(fixturePath)).toBe(true);
  });
});
