/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Filter } from '@kbn/es-query';
export interface FilterTranslationResult {
  /** Combined WHERE expression fragment (all translatable filters ANDed), empty string if none */
  esqlExpression: string;
  /** Filters that could not be translated to ES|QL */
  untranslatableFilters: Filter[];
}
/**
 * Converts an array of Elasticsearch Query DSL filters to an ES|QL WHERE clause expression.
 * Disabled filters are skipped. Negated filters are wrapped with NOT.
 * Untranslatable filter types (custom, spatial, scripted) are returned separately.
 */
export declare const convertFiltersToESQLExpression: (filters: Filter[]) => FilterTranslationResult;
