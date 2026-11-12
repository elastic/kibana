/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Why a failure is attributed to infrastructure rather than to the test or Kibana. */
export interface InfraFailureReason {
  category: 'auth' | 'role' | 'connection' | 'cdn' | 'network' | 'es_timeout';
  message: string;
}

type TestRunner = 'scout' | 'ftr';

/** `error` is the test error/stack trace, `consoleErrors` the captured browser console errors. */
type InfraFailureSource = 'error' | 'consoleErrors';

interface InfraFailureRule extends InfraFailureReason {
  /** A rule matches when any of its substrings appears in any of these. */
  sources: readonly InfraFailureSource[];
  /**
   * The runners the rule applies to. `cloud` limits it to Cloud targets, for signals that on a
   * local run may be a Kibana bug caused by the change under test.
   */
  appliesTo: Partial<Record<TestRunner, 'cloud' | 'always'>>;
  substrings: readonly string[];
}

// Failures matching a rule are infrastructure issues rather than real test failures: no GitHub
// issue is filed, and the rule's message is shown in the failure report instead. First match wins.
const INFRA_FAILURE_RULES: readonly InfraFailureRule[] = [
  {
    category: 'auth',
    sources: ['error'],
    appliesTo: { scout: 'cloud', ftr: 'cloud' },
    substrings: [
      'Failed to parse SAML response value',
      'SAML callback failed',
      'Failed to create the new cloud session',
    ],
    message:
      'Authentication on Elastic Cloud failed. Likely an issue with the identity provider or the test accounts, not with the test.',
  },
  {
    category: 'role',
    sources: ['error'],
    appliesTo: { scout: 'cloud', ftr: 'cloud' },
    substrings: ['role is not defined'],
    message:
      'The role used by the test has no user configured for the Elastic Cloud project. Contact the Kibana DX team to add the missing role.',
  },
  {
    category: 'connection',
    sources: ['error'],
    // Locally FTR starts Kibana itself, so a refused connection usually means it crashed
    appliesTo: { scout: 'always', ftr: 'cloud' },
    substrings: ['ECONNREFUSED'],
    message:
      'The test runner could not connect to the target host. Check that the deployment was reachable during the run.',
  },
  {
    category: 'es_timeout',
    sources: ['error'],
    appliesTo: { ftr: 'cloud' },
    substrings: ['TimeoutError: Request timed out'],
    message:
      'A request from the test runner to Elasticsearch timed out on Elastic Cloud. Likely a slow or overloaded project; check the project health before investigating the test.',
  },
  {
    category: 'cdn',
    sources: ['consoleErrors'],
    appliesTo: { scout: 'cloud' },
    // 'Kibana bootstrap failed' is logged by the bootstrap template in @kbn/core-rendering-server-internal.
    // '__kbnSharedDeps__ is not defined' means the bundle loaded but only in part.
    substrings: [
      'ChunkLoadError',
      'Kibana bootstrap failed: could not load',
      'Failed to load plugins: ReferenceError: __kbnSharedDeps__ is not defined',
    ],
    message:
      'Kibana bundles failed to load from the CDN, so the app never finished loading. If this keeps happening, contact Kibana Core (@elastic/kibana-core) about a possible CDN issue.',
  },
  {
    category: 'network',
    // Chromium reports these on the request that failed, so they surface either in the browser
    // console or, when the failing request is the navigation itself, in the page.goto() error.
    sources: ['error', 'consoleErrors'],
    appliesTo: { scout: 'cloud' },
    substrings: [
      'net::ERR_ADDRESS_UNREACHABLE',
      'net::ERR_CONNECTION_CLOSED',
      'net::ERR_CONNECTION_RESET',
      'net::ERR_CONNECTION_REFUSED',
      'net::ERR_EMPTY_RESPONSE',
      'net::ERR_INTERNET_DISCONNECTED',
      'net::ERR_NAME_NOT_RESOLVED',
      'net::ERR_QUIC_PROTOCOL_ERROR',
    ],
    message:
      'The Cloud deployment dropped or refused browser connections. Likely a bad deployment or a proxy/load balancer issue; check the project health before investigating the test.',
  },
];

export const getInfraReason = ({
  runner,
  target,
  failure,
  consoleErrors = '',
}: {
  runner: TestRunner;
  target: string | undefined;
  failure: string;
  consoleErrors?: string;
}): InfraFailureReason | undefined => {
  const isCloud = !!target?.startsWith('cloud-');

  const rule = INFRA_FAILURE_RULES.find(({ sources, appliesTo, substrings }) => {
    const scope = appliesTo[runner];
    if (!scope || (scope === 'cloud' && !isCloud)) {
      return false;
    }
    return sources.some((source) => {
      const text = source === 'error' ? failure : consoleErrors;
      return substrings.some((substring) => text.includes(substring));
    });
  });

  return rule ? { category: rule.category, message: rule.message } : undefined;
};
