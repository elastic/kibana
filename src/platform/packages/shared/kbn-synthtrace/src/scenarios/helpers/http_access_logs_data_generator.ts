/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Core data generator for HTTP access logs.
 * Combines geo-location, field generators, request bodies, and malformations
 * to create realistic and comprehensive HTTP access log data.
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import { generateIPWithGeo } from './geo_ip_mappings';
import {
  getRandomItem,
  getWeightedRandomItem,
  HTTP_METHODS,
  HTTP_STATUS_CODES,
  USER_AGENTS,
  BOT_USER_AGENTS,
  MALICIOUS_BOT_USER_AGENTS,
  URL_PATHS,
  SERVICE_VERSIONS,
  SERVICE_ENVIRONMENTS,
  DEPLOYMENT_NAMES,
  generateCloudMetadata,
  generateK8sMetadata,
  generateContainerMetadata,
  generateNetworkMetadata,
  generateCorrelationIds,
  generateErrorMetadata,
  generateResponseSize,
  generateSessionId,
} from './http_field_generators';
import { getRandomRequestBody } from './http_request_body_templates';
import { applyMalformation } from './http_malformed_data_generator';

/**
 * Traffic pattern types.
 */
export enum TrafficPattern {
  NORMAL = 'normal',
  ATTACK = 'attack',
  ERROR = 'error',
  HEAVY = 'heavy',
  HEALTH_CHECK = 'health_check',
  GOOD_BOT = 'good_bot',
  BAD_BOT = 'bad_bot',
  OAUTH = 'oauth',
  REDIRECT = 'redirect',
  CORS = 'cors',
  WEBSOCKET = 'websocket',
}

/**
 * Base HTTP access log data generator.
 * Creates common fields shared across all traffic patterns.
 */
export function generateBaseLogData(): Partial<LogDocument> {
  const { ip, geo, isIPv6 } = generateIPWithGeo();
  const serviceName = getRandomItem(['web-frontend', 'api-gateway', 'mobile-api', 'cdn']);
  const hasK8s = Math.random() < 0.4; // 40% K8s
  const hasCloud = Math.random() < 0.6; // 60% cloud
  const hasContainer = Math.random() < 0.5; // 50% containerized

  const baseData: Partial<LogDocument> = {
    'client.ip': ip,
    'host.geo.location': [geo.location.lon, geo.location.lat],
    'host.geo.city_name': geo.city,
    'host.geo.country_name': geo.country,
    'host.geo.country_iso_code': geo.countryCode,
    'host.geo.continent_name': geo.continent,
    'host.geo.timezone': geo.timezone,
    'cloud.region': geo.countryCode.toLowerCase(),
    hostname: `${serviceName}-${Math.floor(Math.random() * 100)}`,
    'service.name': serviceName,
    'service.version': getRandomItem(SERVICE_VERSIONS),
    'service.environment': getRandomItem(SERVICE_ENVIRONMENTS),
    'deployment.name': getRandomItem(DEPLOYMENT_NAMES),
    'network.type': isIPv6 ? 'ipv6' : 'ipv4',
  };

  // Add cloud metadata (60%)
  if (hasCloud) {
    Object.assign(baseData, generateCloudMetadata());
  }

  // Add K8s metadata (40%)
  if (hasK8s) {
    Object.assign(baseData, generateK8sMetadata());
  }

  // Add container metadata (50%)
  if (hasContainer) {
    Object.assign(baseData, generateContainerMetadata());
  }

  // Add correlation IDs (60%)
  const correlationIds = generateCorrelationIds();
  if (Object.keys(correlationIds).length > 0) {
    Object.assign(baseData, correlationIds);
  }

  return baseData;
}

/**
 * 1. Normal traffic generator (70% of traffic).
 * Standard HTTP requests with realistic distribution of methods and status codes.
 */
export function generateNormalTraffic(): Partial<LogDocument> {
  const baseData = generateBaseLogData();
  const method = getWeightedRandomItem(HTTP_METHODS).method;
  const path = getRandomItem(URL_PATHS.normal);
  const statusCode = getWeightedRandomItem(HTTP_STATUS_CODES).code;
  const isHttps = Math.random() < 0.8; // 80% HTTPS

  const logData: Partial<LogDocument> = {
    ...baseData,
    'http.request.method': method,
    'url.path': path,
    'http.response.status_code': statusCode,
    'http.version': getRandomItem(['1.1', '2.0']),
    'user_agent.name': getRandomItem(USER_AGENTS),
    'http.request.referrer': Math.random() < 0.6 ? 'https://www.google.com' : '-',
    'http.response.bytes': generateResponseSize(statusCode, false),
    ...generateNetworkMetadata(isHttps),
    ...generateErrorMetadata(statusCode),
  };

  // Add request body for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const requestBody = getRandomRequestBody(method, path);
    if (requestBody) {
      logData.message = `${method} ${path} - ${requestBody.substring(0, 200)}...`;
    }
  }

  // Add session ID (60%)
  if (Math.random() < 0.6) {
    logData['session.id'] = generateSessionId();
  }

  // Apply malformation (5%)
  return applyMalformation(logData);
}

