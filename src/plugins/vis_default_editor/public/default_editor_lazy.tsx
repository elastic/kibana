/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import type { DefaultEditorProps } from './default_editor';

const DefaultEditorComponent = lazy(() => import('./default_editor'));

export const DefaultEditor = (props: DefaultEditorProps) => (
  <Suspense
    fallback={
      <div
        style={{
          display: 'flex',
          flex: '1 1 auto',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <EuiLoadingChart size="xl" mono />
      </div>
    }
  >
    <DefaultEditorComponent {...props} />
  </Suspense>
);
