/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Deterministic display label from a YAML / catalog key: split camelCase / kebab /
 * snake, sentence case. Never invents domain synonyms.
 */
export function prettifyCatalogKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * When a catalog entry has no human display name, prettify the type's last
 * segment (`kibana.createCaseDefaultSpace` → "Create case default space").
 */
export function prettifyStepTypeDisplayName(type: string): string {
  const trimmed = type.trim();
  if (!trimmed) return trimmed;
  const segment = trimmed.includes('.') ? trimmed.slice(trimmed.lastIndexOf('.') + 1) : trimmed;
  return prettifyCatalogKey(segment);
}

export interface CatalogDisplayNameInput {
  readonly type: string;
  /** Actions-menu / caller override (highest priority). */
  readonly actionLabel?: string | null;
  /** Built-in step definition label. */
  readonly builtInLabel?: string | null;
  readonly summary?: string | null;
  readonly displayName?: string | null;
  /**
   * Connector description. When shaped like "Display - details", only the
   * display head is used.
   */
  readonly description?: string | null;
}

const pickCandidate = (value: string | null | undefined, type: string): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === type) return undefined;
  return trimmed;
};

/**
 * Resolves the catalog display name for a step/connector type. Prefers explicit
 * catalog metadata; falls back to prettifying the type's last segment so the
 * raw type string is never shown as both title and subtitle.
 */
export function resolveCatalogDisplayName(input: CatalogDisplayNameInput): string {
  const { type } = input;
  const fromDescription = (() => {
    const description = input.description?.trim();
    if (!description) return undefined;
    const sep = description.indexOf(' - ');
    return (sep > 0 ? description.slice(0, sep) : description).trim();
  })();

  for (const candidate of [
    pickCandidate(input.actionLabel, type),
    pickCandidate(input.builtInLabel, type),
    pickCandidate(input.summary, type),
    pickCandidate(input.displayName, type),
    pickCandidate(fromDescription, type),
  ]) {
    if (candidate) return candidate;
  }

  // TODO(catalog): missing display names — content task for the action-registry owner
  return prettifyStepTypeDisplayName(type);
}
