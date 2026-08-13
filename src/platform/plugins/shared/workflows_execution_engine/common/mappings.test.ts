/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import {
  WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
} from './mappings';

// The workflow index mappings are read by the engine, the inbox
// provider, telemetry, and any cross-workflow listing. Pinning them
// at the property-shape level here turns accidental schema drift
// (e.g. flipping `dynamic: false` off, retyping a keyword as text,
// or unintentionally dropping a core lifecycle field) into a clear
// test failure rather than a silent empty-result query in production.

describe('WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS', () => {
  it('keeps `dynamic: false` so unmapped step-doc properties are never auto-indexed', () => {
    // HITL response payloads can carry arbitrary user-shaped JSON in
    // `output` / `state`. Explicit mode keeps ES from indexing those
    // keys dynamically.
    expect(WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS.dynamic).toBe(false);
  });

  it('exposes `stepType` as a top-level keyword for cross-workflow term filters', () => {
    // Cross-workflow listings issue `term: { stepType: '<type>' }`
    // against this index. A `text` mapping or a sub-property would
    // break that — pin field type and position.
    const stepType = WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS.properties?.stepType;
    expect(stepType).toEqual({ type: 'keyword' });
  });

  it('nests the HITL audit envelope under `hitl` with the documented field types', () => {
    // The audit fields are namespaced under `hitl` rather than living
    // at the top level so the step schema stays generic — only
    // HITL-aware steps populate them. Pinning the nested types makes
    // the contract explicit for downstream readers (inbox query
    // service, mapper) and guards against a future "promote one of
    // these to top level" refactor that would silently break queries.
    const hitl = WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS.properties?.hitl as
      | { type?: string; properties: Record<string, { type: string }> }
      | undefined;
    expect(hitl).toBeDefined();
    expect(hitl?.type).toBe('object');
    expect(hitl?.properties).toEqual({
      respondedBy: { type: 'keyword' },
      respondedAt: { type: 'date' },
      channel: { type: 'keyword' },
    });
  });

  it('keeps the existing core lifecycle fields indexed', () => {
    // Regression guard for the existing schema. Update these
    // expectations deliberately when a core field's type or presence
    // is intentionally changed.
    const properties = WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS.properties ?? {};
    expect(properties.spaceId).toEqual({ type: 'keyword' });
    expect(properties.id).toEqual({ type: 'keyword' });
    expect(properties.stepId).toEqual({ type: 'keyword' });
    expect(properties.workflowRunId).toEqual({ type: 'keyword' });
    expect(properties.workflowId).toEqual({ type: 'keyword' });
    expect(properties.status).toEqual({ type: 'keyword' });
    expect(properties.isTestRun).toEqual({ type: 'boolean' });
    expect(properties.startedAt).toEqual({ type: 'date' });
    expect(properties.finishedAt).toEqual({ type: 'date' });
    expect(properties.duration).toEqual({ type: 'long' });
  });

  it('indexes token usage fields, including cached token counts', () => {
    const properties = WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS.properties ?? {};
    expect(properties.usage).toEqual({
      type: 'object',
      properties: {
        inputTokens: { type: 'long' },
        outputTokens: { type: 'long' },
        cachedTokens: { type: 'long' },
        totalTokens: { type: 'long' },
      },
    });
  });

  it('contains `managed` as a boolean — security contract with KibanaWorkflowsImplicitPrivilegesProvider', () => {
    // The DLS grant 1 uses `must_not: term managed:true` on BOTH indices. A user restricted from
    // managed executions must also be restricted from the associated step rows (which carry
    // hitl.respondedBy). Removing this field is a SECURITY REGRESSION.
    const properties = WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS.properties ?? {};
    expect(properties.managed).toEqual({ type: 'boolean' });
  });
});

// ---- Cross-repo FLS allowlist sync guard ----
//
// KibanaWorkflowsImplicitPrivilegesProvider (Elasticsearch repo) declares a GRANTED_FIELDS
// constant listing every mapped field that ordinary users may read.  Object-typed fields use the
// `.*` form because FieldPermissions builds the automaton without implicit subfield expansion and
// FieldSubsetReader drops the whole object when the `.`-step fails.
//
// This test derives the expected allowlist from the TypeScript mappings and asserts it matches the
// Java constant exactly.  A new object-typed field added without the `.*` suffix would silently
// vanish from `_source` in production; this test catches it at review time instead.

function deriveEsAllowlistEntry(name: string, prop: MappingProperty): string | null {
  if ('enabled' in prop && prop.enabled === false) {
    // e.g. workflowDefinition — deliberately excluded from the allowlist
    return null;
  }
  if ('properties' in prop && prop.properties) {
    return `${name}.*`;
  }
  if ('type' in prop && (prop.type === 'object' || prop.type === 'nested')) {
    return `${name}.*`;
  }
  return name;
}

