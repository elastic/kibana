/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useLocation } from 'react-router-dom';

/**
 * Checks if the component is rendered in a router context.
 *
 * @returns `true` if the component is rendered in a router context, `false` otherwise.
 */
export const useInRouterContext = (): boolean => {
  try {
    // Deliberately invoke a router hook to detect embedded/no-router callers.
    useLocation();
    return true;
  } catch {
    return false;
  }
};