/**
 * 2. Attack traffic generator.
 * Simulates malicious requests (SQL injection, XSS, directory traversal, etc.).
 */
export function generateAttackTraffic(): Partial<LogDocument> {
  const baseData = generateBaseLogData();
  const method = getWeightedRandomItem(HTTP_METHODS).method;
  const path = getRandomItem(URL_PATHS.attack);
  const statusCode = getRandomItem([400, 403, 404, 500]); // Attacks typically fail

  const logData: Partial<LogDocument> = {
    ...baseData,
    'http.request.method': method,
    'url.path': path,
    'http.response.status_code': statusCode,
    'http.version': '1.1',
    'user_agent.name': getRandomItem(MALICIOUS_BOT_USER_AGENTS),
    'http.request.referrer': '-',
    'http.response.bytes': generateResponseSize(statusCode, false),
    'event.category': 'network',
    'event.type': 'access',
    'event.outcome': 'failure',
    ...generateNetworkMetadata(false), // Attackers often use HTTP
    ...generateErrorMetadata(statusCode),
    tags: ['attack', 'security', 'suspicious'],
  };

  // Add attack-specific metadata
  logData['event.category'] = 'intrusion_detection';
  logData['event.type'] = 'denied';
  const attackType = getRandomItem([
    'sql_injection',
    'xss',
    'directory_traversal',
    'command_injection',
  ]);
  logData['rule.name'] = `${attackType}_detected`;
  if (!logData.tags) logData.tags = [];
  if (typeof logData.tags === 'string') logData.tags = [logData.tags];
  (logData.tags as string[]).push('attack', attackType);

  return logData;
}

/**
 * 3. Error traffic generator.
 * Generates 5xx server errors.
 */
export function generateErrorTraffic(): Partial<LogDocument> {
  const baseData = generateBaseLogData();
  const method = getWeightedRandomItem(HTTP_METHODS).method;
  const path = getRandomItem(URL_PATHS.normal);
  const statusCode = getRandomItem([500, 502, 503, 504]);

  const logData: Partial<LogDocument> = {
    ...baseData,
    'http.request.method': method,
    'url.path': path,
    'http.response.status_code': statusCode,
    'http.version': getRandomItem(['1.1', '2.0']),
    'user_agent.name': getRandomItem(USER_AGENTS),
    'http.request.referrer': 'https://www.google.com',
    'http.response.bytes': generateResponseSize(statusCode, false),
    'log.level': 'error',
    'event.category': 'application',
    'event.type': 'error',
    'event.outcome': 'failure',
    ...generateNetworkMetadata(true),
    ...generateErrorMetadata(statusCode),
  };

  // Add error details
  logData.message = `ERROR: ${statusCode} - ${
    (logData['error.type'] as string) || 'InternalServerError'
  }`;

  return logData;
}

/**
 * 4. Heavy traffic generator.
 * Large request/response bodies (uploads, downloads).
 */
export function generateHeavyTraffic(): Partial<LogDocument> {
  const baseData = generateBaseLogData();
  const method = getRandomItem(['GET', 'POST', 'PUT']); // Common for heavy payloads
  const path = getRandomItem([
    '/api/upload',
    '/api/export',
    '/api/download',
    '/media/video.mp4',
    '/api/bulk',
  ]);
  const statusCode = getWeightedRandomItem(HTTP_STATUS_CODES).code;

  const logData: Partial<LogDocument> = {
    ...baseData,
    'http.request.method': method,
    'url.path': path,
    'http.response.status_code': statusCode,
    'http.version': '2.0', // HTTP/2 for large transfers
    'user_agent.name': getRandomItem(USER_AGENTS),
    'http.request.referrer': 'https://app.example.com',
    'http.response.bytes': generateResponseSize(statusCode, true), // Large response
    ...generateNetworkMetadata(true),
    ...generateErrorMetadata(statusCode),
    tags: ['heavy', 'large-payload'],
  };

  return logData;
}

/**
 * 5. Health check traffic generator (20% of traffic).
 * Monitoring and health check requests.
 */
