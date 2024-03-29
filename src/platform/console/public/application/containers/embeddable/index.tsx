/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ComponentType, lazy, Suspense } from 'react';
import {
  EmbeddableConsoleProps,
  EmbeddableConsoleDependencies,
} from '../../../types/embeddable_console';

type EmbeddableConsoleInternalProps = EmbeddableConsoleProps & EmbeddableConsoleDependencies;

const Console = lazy<ComponentType<EmbeddableConsoleInternalProps>>(async () => {
  return {
    default: (await import('./embeddable_console')).EmbeddableConsole,
  };
});

export const EmbeddableConsole: React.FC<EmbeddableConsoleInternalProps> = (props) => {
  return (
    <Suspense fallback={null}>
      <Console {...props} />
    </Suspense>
  );
};
