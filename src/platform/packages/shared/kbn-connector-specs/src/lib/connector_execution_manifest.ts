/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'node:crypto';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../connector_spec';
import * as authTypeSpecs from '../all_auth_types';
import { generateSecretsSchemaFromSpec } from './generate_secrets_schema_from_spec';
import { getSchemaForAuthType } from './get_schema_for_auth_type';

export const MANIFEST_SCHEMA_VERSION = '1' as const;

export interface ConnectorManifestEntry {
  id: string;
  /**
   * Feature IDs the connector advertises. Kept outside the execution fingerprint
   * so a PR that only adds features does not change the fingerprint.
   */
  supportedFeatureIds: string[];
  /**
   * 64-character lowercase hex SHA-256 fingerprint of the connector's execution
   * surface (validation schemas, execution properties, and implementation sources).
   * Does NOT include supportedFeatureIds.
   */
  executionFingerprint: string;
}

export interface ConnectorExecutionManifest {
  schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  /** Sorted by connector id for stable diffs. */
  connectors: ConnectorManifestEntry[];
}

/**
 * Serialize a value to a deterministic JSON string with sorted object keys.
 * Used to ensure the fingerprint is stable regardless of property insertion order.
 */
export function sortedStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(sortedStringify).join(',') + ']';
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const pairs = keys.map((k) => JSON.stringify(k) + ':' + sortedStringify(record[k]));
  return '{' + pairs.join(',') + '}';
}

// ponytail: 'any' maps transforms (e.g. z.ipv4()) to {} rather than throwing;
// transforms have no JSON Schema equivalent so {} is the correct fallback.
const toJson = (schema: z.ZodType) => z.toJSONSchema(schema, { unrepresentable: 'any' });

const functionSource = (fn: unknown): string | null =>
  typeof fn === 'function' ? Function.prototype.toString.call(fn) : null;

const toFingerprintValue = (value: unknown): unknown => {
  if (typeof value === 'function') {
    return functionSource(value);
  }
  if (Array.isArray(value)) {
    return value.map(toFingerprintValue);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, toFingerprintValue(nestedValue)])
    );
  }
  return value;
};

/**
 * Returns the execution surface object for a single connector.
 * This is the input used to compute the execution fingerprint — it does NOT
 * contain supportedFeatureIds so that feature-only PRs leave the fingerprint
 * unchanged.
 *
 * The surface includes:
 *  - Config + secrets/auth JSON Schema (all auth variants, incl. PFX/EARS)
 *  - Auth defaults, headers, modes, and implementation sources
 *  - Per-action schemas, execution properties, and handler source
 *  - Synthetic test action, policies, URL validation, and transformations
 */
export function buildExecutionSurface(spec: ConnectorSpec): Record<string, unknown> {
  const configSchema = (spec.schema ?? z.object({})).extend({
    authType: z.string().optional(),
  });
  const secretsSchema = generateSecretsSchemaFromSpec(spec.auth, {
    isPfxEnabled: true,
    isEarsEnabled: true,
    isEarsExperimentalEnabled: true,
  });

  const auth = (spec.auth?.types ?? []).map((authTypeDef) => {
    const { id, schema } = getSchemaForAuthType(authTypeDef);
    const implementation = Object.values(authTypeSpecs).find((candidate) => candidate.id === id);
    return {
      definition: toFingerprintValue(authTypeDef),
      id,
      schema: toJson(schema),
      authMode: implementation?.authMode ?? 'shared',
      configureSource: functionSource(implementation?.configure),
      normalizeSchemaSource: functionSource(implementation?.normalizeSchema),
    };
  });

  const actions: Record<string, unknown> = {};
  for (const [name, action] of Object.entries(spec.actions).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const actionEntry: Record<string, unknown> = {
      input: toJson(action.input),
      isTool: action.isTool ?? false,
      actionGroup: action.actionGroup ?? null,
      supportsStreaming: action.supportsStreaming ?? false,
      responseSizeHeader: action.responseSizeHeader ?? 'content-length',
      handlerSource: functionSource(action.handler),
    };
    if (action.output) {
      actionEntry.output = toJson(action.output);
    }
    if (action.error) {
      actionEntry.error = toJson(action.error);
    }
    actions[name] = actionEntry;
  }

  if (spec.test?.enabled) {
    actions._test = {
      input: toJson(z.unknown().optional()),
      isTool: false,
      actionGroup: null,
      supportsStreaming: false,
      responseSizeHeader: 'content-length',
      handlerSource: functionSource(spec.test.handler),
    };
  }

  return {
    id: spec.metadata.id,
    configSchema: toJson(configSchema),
    secretsSchema: toJson(secretsSchema),
    auth,
    authHeaders: toFingerprintValue(spec.auth?.headers ?? {}),
    actions,
    validateUrls: toFingerprintValue(spec.validateUrls ?? {}),
    policies: toFingerprintValue(spec.policies ?? {}),
    transformations: toFingerprintValue(spec.transformations ?? {}),
  };
}

/**
 * Compute a 64-character lowercase hex SHA-256 fingerprint of an execution surface.
 * This file is Node-only (not exported from the package's browser entry point),
 * so it uses Node's built-in crypto module for reliable cross-environment behavior.
 */
export function computeFingerprint(surface: Record<string, unknown>): string {
  return createHash('sha256').update(sortedStringify(surface)).digest('hex');
}

/**
 * Build the full connector execution manifest from a list of specs.
 * The result is deterministic: connectors are sorted by id, and every
 * sub-object is serialized with sorted keys.
 */
export function buildConnectorManifest(specs: ConnectorSpec[]): ConnectorExecutionManifest {
  const connectors = [...specs]
    .sort((a, b) => a.metadata.id.localeCompare(b.metadata.id))
    .map((spec) => ({
      id: spec.metadata.id,
      supportedFeatureIds: [...spec.metadata.supportedFeatureIds].sort(),
      executionFingerprint: computeFingerprint(buildExecutionSurface(spec)),
    }));
  return { schemaVersion: MANIFEST_SCHEMA_VERSION, connectors };
}
