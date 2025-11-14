/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Field generator pools for HTTP access logs.
 * Provides realistic data for service, deployment, container, cloud, network, and other fields.
 */

/**
 * Service versions following semantic versioning.
 */
export const SERVICE_VERSIONS = [
  '1.0.0',
  '1.0.1',
  '1.1.0',
  '1.2.0',
  '1.2.1',
  '2.0.0',
  '2.1.0',
  '2.2.0',
  '3.0.0',
  '3.1.0',
];

/**
 * Service environments.
 */
export const SERVICE_ENVIRONMENTS = ['production', 'staging', 'development', 'qa', 'canary'];

/**
 * Deployment names with common patterns.
 */
export const DEPLOYMENT_NAMES = [
  'web-app-v1',
  'web-app-v2',
  'api-gateway',
  'auth-service',
  'payment-service',
  'user-service',
  'notification-service',
  'analytics-service',
  'search-service',
  'recommendation-engine',
];

/**
 * Cloud providers with their configuration.
 */
export const CLOUD_PROVIDERS = [
  {
    name: 'aws',
    regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1'],
    instanceTypes: ['t3.micro', 't3.small', 't3.medium', 'm5.large', 'm5.xlarge', 'c5.large'],
  },
  {
    name: 'gcp',
    regions: ['us-central1', 'us-east1', 'europe-west1', 'asia-southeast1'],
    instanceTypes: ['n1-standard-1', 'n1-standard-2', 'n2-standard-2', 'e2-medium'],
  },
  {
    name: 'azure',
    regions: ['eastus', 'westus', 'northeurope', 'westeurope', 'southeastasia'],
    instanceTypes: ['Standard_B1s', 'Standard_B2s', 'Standard_D2s_v3', 'Standard_D4s_v3'],
  },
];

/**
 * Container runtimes.
 */
export const CONTAINER_RUNTIMES = ['docker', 'containerd', 'cri-o'];

/**
 * Kubernetes workload types.
 */
export const K8S_WORKLOAD_TYPES = ['deployment', 'statefulset', 'daemonset', 'replicaset'];

/**
 * Container image names.
 */
export const CONTAINER_IMAGES = [
  'nginx',
  'httpd',
  'tomcat',
  'node',
  'python',
  'java',
  'golang',
  'ruby',
];

/**
 * TLS versions.
 */
export const TLS_VERSIONS = ['TLSv1.2', 'TLSv1.3'];

/**
 * Common TLS cipher suites.
 */
export const TLS_CIPHERS = [
  'TLS_AES_128_GCM_SHA256',
  'TLS_AES_256_GCM_SHA384',
  'TLS_CHACHA20_POLY1305_SHA256',
  'ECDHE-RSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES256-GCM-SHA384',
];

/**
 * Network protocols.
 */
export const NETWORK_PROTOCOLS = ['http', 'https'];

/**
 * Network transport protocols.
 */
export const NETWORK_TRANSPORTS = ['tcp', 'udp'];

/**
 * Network types.
 */
export const NETWORK_TYPES = ['ipv4', 'ipv6'];

/**
 * HTTP methods with their typical usage weights.
 */
export const HTTP_METHODS = [
  { method: 'GET', weight: 60 },
  { method: 'POST', weight: 20 },
  { method: 'PUT', weight: 8 },
  { method: 'DELETE', weight: 5 },
  { method: 'PATCH', weight: 4 },
  { method: 'OPTIONS', weight: 2 },
  { method: 'HEAD', weight: 1 },
];

/**
 * HTTP status codes with their typical occurrence rates.
 */
