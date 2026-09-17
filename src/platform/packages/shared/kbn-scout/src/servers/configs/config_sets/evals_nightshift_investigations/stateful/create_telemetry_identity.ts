/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pbkdf2Sync, randomBytes } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import { stringify } from 'yaml';

interface TelemetryIdentity {
  username: string;
  password: string;
  files: string[];
}

/** Adds a read-only telemetry identity to Scout's Elasticsearch file realm. */
export const createTelemetryIdentity = (
  directory: string,
  inheritedFiles: string[]
): TelemetryIdentity => {
  const username = 'nightshift_evals_telemetry';
  const password = randomBytes(32).toString('hex');
  const salt = randomBytes(32);
  // Elasticsearch's PBKDF2 file-realm format uses HMAC-SHA512 and a 256-bit derived key.
  const hash = pbkdf2Sync(password, salt, 10000, 32, 'sha512');
  const additions: Record<string, string> = {
    users: `${username}:{PBKDF2}10000$${salt.toString('base64')}$${hash.toString('base64')}\n`,
    users_roles: `${username}:${username}\n`,
    'roles.yml': stringify({
      [username]: {
        cluster: [],
        indices: [
          {
            names: ['logs-*', 'metrics-*', 'traces-*'],
            privileges: ['read', 'view_index_metadata'],
            allow_restricted_indices: false,
          },
        ],
        run_as: [],
      },
    }),
  };
  const realmFiles = Object.entries(additions).map(([name, content]) => {
    const inherited = inheritedFiles
      .filter((path) => basename(path) === name)
      .map((path) => readFileSync(path, 'utf8').trimEnd())
      .filter(Boolean)
      .join('\n');
    const path = join(directory, name);
    writeFileSync(path, [inherited, content].filter(Boolean).join('\n'), { mode: 0o600 });
    return path;
  });
  return {
    username,
    password,
    files: [
      ...inheritedFiles.filter((path) => !Object.hasOwn(additions, basename(path))),
      ...realmFiles,
    ],
  };
};
