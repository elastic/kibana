/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Error Groups - Advanced Multi-Service, Multi-Host, Spike + Canary
 *
 * Story: A complex e-commerce stack with multiple services, environments, and hosts.
 * - A payment gateway outage causes a late spike in checkout timeouts.
 * - A canary auth deployment introduces a new JWT exception near the end of the range.
 * - One checkout host has a TLS misconfiguration (host-specific error).
 * - Inventory workers emit background errors not tied to transactions.
 *
 * This scenario is designed to validate:
 * - kqlFilter: environment, host, labels, handled/unhandled, service.version
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_log_groups",
 *   "tool_params": {
 *     "start": "now-1h",
 *     "end": "now"
 *   }
 * }
 * ```
 */

import type {
  ApmFields,
  APMStacktrace,
  Instance,
  Serializable,
  Timerange,
} from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';

const MINUTE = 60 * 1000;
const SPIKE_WINDOW_MINUTES = 15;
const CANARY_WINDOW_MINUTES = 20;

/**
 * Configuration for a single error pattern.
 */
export interface ErrorPatternConfig {
  type: string;
  message: string;
  culprit: string;
  handled: boolean;
  /** Baseline errors per minute. */
  rate: number;
  /** Optional downstream dependency for failed outbound span generation. */
  downstreamServiceResource?: string;
  /** Optional span name for downstream dependency. */
  spanName?: string;
  /** Optional span type for downstream dependency. */
  spanType?: string;
  /** Optional span subtype for downstream dependency. */
  spanSubtype?: string;
  /** Optional span duration (ms) for downstream dependency. */
  spanDuration?: number;
  /** Optional spike rate (errors per minute) in the last 15 minutes of the range. */
  spikeRate?: number;
  /** Only emit this error during the spike window. */
  onlyInSpike?: boolean;
  /** Only emit this error during the canary window. */
  onlyInCanary?: boolean;
  /** Restrict errors to specific hosts. */
  onlyOnHosts?: string[];
  /** Optional explicit grouping key to force grouping across variations. */
  groupingKey?: string;
  /** Optional stack trace frames for the error. */
  stacktrace?: APMStacktrace[];
}

/**
 * Configuration for a single host instance within a service.
 */
export interface ErrorServiceHostConfig {
  name: string;
  containerId?: string;
  kubernetesPodName?: string;
  availabilityZone?: string;
  serviceVersion?: string;
}

/**
 * Configuration for a service to generate error data.
 */
export interface AdvancedErrorServiceConfig {
  name: string;
  environment: string;
  agentName: string;
  transactionName: string;
  cloudRegion?: string;
  kubernetesNamespace?: string;
  labels?: Record<string, string>;
  hosts: ErrorServiceHostConfig[];
  errors: ErrorPatternConfig[];
  /** Background errors not tied to transactions. */
  backgroundErrors?: ErrorPatternConfig[];
}

const buildOverrides = (
  overrides: Record<string, string | number | boolean | undefined>
): Record<string, string | number | boolean> =>
  Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined)
  ) as Record<string, string | number | boolean>;

/**
 * Converts structured stacktrace to OTel/ECS compliant string format.
 * Example output: "at validate (CartValidator.java:87)\n at processCheckout (CheckoutService.java:142)"
 */
function stacktraceToString(stacktrace?: APMStacktrace[]): string | undefined {
  if (!stacktrace || stacktrace.length === 0) return undefined;
  return stacktrace
    .map((frame) => {
      const lineNumber = frame.line && 'number' in frame.line ? frame.line.number : undefined;
      return `at ${frame.function} (${frame.filename}:${lineNumber})`;
    })
    .join('\n');
}

const buildApmError = ({
  instance,
  errorConfig,
  timestamp,
}: {
  instance: Instance;
  errorConfig: ErrorPatternConfig;
  timestamp: number;
}) => {
  const error = instance
    .error({
      message: errorConfig.message,
      type: errorConfig.type,
      culprit: errorConfig.culprit,
      groupingKey: errorConfig.groupingKey,
      stacktrace: errorConfig.stacktrace,
    })
    .timestamp(timestamp);

  const exception = {
    message: errorConfig.message,
    type: errorConfig.type,
    handled: errorConfig.handled,
    ...(errorConfig.stacktrace ? { stacktrace: errorConfig.stacktrace } : {}),
  };

  // Convert structured stacktrace to string for OTel/ECS compliance
  const stackTraceString = stacktraceToString(errorConfig.stacktrace);

  return error.overrides({
    'error.exception': [exception],
    ...(stackTraceString ? { 'error.stack_trace': stackTraceString } : {}),
  });
};

const buildFailureSpan = ({
  instance,
  errorConfig,
  timestamp,
}: {
  instance: Instance;
  errorConfig: ErrorPatternConfig;
  timestamp: number;
}) => {
  if (!errorConfig.downstreamServiceResource) {
    return undefined;
  }

  const spanName = errorConfig.spanName ?? `CALL ${errorConfig.downstreamServiceResource}`;
  const spanType = errorConfig.spanType ?? 'external';
  const spanSubtype = errorConfig.spanSubtype ?? 'http';
  const spanDuration = errorConfig.spanDuration ?? 50;

  return instance
    .span(spanName, spanType, spanSubtype)
    .destination(errorConfig.downstreamServiceResource)
    .timestamp(timestamp + 1)
    .duration(spanDuration)
    .failure();
};

/**
 * Generates rich APM error data for error groups testing.
 * Can be used both by CLI (via default export) and by API tests (via direct import).
 */
export function generateAdvancedErrorGroupsData({
  range,
  apmEsClient,
  services,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
  services: AdvancedErrorServiceConfig[];
}): ScenarioReturnType<ApmFields> {
  const spikeStart = Math.max(
    range.from.getTime(),
    range.to.getTime() - SPIKE_WINDOW_MINUTES * MINUTE
  );
  const canaryStart = Math.max(
    range.from.getTime(),
    range.to.getTime() - CANARY_WINDOW_MINUTES * MINUTE
  );

  const serviceInstances = services.flatMap((serviceConfig) =>
    serviceConfig.hosts.map((hostConfig) => {
      const overrides = buildOverrides({
        'host.name': hostConfig.name,
        'container.id': hostConfig.containerId,
        'kubernetes.pod.name': hostConfig.kubernetesPodName,
        'kubernetes.namespace': serviceConfig.kubernetesNamespace,
        'service.version': hostConfig.serviceVersion,
        'service.node.name': `${serviceConfig.name}-${hostConfig.name}`,
        'cloud.region': serviceConfig.cloudRegion,
        'cloud.availability_zone': hostConfig.availabilityZone,
      });

      if (serviceConfig.labels) {
        for (const [key, value] of Object.entries(serviceConfig.labels)) {
          overrides[`labels.${key}`] = value;
        }
      }

      const instance = apm
        .service({
          name: serviceConfig.name,
          environment: serviceConfig.environment,
          agentName: serviceConfig.agentName,
        })
        .instance(`${serviceConfig.name}-${hostConfig.name}`)
        .overrides(overrides);

      return { instance, serviceConfig, hostConfig };
    })
  );

  const data = range.interval('1m').generator((timestamp) => {
    const isSpike = timestamp >= spikeStart;
    const isCanary = timestamp >= canaryStart;

    return serviceInstances.flatMap(({ instance, serviceConfig, hostConfig }) => {
      const events: Array<Serializable<ApmFields>> = [];

      const emitErrors = (errorConfig: ErrorPatternConfig, attachToTransaction: boolean) => {
        if (errorConfig.onlyInSpike && !isSpike) {
          return;
        }
        if (errorConfig.onlyInCanary && !isCanary) {
          return;
        }
        if (errorConfig.onlyOnHosts && !errorConfig.onlyOnHosts.includes(hostConfig.name)) {
          return;
        }

        const rate = isSpike && errorConfig.spikeRate ? errorConfig.spikeRate : errorConfig.rate;
        for (let i = 0; i < rate; i++) {
          const errorTimestamp = timestamp + i * 10;
          const errorEvent = buildApmError({
            instance,
            errorConfig,
            timestamp: errorTimestamp,
          });

          if (attachToTransaction) {
            const dependencySpan = buildFailureSpan({
              instance,
              errorConfig,
              timestamp: errorTimestamp,
            });

            events.push(
              instance
                .transaction({ transactionName: serviceConfig.transactionName })
                .timestamp(errorTimestamp)
                .duration(200)
                .failure()
                .errors(errorEvent)
                .children(...(dependencySpan ? [dependencySpan] : []))
            );
          } else {
            events.push(errorEvent);
          }
        }
      };

      serviceConfig.errors.forEach((errorConfig) => emitErrors(errorConfig, true));
      serviceConfig.backgroundErrors?.forEach((errorConfig) => emitErrors(errorConfig, false));

      return events;
    });
  });

  return withClient(apmEsClient, data);
}

export default createCliScenario(({ range, clients: { apmEsClient } }) => {
  const services: AdvancedErrorServiceConfig[] = [
    {
      name: 'checkout-api',
      environment: 'production',
      agentName: 'java',
      transactionName: 'POST /api/checkout',
      cloudRegion: 'us-east-1',
      kubernetesNamespace: 'payments',
      labels: { team: 'checkout', tier: 'critical', lifecycle_state: 'stable' },
      hosts: [
        {
          name: 'checkout-prod-01',
          containerId: 'container-checkout-001',
          kubernetesPodName: 'checkout-api-abc123',
          availabilityZone: 'us-east-1a',
          serviceVersion: '1.12.0',
        },
        {
          name: 'checkout-prod-02',
          containerId: 'container-checkout-002',
          kubernetesPodName: 'checkout-api-def456',
          availabilityZone: 'us-east-1b',
          serviceVersion: '1.12.0',
        },
      ],
      errors: [
        {
          type: 'TimeoutException',
          message: 'Payment gateway timed out after 3s',
          culprit: 'com.acme.checkout.PaymentGateway.call',
          handled: false,
          rate: 2,
          spikeRate: 8,
          downstreamServiceResource: 'payment-gateway',
          spanName: 'POST https://payment.gateway/charge',
          spanType: 'external',
          spanSubtype: 'http',
          spanDuration: 120,
        },
        {
          type: 'NullPointerException',
          message: 'Cart is null during validation',
          culprit: 'com.acme.checkout.CartValidator.validate',
          handled: true,
          rate: 1,
          stacktrace: [
            {
              filename: 'CartValidator.java',
              function: 'validate',
              line: { number: 87 },
              module: 'com.acme.checkout',
            },
            {
              filename: 'CheckoutService.java',
              function: 'processCheckout',
              line: { number: 142 },
              module: 'com.acme.checkout',
            },
            {
              filename: 'CheckoutController.java',
              function: 'handleRequest',
              line: { number: 56 },
              module: 'com.acme.checkout.api',
            },
          ],
        },
        {
          type: 'SSLHandshakeException',
          message: 'TLS handshake failed with payment gateway',
          culprit: 'com.acme.checkout.PaymentGateway.connect',
          handled: false,
          rate: 1,
          onlyOnHosts: ['checkout-prod-02'],
          groupingKey: 'tls-handshake-failure',
          downstreamServiceResource: 'payment-gateway',
          spanName: 'POST https://payment.gateway/handshake',
          spanType: 'external',
          spanSubtype: 'http',
          spanDuration: 80,
        },
      ],
    },
    {
      name: 'cart-service',
      environment: 'production',
      agentName: 'nodejs',
      transactionName: 'POST /api/cart/items',
      cloudRegion: 'us-west-2',
      kubernetesNamespace: 'cart',
      labels: { team: 'cart', tier: 'critical', lifecycle_state: 'stable' },
      hosts: [
        {
          name: 'cart-prod-01',
          containerId: 'container-cart-001',
          kubernetesPodName: 'cart-service-xyz123',
          availabilityZone: 'us-west-2a',
          serviceVersion: '3.4.1',
        },
        {
          name: 'cart-prod-02',
          containerId: 'container-cart-002',
          kubernetesPodName: 'cart-service-uvw456',
          availabilityZone: 'us-west-2b',
          serviceVersion: '3.4.1',
        },
      ],
      errors: [
        {
          type: 'CacheMissException',
          message: 'Cart cache miss during item lookup',
          culprit: 'cart/cache.js:112',
          handled: true,
          rate: 3,
          spikeRate: 6,
          downstreamServiceResource: 'redis',
          spanName: 'GET redis://cart-cache/item',
          spanType: 'db',
          spanSubtype: 'redis',
          spanDuration: 15,
        },
        {
          type: 'SerializationException',
          message: 'Failed to serialize cart item payload',
          culprit: 'cart/serializer.ts:48',
          handled: false,
          rate: 1,
          stacktrace: [
            {
              filename: 'serializer.ts',
              function: 'serializeCartItem',
              line: { number: 48 },
              module: 'cart',
            },
            {
              filename: 'cart_service.ts',
              function: 'addItem',
              line: { number: 112 },
              module: 'cart',
            },
            {
              filename: 'router.ts',
              function: 'handleAddItem',
              line: { number: 34 },
              module: 'cart/routes',
            },
          ],
        },
        {
          type: 'RateLimitException',
          message: 'Rate limit exceeded for cart mutations',
          culprit: 'cart/rate_limiter.ts:27',
          handled: true,
          rate: 1,
          onlyOnHosts: ['cart-prod-01'],
          downstreamServiceResource: 'rate-limiter',
          spanName: 'POST https://rate-limiter/v1/check',
          spanType: 'external',
          spanSubtype: 'http',
          spanDuration: 20,
        },
      ],
    },
    {
      name: 'auth-service',
      environment: 'production',
      agentName: 'go',
      transactionName: 'POST /api/auth/token',
      cloudRegion: 'eu-west-1',
      kubernetesNamespace: 'identity',
      labels: { team: 'identity', tier: 'critical', lifecycle_state: 'stable' },
      hosts: [
        {
          name: 'auth-prod-01',
          containerId: 'container-auth-001',
          kubernetesPodName: 'auth-service-mno789',
          availabilityZone: 'eu-west-1a',
          serviceVersion: '2.1.0',
        },
        {
          name: 'auth-prod-02',
          containerId: 'container-auth-002',
          kubernetesPodName: 'auth-service-pqr012',
          availabilityZone: 'eu-west-1b',
          serviceVersion: '2.1.0',
        },
      ],
      errors: [
        {
          type: 'TokenExpiredException',
          message: 'JWT token expired',
          culprit: 'auth/token.go:88',
          handled: true,
          rate: 2,
        },
        {
          type: 'UnauthorizedException',
          message: 'Invalid credentials provided',
          culprit: 'auth/handlers/login.go:57',
          handled: true,
          rate: 5,
        },
        {
          type: 'DependencyTimeoutException',
          message: 'User profile lookup timed out',
          culprit: 'auth/profile_client.go:102',
          handled: false,
          rate: 1,
          spikeRate: 4,
          downstreamServiceResource: 'user-profile-service',
          spanName: 'GET https://user-profile-service/api/profile',
          spanType: 'external',
          spanSubtype: 'http',
          spanDuration: 90,
        },
      ],
    },
    {
      name: 'auth-service',
      environment: 'production-canary',
      agentName: 'go',
      transactionName: 'POST /api/auth/token',
      cloudRegion: 'eu-west-1',
      kubernetesNamespace: 'identity',
      labels: { team: 'identity', tier: 'critical', lifecycle_state: 'canary' },
      hosts: [
        {
          name: 'auth-canary-01',
          containerId: 'container-auth-canary-001',
          kubernetesPodName: 'auth-service-canary-stu345',
          availabilityZone: 'eu-west-1a',
          serviceVersion: '2.2.0-canary',
        },
      ],
      errors: [
        {
          type: 'JwtSignatureException',
          message: 'JWT signature validation failed',
          culprit: 'auth/jwt_verifier.go:142',
          handled: false,
          rate: 3,
          onlyInCanary: true,
          stacktrace: [
            {
              filename: 'jwt_verifier.go',
              function: 'VerifySignature',
              line: { number: 142 },
              module: 'auth',
            },
            {
              filename: 'token.go',
              function: 'ValidateToken',
              line: { number: 78 },
              module: 'auth',
            },
            {
              filename: 'middleware.go',
              function: 'AuthMiddleware',
              line: { number: 35 },
              module: 'auth/handlers',
            },
          ],
        },
        {
          type: 'NullPointerException',
          message: 'nil pointer dereference in token refresh',
          culprit: 'auth/refresh.go:33',
          handled: false,
          rate: 1,
          onlyInCanary: true,
        },
      ],
    },
    {
      name: 'inventory-worker',
      environment: 'staging',
      agentName: 'python',
      transactionName: 'POST /api/inventory/reserve',
      cloudRegion: 'us-east-2',
      kubernetesNamespace: 'inventory',
      labels: { team: 'inventory', tier: 'standard', lifecycle_state: 'staging' },
      hosts: [
        {
          name: 'inventory-stg-01',
          containerId: 'container-inventory-001',
          kubernetesPodName: 'inventory-worker-ghi678',
          availabilityZone: 'us-east-2a',
          serviceVersion: '0.9.5',
        },
      ],
      errors: [
        {
          type: 'OutOfStockException',
          message: 'SKU-12345 is out of stock',
          culprit: 'inventory/reserve.py:87',
          handled: true,
          rate: 4,
          stacktrace: [
            {
              filename: 'reserve.py',
              function: 'reserve_inventory',
              line: { number: 87 },
              module: 'inventory',
            },
            {
              filename: 'worker.py',
              function: 'process_reservation',
              line: { number: 156 },
              module: 'inventory.workers',
            },
            {
              filename: 'celery_tasks.py',
              function: 'handle_task',
              line: { number: 42 },
              module: 'inventory.tasks',
            },
          ],
        },
        {
          type: 'DatabaseDeadlockException',
          message: 'Deadlock detected while reserving inventory',
          culprit: 'inventory/db.py:144',
          handled: false,
          rate: 1,
          downstreamServiceResource: 'postgresql',
          spanName: 'SELECT ... FROM inventory',
          spanType: 'db',
          spanSubtype: 'postgresql',
          spanDuration: 40,
        },
        {
          type: 'ConnectionRefusedException',
          message: 'Redis connection refused during reserve',
          culprit: 'inventory/cache.py:52',
          handled: false,
          rate: 3,
          onlyInSpike: true,
          downstreamServiceResource: 'redis',
          spanName: 'CONNECT redis://inventory-cache',
          spanType: 'db',
          spanSubtype: 'redis',
          spanDuration: 30,
        },
      ],
      backgroundErrors: [
        {
          type: 'BulkReindexException',
          message: 'Nightly inventory reindex failed',
          culprit: 'inventory/jobs/reindex.py:210',
          handled: false,
          rate: 1,
        },
      ],
    },
    {
      name: 'recommendation-service',
      environment: 'development',
      agentName: 'python',
      transactionName: 'GET /api/recommendations',
      cloudRegion: 'us-east-2',
      kubernetesNamespace: 'ml',
      labels: { team: 'ml', tier: 'experimental', lifecycle_state: 'dev' },
      hosts: [
        {
          name: 'rec-dev-01',
          containerId: 'container-rec-001',
          kubernetesPodName: 'recommendation-service-xyz987',
          availabilityZone: 'us-east-2b',
          serviceVersion: '0.3.0-dev',
        },
      ],
      errors: [
        {
          type: 'ModelNotFoundException',
          message: 'Model "reco-v2" not found',
          culprit: 'ml/model_loader.py:22',
          handled: true,
          rate: 1,
        },
        {
          type: 'FeatureFlagException',
          message: 'Feature flag missing for experiment',
          culprit: 'ml/feature_flags.py:19',
          handled: true,
          rate: 1,
        },
      ],
    },
  ];

  return generateAdvancedErrorGroupsData({ range, apmEsClient, services });
});