export const HTTP_STATUS_CODES = [
  // Success (2xx) - 85%
  { code: 200, weight: 70, type: 'success' },
  { code: 201, weight: 8, type: 'success' },
  { code: 204, weight: 5, type: 'success' },
  { code: 206, weight: 2, type: 'success' },

  // Redirection (3xx) - 8%
  { code: 301, weight: 3, type: 'redirect' },
  { code: 302, weight: 2, type: 'redirect' },
  { code: 304, weight: 3, type: 'redirect' },

  // Client errors (4xx) - 5%
  { code: 400, weight: 1, type: 'client_error' },
  { code: 401, weight: 1, type: 'client_error' },
  { code: 403, weight: 1, type: 'client_error' },
  { code: 404, weight: 1.5, type: 'client_error' },
  { code: 429, weight: 0.5, type: 'client_error' },

  // Server errors (5xx) - 2%
  { code: 500, weight: 1, type: 'server_error' },
  { code: 502, weight: 0.5, type: 'server_error' },
  { code: 503, weight: 0.3, type: 'server_error' },
  { code: 504, weight: 0.2, type: 'server_error' },
];

/**
 * Error types for HTTP errors.
 */
export const ERROR_TYPES = [
  'TimeoutException',
  'ConnectionException',
  'DatabaseException',
  'ValidationException',
  'AuthenticationException',
  'AuthorizationException',
  'RateLimitException',
  'ServiceUnavailableException',
  'BadGatewayException',
  'InternalServerError',
];

/**
 * User agents representing different browsers and devices.
 */
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36',
];

/**
 * Bot user agents.
 */
export const BOT_USER_AGENTS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)',
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
];

/**
 * Malicious bot user agents.
 */
export const MALICIOUS_BOT_USER_AGENTS = [
  'sqlmap/1.0',
  'Nikto/2.1.6',
  'ZmEu',
  'python-requests/2.31.0',
  'curl/7.68.0',
];

/**
 * URL paths for different traffic patterns.
 */
export const URL_PATHS = {
  normal: [
    '/',
    '/index.html',
    '/home',
    '/about',
    '/contact',
    '/products',
    '/services',
    '/api/users',
    '/api/products',
    '/api/orders',
    '/search',
    '/login',
    '/register',
    '/dashboard',
    '/profile',
    '/settings',
  ],
  attack: [
    '/admin',
    '/admin/login',
    '/wp-admin',
    '/phpMyAdmin',
    '/admin/config.php',
    '/../../../etc/passwd',
    '/api/users?id=1 OR 1=1',
    "/api/search?q=<script>alert('xss')</script>",
    '/api/file?path=../../../../etc/passwd',
  ],
  healthCheck: ['/health', '/healthz', '/ready', '/alive', '/status', '/ping'],
  api: [
    '/api/v1/users',
    '/api/v1/products',
    '/api/v1/orders',
    '/api/v1/auth/login',
    '/api/v1/auth/logout',
    '/api/v1/search',
    '/api/v2/analytics',
    '/graphql',
  ],
};

/**
 * Get a random item from an array.
 */
export function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Get a weighted random item from an array of weighted items.
 */
export function getWeightedRandomItem<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

/**
 * Generate a random cloud provider configuration.
 */
export function generateCloudMetadata() {
  const provider = getRandomItem(CLOUD_PROVIDERS);
  const region = getRandomItem(provider.regions);
  const instanceType = getRandomItem(provider.instanceTypes);
  const instanceId = `i-${Math.random().toString(36).substring(2, 15)}`;
  const projectId = `project-${Math.random().toString(36).substring(2, 10)}`;

  return {
    'cloud.provider': provider.name,
    'cloud.region': region,
    'cloud.availability_zone': `${region}${['a', 'b', 'c'][Math.floor(Math.random() * 3)]}`,
    'cloud.instance.id': instanceId,
    'cloud.instance.name': `${provider.name}-${instanceType}-${instanceId.substring(0, 8)}`,
    'cloud.project.id': projectId,
  };
}

/**
 * Generate Kubernetes metadata.
 */
