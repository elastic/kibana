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

let sessionPool: ActiveSession[] = [];
let poolSize = DEFAULT_POOL_SIZE;

function createSession(cloudRegion?: string): ActiveSession {
  const { ip, geo, isIPv6 } = generateIPWithGeo(cloudRegion);
  const requestCount =
    MIN_REQUESTS_PER_SESSION +
    Math.floor(Math.random() * (MAX_REQUESTS_PER_SESSION - MIN_REQUESTS_PER_SESSION));

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
 * Pool size defaults to 50 and scales mildly with the scale parameter.
 */
export function initSessionPool(scale: number = 1, cloudRegion?: string): void {
  poolSize = Math.min(Math.max(DEFAULT_POOL_SIZE, scale * 20), 500);
  sessionPool = [];
  for (let i = 0; i < poolSize; i++) {
    sessionPool.push(createSession(cloudRegion));
  }
}

/**
 * Get an active session from the pool.
 *
 * Picks a random session, decrements its remaining request count,
 * and replaces it with a fresh session once it expires. This produces
 * realistic session lifecycles: each session ID appears in multiple
 * log lines before disappearing.
 */
export function getActiveSession(cloudRegion?: string): ActiveSession {
  if (sessionPool.length === 0) {
    initSessionPool(1, cloudRegion);
  }

  const index = Math.floor(Math.random() * sessionPool.length);
  const session = sessionPool[index];

  session.remainingRequests--;

  if (session.remainingRequests <= 0) {
    sessionPool[index] = createSession(cloudRegion);
  }

  return session;
}

/**
 * Reset the session pool (useful for tests).
 */
export function resetSessionPool(): void {
  sessionPool = [];
}
