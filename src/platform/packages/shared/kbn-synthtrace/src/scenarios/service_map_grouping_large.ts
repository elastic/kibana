/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates APM data for testing the service map at scale: 90 services and 10
 * dependencies in a realistic topology (online store / bank style). Services
 * have roles (frontend, api-gateway, cart, checkout, payment, etc.); connections
 * are varied: F→C→Dep, A→G→H→Dep, frontend→product-catalog→elasticsearch, etc.
 *
 * Run with:
 *   node scripts/synthtrace service_map_grouping_large --from now-1h --to now --clean
 *
 * Optional scenarioOpts (JSON string):
 *   --scenarioOpts '{"numServices":90,"numDependencies":10}'
 */

import type { ApmFields, Instance } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { random, times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getRandomNameForIndex } from './helpers/random_names';

const DEFAULT_NUM_SERVICES = 90;
const DEFAULT_NUM_DEPENDENCIES = 10;

const AGENTS = ['java', 'nodejs', 'go', 'python', 'dotnet'] as const;
const ENVIRONMENTS = ['production', 'staging'] as const;

/** Dependency definitions: resource name + span type/subtype for service map */
const DEPENDENCY_TEMPLATES: Array<{
  resource: string;
  spanType: string;
  spanSubtype: string;
  spanName: string;
}> = [
  {
    resource: 'postgresql',
    spanType: 'db',
    spanSubtype: 'postgresql',
    spanName: 'SELECT * FROM items',
  },
  { resource: 'redis', spanType: 'db', spanSubtype: 'redis', spanName: 'GET cache:*' },
  {
    resource: 'elasticsearch',
    spanType: 'db',
    spanSubtype: 'elasticsearch',
    spanName: 'GET index-*/_search',
  },
  { resource: 'mongodb', spanType: 'db', spanSubtype: 'mongodb', spanName: 'find documents' },
  { resource: 'mysql', spanType: 'db', spanSubtype: 'mysql', spanName: 'SELECT * FROM orders' },
  {
    resource: 'kafka',
    spanType: 'messaging',
    spanSubtype: 'kafka',
    spanName: 'publish order.created',
  },
  {
    resource: 'rabbitmq',
    spanType: 'messaging',
    spanSubtype: 'rabbitmq',
    spanName: 'publish message',
  },
  { resource: 'grpc-backend', spanType: 'external', spanSubtype: 'grpc', spanName: 'Call GetUser' },
  {
    resource: 'http-gateway',
    spanType: 'external',
    spanSubtype: 'http',
    spanName: 'GET /api/upstream',
  },
  { resource: 'memcached', spanType: 'db', spanSubtype: 'memcached', spanName: 'GET key' },
];

/** Role ranges: [start, end] (inclusive) of service indices. Sum = 90. */
const ROLES: Array<{ name: string; start: number; end: number }> = [
  { name: 'frontend', start: 0, end: 9 },
  { name: 'api-gateway', start: 10, end: 18 },
  { name: 'cart', start: 19, end: 27 },
  { name: 'checkout', start: 28, end: 36 },
  { name: 'payment', start: 37, end: 45 },
  { name: 'product-catalog', start: 46, end: 54 },
  { name: 'recommendation', start: 55, end: 61 },
  { name: 'search', start: 62, end: 68 },
  { name: 'user', start: 69, end: 74 },
  { name: 'order', start: 75, end: 82 },
  { name: 'inventory', start: 83, end: 89 },
];

/** For each role, downstream: either another role (service→service) or a dep resource (service→dep). */
const DOWNSTREAM: Record<
  string,
  Array<{ type: 'service'; role: string } | { type: 'dep'; resource: string }>
> = {
  frontend: [
    { type: 'service', role: 'api-gateway' },
    { type: 'service', role: 'product-catalog' },
    { type: 'service', role: 'recommendation' },
    { type: 'service', role: 'search' },
  ],
  'api-gateway': [
    { type: 'service', role: 'cart' },
    { type: 'service', role: 'checkout' },
    { type: 'service', role: 'user' },
    { type: 'service', role: 'order' },
  ],
  cart: [{ type: 'dep', resource: 'redis' }],
  checkout: [
    { type: 'service', role: 'payment' },
    { type: 'service', role: 'order' },
    { type: 'service', role: 'cart' },
    { type: 'dep', resource: 'postgresql' },
  ],
  payment: [
    { type: 'dep', resource: 'postgresql' },
    { type: 'dep', resource: 'grpc-backend' },
  ],
  'product-catalog': [
    { type: 'dep', resource: 'elasticsearch' },
    { type: 'dep', resource: 'mongodb' },
  ],
  recommendation: [
    { type: 'dep', resource: 'mongodb' },
    { type: 'service', role: 'product-catalog' },
  ],
  search: [{ type: 'dep', resource: 'elasticsearch' }],
  user: [
    { type: 'dep', resource: 'postgresql' },
    { type: 'dep', resource: 'redis' },
  ],
  order: [
    { type: 'dep', resource: 'postgresql' },
    { type: 'dep', resource: 'kafka' },
  ],
  inventory: [
    { type: 'dep', resource: 'mysql' },
    { type: 'dep', resource: 'redis' },
  ],
};

const ENTRY_ROLES = ['frontend', 'api-gateway'];
const MAX_PATH_DEPTH = 5;

function getRoleForIndex(index: number): string {
  const r = ROLES.find((role) => index >= role.start && index <= role.end);
  return r?.name ?? 'frontend';
}

