/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadVendorSpec } from './load_vendor_spec';

const id = (name: string) => `example.items#${name}`;

const model = {
  smithy: '2.0',
  shapes: {
    [id('Items')]: {
      type: 'service',
      version: '2024-01-01',
      operations: [{ target: id('ListItems') }],
      traits: {
        'aws.api#service': { sdkId: 'Items', endpointPrefix: 'items' },
        'aws.auth#sigv4': { name: 'items' },
        'aws.protocols#restJson1': {},
      },
    },
    [id('ListItems')]: {
      type: 'operation',
      output: { target: id('ListItemsOutput') },
      traits: { 'smithy.api#http': { method: 'GET', uri: '/items', code: 200 } },
    },
    [id('ListItemsOutput')]: {
      type: 'structure',
      members: { name: { target: 'smithy.api#String' } },
    },
  },
};

describe('loadVendorSpec', () => {
  it('converts an AWS Smithy model to OpenAPI', async () => {
    const url = 'https://models.example.com/items-2024-01-01.json';
    const fetchText = jest.fn().mockResolvedValue(JSON.stringify(model));

    const { format, apiVersion, document } = await loadVendorSpec(url, fetchText);

    expect(fetchText).toHaveBeenCalledWith(url);
    expect(format).toBe('smithy');
    expect(apiVersion).toBe('2024-01-01');
    expect(document.openapi).toMatch(/^3\./);
    expect(Object.keys(document.paths ?? {})).toEqual(['/items']);
  });

  it('keeps reporting OpenAPI documents as openapi', async () => {
    const openApi = { openapi: '3.0.3', info: { title: 'Example', version: '1' }, paths: {} };

    const { format, apiVersion } = await loadVendorSpec('https://example.com/spec.json', () =>
      Promise.resolve(JSON.stringify(openApi))
    );

    expect(format).toBe('openapi');
    expect(apiVersion).toBe('1');
  });
});
