/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import Path from 'path';
import { createHash } from 'crypto';
import semver from 'semver';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import type { IndexManifest, JsonObject, VariantName } from '@kbn/workflow-step-schema-cli';
import { VARIANTS } from './types';
import { compileValidators, type VariantValidator } from './compile_validators';

export type { VariantValidator } from './compile_validators';

/** The resolved, integrity-verified, parsed schema documents (pre-compile). */
export interface LoadedSchemaDocuments {
  manifest: IndexManifest;
  schemas: Record<VariantName, JsonObject>;
  /** Human-readable description of where the schema came from. */
  source: string;
}

/** The compiled validators for both variants plus provenance metadata. */
export interface LoadedValidators {
  manifest: IndexManifest;
  validators: Record<VariantName, VariantValidator>;
  /** Human-readable description of where the schema came from. */
  source: string;
}

export interface LoadValidatorsOptions {
  /** Explicit schema source: a bundle directory or an `http(s)://` base URL. */
  schema?: string;
  /** CDN base URL fallback (no built-in default). */
  cdnUrl?: string;
  /** Select a version under the local target dir. */
  kibanaVersion?: string;
  /** Select a channel under the local target dir. */
  channel?: string;
  log?: ToolingLog;
}

const DEFAULT_TARGET_DIR = Path.resolve(REPO_ROOT, 'target/workflow_step_schemas');
const DEFAULT_CHANNEL = 'release';
const INDEX_FILE = 'index.json';

const isUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const sha256Hex = (input: string): string =>
  createHash('sha256').update(input, 'utf8').digest('hex');

/**
 * Reads bundle files (`index.json`, `<variant>/schema.json`) by their path
 * relative to the bundle root. Backed by the filesystem or by HTTP so local
 * artifacts and CDN/URL sources share the same loading logic.
 */
interface BundleReader {
  readText(relativePath: string): Promise<string>;
  readonly source: string;
}

const createFsReader = (baseDir: string): BundleReader => ({
  source: baseDir,
  readText: async (relativePath) => {
    const absolute = Path.join(baseDir, relativePath);
    return fs.promises.readFile(absolute, 'utf8');
  },
});

const createHttpReader = (baseUrl: string): BundleReader => {
  let end = baseUrl.length;
  while (end > 0 && baseUrl.charCodeAt(end - 1) === 47 /* '/' */) {
    end--;
  }
  const normalizedBase = baseUrl.slice(0, end);
  return {
    source: normalizedBase,
    readText: async (relativePath) => {
      const url = `${normalizedBase}/${relativePath}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
      }
      return response.text();
    },
  };
};

/** Highest-semver `<version>` directory under the local target dir, if any. */
const findHighestVersion = (targetDir: string): string | undefined => {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(targetDir, { withFileTypes: true });
  } catch {
    return undefined;
  }
  const versions = entries
    .filter((entry) => entry.isDirectory() && semver.valid(entry.name) !== null)
    .map((entry) => entry.name)
    .sort(semver.rcompare);
  return versions[0];
};

/**
 * Resolve the bundle reader in priority order: explicit `--schema`
 * (path or URL), then the local `target/` lookup, then the configured CDN.
 * Throws a descriptive error when nothing resolves.
 */
const resolveReader = (options: LoadValidatorsOptions): BundleReader => {
  const { schema, cdnUrl, kibanaVersion, channel = DEFAULT_CHANNEL } = options;

  if (schema) {
    if (isUrl(schema)) {
      return createHttpReader(schema);
    }
    const absolute = Path.resolve(schema);
    if (!fs.existsSync(Path.join(absolute, INDEX_FILE))) {
      throw new Error(`No ${INDEX_FILE} found in --schema directory: ${absolute}`);
    }
    return createFsReader(absolute);
  }

  const version = kibanaVersion ?? findHighestVersion(DEFAULT_TARGET_DIR);
  if (version) {
    const bundleDir = Path.join(DEFAULT_TARGET_DIR, version, channel);
    if (fs.existsSync(Path.join(bundleDir, INDEX_FILE))) {
      return createFsReader(bundleDir);
    }
  }

  if (cdnUrl) {
    return createHttpReader(cdnUrl);
  }

  throw new Error(
    `Could not resolve a schema artifact. Tried: --schema (not provided), ` +
      `local ${DEFAULT_TARGET_DIR}/${version ?? '<version>'}/${channel}/${INDEX_FILE} (missing), ` +
      `and CDN fallback (not configured; pass --schema-cdn-url or set KBN_WORKFLOW_SCHEMA_CDN_URL). ` +
      `Generate one with 'node scripts/generate_workflow_step_schemas.js'.`
  );
};

const readAndVerifyVariant = async (
  reader: BundleReader,
  manifest: IndexManifest,
  variant: VariantName
): Promise<JsonObject> => {
  const entry = manifest.variants[variant];
  if (!entry) {
    throw new Error(`Manifest is missing the "${variant}" variant`);
  }

  const bytes = await reader.readText(entry.path);
  const actualSha = sha256Hex(bytes);
  if (actualSha !== entry.sha256) {
    throw new Error(
      `Integrity check failed for ${variant} (${entry.path}): expected ${entry.sha256}, got ${actualSha}`
    );
  }

  return JSON.parse(bytes) as JsonObject;
};

/**
 * Resolve the schema source, read + integrity-verify the manifest and each
 * variant, and JSON-parse them. This is the ajv-free half of {@link loadValidators}
 * (kept separate so it is unit-testable under jest's no-codegen sandbox).
 */
export const loadSchemaDocuments = async (
  options: LoadValidatorsOptions = {}
): Promise<LoadedSchemaDocuments> => {
  const reader = resolveReader(options);
  options.log?.debug(`Loading workflow schema artifact from ${reader.source}`);

  const indexText = await reader.readText(INDEX_FILE);
  const manifest = JSON.parse(indexText) as IndexManifest;

  const schemas = {} as Record<VariantName, JsonObject>;
  for (const variant of VARIANTS) {
    schemas[variant] = await readAndVerifyVariant(reader, manifest, variant);
  }

  return { manifest, schemas, source: reader.source };
};

/**
 * Resolve, verify, and compile both schema variants into ajv validators on the
 * current thread. Note the CLI validates in a worker thread (see
 * `create_schema_validator.ts`) so deeply-nested workflows do not overflow the
 * main thread's stack; this helper stays for programmatic/one-shot use.
 */
export const loadValidators = async (
  options: LoadValidatorsOptions = {}
): Promise<LoadedValidators> => {
  const { manifest, schemas, source } = await loadSchemaDocuments(options);
  return { manifest, validators: compileValidators(schemas), source };
};
