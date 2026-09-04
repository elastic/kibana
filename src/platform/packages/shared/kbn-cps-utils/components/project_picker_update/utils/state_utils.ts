/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CPSProject, ProjectsData } from '../../../types';
import type { FilterEntry } from '../state/reducers';
import type { FilterExpressionDraft, FilterExpressionValue } from './filter_input_codec';
import { getFilterExpressionLookupKey, isValidFilterExpression } from './filter_input_codec';
import { encodeFilterOnlyRouting } from './project_routing_codec';

export const PREVIEW_FILTER_EXPRESSION_ID = '__preview__';

/**
 * Builds the filter-expression map used to preview a draft filter (create or edit).
 */
export const buildPreviewFilterExpressions = (
  existingFilterExpressions: Map<string, FilterEntry>,
  draft: FilterExpressionDraft,
  filterId?: string
): Map<string, FilterEntry> | null => {
  if (!isValidFilterExpression(draft)) {
    return null;
  }

  const previewFilters = new Map(existingFilterExpressions);

  if (filterId) {
    const existing = previewFilters.get(filterId);
    previewFilters.set(filterId, {
      expression: draft,
      enabled: existing?.enabled ?? true,
    });
  } else {
    previewFilters.set(PREVIEW_FILTER_EXPRESSION_ID, { expression: draft, enabled: true });
  }

  return previewFilters;
};

/**
 * Collects project IDs from a server projects response.
 */
export const collectProjectIdsFromProjectsData = (data: ProjectsData | null): string[] => {
  if (!data) {
    return [];
  }

  const ids: string[] = [];
  if (data.origin) {
    ids.push(data.origin._id);
  }
  for (const project of data.linkedProjects) {
    ids.push(project._id);
  }
  return ids;
};

/**
 * Intersects server match IDs with the local available-projects catalog.
 * Unknown server IDs are dropped; records always come from the local catalog.
 */
export const intersectServerMatchIds = (
  availableProjects: Map<CPSProject['_id'], CPSProject>,
  serverMatchIds: readonly string[]
): string[] => {
  return serverMatchIds.filter((id) => availableProjects.has(id));
};

export function isDuplicateFilterExpressionDraft(
  filterExpressions: Map<string, FilterEntry>,
  draft: FilterExpressionValue,
  editingFilterId?: string
): boolean {
  const draftKey = getFilterExpressionLookupKey(draft);
  if (!filterExpressions.has(draftKey)) {
    return false;
  }

  return draftKey !== editingFilterId;
}

/**
 * Returns enabled filter expression values from a filter map.
 */
export const getEnabledFilterExpressions = (
  filterExpressions: Map<string, FilterEntry>
): FilterExpressionValue[] => {
  const enabled: FilterExpressionValue[] = [];
  for (const entry of filterExpressions.values()) {
    if (entry.enabled) {
      enabled.push(entry.expression);
    }
  }
  return enabled;
};

/**
 * Serialization of a filter map's enabled expressions, used to detect whether the
 * effective filter (and therefore any server-side filter-search results) actually changed.
 */
export const getEnabledFiltersIdentity = (filterExpressions: Map<string, FilterEntry>): string => {
  return encodeFilterOnlyRouting(getEnabledFilterExpressions(filterExpressions)) ?? '';
};
