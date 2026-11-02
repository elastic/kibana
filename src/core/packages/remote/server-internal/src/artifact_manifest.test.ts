/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RemoteWorkerSpec } from '@kbn/core-remote-common';
import { readArtifact, sha256 } from './artifact_manifest';
import { FaasBackend } from './faas_backend';

const spec: RemoteWorkerSpec = {
  id: 'workflows',
  root: { tokenId: 'workflows.executor', modulePath: 'executor', exportName: 'Executor' },
  executorProviders: [],
  contributions: [],
  coordinatorTokenIds: [],
};

describe('artifact_manifest', () => {
  let directory: string;
  let artifactHash: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'kbn-faas-manifest-'));
    const handler = 'module.exports = {};';
    writeFileSync(join(directory, 'handler.cjs'), handler);
    const content = { version: 1, files: { 'handler.cjs': sha256(handler) }, spec };
    artifactHash = sha256(JSON.stringify(content));
    writeFileSync(join(directory, 'manifest.json'), JSON.stringify({ ...content, artifactHash }));
  });

  afterEach(() => rmSync(directory, { recursive: true }));

  it('accepts the exact expected manifest and handler bytes', () => {
    expect(readArtifact(directory, artifactHash).spec).toEqual(spec);
  });

  it('rejects a different expected artifact identity', () => {
    expect(() => readArtifact(directory, 'wrong-artifact')).toThrow('identity mismatch');
  });

  it('rejects changed handler bytes under the expected manifest', () => {
    writeFileSync(join(directory, 'handler.cjs'), 'changed handler');
    expect(() => readArtifact(directory, artifactHash)).toThrow('content mismatch');
  });

  it('rejects a changed registered graph before an invocation is admitted', async () => {
    const backend = new FaasBackend({ ...spec, id: 'different-graph' }, new Map(), {
      artifactPath: directory,
      expectedArtifactHash: artifactHash,
      image: 'not-started-by-this-test',
      memoryMiB: 128,
      warm: false,
      addedRttMs: 0,
      callbackHost: '127.0.0.1',
      measurementPath: join(directory, 'unused.jsonl'),
    });
    await expect(backend.ready()).rejects.toThrow('does not match');
  });
});
