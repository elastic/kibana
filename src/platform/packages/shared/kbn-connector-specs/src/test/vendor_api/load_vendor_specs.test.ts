/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { VendorApiManifest } from './manifest';
import { serializeManifest } from './manifest';
import { loadVendorSpecs, toMockPagination } from './load_vendor_specs';

const SPEC_URL = 'https://specs.example.com/openapi.yaml';

const snapshot = (title: string) => ({
  openapi: '3.0.3',
  info: { title, version: '1' },
  servers: [{ url: 'https://api.example.com' }],
  paths: { '/items': { get: { responses: { '200': { description: 'ok' } } } } },
});

const itemsPagination = {
  style: 'page',
  request: { pageParam: 'page' },
  response: { itemsPath: '' },
} as const;

const manifest: VendorApiManifest = {
  sources: {
    v1: { format: 'openapi', url: SPEC_URL, fetchedAt: '2026-10-07T00:00:00.000Z' },
  },
  operations: {
    listItems: [{ source: 'v1', method: 'get', path: '/items', pagination: itemsPagination }],
    countItems: [{ source: 'v1', method: 'get', path: '/items', pagination: itemsPagination }],
    getItem: [{ source: 'v1', method: 'get', path: '/items/{id}' }],
    listTags: [{ source: 'v1', method: 'get', path: '/tags', pagination: 'none' }],
  },
};

const log = { info: jest.fn(), warning: jest.fn() };

describe('toMockPagination', () => {
  it('lists each paginated operation once, without the ones declared "none"', () => {
    expect(toMockPagination(manifest)).toEqual([
      {
        operation: { source: 'v1', method: 'get', path: '/items' },
        pagination: itemsPagination,
      },
    ]);
  });
});

describe('loadVendorSpecs', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'vendor-api-'));
    await fs.mkdir(path.join(directory, 'snapshots'));
    await fs.writeFile(path.join(directory, 'manifest.json'), serializeManifest(manifest));
    await fs.writeFile(
      path.join(directory, 'snapshots', 'v1.openapi.json'),
      JSON.stringify(snapshot('Snapshot'))
    );
    await fs.writeFile(
      path.join(directory, 'overlay.yaml'),
      [
        'overlay: 1.0.0',
        'info: { title: Fix, version: 1.0.0 }',
        'actions:',
        '  - target: $.info',
        '    description: Marks the overlay as applied.',
        '    update: { x-corrected: true }',
      ].join('\n')
    );
    log.info.mockClear();
    log.warning.mockClear();
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('reads the committed snapshots and applies the overlay', async () => {
    const fetchText = jest.fn();

    const { specs, pagination } = await loadVendorSpecs({ directory, fetchText, log });

    expect(specs.v1.info).toEqual({ title: 'Snapshot', version: '1', 'x-corrected': true });
    expect(pagination).toHaveLength(1);
    expect(fetchText).not.toHaveBeenCalled();
  });

  it('fetches every source with latest', async () => {
    const fetchText = jest.fn(async () => JSON.stringify(snapshot('Latest')));

    const { specs } = await loadVendorSpecs({ directory, latest: true, fetchText, log });

    expect(fetchText).toHaveBeenCalledWith(SPEC_URL);
    expect(specs.v1.info).toEqual({ title: 'Latest', version: '1', 'x-corrected': true });
  });

  it('fails without a manifest', async () => {
    await fs.rm(path.join(directory, 'manifest.json'));

    await expect(loadVendorSpecs({ directory, fetchText: jest.fn(), log })).rejects.toThrow(
      /has no manifest\.json/
    );
  });
});
