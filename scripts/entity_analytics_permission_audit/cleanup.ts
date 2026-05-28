/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Persona, SeedContext } from './types';
import { cleanupTestEntity } from './seed';

const deleteResource = async (
  url: string,
  adminAuth: string,
  label: string,
  needsKbnXsrf: boolean
): Promise<void> => {
  try {
    const headers: Record<string, string> = { Authorization: `Basic ${adminAuth}` };
    if (needsKbnXsrf) headers['kbn-xsrf'] = 'true';
    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok && res.status !== 404) {
      const body = await res.text();
      process.stderr.write(
        `  [cleanup] WARNING: could not delete ${label}: ${res.status} ${body.slice(0, 120)}\n`
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`  [cleanup] WARNING: request failed for ${label}: ${msg}\n`);
  }
};

export const cleanupAll = async (
  kibanaUrl: string,
  esUrl: string,
  adminAuth: string,
  space: string,
  personas: Persona[],
  seedCtx: SeedContext | null
): Promise<void> => {
  if (seedCtx) {
    process.stdout.write('\nCleaning up seeded test entity data...\n');
    await cleanupTestEntity(kibanaUrl, esUrl, adminAuth, space, seedCtx);
  }
  await cleanupPersonas(kibanaUrl, esUrl, adminAuth, personas);
};

export const cleanupPersonas = async (
  kibanaUrl: string,
  esUrl: string,
  adminAuth: string,
  personas: Persona[]
): Promise<void> => {
  process.stdout.write('\nCleaning up test roles and users...\n');
  for (const persona of personas) {
    // Users are created via ES native API
    await deleteResource(
      `${esUrl}/_security/user/${persona.username}`,
      adminAuth,
      `user ${persona.username}`,
      false
    );
    // Roles are created via Kibana API
    await deleteResource(
      `${kibanaUrl}/api/security/role/${persona.roleName}`,
      adminAuth,
      `role ${persona.roleName}`,
      true
    );
  }
  process.stdout.write('Cleanup complete.\n');
};
