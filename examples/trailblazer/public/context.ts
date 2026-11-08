/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldSummary, FieldsResponse, IndexKind, SearchHit } from '../common';
import { NUMERIC_FIELD_TYPES } from '../common';
import type { SavedObjectTarget, SavedObjectTypeSummary } from '../common/saved_objects';
import type { TrailblazerApi } from './api';
import type { DiscoverLocator } from './discover';
import { h } from './dom';
import type { Preferences } from './preferences';
import type { SearchState } from './query';
import { styles, typeBadgeColor, typeBadgeLabel } from './styles';
import type { Pane, Trail } from './trail';

export interface IndexInfo {
  readonly fields: readonly FieldSummary[];
  readonly fieldsByName: ReadonlyMap<string, FieldSummary>;
  readonly timeField?: string;
}

export interface DocumentPaneArgs {
  readonly search: SearchState;
  readonly info: IndexInfo;
  readonly hit: SearchHit;
}

export interface FieldPaneArgs {
  readonly search: SearchState;
  readonly info: IndexInfo;
  readonly field: FieldSummary;
  readonly sampleHits: readonly SearchHit[];
}

/** Shared services and pane factories; panes open each other through this to avoid import cycles. */
export interface TrailContext {
  readonly api: TrailblazerApi;
  readonly trail: Trail;
  readonly preferences: Preferences;
  readonly discover?: DiscoverLocator;
  openIndexList(parent: Pane, kind: IndexKind): Pane;
  openIndex(parent: Pane, search: SearchState): Pane;
  openDocument(parent: Pane, args: DocumentPaneArgs): Pane;
  openField(parent: Pane, args: FieldPaneArgs): Pane;
  openSavedObjectTypes(parent: Pane): Pane;
  openSavedObjects(parent: Pane, type: SavedObjectTypeSummary): Pane;
  openSavedObject(parent: Pane, target: SavedObjectTarget): Pane;
}

export function toIndexInfo({ fields, timeField }: FieldsResponse): IndexInfo {
  return {
    fields,
    fieldsByName: new Map(fields.map((field) => [field.name, field])),
    timeField,
  };
}

/** A small badge with a short text label, such as an arrow or kind abbreviation. */
export function textBadge(text: string, title: string, color?: string): HTMLElement {
  const badge = h('span', { className: styles.badge, text, title });
  if (color) badge.style.setProperty('--tb-badge-color', color);
  return badge;
}

export function fieldTypeBadge(type: string | undefined): HTMLElement {
  const resolved = type ?? '?';
  const isNumeric = NUMERIC_FIELD_TYPES.includes(resolved);
  const badge = h('span', {
    className: styles.badge,
    text: typeBadgeLabel(resolved, isNumeric),
    title: resolved,
  });
  badge.style.setProperty('--tb-badge-color', typeBadgeColor(resolved, isNumeric));
  return badge;
}
