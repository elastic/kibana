/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Solution, SolutionView } from './types';

const SOLUTION_VIEW_MAP: Record<string, Solution> = {
  oblt: 'observability',
  es: 'search',
  security: 'security',
  classic: 'classic',
};

/**
 * Normalizes a space solution view value to a standard solution identifier.
 * Handles the abbreviated names used by the Spaces plugin ('oblt' → 'observability', 'es' → 'search').
 */
export function normalizeSolutionView(solutionView: SolutionView | undefined): Solution {
  if (!solutionView) return 'classic';
  return SOLUTION_VIEW_MAP[solutionView] ?? 'classic';
}
