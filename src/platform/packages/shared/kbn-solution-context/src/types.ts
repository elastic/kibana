/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaSolution } from '@kbn/projects-solutions-groups';
import type { SolutionView } from '@kbn/spaces-plugin/common';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';

/**
 * Normalized solution identifier. Merges the Cloud and Spaces naming
 * conventions into a single consistent set of values.
 */
export type Solution = KibanaSolution | 'classic';

/**
 * Complete solution context combining raw source values with a
 * normalized merged result.
 */
export interface SolutionContext {
  /**
   * Normalized solution: serverless projectType takes precedence,
   * then the space solution view, then 'classic'.
   * Space abbreviations are expanded ('oblt' → 'observability', 'es' → 'search').
   */
  solution: Solution;

  /**
   * Raw serverless project type from the Cloud plugin.
   * Undefined when not running in serverless mode.
   */
  serverlessProjectType?: KibanaSolution;

  /**
   * Raw solution view from the active Space.
   * Undefined if the Spaces plugin is not available.
   */
  solutionView?: SolutionView;

  /** True when running in serverless mode. */
  isServerless: boolean;
}

export type { KibanaSolution, SolutionView, CloudSetup, CloudStart, SpacesApi };
