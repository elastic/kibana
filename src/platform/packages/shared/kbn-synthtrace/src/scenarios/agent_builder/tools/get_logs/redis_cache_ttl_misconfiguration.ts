/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: SRE Log Investigation Techniques — Redis Cache TTL Misconfiguration
 *
 * A realistic high-volume log scenario (~100K+ logs in a 1h window) designed
 * to exercise three key SRE investigation techniques:
 *
 *   1. categorize_text aggregation (get_log_groups tool)
 *   2. Log rate analysis (run_log_rate_analysis tool)
 *   3. Iterative negation-filter funneling (get_logs tool)
 *
 * THE STORY:
 * A routine configuration change reduces the Redis cache TTL from 300s to 5s
 * on cart-service. This causes a cache stampede: nearly every request bypasses
 * cache and hits the database directly. The database connection pool exhausts,
 * cart-service starts timing out, and the degradation cascades to
 * product-catalog, recommendation-engine, and finally api-gateway returning
 * 503/504 errors. The root cause is a handful of info-level config-reload logs
 * from cache-warmer buried under ~100K noisy operational logs.
 *
 * ROOT CAUSE:
 * cache-warmer applies a config reload with cache.ttl=5 (should be 300).
 *
 * TIMELINE (relative to time range):
 *   0–40%   Normal operation. Very high noise volume. All services healthy.
 *   40–50%  cache-warmer config reload. Subtle cache-miss warnings in cart-service.
 *   50–65%  Cache miss rate spikes. DB connection pool warnings, then errors.
 *   65–80%  product-catalog and recommendation-engine degrade. api-gateway 503s.
 *   80–100% Full cascade. Circuit breaker opens. Multiple error streams.
 *
 * NOISE (present throughout, ~90% of volume):
 *   - Health checks from 4 services (very high volume)
 *   - Load balancer access logs (high volume, varied status codes)
 *   - fluent-bit pod metadata / flush / inotify logs (moderate, 3 message types)
 *   - kube-scheduler pod binding events (low)
 *   - search-service query + index maintenance logs (high volume)
 *   - Normal application logs from 6+ services (multiple message templates each)
 *
 * RED HERRINGS:
 *   - user-service: "Auth token refresh failed, retrying" warnings
 *   - cert-manager: certificate renewal scheduled logs
 *   - search-service: "Slow query detected" warnings
 *
 * DIMENSIONAL METADATA (for log rate analysis):
 *   Every log carries: service.name, service.version, host.name, agent.name,
 *   kubernetes.namespace, kubernetes.pod.name, kubernetes.node.name,
 *   container.name, cloud.region, cloud.provider, cloud.availability_zone,
 *   event.dataset, event.category, event.outcome, trace.id.
 *   Cart-service and cache-warmer also carry labels.shard, labels.config_version,
 *   and labels.cache_ttl for richer correlation.
 *
 * SERVICES:
 *   - api-gateway v1.8.0 (nodejs): routes traffic, emits 503/504 in cascade
 *   - cart-service v3.2.1 (java): primary victim of cache stampede
 *   - product-catalog v2.5.0 (java): degrades when cart is slow
 *   - payment-service v4.1.3 (nodejs): normal throughout
 *   - user-service v1.4.2 (python): normal + auth token warnings (red herring)
 *   - recommendation-engine v0.9.7 (python): degrades when cart is slow
 *   - cache-warmer v1.0.4 (golang): root cause — config reload with wrong TTL
 *   - search-service v5.3.0 (java): normal + slow query warnings (red herring)
 *   - load-balancer (nginx): high volume access logs
 *   - fluent-bit: log collector noise
 *   - kube-scheduler: pod scheduling noise
 *   - cert-manager v1.12.0: certificate noise (red herring)
 *
 * TECHNIQUE 1 — categorize_text (get_log_groups):
 *   ~100K logs collapse into ~80–120 groups thanks to multiple message templates
 *   per service. Noise groups dominate. Signal groups like "Connection pool
 *   exhausted" and "Cache miss rate at NN%" are lower-count but clearly
 *   anomalous. "Configuration reloaded: cache.ttl=5" is a rare pattern pointing
 *   at the root cause.
 *
 * TECHNIQUE 2 — log rate analysis (run_log_rate_analysis):
 *   Baseline (0–40%) vs deviation (50–80%) shows a clear spike correlated with
 *   service.name=cart-service, log.level=error, event.dataset=cart.api,
 *   host.name=cart-pod-*, labels.config_version=v43.
 *
 * TECHNIQUE 3 — negation-filter funnel (get_logs):
 *   Step 1: Broad → 100K+ logs, mostly health checks
 *   Step 2: NOT message:"GET /health" → removes ~43K
 *   Step 3: NOT service.name:"load-balancer" → removes ~25K
 *   Step 4: NOT kubernetes.namespace:"kube-system" → removes fluent-bit/scheduler
 *   Step 5: NOT message:"Query completed" → removes search-service noise
 *   Step 6: Now ~2K logs with errors from cart-service and cascading services
 *   Step 7: service.name:"cart-service" → cache miss warnings + DB errors
 *   Step 8: service.name:"cache-warmer" → config reload with wrong TTL
 *
 * AI ASSISTANT QUESTIONS:
 *   - "There's a spike in errors. What's causing it?"
 *   - "Something is wrong with the cart service. Investigate the logs."
 *   - "Why is the api-gateway returning 503 errors?"
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import { generateShortId, log } from '@kbn/synthtrace-client';
import type { Scenario } from '../../../../cli/scenario';
import { getSynthtraceEnvironment } from '../../../../lib/utils/get_synthtrace_environment';
import { withClient } from '../../../../lib/utils/with_client';
import { parseLogsScenarioOpts } from '../../../helpers/logs_scenario_opts_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

