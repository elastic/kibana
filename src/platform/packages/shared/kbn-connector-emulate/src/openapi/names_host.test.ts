/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { serverNamesHost } from './names_host';

describe('serverNamesHost', () => {
  it.each([
    ['https://api.vendor.example/v2', {}],
    ['https://{tenant}.vendor.example', { tenant: { default: 'acme' } }],
    ['https://{region}', { region: { default: 'eu.example', enum: ['eu.example'] } }],
    ['{scheme}://api.vendor.example', { scheme: { default: 'https', enum: ['http', 'https'] } }],
  ])('is true for %s', (url, variables) => {
    expect(serverNamesHost({ url, variables })).toBe(true);
  });

  it.each([
    ['/', {}],
    ['/api/v1', {}],
    ['https://{host}', { host: { default: 'example.com' } }],
    ['https://{subdomain}.{site}', { subdomain: { default: 'api' }, site: { default: 'x.com' } }],
    ['https://{consoleIP}:{port}/proxy', { consoleIP: { default: 'h' }, port: { default: '443' } }],
    ['{scheme}://{server}', { scheme: { default: 'https' }, server: { default: 'example.com' } }],
  ])('is false for %s', (url, variables) => {
    expect(serverNamesHost({ url, variables })).toBe(false);
  });
});
