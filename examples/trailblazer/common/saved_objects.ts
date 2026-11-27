/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const SAVED_OBJECTS_PAGE_SIZE = 100;

/** Identifies a saved object; `space` is a space id such as `default`, as stored in the event log and alerts. */
export interface SavedObjectTarget {
  readonly type: string;
  readonly id: string;
  readonly space?: string;
}

export interface SavedObjectTypeSummary {
  readonly name: string;
  readonly displayName: string;
  readonly hidden: boolean;
  readonly namespaceType: string;
  readonly count: number;
}

export interface SavedObjectTypesResponse {
  readonly types: readonly SavedObjectTypeSummary[];
  readonly total: number;
}

export interface SavedObjectSummary {
  readonly type: string;
  readonly id: string;
  readonly title?: string;
  readonly spaces: readonly string[];
  readonly updatedAt?: string;
}

export interface SavedObjectsResponse {
  readonly total: number;
  readonly objects: readonly SavedObjectSummary[];
}

export interface SavedObjectReferenceSummary {
  readonly name: string;
  readonly type: string;
  readonly id: string;
  readonly title?: string;
  readonly missing: boolean;
  /** True when the reference was inferred from an attribute rather than the `references` array. */
  readonly implicit: boolean;
  readonly space?: string;
}

export type AssociationKind = 'event_log' | 'alerts';

/** A search over event log or alert documents that are associated with a saved object. */
export interface SavedObjectAssociation {
  readonly kind: AssociationKind;
  readonly label: string;
  readonly index: string;
  readonly query: string;
  readonly count?: number;
  readonly error?: string;
}

export interface SavedObjectDetailResponse {
  readonly object: SavedObjectSummary & {
    readonly raw: Record<string, unknown>;
    readonly attributes: Record<string, unknown>;
  };
  readonly references: readonly SavedObjectReferenceSummary[];
  readonly referencedBy: readonly SavedObjectSummary[];
  readonly referencedByTotal: number;
  readonly associations: readonly SavedObjectAssociation[];
}