export function generateHealthCheckTraffic(): Partial<LogDocument> {
  const baseData = generateBaseLogData();
  const path = getRandomItem(URL_PATHS.healthCheck);

  const logData: Partial<LogDocument> = {
    ...baseData,
    'http.request.method': 'GET',
    'url.path': path,
    'http.response.status_code': Math.random() < 0.99 ? 200 : 503, // 99% success
    'http.version': '1.1',
    'user_agent.name': 'kube-probe/1.28', // K8s probe
    'http.request.referrer': '-',
    'http.response.bytes': Math.random() < 0.99 ? 0 : 100, // Minimal response
    ...generateNetworkMetadata(false), // Health checks often use HTTP
    tags: ['health-check', 'monitoring'],
  };

  // Health checks don't typically have correlation IDs
  delete logData['trace.id'];
  delete logData['span.id'];
  delete logData['transaction.id'];
  delete logData['session.id'];

  return logData;
}

/**
 * 6. Good bot traffic generator (8% of traffic).
 * Search engine crawlers and legitimate bots.
 */
export function generateGoodBotTraffic(): Partial<LogDocument> {
  const baseData = generateBaseLogData();
  const path = getRandomItem(URL_PATHS.normal);

  const logData: Partial<LogDocument> = {
    ...baseData,
    'http.request.method': 'GET',
    'url.path': path,
    'http.response.status_code': getWeightedRandomItem(HTTP_STATUS_CODES).code,
    'http.version': '1.1',
    'user_agent.name': getRandomItem(BOT_USER_AGENTS),
    'http.request.referrer': '-',
    'http.response.bytes': generateResponseSize(200, false),
    ...generateNetworkMetadata(true),
    tags: ['bot', 'crawler', 'legitimate'],
  };

  return logData;
}

/**
 * 7. Bad bot traffic generator (5% of traffic).
 * Scrapers, unauthorized bots, and automated attacks.
 */
export function generateBadBotTraffic(): Partial<LogDocument> {
  const baseData = generateBaseLogData();
  const path = getRandomItem([...URL_PATHS.normal, ...URL_PATHS.attack]);
  const statusCode = getRandomItem([200, 403, 429, 503]); // Mix of success and blocks

  const logData: Partial<LogDocument> = {
    ...baseData,
    'http.request.method': 'GET',
    'url.path': path,
    'http.response.status_code': statusCode,
    'http.version': '1.1',
    'user_agent.name': getRandomItem(MALICIOUS_BOT_USER_AGENTS),
    'http.request.referrer': '-',
    'http.response.bytes': generateResponseSize(statusCode, false),
    ...generateNetworkMetadata(false),
    ...generateErrorMetadata(statusCode),
    tags: ['bot', 'scraper', 'suspicious'],
  };

  logData['event.category'] = 'web';
  logData['event.type'] = 'access';

  return logData;
}

/**
 * 8. OAuth flow traffic generator (3-5% of traffic).
 * OAuth authentication and token requests.
 */
export function generateOAuthTraffic(): Partial<LogDocument> {
  const baseData = generateBaseLogData();
  const oauthPaths = [
    '/oauth/authorize',
    '/oauth/token',
    '/oauth/callback',
    '/oauth/revoke',
    '/oauth/introspect',
  ];
  const path = getRandomItem(oauthPaths);
  const method = path.includes('token') || path.includes('revoke') ? 'POST' : 'GET';
  const statusCode = getRandomItem([200, 201, 400, 401]); // OAuth responses

  const logData: Partial<LogDocument> = {
    ...baseData,
    'http.request.method': method,
    'url.path': path,
    'http.response.status_code': statusCode,
    'http.version': '1.1',
    'user_agent.name': getRandomItem(USER_AGENTS),
    'http.request.referrer': 'https://app.example.com',
    'http.response.bytes': generateResponseSize(statusCode, false),
    ...generateNetworkMetadata(true), // OAuth always HTTPS
    ...generateErrorMetadata(statusCode),
    tags: ['oauth', 'authentication'],
  };

  // Add OAuth-specific fields
  logData['event.action'] = getRandomItem([
    'oauth_authorization_code',
    'oauth_implicit',
    'oauth_client_credentials',
  ]);
  logData['event.category'] = 'authentication';

  return logData;
}

/**
 * 9. HTTP redirect traffic generator (8-10% of traffic).
 * 3xx status codes for redirects.
 */
