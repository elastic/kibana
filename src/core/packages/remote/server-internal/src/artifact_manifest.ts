/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RemoteWorkerSpec } from '@kbn/core-remote-common';

export interface ArtifactManifest {
  readonly version: 1;
  readonly artifactHash: string;
  readonly files: Readonly<Record<string, string>>;
  readonly spec: RemoteWorkerSpec;
}

export const sha256 = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');

export function readArtifact(directory: string, expected: string): ArtifactManifest {
  const manifest: ArtifactManifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
  const { artifactHash, ...content } = manifest;
  if (manifest.version !== 1 || artifactHash !== expected || sha256(JSON.stringify(content)) !== expected) {
    throw new Error('Executor artifact identity mismatch');
  }
  for (const [name, hash] of Object.entries(manifest.files)) {
    if (name !== 'handler.cjs' || sha256(readFileSync(join(directory, name))) !== hash) {
      throw new Error(`Executor artifact content mismatch: ${name}`);
    }
  }
  if (!manifest.files['handler.cjs']) throw new Error('Executor handler missing from manifest');
  return manifest;
}

/** Absolute source/dist paths are discovery details, not deployable module identities. */
export function portableSpec(spec: RemoteWorkerSpec): RemoteWorkerSpec {
  const reference = <T extends { modulePath: string; exportName: string }>(value: T): T => ({
    ...value, modulePath: value.modulePath.replaceAll('\\', '/').replace(/^.*\/(src|x-pack)\//, '$1/').replace(/\.(ts|js)$/, ''),
  });
  return {
    ...spec,
    root: reference(spec.root),
    catalog: spec.catalog && reference(spec.catalog),
    executorProviders: spec.executorProviders.map(reference).sort((a, b) => a.tokenId.localeCompare(b.tokenId)),
    contributions: spec.contributions.map(reference).sort((a, b) => a.stepType.localeCompare(b.stepType)),
    coordinatorTokenIds: [...spec.coordinatorTokenIds].sort(),
  };
}
