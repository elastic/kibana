/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';

/** The platform-default ELSER inference endpoint used when no override is declared. */
export const DEFAULT_SEMANTIC_SEARCH_INFERENCE_ID = '.elser-2-elasticsearch';

/** Suffix appended to source field names to form the shadow semantic field name. */
export const SEMANTIC_FIELD_SUFFIX = '_semantic';

/** Maximum number of fields a type may declare in {@link SavedObjectsType.semanticSearch}. */
export const MAX_SEMANTIC_SEARCH_FIELDS = 8;

/** Returns the shadow `semantic_text` field name for a given source attribute name. */
export const getSemanticFieldName = (field: string): string => `${field}${SEMANTIC_FIELD_SUFFIX}`;

/**
 * Resolves the inference endpoint ID for a type — the single authoritative resolver (ADR-7).
 * All subsystems must call this function; no code may read `inferenceId` from a registration directly.
 */
export const resolveSemanticInferenceId = (type: SavedObjectsType): string =>
  type.semanticSearch?.inferenceId ?? DEFAULT_SEMANTIC_SEARCH_INFERENCE_ID;