export function generateRedirectTraffic(): Partial<LogDocument> {
  const baseData = generateBaseLogData();
  const path = getRandomItem(URL_PATHS.normal);
  const statusCode = getRandomItem([301, 302, 303, 307, 308]);

  const logData: Partial<LogDocument> = {
    ...baseData,
    'http.request.method': 'GET',
    'url.path': path,
    'http.response.status_code': statusCode,
    'http.version': getRandomItem(['1.1', '2.0']),
    'user_agent.name': getRandomItem(USER_AGENTS),
    'http.request.referrer': 'https://old-domain.com',
    'http.response.bytes': 0, // Redirects have no body
    ...generateNetworkMetadata(true),
    tags: ['redirect'],
  };

  logData['event.action'] = 'http_redirect';
  logData['event.category'] = 'web';

  return logData;
}

/**
 * 10. CORS preflight traffic generator (5-8% of traffic).
 * OPTIONS requests for CORS.
 */
export function generateCORSTraffic(): Partial<LogDocument> {
  const baseData = generateBaseLogData();
  const path = getRandomItem(URL_PATHS.api);

  const logData: Partial<LogDocument> = {
    ...baseData,
    'http.request.method': 'OPTIONS',
    'url.path': path,
    'http.response.status_code': 204, // No content for OPTIONS
    'http.version': '1.1',
    'user_agent.name': getRandomItem(USER_AGENTS),
    'http.request.referrer': 'https://app.example.com',
    'http.response.bytes': 0,
    ...generateNetworkMetadata(true),
    tags: ['cors', 'preflight'],
  };

  logData['event.action'] = 'cors_preflight';
  logData['event.category'] = 'web';

  return logData;
}

/**
 * 11. WebSocket upgrade traffic generator (1-2% of traffic).
 * HTTP to WebSocket protocol upgrade.
 */
export function generateWebSocketTraffic(): Partial<LogDocument> {
  const baseData = generateBaseLogData();

  const logData: Partial<LogDocument> = {
    ...baseData,
    'http.request.method': 'GET',
    'url.path': getRandomItem(['/ws', '/websocket', '/api/stream', '/realtime']),
    'http.response.status_code': 101, // Switching Protocols
    'http.version': '1.1',
    'user_agent.name': getRandomItem(USER_AGENTS),
    'http.request.referrer': 'https://app.example.com',
    'http.response.bytes': 0,
    ...generateNetworkMetadata(true),
    tags: ['websocket', 'upgrade'],
  };

  logData['event.action'] = 'websocket_upgrade';
  logData['event.category'] = 'web';
  logData['network.protocol'] = 'websocket';

  return logData;
}

/**
 * Generate comprehensive mixed traffic.
 * Combines all patterns with realistic distribution.
 */
export function generateMixedTraffic(): Partial<LogDocument> {
  const rand = Math.random();

  // Traffic distribution (should sum to 100%)
  if (rand < 0.2) return generateHealthCheckTraffic(); // 20%
  if (rand < 0.28) return generateGoodBotTraffic(); // 8%
  if (rand < 0.33) return generateBadBotTraffic(); // 5%
  if (rand < 0.38) return generateOAuthTraffic(); // 5%
  if (rand < 0.46) return generateRedirectTraffic(); // 8%
  if (rand < 0.51) return generateCORSTraffic(); // 5%
  if (rand < 0.52) return generateWebSocketTraffic(); // 1%
  if (rand < 0.55) return generateAttackTraffic(); // 3%
  if (rand < 0.58) return generateErrorTraffic(); // 3%
  if (rand < 0.63) return generateHeavyTraffic(); // 5%

  return generateNormalTraffic(); // 37% (remainder)
}

/**
 * Get generator function based on traffic pattern.
 */
export function getGeneratorForPattern(pattern: TrafficPattern): () => Partial<LogDocument> {
  switch (pattern) {
    case TrafficPattern.NORMAL:
      return generateNormalTraffic;
    case TrafficPattern.ATTACK:
      return generateAttackTraffic;
    case TrafficPattern.ERROR:
      return generateErrorTraffic;
    case TrafficPattern.HEAVY:
      return generateHeavyTraffic;
    case TrafficPattern.HEALTH_CHECK:
      return generateHealthCheckTraffic;
    case TrafficPattern.GOOD_BOT:
      return generateGoodBotTraffic;
    case TrafficPattern.BAD_BOT:
      return generateBadBotTraffic;
    case TrafficPattern.OAUTH:
      return generateOAuthTraffic;
    case TrafficPattern.REDIRECT:
      return generateRedirectTraffic;
    case TrafficPattern.CORS:
      return generateCORSTraffic;
    case TrafficPattern.WEBSOCKET:
      return generateWebSocketTraffic;
    default:
      return generateMixedTraffic;
  }
}
