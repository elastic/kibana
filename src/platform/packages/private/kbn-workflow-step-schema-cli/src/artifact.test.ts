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
import { transformToStrict } from './template_transform';
import { stableStringify } from './measure';
import { writeVariant } from './write_artifact';
import { loadVariantSchema } from './reassemble';
import type { ArtifactReader } from './reassemble';
import type { IndexManifest, JsonObject, VariantManifest } from './types';

const baseDoc: JsonObject = {
  type: 'object',
  properties: {
    steps: { type: 'array', items: { $ref: '#/definitions/step' } },
    settings: { type: 'object', properties: { timeout: { type: 'number' } } },
  },
  definitions: {
    step: { anyOf: [{ $ref: '#/definitions/delayStep' }, { $ref: '#/definitions/httpStep' }] },
    delayStep: {
      type: 'object',
      properties: { type: { type: 'string', const: 'delay' }, seconds: { type: 'number' } },
      required: ['type'],
      additionalProperties: false,
    },
    httpStep: {
      type: 'object',
      properties: { type: { type: 'string', const: 'http' }, url: { type: 'string' } },
      required: ['type'],
      additionalProperties: false,
    },
    shared: { type: 'object', properties: { foo: { type: 'string' } } },
  },
};

const makeTmpDir = (): string => fs.mkdtempSync(Path.join(os.tmpdir(), 'wf-schema-'));

const fsReader = (bundleDir: string): ArtifactReader => ({
  readJson: (relativePath: string) =>
    JSON.parse(fs.readFileSync(Path.join(bundleDir, relativePath), 'utf8')) as JsonObject,
});

const manifestFor = (variant: VariantManifest): IndexManifest => ({
  kibanaVersion: '9.4.0',
  buildHash: 'test',
  profile: 'superset',
  channel: 'release',
  generatedAt: '2026-01-01T00:00:00.000Z',
  connectorTypes: [],
  stepTypes: [],
  triggerTypes: [],
  chunkThresholdBytes: 0,
  variants: { strict: variant, template: variant },
});

describe('writeVariant + loadVariantSchema round-trip', () => {
  const strictDoc = transformToStrict(baseDoc);
  const canonicalOriginal = stableStringify(strictDoc, false);

  it('stays single below the threshold and reassembles to the original', async () => {
    const bundleDir = makeTmpDir();
    const manifest = writeVariant({
      bundleDir,
      variant: 'strict',
      doc: strictDoc,
      chunkThresholdBytes: 10 * 1024 * 1024,
    });

    expect(manifest.mode).toBe('single');
    expect(manifest.chunks).toHaveLength(1);
    expect(manifest.chunks[0].path).toBe('strict/schema.json');
    expect(fs.existsSync(Path.join(bundleDir, 'strict/schema.json'))).toBe(true);

    const reassembled = await loadVariantSchema(manifestFor(manifest), 'strict', fsReader(bundleDir));
    expect(stableStringify(reassembled, false)).toBe(canonicalOriginal);
  });

  it('chunks at/above the threshold and reassembles to the original', async () => {
    const bundleDir = makeTmpDir();
    const manifest = writeVariant({
      bundleDir,
      variant: 'strict',
      doc: strictDoc,
      chunkThresholdBytes: 0,
    });

    expect(manifest.mode).toBe('chunked');
    expect(manifest.defsKey).toBe('definitions');
    expect(manifest.chunks.some((chunk) => chunk.role === 'root')).toBe(true);
    // delayStep / httpStep are detected as step branches and routed under steps/.
    const stepPaths = manifest.chunks.filter((chunk) => chunk.role === 'step').map((c) => c.path);
    expect(stepPaths).toEqual(
      expect.arrayContaining(['strict/steps/delay.json', 'strict/steps/http.json'])
    );
    // shared / step (the union) are ordinary defs.
    expect(manifest.chunks.some((chunk) => chunk.path === 'strict/defs/shared.json')).toBe(true);
    // The shared template-value definition is chunked like any other def.
    expect(
      manifest.chunks.some((chunk) => chunk.path === 'strict/defs/__workflowTemplateValue.json')
    ).toBe(true);

    const reassembled = await loadVariantSchema(manifestFor(manifest), 'strict', fsReader(bundleDir));
    expect(stableStringify(reassembled, false)).toBe(canonicalOriginal);
  });

  it('reports informational metrics', () => {
    const bundleDir = makeTmpDir();
    const manifest = writeVariant({
      bundleDir,
      variant: 'strict',
      doc: strictDoc,
      chunkThresholdBytes: 0,
    });
    // 4 original defs + the injected shared template-value definition.
    expect(manifest.defsCount).toBe(5);
    expect(manifest.unionBranchCount).toBe(2);
    expect(manifest.gzipBytes).toBeGreaterThan(0);
    expect(manifest.sizeBytes).toBeGreaterThan(manifest.gzipBytes);
  });

  it('verifies chunk integrity on reassembly', async () => {
    const bundleDir = makeTmpDir();
    const manifest = writeVariant({
      bundleDir,
      variant: 'strict',
      doc: strictDoc,
      chunkThresholdBytes: 0,
    });
    // Corrupt one chunk on disk.
    const target = Path.join(bundleDir, 'strict/defs/shared.json');
    fs.writeFileSync(target, JSON.stringify({ tampered: true }));

    await expect(
      loadVariantSchema(manifestFor(manifest), 'strict', fsReader(bundleDir))
    ).rejects.toThrow(/Integrity check failed/);
  });
});

describe('determinism', () => {
  it('produces identical output + sha256 across runs', () => {
    const strictDoc = transformToStrict(baseDoc);
    const dirA = makeTmpDir();
    const dirB = makeTmpDir();
    const manifestA = writeVariant({
      bundleDir: dirA,
      variant: 'strict',
      doc: strictDoc,
      chunkThresholdBytes: 10 * 1024 * 1024,
    });
    const manifestB = writeVariant({
      bundleDir: dirB,
      variant: 'strict',
      doc: strictDoc,
      chunkThresholdBytes: 10 * 1024 * 1024,
    });

    expect(manifestA.sha256).toBe(manifestB.sha256);
    expect(fs.readFileSync(Path.join(dirA, 'strict/schema.json'), 'utf8')).toBe(
      fs.readFileSync(Path.join(dirB, 'strict/schema.json'), 'utf8')
    );
  });

  it('serializes index.json with deterministic key ordering', () => {
    const strictDoc = transformToStrict(baseDoc);
    const bundleDir = makeTmpDir();
    const variant = writeVariant({
      bundleDir,
      variant: 'strict',
      doc: strictDoc,
      chunkThresholdBytes: 10 * 1024 * 1024,
    });
    const manifest = manifestFor(variant);
    expect(stableStringify(JSON.parse(JSON.stringify(manifest)), true)).toBe(
      stableStringify(JSON.parse(JSON.stringify(manifest)), true)
    );
  });
});
