/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { Suspense } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { QuickSearchVisorProps } from '@kbn/esql-editor';
import { useKibanaServices } from './kibana_services';

const LazyQuickSearchVisor = React.lazy(async () => {
  const module = await import('@kbn/esql-editor');
  return { default: module.QuickSearchVisor };
});

export const QuickSearchVisor: React.FC<QuickSearchVisorProps> = (props) => {
  const deps = useKibanaServices();

  if (!deps) {
    return null;
  }

  return (
    <KibanaContextProvider services={{ ...deps }}>
      <Suspense fallback={null}>
        <LazyQuickSearchVisor {...props} />
      </Suspense>
    </KibanaContextProvider>
  );
};
