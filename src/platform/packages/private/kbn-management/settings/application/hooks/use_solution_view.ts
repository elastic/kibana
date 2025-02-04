/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect } from 'react';
import { SolutionView } from '@kbn/spaces-plugin/common';
import { Space } from '@kbn/spaces-plugin/common';

/**
 * React hook which returns the solution view of the current active space.
 */
export function useSolutionView(getActiveSpace: () => Promise<Pick<Space, 'solution'>>) {
  const [solutionView, setSolutionView] = useState<SolutionView>();

  useEffect(() => {
    if (getActiveSpace) {
      getActiveSpace().then((space) => {
        setSolutionView(space.solution);
      });
    }
  }, [getActiveSpace]);

  return solutionView;
}
