/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { perfomanceMarks } from '@kbn/ebt-tools';

export function MarkPerformanceNavigation({ children }: { children: React.ReactNode }) {
  const location = window.location;

  React.useEffect(() => {
    performance.mark(perfomanceMarks.startOnRouterChange);
    return () => {
      performance.clearMarks(perfomanceMarks.startOnRouterChange);
    };
  }, [location.pathname]);

  return <>{children}</>;
}
