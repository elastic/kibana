/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement, lazy, Suspense } from 'react';
import {
  EmbeddableConsoleProps,
  EmbeddableConsoleDependencies,
} from '../../../types/embeddable_console';

const RemoteConsole = lazy(() => import('./embeddable_console'));

export function renderEmbeddableConsole(
  props: EmbeddableConsoleProps | undefined,
  deps: EmbeddableConsoleDependencies
): ReactElement | null {
  return (
    <Suspense fallback={<></>}>
      <RemoteConsole {...props} {...deps} />
    </Suspense>
  );
}
