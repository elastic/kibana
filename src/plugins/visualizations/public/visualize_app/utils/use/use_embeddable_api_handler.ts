/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { useState } from 'react';

export type OpenInspectorFn = () => OverlayRef | undefined;

export interface EmbeddableApiHandler {
  openInspector: ReturnType<typeof useState<OpenInspectorFn>>;
}

export const useEmbeddableApiHandler = () => {
  const openInspector = useState();

  return { openInspector } as EmbeddableApiHandler;
};
