/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { createHash } from 'node:crypto';
import os from 'os';
import path from 'path';

import { loggerMock } from '@kbn/logging-mocks';
import type { Template } from '@kbn/workflows-library';

import { LibraryFetchError, LibraryNotFoundError } from './errors';
import { LibraryBundleReader } from './library_bundle_reader';

const MANIFEST = {
  versions: [{ id: '9.5', kibana: '9.5.0', active: true }],
  latest: '9.5',
};

const contentHash = (body: string) =>
  `sha256:${createHash('sha256').update(body, 'utf8').digest('hex')}`;

const BODY_YAML = `
template-metadata:
  slug: demo
  version: "1.0.0"
  availability: ">=9.5.0"
  name: "Demo"
  description: "Demo template"
  categories: [utility]

consts:
  k: v
inputs:
  - name: ip
    type: string
steps:
  - name: noop
    type: noop
`;

// A body from a newer publisher: unknown fields at the top level and inside the
// nested `install` block. Exercises the lenient body parse (parity with HTTP).
const FUTURE_BODY_YAML = `
template-metadata:
  slug: demo
  version: "1.0.0"
  availability: ">=9.5.0"
  name: "Demo"
  description: "Demo template"
  categories: [utility]
  someFutureField: hello
  install:
    someFutureInstallKey: hi
    form:
      - name: api-key
        inputType: text
        someFutureFieldKey: hi

consts:
  k: v
inputs:
  - name: ip
    type: string
steps:
  - name: noop
    type: noop
`;

// The default catalog row's `contentHash` matches `BODY_YAML` so the bundle
// reader's integrity check passes for the happy path.
const CATALOG = {
  version: 'v1',
  kibanaVersion: '9.5.0',
  generatedAt: '2026-06-01T00:00:00Z',
  templates: [
    {
      slug: 'demo',
      version: '1.0.0',
      availability: '>=9.5.0',
      name: 'Demo',
      description: 'Demo template',
      categories: ['utility'],
      definitionUrl: 'templates/demo/1.0.0.yaml',
      contentHash: contentHash(BODY_YAML),
      stepTypes: [],
      triggerTypes: [],
    },
  ],
};

/** A single-row catalog whose `contentHash` matches the given body. */
const catalogForBody = (body: string, rowOverrides: Partial<Template> = {}) => ({
  ...CATALOG,
  templates: [{ ...CATALOG.templates[0], contentHash: contentHash(body), ...rowOverrides }],
});

interface BundleOptions {
  manifest?: unknown;
  manifestRaw?: string;
  /** Map of versionId → catalog (object) to write. Defaults to a single 9.5 catalog. */
  catalogs?: Record<string, unknown>;
  catalogRaw?: { versionId: string; raw: string };
  body?: string | null;
}

/** Writes a CDN-mirror `/v1` tree at `root`. */
const writeBundle = async (root: string, options: BundleOptions = {}): Promise<void> => {
  const {
    manifest = MANIFEST,
    manifestRaw,
    catalogs = { '9.5': CATALOG },
    catalogRaw,
    body = BODY_YAML,
  } = options;

  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, 'kibana-versions.json'), manifestRaw ?? JSON.stringify(manifest));

  for (const [versionId, catalog] of Object.entries(catalogs)) {
    await mkdir(path.join(root, versionId, 'catalogs'), { recursive: true });
    await writeFile(
      path.join(root, versionId, 'catalogs', 'templates.json'),
      JSON.stringify(catalog)
    );
  }
  if (catalogRaw) {
    await mkdir(path.join(root, catalogRaw.versionId, 'catalogs'), { recursive: true });
    await writeFile(
      path.join(root, catalogRaw.versionId, 'catalogs', 'templates.json'),
      catalogRaw.raw
    );
  }
  if (body !== null) {
    await mkdir(path.join(root, 'templates', 'demo'), { recursive: true });
    await writeFile(path.join(root, 'templates', 'demo', '1.0.0.yaml'), body);
  }
};

const buildReader = (
  bundlePath: string,
  overrides: {
    kibanaVersion?: string;
    isServerless?: boolean;
    maxCatalogBytes?: number;
    maxBodyBytes?: number;
  } = {}
) =>
  new LibraryBundleReader({
    bundlePath,
    kibanaVersion: overrides.kibanaVersion ?? '9.5.0',
    isServerless: overrides.isServerless ?? false,
    maxCatalogBytes: overrides.maxCatalogBytes,
    maxBodyBytes: overrides.maxBodyBytes,
    logger: loggerMock.create(),
  });

