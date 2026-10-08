/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toResponseFixtures, vendorApiFixturesSchema } from './fixtures';
import type { VendorApiManifest } from './manifest';
import { parseManifest, serializeManifest } from './manifest';

const manifest: VendorApiManifest = {
  sources: {
    v2: {
      format: 'openapi',
      url: 'https://example.com/v2.json',
      fetchedAt: '2026-10-07T00:00:00Z',
    },
    v1: {
      format: 'swagger',
      url: 'https://example.com/v1.json',
      apiVersion: '1.0',
      fetchedAt: '2026-10-07T00:00:00Z',
    },
  },
  operations: { search: [{ source: 'v1', method: 'get', path: '/search' }] },
  unmatched: { mute: [{ method: 'post', path: '/v1/mute', reason: 'Missing from the spec' }] },
};

describe('serializeManifest', () => {
  it('sorts keys at every depth and round-trips', () => {
    const json = serializeManifest(manifest);

    expect(json.indexOf('"v1"')).toBeLessThan(json.indexOf('"v2"'));
    expect(json.indexOf('"apiVersion"')).toBeLessThan(json.indexOf('"format"'));
    expect(json.endsWith('}\n')).toBe(true);
    expect(parseManifest(json)).toEqual(manifest);
    expect(serializeManifest(parseManifest(json))).toBe(json);
  });

  it.each([
    ['an unknown field', { ...manifest, extra: true }],
    [
      'an unmatched request without a reason',
      { ...manifest, unmatched: { mute: [{ method: 'post', path: '/mute', reason: '' }] } },
    ],
  ])('rejects %s', (_, invalid) => {
    expect(() => serializeManifest(invalid as VendorApiManifest)).toThrow();
  });
});

describe('fixtures', () => {
  it('converts response overrides to mock fixtures', () => {
    const fixtures = vendorApiFixturesSchema.parse({
      getCard: {
        input: { cardId: '5f0c1e2d3b4a596877665544' },
        queries: [{ method: 'POST', path: '/cards/search' }],
        responses: [{ source: 'v1', method: 'GET', path: '/cards/{id}', status: 200, body: {} }],
      },
    });

    expect(toResponseFixtures(fixtures.getCard.responses)).toEqual([
      {
        operation: { source: 'v1', method: 'GET', path: '/cards/{id}' },
        response: { status: 200, body: {} },
      },
    ]);
  });

  it('rejects unknown fields', () => {
    expect(() => vendorApiFixturesSchema.parse({ getCard: { readOnly: true } })).toThrow();
  });
});