export function generateK8sMetadata() {
  const namespace = getRandomItem([
    'default',
    'production',
    'staging',
    'development',
    'kube-system',
  ]);
  const app = getRandomItem(['web-app', 'api-gateway', 'auth-service', 'payment-service']);
  const workloadType = getRandomItem(K8S_WORKLOAD_TYPES);
  const podId = Math.random().toString(36).substring(2, 15);

  return {
    'kubernetes.namespace': namespace,
    'kubernetes.pod.name': `${app}-${podId}`,
    'kubernetes.pod.uid': `uid-${podId}`,
    'kubernetes.container.name': getRandomItem(CONTAINER_IMAGES),
    'kubernetes.deployment.name': workloadType === 'deployment' ? `${app}-deployment` : undefined,
    'kubernetes.replicaset.name': workloadType === 'replicaset' ? `${app}-replicaset` : undefined,
    'kubernetes.statefulset.name':
      workloadType === 'statefulset' ? `${app}-statefulset` : undefined,
    'kubernetes.daemonset.name': workloadType === 'daemonset' ? `${app}-daemonset` : undefined,
    'kubernetes.node.name': `node-${Math.floor(Math.random() * 10)}`,
    'kubernetes.labels.app': app,
    'kubernetes.labels.version': getRandomItem(SERVICE_VERSIONS),
    'kubernetes.labels.tier': getRandomItem(['frontend', 'backend', 'database']),
  };
}

/**
 * Generate container metadata.
 */
export function generateContainerMetadata() {
  const image = getRandomItem(CONTAINER_IMAGES);
  const version = getRandomItem(['latest', '1.0', '1.1', '2.0', 'alpine', 'slim']);
  const containerId = Math.random().toString(36).substring(2, 15);

  return {
    'container.id': containerId,
    'container.name': `${image}-${containerId.substring(0, 8)}`,
    'container.image.name': image,
    'container.image.tag': version,
    'container.runtime': getRandomItem(CONTAINER_RUNTIMES),
  };
}

/**
 * Generate network metadata with TLS details.
 */
export function generateNetworkMetadata(isHttps: boolean) {
  const metadata: Record<string, string> = {
    'network.protocol': isHttps ? 'https' : 'http',
    'network.transport': 'tcp',
  };

  if (isHttps) {
    metadata['tls.version'] = getRandomItem(TLS_VERSIONS);
    metadata['tls.cipher'] = getRandomItem(TLS_CIPHERS);
    metadata['tls.established'] = 'true';
  }

  return metadata;
}

/**
 * Generate correlation IDs for tracing.
 */
export function generateCorrelationIds() {
  const hasTracing = Math.random() < 0.6; // 60% have tracing

  if (!hasTracing) {
    return {};
  }

  const traceId = Math.random().toString(36).substring(2, 18);
  const spanId = Math.random().toString(36).substring(2, 10);
  const transactionId = Math.random().toString(36).substring(2, 18);
  const sessionId = Math.random().toString(36).substring(2, 18);

  return {
    'trace.id': traceId,
    'span.id': spanId,
    'transaction.id': transactionId,
    'session.id': sessionId,
  };
}

/**
 * Generate error metadata for 4xx/5xx responses.
 */
export function generateErrorMetadata(statusCode: number) {
  if (statusCode < 400) {
    return {};
  }

  const errorType = getRandomItem(ERROR_TYPES);
  const errorCode = `ERR_${statusCode}_${Math.floor(Math.random() * 1000)}`;

  const metadata: Record<string, string> = {
    'error.type': errorType,
    'error.code': errorCode,
  };

  if (statusCode >= 500) {
    metadata['error.message'] = `${errorType}: Internal server error occurred`;
  } else {
    metadata['error.message'] = `${errorType}: Client request validation failed`;
  }

  return metadata;
}

/**
 * Generate response size in bytes based on status code.
 */
export function generateResponseSize(statusCode: number, isHeavy = false): number {
  if (statusCode === 204 || statusCode === 304) {
    return 0;
  }

  if (isHeavy) {
    // Heavy responses: 100KB to 5MB
    return Math.floor(Math.random() * (5000000 - 100000) + 100000);
  }

  if (statusCode >= 400) {
    // Error responses are typically small
    return Math.floor(Math.random() * (5000 - 100) + 100);
  }

  // Normal responses: 500 bytes to 50KB
  return Math.floor(Math.random() * (50000 - 500) + 500);
}

/**
 * Generate a session ID.
 */
export function generateSessionId(): string {
  return `sess_${Math.random().toString(36).substring(2, 18)}`;
}
