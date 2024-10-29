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
export const saml1IdPMetadataPath = path.resolve(resourcesPath, 'idp_metadata.xml');
export const saml2IdPMetadataPath = path.resolve(resourcesPath, 'idp_metadata_2.xml');
export const idpNeverLoginPath = path.resolve(resourcesPath, 'idp_metadata_never_login.xml');
export const mockIdPMetadataPath = path.resolve(resourcesPath, 'idp_metadata_mock_idp.xml');
export const pluginMetadataPath = path.resolve(resourcesPath, 'metadata.xml');

export const pluginPath = path.resolve(__dirname);

export * from './saml_tools';
