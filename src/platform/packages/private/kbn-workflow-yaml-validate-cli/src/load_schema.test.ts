/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import os from 'os';
import Path from 'path';
import { createHash } from 'crypto';
import { loadSchemaDocuments } from './load_schema';

// These tests cover the ajv-free half (resolution + integrity + parse). ajv
// validator compilation uses runtime codegen (`new Function`), which jest's
// `disallow_code_generation` sandbox blocks; that path is covered by the live run.
const tinySchema = JSON.stringify({
  type: 'object',
  required: ['version'],
  properties: { version: { type: 'string' } },
  additionalProperties: true,
});

const sha256 = (input: string): string => createHash('sha256').update(input, 'utf8').digest('hex');

interface BundleOverrides {
  strictSha?: string;
  templateSha?: string;
}

const writeBundle = (dir: string, overrides: BundleOverrides = {}): void => {
  fs.mkdirSync(Path.join(dir, 'strict'), { recursive: true });
  fs.mkdirSync(Path.join(dir, 'template'), { recursive: true });
  fs.writeFileSync(Path.join(dir, 'strict', 'schema.json'), tinySchema);
  fs.writeFileSync(Path.join(dir, 'template', 'schema.json'), tinySchema);
  fs.writeFileSync(
    Path.join(dir, 'index.json'),
    JSON.stringify({
      kibanaVersion: '9.6.0',
      channel: 'release',
      variants: {
        strict: { path: 'strict/schema.json', sha256: overrides.strictSha ?? sha256(tinySchema) },
        template: {
          path: 'template/schema.json',
          sha256: overrides.templateSha ?? sha256(tinySchema),
        },
      },
    })
  );
};

describe('loadSchemaDocuments', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(Path.join(os.tmpdir(), 'load-schema-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('resolves, verifies, and parses both variants from an explicit --schema directory', async () => {
    writeBundle(dir);
    const { schemas, source, manifest } = await loadSchemaDocuments({ schema: dir });

    expect(source).toBe(Path.resolve(dir));
    expect(manifest.kibanaVersion).toBe('9.6.0');
    expect(schemas.strict).toMatchObject({ type: 'object', required: ['version'] });
    expect(schemas.template).toMatchObject({ type: 'object' });
  });

  it('rejects a variant whose bytes do not match the manifest sha256', async () => {
    writeBundle(dir, { strictSha: 'deadbeef' });
    await expect(loadSchemaDocuments({ schema: dir })).rejects.toThrow(/Integrity check failed/);
  });

  it('throws when the --schema directory has no index.json', async () => {
    await expect(loadSchemaDocuments({ schema: dir })).rejects.toThrow(/No index\.json/);
  });

  it('loads from an http(s) source via fetch', async () => {
    writeBundle(dir);
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const relative = url.replace('https://cdn.example/bundle/', '');
      const body = fs.readFileSync(Path.join(dir, relative), 'utf8');
      return { ok: true, status: 200, statusText: 'OK', text: async () => body } as Response;
    }) as typeof fetch;

    try {
      const { schemas, source } = await loadSchemaDocuments({
        schema: 'https://cdn.example/bundle/',
      });
      expect(source).toBe('https://cdn.example/bundle');
      expect(schemas.strict).toMatchObject({ type: 'object' });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('falls back to the CDN url when no explicit schema and no local match', async () => {
    writeBundle(dir);
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const relative = url.replace('https://cdn.example/', '');
      const body = fs.readFileSync(Path.join(dir, relative), 'utf8');
      return { ok: true, status: 200, statusText: 'OK', text: async () => body } as Response;
    }) as typeof fetch;

    try {
      const { source } = await loadSchemaDocuments({
        // A version that cannot exist locally forces the CDN fallback.
        kibanaVersion: '0.0.0-does-not-exist',
        cdnUrl: 'https://cdn.example/',
      });
      expect(source).toBe('https://cdn.example');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
