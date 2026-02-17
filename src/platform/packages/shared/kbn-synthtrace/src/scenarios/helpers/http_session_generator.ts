/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Session-based traffic generator for realistic user journeys.
 * Tracks user sessions with correlated requests, referrer chains, and behavior patterns.
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import { generateIPWithGeo } from './geo_ip_mappings';
import { getRandomItem, generateSessionId } from './http_field_generators';

/**
 * User session state tracking.
 */
interface UserSession {
  sessionId: string;
  userId: string;
  ip: string;
  startTime: number;
  lastPath: string;
  requestCount: number;
  isAuthenticated: boolean;
  userAgent: string;
}

/**
 * Active sessions cache (in-memory for session correlation).
 */
const activeSessions: Map<string, UserSession> = new Map();

/**
 * Session cleanup interval (remove sessions older than 30 minutes).
 */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Time-based cleanup interval (run cleanup at least every 5 minutes).
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let lastCleanupTime = Date.now();

/**
 * Clean up expired sessions.
 */
export function cleanupExpiredSessions(): void {
  const now = Date.now();
  const expiredSessions: string[] = [];

  activeSessions.forEach((session, sessionId) => {
    if (now - session.startTime > SESSION_TIMEOUT_MS) {
      expiredSessions.push(sessionId);
    }
  });

  expiredSessions.forEach((sessionId) => activeSessions.delete(sessionId));
}

/**
 * Get or create a user session.
 */
export function getOrCreateSession(): UserSession {
  // 30% chance to use existing session, 70% create new
  const useExisting = Math.random() < 0.3 && activeSessions.size > 0;

  if (useExisting) {
    const sessions = Array.from(activeSessions.values());
    const existingSession = getRandomItem(sessions);
    existingSession.requestCount++;
    return existingSession;
  }

  // Create new session
  const { ip } = generateIPWithGeo();
  const sessionId = generateSessionId();
  const userId = `user-${Math.floor(Math.random() * 1000)}`;
  const userAgent = getRandomItem([
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1',
  ]);

  const newSession: UserSession = {
    sessionId,
    userId,
    ip,
    startTime: Date.now(),
    lastPath: '/',
    requestCount: 1,
    isAuthenticated: Math.random() < 0.6, // 60% authenticated
    userAgent,
  };

  activeSessions.set(sessionId, newSession);

  // Dual cleanup strategy to prevent memory leaks:
  // 1. Size-based: cleanup when map exceeds 1000 sessions
  // 2. Time-based: cleanup at least every 5 minutes
  const now = Date.now();
  const shouldCleanupBySize = activeSessions.size > 1000;
  const shouldCleanupByTime = now - lastCleanupTime > CLEANUP_INTERVAL_MS;

  if (shouldCleanupBySize || shouldCleanupByTime) {
    cleanupExpiredSessions();
    lastCleanupTime = now;
  }

  return newSession;
}

/**
 * Generate a realistic user journey (sequence of related requests).
 * Examples:
 * - Homepage → Product → Add to Cart → Checkout → Payment
 * - Login → Dashboard → Settings → Logout
 * - Search → Results → Product Detail → Reviews
 */
export function generateUserJourney(): Array<Partial<LogDocument>> {
  const session = getOrCreateSession();
  const journeys = [
    // E-commerce journey
    {
      name: 'shopping',
      paths: ['/home', '/products', '/product/123', '/cart', '/checkout', '/payment'],
      methods: ['GET', 'GET', 'GET', 'POST', 'GET', 'POST'],
      statusCodes: [200, 200, 200, 200, 200, 201],
    },
    // Authentication journey
    {
      name: 'auth',
      paths: ['/login', '/dashboard', '/profile', '/settings', '/logout'],
      methods: ['GET', 'GET', 'GET', 'GET', 'POST'],
      statusCodes: [200, 200, 200, 200, 200],
    },
    // Search journey
    {
      name: 'search',
      paths: ['/search', '/results', '/product/456', '/reviews'],
      methods: ['GET', 'GET', 'GET', 'GET'],
      statusCodes: [200, 200, 200, 200],
    },
    // API usage journey
    {
      name: 'api',
      paths: ['/api/users', '/api/users/123', '/api/orders', '/api/analytics'],
      methods: ['GET', 'GET', 'POST', 'GET'],
      statusCodes: [200, 200, 201, 200],
    },
  ];

  const journey = getRandomItem(journeys);
  const requests: Array<Partial<LogDocument>> = [];

  // Generate requests for this journey
  for (let i = 0; i < journey.paths.length; i++) {
    const logData: Partial<LogDocument> = {
      'client.ip': session.ip,
      'session.id': session.sessionId,
      'user.name': session.isAuthenticated ? session.userId : undefined,
      'http.request.method': journey.methods[i],
      'url.path': journey.paths[i],
      'http.response.status_code': journey.statusCodes[i],
      'user_agent.name': session.userAgent,
      'http.request.referrer': i > 0 ? `https://example.com${journey.paths[i - 1]}` : '-',
      'event.action': `user_journey_${journey.name}`,
      'event.category': 'web',
      'event.sequence': i + 1,
      tags: ['user-journey', journey.name],
    };

    requests.push(logData);
    session.lastPath = journey.paths[i];
  }

  return requests;
}

