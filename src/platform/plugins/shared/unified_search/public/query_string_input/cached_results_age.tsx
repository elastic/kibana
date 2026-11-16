/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useReducer } from 'react';

/** Renders how long ago cached results were loaded, refreshed every second while mounted. */
export const CachedResultsAge = ({
  loadedAt,
  getLabel,
}: {
  loadedAt: string;
  getLabel: (loadedAt: string) => string;
}) => {
  const [, tick] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return <>{getLabel(loadedAt)}</>;
};
