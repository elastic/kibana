/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';

import { PerformanceContext } from './performance_context';
export function usePerformanceContext() {
  const api = useContext(PerformanceContext);

  if (!api) {
    throw new Error('Missing Performance API in context');
  }

  return api;
}