function deriveAllowlist(mappings: typeof WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS): string[] {
  const properties = mappings.properties ?? {};
  return Object.entries(properties)
    .map(([name, prop]) => deriveEsAllowlistEntry(name, prop as MappingProperty))
    .filter((entry): entry is string => entry !== null)
    .sort();
}

describe('ES FLS allowlist cross-repo sync', () => {
  it('derives the same allowlist from executions mappings as GRANTED_FIELDS in KibanaWorkflowsImplicitPrivilegesProvider', () => {
    // Mirror of GRANTED_FIELDS in KibanaWorkflowsImplicitPrivilegesProvider.java.
    // Update both when adding or removing mapped fields.
    const javaGrantedFields = [
      'spaceId',
      'id',
      'workflowId',
      'managed',
      'managedBy',
      'originManagedWorkflowId',
      'managedVersion',
      'status',
      'createdAt',
      'isTestRun',
      'stepId',
      'createdBy',
      'executedBy',
      'startedAt',
      'finishedAt',
      'duration',
      'triggeredBy',
      'eventChainDepth',
      'eventChainVisitedWorkflowIds',
      'dispatchEventId',
      'concurrencyGroupKey',
      'version',
      'usage.*',
      'stepUsage.*',
    ].sort();

    const derived = deriveAllowlist(WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS);
    expect(derived).toEqual(javaGrantedFields);
  });

  it('derives the same allowlist from step-executions mappings as GRANTED_FIELDS in KibanaWorkflowsImplicitPrivilegesProvider', () => {
    const javaGrantedFields = [
      'spaceId',
      'id',
      'stepId',
      'managed',
      'stepType',
      'workflowRunId',
      'workflowId',
      'status',
      'isTestRun',
      'startedAt',
      'finishedAt',
      'duration',
      'usage.*',
      'hitl.*',
    ].sort();

    const derived = deriveAllowlist(WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS);
    expect(derived).toEqual(javaGrantedFields);
  });
});

describe('WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS', () => {
  it('preserves `dynamic: false` and the existing core fields', () => {
    // Workflow-level mapping is documented separately from
    // `step-executions`. Pinning the shape here catches incidental
    // edits that would otherwise pass through this file's review.
    expect(WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS.dynamic).toBe(false);
    const properties = WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS.properties ?? {};
    expect(properties.spaceId).toEqual({ type: 'keyword' });
    expect(properties.workflowId).toEqual({ type: 'keyword' });
    expect(properties.status).toEqual({ type: 'keyword' });
    expect(properties.createdBy).toEqual({ type: 'keyword' });
    expect(properties.executedBy).toEqual({ type: 'keyword' });
    expect(properties.triggeredBy).toEqual({ type: 'keyword' });
    expect(properties.workflowDefinition).toEqual({ type: 'object', enabled: false });
    expect(properties.version).toEqual({ type: 'long' });
  });

  it('contains `managed` as a boolean — security contract with KibanaWorkflowsImplicitPrivilegesProvider', () => {
    // The DLS grant 1 uses `must_not: term managed:true`. Removing this field is a SECURITY
    // REGRESSION: users holding only readExecution would silently see managed executions.
    // Changing the type (e.g. to keyword) would silently break the term filter.
    const properties = WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS.properties ?? {};
    expect(properties.managed).toEqual({ type: 'boolean' });
  });

  it('does not carry an `hitl` envelope — HITL audit lives on the step doc', () => {
    // A workflow can host multiple HITL steps; placing the audit on
    // the step row keeps a distinct record per step instead of
    // conflating them into a single workflow-level entry. This test
    // pins that decision so a future contributor doesn't accidentally
    // duplicate the envelope here.
    const properties = WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS.properties ?? {};
    expect(properties.hitl).toBeUndefined();
  });

  it('indexes aggregate and per-step token usage fields', () => {
    const properties = WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS.properties ?? {};
    expect(properties.usage).toEqual({
      type: 'object',
      properties: {
        inputTokens: { type: 'long' },
        outputTokens: { type: 'long' },
        cachedTokens: { type: 'long' },
        totalTokens: { type: 'long' },
      },
    });
    expect(properties.stepUsage).toEqual({
      type: 'nested',
      properties: {
        stepId: { type: 'keyword' },
        connectorId: { type: 'keyword' },
        inputTokens: { type: 'long' },
        outputTokens: { type: 'long' },
        cachedTokens: { type: 'long' },
        totalTokens: { type: 'long' },
      },
    });
  });
});
