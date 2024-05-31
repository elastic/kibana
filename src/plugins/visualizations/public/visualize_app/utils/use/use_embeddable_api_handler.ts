/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { TimefilterContract } from '@kbn/data-plugin/public';
import { useState } from 'react';
import { NavigateToLensContext } from '../../../../common';
import type Vis from '../../../vis';

export type OpenInspectorFn = () => OverlayRef | undefined;
export type NavigateToLensFn = (
  vis: Vis,
  timefilter: TimefilterContract
) => Promise<NavigateToLensContext | undefined | null> | undefined;

export interface EmbeddableApiHandler {
  openInspector: ReturnType<typeof useState<OpenInspectorFn>>;
  navigateToLens: ReturnType<typeof useState<NavigateToLensFn>>;
}

export const useEmbeddableApiHandler = () => {
  const openInspector = useState();
  const navigateToLens = useState();

  return { openInspector, navigateToLens } as EmbeddableApiHandler;
};
