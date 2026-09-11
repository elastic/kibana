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
import { sha256Hex } from './hash';
import { writeIndex, writeVariant } from './write_artifact';
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
  },
};

const makeTmpDir = (): string => fs.mkdtempSync(Path.join(os.tmpdir(), 'wf-schema-'));

const manifestFor = (variant: VariantManifest): IndexManifest => ({
  profile: 'superset',
  connectorTypes: [],
  stepTypes: ['delay', 'http'],
  triggerTypes: [],
  variants: { strict: variant, template: variant },
});

describe('writeVariant', () => {
  const strictDoc = transformToStrict(baseDoc);

  it('writes a single minified schema.json whose bytes hash to the manifest sha256', () => {
    const bundleDir = makeTmpDir();
    const manifest = writeVariant({ bundleDir, variant: 'strict', doc: strictDoc });

    expect(manifest.path).toBe('strict/schema.json');
    const absolute = Path.join(bundleDir, 'strict/schema.json');
    expect(fs.existsSync(absolute)).toBe(true);

    const written = fs.readFileSync(absolute, 'utf8');
    // sha256 is over the exact served bytes (after canonicalization).
    expect(manifest.sha256).toBe(sha256Hex(written));
    // The bytes are valid JSON and can be round-tripped.
    expect(() => JSON.parse(written)).not.toThrow();
  });
});

describe('determinism', () => {
  const strictDoc = transformToStrict(baseDoc);

  it('produces byte-identical schema.json + sha256 across runs', () => {
    const dirA = makeTmpDir();
    const dirB = makeTmpDir();
    const manifestA = writeVariant({ bundleDir: dirA, variant: 'strict', doc: strictDoc });
    const manifestB = writeVariant({ bundleDir: dirB, variant: 'strict', doc: strictDoc });

    expect(manifestA.sha256).toBe(manifestB.sha256);
    expect(fs.readFileSync(Path.join(dirA, 'strict/schema.json'), 'utf8')).toBe(
      fs.readFileSync(Path.join(dirB, 'strict/schema.json'), 'utf8')
    );
  });

  it('writes a byte-identical index.json across runs (no timestamp, sorted keys)', () => {
    const dirA = makeTmpDir();
    const dirB = makeTmpDir();
    const variantA = writeVariant({ bundleDir: dirA, variant: 'strict', doc: strictDoc });
    const variantB = writeVariant({ bundleDir: dirB, variant: 'strict', doc: strictDoc });

    const indexA = writeIndex(dirA, manifestFor(variantA));
    const indexB = writeIndex(dirB, manifestFor(variantB));

    expect(fs.readFileSync(indexA, 'utf8')).toBe(fs.readFileSync(indexB, 'utf8'));
  });

  it('index.json contains no generatedAt field', () => {
    const bundleDir = makeTmpDir();
    const variant = writeVariant({ bundleDir, variant: 'strict', doc: strictDoc });
    const indexPath = writeIndex(bundleDir, manifestFor(variant));
    const parsed = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as Record<string, unknown>;
    expect(parsed.generatedAt).toBeUndefined();
  });

  it('canonicalizes anyOf members: two docs with swapped anyOf order produce identical bytes and sha256', () => {
    const docA: JsonObject = {
      anyOf: [{ type: 'string' }, { type: 'number' }],
    };
    const docB: JsonObject = {
      anyOf: [{ type: 'number' }, { type: 'string' }],
    };
    const dirA = makeTmpDir();
    const dirB = makeTmpDir();
    const manifestA = writeVariant({ bundleDir: dirA, variant: 'strict', doc: docA });
    const manifestB = writeVariant({ bundleDir: dirB, variant: 'strict', doc: docB });

    expect(manifestA.sha256).toBe(manifestB.sha256);
    expect(fs.readFileSync(Path.join(dirA, 'strict/schema.json'), 'utf8')).toBe(
      fs.readFileSync(Path.join(dirB, 'strict/schema.json'), 'utf8')
    );
  });

  it('does NOT sort enum members: curated order (e.g. severity levels) is preserved', () => {
    const doc: JsonObject = {
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    };
    const bundleDir = makeTmpDir();
    writeVariant({ bundleDir, variant: 'strict', doc });
    const written = fs.readFileSync(Path.join(bundleDir, 'strict/schema.json'), 'utf8');
    const parsed = JSON.parse(written) as { enum: string[] };
    expect(parsed.enum).toEqual(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
  });

  it('does NOT sort tuple-form items arrays: element order is semantically significant', () => {
    // tuple-form items is an array, not a keyword-specific marker; the writer
    // must not reorder it even if another keyword on the same object is sorted.
    const doc: JsonObject = {
      type: 'array',
      anyOf: [{ type: 'string' }, { type: 'number' }],
      items: [{ type: 'boolean' }, { type: 'string' }, { type: 'null' }],
    };
    const bundleDir = makeTmpDir();
    writeVariant({ bundleDir, variant: 'strict', doc });
    const written = fs.readFileSync(Path.join(bundleDir, 'strict/schema.json'), 'utf8');
    const parsed = JSON.parse(written) as { items: Array<{ type: string }> };
    expect(parsed.items.map((i) => i.type)).toEqual(['boolean', 'string', 'null']);
  });
});
