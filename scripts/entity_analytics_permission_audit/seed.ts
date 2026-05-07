/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SeedContext } from './types';

export const TEST_ENTITY_NAME = 'ea-audit-test-user';

const adminHeaders = (adminAuth: string): Record<string, string> => ({
  Authorization: `Basic ${adminAuth}`,
  'Content-Type': 'application/json',
  'kbn-xsrf': 'true',
  'elastic-api-version': '2023-10-31',
});

const esHeaders = (adminAuth: string): Record<string, string> => ({
  Authorization: `Basic ${adminAuth}`,
  'Content-Type': 'application/json',
});

const log = (msg: string) => process.stdout.write(`  [seed] ${msg}\n`);
const warn = (msg: string) => process.stderr.write(`  [seed] WARN: ${msg}\n`);

/**
 * Creates `ea-audit-test-user` across all four data surfaces visible in the entity flyout:
 * 1. Watchlist membership (Kibana API)
 * 2. Asset criticality (Kibana API)
 * 3. Risk score document (Elasticsearch direct)
 * 4. Entity store record (Elasticsearch direct)
 */
export const seedTestEntity = async (
  kibanaUrl: string,
  esUrl: string,
  adminAuth: string,
  space: string
): Promise<SeedContext> => {
  const spacePath = space === 'default' ? '' : `/s/${space}`;
  let watchlistId: string | null = null;

  // 1. Create a watchlist (riskModifier is required, 0–2; 1.5 = "High Impact" criticality weight)
  try {
    const wlRes = await fetch(`${kibanaUrl}${spacePath}/api/entity_analytics/watchlists`, {
      method: 'POST',
      headers: adminHeaders(adminAuth),
      body: JSON.stringify({ name: 'ea-audit-fixture-watchlist', riskModifier: 1.5 }),
    });
    if (wlRes.ok) {
      const wlBody = (await wlRes.json()) as { id: string };
      watchlistId = wlBody.id;
      log(`Created watchlist: ${watchlistId}`);
      // Entity assignment via /entities/assign requires a computed EUID which is only available
      // after the normal ingestion pipeline runs. Since we seed the entity store record directly
      // via ES, we embed watchlistId in the entity.attributes.watchlists field instead.
    } else {
      const body = await wlRes.text();
      warn(`Could not create watchlist: ${wlRes.status} ${body.slice(0, 200)}`);
    }
  } catch (err) {
    warn(`Watchlist creation failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Set asset criticality (POST, not PUT — upsert route)
  try {
    const acRes = await fetch(`${kibanaUrl}${spacePath}/api/asset_criticality`, {
      method: 'POST',
      headers: adminHeaders(adminAuth),
      body: JSON.stringify({
        id_field: 'user.name',
        id_value: TEST_ENTITY_NAME,
        criticality_level: 'high_impact',
      }),
    });
    if (acRes.ok) {
      log(`Set asset criticality: high_impact`);
    } else {
      const body = await acRes.text();
      warn(`Could not set asset criticality: ${acRes.status} ${body.slice(0, 200)}`);
    }
  } catch (err) {
    warn(`Asset criticality write failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. Write risk score document directly to ES
  try {
    const rsIndex = `risk-score.risk-score-latest-${space}`;
    const rsRes = await fetch(`${esUrl}/${rsIndex}/_doc/${TEST_ENTITY_NAME}`, {
      method: 'PUT',
      headers: esHeaders(adminAuth),
      body: JSON.stringify({
        '@timestamp': new Date().toISOString(),
        'user.name': TEST_ENTITY_NAME,
        'user.risk': {
          calculated_score_norm: 85,
          calculated_level: 'High',
          id_field: 'user.name',
          id_value: TEST_ENTITY_NAME,
        },
      }),
    });
    if (rsRes.ok) {
      log(`Wrote risk score doc (score_norm: 85, level: High)`);
    } else {
      const body = await rsRes.text();
      warn(`Could not write risk score doc to ${rsIndex}: ${rsRes.status} ${body.slice(0, 200)}`);
    }
  } catch (err) {
    warn(`Risk score write failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 4. Write entity store record directly to ES
  try {
    const esIndex = `.entities.v2.latest.security_${space}`;
    const esRes = await fetch(`${esUrl}/${esIndex}/_doc/${TEST_ENTITY_NAME}`, {
      method: 'PUT',
      headers: esHeaders(adminAuth),
      body: JSON.stringify({
        '@timestamp': new Date().toISOString(),
        'user.name': TEST_ENTITY_NAME,
        'entity.type': 'user',
        'entity.source': 'ea-audit-fixture',
        'entity.attributes': {
          Privileged: true,
          ...(watchlistId ? { watchlists: [watchlistId] } : {}),
        },
        'asset.criticality': 'high_impact',
        'entity.risk': {
          calculated_score_norm: 85,
          calculated_level: 'High',
        },
      }),
    });
    if (esRes.ok) {
      log(`Wrote entity store record (Privileged: true)`);
    } else {
      const body = await esRes.text();
      warn(
        `Could not write entity store record to ${esIndex}: ${esRes.status} ${body.slice(0, 200)}`
      );
    }
  } catch (err) {
    warn(`Entity store write failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { watchlistId };
};

/**
 * Reverses all writes made by seedTestEntity.
 */
export const cleanupTestEntity = async (
  kibanaUrl: string,
  esUrl: string,
  adminAuth: string,
  space: string,
  ctx: SeedContext
): Promise<void> => {
  const spacePath = space === 'default' ? '' : `/s/${space}`;

  // Delete watchlist (also removes the entry)
  if (ctx.watchlistId) {
    try {
      const res = await fetch(
        `${kibanaUrl}${spacePath}/api/entity_analytics/watchlists/${ctx.watchlistId}`,
        { method: 'DELETE', headers: adminHeaders(adminAuth) }
      );
      if (!res.ok && res.status !== 404) {
        const body = await res.text();
        warn(`Could not delete watchlist ${ctx.watchlistId}: ${res.status} ${body.slice(0, 200)}`);
      } else {
        log(`Deleted watchlist ${ctx.watchlistId}`);
      }
    } catch (err) {
      warn(`Watchlist delete failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Delete asset criticality
  try {
    const res = await fetch(
      `${kibanaUrl}${spacePath}/api/asset_criticality?id_field=user.name&id_value=${encodeURIComponent(
        TEST_ENTITY_NAME
      )}`,
      { method: 'DELETE', headers: adminHeaders(adminAuth) }
    );
    if (!res.ok && res.status !== 404) {
      const body = await res.text();
      warn(`Could not delete asset criticality: ${res.status} ${body.slice(0, 200)}`);
    } else {
      log(`Deleted asset criticality for ${TEST_ENTITY_NAME}`);
    }
  } catch (err) {
    warn(`Asset criticality delete failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Delete risk score doc
  try {
    const rsIndex = `risk-score.risk-score-latest-${space}`;
    const res = await fetch(`${esUrl}/${rsIndex}/_doc/${TEST_ENTITY_NAME}`, {
      method: 'DELETE',
      headers: esHeaders(adminAuth),
    });
    if (!res.ok && res.status !== 404) {
      const body = await res.text();
      warn(`Could not delete risk score doc: ${res.status} ${body.slice(0, 200)}`);
    } else {
      log(`Deleted risk score doc from ${rsIndex}`);
    }
  } catch (err) {
    warn(`Risk score delete failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Delete entity store record
  try {
    const esStoreIndex = `.entities.v2.latest.security_${space}`;
    const res = await fetch(`${esUrl}/${esStoreIndex}/_doc/${TEST_ENTITY_NAME}`, {
      method: 'DELETE',
      headers: esHeaders(adminAuth),
    });
    if (!res.ok && res.status !== 404) {
      const body = await res.text();
      warn(`Could not delete entity store record: ${res.status} ${body.slice(0, 200)}`);
    } else {
      log(`Deleted entity store record from ${esStoreIndex}`);
    }
  } catch (err) {
    warn(`Entity store delete failed: ${err instanceof Error ? err.message : String(err)}`);
  }
};
