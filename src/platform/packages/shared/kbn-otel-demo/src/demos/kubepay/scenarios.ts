/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FailureScenario } from '../../types';

/**
 * Failure scenarios for KubePay.
 * These simulate real-world misconfigurations and failures in a financial microservices system.
 */
export const KUBEPAY_SCENARIOS: FailureScenario[] = [
  // ============ DRAMATIC FAILURES ============
  {
    id: 'auth-service-unreachable',
    name: 'Auth Service Unreachable',
    description: `All services lose connection to the authentication service. Users cannot login,
register, or perform any authenticated operations. Complete authentication failure across the system.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'gateway',
        variable: 'AUTH_URL',
        value: 'http://auth:9999',
        description: 'Point gateway to wrong auth port',
      },
      {
        type: 'env',
        service: 'user',
        variable: 'AUTH_URL',
        value: 'http://auth:9999',
        description: 'Point user service to wrong auth port',
      },
      {
        type: 'env',
        service: 'wallet',
        variable: 'AUTH_URL',
        value: 'http://auth:9999',
        description: 'Point wallet service to wrong auth port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'gateway',
        variable: 'AUTH_URL',
        value: 'http://auth:8101',
        description: 'Restore gateway auth URL',
      },
      {
        type: 'env',
        service: 'user',
        variable: 'AUTH_URL',
        value: 'http://auth:8101',
        description: 'Restore user service auth URL',
      },
      {
        type: 'env',
        service: 'wallet',
        variable: 'AUTH_URL',
        value: 'http://auth:8101',
        description: 'Restore wallet service auth URL',
      },
    ],
  },
  {
    id: 'user-service-unreachable',
    name: 'User Service Unreachable',
    description: `Gateway and other services cannot reach the user service. User registration fails,
profile lookups fail, and wallet operations that require user info are broken.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'gateway',
        variable: 'USER_URL',
        value: 'http://user:9999',
        description: 'Point gateway to wrong user port',
      },
      {
        type: 'env',
        service: 'wallet',
        variable: 'USER_URL',
        value: 'http://user:9999',
        description: 'Point wallet service to wrong user port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'gateway',
        variable: 'USER_URL',
        value: 'http://user:8102',
        description: 'Restore gateway user URL',
      },
      {
        type: 'env',
        service: 'wallet',
        variable: 'USER_URL',
        value: 'http://user:8102',
        description: 'Restore wallet service user URL',
      },
    ],
  },
  {
    id: 'wallet-service-unreachable',
    name: 'Wallet Service Unreachable',
    description: `Gateway and user service cannot reach the wallet service. Balance top-ups and
fund transfers fail completely. Users can login but cannot perform any financial operations.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'gateway',
        variable: 'WALLET_URL',
        value: 'http://wallet:9999',
        description: 'Point gateway to wrong wallet port',
      },
      {
        type: 'env',
        service: 'user',
        variable: 'WALLET_URL',
        value: 'http://wallet:9999',
        description: 'Point user service to wrong wallet port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'gateway',
        variable: 'WALLET_URL',
        value: 'http://wallet:8103',
        description: 'Restore gateway wallet URL',
      },
      {
        type: 'env',
        service: 'user',
        variable: 'WALLET_URL',
        value: 'http://wallet:8103',
        description: 'Restore user service wallet URL',
      },
    ],
  },
  {
    id: 'gateway-routing-broken',
    name: 'Gateway Routing Broken',
    description: `All backend service URLs are misconfigured in the gateway. The gateway accepts requests
but cannot route them to any backend service, causing complete system failure from the user's perspective.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'gateway',
        variable: 'AUTH_URL',
        value: 'http://auth:9999',
        description: 'Break auth routing',
      },
      {
        type: 'env',
        service: 'gateway',
        variable: 'USER_URL',
        value: 'http://user:9999',
        description: 'Break user routing',
      },
      {
        type: 'env',
        service: 'gateway',
        variable: 'WALLET_URL',
        value: 'http://wallet:9999',
        description: 'Break wallet routing',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'gateway',
        variable: 'AUTH_URL',
        value: 'http://auth:8101',
        description: 'Restore auth routing',
      },
      {
        type: 'env',
        service: 'gateway',
        variable: 'USER_URL',
        value: 'http://user:8102',
        description: 'Restore user routing',
      },
      {
        type: 'env',
        service: 'gateway',
        variable: 'WALLET_URL',
        value: 'http://wallet:8103',
        description: 'Restore wallet routing',
      },
    ],
  },

  // ============ SUBTLE FAILURES ============
  {
    id: 'tracing-disabled',
    name: 'Tracing Disabled',
    description: `Distributed tracing is disabled across all services. The system functions normally
but observability is lost - Zipkin shows no traces, making debugging impossible.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'gateway',
        variable: 'TRACING',
        value: 'false',
        description: 'Disable tracing on gateway',
      },
      {
        type: 'env',
        service: 'auth',
        variable: 'TRACING',
        value: 'false',
        description: 'Disable tracing on auth',
      },
      {
        type: 'env',
        service: 'user',
        variable: 'TRACING',
        value: 'false',
        description: 'Disable tracing on user',
      },
      {
        type: 'env',
        service: 'wallet',
        variable: 'TRACING',
        value: 'false',
        description: 'Disable tracing on wallet',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'gateway',
        variable: 'TRACING',
        value: 'true',
        description: 'Enable tracing on gateway',
      },
      {
        type: 'env',
        service: 'auth',
        variable: 'TRACING',
        value: 'true',
        description: 'Enable tracing on auth',
      },
      {
        type: 'env',
        service: 'user',
        variable: 'TRACING',
        value: 'true',
        description: 'Enable tracing on user',
      },
      {
        type: 'env',
        service: 'wallet',
        variable: 'TRACING',
        value: 'true',
        description: 'Enable tracing on wallet',
      },
    ],
  },
  {
    id: 'zipkin-endpoint-wrong',
    name: 'Zipkin Endpoint Wrong',
    description: `All services have an incorrect Zipkin endpoint. Traces are sent to a non-existent
endpoint and lost. The system works but trace data disappears silently.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'gateway',
        variable: 'ZIPKIN_ENDPOINT',
        value: 'http://zipkin:9999/api/v2/spans',
        description: 'Point gateway to wrong Zipkin port',
      },
      {
        type: 'env',
        service: 'auth',
        variable: 'ZIPKIN_ENDPOINT',
        value: 'http://zipkin:9999/api/v2/spans',
        description: 'Point auth to wrong Zipkin port',
      },
      {
        type: 'env',
        service: 'user',
        variable: 'ZIPKIN_ENDPOINT',
        value: 'http://zipkin:9999/api/v2/spans',
        description: 'Point user to wrong Zipkin port',
      },
      {
        type: 'env',
        service: 'wallet',
        variable: 'ZIPKIN_ENDPOINT',
        value: 'http://zipkin:9999/api/v2/spans',
        description: 'Point wallet to wrong Zipkin port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'gateway',
        variable: 'ZIPKIN_ENDPOINT',
        value: 'http://zipkin:9411/api/v2/spans',
        description: 'Restore gateway Zipkin endpoint',
      },
      {
        type: 'env',
        service: 'auth',
        variable: 'ZIPKIN_ENDPOINT',
        value: 'http://zipkin:9411/api/v2/spans',
        description: 'Restore auth Zipkin endpoint',
      },
      {
        type: 'env',
        service: 'user',
        variable: 'ZIPKIN_ENDPOINT',
        value: 'http://zipkin:9411/api/v2/spans',
        description: 'Restore user Zipkin endpoint',
      },
      {
        type: 'env',
        service: 'wallet',
        variable: 'ZIPKIN_ENDPOINT',
        value: 'http://zipkin:9411/api/v2/spans',
        description: 'Restore wallet Zipkin endpoint',
      },
    ],
  },
  {
    id: 'wallet-auth-partial-failure',
    name: 'Wallet Auth Partial Failure',
    description: `Only the wallet service loses connection to auth. Balance checks and transfers fail
with auth errors, but login and user operations still work. Confusing partial failure.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'wallet',
        variable: 'AUTH_URL',
        value: 'http://auth:9999',
        description: 'Break wallet auth connection',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'wallet',
        variable: 'AUTH_URL',
        value: 'http://auth:8101',
        description: 'Restore wallet auth connection',
      },
    ],
  },
  {
    id: 'billing-callback-broken',
    name: 'Billing Callback Broken',
    description: `The billing callback URL is misconfigured. External billing integrations fail to
notify the system of successful payments. Top-ups appear stuck in pending state.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'gateway',
        variable: 'BILLING_URL',
        value: 'http://gateway:9999/billing/test',
        description: 'Break billing callback URL',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'gateway',
        variable: 'BILLING_URL',
        value: 'http://gateway:8100/billing/test',
        description: 'Restore billing callback URL',
      },
    ],
  },
];