// ---------------------------------------------------------------------------
// Service / infrastructure definitions
// ---------------------------------------------------------------------------

interface ServiceDef {
  name: string;
  host: string;
  pod: string;
  container: string;
  namespace: string;
  region: string;
  availabilityZone: string;
  nodeName: string;
  version: string;
  agentName: string;
  dataset: string;
}

const SERVICES = {
  apiGateway: [
    {
      name: 'api-gateway',
      host: 'gateway-pod-1',
      pod: 'gateway-6a7b8c9-xk2m9',
      container: 'api-gateway',
      namespace: 'default',
      region: 'us-east-1',
      availabilityZone: 'us-east-1a',
      nodeName: 'worker-1',
      version: '1.8.0',
      agentName: 'nodejs',
      dataset: 'gateway.access',
    },
    {
      name: 'api-gateway',
      host: 'gateway-pod-2',
      pod: 'gateway-6a7b8c9-rn4t7',
      container: 'api-gateway',
      namespace: 'default',
      region: 'us-west-2',
      availabilityZone: 'us-west-2b',
      nodeName: 'worker-4',
      version: '1.8.0',
      agentName: 'nodejs',
      dataset: 'gateway.access',
    },
  ],
  cart: [
    {
      name: 'cart-service',
      host: 'cart-pod-1',
      pod: 'cart-3d4e5f-abc12',
      container: 'cart',
      namespace: 'default',
      region: 'us-east-1',
      availabilityZone: 'us-east-1a',
      nodeName: 'worker-1',
      version: '3.2.1',
      agentName: 'java',
      dataset: 'cart.api',
    },
    {
      name: 'cart-service',
      host: 'cart-pod-2',
      pod: 'cart-3d4e5f-def34',
      container: 'cart',
      namespace: 'default',
      region: 'us-east-1',
      availabilityZone: 'us-east-1b',
      nodeName: 'worker-2',
      version: '3.2.1',
      agentName: 'java',
      dataset: 'cart.api',
    },
    {
      name: 'cart-service',
      host: 'cart-pod-3',
      pod: 'cart-3d4e5f-ghi56',
      container: 'cart',
      namespace: 'default',
      region: 'us-east-1',
      availabilityZone: 'us-east-1a',
      nodeName: 'worker-3',
      version: '3.2.1',
      agentName: 'java',
      dataset: 'cart.api',
    },
  ],
  productCatalog: [
    {
      name: 'product-catalog',
      host: 'catalog-pod-1',
      pod: 'catalog-7f8b9c-jkl78',
      container: 'product-catalog',
      namespace: 'default',
      region: 'us-east-1',
      availabilityZone: 'us-east-1a',
      nodeName: 'worker-1',
      version: '2.5.0',
      agentName: 'java',
      dataset: 'catalog.api',
    },
    {
      name: 'product-catalog',
      host: 'catalog-pod-2',
      pod: 'catalog-7f8b9c-mno90',
      container: 'product-catalog',
      namespace: 'default',
      region: 'us-east-1',
      availabilityZone: 'us-east-1b',
      nodeName: 'worker-2',
      version: '2.5.0',
      agentName: 'java',
      dataset: 'catalog.api',
    },
  ],
  payment: {
    name: 'payment-service',
    host: 'payment-pod-1',
    pod: 'payment-2c3d4e-pqr12',
    container: 'payment',
    namespace: 'default',
    region: 'us-east-1',
    availabilityZone: 'us-east-1a',
    nodeName: 'worker-2',
    version: '4.1.3',
    agentName: 'nodejs',
    dataset: 'payment.api',
  },
  user: {
    name: 'user-service',
    host: 'user-pod-1',
    pod: 'user-5f6g7h-stu34',
    container: 'user',
    namespace: 'default',
    region: 'us-east-1',
    availabilityZone: 'us-east-1b',
    nodeName: 'worker-3',
    version: '1.4.2',
    agentName: 'python',
    dataset: 'user.api',
  },
  recommendation: {
    name: 'recommendation-engine',
    host: 'reco-pod-1',
    pod: 'reco-8i9j0k-vwx56',
    container: 'recommendation',
    namespace: 'default',
    region: 'us-east-1',
    availabilityZone: 'us-east-1a',
    nodeName: 'worker-1',
    version: '0.9.7',
    agentName: 'python',
    dataset: 'recommendation.api',
  },
  cacheWarmer: {
    name: 'cache-warmer',
    host: 'cache-warmer-pod-1',
    pod: 'cache-warmer-1l2m3n-yza78',
    container: 'cache-warmer',
    namespace: 'default',
    region: 'us-east-1',
    availabilityZone: 'us-east-1a',
    nodeName: 'worker-2',
    version: '1.0.4',
    agentName: 'golang',
    dataset: 'cache.ops',
  },
  search: {
    name: 'search-service',
    host: 'search-pod-1',
    pod: 'search-4o5p6q-bcd90',
    container: 'search',
    namespace: 'default',
    region: 'us-east-1',
    availabilityZone: 'us-east-1b',
    nodeName: 'worker-3',
    version: '5.3.0',
    agentName: 'java',
    dataset: 'search.query',
  },
  loadBalancer: [
    {
      name: 'load-balancer',
      host: 'lb-node-1',
      pod: 'nginx-ingress-7r8s9t-efg12',
      container: 'nginx',
      namespace: 'ingress',
      region: 'us-east-1',
      availabilityZone: 'us-east-1a',
      nodeName: 'worker-1',
      version: '1.9.6',
      agentName: 'nginx',
      dataset: 'nginx.access',
    },
    {
      name: 'load-balancer',
      host: 'lb-node-2',
      pod: 'nginx-ingress-7r8s9t-hij34',
      container: 'nginx',
      namespace: 'ingress',
      region: 'us-west-2',
      availabilityZone: 'us-west-2b',
      nodeName: 'worker-4',
      version: '1.9.6',
      agentName: 'nginx',
      dataset: 'nginx.access',
    },
  ],
  fluentBit: {
    name: 'fluent-bit',
    host: 'fluent-bit-node-1',
    pod: 'fluent-bit-ds-0u1v2w',
    container: 'fluent-bit',
    namespace: 'kube-system',
    region: 'us-east-1',
    availabilityZone: 'us-east-1a',
    nodeName: 'worker-1',
    version: '2.2.2',
    agentName: 'fluent-bit',
    dataset: 'fluentbit.log',
  },
  kubeScheduler: {
    name: 'kube-scheduler',
    host: 'control-plane-1',
    pod: 'kube-scheduler-control-plane-1',
    container: 'kube-scheduler',
    namespace: 'kube-system',
    region: 'us-east-1',
    availabilityZone: 'us-east-1a',
    nodeName: 'control-plane-1',
    version: '1.28.4',
    agentName: 'kubernetes',
    dataset: 'kube.scheduler',
  },
  certManager: {
    name: 'cert-manager',
    host: 'cert-manager-pod-1',
    pod: 'cert-manager-3x4y5z-klm56',
    container: 'cert-manager',
    namespace: 'cert-manager',
    region: 'us-east-1',
    availabilityZone: 'us-east-1a',
    nodeName: 'worker-2',
    version: '1.12.0',
    agentName: 'golang',
    dataset: 'certmanager.log',
  },
} as const;

