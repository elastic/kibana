/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Per-entity display-name resolution for the entity-centric lab.
 *
 * The wizard exposes a per-entity-type `displayField` choice (e.g.
 * `kubernetes.pod.uid` vs `kubernetes.pod.name`). At render time we
 * need to translate that into the actual string shown to the user
 * wherever an entity appears as text — flyout title, list rows,
 * dependency rows, the Discover logs panel, topology nodes, etc.
 *
 * Since the demo entities are opaque strings (no underlying ES
 * document with real field paths), we synthesise plausible field
 * values deterministically from the entity name:
 *   - The `*.name` family of fields always returns the entity name
 *     verbatim — that's the implicit contract the seed data already
 *     follows ("payments-pod-7f9b2" really IS the pod name).
 *   - Stable secondary fields (UIDs, ARNs, ids, environments,
 *     namespaces, regions, …) are derived via a small polynomial hash
 *     of the entity name so the same name always maps to the same
 *     value, both within a session and across reloads.
 *
 * The hook + sync helper are framework-agnostic — they don't depend on
 * any plugin runtime, only on the `entity_display_config` store and
 * the `kind_templates` inference utilities exposed by this package.
 */

import { useSyncExternalStore } from 'react';
import { getEntityDisplayConfig, subscribeEntityDisplayConfig } from './entity_display_config';
import { resolveEntityTypeIdForName } from './entity_type_id_mapping';
import { entityTypeToKind, inferEntityKind, type EntityKind } from './kind_templates';

// ---------------------------------------------------------------------------
// Deterministic mock value generation
// ---------------------------------------------------------------------------

/**
 * Polynomial multiplicative hash, expressed in pure arithmetic so we
 * don't need bitwise ops (and the `no-bitwise` lint stays clean).
 * Deterministic and well-distributed enough for picking stable values
 * out of small lookup tables — no crypto property required, we just
 * need "same input always yields same output across sessions and
 * across plugin bundles".
 *
 * The modulus is the largest 31-bit prime (Mersenne 2^31 - 1) so every
 * intermediate stays within `Number`'s safe-integer range. The
 * multiplier 31 is the classic Java `String.hashCode` constant — gives
 * reasonable spread across the catalogue sizes we pull from here.
 */
const stableHash = (input: string): number => {
  const MOD = 0x7fffffff;
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % MOD;
  }
  return hash;
};

const pickFromCatalogue = (
  entityName: string,
  salt: string,
  catalogue: readonly string[]
): string => catalogue[stableHash(`${salt}::${entityName}`) % catalogue.length];

/**
 * Render a stable hex segment of the requested length from the entity
 * name and a salt — used to mint plausible UIDs / instance ids / ARNs
 * without ever colliding on the same source name.
 *
 * Each pass of `stableHash` yields ~8 hex chars; we walk the hash with
 * incremental salts until we have enough entropy to fill the requested
 * length, so longer segments stay stable + deterministic instead of
 * repeating.
 */
const hexSegment = (entityName: string, salt: string, length: number): string => {
  let acc = '';
  let round = 0;
  while (acc.length < length) {
    const roundSalt = round === 0 ? salt : `${salt}::r${round}`;
    acc += stableHash(`${roundSalt}::${entityName}`).toString(16).padStart(8, '0');
    round += 1;
  }
  return acc.slice(0, length);
};

const NAMESPACE_CATALOGUE: readonly string[] = [
  'payments',
  'checkout',
  'orders',
  'fraud',
  'merchant',
  'platform',
  'risk',
  'settlement',
];

const ENVIRONMENT_CATALOGUE: readonly string[] = ['production', 'staging', 'qa', 'dev'];

const REGION_CATALOGUE: readonly string[] = [
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
];

/**
 * If the entity name starts with a known namespace word (e.g. the seed
 * data uses `payments-…`, `checkout-…`), surface that prefix as the
 * namespace value. Falls back to a deterministic pick from the
 * catalogue otherwise so every entity has a plausible namespace.
 */
const inferNamespace = (entityName: string): string => {
  const lower = entityName.toLowerCase();
  for (const candidate of NAMESPACE_CATALOGUE) {
    if (lower.startsWith(`${candidate}-`) || lower === candidate) return candidate;
  }
  return pickFromCatalogue(entityName, 'namespace', NAMESPACE_CATALOGUE);
};

/**
 * Synthesise a plausible value for `fieldPath` on the entity named
 * `entityName` of the given `kind`. Returns `undefined` when no
 * synthesis rule matches — callers should fall back to the entity name
 * verbatim (the safest "always renders" default).
 *
 * The rules favour patterns the wizard's identifier dropdown can
 * actually surface — see {@link IDENTIFIER_FIELDS_BY_DATA_STREAM} in
 * `general_step.tsx` — so toggling between any two catalogue options
 * shows a visible difference in the UI.
 */
