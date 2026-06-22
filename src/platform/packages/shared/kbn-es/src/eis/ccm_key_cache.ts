/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * TTL-based file cache for the EIS CCM API key.
 *
 * Stores the key at ~/.elastic/eis-ccm-key.json so that repeated `yarn es
 * snapshot --eis` runs don't require a Vault round-trip every time. The TTL
 * defaults to 24 hours and is configurable via the EIS_CCM_KEY_TTL_HOURS env
 * var. It is intentionally short: since elastic/elasticsearch#139088,
 * `PUT _inference/_ccm` validates the key against the EIS gateway, so a
 * rotated-but-still-cached key hard-fails `--eis` startup. The shorter TTL
 * (plus pre-use validation in `resolveCcmApiKey`) limits that window.
 *
 * Three read modes:
 *  - `readCachedKey` — returns the key only if within TTL.
 *  - `readStaleKey`  — returns the key regardless of age (fallback when Vault
 *    is unreachable).
 *  - `writeCachedKey` — persists a freshly-fetched key with a timestamp.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

interface CachedKey {
  key: string;
  fetched_at_ms: number;
  vault_addr: string;
}

const CACHE_DIR = path.join(os.homedir(), '.elastic');
const CACHE_PATH = path.join(CACHE_DIR, 'eis-ccm-key.json');
const DEFAULT_TTL_HOURS = 24;

const getTtlMs = (): number => {
  const envHours = process.env.EIS_CCM_KEY_TTL_HOURS;
  const hours = envHours ? parseInt(envHours, 10) : DEFAULT_TTL_HOURS;
  return (isNaN(hours) ? DEFAULT_TTL_HOURS : hours) * 60 * 60 * 1000;
};

export const readCachedKey = (): string | undefined => {
  try {
    if (!fs.existsSync(CACHE_PATH)) {
      return undefined;
    }

    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    const cached: CachedKey = JSON.parse(raw);

    if (!cached.key || !cached.fetched_at_ms) {
      return undefined;
    }

    const age = Date.now() - cached.fetched_at_ms;
    if (age > getTtlMs()) {
      return undefined;
    }

    return cached.key;
  } catch {
    return undefined;
  }
};

export const readStaleKey = (): string | undefined => {
  try {
    if (!fs.existsSync(CACHE_PATH)) {
      return undefined;
    }
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    const cached: CachedKey = JSON.parse(raw);
    return cached.key || undefined;
  } catch {
    return undefined;
  }
};

export const writeCachedKey = (key: string, vaultAddr: string): void => {
  const entry: CachedKey = {
    key,
    fetched_at_ms: Date.now(),
    vault_addr: vaultAddr,
  };

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(entry, null, 2), { encoding: 'utf-8', mode: 0o600 });
};

/**
 * Removes the cached key file. Used to evict a cached key that failed
 * validation against the EIS gateway (e.g. it was rotated or revoked), so the
 * next resolution falls back to Vault. No-op when the file is absent.
 */
export const clearCachedKey = (): void => {
  try {
    fs.rmSync(CACHE_PATH, { force: true });
  } catch {
    // Best-effort eviction — a failure here shouldn't break the resolve flow.
  }
};
