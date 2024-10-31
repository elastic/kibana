/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';

const resourcesPath = path.resolve(__dirname, 'resources');

export const pluginPath = path.resolve(__dirname);

export const IDP_METADATA_PATHS = {
  default: path.resolve(pluginPath, 'metadata.xml'),
  saml1: path.resolve(resourcesPath, 'idp_metadata.xml'),
  saml2: path.resolve(resourcesPath, 'idp_metadata_2.xml'),
  neverLogin: path.resolve(resourcesPath, 'idp_metadata_never_login.xml'),
  mockIdpPlugin: path.resolve(resourcesPath, 'idp_metadata_mock_idp.xml'),
};

export { getLogoutRequest, getSAMLRequestId, getSAMLResponse } from './helpers/saml_tools';
