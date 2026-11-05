/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * What a finding asks for: fixing something that fails today, reviewing a configuration that may
 * cause trouble later, or cleaning up something nothing uses.
 */
export type HousekeepingFindingKind = 'broken_reference' | 'risk' | 'unused';

/** Most urgent first: unused resources are only clutter. */
export const HOUSEKEEPING_FINDING_KINDS: HousekeepingFindingKind[] = [
  'broken_reference',
  'risk',
  'unused',
];

export const isFindingKind = (value: string): value is HousekeepingFindingKind =>
  HOUSEKEEPING_FINDING_KINDS.some((kind) => kind === value);

export interface HousekeepingResourceTypeInfo {
  label: string;
  iconType: string;
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
  /** Short facts shown next to the resource, such as the setting that holds a reference. */
  details?: string[];
  /** Only when the fix doesn't need judgement; Agent Builder helps with the rest. */
  fix?: HousekeepingFix;
  evidence?: Record<string, unknown>;
}

/** Findings of one kind of problem, with everything the UI needs to render them. */
export interface HousekeepingFindingGroup {
  /** A check id, or `broken_reference:<type>` and `unused:<type>` for the reference graph. */
  id: string;
  kind: HousekeepingFindingKind;
  title: string;
  description?: string;
  iconType: string;
  findings: HousekeepingFinding[];
}

export interface HousekeepingSkippedCheck {
  checkId: string;
  checkTitle: string;
  reason: 'timeout' | 'error' | 'incomplete';
  message: string;
}

export interface HousekeepingFindingsResponse {
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