describe('LibraryBundleReader', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'wf-library-bundle-'));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  describe('root resolution', () => {
    it('reads the catalog when bundlePath is the /v1 root directly', async () => {
      await writeBundle(tmpRoot);
      const reader = buildReader(tmpRoot);

      const templates = await reader.listTemplates();

      expect(templates.map((t) => t.slug)).toEqual(['demo']);
    });

    it('reads the catalog when bundlePath is the parent containing a v1/ directory', async () => {
      await writeBundle(path.join(tmpRoot, 'v1'));
      const reader = buildReader(tmpRoot);

      const templates = await reader.listTemplates();

      expect(templates.map((t) => t.slug)).toEqual(['demo']);
    });

    it('throws `unavailable` when no bundle exists under bundlePath', async () => {
      const reader = buildReader(tmpRoot);

      await expect(reader.listTemplates()).rejects.toMatchObject({
        name: 'LibraryFetchError',
        reason: 'unavailable',
      });
    });
  });

  describe('version resolution', () => {
    it('selects the catalog matching the running Kibana minor', async () => {
      await writeBundle(tmpRoot, {
        manifest: {
          versions: [
            { id: '9.4', kibana: '9.4.0', active: true },
            { id: '9.5', kibana: '9.5.0', active: true },
          ],
          latest: 'main',
        },
        catalogs: {
          '9.4': { ...CATALOG, templates: [{ ...CATALOG.templates[0], slug: 'old' }] },
          '9.5': CATALOG,
        },
      });
      const reader = buildReader(tmpRoot, { kibanaVersion: '9.5.2' });

      const templates = await reader.listTemplates();

      expect(templates.map((t) => t.slug)).toEqual(['demo']);
    });

    it('resolves to `latest` for serverless deployments', async () => {
      await writeBundle(tmpRoot, {
        manifest: { versions: [{ id: '9.5', kibana: '9.5.0', active: true }], latest: 'main' },
        catalogs: { main: CATALOG },
      });
      const reader = buildReader(tmpRoot, { kibanaVersion: '9.5.0', isServerless: true });

      const templates = await reader.listTemplates();

      expect(templates.map((t) => t.slug)).toEqual(['demo']);
    });

    it('falls back to `latest` when no manifest entry matches the runtime version', async () => {
      await writeBundle(tmpRoot, {
        manifest: { versions: [{ id: '9.5', kibana: '9.5.0', active: true }], latest: '9.5' },
        catalogs: { '9.5': CATALOG },
      });
      const reader = buildReader(tmpRoot, { kibanaVersion: '10.0.0' });

      const templates = await reader.listTemplates();

      expect(templates.map((t) => t.slug)).toEqual(['demo']);
    });
  });

  describe('manifest + catalog validation', () => {
    it('throws `malformed` when kibana-versions.json is not valid JSON', async () => {
      await writeBundle(tmpRoot, { manifestRaw: 'not json{' });
      const reader = buildReader(tmpRoot);

      await expect(reader.listTemplates()).rejects.toMatchObject({ reason: 'malformed' });
    });

    it('throws `malformed` when the catalog fails schema validation', async () => {
      await writeBundle(tmpRoot, { catalogs: { '9.5': { wrong: 'shape' } } });
      const reader = buildReader(tmpRoot);

      await expect(reader.listTemplates()).rejects.toBeInstanceOf(LibraryFetchError);
    });

    it('throws `malformed` when the catalog is not valid JSON', async () => {
      await writeBundle(tmpRoot, { catalogRaw: { versionId: '9.5', raw: 'not json{' } });
      const reader = buildReader(tmpRoot);

      await expect(reader.listTemplates()).rejects.toMatchObject({ reason: 'malformed' });
    });

    it('tolerates unknown fields in the bundled manifest and catalog (forward-compat)', async () => {
      const futureManifest = {
        ...MANIFEST,
        futureChannelMeta: { beta: true },
        versions: MANIFEST.versions.map((v) => ({ ...v, note: 'newer publisher' })),
      };
      const futureCatalog = {
        ...CATALOG,
        futureTopLevelField: 'ignored',
        templates: CATALOG.templates.map((t) => ({ ...t, snippetRoles: ['send-notification'] })),
      };
      await writeBundle(tmpRoot, {
        manifest: futureManifest,
        catalogs: { '9.5': futureCatalog },
      });
      const reader = buildReader(tmpRoot);

      const templates = await reader.listTemplates();

      expect(templates.map((t) => t.slug)).toEqual(['demo']);
    });

    it('rejects a catalog/manifest file larger than the configured cap (`too-large`)', async () => {
      await writeBundle(tmpRoot);
      const reader = buildReader(tmpRoot, { maxCatalogBytes: 8 });

      await expect(reader.listTemplates()).rejects.toMatchObject({ reason: 'too-large' });
    });
  });

  describe('getTemplate', () => {
    it('parses the body (resolved against the bundle root) and caches it', async () => {
      await writeBundle(tmpRoot);
      const reader = buildReader(tmpRoot);

      const first = await reader.getTemplate('demo');
      const second = await reader.getTemplate('demo');

      expect(first).toBe(second);
      expect(first.metadata.slug).toBe('demo');
      expect(first.body.consts).toEqual({ k: 'v' });
      expect(first.raw).toContain('template-metadata:');
    });

    it('tolerates unknown `template-metadata` fields in the body (forward-compat parity with HTTP)', async () => {
      await writeBundle(tmpRoot, {
        body: FUTURE_BODY_YAML,
        catalogs: { '9.5': catalogForBody(FUTURE_BODY_YAML) },
      });
      const reader = buildReader(tmpRoot);

      const result = await reader.getTemplate('demo');

      expect(result.metadata.slug).toBe('demo');
      expect(result.metadata).not.toHaveProperty('someFutureField');
      expect(result.metadata.install).not.toHaveProperty('someFutureInstallKey');
      expect(result.metadata.install?.form[0]).not.toHaveProperty('someFutureFieldKey');
    });

    it('throws LibraryNotFoundError when the slug is absent from the catalog', async () => {
      await writeBundle(tmpRoot);
      const reader = buildReader(tmpRoot);

      await expect(reader.getTemplate('missing')).rejects.toBeInstanceOf(LibraryNotFoundError);
    });

    it('throws `unavailable` when the body file is missing from the bundle', async () => {
      await writeBundle(tmpRoot, { body: null });
      const reader = buildReader(tmpRoot);

      await expect(reader.getTemplate('demo')).rejects.toMatchObject({
        name: 'LibraryFetchError',
        reason: 'unavailable',
      });
    });

    it('wraps a body parse failure as `malformed`', async () => {
      // Hash matches the served bytes so the integrity check passes and it is
      // the YAML parse that fails.
      const invalidBody = 'not: [valid yaml at all';
      await writeBundle(tmpRoot, {
        body: invalidBody,
        catalogs: { '9.5': catalogForBody(invalidBody) },
      });
      const reader = buildReader(tmpRoot);

      await expect(reader.getTemplate('demo')).rejects.toMatchObject({
        name: 'LibraryFetchError',
        reason: 'malformed',
      });
    });

    it('rejects a body whose content hash does not match the catalog row (`integrity`)', async () => {
      // Catalog row's contentHash describes BODY_YAML but a different body is on
      // disk — a mis-assembled bundle must be rejected before parsing.
      await writeBundle(tmpRoot, { body: FUTURE_BODY_YAML });
      const reader = buildReader(tmpRoot);

      await expect(reader.getTemplate('demo')).rejects.toMatchObject({
        name: 'LibraryFetchError',
        reason: 'integrity',
      });
    });

    it('rejects a body larger than the configured cap (`too-large`)', async () => {
      await writeBundle(tmpRoot);
      const reader = buildReader(tmpRoot, { maxBodyBytes: 8 });

      await expect(reader.getTemplate('demo')).rejects.toMatchObject({
        name: 'LibraryFetchError',
        reason: 'too-large',
      });
    });

    it('rejects a definitionUrl that escapes the bundle root', async () => {
      const escaping = {
        ...CATALOG,
        templates: [{ ...CATALOG.templates[0], definitionUrl: '../../escape.yaml' }],
      };
      await writeBundle(tmpRoot, { catalogs: { '9.5': escaping } });
      const reader = buildReader(tmpRoot);

      await expect(reader.getTemplate('demo')).rejects.toMatchObject({
        name: 'LibraryFetchError',
        reason: 'malformed',
      });
    });
  });

  describe('getHealth', () => {
    it('reports the bundle source mode and no timestamps before the first read', () => {
      const reader = buildReader(tmpRoot);

      expect(reader.getHealth()).toEqual({ sourceMode: 'bundle', lastRefreshAt: null });
    });

    it('records the load timestamp after the first successful read', async () => {
      await writeBundle(tmpRoot);
      const reader = buildReader(tmpRoot);

      await reader.listTemplates();

      expect(reader.getHealth()).toMatchObject({
        sourceMode: 'bundle',
        lastRefreshAt: expect.any(String),
      });
    });

    it('records the error when the bundle cannot be loaded', async () => {
      const reader = buildReader(tmpRoot);

      await expect(reader.listTemplates()).rejects.toBeInstanceOf(LibraryFetchError);
      expect(reader.getHealth().lastError).toBeDefined();
    });
  });
});
