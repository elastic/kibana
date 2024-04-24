/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { perfomanceMarks } from '@kbn/ebt-tools';
import { useLocation } from 'react-router-dom';
import afterFrame from './after_frame';

function measureInteraction() {
  performance.mark(perfomanceMarks.startPageChange);

  return {
    end() {
      performance.mark('endafterFrame');
    },
  };
}

export function MarkPerformanceNavigation({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const interaction = measureInteraction();

  React.useEffect(() => {
    afterFrame(() => {
      interaction.end();
    });
  }, [location.pathname]);

  return <>{children}</>;
}