export const resolveEntityFieldValue = (
  entityName: string,
  fieldPath: string,
  kind: EntityKind | undefined
): string | undefined => {
  if (!fieldPath) return undefined;
  const path = fieldPath.trim();
  if (!path) return undefined;

  // Any `*.name` family field returns the entity name verbatim. The
  // seed data uses the entity name AS the underlying name field, so
  // this preserves the default rendering when the wizard hasn't been
  // touched yet (or the user picked the "natural" name field).
  if (path.endsWith('.name') || path === 'name') return entityName;

  // Per-kind specialised paths first so the demo has tight, plausible
  // values; the generic fallthrough at the bottom catches anything we
  // haven't explicitly modelled.
  switch (path) {
    // Service / APM
    case 'service.environment':
      return pickFromCatalogue(entityName, 'service.env', ENVIRONMENT_CATALOGUE);
    case 'agent.name':
      return pickFromCatalogue(entityName, 'agent', ['nodejs', 'java', 'python', 'go']);

    // Hosts
    case 'host.hostname':
      return `${entityName}.internal`;
    case 'container.id':
      return hexSegment(entityName, 'container.id', 12);

    // Kubernetes — cluster
    case 'cluster.name':
    case 'orchestrator.cluster.name':
      return entityName;

    // Kubernetes — node
    case 'kubernetes.node.uid':
      return `node-uid-${hexSegment(entityName, 'k8s.node.uid', 8)}`;

    // Kubernetes — pod
    case 'kubernetes.pod.uid':
      return `pod-uid-${hexSegment(entityName, 'k8s.pod.uid', 8)}`;
    case 'kubernetes.namespace':
      return inferNamespace(entityName);
    case 'kubernetes.deployment.name':
      // Strip the trailing pod-hash suffix to get a deployment-shaped
      // name, e.g. `payments-pod-7f9b2` -> `payments-pod`.
      return entityName.replace(/-[0-9a-f]{4,12}$/i, '') || entityName;

    // AWS — EC2
    case 'aws.ec2.instance.id':
    case 'cloud.instance.id':
      return `i-${hexSegment(entityName, 'aws.ec2', 17)}`;

    // AWS — Lambda
    case 'aws.lambda.function_name':
      return entityName;
    case 'aws.lambda.arn':
      return `arn:aws:lambda:${pickFromCatalogue(
        entityName,
        'aws.lambda.region',
        REGION_CATALOGUE
      )}:${hexSegment(entityName, 'aws.lambda.acct', 12)}:function:${entityName}`;

    // AWS — S3
    case 'aws.s3.bucket.name':
      return entityName;
    case 'aws.s3.bucket.arn':
      return `arn:aws:s3:::${entityName}`;

    // Cloud
    case 'cloud.account.id':
      return hexSegment(entityName, 'cloud.account', 12);
    case 'cloud.region':
      return pickFromCatalogue(entityName, 'cloud.region', REGION_CATALOGUE);

    default:
      break;
  }

  // Generic fallthrough: any unmodelled `*.id` or `*.uid` field gets a
  // hash-derived id with a kind-shaped prefix (`svc-…`, `pod-…`, etc.)
  // so the user still sees a visible diff when toggling between the
  // configured display field and the entity name.
  if (path.endsWith('.id') || path.endsWith('.uid')) {
    const prefix = kind ? kind.slice(0, 3) : 'ent';
    return `${prefix}-${hexSegment(entityName, path, 10)}`;
  }
  return undefined;
};

// ---------------------------------------------------------------------------
// Display-name resolver
// ---------------------------------------------------------------------------

/**
 * Resolve what to show the user for an entity, taking the wizard's
 * per-type `displayField` choice into account.
 *
 * Returns the entity name verbatim when:
 *   - the entity can't be mapped to a configurable type (no gate)
 *   - no display config has been persisted for that type
 *   - the configured display field has no synthesisable value
 *
 * Otherwise returns the synthesised field value (e.g. `pod-uid-…`,
 * `arn:aws:lambda:…`, an environment string). The output is always a
 * non-empty string suitable for direct rendering.
 */
export const resolveEntityDisplayName = (entityName: string, entityType?: string): string => {
  const entityTypeId = resolveEntityTypeIdForName(entityName, entityType);
  const config = getEntityDisplayConfig(entityTypeId);
  if (!config) return entityName;
  const displayField = config.displayField.trim();
  if (displayField.length === 0) return entityName;
  const kind = entityTypeToKind(entityType) ?? inferEntityKind(entityName);
  const value = resolveEntityFieldValue(entityName, displayField, kind);
  return value ?? entityName;
};

/**
 * React hook variant of {@link resolveEntityDisplayName}. Re-renders
 * the caller whenever the entity-display-config store changes — so a
 * wizard save instantly re-labels every visible entity tied to that
 * type, including in-flight flyout titles, list rows, dependency rows
 * and Discover logs.
 */
export const useEntityDisplayName = (entityName: string, entityType?: string): string =>
  useSyncExternalStore(
    subscribeEntityDisplayConfig,
    () => resolveEntityDisplayName(entityName, entityType),
    () => entityName
  );