function pickRandomServiceInRole(roleName: string): number {
  const r = ROLES.find((role) => role.name === roleName);
  if (!r) return 0;
  return r.start + random(0, r.end - r.start);
}

function getDepIndex(resource: string, dependencies: typeof DEPENDENCY_TEMPLATES): number {
  const i = dependencies.findIndex((d) => d.resource === resource);
  return i >= 0 ? i : 0;
}

/** Random walk from entry role until we hit a dep or max depth. Returns path (service indices) and dep resource. */
function randomWalkPath(
  dependencies: typeof DEPENDENCY_TEMPLATES
): { path: number[]; depIdx: number } | null {
  const entryRole = ENTRY_ROLES[random(0, ENTRY_ROLES.length - 1)];
  const path: number[] = [pickRandomServiceInRole(entryRole)];
  let currentRole = entryRole;
  for (let depth = 0; depth < MAX_PATH_DEPTH; depth++) {
    const nexts = DOWNSTREAM[currentRole];
    if (!nexts?.length) return null;
    const next = nexts[random(0, nexts.length - 1)];
    if (next.type === 'dep') {
      return { path, depIdx: getDepIndex(next.resource, dependencies) };
    }
    const nextServiceIdx = pickRandomServiceInRole(next.role);
    path.push(nextServiceIdx);
    currentRole = next.role;
  }
  return null;
}

/** Build one dependency span (leaf of a trace) */
function depSpan(instance: Instance, dep: (typeof DEPENDENCY_TEMPLATES)[0], timestamp: number) {
  const duration = random(5, 200);
  const success = random(1, 10) > 1;
  const span = instance
    .span({
      spanName: dep.spanName,
      spanType: dep.spanType as 'db' | 'messaging' | 'external',
      spanSubtype: dep.spanSubtype,
    })
    .destination(dep.resource)
    .timestamp(timestamp)
    .duration(duration);
  return success ? span.success() : span.failure();
}

/** Build nested trace for path [s0, s1, ..., sN] → dep (sN calls the dependency). */
function buildTrace(
  path: number[],
  depIndex: number,
  instances: Instance[],
  serviceNames: string[],
  dependencies: typeof DEPENDENCY_TEMPLATES,
  timestamp: number
) {
  const dep = dependencies[depIndex];
  const baseOffset = timestamp + path.length * 5;
  const leafIdx = path[path.length - 1];
  const leafInstance = instances[leafIdx];
  const leafTx = leafInstance
    .transaction({
      transactionName: `GET /api/${getRoleForIndex(leafIdx)}/${random(1, 99)}`,
      transactionType: 'request',
    })
    .timestamp(baseOffset)
    .duration(random(50, 400))
    .success()
    .children(depSpan(leafInstance, dep, baseOffset + 10));

  let child = leafTx;
  for (let p = path.length - 2; p >= 0; p--) {
    const callerIdx = path[p];
    const calleeIdx = path[p + 1];
    const caller = instances[callerIdx];
    const calleeName = serviceNames[calleeIdx];
    const offset = baseOffset - (path.length - 1 - p) * 5;
    const spanDuration = random(30, 300);
    const span = caller
      .span({
        spanName: `GET ${calleeName}/api`,
        spanType: 'external',
        spanSubtype: 'http',
      })
      .destination(calleeName)
      .timestamp(offset)
      .duration(spanDuration)
      .success()
      .children(child);
    child = caller
      .transaction({
        transactionName: `GET /api/${getRoleForIndex(callerIdx)}-${random(1, 999)}`,
        transactionType: 'request',
      })
      .timestamp(offset)
      .duration(spanDuration + random(20, 150))
      .success()
      .children(span);
  }
  return child;
}

const scenario: Scenario<ApmFields> = async ({ logger, scenarioOpts = {} }) => {
  const numServices =
    (scenarioOpts as { numServices?: number }).numServices ?? DEFAULT_NUM_SERVICES;
  const numDependencies =
    (scenarioOpts as { numDependencies?: number }).numDependencies ?? DEFAULT_NUM_DEPENDENCIES;

  const dependencies = DEPENDENCY_TEMPLATES.slice(0, numDependencies);

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const instances: Instance[] = [];
      const serviceNames: string[] = [];
      times(numServices).forEach((index) => {
        const agent = AGENTS[index % AGENTS.length];
        const environment = ENVIRONMENTS[index % ENVIRONMENTS.length];
        const role = getRoleForIndex(index);
        const name = `${role}-${getRandomNameForIndex(index)}-${index}`;
        serviceNames.push(name);
        instances.push(
          apm
            .service({ name, environment, agentName: agent })
            .instance(`${name}-instance`)
            .defaults({ 'service.language.name': agent })
        );
      });

      const pathTemplates: { path: number[]; depIdx: number }[] = [];
      for (let i = 0; i < 150; i++) {
        const result = randomWalkPath(dependencies);
        if (result && result.path.length >= 1) pathTemplates.push(result);
      }

      const throughput = 50;
      return withClient(
        apmEsClient,
        logger.perf('generating_apm_events', () =>
          range.ratePerMinute(throughput).generator((timestamp) => {
            const template = pathTemplates[random(0, pathTemplates.length - 1)];
            return buildTrace(
              template.path,
              template.depIdx,
              instances,
              serviceNames,
              dependencies,
              timestamp
            );
          })
        )
      );
    },
  };
};

export default scenario;
