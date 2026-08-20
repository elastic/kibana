/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const isSecurityTestEndpointsPluginPath = (arg: string): boolean =>
  arg.startsWith('--plugin-path=') &&
  arg.includes('x-pack/platform/test/security_functional/plugins/test_endpoints');

/**
 * The inherited UIAM config adds securityTestEndpoints for API tests. CPS local
 * manual/UI testing does not use it, and loading its browser plugin can break boot.
 */
export const withoutSecurityTestEndpoints = (serverArgs: string[]): string[] =>
  serverArgs.filter((arg) => !isSecurityTestEndpointsPluginPath(arg));
