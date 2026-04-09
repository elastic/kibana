/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Session pool for HTTP access logs.
 *
 * Maintains a rotating pool of user sessions so that logs show realistic
 * session continuity: the same session ID appears across multiple sequential
 * requests with a consistent user agent and client IP, simulating a user
 * browsing through pages before the session expires.
 */

import { generateIPWithGeo, type GeoLocation } from './geo_ip_mappings';
import { getRandomItem, USER_AGENTS, generateSessionId } from './http_field_generators';
import { random } from './http_random';

interface ActiveSession {
  sessionId: string;
  userAgent: string;
  clientIp: string;
  geo: GeoLocation;
  isIPv6: boolean;
  remainingRequests: number;
}

const MIN_REQUESTS_PER_SESSION = 3;
const MAX_REQUESTS_PER_SESSION = 25;
const DEFAULT_POOL_SIZE = 50;

let sessionPool: Map<string, ActiveSession[]> = new Map();
let perRegionPoolSize = DEFAULT_POOL_SIZE;

function createSession(cloudRegion?: string): ActiveSession {
  const { ip, geo, isIPv6 } = generateIPWithGeo(cloudRegion);
  const requestCount =
    MIN_REQUESTS_PER_SESSION +
    Math.floor(random() * (MAX_REQUESTS_PER_SESSION - MIN_REQUESTS_PER_SESSION));

  return {
    sessionId: generateSessionId(),
    userAgent: getRandomItem(USER_AGENTS),
    clientIp: ip,
    geo,
    isIPv6,
    remainingRequests: requestCount,
  };
}

/**
 * Initialize the session pool. Call once at scenario startup.
 *
 * Creates a separate pool of sessions per cloud region so that each region's
 * sessions carry the correct geo bias (80 % same-continent traffic).
 * Pool size per region defaults to 50 and scales mildly with the scale parameter.
 */
export function initSessionPool(scale: number = 1, cloudRegions: string[] = []): void {
  perRegionPoolSize = Math.min(Math.max(DEFAULT_POOL_SIZE, scale * 20), 500);
  sessionPool = new Map();
  for (const region of cloudRegions) {
    const regionSessions: ActiveSession[] = [];
    for (let i = 0; i < perRegionPoolSize; i++) {
      regionSessions.push(createSession(region));
    }
    sessionPool.set(region, regionSessions);
  }
}

/**
 * Get an active session from the region-specific pool.
 *
 * Picks a random session whose geo bias matches the given cloud region,
 * decrements its remaining request count, and replaces it with a fresh
 * session (same region bias) once it expires.
 */
export function getActiveSession(cloudRegion?: string): ActiveSession {
  const key = cloudRegion ?? '';

  let pool = sessionPool.get(key);
  if (!pool || pool.length === 0) {
    pool = [];
    for (let i = 0; i < perRegionPoolSize; i++) {
      pool.push(createSession(cloudRegion));
    }
    sessionPool.set(key, pool);
  }

  const index = Math.floor(random() * pool.length);
  const session = pool[index];

  session.remainingRequests--;

  if (session.remainingRequests <= 0) {
    pool[index] = createSession(cloudRegion);
  }

  return session;
}

/**
 * Reset the session pool (useful for tests).
 */
export function resetSessionPool(): void {
  sessionPool = new Map();
}