/**
 * Generate brute force attack pattern.
 * Multiple failed login attempts from same IP in short time.
 */
export function generateBruteForcePattern(): Array<Partial<LogDocument>> {
  const { ip } = generateIPWithGeo();
  const attempts = Math.floor(Math.random() * 10) + 5; // 5-15 attempts
  const requests: Array<Partial<LogDocument>> = [];

  for (let i = 0; i < attempts; i++) {
    const logData: Partial<LogDocument> = {
      'client.ip': ip,
      'http.request.method': 'POST',
      'url.path': '/login',
      'http.response.status_code': i === attempts - 1 && Math.random() < 0.1 ? 200 : 401,
      'user_agent.name': 'python-requests/2.28.0',
      'http.request.referrer': '-',
      'error.type': 'AuthenticationError',
      'error.message': 'Invalid credentials',
      'event.category': 'intrusion_detection',
      'event.type': 'denied',
      'event.outcome': 'failure',
      'event.sequence': i + 1,
      'rule.name': 'brute_force_detected',
      tags: ['brute-force', 'attack', 'security'],
    };

    requests.push(logData);
  }

  return requests;
}

/**
 * Generate DDoS pattern.
 * Burst of requests from multiple IPs targeting same resource.
 */
export function generateDDoSPattern(): Array<Partial<LogDocument>> {
  const targetPath = '/api/expensive-operation';
  const numIPs = Math.floor(Math.random() * 50) + 10; // 10-60 IPs
  const requestsPerIP = Math.floor(Math.random() * 20) + 5; // 5-25 requests per IP
  const requests: Array<Partial<LogDocument>> = [];

  for (let i = 0; i < numIPs; i++) {
    const { ip } = generateIPWithGeo();
    const userAgent = getRandomItem([
      'python-requests/2.28.0',
      'curl/7.68.0',
      'Go-http-client/1.1',
      'Apache-HttpClient/4.5.13',
    ]);

    for (let j = 0; j < requestsPerIP; j++) {
      const logData: Partial<LogDocument> = {
        'client.ip': ip,
        'source.ip': ip,
        'http.request.method': 'GET',
        'url.path': targetPath,
        'http.response.status_code': getRandomItem([200, 429, 503]),
        'user_agent.name': userAgent,
        'http.request.referrer': '-',
        'event.category': 'intrusion_detection',
        'event.type': 'denied',
        'event.outcome': Math.random() < 0.7 ? 'failure' : 'success',
        'rule.name': 'ddos_detected',
        tags: ['ddos', 'attack', 'high-volume'],
      };

      requests.push(logData);
    }
  }

  return requests;
}

/**
 * Generate slow crawl pattern.
 * Systematic crawling of site structure (reconnaissance).
 */
export function generateSlowCrawlPattern(): Array<Partial<LogDocument>> {
  const { ip } = generateIPWithGeo();
  const paths = [
    '/robots.txt',
    '/sitemap.xml',
    '/.git/config',
    '/.env',
    '/admin',
    '/backup',
    '/config',
    '/api',
    '/swagger',
    '/graphql',
  ];
  const requests: Array<Partial<LogDocument>> = [];

  for (const path of paths) {
    const logData: Partial<LogDocument> = {
      'client.ip': ip,
      'http.request.method': 'GET',
      'url.path': path,
      'http.response.status_code': getRandomItem([200, 404, 403]),
      'user_agent.name': getRandomItem([
        'Mozilla/5.0 (compatible; Scanner/1.0)',
        'Wget/1.20.3 (linux-gnu)',
        'curl/7.68.0',
      ]),
      'http.request.referrer': '-',
      'event.category': 'intrusion_detection',
      'event.type': 'info',
      'rule.name': 'reconnaissance_detected',
      tags: ['reconnaissance', 'scanning', 'suspicious'],
    };

    requests.push(logData);
  }

  return requests;
}

/**
 * Generate API rate limit violation pattern.
 * Legitimate user/app hitting rate limits.
 */
export function generateRateLimitPattern(): Array<Partial<LogDocument>> {
  const { ip } = generateIPWithGeo();
  const requests: Array<Partial<LogDocument>> = [];
  const numRequests = Math.floor(Math.random() * 30) + 20; // 20-50 requests

  for (let i = 0; i < numRequests; i++) {
    const isRateLimited = i > 15;
    const logData: Partial<LogDocument> = {
      'client.ip': ip,
      'http.request.method': 'GET',
      'url.path': '/api/data',
      'http.response.status_code': isRateLimited ? 429 : 200,
      'user_agent.name': 'MyApp/1.0',
      'http.request.referrer': 'https://app.example.com',
      'error.type': isRateLimited ? 'RateLimitExceeded' : undefined,
      'error.message': isRateLimited ? 'Rate limit exceeded: 100 requests per minute' : undefined,
      'event.action': isRateLimited ? 'rate_limit_exceeded' : 'api_request',
      'event.category': 'web',
      'event.outcome': isRateLimited ? 'failure' : 'success',
      'event.sequence': i + 1,
      tags: isRateLimited ? ['rate-limit', 'throttled'] : ['api', 'success'],
    };

    requests.push(logData);
  }

  return requests;
}
