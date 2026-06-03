/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Bridge between a canonical {@link EntityKind} and the opaque
 * `FakeEntityType.id` string used by the "Manage entity types" table.
 *
 * Lives in the shared package so every consumer (Discover logs panel,
 * Streams "All entities" view, Streams "Manage entity types" table)
 * agrees on the same id when consulting the
 * {@link useEntityTypeEnabled} store. Otherwise a click in Discover
 * would check a different key than the wizard wrote, and the toggle
 * would silently do nothing.
 *
 * NB the streams_app `FAKE_ENTITY_TYPES` catalogue is the source of
 * truth for the actual id strings; we keep the small set we currently
 * have storyline rows for. New rows added to that catalogue need an
 * entry here too if they're meant to be reachable from a click path.
 */

import { entityTypeToKind, inferEntityKind, type EntityKind } from './kind_templates';

/**
 * Direct map of lowercased entity `.type` strings (as exposed by the
 * Streams entities dataset and the entity flyout) → `FakeEntityType.id`.
 *
 * Tried *before* the kind-based map so a Bare-metal host gates the
 * `bare-metal-host` row specifically (not `vm-host`), a K8s namespace
 * gates `k8s-namespace` (not `k8s-cluster`), etc. — i.e. so the
 * "Triggers flyout" toggle is honoured per Type column value, the
 * same string the Manage entity types table shows under its `Type`
 * column.
 *
 * Must stay in sync with the streams_app `FAKE_ENTITY_TYPES`
 * catalogue (the source of truth for these ids). Keys are kept
 * lowercased so callers can normalise once and match all cases.
 */
const TYPE_NAME_TO_ENTITY_TYPE_ID: Readonly<Record<string, string>> = {
  // Hosts
  'bare-metal': 'bare-metal-host',
  vm: 'vm-host',
  // Kubernetes
  'k8s cluster': 'k8s-cluster',
  'k8s node': 'k8s-node',
  'k8s namespace': 'k8s-namespace',
  'k8s pod': 'k8s-pod',
  'k8s deployment': 'k8s-deployment',
  'k8s container': 'k8s-container',
  // Databases
  postgres: 'postgres',
  // Services
  'apm service': 'apm-service',
  // Cloud
  'aws region': 'aws-region',
  'aws ec2 instance': 'aws-ec2',
  'aws lambda function': 'aws-lambda',
  'aws s3 bucket': 'aws-s3',
  // Middlewares
  kafka: 'kafka',
  rabbitmq: 'rabbitmq',
  // LLMs
  openai: 'openai',
  anthropic: 'anthropic',
};

/**
 * Last-resort kind → id map for callers that only have a name (no
 * `.type` field), e.g. Discover's logs panel. Hosts pick `bare-metal`
 * as the default because the two host rows are interchangeable from
 * a name-only lookup, and the user can always disable the other row
 * separately. Inferred-only kinds (`middleware`, `llm`) intentionally
 * have no entry — there's no single deterministic row for them.
 */
export const KIND_TO_ENTITY_TYPE_ID: Partial<Record<EntityKind, string>> = {
  service: 'apm-service',
  cluster: 'k8s-cluster',
  node: 'k8s-node',
  namespace: 'k8s-namespace',
  pod: 'k8s-pod',
  deployment: 'k8s-deployment',
  container: 'k8s-container',
  host: 'bare-metal-host',
  database: 'postgres',
};

/**
 * Resolve the entity-type id that gates the flyout trigger for a given
 * entity. Returns `undefined` when no curated mapping exists — callers
 * should treat that as "no gate", which {@link isEntityTypeEnabled}
 * already does (it returns `true` for `undefined`).
 *
 * Lookup order:
 *   1. Direct case-insensitive match on the `entityType` string
 *      against {@link TYPE_NAME_TO_ENTITY_TYPE_ID} — tightest
 *      possible link target, so e.g. `Bare-metal` gates
 *      `bare-metal-host` and not `vm-host`.
 *   2. Canonical kind derived from `entityType` via
 *      {@link entityTypeToKind}.
 *   3. Name-based heuristic via {@link inferEntityKind} (used by
 *      Discover, which only has the service-name string).
 */
export const resolveEntityTypeIdForName = (
  entityName: string,
  entityType?: string
): string | undefined => {
  if (entityType) {
    const direct = TYPE_NAME_TO_ENTITY_TYPE_ID[entityType.toLowerCase()];
    if (direct) return direct;
  }
  const kind = entityTypeToKind(entityType) ?? inferEntityKind(entityName);
  if (!kind) return undefined;
  return KIND_TO_ENTITY_TYPE_ID[kind];
};
