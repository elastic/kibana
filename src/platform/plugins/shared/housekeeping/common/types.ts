/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * What a finding asks for: fixing something that fails today, resolving something that stops
 * working in the next major version, reviewing a configuration that may cause trouble later, or
 * cleaning up something nothing uses.
 */
export type HousekeepingFindingKind = 'broken_reference' | 'deprecation' | 'risk' | 'unused';

/** Most urgent first: unused resources are only clutter. */
export const HOUSEKEEPING_FINDING_KINDS: HousekeepingFindingKind[] = [
  'broken_reference',
  'deprecation',
  'risk',
  'unused',
];

export const isFindingKind = (value: string): value is HousekeepingFindingKind =>
  HOUSEKEEPING_FINDING_KINDS.some((kind) => kind === value);

export interface HousekeepingResourceTypeInfo {
  label: string;
}

export interface HousekeepingResource {
  /** A resource type id, such as `ingest_pipeline`; providers register them. */
  type: string;
  id: string;
  /** Managed by Elastic, Fleet or the system; findings on it are not reported. */
  isManaged?: boolean;
  /** Where the owning plugin shows the resource, resolved with the share plugin. */
  locator?: { id: string; params: Record<string, string | number | boolean> };
}

/** A resource that points at another one, as listed in the `usedBy` evidence of a finding. */
export interface HousekeepingResourceUser {
  type: string;
  id: string;
  /** The setting or field that holds the reference, such as `index.default_pipeline`. */
  via: string;
}

export const isResourceUser = (value: unknown): value is HousekeepingResourceUser =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'string' &&
  'id' in value &&
  typeof value.id === 'string' &&
  'via' in value &&
  typeof value.via === 'string';

/** How urgent a finding is within its kind, such as a deprecation that blocks the upgrade. */
export type HousekeepingFindingSeverity = 'critical' | 'warning';

/** A resolution with its own UI, which the owning plugin registers with `registerFindingAction`. */
export interface HousekeepingFindingAction {
  id: string;
  params?: Record<string, unknown>;
}

/** A request that resolves a finding, for the user to review and run in Console. */
export interface HousekeepingFix {
  /** What the request does, and what to check before running it. */
  description: string;
  /** The request in Console syntax. */
  request: string;
}

export interface HousekeepingFinding {
  id: string;
  resource: HousekeepingResource;
  related: HousekeepingResource[];
  /** What this finding means, when it says more than the description of its group. */
  message?: string;
  severity?: HousekeepingFindingSeverity;
  /** Short facts shown next to the resource, such as the setting that holds a reference. */
  details?: string[];
  /** Only when the fix doesn't need judgement; Agent Builder helps with the rest. */
  fix?: HousekeepingFix;
  /** For fixes that need more than one request, such as reindexing with progress. */
  actions?: HousekeepingFindingAction[];
  evidence?: Record<string, unknown>;
}

/** Findings of one kind of problem, with everything the UI needs to render them. */
export interface HousekeepingFindingGroup {
  /** A check id, or `broken_reference:<type>` and `unused:<type>` for the reference graph. */
  id: string;
  kind: HousekeepingFindingKind;
  title: string;
  description?: string;
  findings: HousekeepingFinding[];
}

export interface HousekeepingSkippedCheck {
  checkId: string;
  checkTitle: string;
  reason: 'timeout' | 'error' | 'incomplete';
  message: string;
}

export interface HousekeepingFindingsResponse {
  /** The kinds that the providers and checks of the run can report, most urgent first. */
  kinds: HousekeepingFindingKind[];
  groups: HousekeepingFindingGroup[];
  summary: Record<HousekeepingFindingKind, number>;
  skipped: HousekeepingSkippedCheck[];
  resourceTypes: Record<string, HousekeepingResourceTypeInfo>;
}

/** Narrows findings to the ones that involve a resource type or a specific resource. */
export interface HousekeepingScope {
  resourceTypes?: string[];
  resourceId?: string;
}

export const isFindingInScope = (
  { resource, related }: HousekeepingFinding,
  { resourceTypes, resourceId }: HousekeepingScope = {}
) =>
  [resource, ...related].some(
    ({ type, id }) =>
      (!resourceTypes?.length || resourceTypes.includes(type)) && (!resourceId || resourceId === id)
  );
