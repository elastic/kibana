/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toResponseFixtures, vendorApiFixturesSchema } from './record/fixtures';
import type { VendorApiManifest } from './manifest';
import { parseManifest, serializeManifest, SOURCE_NAME_PATTERN } from './manifest';

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
  operations: {
    search: [
      {
        source: 'v1',
        method: 'get',
        path: '/search',
        pagination: {
          style: 'cursor',
          request: { cursorParam: 'cursor' },
          response: { itemsPath: 'results', nextPath: 'next' },
        },
      },
    ],
    tags: [{ source: 'v1', method: 'get', path: '/tags', pagination: 'none' }],
  },
  unmatched: { mute: [{ method: 'post', path: '/v1/mute', reason: 'Missing from the spec' }] },
};

const withPagination = (pagination: unknown) => ({
  ...manifest,
  operations: { search: [{ source: 'v1', method: 'get', path: '/search', pagination }] },
});

describe('serializeManifest', () => {
  it('sorts keys at every depth and round-trips', () => {
    const json = serializeManifest(manifest);

    expect(json.indexOf('"v1"')).toBeLessThan(json.indexOf('"v2"'));
    expect(json.indexOf('"apiVersion"')).toBeLessThan(json.indexOf('"format"'));
    expect(json.endsWith('}\n')).toBe(true);
    expect(parseManifest(json)).toEqual(manifest);
    expect(serializeManifest(parseManifest(json))).toBe(json);
  });

  it('accepts a next_url descriptor without a request, for opaque next links', () => {
    const opaque = withPagination({
      style: 'next_url',
      response: { itemsPath: 'value', nextPath: 'nextLink' },
    }) as VendorApiManifest;

    expect(parseManifest(serializeManifest(opaque))).toEqual(opaque);
  });

  it.each([
    ['an unknown field', { ...manifest, extra: true }],
    [
      'an unmatched request without a reason',
      { ...manifest, unmatched: { mute: [{ method: 'post', path: '/mute', reason: '' }] } },
    ],
    [
      'a pagination style with another style’s fields',
      withPagination({
        style: 'page',
        request: { cursorParam: 'cursor' },
        response: { itemsPath: '' },
      }),
    ],
    ['an unknown pagination value', withPagination('all')],
  ])('rejects %s', (_, invalid) => {
    expect(() => serializeManifest(invalid as VendorApiManifest)).toThrow();
  });
});

describe('source names', () => {
  it.each(['v1', 'users_v1beta1', 'rest_2022_11_28', 'cortex_search'])('accepts %s', (name) => {
    expect(SOURCE_NAME_PATTERN.test(name)).toBe(true);
  });

  it.each(['actionGroups', 'prometheusV1', '2022-11-28', 'users__v1', '_v1', 'v1_', 'V1'])(
    'rejects %s',
    (name) => {
      expect(SOURCE_NAME_PATTERN.test(name)).toBe(false);
    }
  );

  it('rejects a manifest whose source is not snake_case', () => {
    const { sources, ...rest } = manifest;
    const camelCase = { ...rest, sources: { actionGroups: sources.v1 } };

    expect(() => parseManifest(JSON.stringify(camelCase))).toThrow(/lowercase snake_case/);
  });
});

describe('Markdown reference sources', () => {
  const withSource = (source: Record<string, unknown>) =>
    JSON.stringify({
      ...manifest,
      sources: { docs: { fetchedAt: '2026-10-07T00:00:00Z', ...source } },
    });

  it('accepts a Markdown reference with the pages to fetch', () => {
    const json = withSource({
      format: 'databricks-markdown',
      url: 'https://docs.databricks.com/api/llms.txt',
      pages: ['workspace/jobs/'],
    });

    expect(parseManifest(json).sources.docs.pages).toEqual(['workspace/jobs/']);
  });

  it('rejects pages on other sources, and an empty list of pages', () => {
    expect(() =>
      parseManifest(withSource({ format: 'openapi', url: 'https://x.com/a.json', pages: ['a/'] }))
    ).toThrow('only applies to Markdown references');
    expect(() =>
      parseManifest(
        withSource({ format: 'brave-markdown', url: 'https://x.com/llms.txt', pages: [] })
      )
    ).toThrow();
  });
});

describe('MCP sources', () => {
  const withSource = (source: Record<string, unknown>) =>
    JSON.stringify({
      ...manifest,
      sources: { mcp: { fetchedAt: '2026-10-07T00:00:00Z', ...source } },
    });

  const mcp = {
    format: 'mcp',
    url: 'https://vendor.example.com/toolsnaps/',
    endpoints: ['https://vendor.example.com/mcp'],
  };

  it('accepts the tool documents a vendor publishes one per tool', () => {
    const json = withSource({ ...mcp, tools: ['get_me.json', 'search.json'] });

    expect(parseManifest(json).sources.mcp.tools).toEqual(['get_me.json', 'search.json']);
  });

  it('rejects tools on other sources, and an empty list of tools', () => {
    expect(() =>
      parseManifest(
        withSource({
          format: 'graphql',
          url: 'https://x.com/schema.graphql',
          endpoints: ['https://x.com/graphql'],
          tools: ['a.json'],
        })
      )
    ).toThrow('only applies to MCP sources');
    expect(() => parseManifest(withSource({ ...mcp, tools: [] }))).toThrow();
  });

  it('accepts a captured source, which needs a note saying what capturing it took', () => {
    const note = 'The server answers initialize with 401; captured with a developer token.';

    expect(parseManifest(withSource({ ...mcp, captured: true, note })).sources.mcp).toMatchObject({
      captured: true,
      note,
    });
    expect(() => parseManifest(withSource({ ...mcp, captured: true }))).toThrow(
      /A captured source needs a/
    );
  });

  it('accepts a pinned source, which needs a note saying why it cannot follow the vendor', () => {
    const openapi = { format: 'openapi', url: 'https://vendor.example.com/v1/openapi.json' };
    const note = 'The vendor publishes a file per release and no URL for the latest.';

    expect(parseManifest(withSource({ ...openapi, pinned: true, note })).sources.mcp).toMatchObject(
      { pinned: true, note }
    );
    expect(() => parseManifest(withSource({ ...openapi, pinned: true }))).toThrow(
      /A pinned source needs a/
    );
  });

  it('rejects a source that is both captured and pinned', () => {
    expect(() =>
      parseManifest(withSource({ ...mcp, captured: true, pinned: true, note: 'Both.' }))
    ).toThrow(/captured or pinned, not both/);
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
