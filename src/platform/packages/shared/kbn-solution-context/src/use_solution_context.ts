/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect } from 'react';
import type { CloudSetup, CloudStart, SpacesApi, SolutionView, SolutionContext } from './types';
import { getSolutionContext } from './get_solution_context';

/**
 * React hook that resolves the active {@link SolutionContext}.
 *
 * Both `cloud` and `spaces` are optional to match the reality that
 * these plugins may not be available in all deployments.
 *
 * In serverless mode the context is available synchronously from the
 * Cloud plugin, so this hook never returns `undefined`.
 *
 * In non-serverless mode, the space must be fetched asynchronously.
 * While that fetch is in flight, the hook returns `undefined` to
 * signal that the context is not yet known. Callers should treat
 * `undefined` as "loading" and defer rendering decisions until a
 * value is available.
 *
 * When `cloud` is not available, the hook falls back to the space
 * solution view, or 'classic' if neither plugin is present.
 */
export function useSolutionContext(
  cloud?: CloudSetup | CloudStart | null,
  spaces?: SpacesApi | null
): SolutionContext | undefined {
  const [spaceSolution, setSpaceSolution] = useState<SolutionView | undefined>();
  const [spaceLoaded, setSpaceLoaded] = useState(false);

  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => {
        setSpaceSolution(space?.solution as SolutionView);
        setSpaceLoaded(true);
      });
    } else {
      setSpaceLoaded(true);
    }
  }, [spaces]);

  if (cloud?.isServerlessEnabled) {
    return getSolutionContext(cloud);
  }

  if (!spaceLoaded) {
    return undefined;
  }

  return getSolutionContext(cloud, spaceSolution);
}
