/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

/** Stands in for the repo root, so tests don't touch the real `.es/secrets` or `.es/idp_metadata.xml`. */
export const mockRepoRoot = join(tmpdir(), `kbn-es-docker-${randomUUID()}`);

const mockSecretsDir = resolve(mockRepoRoot, '.es', 'secrets');

jest.doMock('../paths', () => ({
  ...jest.requireActual('../paths'),
  SERVERLESS_IDP_METADATA_PATH: resolve(mockRepoRoot, '.es', 'idp_metadata.xml'),
  SERVERLESS_SECRETS_DIR: mockSecretsDir,
  SERVERLESS_OPERATOR_PATH: resolve(mockSecretsDir, 'operator'),
}));
