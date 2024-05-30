/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { HasEditCapabilities, SerializedTitles } from '@kbn/presentation-publishing';
import { HasVisualizeConfig } from '../embeddable';
import type { Vis, VisParams } from '../types';
import type { SerializedVis } from '../vis';

export type VisualizeRuntimeState = SerializedTitles & {
  vis: Vis<VisParams>;
};

export type VisualizeEditorInput = Omit<VisualizeRuntimeState, 'vis'> & {
  savedVis?: SerializedVis<VisParams>;
  timeRange: TimeRange;
  vis?: Vis<VisParams> & { colors?: Record<string, string>; legendOpen?: boolean };
};

export type VisualizeSavedObjectInputState = SerializedTitles & {
  savedObjectId: string;
};

export type VisualizeSavedVisInputState = SerializedTitles & {
  savedVis: SerializedVis<VisParams>;
};

export type VisualizeSerializedState = VisualizeSavedObjectInputState | VisualizeSavedVisInputState;

export const isVisualizeSavedObjectState = (
  state: unknown
): state is VisualizeSavedObjectInputState => {
  return (
    typeof state !== 'undefined' &&
    (state as VisualizeSavedObjectInputState).savedObjectId !== undefined &&
    !('savedVis' in (state as VisualizeSavedObjectInputState))
  );
};

export type VisualizeApi = HasEditCapabilities &
  HasVisualizeConfig &
  DefaultEmbeddableApi<VisualizeSerializedState> & {
    setVis: (vis: SerializedVis<VisParams>) => void;
    subscribeToInitialRender: (listener: () => void) => void;
    subscribeToVisData: (listener: (data: unknown) => void) => void;
    openInspector: () => OverlayRef | undefined;
  };
