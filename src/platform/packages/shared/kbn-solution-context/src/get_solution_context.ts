/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaSolution, SolutionView, CloudSetup, CloudStart, SolutionContext } from './types';
import { normalizeSolutionView } from './normalize';

/**
 * Builds a {@link SolutionContext} from Cloud and Space values.
 *
 * Serverless project type takes precedence over the space solution view.
 * This is the pure computation — no async calls, no React dependencies.
 * Usable on both server and client.
 *
 * When `cloud` is not available (plugin not installed), the result
 * assumes a non-serverless deployment and falls back to the space
 * solution view (or 'classic' if that is also unavailable).
 */
export function getSolutionContext(
  cloud?: CloudSetup | CloudStart | null,
  spaceSolution?: SolutionView
): SolutionContext {
  const isServerless = cloud?.isServerlessEnabled ?? false;
  const serverlessProjectType = isServerless
    ? (cloud!.serverless.projectType as KibanaSolution | undefined)
    : undefined;

  const solution = serverlessProjectType ?? normalizeSolutionView(spaceSolution);

  return {
    solution,
    serverlessProjectType,
    solutionView: spaceSolution,
    isServerless,
  };
}
