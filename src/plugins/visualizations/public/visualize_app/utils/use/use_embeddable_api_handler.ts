/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { TimefilterContract } from '@kbn/data-plugin/public';
import type { SerializedPanelState } from '@kbn/presentation-containers';
import { useState } from 'react';
import type { VisualizeOutputState } from '../../../react_embeddable/types';
import { NavigateToLensContext } from '../../../../common';
import type Vis from '../../../vis';

export type OpenInspectorFn = () => OverlayRef | undefined;
export type NavigateToLensFn = (
  vis: Vis,
  timefilter: TimefilterContract
) => Promise<NavigateToLensContext | undefined | null> | undefined;
export type SerializeStateFn = (
  extractReferences?: boolean
) => SerializedPanelState<VisualizeOutputState>;
export type GetVisFn = () => Vis;

export interface EmbeddableApiHandler {
  openInspector: ReturnType<typeof useState<OpenInspectorFn>>;
  navigateToLens: ReturnType<typeof useState<NavigateToLensFn>>;
  serializeState: ReturnType<typeof useState<SerializeStateFn>>;
  getVis: ReturnType<typeof useState<GetVisFn>>;
}

export const useEmbeddableApiHandler = () => {
  const openInspector = useState();
  const navigateToLens = useState();
  const serializeState = useState();
  const getVis = useState();

  return { openInspector, navigateToLens, serializeState, getVis } as EmbeddableApiHandler;
};
