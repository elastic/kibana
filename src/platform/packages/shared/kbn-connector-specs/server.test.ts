/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { authTypeSpecs as authTypeDefinitions } from '.';
import { authTypeSpecs as serverAuthTypeSpecs } from './server';

const SERVER_OVERRIDE_AUTH_TYPES = [
  'BearerWithTlsAuth',
  'KubernetesAksAuth',
  'KubernetesEksAuth',
  'KubernetesGkeAuth',
] as const;

describe('server auth type specs', () => {
  it.each(SERVER_OVERRIDE_AUTH_TYPES)('adds the server implementation for %s', (authTypeName) => {
    expect(authTypeDefinitions[authTypeName]).not.toHaveProperty('configure');
    expect(serverAuthTypeSpecs[authTypeName].configure).toEqual(expect.any(Function));
  });
});