function svcDefaults(svc: ServiceDef, extra?: Record<string, unknown>) {
  return {
    'service.environment': ENVIRONMENT,
    'service.version': svc.version,
    'host.name': svc.host,
    'agent.name': svc.agentName,
    'kubernetes.namespace': svc.namespace,
    'kubernetes.pod.name': svc.pod,
    'kubernetes.node.name': svc.nodeName,
    'container.name': svc.container,
    'cloud.provider': 'aws',
    'cloud.region': svc.region,
    'cloud.availability_zone': svc.availabilityZone,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Timeline helpers
// ---------------------------------------------------------------------------

interface TimeWindow {
  start: number;
  end: number;
}

interface IncidentWindows {
  configReload: TimeWindow;
  cacheMiss: TimeWindow;
  dbErrors: TimeWindow;
  cascade: TimeWindow;
  fullDegradation: TimeWindow;
}

function getIncidentWindows(from: number, to: number): IncidentWindows {
  const ms = to - from;
  return {
    configReload: { start: from + ms * 0.4, end: from + ms * 0.45 },
    cacheMiss: { start: from + ms * 0.42, end: from + ms * 0.65 },
    dbErrors: { start: from + ms * 0.5, end: to },
    cascade: { start: from + ms * 0.65, end: to },
    fullDegradation: { start: from + ms * 0.8, end: to },
  };
}

function isInWindow(ts: number, w: TimeWindow): boolean {
  return ts >= w.start && ts <= w.end;
}

function isAfter(ts: number, point: number): boolean {
  return ts >= point;
}

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const { logger } = runOptions;
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  return {
    generate: ({ range, clients: { logsEsClient } }) => {
      const from = range.from.getTime();
      const to = range.to.getTime();
      const windows = getIncidentWindows(from, to);

      // =======================================================================
      // NOISE — present throughout, ~90% of total volume
      // =======================================================================

      const healthCheckServices = [
        SERVICES.apiGateway[0],
        SERVICES.cart[0],
        SERVICES.productCatalog[0],
        SERVICES.user,
      ];

      // rate(120) * (3600/10) = ~43,200 logs/h
      const healthChecks = range
        .interval('10s')
        .rate(120)
        .generator((timestamp, index) => {
          const svc = healthCheckServices[index % healthCheckServices.length];
          return log
            .create({ isLogsDb })
            .dataset(svc.dataset)
            .message('GET /health 200 OK')
            .logLevel('info')
            .service(svc.name)
            .defaults(
              svcDefaults(svc, {
                'event.category': 'web',
                'event.outcome': 'success',
                'url.path': '/health',
                'http.request.method': 'GET',
                'http.response.status_code': 200,
              })
            )
            .timestamp(timestamp);
        });

      // Load balancer access logs with status code variety
      const lbRoutes = [
        { method: 'GET', path: '/api/products' },
        { method: 'GET', path: '/api/cart' },
        { method: 'POST', path: '/api/checkout' },
        { method: 'GET', path: '/api/user/profile' },
        { method: 'GET', path: '/api/search' },
        { method: 'GET', path: '/api/recommendations' },
        { method: 'GET', path: '/favicon.ico' },
        { method: 'GET', path: '/static/bundle.js' },
      ];

      // rate(70) * (3600/10) = ~25,200 logs/h
      const loadBalancerLogs = range
        .interval('10s')
        .rate(70)
        .generator((timestamp, index) => {
          const lb = SERVICES.loadBalancer[index % SERVICES.loadBalancer.length];
          const route = lbRoutes[index % lbRoutes.length];
          const statusPool = [200, 200, 200, 200, 200, 200, 200, 304, 301, 200];
          const status = statusPool[index % statusPool.length];
          return log
            .create({ isLogsDb })
            .dataset(lb.dataset)
            .message(`${route.method} ${route.path} HTTP/1.1 ${status} via_upstream`)
            .logLevel('info')
            .service(lb.name)
            .defaults(
              svcDefaults(lb, {
                'event.category': 'web',
                'event.outcome': 'success',
                'url.path': route.path,
                'http.request.method': route.method,
                'http.response.status_code': status,
              })
            )
            .timestamp(timestamp);
        });

      // fluent-bit logs: 3 message types for richer categorize_text
      const fluentBitMessages = [
        { msg: '[filter:kubernetes:kubernetes.0] Merged new pod metadata', level: 'info' as const },
        { msg: '[output:es:es.0] worker #0 flushed 256 chunks', level: 'info' as const },
        { msg: '[input:tail:tail.0] inotify_add_watch fd=14 added', level: 'debug' as const },
      ];

      // rate(8) * (3600/15) = ~1,920 logs/h
      const fluentBitLogs = range
        .interval('15s')
        .rate(8)
        .generator((timestamp, index) => {
          const tpl = fluentBitMessages[index % fluentBitMessages.length];
          return log
            .create({ isLogsDb })
            .dataset(SERVICES.fluentBit.dataset)
            .message(tpl.msg)
            .logLevel(tpl.level)
            .service(SERVICES.fluentBit.name)
            .defaults(svcDefaults(SERVICES.fluentBit))
            .timestamp(timestamp);
        });

      // kube-scheduler events (~240/h)
      const kubeSchedulerPods = [
        'cart-3d4e5f-abc12',
        'catalog-7f8b9c-jkl78',
        'payment-2c3d4e-pqr12',
        'search-4o5p6q-bcd90',
      ];

      const kubeSchedulerLogs = range
        .interval('30s')
        .rate(2)
        .generator((timestamp, index) => {
          const pod = kubeSchedulerPods[index % kubeSchedulerPods.length];
          return log
            .create({ isLogsDb })
            .dataset(SERVICES.kubeScheduler.dataset)
            .message(`Successfully bound pod default/${pod} to node worker-${(index % 3) + 1}`)
            .logLevel('info')
            .service(SERVICES.kubeScheduler.name)
            .defaults(svcDefaults(SERVICES.kubeScheduler))
            .timestamp(timestamp);
        });

      // =======================================================================
      // NORMAL APPLICATION LOGS — multiple message templates per service
      // =======================================================================

      // cart-service: 4 message templates, rate(15) => ~5,400 logs/h
      const cartMessageTemplates = [
        (i: number) => ({
          msg: `Cart updated for session sid-${100000 + (i % 9999)}`,
          level: 'info' as const,
        }),
        (i: number) => ({
          msg: `Cart item added: SKU-${2000 + (i % 800)} quantity=${1 + (i % 5)}`,
          level: 'info' as const,
        }),
        (i: number) => ({
          msg: `Cart validation passed for session sid-${100000 + (i % 9999)}`,
          level: 'debug' as const,
        }),
        (i: number) => ({
          msg: `Cart session expired for sid-${100000 + (i % 9999)}, cleaned up`,
          level: 'info' as const,
        }),
      ];

      const cartNormalLogs = range
        .interval('10s')
        .rate(15)
        .generator((timestamp, index) => {
          const svc = SERVICES.cart[index % SERVICES.cart.length];
          const tpl = cartMessageTemplates[index % cartMessageTemplates.length](index);
          return log
            .create({ isLogsDb })
            .dataset(svc.dataset)
            .message(tpl.msg)
            .logLevel(tpl.level)
            .service(svc.name)
            .defaults(
              svcDefaults(svc, {
                'event.category': 'application',
                'event.outcome': 'success',
                'trace.id': generateShortId(),
                labels: { shard: `cart-shard-${(index % 3) + 1}`, config_version: 'v42' },
              })
            )
            .timestamp(timestamp);
        });

      // product-catalog: 3 message templates, rate(10) => ~3,600 logs/h
      const catalogMessageTemplates = [
        (i: number) => ({
          msg: `Product lookup for SKU-${2000 + (i % 500)} completed`,
          level: 'info' as const,
        }),
        (i: number) => ({
          msg: `Product cache hit for SKU-${2000 + (i % 500)}`,
          level: 'debug' as const,
        }),
        () => ({
          msg: 'Category index refreshed, 847 products updated',
          level: 'info' as const,
        }),
      ];

      const catalogNormalLogs = range
        .interval('10s')
        .rate(10)
        .generator((timestamp, index) => {
          const svc = SERVICES.productCatalog[index % SERVICES.productCatalog.length];
          const tpl = catalogMessageTemplates[index % catalogMessageTemplates.length](index);
          return log
            .create({ isLogsDb })
            .dataset(svc.dataset)
            .message(tpl.msg)
            .logLevel(tpl.level)
            .service(svc.name)
            .defaults(
              svcDefaults(svc, {
                'event.category': 'application',
                'event.outcome': 'success',
                'trace.id': generateShortId(),
              })
            )
            .timestamp(timestamp);
        });

      // payment-service: rate(5) => ~1,800 logs/h
      const paymentNormalLogs = range
        .interval('10s')
        .rate(5)
        .generator((timestamp, index) =>
          log
            .create({ isLogsDb })
            .dataset(SERVICES.payment.dataset)
            .message(`Payment processed for order ORD-${30000 + (index % 5000)}`)
            .logLevel('info')
            .service(SERVICES.payment.name)
            .defaults(
              svcDefaults(SERVICES.payment, {
                'event.category': 'application',
                'event.outcome': 'success',
                'trace.id': generateShortId(),
              })
            )
            .timestamp(timestamp)
        );

      // user-service: rate(5) => ~1,800 logs/h
      const userNormalLogs = range
        .interval('10s')
        .rate(5)
        .generator((timestamp, index) =>
          log
            .create({ isLogsDb })
            .dataset(SERVICES.user.dataset)
            .message(`User profile loaded for uid-${10000 + (index % 3000)}`)
            .logLevel('info')
            .service(SERVICES.user.name)
            .defaults(
              svcDefaults(SERVICES.user, {
                'event.category': 'application',
                'event.outcome': 'success',
                'trace.id': generateShortId(),
              })
            )
            .timestamp(timestamp)
        );

      // recommendation-engine: rate(5) => ~1,800 logs/h
      const recoNormalLogs = range
        .interval('10s')
        .rate(5)
        .generator((timestamp, index) =>
          log
            .create({ isLogsDb })
            .dataset(SERVICES.recommendation.dataset)
            .message(
              `Generated ${10 + (index % 20)} recommendations for uid-${10000 + (index % 3000)}`
            )
            .logLevel('info')
            .service(SERVICES.recommendation.name)
            .defaults(
              svcDefaults(SERVICES.recommendation, {
                'event.category': 'application',
                'event.outcome': 'success',
                'trace.id': generateShortId(),
              })
            )
            .timestamp(timestamp)
        );

      // search-service: 2 message templates, rate(40) => ~14,400 logs/h
      const searchTerms = [
        'wireless headphones',
        'laptop stand',
        'usb-c hub',
        'mechanical keyboard',
        'monitor arm',
        'webcam 1080p',
        'desk lamp',
        'office chair',
      ];

      const searchQueryLogs = range
        .interval('10s')
        .rate(40)
        .generator((timestamp, index) => {
          const isMaintenanceLog = index % 12 === 0;
          if (isMaintenanceLog) {
            return log
              .create({ isLogsDb })
              .dataset(SERVICES.search.dataset)
              .message(
                `Index shard [products-${(index % 5) + 1}] segment merge completed in ${
                  80 + (index % 400)
                }ms`
              )
              .logLevel('debug')
              .service(SERVICES.search.name)
              .defaults(
                svcDefaults(SERVICES.search, {
                  'event.category': 'database',
                  'event.outcome': 'success',
                })
              )
              .timestamp(timestamp);
          }
          return log
            .create({ isLogsDb })
            .dataset(SERVICES.search.dataset)
            .message(
              `Query completed: "${searchTerms[index % searchTerms.length]}" returned ${
                50 + (index % 200)
              } results in ${2 + (index % 45)}ms`
            )
            .logLevel('info')
            .service(SERVICES.search.name)
            .defaults(
              svcDefaults(SERVICES.search, {
                'event.category': 'application',
                'event.outcome': 'success',
                'trace.id': generateShortId(),
              })
            )
            .timestamp(timestamp);
        });

      // cache-warmer heartbeat: rate(1) per 30s => ~120/h
      const cacheWarmerNormalLogs = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          log
            .create({ isLogsDb })
            .dataset(SERVICES.cacheWarmer.dataset)
            .message('Cache warm cycle completed, 847 keys refreshed')
            .logLevel('info')
            .service(SERVICES.cacheWarmer.name)
            .defaults(
              svcDefaults(SERVICES.cacheWarmer, {
                'event.category': 'application',
                'event.outcome': 'success',
                labels: { cache_ttl: '300' },
              })
            )
            .timestamp(timestamp)
        );

      // =======================================================================
      // RED HERRINGS — low volume, unrelated to the incident
      // =======================================================================

      // user-service: auth token warnings (~60/h)
      const userAuthWarnings = range
        .interval('1m')
        .rate(1)
        .generator((timestamp, index) =>
          log
            .create({ isLogsDb })
            .dataset(SERVICES.user.dataset)
            .message(`Auth token refresh failed for uid-${10000 + (index % 200)}, retrying in 30s`)
            .logLevel('warn')
            .service(SERVICES.user.name)
            .defaults(
              svcDefaults(SERVICES.user, {
                'event.category': 'authentication',
                'event.outcome': 'failure',
              })
            )
            .timestamp(timestamp)
        );

      // cert-manager: renewal logs (~12/h)
      const certManagerLogs = range
        .interval('5m')
        .rate(1)
        .generator((timestamp) =>
          log
            .create({ isLogsDb })
            .dataset(SERVICES.certManager.dataset)
            .message(
              'Certificate renewal for *.internal.svc.cluster.local scheduled, expires in 29d'
            )
            .logLevel('info')
            .service(SERVICES.certManager.name)
            .defaults(
              svcDefaults(SERVICES.certManager, {
                'event.category': 'configuration',
                'event.outcome': 'success',
              })
            )
            .timestamp(timestamp)
        );

      // search-service: slow query warnings (~30/h)
      const searchSlowQueryWarnings = range
        .interval('2m')
        .rate(1)
        .generator((timestamp, index) =>
          log
            .create({ isLogsDb })
            .dataset(SERVICES.search.dataset)
            .message(
              `Slow query detected: "${searchTerms[index % searchTerms.length]}" took ${
                520 + (index % 300)
              }ms, threshold 500ms`
            )
            .logLevel('warn')
            .service(SERVICES.search.name)
            .defaults(
              svcDefaults(SERVICES.search, {
                'event.category': 'application',
                'event.outcome': 'success',
              })
            )
            .timestamp(timestamp)
        );

      // =======================================================================
      // SIGNAL — root cause: cache-warmer config reload (very few logs)
      // =======================================================================

      const cacheWarmerConfigReload = range
        .interval('2m')
        .rate(1)
        .generator((timestamp) => {
          if (!isInWindow(timestamp, windows.configReload)) return [];
          return log
            .create({ isLogsDb })
            .dataset(SERVICES.cacheWarmer.dataset)
            .message('Configuration reloaded: cache.ttl=5, cache.max_connections=100')
            .logLevel('info')
            .service(SERVICES.cacheWarmer.name)
            .defaults(
              svcDefaults(SERVICES.cacheWarmer, {
                'event.action': 'config-reload',
                'event.category': 'configuration',
                'event.outcome': 'success',
                labels: { cache_ttl: '5' },
              })
            )
            .timestamp(timestamp);
        });

      // =======================================================================
      // SIGNAL — warning phase: cache misses in cart-service
      // =======================================================================

      const cacheMissRates = [55, 62, 71, 78, 85, 91, 94, 97, 99];

      const cartCacheMissWarnings = range
        .interval('15s')
        .rate(3)
        .generator((timestamp, index) => {
          if (!isInWindow(timestamp, windows.cacheMiss)) return [];
          const svc = SERVICES.cart[index % SERVICES.cart.length];
          const missRate =
            cacheMissRates[Math.min(index % cacheMissRates.length, cacheMissRates.length - 1)];
          return log
            .create({ isLogsDb })
            .dataset(svc.dataset)
            .message(
              `Cache miss rate at ${missRate}%, expected below 20%. Redis key expired, TTL=5s`
            )
            .logLevel('warn')
            .service(svc.name)
            .defaults(
              svcDefaults(svc, {
                'event.category': 'application',
                'event.outcome': 'failure',
                'trace.id': generateShortId(),
                labels: { shard: `cart-shard-${(index % 3) + 1}`, config_version: 'v43' },
              })
            )
            .timestamp(timestamp);
        });

      // =======================================================================
      // SIGNAL — error phase: DB connection pool exhaustion
      // =======================================================================

      const cartPoolWarnings = range
        .interval('15s')
        .rate(3)
        .generator((timestamp, index) => {
          const warnStart = windows.dbErrors.start - (to - from) * 0.03;
          if (!isAfter(timestamp, warnStart) || isAfter(timestamp, windows.dbErrors.start)) {
            return [];
          }
          const svc = SERVICES.cart[index % SERVICES.cart.length];
          const pct = 80 + Math.min(index % 20, 19);
          return log
            .create({ isLogsDb })
            .dataset(svc.dataset)
            .message(
              `Connection pool utilization at ${pct}% (${Math.round(
                40 * (pct / 100)
              )}/40 connections in use)`
            )
            .logLevel('warn')
            .service(svc.name)
            .defaults(
              svcDefaults(svc, {
                'event.category': 'application',
                'event.outcome': 'failure',
                labels: { shard: `cart-shard-${(index % 3) + 1}`, config_version: 'v43' },
              })
            )
            .timestamp(timestamp);
        });

      const cartPoolExhaustedErrors = range
        .interval('10s')
        .rate(8)
        .generator((timestamp, index) => {
          if (!isAfter(timestamp, windows.dbErrors.start)) return [];
          const svc = SERVICES.cart[index % SERVICES.cart.length];
          return log
            .create({ isLogsDb })
            .dataset(svc.dataset)
            .message(
              'Connection pool exhausted, cannot acquire connection within 5000ms. Active: 40/40, Idle: 0'
            )
            .logLevel('error')
            .service(svc.name)
            .defaults(
              svcDefaults(svc, {
                'error.message':
                  'Connection pool exhausted, cannot acquire connection within 5000ms',
                'event.category': 'application',
                'event.outcome': 'failure',
                'trace.id': generateShortId(),
                labels: { shard: `cart-shard-${(index % 3) + 1}`, config_version: 'v43' },
              })
            )
            .timestamp(timestamp);
        });

      const cartDbTimeouts = range
        .interval('15s')
        .rate(4)
        .generator((timestamp, index) => {
          if (!isAfter(timestamp, windows.dbErrors.start)) return [];
          const svc = SERVICES.cart[index % SERVICES.cart.length];
          const tables = ['cart_items', 'product_inventory', 'session_data'];
          const table = tables[index % tables.length];
          return log
            .create({ isLogsDb })
            .dataset(svc.dataset)
            .message(
              `Database query timeout after 30000ms: SELECT * FROM ${table} WHERE session_id = ? (pool wait exceeded)`
            )
            .logLevel('error')
            .service(svc.name)
            .defaults(
              svcDefaults(svc, {
                'error.message': `Database query timeout after 30000ms on ${table}`,
                'event.category': 'database',
                'event.outcome': 'failure',
                'trace.id': generateShortId(),
                labels: { shard: `cart-shard-${(index % 3) + 1}`, config_version: 'v43' },
              })
            )
            .timestamp(timestamp);
        });

      // =======================================================================
      // SIGNAL — cascade phase: upstream services degrade
      // =======================================================================

      const catalogTimeouts = range
        .interval('15s')
        .rate(5)
        .generator((timestamp, index) => {
          if (!isAfter(timestamp, windows.cascade.start)) return [];
          const svc = SERVICES.productCatalog[index % SERVICES.productCatalog.length];
          return log
            .create({ isLogsDb })
            .dataset(svc.dataset)
            .message('Timeout calling cart-service after 5000ms: GET /api/cart/availability')
            .logLevel('error')
            .service(svc.name)
            .defaults(
              svcDefaults(svc, {
                'error.message': 'Timeout calling cart-service after 5000ms',
                'event.category': 'application',
                'event.outcome': 'failure',
                'trace.id': generateShortId(),
              })
            )
            .timestamp(timestamp);
        });

      const recoTimeouts = range
        .interval('20s')
        .rate(3)
        .generator((timestamp) => {
          if (!isAfter(timestamp, windows.cascade.start)) return [];
          return log
            .create({ isLogsDb })
            .dataset(SERVICES.recommendation.dataset)
            .message(
              'Failed to fetch cart context from cart-service: read tcp timeout after 5000ms'
            )
            .logLevel('error')
            .service(SERVICES.recommendation.name)
            .defaults(
              svcDefaults(SERVICES.recommendation, {
                'error.message': 'Failed to fetch cart context: read tcp timeout',
                'event.category': 'application',
                'event.outcome': 'failure',
                'trace.id': generateShortId(),
              })
            )
            .timestamp(timestamp);
        });

      const gatewayErrors = range
        .interval('10s')
        .rate(10)
        .generator((timestamp, index) => {
          if (!isAfter(timestamp, windows.cascade.start)) return [];
          const gw = SERVICES.apiGateway[index % SERVICES.apiGateway.length];
          const endpoints = [
            { method: 'POST', path: '/api/checkout' },
            { method: 'GET', path: '/api/cart' },
            { method: 'GET', path: '/api/recommendations' },
          ];
          const ep = endpoints[index % endpoints.length];
          const status = index % 3 === 0 ? 504 : 502;
          const statusText = status === 504 ? 'Gateway Timeout' : 'Bad Gateway';
          return log
            .create({ isLogsDb })
            .dataset(gw.dataset)
            .message(`${status} ${statusText} - ${ep.method} ${ep.path} (upstream: cart-service)`)
            .logLevel('error')
            .service(gw.name)
            .defaults(
              svcDefaults(gw, {
                'error.message': `${status} ${statusText}`,
                'event.category': 'web',
                'event.outcome': 'failure',
                'url.path': ep.path,
                'http.request.method': ep.method,
                'http.response.status_code': status,
                'trace.id': generateShortId(),
              })
            )
            .timestamp(timestamp);
        });

      // =======================================================================
      // SIGNAL — full degradation: circuit breaker
      // =======================================================================

      const cartCircuitBreaker = range
        .interval('15s')
        .rate(2)
        .generator((timestamp, index) => {
          if (!isAfter(timestamp, windows.fullDegradation.start)) return [];
          const svc = SERVICES.cart[index % SERVICES.cart.length];
          return log
            .create({ isLogsDb })
            .dataset(svc.dataset)
            .message(
              'Circuit breaker OPEN for database connection pool. All requests short-circuited for 30s'
            )
            .logLevel('error')
            .service(svc.name)
            .defaults(
              svcDefaults(svc, {
                'error.message': 'Circuit breaker OPEN for database connection pool',
                'event.category': 'application',
                'event.outcome': 'failure',
                labels: { shard: `cart-shard-${(index % 3) + 1}`, config_version: 'v43' },
              })
            )
            .timestamp(timestamp);
        });

      const paymentCartErrors = range
        .interval('20s')
        .rate(2)
        .generator((timestamp) => {
          if (!isAfter(timestamp, windows.fullDegradation.start)) return [];
          return log
            .create({ isLogsDb })
            .dataset(SERVICES.payment.dataset)
            .message(
              'Payment pre-validation failed: cart-service returned 503, cannot verify cart contents'
            )
            .logLevel('error')
            .service(SERVICES.payment.name)
            .defaults(
              svcDefaults(SERVICES.payment, {
                'error.message': 'Payment pre-validation failed: cart-service returned 503',
                'event.category': 'application',
                'event.outcome': 'failure',
                'trace.id': generateShortId(),
              })
            )
            .timestamp(timestamp);
        });

      // =======================================================================
      // Compose all generators
      // =======================================================================

      return [
        // Noise (very high volume)
        withClient(
          logsEsClient,
          logger.perf('generating_health_checks', () => healthChecks)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_lb_logs', () => loadBalancerLogs)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_fluent_bit', () => fluentBitLogs)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_kube_scheduler', () => kubeSchedulerLogs)
        ),

        // Normal application logs
        withClient(
          logsEsClient,
          logger.perf('generating_cart_normal', () => cartNormalLogs)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_catalog_normal', () => catalogNormalLogs)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_payment_normal', () => paymentNormalLogs)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_user_normal', () => userNormalLogs)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_reco_normal', () => recoNormalLogs)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_search_queries', () => searchQueryLogs)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_cache_warmer_normal', () => cacheWarmerNormalLogs)
        ),

        // Red herrings
        withClient(
          logsEsClient,
          logger.perf('generating_user_auth_warnings', () => userAuthWarnings)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_cert_manager', () => certManagerLogs)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_search_slow_queries', () => searchSlowQueryWarnings)
        ),

        // Signal — root cause
        withClient(
          logsEsClient,
          logger.perf('generating_config_reload', () => cacheWarmerConfigReload)
        ),

        // Signal — warning phase
        withClient(
          logsEsClient,
          logger.perf('generating_cache_miss_warnings', () => cartCacheMissWarnings)
        ),

        // Signal — error phase
        withClient(
          logsEsClient,
          logger.perf('generating_pool_warnings', () => cartPoolWarnings)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_pool_exhausted', () => cartPoolExhaustedErrors)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_db_timeouts', () => cartDbTimeouts)
        ),

        // Signal — cascade
        withClient(
          logsEsClient,
          logger.perf('generating_catalog_timeouts', () => catalogTimeouts)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_reco_timeouts', () => recoTimeouts)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_gateway_errors', () => gatewayErrors)
        ),

        // Signal — full degradation
        withClient(
          logsEsClient,
          logger.perf('generating_circuit_breaker', () => cartCircuitBreaker)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_payment_errors', () => paymentCartErrors)
        ),
      ];
    },
  };
};

export default scenario;
