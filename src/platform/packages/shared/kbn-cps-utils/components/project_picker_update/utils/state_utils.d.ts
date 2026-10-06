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
export declare const PREVIEW_FILTER_EXPRESSION_ID = '__preview__';
/**
 * Builds the filter-expression map used to preview a draft filter (create or edit).
 */
export declare const buildPreviewFilterExpressions: (
  existingFilterExpressions: Map<string, FilterEntry>,
  draft: FilterExpressionDraft,
  filterId?: string
) => Map<string, FilterEntry> | null;
/**
 * Collects project IDs from a server projects response.
 */
export declare const collectProjectIdsFromProjectsData: (data: ProjectsData | null) => string[];
/**
 * Intersects server match IDs with the local available-projects catalog.
 * Unknown server IDs are dropped; records always come from the local catalog.
 */
export declare const intersectServerMatchIds: (
  availableProjects: Map<CPSProject['_id'], CPSProject>,
  serverMatchIds: readonly string[]
) => string[];
export declare function isDuplicateFilterExpressionDraft(
  filterExpressions: Map<string, FilterEntry>,
  draft: FilterExpressionValue,
  editingFilterId?: string
): boolean;
/**
 * Returns enabled filter expression values from a filter map.
 */
export declare const getEnabledFilterExpressions: (
  filterExpressions: Map<string, FilterEntry>
) => FilterExpressionValue[];
/**
 * Serialization of a filter map's enabled expressions, used to detect whether the
 * effective filter (and therefore any server-side filter-search results) actually changed.
 */
export declare const getEnabledFiltersIdentity: (
  filterExpressions: Map<string, FilterEntry>
) => string;
